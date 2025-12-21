// File: backend/internal/services/sse_service.go
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// SSEEventType represents the different types of SSE events
type SSEEventType string

const (
	SSEEventCampaignProgress   SSEEventType = "campaign_progress"
	SSEEventCampaignCompleted  SSEEventType = "campaign_completed"
	SSEEventPhaseStarted       SSEEventType = "phase_started"
	SSEEventPhasePaused        SSEEventType = "phase_paused"
	SSEEventPhaseResumed       SSEEventType = "phase_resumed"
	SSEEventPhaseCompleted     SSEEventType = "phase_completed"
	SSEEventPhaseFailed        SSEEventType = "phase_failed"
	SSEEventPhaseAutoStarted   SSEEventType = "phase_auto_started"
	SSEEventDomainGenerated    SSEEventType = "domain_generated"
	SSEEventDomainValidated    SSEEventType = "domain_validated"
	SSEEventDomainStatusDelta  SSEEventType = "domain_status_delta"
	SSEEventCountersReconciled SSEEventType = "counters_reconciled"
	SSEEventAnalysisCompleted  SSEEventType = "analysis_completed"
	SSEEventModeChanged        SSEEventType = "mode_changed"
	// Keyword set lifecycle events
	SSEEventKeywordSetCreated SSEEventType = "keyword_set_created"
	SSEEventKeywordSetUpdated SSEEventType = "keyword_set_updated"
	SSEEventKeywordSetDeleted SSEEventType = "keyword_set_deleted"
	SSEEventKeepAlive         SSEEventType = "keep_alive"
	SSEEventError             SSEEventType = "error"
)

var knownSSEEventTypes = map[SSEEventType]struct{}{
	SSEEventCampaignProgress:   {},
	SSEEventCampaignCompleted:  {},
	SSEEventPhaseStarted:       {},
	SSEEventPhasePaused:        {},
	SSEEventPhaseResumed:       {},
	SSEEventPhaseCompleted:     {},
	SSEEventPhaseFailed:        {},
	SSEEventPhaseAutoStarted:   {},
	SSEEventDomainGenerated:    {},
	SSEEventDomainValidated:    {},
	SSEEventDomainStatusDelta:  {},
	SSEEventCountersReconciled: {},
	SSEEventAnalysisCompleted:  {},
	SSEEventModeChanged:        {},
	SSEEventKeywordSetCreated:  {},
	SSEEventKeywordSetUpdated:  {},
	SSEEventKeywordSetDeleted:  {},
	SSEEventKeepAlive:          {},
	SSEEventError:              {},
}

const (
	defaultKeepAliveInterval = 12 * time.Second
	defaultStaleClientTTL    = 45 * time.Second
	defaultCleanupInterval   = 30 * time.Second
	canonicalEnvelopeVersion = 1
)

type SSEConfig struct {
	KeepAliveInterval time.Duration
	StaleClientTTL    time.Duration
	CleanupInterval   time.Duration
}

// SSEEvent represents a server-sent event
type SSEEvent struct {
	ID         string                 `json:"id,omitempty"`
	Event      SSEEventType           `json:"event"`
	Data       map[string]interface{} `json:"data"`
	Timestamp  time.Time              `json:"timestamp"`
	CampaignID *uuid.UUID             `json:"campaign_id,omitempty"`
	UserID     *uuid.UUID             `json:"user_id,omitempty"`
}

type canonicalEnvelope struct {
	Version int                    `json:"version"`
	Type    string                 `json:"type"`
	Payload map[string]interface{} `json:"payload"`
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
	writeMu        sync.Mutex
}

// SSEService manages Server-Sent Events connections and broadcasting
type SSEService struct {
	clients         map[string]*SSEClient
	mutex           sync.RWMutex
	keepAlive       time.Duration
	staleClientTTL  time.Duration
	cleanupInterval time.Duration
	maxClients      int
	eventBuffer     int
	// metrics
	startTime   time.Time
	totalEvents uint64
	cleanupOnce sync.Once
}

