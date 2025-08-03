package websocket

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var (
	newline = []byte{'\n'} // Corrected: Use '\n' for the newline character in a byte slice
	space   = []byte{' '}
)

// WebSocketMessage represents a structured message for campaign-specific routing
type WebSocketMessage struct {
	ID           string      `json:"id"`
	Timestamp    string      `json:"timestamp"`
	Type         string      `json:"type"`
	Data         interface{} `json:"data,omitempty"`
	Message      string      `json:"message,omitempty"`
	CampaignID   string      `json:"campaignId,omitempty"`
	Phase        string      `json:"phase,omitempty"`
	Status       string      `json:"status,omitempty"`
	Progress     float64     `json:"progress,omitempty"`
	ErrorMessage string      `json:"error,omitempty"`

	// Real-time update specific fields
	ProxyID                string `json:"proxyId,omitempty"`
	ProxyStatus            string `json:"proxyStatus,omitempty"`
	PersonaID              string `json:"personaId,omitempty"`
	PersonaStatus          string `json:"personaStatus,omitempty"`
	ValidationsProcessed   int64  `json:"validationsProcessed,omitempty"`
	DomainsGenerated       int64  `json:"domainsGenerated,omitempty"`
	EstimatedTimeRemaining string `json:"estimatedTimeRemaining,omitempty"`
}

// ClientMessage represents messages received from the client
type ClientMessage struct {
	Type       string      `json:"type"`
	CampaignID string      `json:"campaignId,omitempty"`
	Data       interface{} `json:"data,omitempty"`
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	hub Broadcaster

	// The websocket connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte

	// Campaign subscriptions for this client
	campaignSubscriptions map[string]bool
	subscriptionMutex     sync.RWMutex

	// Security context for authentication and authorization
	securityContext *models.SecurityContext
}

// readPump pumps messages from the websocket connection to the hub.
func (c *Client) readPump() {
	defer func() {
		log.Printf("[WebSocket] Client %s readPump ending, unregistering client", c.conn.RemoteAddr().String())
		c.hub.UnregisterClient(c)
		c.conn.Close()
	}()

	log.Printf("[WebSocket] Client %s readPump started", c.conn.RemoteAddr().String())

	c.conn.SetReadLimit(maxMessageSize)
	if err := c.conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		log.Printf("websocket read deadline error: %v", err)
	}
	c.conn.SetPongHandler(func(string) error {
		if err := c.conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
			log.Printf("websocket pong handler deadline error: %v", err)
		}
		return nil
	})
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WebSocket] Client %s read error: %v", c.conn.RemoteAddr().String(), err)
			}
			break
		}
		message = bytes.TrimSpace(bytes.Replace(message, newline, space, -1))
		log.Printf("[WebSocket] Client %s received: %s", c.conn.RemoteAddr().String(), string(message))

		// Handle campaign subscription messages
		c.handleMessage(message)
	}
}

// writePump pumps messages from the hub to the websocket connection.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				log.Printf("websocket write deadline error: %v", err)
				return
			}
			if !ok {
				// The hub closed the channel.
				if err := c.conn.WriteMessage(websocket.CloseMessage, []byte{}); err != nil {
					log.Printf("websocket close message error: %v", err)
				}
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				log.Printf("websocket next writer error: %v", err)
				return
			}
			if _, err := w.Write(message); err != nil {
				log.Printf("websocket write message error: %v", err)
				return
			}

			// Add queued messages to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				if _, err := w.Write(newline); err != nil {
					log.Printf("websocket write newline error: %v", err)
					return
				}
				if _, err := w.Write(<-c.send); err != nil {
					log.Printf("websocket write queued message error: %v", err)
					return
				}
			}

			if err := w.Close(); err != nil {
				log.Printf("websocket writer close error: %v", err)
				return
			}
		case <-ticker.C:
			if err := c.conn.SetWriteDeadline(time.Now().Add(writeWait)); err != nil {
				log.Printf("websocket ping deadline error: %v", err)
				return
			}
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("websocket ping error: %v", err)
				return
			}
		}
	}
}

