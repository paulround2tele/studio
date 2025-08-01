package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// Broadcaster defines an interface for broadcasting messages to WebSocket clients.
type Broadcaster interface {
	RegisterClient(client *Client)
	UnregisterClient(client *Client)
	BroadcastMessage(message []byte)
	BroadcastToCampaign(campaignID string, message WebSocketMessage)
	BroadcastStandardizedMessage(campaignID string, message StandardizedWebSocketMessage)
	// Run is a blocking method that should be started as a goroutine
	// to handle the lifecycle of the broadcaster (e.g., processing messages).
	Run()
}

// WebSocketManager manages WebSocket connections and message broadcasting.
// It will implement the Broadcaster interface.
type WebSocketManager struct {
	// mutex protects access to clients map
	mutex sync.RWMutex

	// clients is a map of connected clients.
	// The key is the client pointer and the value is a boolean (true if client is active).
	clients map[*Client]bool

	// broadcast is a channel for messages to be broadcasted to all clients.
	broadcast chan []byte

	// register is a channel for new clients wishing to register.
	register chan *Client

	// unregister is a channel for clients wishing to unregister.
	unregister chan *Client

	// instrumentation counters
	totalConnections int

	// Data integrity tracking for phase transitions
	eventSequenceMap sync.Map // campaignID -> last sequence number
	eventHistory     sync.Map // campaignID -> []EventRecord for deduplication

	// Message retry and recovery
	messageRetryQueue  chan RetryableMessage
	connectionRecovery chan RecoveryRequest
	maxRetryAttempts   int
	retryBackoffMs     int
}

// EventRecord tracks processed events for deduplication
type EventRecord struct {
	EventID        string
	EventHash      string
	Timestamp      time.Time
	SequenceNumber int64
	MessageType    string
}

// RetryableMessage represents a message that failed to send and needs retry
type RetryableMessage struct {
	CampaignID    string
	Message       []byte
	AttemptCount  int
	LastAttempt   time.Time
	TargetClients []*Client
}

// RecoveryRequest represents a request to recover lost events for a client
type RecoveryRequest struct {
	CampaignID         string
	Client             *Client
	LastSequenceNumber int64
	ResponseChannel    chan RecoveryResponse
}

// RecoveryResponse contains recovered events for a client
type RecoveryResponse struct {
	Events []StandardizedWebSocketMessage
	Error  error
}

// NewWebSocketManager creates a new WebSocketManager.
func NewWebSocketManager() *WebSocketManager {
	return &WebSocketManager{
		clients:            make(map[*Client]bool),
		broadcast:          make(chan []byte),
		register:           make(chan *Client),
		unregister:         make(chan *Client),
		messageRetryQueue:  make(chan RetryableMessage, 100),
		connectionRecovery: make(chan RecoveryRequest, 10),
		maxRetryAttempts:   3,
		retryBackoffMs:     1000,
	}
}

// Run starts the WebSocketManager's operations.
// This should be run in a separate goroutine.
func (m *WebSocketManager) Run() {
	for {
		select {
		case client := <-m.register:
			m.clients[client] = true
			m.totalConnections++
			// TODO: Log client registration
		case client := <-m.unregister:
			if _, ok := m.clients[client]; ok {
				delete(m.clients, client)
				close(client.send)
				// TODO: Log client unregistration
			}
		case message := <-m.broadcast:
			for client := range m.clients {
				select {
				case client.send <- message:
				default:
					// If the send channel is blocked, it means the client is slow
					// or disconnected. We close the channel and remove the client.
					close(client.send)
					delete(m.clients, client)
					// TODO: Log message send failure / client removal
				}
			}
		}
	}
}

// RegisterClient registers a new client.
func (m *WebSocketManager) RegisterClient(client *Client) {
	m.register <- client
}

// UnregisterClient unregisters a client.
func (m *WebSocketManager) UnregisterClient(client *Client) {
	m.unregister <- client
}

// BroadcastMessage broadcasts a message to all connected clients.
func (m *WebSocketManager) BroadcastMessage(message []byte) {
	m.broadcast <- message
}