// NewSSEService creates a new SSE service
func NewSSEService() *SSEService {
	cfg := defaultSSEConfig()
	return &SSEService{
		clients:         make(map[string]*SSEClient),
		keepAlive:       cfg.KeepAliveInterval,
		staleClientTTL:  cfg.StaleClientTTL,
		cleanupInterval: cfg.CleanupInterval,
		maxClients:      1000, // Reasonable limit to prevent resource exhaustion
		eventBuffer:     100,  // Buffer size for event channels
		startTime:       time.Now(),
	}
}

func defaultSSEConfig() SSEConfig {
	return SSEConfig{
		KeepAliveInterval: defaultKeepAliveInterval,
		StaleClientTTL:    defaultStaleClientTTL,
		CleanupInterval:   defaultCleanupInterval,
	}
}

// Start begins periodic cleanup for stale SSE clients.
func (s *SSEService) Start(ctx context.Context) {
	s.cleanupOnce.Do(func() {
		if s.cleanupInterval <= 0 {
			return
		}
		go s.runCleanupLoop(ctx)
	})
}

func (s *SSEService) runCleanupLoop(ctx context.Context) {
	ticker := time.NewTicker(s.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.Cleanup()
		}
	}
}

// RegisterClient registers a new SSE client
func (s *SSEService) RegisterClient(ctx context.Context, w http.ResponseWriter, userID uuid.UUID, campaignID *uuid.UUID, allowedOrigin string) (*SSEClient, error) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		log.Printf("[SSE] registration failed: flusher unavailable (user=%s campaign=%v)", userID.String(), campaignID)
		return nil, fmt.Errorf("streaming not supported by this response writer")
	}

	s.mutex.Lock()
	// Check client limit
	if len(s.clients) >= s.maxClients {
		s.mutex.Unlock()
		log.Printf("[SSE] registration failed: max clients reached (user=%s campaign=%v)", userID.String(), campaignID)
		return nil, fmt.Errorf("maximum number of SSE clients reached")
	}

	// Set SSE headers (copied to actual response by handler)
	headers := w.Header()
	headers.Set("Content-Type", "text/event-stream")
	headers.Set("Cache-Control", "no-cache")
	headers.Set("Connection", "keep-alive")
	headers.Set("X-Accel-Buffering", "no")
	headers.Set("Access-Control-Allow-Headers", "Cache-Control, Last-Event-ID")
	headers.Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	// Preserve any CORS headers already applied by upstream middleware; only override when an
	// explicit allowed origin is provided. Clearing here would strip the origin echoed by the
	// CORS layer and cause the browser to immediately drop the connection.
	if allowedOrigin != "" {
		headers.Set("Access-Control-Allow-Origin", allowedOrigin)
		headers.Set("Access-Control-Allow-Credentials", "true")
		ensureHeaderValue(headers, "Vary", "Origin")
	}
	w.WriteHeader(http.StatusOK)

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
	s.mutex.Unlock()
	log.Printf("[SSE] client registered id=%s user=%s campaign=%v origin=%s total=%d", clientID, userID.String(), campaignID, allowedOrigin, len(s.clients))

	initialEvent := SSEEvent{
		ID:         uuid.New().String(),
		Event:      SSEEventKeepAlive,
		Data:       map[string]interface{}{"message": "SSE connection established"},
		Timestamp:  time.Now(),
		CampaignID: campaignID,
		UserID:     &userID,
	}
	if err := s.emitEventToClient(client, initialEvent); err != nil {
		log.Printf("[SSE] initial send failed id=%s err=%v", clientID, err)
		s.UnregisterClient(clientID)
		return nil, err
	}

	// Start keep-alive routine for this client
	go s.clientKeepAlive(client)

	return client, nil
}

func ensureHeaderValue(headers http.Header, key, value string) {
	if headers == nil {
		return
	}
	for _, existing := range headers.Values(key) {
		if strings.EqualFold(existing, value) {
			return
		}
	}
	headers.Add(key, value)
}

