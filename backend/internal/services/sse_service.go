// File: backend/internal/services/sse_service.go
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// SSEEventType represents the different types of SSE events
type SSEEventType string

const (
	SSEEventCampaignProgress  SSEEventType = "campaign_progress"
	SSEEventCampaignCompleted SSEEventType = "campaign_completed"
	SSEEventPhaseStarted      SSEEventType = "phase_started"
	SSEEventPhaseCompleted    SSEEventType = "phase_completed"
	SSEEventPhaseFailed       SSEEventType = "phase_failed"
	SSEEventPhaseAutoStarted  SSEEventType = "phase_auto_started"
	SSEEventDomainGenerated   SSEEventType = "domain_generated"
	SSEEventDomainValidated   SSEEventType = "domain_validated"
	SSEEventAnalysisCompleted SSEEventType = "analysis_completed"
	SSEEventModeChanged       SSEEventType = "mode_changed"
	// Keyword set lifecycle events
	SSEEventKeywordSetCreated SSEEventType = "keyword_set_created"
	SSEEventKeywordSetUpdated SSEEventType = "keyword_set_updated"
	SSEEventKeywordSetDeleted SSEEventType = "keyword_set_deleted"
	SSEEventKeepAlive         SSEEventType = "keep_alive"
	SSEEventError             SSEEventType = "error"
)

// SSEEvent represents a server-sent event
type SSEEvent struct {
	ID         string                 `json:"id,omitempty"`
	Event      SSEEventType           `json:"event"`
	Data       map[string]interface{} `json:"data"`
	Timestamp  time.Time              `json:"timestamp"`
	CampaignID *uuid.UUID             `json:"campaign_id,omitempty"`
	UserID     *uuid.UUID             `json:"user_id,omitempty"`
}

// SSEClient represents a connected SSE client
type SSEClient struct {
	ID             string
	UserID         uuid.UUID
	CampaignID     *uuid.UUID // Optional: filter events for specific campaign
	ResponseWriter http.ResponseWriter
	Flusher        http.Flusher
	Context        context.Context
	Cancel         context.CancelFunc
	LastSeen       time.Time
}

// SSEService manages Server-Sent Events connections and broadcasting
type SSEService struct {
	clients     map[string]*SSEClient
	mutex       sync.RWMutex
	keepAlive   time.Duration
	maxClients  int
	eventBuffer int
	// metrics
	startTime   time.Time
	totalEvents uint64
}

// NewSSEService creates a new SSE service
func NewSSEService() *SSEService {
	return &SSEService{
		clients:     make(map[string]*SSEClient),
		keepAlive:   30 * time.Second,
		maxClients:  1000, // Reasonable limit to prevent resource exhaustion
		eventBuffer: 100,  // Buffer size for event channels
		startTime:   time.Now(),
	}
}

// RegisterClient registers a new SSE client
func (s *SSEService) RegisterClient(ctx context.Context, w http.ResponseWriter, userID uuid.UUID, campaignID *uuid.UUID) (*SSEClient, error) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		return nil, fmt.Errorf("streaming not supported by this response writer")
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	// Check client limit
	if len(s.clients) >= s.maxClients {
		return nil, fmt.Errorf("maximum number of SSE clients reached")
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Cache-Control")

	clientCtx, cancel := context.WithCancel(ctx)
	clientID := uuid.New().String()

	client := &SSEClient{
		ID:             clientID,
		UserID:         userID,
		CampaignID:     campaignID,
		ResponseWriter: w,
		Flusher:        flusher,
		Context:        clientCtx,
		Cancel:         cancel,
		LastSeen:       time.Now(),
	}

	s.clients[clientID] = client

	// Send initial connection event
	s.sendEventToClient(client, SSEEvent{
		ID:        uuid.New().String(),
		Event:     SSEEventKeepAlive,
		Data:      map[string]interface{}{"message": "SSE connection established"},
		Timestamp: time.Now(),
		UserID:    &userID,
	})

	// Start keep-alive routine for this client
	go s.clientKeepAlive(client)

	return client, nil
}

