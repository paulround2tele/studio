package websocket

import (
	"encoding/json"
	"log"
	"sync"
)

// Broadcaster defines an interface for broadcasting messages to WebSocket clients.
type Broadcaster interface {
	RegisterClient(client *Client)
	UnregisterClient(client *Client)
	BroadcastMessage(message []byte)
	BroadcastToCampaign(campaignID string, message WebSocketMessage)
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
}

// NewWebSocketManager creates a new WebSocketManager.
func NewWebSocketManager() *WebSocketManager {
	return &WebSocketManager{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
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
