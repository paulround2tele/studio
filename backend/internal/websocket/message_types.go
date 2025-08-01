package websocket

import (
	"encoding/json"
	"log"
	"time"
)

// StandardizedWebSocketMessage represents the new unified message structure
type StandardizedWebSocketMessage struct {
	Type      string          `json:"type"`
	Timestamp time.Time       `json:"timestamp"`
	Data      json.RawMessage `json:"data"`
}

// CampaignProgressPayload represents campaign progress update data
type CampaignProgressPayload struct {
	CampaignID      string  `json:"campaignId"`
	TotalItems      int64   `json:"totalItems"`
	ProcessedItems  int64   `json:"processedItems"`
	SuccessfulItems int64   `json:"successfulItems"`
	FailedItems     int64   `json:"failedItems"`
	ProgressPercent float64 `json:"progressPercent"`
	CurrentPhase    string  `json:"currentPhase"`
	PhaseStatus     string  `json:"phaseStatus"`
}

// CampaignStatusPayload represents campaign status changes
type CampaignStatusPayload struct {
	CampaignID   string `json:"campaignId"`
	PhaseStatus  string `json:"phaseStatus"`
	CurrentPhase string `json:"currentPhase,omitempty"`
	Message      string `json:"message,omitempty"`
	ErrorCode    string `json:"errorCode,omitempty"`
}

// SystemNotificationPayload represents system-wide notifications
type SystemNotificationPayload struct {
	Level      string `json:"level"` // info, warning, error
	Message    string `json:"message"`
	Category   string `json:"category,omitempty"`   // campaign, system, user
	Actionable bool   `json:"actionable,omitempty"` // requires user action
}

// ProxyStatusPayload represents proxy status updates
type ProxyStatusPayload struct {
	ProxyID      string `json:"proxyId"`
	Status       string `json:"status"`
	CampaignID   string `json:"campaignId,omitempty"`
	Health       string `json:"health,omitempty"`
	ResponseTime int64  `json:"responseTime,omitempty"` // milliseconds
}

// CampaignListUpdatePayload represents campaign list changes (for eliminating polling)
type CampaignListUpdatePayload struct {
	Action     string      `json:"action"` // "create", "update", "delete", "bulk_update"
	CampaignID string      `json:"campaignId,omitempty"`
	Campaign   interface{} `json:"campaign,omitempty"`  // Full campaign data for create/update
	Campaigns  interface{} `json:"campaigns,omitempty"` // Multiple campaigns for bulk operations
}

// Helper functions to create standardized messages

// CreateCampaignListUpdateMessageV2 creates a standardized campaign list update message
func CreateCampaignListUpdateMessageV2(payload CampaignListUpdatePayload) StandardizedWebSocketMessage {
	data, _ := json.Marshal(payload)
	return StandardizedWebSocketMessage{
		Type:      "campaign.list.update",
		Timestamp: time.Now(),
		Data:      data,
	}
}

// CreateCampaignProgressMessageV2 creates a standardized campaign progress message
func CreateCampaignProgressMessageV2(payload CampaignProgressPayload) StandardizedWebSocketMessage {
	data, _ := json.Marshal(payload)
	return StandardizedWebSocketMessage{
		Type:      "campaign_progress", // Fixed: Use underscore to match frontend expectations
		Timestamp: time.Now(),
		Data:      data,
	}
}

// CreateCampaignStatusMessageV2 creates a standardized campaign status message
func CreateCampaignStatusMessageV2(payload CampaignStatusPayload) StandardizedWebSocketMessage {
	data, _ := json.Marshal(payload)
	return StandardizedWebSocketMessage{
		Type:      "campaign_status", // Fixed: Use underscore to match frontend expectations
		Timestamp: time.Now(),
		Data:      data,
	}
}

// CreateSystemNotificationMessageV2 creates a standardized system notification message
func CreateSystemNotificationMessageV2(payload SystemNotificationPayload) StandardizedWebSocketMessage {
	data, _ := json.Marshal(payload)
	return StandardizedWebSocketMessage{
		Type:      "system.notification",
		Timestamp: time.Now(),
		Data:      data,
	}
}

// CreateProxyStatusMessageV2 creates a standardized proxy status message
func CreateProxyStatusMessageV2(payload ProxyStatusPayload) StandardizedWebSocketMessage {
	data, _ := json.Marshal(payload)
	return StandardizedWebSocketMessage{
		Type:      "proxy.status",
		Timestamp: time.Now(),
		Data:      data,
	}
}

// User-Driven Phase Lifecycle message payloads
type PhaseStateChangedPayload struct {
	CampaignID string `json:"campaign_id"`
	Phase      string `json:"phase"`
	OldState   string `json:"old_state"`
	NewState   string `json:"new_state"`
	Timestamp  string `json:"timestamp"`
}