// handleMessage processes incoming messages from the client for campaign subscriptions
func (c *Client) handleMessage(message []byte) {
	var clientMsg ClientMessage
	if err := json.Unmarshal(message, &clientMsg); err != nil {
		log.Printf("Failed to parse WebSocket message: %v", err)
		return
	}

	switch clientMsg.Type {
	case "connection_init":
		// Handle connection initialization
		log.Printf("Client %s initialized connection", c.conn.RemoteAddr().String())

		// Send acknowledgment
		response := c.createMessage("connection_ack", nil)
		userId := ""
		if c.securityContext != nil {
			userId = c.securityContext.UserID.String()
		}
		response.Data = map[string]interface{}{
			"connectionId": uuid.New().String(),
			"userId":       userId,
		}
		c.sendMessage(response)

	case "subscribe":
		// Handle frontend subscription request with channels array
		var subscribeData struct {
			Channels []string `json:"channels"`
		}
		if dataBytes, err := json.Marshal(clientMsg.Data); err == nil {
			if err := json.Unmarshal(dataBytes, &subscribeData); err == nil {
				c.subscriptionMutex.Lock()
				log.Printf("🔍 [SUBSCRIPTION_DEBUG] Client %s processing subscription request for channels: %v",
					c.conn.RemoteAddr().String(), subscribeData.Channels)

				for _, channel := range subscribeData.Channels {
					switch channel {
					case "campaigns", "campaign-updates":
						// Subscribe to all campaigns for these general channels
						c.campaignSubscriptions["*"] = true
						log.Printf("✅ [SUBSCRIPTION_DEBUG] Client %s subscribed to general channel: %s",
							c.conn.RemoteAddr().String(), channel)
					default:
						// CRITICAL: Handle campaign-specific subscriptions
						if strings.HasPrefix(channel, "campaign-") {
							// Extract actual campaign ID from "campaign-{campaignId}" format
							campaignId := strings.TrimPrefix(channel, "campaign-")
							c.campaignSubscriptions[campaignId] = true
							log.Printf("✅ [SUBSCRIPTION_DEBUG] Client %s subscribed to campaign ID: %s (from channel: %s)",
								c.conn.RemoteAddr().String(), campaignId, channel)
						} else {
							// Assume it's a direct campaign ID
							c.campaignSubscriptions[channel] = true
							log.Printf("✅ [SUBSCRIPTION_DEBUG] Client %s subscribed to direct campaign: %s",
								c.conn.RemoteAddr().String(), channel)
						}
					}
				}

				log.Printf("🔍 [SUBSCRIPTION_DEBUG] Client %s final subscriptions: %v",
					c.conn.RemoteAddr().String(), c.campaignSubscriptions)
				c.subscriptionMutex.Unlock()

				// Send subscription acknowledgment
				response := c.createMessage("subscription_ack", nil)
				response.Data = map[string]interface{}{
					"channels":   subscribeData.Channels,
					"subscribed": true,
				}
				c.sendMessage(response)
			} else {
				log.Printf("Failed to parse subscribe data: %v", err)
			}
		} else {
			log.Printf("Failed to marshal client data: %v", err)
		}

	case "subscribe_campaign":
		if clientMsg.CampaignID != "" {
			c.subscriptionMutex.Lock()
			c.campaignSubscriptions[clientMsg.CampaignID] = true
			c.subscriptionMutex.Unlock()

			log.Printf("Client %s subscribed to campaign %s",
				c.conn.RemoteAddr().String(), clientMsg.CampaignID)

			// Send confirmation
			response := c.createMessage("subscription_confirmed", &clientMsg.CampaignID)
			response.Message = "Successfully subscribed to campaign updates"
			response.Data = map[string]interface{}{
				"status": "subscribed",
			}
			c.sendMessage(response)

			// 🚀 BACKEND STATE SYNC FIX: Send current campaign state immediately
			// This prevents the race condition where frontend connects after generation completes
			go c.sendCurrentCampaignState(clientMsg.CampaignID)
		} else {
			log.Printf("Campaign ID is empty for subscribe_campaign message")
		}

	case "unsubscribe_campaign":
		if clientMsg.CampaignID != "" {
			c.subscriptionMutex.Lock()
			delete(c.campaignSubscriptions, clientMsg.CampaignID)
			c.subscriptionMutex.Unlock()

			log.Printf("Client %s unsubscribed from campaign %s",
				c.conn.RemoteAddr().String(), clientMsg.CampaignID)
		}

	case "ping":
		// Handle ping messages
		response := c.createMessage("pong", nil)
		c.sendMessage(response)

	default:
		log.Printf("Unknown message type: %s", clientMsg.Type)
	}
}

// createMessage creates a new WebSocket message with proper ID and timestamp
func (c *Client) createMessage(msgType string, campaignID *string) WebSocketMessage {
	msg := WebSocketMessage{
		ID:        uuid.New().String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Type:      msgType,
	}

	if campaignID != nil {
		msg.CampaignID = *campaignID
	}

	return msg
}