// UnregisterClient removes a client from the service
func (s *SSEService) UnregisterClient(clientID string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if client, exists := s.clients[clientID]; exists {
		client.Cancel()
		delete(s.clients, clientID)
		log.Printf("[SSE] client unregistered id=%s user=%s campaign=%v total=%d", clientID, client.UserID.String(), client.CampaignID, len(s.clients))
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

	targetIDs := make([]string, 0, len(s.clients))
	for _, client := range s.clients {
		if client.CampaignID != nil && *client.CampaignID == campaignID {
			targetIDs = append(targetIDs, client.ID)
			go s.sendEventToClient(client, event)
		}
	}

	if event.Event == SSEEventCampaignProgress {
		sample := sampleClientIDs(targetIDs, 5)
		summary := ""
		if envelope, err := s.buildCanonicalEnvelope(event); err == nil {
			summary = summarizeCanonicalEvent(envelope)
		} else {
			summary = fmt.Sprintf("canonicalization_error=%v", err)
		}
		log.Printf(
			"[SSE] broadcast campaign=%s event=%s clients=%d sample=%v summary=%s",
			campaignID.String(),
			string(event.Event),
			len(targetIDs),
			sample,
			summary,
		)
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
	if err := s.emitEventToClient(client, event); err != nil {
		log.Printf("[SSE] send failed id=%s event=%s err=%v", client.ID, event.Event, err)
		s.UnregisterClient(client.ID)
	}
}

func (s *SSEService) emitEventToClient(client *SSEClient, event SSEEvent) error {
	select {
	case <-client.Context.Done():
		return fmt.Errorf("client context done")
	default:
	}

	if event.ID == "" {
		event.ID = uuid.New().String()
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	envelope, err := s.buildCanonicalEnvelope(event)
	if err != nil {
		return fmt.Errorf("canonicalize event: %w", err)
	}

	data, err := json.Marshal(envelope)
	if err != nil {
		return fmt.Errorf("marshal canonical event: %w", err)
	}

	client.writeMu.Lock()
	defer client.writeMu.Unlock()

	if _, err := fmt.Fprintf(client.ResponseWriter, "id: %s\n", event.ID); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(client.ResponseWriter, "event: %s\n", event.Event); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(client.ResponseWriter, "data: %s\n\n", string(data)); err != nil {
		return err
	}

	client.Flusher.Flush()
	client.LastSeen = time.Now()
	atomic.AddUint64(&s.totalEvents, 1)
	return nil
}

// clientKeepAlive maintains the connection with periodic keep-alive messages
func (s *SSEService) clientKeepAlive(client *SSEClient) {
	if s.keepAlive <= 0 {
		return
	}
	ticker := time.NewTicker(s.keepAlive)
	defer ticker.Stop()

	for {
		select {
		case <-client.Context.Done():
			return
		case <-ticker.C:
			keepAliveEvent := SSEEvent{
				Event:      SSEEventKeepAlive,
				Data:       map[string]interface{}{"timestamp": time.Now().Unix()},
				Timestamp:  time.Now(),
				CampaignID: client.CampaignID,
				UserID:     &client.UserID,
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

	cutoff := time.Now().Add(-s.staleClientTTL)
	for clientID, client := range s.clients {
		if client.LastSeen.Before(cutoff) {
			client.Cancel()
			delete(s.clients, clientID)
		}
	}
}

func sampleClientIDs(ids []string, max int) []string {
	if len(ids) == 0 || max <= 0 {
		return nil
	}
	if len(ids) <= max {
		return append([]string(nil), ids...)
	}
	out := make([]string, max)
	copy(out, ids[:max])
	return out
}

func summarizeCanonicalEvent(envelope canonicalEnvelope) string {
	parts := []string{
		fmt.Sprintf("version=%d", envelope.Version),
		fmt.Sprintf("type=%s", envelope.Type),
	}

	if overall, ok := envelope.Payload["overall"].(map[string]interface{}); ok {
		if pct, ok := overall["percentComplete"]; ok {
			parts = append(parts, fmt.Sprintf("percentComplete=%v", pct))
		}
		if processed, ok := overall["processedDomains"]; ok {
			parts = append(parts, fmt.Sprintf("processedDomains=%v", processed))
		}
		if total, ok := overall["totalDomains"]; ok {
			parts = append(parts, fmt.Sprintf("totalDomains=%v", total))
		}
		if status, ok := overall["status"]; ok {
			parts = append(parts, fmt.Sprintf("status=%v", status))
		}
	}

	return strings.Join(parts, " ")
}

func (s *SSEService) buildCanonicalEnvelope(event SSEEvent) (canonicalEnvelope, error) {
	var payload map[string]interface{}
	switch event.Event {
	case SSEEventCampaignProgress:
		var err error
		payload, err = s.normalizeCampaignProgressEvent(event)
		if err != nil {
			return canonicalEnvelope{}, err
		}
	default:
		payload = s.normalizeGenericEvent(event)
		if _, known := knownSSEEventTypes[event.Event]; !known {
			log.Printf("[SSE] canonicalizer received unknown event type=%s", event.Event)
		}
	}

	return canonicalEnvelope{
		Version: canonicalEnvelopeVersion,
		Type:    string(event.Event),
		Payload: payload,
	}, nil
}

func (s *SSEService) normalizeCampaignProgressEvent(event SSEEvent) (map[string]interface{}, error) {
	progressRaw, ok := event.Data["progress"].(map[string]interface{})
	if !ok {
		// Some emitters may still publish legacy payloads where campaign progress fields are
		// attached at the root of Data. Rather than disconnecting the client, synthesize a
		// minimal progress payload from those legacy fields.
		progressRaw = nil
		if event.Data != nil {
			// Try to decode JSON payloads if a non-map progress payload was provided.
			switch v := event.Data["progress"].(type) {
			case []byte:
				var decoded map[string]interface{}
				if err := json.Unmarshal(v, &decoded); err == nil {
					progressRaw = decoded
				}
			case json.RawMessage:
				var decoded map[string]interface{}
				if err := json.Unmarshal([]byte(v), &decoded); err == nil {
					progressRaw = decoded
				}
			case string:
				trimmed := strings.TrimSpace(v)
				if strings.HasPrefix(trimmed, "{") {
					var decoded map[string]interface{}
					if err := json.Unmarshal([]byte(trimmed), &decoded); err == nil {
						progressRaw = decoded
					}
				}
			}
		}
		if progressRaw == nil {
			progressRaw = make(map[string]interface{})
			if event.Data != nil {
				// Prefer explicit legacy keys if present.
				if v, ok := event.Data["current_phase"]; ok {
					progressRaw["current_phase"] = v
				}
				if v, ok := event.Data["currentPhase"]; ok {
					progressRaw["current_phase"] = v
				}
				if v, ok := event.Data["phase"]; ok {
					progressRaw["current_phase"] = v
				}
				if v, ok := event.Data["status"]; ok {
					progressRaw["status"] = v
				}
				if v, ok := event.Data["progress_pct"]; ok {
					progressRaw["progress_pct"] = v
				}
				if v, ok := event.Data["progressPct"]; ok {
					progressRaw["progressPct"] = v
				}
				if v, ok := event.Data["items_processed"]; ok {
					progressRaw["items_processed"] = v
				}
				if v, ok := event.Data["itemsProcessed"]; ok {
					progressRaw["itemsProcessed"] = v
				}
				if v, ok := event.Data["items_total"]; ok {
					progressRaw["items_total"] = v
				}
				if v, ok := event.Data["itemsTotal"]; ok {
					progressRaw["itemsTotal"] = v
				}
				if v, ok := event.Data["items_success"]; ok {
					progressRaw["items_success"] = v
				}
				if v, ok := event.Data["items_failed"]; ok {
					progressRaw["items_failed"] = v
				}
				if v, ok := event.Data["message"]; ok {
					progressRaw["message"] = v
				}
				if v, ok := event.Data["timestamp"]; ok {
					progressRaw["timestamp"] = v
				}
			}
		}

		// Ensure required fields exist so downstream consumers have a stable schema.
		progressRaw = normalizeProgressPayload(progressRaw)
	}

	payload := s.basePayload(event)
	overall := make(map[string]interface{})

	if status, ok := toString(progressRaw["status"]); ok {
		overall["status"] = status
	}
	if pct, ok := toFloat(progressRaw["progress_pct"]); ok {
		overall["percentComplete"] = pct
	}
	if processed, ok := toNumber(progressRaw["items_processed"]); ok {
		overall["processedDomains"] = processed
	}
	if total, ok := toNumber(progressRaw["items_total"]); ok {
		overall["totalDomains"] = total
	}
	if success, ok := toNumber(progressRaw["items_success"]); ok {
		overall["successfulDomains"] = success
	}
	if failed, ok := toNumber(progressRaw["items_failed"]); ok {
		overall["failedDomains"] = failed
	}

	payload["overall"] = overall

	if phase, ok := toString(progressRaw["current_phase"]); ok {
		payload["currentPhase"] = phase
	}
	if msg, ok := toString(progressRaw["message"]); ok {
		payload["message"] = msg
	}
	if ts, ok := toString(progressRaw["timestamp"]); ok {
		payload["timestamp"] = ts
	}

	return payload, nil
}

func (s *SSEService) normalizeGenericEvent(event SSEEvent) map[string]interface{} {
	result := s.basePayload(event)
	if result == nil {
		result = make(map[string]interface{})
	}
	for key, value := range event.Data {
		result[key] = value
	}
	return result
}

func (s *SSEService) basePayload(event SSEEvent) map[string]interface{} {
	payload := make(map[string]interface{})
	if event.CampaignID != nil {
		payload["campaignId"] = event.CampaignID.String()
	}
	if event.UserID != nil {
		payload["userId"] = event.UserID.String()
	}
	if !event.Timestamp.IsZero() {
		payload["timestamp"] = event.Timestamp.Format(time.RFC3339Nano)
	}
	return payload
}

func toString(value interface{}) (string, bool) {
	switch v := value.(type) {
	case string:
		return v, true
	case fmt.Stringer:
		return v.String(), true
	case []byte:
		return string(v), true
	default:
		return "", false
	}
}

func toFloat(value interface{}) (float64, bool) {
	switch v := value.(type) {
	case float64:
		return v, true
	case float32:
		return float64(v), true
	case int:
		return float64(v), true
	case int32:
		return float64(v), true
	case int64:
		return float64(v), true
	case uint:
		return float64(v), true
	case uint32:
		return float64(v), true
	case uint64:
		return float64(v), true
	case json.Number:
		if f, err := v.Float64(); err == nil {
			return f, true
		}
	}
	return 0, false
}

func toNumber(value interface{}) (int64, bool) {
	switch v := value.(type) {
	case int:
		return int64(v), true
	case int32:
		return int64(v), true
	case int64:
		return v, true
	case uint:
		return int64(v), true
	case uint32:
		return int64(v), true
	case uint64:
		if v <= math.MaxInt64 {
			return int64(v), true
		}
	case float32:
		return int64(v), true
	case float64:
		return int64(v), true
	case json.Number:
		if i, err := v.Int64(); err == nil {
			return i, true
		}
	}
	return 0, false
}

// Helper functions for creating specific event types

// CreateCampaignProgressEvent creates a campaign progress SSE event
func CreateCampaignProgressEvent(campaignID uuid.UUID, userID uuid.UUID, progress map[string]interface{}) SSEEvent {
	normalizedProgress := normalizeProgressPayload(progress)
	return SSEEvent{
		Event:      SSEEventCampaignProgress,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"progress":    normalizedProgress,
		},
		Timestamp: time.Now(),
	}
}

func normalizeProgressPayload(progress map[string]interface{}) map[string]interface{} {
	normalized := make(map[string]interface{}, len(progress)+4)
	for k, v := range progress {
		normalized[k] = v
	}

	ensureProgressField(normalized, "status", "unknown")
	mirrorProgressField(normalized, "progress_pct", "progressPct", float64(0))
	mirrorProgressField(normalized, "items_processed", "itemsProcessed", int64(0))
	mirrorProgressField(normalized, "items_total", "itemsTotal", int64(0))

	return normalized
}

func ensureProgressField(m map[string]interface{}, key string, defaultValue interface{}) {
	if _, ok := m[key]; !ok {
		m[key] = defaultValue
	}
}

func mirrorProgressField(m map[string]interface{}, snakeKey, camelKey string, defaultValue interface{}) {
	snakeVal, snakeOk := m[snakeKey]
	camelVal, camelOk := m[camelKey]

	switch {
	case snakeOk && !camelOk:
		m[camelKey] = snakeVal
	case camelOk && !snakeOk:
		m[snakeKey] = camelVal
	case !snakeOk && !camelOk:
		m[snakeKey] = defaultValue
		if snakeKey != camelKey {
			m[camelKey] = defaultValue
		}
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

// CreatePhasePausedEvent creates a phase paused SSE event
func CreatePhasePausedEvent(campaignID uuid.UUID, userID uuid.UUID, phase models.PhaseTypeEnum) SSEEvent {
	return SSEEvent{
		Event:      SSEEventPhasePaused,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"phase":       string(phase),
			"message":     fmt.Sprintf("Phase %s paused", phase),
		},
		Timestamp: time.Now(),
	}
}

// CreatePhaseResumedEvent creates a phase resumed SSE event
func CreatePhaseResumedEvent(campaignID uuid.UUID, userID uuid.UUID, phase models.PhaseTypeEnum) SSEEvent {
	return SSEEvent{
		Event:      SSEEventPhaseResumed,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"phase":       string(phase),
			"message":     fmt.Sprintf("Phase %s resumed", phase),
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

// ====================================================================
// P2 Contract: SSE Lifecycle Events with Sequence (§5-6 of PHASE_STATE_CONTRACT.md)
// ====================================================================

// CreatePhaseStartedEventWithSequence creates a phase started SSE event with lifecycle sequence.
// Per contract: sequence is monotonically increasing per campaign, generated at persist time.
func CreatePhaseStartedEventWithSequence(campaignID uuid.UUID, userID uuid.UUID, phase models.PhaseTypeEnum, sequence int64) SSEEvent {
	return SSEEvent{
		Event:      SSEEventPhaseStarted,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"phase":       string(phase),
			"sequence":    sequence,
			"message":     fmt.Sprintf("Phase %s started", phase),
		},
		Timestamp: time.Now(),
	}
}

// CreatePhasePausedEventWithSequence creates a phase paused SSE event with lifecycle sequence.
func CreatePhasePausedEventWithSequence(campaignID uuid.UUID, userID uuid.UUID, phase models.PhaseTypeEnum, sequence int64) SSEEvent {
	return SSEEvent{
		Event:      SSEEventPhasePaused,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"phase":       string(phase),
			"sequence":    sequence,
			"message":     fmt.Sprintf("Phase %s paused", phase),
		},
		Timestamp: time.Now(),
	}
}

// CreatePhaseResumedEventWithSequence creates a phase resumed SSE event with lifecycle sequence.
func CreatePhaseResumedEventWithSequence(campaignID uuid.UUID, userID uuid.UUID, phase models.PhaseTypeEnum, sequence int64) SSEEvent {
	return SSEEvent{
		Event:      SSEEventPhaseResumed,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"phase":       string(phase),
			"sequence":    sequence,
			"message":     fmt.Sprintf("Phase %s resumed", phase),
		},
		Timestamp: time.Now(),
	}
}

// CreatePhaseCompletedEventWithSequence creates a phase completed SSE event with lifecycle sequence.
func CreatePhaseCompletedEventWithSequence(campaignID uuid.UUID, userID uuid.UUID, phase models.PhaseTypeEnum, sequence int64, results map[string]interface{}) SSEEvent {
	data := map[string]interface{}{
		"campaign_id": campaignID.String(),
		"phase":       string(phase),
		"sequence":    sequence,
		"results":     results,
		"message":     fmt.Sprintf("Phase %s completed successfully", phase),
	}
	return SSEEvent{
		Event:      SSEEventPhaseCompleted,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data:       data,
		Timestamp:  time.Now(),
	}
}

// CreatePhaseFailedEventWithSequence creates a phase failed SSE event with lifecycle sequence.
func CreatePhaseFailedEventWithSequence(campaignID uuid.UUID, userID uuid.UUID, phase models.PhaseTypeEnum, sequence int64, errorMsg string) SSEEvent {
	return SSEEvent{
		Event:      SSEEventPhaseFailed,
		CampaignID: &campaignID,
		UserID:     &userID,
		Data: map[string]interface{}{
			"campaign_id": campaignID.String(),
			"phase":       string(phase),
			"sequence":    sequence,
			"error":       errorMsg,
			"message":     fmt.Sprintf("Phase %s failed", phase),
		},
		Timestamp: time.Now(),
	}
}