type PhaseConfigurationRequiredPayload struct {
	CampaignID string `json:"campaign_id"`
	Phase      string `json:"phase"`
	Message    string `json:"message"`
}

// CreatePhaseStateChangedMessageV2 creates a standardized phase state change message
func CreatePhaseStateChangedMessageV2(payload PhaseStateChangedPayload) StandardizedWebSocketMessage {
	data, _ := json.Marshal(payload)
	return StandardizedWebSocketMessage{
		Type:      "phase.state.changed",
		Timestamp: time.Now(),
		Data:      data,
	}
}

// CreatePhaseConfigurationRequiredMessageV2 creates a standardized phase configuration required message
func CreatePhaseConfigurationRequiredMessageV2(payload PhaseConfigurationRequiredPayload) StandardizedWebSocketMessage {
	data, _ := json.Marshal(payload)
	return StandardizedWebSocketMessage{
		Type:      "phase.configuration.required",
		Timestamp: time.Now(),
		Data:      data,
	}
}

// PhaseTransitionPayload represents phase transition events with complete context
type PhaseTransitionPayload struct {
	CampaignID         string                 `json:"campaignId"`
	PreviousPhase      string                 `json:"previousPhase,omitempty"`
	NewPhase           string                 `json:"newPhase"`
	NewStatus          string                 `json:"newStatus"`
	TransitionType     string                 `json:"transitionType"` // "automatic", "manual", "error_recovery"
	TriggerReason      string                 `json:"triggerReason,omitempty"`
	PrerequisitesMet   bool                   `json:"prerequisitesMet"`
	DataIntegrityCheck bool                   `json:"dataIntegrityCheck"`
	DomainsCount       int64                  `json:"domainsCount"`
	ProcessedCount     int64                  `json:"processedCount"`
	SuccessfulCount    int64                  `json:"successfulCount"`
	FailedCount        int64                  `json:"failedItems"`
	EstimatedDuration  int64                  `json:"estimatedDuration,omitempty"` // seconds
	TransitionMetadata map[string]interface{} `json:"transitionMetadata,omitempty"`
	RollbackData       map[string]interface{} `json:"rollbackData,omitempty"` // For error recovery
}

// CreatePhaseTransitionMessageV2 creates a standardized phase transition message with complete context
func CreatePhaseTransitionMessageV2(payload PhaseTransitionPayload) StandardizedWebSocketMessage {
	data, _ := json.Marshal(payload)
	return StandardizedWebSocketMessage{
		Type:      "campaign.phase.transition",
		Timestamp: time.Now(),
		Data:      data,
	}
}

// WebSocketEventSequence manages event ordering and deduplication
type WebSocketEventSequence struct {
	CampaignID      string `json:"campaignId"`
	EventID         string `json:"eventId"`        // Unique event identifier
	SequenceNumber  int64  `json:"sequenceNumber"` // Global sequence for ordering
	EventHash       string `json:"eventHash"`      // Hash for deduplication
	PreviousEventID string `json:"previousEventId,omitempty"`
	CheckpointData  bool   `json:"checkpointData"` // Whether this event includes full state
}

// BroadcastStandardizedMessage broadcasts a standardized message to campaign subscribers
func (m *WebSocketManager) BroadcastStandardizedMessage(campaignID string, message StandardizedWebSocketMessage) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	// DIAGNOSTIC: Enhanced logging for websocket broadcasting
	log.Printf("[DIAGNOSTIC] BroadcastStandardizedMessage called:")
	log.Printf("  CampaignID: %s", campaignID)
	log.Printf("  Message Type: %s", message.Type)
	log.Printf("  Message Timestamp: %v", message.Timestamp)
	log.Printf("  Active Clients: %d", len(m.clients))

	// Convert to JSON for broadcasting
	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("[DIAGNOSTIC] Failed to marshal message: %v", err)
		return
	}

	log.Printf("[DIAGNOSTIC] Message JSON length: %d bytes", len(messageBytes))
	if len(messageBytes) > 200 {
		log.Printf("[DIAGNOSTIC] Message JSON preview: %s...", string(messageBytes[:200]))
	} else {
		log.Printf("[DIAGNOSTIC] Message JSON full: %s", string(messageBytes))
	}

	// Broadcast to all clients subscribed to this campaign
	broadcastCount := 0
	for client := range m.clients {
		select {
		case client.send <- messageBytes:
			broadcastCount++
			log.Printf("[DIAGNOSTIC] Message sent to client %p", client)
		default:
			close(client.send)
			delete(m.clients, client)
			log.Printf("[DIAGNOSTIC] Removed slow/disconnected client %p", client)
		}
	}

	log.Printf("[DIAGNOSTIC] Successfully broadcast to %d clients", broadcastCount)
}