// sendMessage sends a structured message to the client
func (c *Client) sendMessage(msg WebSocketMessage) {
	// Ensure message has required fields
	if msg.ID == "" {
		msg.ID = uuid.New().String()
	}
	if msg.Timestamp == "" {
		msg.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal WebSocket message: %v", err)
		return
	}

	select {
	case c.send <- data:
	default:
		close(c.send)
		c.hub.UnregisterClient(c)
	}
}

// IsSubscribedToCampaign checks if the client is subscribed to a specific campaign
func (c *Client) IsSubscribedToCampaign(campaignID string) bool {
	c.subscriptionMutex.RLock()
	defer c.subscriptionMutex.RUnlock()

	// DIAGNOSTIC: Log subscription check details
	hasSpecific := c.campaignSubscriptions[campaignID]
	hasWildcard := c.campaignSubscriptions["*"]
	log.Printf("[DIAGNOSTIC] IsSubscribedToCampaign check: campaignID=%s, hasSpecific=%t, hasWildcard=%t, allSubscriptions=%v",
		campaignID, hasSpecific, hasWildcard, c.campaignSubscriptions)

	return c.campaignSubscriptions[campaignID] || c.campaignSubscriptions["*"]
}

// sendCurrentCampaignState fetches and sends current campaign state to client on subscription
// This prevents race condition where frontend connects after campaign generation completes
func (c *Client) sendCurrentCampaignState(campaignID string) {
	log.Printf("🔄 [STATE_SYNC] sendCurrentCampaignState called for campaign %s", campaignID)

	// Use global pattern to fetch and broadcast current campaign state
	BroadcastCurrentCampaignState(campaignID)
}

// NewClient creates a new client, registers it with the hub, and starts its read/write pumps.
func NewClient(hub Broadcaster, conn *websocket.Conn) *Client {
	log.Printf("[WebSocket] Creating new client for %s", conn.RemoteAddr().String())

	client := &Client{
		hub:                   hub,
		conn:                  conn,
		send:                  make(chan []byte, 256), // Buffered channel for outbound messages
		campaignSubscriptions: make(map[string]bool),
	}

	log.Printf("[WebSocket] Registering client %s with hub", conn.RemoteAddr().String())
	client.hub.RegisterClient(client) // Register client with the hub

	// Start goroutines for reading and writing messages for this client.
	log.Printf("[WebSocket] Starting read/write pumps for client %s", conn.RemoteAddr().String())
	go client.writePump()
	go client.readPump()

	return client
}

// NewClientWithSecurity creates a new client with security context
func NewClientWithSecurity(hub Broadcaster, conn *websocket.Conn, securityContext *models.SecurityContext) *Client {
	userId := "unknown"
	if securityContext != nil {
		userId = securityContext.UserID.String()
	}
	log.Printf("[WebSocket] Creating new client with security for %s (user: %s)", conn.RemoteAddr().String(), userId)

	client := &Client{
		hub:                   hub,
		conn:                  conn,
		send:                  make(chan []byte, 256), // Buffered channel for outbound messages
		campaignSubscriptions: make(map[string]bool),
		securityContext:       securityContext,
	}

	log.Printf("[WebSocket] Registering client %s with hub (user: %s)", conn.RemoteAddr().String(), userId)
	client.hub.RegisterClient(client) // Register client with the hub

	// Start goroutines for reading and writing messages for this client.
	log.Printf("[WebSocket] Starting read/write pumps for client %s (user: %s)", conn.RemoteAddr().String(), userId)
	go client.writePump()
	go client.readPump()

	return client
}

// GetSecurityContext returns the client's security context
func (c *Client) GetSecurityContext() *models.SecurityContext {
	return c.securityContext
}

// CreatePhaseTransitionMessage creates a standardized phase transition message
func CreatePhaseTransitionMessage(campaignID string, previousPhase string, currentPhase string, progress float64) WebSocketMessage {
	return WebSocketMessage{
		ID:         uuid.New().String(),
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Type:       "phase_transition",
		CampaignID: campaignID,
		Data: map[string]interface{}{
			"previousPhase":      previousPhase,
			"currentPhase":       currentPhase,
			"progressPercentage": progress,
			"transitionType":     "automatic",
			"status":             "completed",
		},
	}
}

// CreateCampaignProgressMessage creates a standardized campaign progress message
func CreateCampaignProgressMessage(campaignID string, progress float64, status string, phase string) WebSocketMessage {
	return WebSocketMessage{
		ID:         uuid.New().String(),
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Type:       "campaign_progress",
		CampaignID: campaignID,
		Data: map[string]interface{}{
			"progressPercentage": progress,
			"phaseStatus":        status,
			"currentPhase":       phase,
			"processedItems":     0, // Should be provided by caller
			"totalItems":         0, // Should be provided by caller
		},
	}
}