// UnregisterClient removes a client from the service
func (s *SSEService) UnregisterClient(clientID string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if client, exists := s.clients[clientID]; exists {
		client.Cancel()
		delete(s.clients, clientID)
	}
}

// BroadcastEvent sends an event to all connected clients
func (s *SSEService) BroadcastEvent(event SSEEvent) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	for _, client := range s.clients {
		// Filter events by user and optionally by campaign
		if s.shouldSendEventToClient(client, event) {
			go s.sendEventToClient(client, event)
		}
	}
}

// BroadcastToUser sends an event to all clients for a specific user
func (s *SSEService) BroadcastToUser(userID uuid.UUID, event SSEEvent) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	for _, client := range s.clients {
		if client.UserID == userID && s.shouldSendEventToClient(client, event) {
			go s.sendEventToClient(client, event)
		}
	}
}

// BroadcastToCampaign sends an event to all clients watching a specific campaign
func (s *SSEService) BroadcastToCampaign(campaignID uuid.UUID, event SSEEvent) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	for _, client := range s.clients {
		if client.CampaignID != nil && *client.CampaignID == campaignID {
			go s.sendEventToClient(client, event)
		}
	}
}

// shouldSendEventToClient determines if an event should be sent to a specific client
func (s *SSEService) shouldSendEventToClient(client *SSEClient, event SSEEvent) bool {
	// Always send to user's own events
	if event.UserID != nil && *event.UserID == client.UserID {
		return true
	}

	// If client is watching a specific campaign, only send campaign-related events
	if client.CampaignID != nil {
		return event.CampaignID != nil && *event.CampaignID == *client.CampaignID
	}

	// For global listeners (no specific campaign), send user-scoped events
	return event.UserID != nil && *event.UserID == client.UserID
}

// sendEventToClient sends an SSE event to a specific client
func (s *SSEService) sendEventToClient(client *SSEClient, event SSEEvent) {
	select {
	case <-client.Context.Done():
		// Client disconnected, remove from service
		s.UnregisterClient(client.ID)
		return
	default:
	}

	// Ensure event has an ID and timestamp
	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	// Serialize event data
	data, err := json.Marshal(event)
	if err != nil {
		fmt.Printf("Error marshaling SSE event: %v\n", err)
		return
	}

	// Send SSE formatted message
	_, err = fmt.Fprintf(client.ResponseWriter, "id: %s\n", event.ID)
	if err != nil {
		s.UnregisterClient(client.ID)
		return
	}

	_, err = fmt.Fprintf(client.ResponseWriter, "event: %s\n", event.Event)
	if err != nil {
		s.UnregisterClient(client.ID)
		return
	}

	_, err = fmt.Fprintf(client.ResponseWriter, "data: %s\n\n", string(data))
	if err != nil {
		s.UnregisterClient(client.ID)
		return
	}

	client.Flusher.Flush()
	client.LastSeen = time.Now()
	// increment global counter after successful flush
	atomic.AddUint64(&s.totalEvents, 1)
}

// clientKeepAlive maintains the connection with periodic keep-alive messages
func (s *SSEService) clientKeepAlive(client *SSEClient) {
	ticker := time.NewTicker(s.keepAlive)
	defer ticker.Stop()

	for {
		select {
		case <-client.Context.Done():
			return
		case <-ticker.C:
			keepAliveEvent := SSEEvent{
				Event:     SSEEventKeepAlive,
				Data:      map[string]interface{}{"timestamp": time.Now().Unix()},
				Timestamp: time.Now(),
				UserID:    &client.UserID,
			}
			s.sendEventToClient(client, keepAliveEvent)
		}
	}
}

// GetClientCount returns the current number of connected clients
func (s *SSEService) GetClientCount() int {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return len(s.clients)
}

// GetClientsForUser returns the number of clients connected for a specific user
func (s *SSEService) GetClientsForUser(userID uuid.UUID) int {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	count := 0
	for _, client := range s.clients {
		if client.UserID == userID {
			count++
		}
	}
	return count
}