// BroadcastToCampaign broadcasts a message to clients subscribed to a specific campaign.
func (m *WebSocketManager) BroadcastToCampaign(campaignID string, message WebSocketMessage) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("[DIAGNOSTIC] ERROR: Failed to marshal message for campaign %s: %v", campaignID, err)
		return
	}

	// DIAGNOSTIC: Log broadcast attempt details
	m.mutex.RLock()
	clientCount := len(m.clients)
	m.mutex.RUnlock()

	sentCount := 0

	// Send to clients subscribed to this campaign with proper locking
	m.mutex.RLock()
	clientsCopy := make([]*Client, 0, len(m.clients))
	for client := range m.clients {
		clientsCopy = append(clientsCopy, client)
	}
	m.mutex.RUnlock()

	for _, client := range clientsCopy {
		isSubscribed := client.IsSubscribedToCampaign(campaignID)
		if isSubscribed {
			sentCount++
			select {
			case client.send <- data:
				// DIAGNOSTIC: Log successful send
				log.Printf("[DIAGNOSTIC] Successfully sent message to client %s for campaign %s",
					client.conn.RemoteAddr().String(), campaignID)
			default:
				// Client is slow or disconnected, signal for removal through unregister channel
				log.Printf("[DIAGNOSTIC] Client %s is slow/disconnected, scheduling for removal",
					client.conn.RemoteAddr().String())
				go func(c *Client) {
					m.UnregisterClient(c)
				}(client)
			}
		}
	}

	log.Printf("[DIAGNOSTIC] BroadcastToCampaign completed: campaignID=%s, messageType=%s, totalClients=%d, subscribedClients=%d, messagesSent=%d",
		campaignID, message.Type, clientCount, sentCount, sentCount)
}

// Ensure WebSocketManager implements Broadcaster
var _ Broadcaster = (*WebSocketManager)(nil)

// globalBroadcaster can be used for decoupled message sending from other services.
var globalBroadcaster Broadcaster

// InitGlobalBroadcaster initializes and starts the global broadcaster.
// This should be called once during application startup.
func InitGlobalBroadcaster() Broadcaster {
	if globalBroadcaster == nil {
		manager := NewWebSocketManager()
		go manager.Run() // Start the manager's run loop in a goroutine
		globalBroadcaster = manager
	}
	return globalBroadcaster
}

// GetBroadcaster returns the global broadcaster instance.
// Other packages can use this to send messages without direct coupling to the WebSocketManager.
func GetBroadcaster() Broadcaster {
	if globalBroadcaster == nil {
		// This is a fallback, ideally InitGlobalBroadcaster should be called at startup.
		// Consider logging a warning if this is hit.
		return InitGlobalBroadcaster()
	}
	return globalBroadcaster
}

// Stats returns basic metrics about the current WebSocket manager.
func (m *WebSocketManager) Stats() (active int, total int) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return len(m.clients), m.totalConnections
}

// broadcastWithRetry broadcasts message with retry logic for failed clients
func (m *WebSocketManager) broadcastWithRetry(campaignID string, messageBytes []byte) {
	m.mutex.RLock()
	clientsCopy := make([]*Client, 0, len(m.clients))
	for client := range m.clients {
		clientsCopy = append(clientsCopy, client)
	}
	m.mutex.RUnlock()

	var failedClients []*Client
	sentCount := 0

	for _, client := range clientsCopy {
		if client.IsSubscribedToCampaign(campaignID) {
			select {
			case client.send <- messageBytes:
				sentCount++
				log.Printf("[INTEGRITY] Message sent to client %s for campaign %s",
					client.conn.RemoteAddr().String(), campaignID)
			default:
				// Client is slow or disconnected, add to retry queue
				failedClients = append(failedClients, client)
				log.Printf("[INTEGRITY] Client %s is slow, adding to retry queue",
					client.conn.RemoteAddr().String())
			}
		}
	}

	// Queue failed sends for retry
	if len(failedClients) > 0 {
		retryMessage := RetryableMessage{
			CampaignID:    campaignID,
			Message:       messageBytes,
			AttemptCount:  1,
			LastAttempt:   time.Now(),
			TargetClients: failedClients,
		}

		select {
		case m.messageRetryQueue <- retryMessage:
			log.Printf("[INTEGRITY] Queued %d failed sends for retry", len(failedClients))
		default:
			log.Printf("[ERROR] Retry queue full, dropping failed sends for campaign %s", campaignID)
		}
	}

	log.Printf("[INTEGRITY] Broadcast completed: campaignID=%s, sent=%d, failed=%d",
		campaignID, sentCount, len(failedClients))
}