// CreateProxyStatusMessage creates a standardized proxy status update message
func CreateProxyStatusMessage(proxyID, status string, campaignID string) WebSocketMessage {
	return WebSocketMessage{
		ID:         uuid.New().String(),
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Type:       "proxy_status_update",
		CampaignID: campaignID,
		Data: map[string]interface{}{
			"proxyId": proxyID,
			"status":  status,
		},
	}
}

// CreateSystemNotificationMessage creates a system-wide notification message
func CreateSystemNotificationMessage(message string, level string) WebSocketMessage {
	return WebSocketMessage{
		ID:        uuid.New().String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Type:      "system_notification",
		Data: map[string]interface{}{
			"level":   level, // info, warning, error, success
			"message": message,
		},
	}
}

// Enhanced message creation functions for standardized WebSocket communication

// CreateCampaignPhaseCompleteMessage creates a campaign phase completion message
func CreateCampaignPhaseCompleteMessage(campaignID, phase string, completedItems, failedItems int, nextPhase string) WebSocketMessage {
	return WebSocketMessage{
		ID:         uuid.New().String(),
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Type:       "campaign_phase_complete",
		CampaignID: campaignID,
		Data: map[string]interface{}{
			"phase":          phase, // domain_generation, dns_validation, http_keyword_validation
			"completedItems": completedItems,
			"failedItems":    failedItems,
			"nextPhase":      nextPhase, // or "completed"
		},
	}
}

// CreateCampaignCompleteMessage creates a campaign completion message
func CreateCampaignCompleteMessage(campaignID, finalStatus string, totalProcessed, totalSuccessful, totalFailed int, duration float64) WebSocketMessage {
	return WebSocketMessage{
		ID:         uuid.New().String(),
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Type:       "campaign_complete",
		CampaignID: campaignID,
		Data: map[string]interface{}{
			"finalStatus":     finalStatus, // completed, failed, cancelled
			"totalProcessed":  totalProcessed,
			"totalSuccessful": totalSuccessful,
			"totalFailed":     totalFailed,
			"duration":        duration, // in seconds
		},
	}
}

// CreateCampaignErrorMessage creates a campaign error message
func CreateCampaignErrorMessage(campaignID, errorCode, errorMessage, phase string, retryable bool) WebSocketMessage {
	return WebSocketMessage{
		ID:         uuid.New().String(),
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Type:       "campaign_error",
		CampaignID: campaignID,
		Data: map[string]interface{}{
			"errorCode":    errorCode,
			"errorMessage": errorMessage,
			"phase":        phase,
			"retryable":    retryable,
		},
	}
}

// CreateUserNotificationMessage creates a user-specific notification message
func CreateUserNotificationMessage(userID, level, title, message, actionURL string) WebSocketMessage {
	data := map[string]interface{}{
		"level":   level, // info, warning, error
		"title":   title,
		"message": message,
	}
	if actionURL != "" {
		data["actionUrl"] = actionURL
	}

	return WebSocketMessage{
		ID:        uuid.New().String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Type:      "user_notification",
		Data:      data,
		// Note: userID would typically be included in routing logic, not in the message itself
	}
}

// CreateConnectionAckMessage creates a simple connection acknowledgment message
func CreateConnectionAckMessage(connectionID, userID string) WebSocketMessage {
	return WebSocketMessage{
		ID:        uuid.New().String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Type:      "connection_ack",
		Data: map[string]interface{}{
			"connectionId": connectionID,
			"userId":       userID,
			"status":       "connected",
		},
	}
}