// GetTotalEvents returns the total number of events sent since service start
func (s *SSEService) GetTotalEvents() int {
	return int(atomic.LoadUint64(&s.totalEvents))
}

// GetUptime returns the duration since the SSE service started
func (s *SSEService) GetUptime() time.Duration {
	// startTime is set at construction time and never changes
	return time.Since(s.startTime)
}

// Cleanup removes stale clients
func (s *SSEService) Cleanup() {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	cutoff := time.Now().Add(-2 * s.keepAlive)
	for clientID, client := range s.clients {
		if client.LastSeen.Before(cutoff) {
			client.Cancel()
			delete(s.clients, clientID)
		}
	}
}

// Helper functions for creating specific event types

// CreateCampaignProgressEvent creates a campaign progress SSE event
func CreateCampaignProgressEvent(campaignID uuid.UUID, userID uuid.UUID, progress map[string]interface{}) SSEEvent {
	return SSEEvent{
		Event:      SSEEventCampaignProgress,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"progress":    progress,
		},
		Timestamp: time.Now(),
	}
}

// CreatePhaseStartedEvent creates a phase started SSE event
func CreatePhaseStartedEvent(campaignID uuid.UUID, userID uuid.UUID, phase models.PhaseTypeEnum) SSEEvent {
	return SSEEvent{
		Event:      SSEEventPhaseStarted,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"phase":       string(phase),
			"message":     fmt.Sprintf("Phase %s started", phase),
		},
		Timestamp: time.Now(),
	}
}

// CreatePhaseCompletedEvent creates a phase completed SSE event
func CreatePhaseCompletedEvent(campaignID uuid.UUID, userID uuid.UUID, phase models.PhaseTypeEnum, results map[string]interface{}) SSEEvent {
	return SSEEvent{
		Event:      SSEEventPhaseCompleted,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"phase":       string(phase),
			"results":     results,
			"message":     fmt.Sprintf("Phase %s completed successfully", phase),
		},
		Timestamp: time.Now(),
	}
}

// CreatePhaseFailedEvent creates a phase failed SSE event
func CreatePhaseFailedEvent(campaignID uuid.UUID, userID uuid.UUID, phase models.PhaseTypeEnum, error string) SSEEvent {
	return SSEEvent{
		Event:      SSEEventPhaseFailed,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"phase":       string(phase),
			"error":       error,
			"message":     fmt.Sprintf("Phase %s failed", phase),
		},
		Timestamp: time.Now(),
	}
}

// CreateCampaignCompletedEvent creates a campaign completed SSE event
func CreateCampaignCompletedEvent(campaignID uuid.UUID, userID uuid.UUID, meta map[string]interface{}) SSEEvent {
	data := map[string]interface{}{
		"campaign_id": campaignID.String(),
		"message":     "Campaign completed successfully",
	}
	for k, v := range meta {
		data[k] = v
	}
	return SSEEvent{
		Event:      SSEEventCampaignCompleted,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data:       data,
		Timestamp:  time.Now(),
	}
}

// CreateModeChangedEvent emits when campaign execution mode changes
func CreateModeChangedEvent(campaignID uuid.UUID, userID uuid.UUID, mode string) SSEEvent {
	return SSEEvent{
		Event:      SSEEventModeChanged,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"mode":        mode,
			"message":     fmt.Sprintf("Campaign mode changed to %s", mode),
		},
		Timestamp: time.Now(),
	}
}

// CreatePhaseAutoStartedEvent emits when a phase is started automatically (chained) in full_sequence mode
func CreatePhaseAutoStartedEvent(campaignID uuid.UUID, userID uuid.UUID, phase models.PhaseTypeEnum) SSEEvent {
	return SSEEvent{
		Event:      SSEEventPhaseAutoStarted,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"phase":       string(phase),
			"message":     fmt.Sprintf("Phase %s auto-started", phase),
		},
		Timestamp: time.Now(),
	}
}