// RecoverMissedEvents recovers missed events for a reconnecting client
func (m *WebSocketManager) RecoverMissedEvents(campaignID string, client *Client, lastSequenceNumber int64) error {
	historyKey := campaignID

	historyInterface, ok := m.eventHistory.Load(historyKey)
	if !ok {
		log.Printf("[RECOVERY] No event history found for campaign %s", campaignID)
		return nil // No history available
	}

	history := historyInterface.([]EventRecord)
	var missedEvents []StandardizedWebSocketMessage

	// Find events after the client's last sequence number
	for _, record := range history {
		if record.SequenceNumber > lastSequenceNumber {
			// Reconstruct message from event record
			// Note: In a production system, you'd want to store the full message data
			recoveryMessage := StandardizedWebSocketMessage{
				Type:      record.MessageType,
				Timestamp: record.Timestamp,
				Data:      json.RawMessage(`{"recovered": true, "eventId": "` + record.EventID + `"}`),
			}
			missedEvents = append(missedEvents, recoveryMessage)
		}
	}

	// Send missed events to client
	for _, event := range missedEvents {
		eventBytes, err := json.Marshal(event)
		if err != nil {
			log.Printf("[RECOVERY] Failed to marshal recovery event: %v", err)
			continue
		}

		select {
		case client.send <- eventBytes:
			log.Printf("[RECOVERY] Sent missed event %s to client %s",
				event.Type, client.conn.RemoteAddr().String())
		default:
			log.Printf("[RECOVERY] Failed to send missed event to client %s",
				client.conn.RemoteAddr().String())
		}
	}

	log.Printf("[RECOVERY] Recovered %d missed events for campaign %s, client %s",
		len(missedEvents), campaignID, client.conn.RemoteAddr().String())

	return nil
}

// StartRetryWorker starts the background worker for message retries
func (m *WebSocketManager) StartRetryWorker() {
	go func() {
		for retryMessage := range m.messageRetryQueue {
			// Wait for backoff period
			backoffDuration := time.Duration(m.retryBackoffMs*retryMessage.AttemptCount) * time.Millisecond
			time.Sleep(backoffDuration)

			// Retry sending to failed clients
			var stillFailedClients []*Client
			successCount := 0

			for _, client := range retryMessage.TargetClients {
				// Check if client is still connected
				m.mutex.RLock()
				isActive := m.clients[client]
				m.mutex.RUnlock()

				if !isActive {
					continue // Client disconnected, skip
				}

				select {
				case client.send <- retryMessage.Message:
					successCount++
					log.Printf("[RETRY] Successfully sent retry message to client %s",
						client.conn.RemoteAddr().String())
				default:
					stillFailedClients = append(stillFailedClients, client)
				}
			}

			// Re-queue if still have failures and haven't exceeded max attempts
			if len(stillFailedClients) > 0 && retryMessage.AttemptCount < m.maxRetryAttempts {
				retryMessage.AttemptCount++
				retryMessage.LastAttempt = time.Now()
				retryMessage.TargetClients = stillFailedClients

				select {
				case m.messageRetryQueue <- retryMessage:
					log.Printf("[RETRY] Re-queued %d failed sends for attempt %d",
						len(stillFailedClients), retryMessage.AttemptCount)
				default:
					log.Printf("[ERROR] Retry queue full, dropping retry attempt %d", retryMessage.AttemptCount)
				}
			} else if retryMessage.AttemptCount >= m.maxRetryAttempts {
				log.Printf("[ERROR] Max retry attempts exceeded for campaign %s, dropping %d sends",
					retryMessage.CampaignID, len(stillFailedClients))
			}

			log.Printf("[RETRY] Retry completed: campaignID=%s, attempt=%d, success=%d, stillFailed=%d",
				retryMessage.CampaignID, retryMessage.AttemptCount, successCount, len(stillFailedClients))
		}
	}()

	log.Printf("[INTEGRITY] Started WebSocket retry worker")
}