// BroadcastCampaignProgress broadcasts campaign progress using standardized format only
func BroadcastCampaignProgress(campaignID string, progress float64, status string, phase string, processedItems int64, totalItems int64) {
	log.Printf("🟢 [WEBSOCKET_BROADCAST_DEBUG] BroadcastCampaignProgress called: campaignID=%s, progress=%.2f, status=%s, phase=%s",
		campaignID, progress, status, phase)

	if broadcaster := GetBroadcaster(); broadcaster != nil {
		log.Printf("✅ [WEBSOCKET_BROADCAST_DEBUG] Broadcaster available, creating standardized message")

		// Use ONLY standardized format - eliminates 50% of traffic
		payload := CampaignProgressPayload{
			CampaignID:      campaignID,
			TotalItems:      totalItems,
			ProcessedItems:  processedItems,
			ProgressPercent: progress,
			CurrentPhase:    phase,
			PhaseStatus:     status,
		}
		message := CreateCampaignProgressMessageV2(payload)

		log.Printf("📤 [WEBSOCKET_BROADCAST_DEBUG] Broadcasting message with type: %s", message.Type)

		// Convert to JSON for broadcasting
		messageBytes, err := json.Marshal(message)
		if err != nil {
			log.Printf("❌ [WEBSOCKET_BROADCAST_DEBUG] Failed to marshal standardized message: %v", err)
			return
		}

		broadcaster.BroadcastMessage(messageBytes)
		log.Printf("✅ [WEBSOCKET_BROADCAST_DEBUG] Message sent successfully with type: %s", message.Type)
	} else {
		log.Printf("❌ [WEBSOCKET_BROADCAST_DEBUG] ERROR: No broadcaster available for campaign progress")
	}
}

// BroadcastProxyStatus broadcasts proxy status updates to subscribed clients
func BroadcastProxyStatus(proxyID, status string, campaignID string) {
	log.Printf("[DIAGNOSTIC] BroadcastProxyStatus called: proxyID=%s, status=%s, campaignID=%s",
		proxyID, status, campaignID)

	if broadcaster := GetBroadcaster(); broadcaster != nil {
		message := CreateProxyStatusMessage(proxyID, status, campaignID)
		log.Printf("[DIAGNOSTIC] Broadcasting proxy status message")
		broadcaster.BroadcastToCampaign(campaignID, message)
	} else {
		log.Printf("[DIAGNOSTIC] ERROR: No broadcaster available for proxy status")
	}
}

// BroadcastPhaseTransition broadcasts automatic phase transitions with currentPhase data
func BroadcastPhaseTransition(campaignID string, previousPhase string, currentPhase string, progress float64) {
	log.Printf("🔄 [WEBSOCKET_PHASE_TRANSITION] BroadcastPhaseTransition called: campaignID=%s, previousPhase=%s, currentPhase=%s, progress=%.2f",
		campaignID, previousPhase, currentPhase, progress)

	if broadcaster := GetBroadcaster(); broadcaster != nil {
		message := CreatePhaseTransitionMessage(campaignID, previousPhase, currentPhase, progress)
		log.Printf("📤 [WEBSOCKET_PHASE_TRANSITION] Broadcasting phase transition message")
		broadcaster.BroadcastToCampaign(campaignID, message)
		log.Printf("✅ [WEBSOCKET_PHASE_TRANSITION] Phase transition message sent successfully")
	} else {
		log.Printf("❌ [WEBSOCKET_PHASE_TRANSITION] ERROR: No broadcaster available for phase transition")
	}
}

// TASK-WS-002: Domain generation progress use REST API polling instead

// BroadcastCampaignListUpdate broadcasts campaign list changes to eliminate polling
func BroadcastCampaignListUpdate(action string, campaignID string, campaignData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastCampaignListUpdate called: action=%s, campaignID=%s",
		action, campaignID)

	if broadcaster := GetBroadcaster(); broadcaster != nil {
		message := CreateCampaignListUpdateMessage(action, campaignID, campaignData)
		log.Printf("[DIAGNOSTIC] Broadcasting campaign list update: action=%s", action)
		// Broadcast to all clients subscribed to campaigns (wildcard)
		broadcaster.BroadcastToCampaign("*", message)
	} else {
		log.Printf("[DIAGNOSTIC] ERROR: No broadcaster available for campaign list update")
	}
}

// BroadcastCampaignCreated broadcasts when a new campaign is created using standardized format
func BroadcastCampaignCreated(campaignID string, campaignData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastCampaignCreated called: campaignID=%s", campaignID)

	if broadcaster := GetBroadcaster(); broadcaster != nil {
		// Use ONLY standardized format for campaign list updates
		payload := CampaignListUpdatePayload{
			Action:     "create",
			CampaignID: campaignID,
			Campaign:   campaignData,
		}
		message := CreateCampaignListUpdateMessageV2(payload)

		// Convert to JSON for broadcasting
		messageBytes, err := json.Marshal(message)
		if err != nil {
			log.Printf("[DIAGNOSTIC] Failed to marshal standardized campaign created message: %v", err)
			return
		}

		broadcaster.BroadcastMessage(messageBytes)
		log.Printf("✅ [DIAGNOSTIC] Standardized campaign.list.update message sent for create")
	} else {
		log.Printf("❌ [DIAGNOSTIC] No broadcaster available for campaign creation")
	}
}

// BroadcastCampaignUpdated broadcasts when a campaign is updated using standardized format
func BroadcastCampaignUpdated(campaignID string, campaignData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastCampaignUpdated called: campaignID=%s", campaignID)

	if broadcaster := GetBroadcaster(); broadcaster != nil {
		// Use ONLY standardized format for campaign list updates
		payload := CampaignListUpdatePayload{
			Action:     "update",
			CampaignID: campaignID,
			Campaign:   campaignData,
		}
		message := CreateCampaignListUpdateMessageV2(payload)

		// Convert to JSON for broadcasting
		messageBytes, err := json.Marshal(message)
		if err != nil {
			log.Printf("[DIAGNOSTIC] Failed to marshal standardized campaign updated message: %v", err)
			return
		}

		broadcaster.BroadcastMessage(messageBytes)
		log.Printf("✅ [DIAGNOSTIC] Standardized campaign.list.update message sent for update")
	} else {
		log.Printf("❌ [DIAGNOSTIC] No broadcaster available for campaign update")
	}
}

// BroadcastCampaignDeleted broadcasts when a campaign is deleted
func BroadcastCampaignDeleted(campaignID string) {
	log.Printf("[DIAGNOSTIC] BroadcastCampaignDeleted called: campaignID=%s", campaignID)
	BroadcastCampaignListUpdate("delete", campaignID, nil)
}

// BroadcastProxyStatusUpdate broadcasts proxy status changes to eliminate polling
func BroadcastProxyStatusUpdate(proxyID string, status string, health string, responseTime int64) {
	log.Printf("[DIAGNOSTIC] BroadcastProxyStatusUpdate called: proxyID=%s, status=%s", proxyID, status)

	// Use standardized format
	message := WebSocketMessage{
		Type:    "proxy_status_update",
		Message: "Proxy status updated",
		Data: map[string]interface{}{
			"proxyId":      proxyID,
			"status":       status,
			"health":       health,
			"responseTime": responseTime,
		},
	}

	broadcaster := GetBroadcaster()
	if broadcaster != nil {
		// Broadcast to all clients (proxy updates are global)
		broadcaster.BroadcastToCampaign("", message)
	}
}

// BroadcastProxyCreated broadcasts when a new proxy is created
func BroadcastProxyCreated(proxyID string, proxyData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastProxyCreated called: proxyID=%s", proxyID)
	BroadcastProxyListUpdate("create", proxyID, proxyData)
}

// BroadcastProxyUpdated broadcasts when a proxy is updated
func BroadcastProxyUpdated(proxyID string, proxyData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastProxyUpdated called: proxyID=%s", proxyID)
	BroadcastProxyListUpdate("update", proxyID, proxyData)
}

// BroadcastProxyDeleted broadcasts when a proxy is deleted
func BroadcastProxyDeleted(proxyID string) {
	log.Printf("[DIAGNOSTIC] BroadcastProxyDeleted called: proxyID=%s", proxyID)
	BroadcastProxyListUpdate("delete", proxyID, nil)
}

// BroadcastProxyListUpdate broadcasts proxy list changes to eliminate polling
func BroadcastProxyListUpdate(action string, proxyID string, proxyData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastProxyListUpdate called: action=%s, proxyID=%s", action, proxyID)

	message := WebSocketMessage{
		Type:    "proxy_list_update",
		Message: "Proxy list updated",
		Data: map[string]interface{}{
			"action":  action,
			"proxyId": proxyID,
			"proxy":   proxyData,
		},
	}

	broadcaster := GetBroadcaster()
	if broadcaster != nil {
		// Broadcast to all clients (proxy updates are global)
		broadcaster.BroadcastToCampaign("", message)
	}
}

// PERSONA WEBSOCKET BROADCASTS - Missing functionality identified
// BroadcastPersonaCreated broadcasts when a new persona is created
func BroadcastPersonaCreated(personaID string, personaData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastPersonaCreated called: personaID=%s", personaID)
	BroadcastPersonaListUpdate("create", personaID, personaData)
}

// BroadcastPersonaUpdated broadcasts when a persona is updated
func BroadcastPersonaUpdated(personaID string, personaData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastPersonaUpdated called: personaID=%s", personaID)
	BroadcastPersonaListUpdate("update", personaID, personaData)
}

// BroadcastPersonaDeleted broadcasts when a persona is deleted
func BroadcastPersonaDeleted(personaID string) {
	log.Printf("[DIAGNOSTIC] BroadcastPersonaDeleted called: personaID=%s", personaID)
	BroadcastPersonaListUpdate("delete", personaID, nil)
}

// BroadcastPersonaListUpdate broadcasts persona list changes to eliminate polling
func BroadcastPersonaListUpdate(action string, personaID string, personaData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastPersonaListUpdate called: action=%s, personaID=%s", action, personaID)

	message := WebSocketMessage{
		Type:    "persona_list_update",
		Message: "Persona list updated",
		Data: map[string]interface{}{
			"action":    action,
			"personaId": personaID,
			"persona":   personaData,
		},
	}

	broadcaster := GetBroadcaster()
	if broadcaster != nil {
		// Broadcast to all clients (persona updates are global)
		broadcaster.BroadcastToCampaign("", message)
	}
}

// KEYWORD SET WEBSOCKET BROADCASTS - Missing functionality identified
// BroadcastKeywordSetCreated broadcasts when a new keyword set is created
func BroadcastKeywordSetCreated(keywordSetID string, keywordSetData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastKeywordSetCreated called: keywordSetID=%s", keywordSetID)
	BroadcastKeywordSetListUpdate("create", keywordSetID, keywordSetData)
}

// BroadcastKeywordSetUpdated broadcasts when a keyword set is updated
func BroadcastKeywordSetUpdated(keywordSetID string, keywordSetData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastKeywordSetUpdated called: keywordSetID=%s", keywordSetID)
	BroadcastKeywordSetListUpdate("update", keywordSetID, keywordSetData)
}

// BroadcastKeywordSetDeleted broadcasts when a keyword set is deleted
func BroadcastKeywordSetDeleted(keywordSetID string) {
	log.Printf("[DIAGNOSTIC] BroadcastKeywordSetDeleted called: keywordSetID=%s", keywordSetID)
	BroadcastKeywordSetListUpdate("delete", keywordSetID, nil)
}

// BroadcastKeywordSetListUpdate broadcasts keyword set list changes to eliminate polling
func BroadcastKeywordSetListUpdate(action string, keywordSetID string, keywordSetData interface{}) {
	log.Printf("[DIAGNOSTIC] BroadcastKeywordSetListUpdate called: action=%s, keywordSetID=%s", action, keywordSetID)

	message := WebSocketMessage{
		Type:    "keyword_set_list_update",
		Message: "Keyword set list updated",
		Data: map[string]interface{}{
			"action":       action,
			"keywordSetId": keywordSetID,
			"keywordSet":   keywordSetData,
		},
	}

	broadcaster := GetBroadcaster()
	if broadcaster != nil {
		// Broadcast to all clients (keyword set updates are global)
		broadcaster.BroadcastToCampaign("", message)
	}
}

// BroadcastDashboardActivity - DEPRECATED: Dashboard activity now served via REST APIs only
// Domain-level activity updates are no longer streamed via WebSocket
func BroadcastDashboardActivity(campaignID string, domainName string, activity string, status string, phase string) {
	log.Printf("[DEPRECATED] BroadcastDashboardActivity disabled: campaignID=%s, domain=%s, activity=%s", campaignID, domainName, activity)
	log.Printf("[REFACTOR] Domain activity data should be fetched via REST API polling or bulk data endpoints")
	// Dashboard activity broadcasting disabled - use REST APIs for domain data fetching
}

// TASK-WS-002 COMPLETED: Heavy domain data streaming functions removed
// Use REST APIs for domain data: GET /campaigns/{id}/domains

// CreateCampaignListUpdateMessage creates a campaign list update message
func CreateCampaignListUpdateMessage(action string, campaignID string, campaignData interface{}) WebSocketMessage {
	data := map[string]interface{}{
		"action":     action,
		"campaignId": campaignID,
	}

	if campaignData != nil {
		data["campaign"] = campaignData
	}

	return WebSocketMessage{
		ID:        uuid.New().String(),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Type:      "campaign_list_update",
		Data:      data,
	}
}

// BroadcastValidationProgress broadcasts validation progress
func BroadcastValidationProgress(campaignID string, validationsProcessed int64, totalValidations int64, validationType string) {
	log.Printf("🟡 [WEBSOCKET_BROADCAST_DEBUG] BroadcastValidationProgress called: campaignID=%s, processed=%d, total=%d, type=%s",
		campaignID, validationsProcessed, totalValidations, validationType)

	if broadcaster := GetBroadcaster(); broadcaster != nil {
		// Removed: message := CreateValidationProgressMessage(campaignID, validationsProcessed, totalValidations, validationType)
		log.Printf("Not broadcasting validation progress for campaign %s via websocket to reduce traffic", campaignID)
	} else {
		log.Printf("❌ [WEBSOCKET_BROADCAST_DEBUG] ERROR: No broadcaster available for validation progress")
	}
}

// BroadcastSystemNotification broadcasts system-wide notifications
func BroadcastSystemNotification(message string, level string) {
	log.Printf("[DIAGNOSTIC] BroadcastSystemNotification called: message=%s, level=%s", message, level)

	if broadcaster := GetBroadcaster(); broadcaster != nil {
		notification := CreateSystemNotificationMessage(message, level)
		log.Printf("[DIAGNOSTIC] Broadcasting system notification")
		if data, err := json.Marshal(notification); err == nil {
			broadcaster.BroadcastMessage(data)
		} else {
			log.Printf("[DIAGNOSTIC] ERROR: Failed to marshal system notification: %v", err)
		}
	} else {
		log.Printf("[DIAGNOSTIC] ERROR: No broadcaster available for system notification")
	}
}

// BroadcastCurrentCampaignState fetches and broadcasts current campaign state for late-connecting clients
// This prevents race condition where frontend connects after campaign generation completes
func BroadcastCurrentCampaignState(campaignID string) {
	log.Printf("🔄 [STATE_SYNC] BroadcastCurrentCampaignState called for campaign %s", campaignID)

	broadcaster := GetBroadcaster()
	if broadcaster == nil {
		log.Printf("❌ [STATE_SYNC] ERROR: No broadcaster available for campaign state sync")
		return
	}

	stateService := GetCampaignStateService()
	if stateService == nil {
		log.Printf("⚠️ [STATE_SYNC] Campaign state service not initialized, sending basic sync message for campaign %s", campaignID)
		// Fallback to basic message if service not available
		message := WebSocketMessage{
			ID:         uuid.New().String(),
			Timestamp:  time.Now().UTC().Format(time.RFC3339),
			Type:       "campaign.state.sync",
			CampaignID: campaignID,
			Message:    "State sync requested - service unavailable",
		}
		broadcaster.BroadcastToCampaign(campaignID, message)
		return
	}

	// Fetch comprehensive campaign state from database
	ctx := context.Background()
	stateData, err := stateService.GetCampaignState(ctx, campaignID)
	if err != nil {
		log.Printf("❌ [STATE_SYNC] Failed to fetch campaign state for %s: %v", campaignID, err)
		// Send error state sync message
		message := WebSocketMessage{
			ID:         uuid.New().String(),
			Timestamp:  time.Now().UTC().Format(time.RFC3339),
			Type:       "campaign.state.sync.error",
			CampaignID: campaignID,
			Message:    fmt.Sprintf("Failed to fetch campaign state: %v", err),
		}
		broadcaster.BroadcastToCampaign(campaignID, message)
		return
	}

	// Send comprehensive campaign progress message with enhanced data
	progressMessage := WebSocketMessage{
		ID:         uuid.New().String(),
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Type:       "campaign.progress",
		CampaignID: campaignID,
		Message:    fmt.Sprintf("Campaign progress: %.1f%% complete", stateData.Progress),
		Data: map[string]interface{}{
			"progress":         stateData.Progress,
			"status":           stateData.PhaseStatus,
			"phase":            stateData.CurrentPhase,
			"processedItems":   stateData.ProcessedItems,
			"totalItems":       stateData.TotalItems,
			"domainsGenerated": stateData.DomainsGenerated,
			"dnsValidated":     stateData.DNSValidated,
			"httpValidated":    stateData.HTTPValidated,
			"leadsGenerated":   stateData.LeadsGenerated,
			"isCompleted":      stateData.IsCompleted,
		},
	}

	broadcaster.BroadcastToCampaign(campaignID, progressMessage)
	log.Printf("✅ [STATE_SYNC] Comprehensive campaign state broadcasted for campaign %s: %.1f%% complete, phase: %s, status: %s",
		campaignID, stateData.Progress, stateData.CurrentPhase, stateData.PhaseStatus)

	// Also send a specific state sync confirmation message
	syncMessage := WebSocketMessage{
		ID:         uuid.New().String(),
		Timestamp:  time.Now().UTC().Format(time.RFC3339),
		Type:       "campaign.state.sync.complete",
		CampaignID: campaignID,
		Message:    fmt.Sprintf("State sync complete: %.1f%% progress in %s phase", stateData.Progress, stateData.CurrentPhase),
		Data: map[string]interface{}{
			"stateData": stateData,
		},
	}
	broadcaster.BroadcastToCampaign(campaignID, syncMessage)
}
