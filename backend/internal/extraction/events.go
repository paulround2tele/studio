package extraction

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// PhaseEvent represents a standardized event for extraction phase updates
type PhaseEvent struct {
	EventID        string                 `json:"event_id"`
	CampaignID     string                 `json:"campaign_id"`
	DomainID       *string                `json:"domain_id,omitempty"`
	EventType      string                 `json:"event_type"`
	Phase          string                 `json:"phase"`
	SubStep        string                 `json:"sub_step"`
	Status         string                 `json:"status"`
	Progress       *float64               `json:"progress,omitempty"`
	Message        *string                `json:"message,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	Timestamp      time.Time              `json:"timestamp"`
	ProcessingTime *time.Duration         `json:"processing_time,omitempty"`
}

// EventType constants
const (
	EventTypePhaseStart    = "phase_start"
	EventTypePhaseProgress = "phase_progress"
	EventTypePhaseComplete = "phase_complete"
	EventTypePhaseError    = "phase_error"
	EventTypeSubStepStart  = "substep_start"
	EventTypeSubStepEnd    = "substep_end"
	EventTypeDomainUpdate  = "domain_update"
)

// Phase constants
const (
	PhaseExtraction     = "extraction"
	PhaseKeywordProcess = "keyword_processing"
	PhaseMicrocrawl     = "microcrawl"
	PhaseAggregation    = "aggregation"
	PhasePersistence    = "persistence"
	PhaseAnalysis       = "analysis"
)

// SubStep constants
const (
	SubStepHTTPFetch        = "http_fetch"
	SubStepContentParse     = "content_parse"
	SubStepKeywordExtract   = "keyword_extract"
	SubStepMicrocrawlGate   = "microcrawl_gate"
	SubStepMicrocrawlCrawl  = "microcrawl_crawl"
	SubStepFeatureBuild     = "feature_build"
	SubStepRichnessCompute  = "richness_compute"
	SubStepFeatureUpsert    = "feature_upsert"
	SubStepKeywordUpsert    = "keyword_upsert"
	SubStepScoreCalculation = "score_calculation"
)

// Status constants
const (
	StatusPending    = "pending"
	StatusRunning    = "running"
	StatusCompleted  = "completed"
	StatusFailed     = "failed"
	StatusSkipped    = "skipped"
	StatusCancelled  = "cancelled"
)

// EventHandler defines the interface for handling phase events
type EventHandler interface {
	HandleEvent(ctx context.Context, event *PhaseEvent) error
}

// EventBroadcaster manages event handlers and broadcasting
type EventBroadcaster struct {
	handlers    []EventHandler
	rateLimiter *RateLimiter
	metrics     *EventMetrics
	mu          sync.RWMutex
}

// EventMetrics tracks event broadcasting metrics
type EventMetrics struct {
	eventsTotal       *prometheus.CounterVec
	eventLatency      *prometheus.HistogramVec
	handlersTotal     *prometheus.GaugeVec
	rateLimitDropped  *prometheus.CounterVec
	broadcastErrors   *prometheus.CounterVec
}

// RateLimiter provides simple rate limiting for events
type RateLimiter struct {
	maxEventsPerSecond int
	window             time.Duration
	events             []time.Time
	mu                 sync.Mutex
}

// NewEventBroadcaster creates a new event broadcaster
func NewEventBroadcaster() *EventBroadcaster {
	metrics := &EventMetrics{
		eventsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "extraction_events_total",
				Help: "Total number of extraction phase events",
			},
			[]string{"campaign_id", "event_type", "phase", "status"},
		),
		eventLatency: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "extraction_event_broadcast_duration_seconds",
				Help:    "Time spent broadcasting extraction events",
				Buckets: prometheus.ExponentialBuckets(0.001, 2, 10),
			},
			[]string{"event_type", "handler_count"},
		),
		handlersTotal: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "extraction_event_handlers_total",
				Help: "Number of registered event handlers",
			},
			[]string{"handler_type"},
		),
		rateLimitDropped: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "extraction_events_rate_limited_total",
				Help: "Number of events dropped due to rate limiting",
			},
			[]string{"campaign_id", "event_type"},
		),
		broadcastErrors: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "extraction_event_broadcast_errors_total",
				Help: "Number of errors during event broadcasting",
			},
			[]string{"handler_type", "error_type"},
		),
	}

	rateLimiter := &RateLimiter{
		maxEventsPerSecond: 100, // Default rate limit
		window:             time.Second,
		events:             make([]time.Time, 0),
	}

	return &EventBroadcaster{
		handlers:    make([]EventHandler, 0),
		rateLimiter: rateLimiter,
		metrics:     metrics,
	}
}

// AddHandler registers a new event handler
func (eb *EventBroadcaster) AddHandler(handler EventHandler) {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	eb.handlers = append(eb.handlers, handler)
	eb.metrics.handlersTotal.WithLabelValues("unknown").Set(float64(len(eb.handlers)))
}

// BroadcastEvent sends an event to all registered handlers
func (eb *EventBroadcaster) BroadcastEvent(ctx context.Context, event *PhaseEvent) error {
	if event == nil {
		return fmt.Errorf("event is nil")
	}

	// Apply rate limiting
	if !eb.rateLimiter.Allow() {
		eb.metrics.rateLimitDropped.WithLabelValues(event.CampaignID, event.EventType).Inc()
		return fmt.Errorf("event rate limited")
	}

	start := time.Now()
	defer func() {
		duration := time.Since(start)
		handlerCount := fmt.Sprintf("%d", len(eb.handlers))
		eb.metrics.eventLatency.WithLabelValues(event.EventType, handlerCount).Observe(duration.Seconds())
	}()

	// Record event metrics
	eb.metrics.eventsTotal.WithLabelValues(event.CampaignID, event.EventType, event.Phase, event.Status).Inc()

	// Get handlers under read lock
	eb.mu.RLock()
	handlers := make([]EventHandler, len(eb.handlers))
	copy(handlers, eb.handlers)
	eb.mu.RUnlock()

	// Broadcast to all handlers
	var lastError error
	for _, handler := range handlers {
		if err := handler.HandleEvent(ctx, event); err != nil {
			eb.metrics.broadcastErrors.WithLabelValues("unknown", "handler_error").Inc()
			lastError = err
		}
	}

	return lastError
}

// Allow checks if an event is allowed under the current rate limit
func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	
	// Remove events outside the window
	cutoff := now.Add(-rl.window)
	i := 0
	for i < len(rl.events) && rl.events[i].Before(cutoff) {
		i++
	}
	rl.events = rl.events[i:]

	// Check if we're under the limit
	if len(rl.events) >= rl.maxEventsPerSecond {
		return false
	}

	// Add this event
	rl.events = append(rl.events, now)
	return true
}

// SetRateLimit configures the rate limiting parameters
func (rl *RateLimiter) SetRateLimit(maxEventsPerSecond int) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	rl.maxEventsPerSecond = maxEventsPerSecond
}

// SSEEventHandler implements EventHandler for Server-Sent Events
type SSEEventHandler struct {
	connections map[string]chan *PhaseEvent // campaignID -> channel
	mu          sync.RWMutex
}

// NewSSEEventHandler creates a new SSE event handler
func NewSSEEventHandler() *SSEEventHandler {
	return &SSEEventHandler{
		connections: make(map[string]chan *PhaseEvent),
	}
}

// HandleEvent implements EventHandler interface
func (sse *SSEEventHandler) HandleEvent(ctx context.Context, event *PhaseEvent) error {
	sse.mu.RLock()
	defer sse.mu.RUnlock()

	// Send to campaign-specific channel if exists
	if ch, exists := sse.connections[event.CampaignID]; exists {
		select {
		case ch <- event:
			return nil
		case <-ctx.Done():
			return ctx.Err()
		default:
			// Channel is full, drop event to prevent blocking
			return fmt.Errorf("SSE channel full, dropping event")
		}
	}

	return nil
}

// AddConnection registers a new SSE connection for a campaign
func (sse *SSEEventHandler) AddConnection(campaignID string, ch chan *PhaseEvent) {
	sse.mu.Lock()
	defer sse.mu.Unlock()
	sse.connections[campaignID] = ch
}

// RemoveConnection removes an SSE connection for a campaign
func (sse *SSEEventHandler) RemoveConnection(campaignID string) {
	sse.mu.Lock()
	defer sse.mu.Unlock()
	if ch, exists := sse.connections[campaignID]; exists {
		close(ch)
		delete(sse.connections, campaignID)
	}
}

// CreatePhaseEvent creates a standardized phase event
func CreatePhaseEvent(campaignID, eventType, phase, subStep, status string) *PhaseEvent {
	return &PhaseEvent{
		EventID:   fmt.Sprintf("%s-%d", campaignID, time.Now().UnixNano()),
		CampaignID: campaignID,
		EventType: eventType,
		Phase:     phase,
		SubStep:   subStep,
		Status:    status,
		Timestamp: time.Now(),
		Metadata:  make(map[string]interface{}),
	}
}

// CreateDomainEvent creates a domain-specific event
func CreateDomainEvent(campaignID, domainID, eventType, phase, subStep, status string) *PhaseEvent {
	event := CreatePhaseEvent(campaignID, eventType, phase, subStep, status)
	event.DomainID = &domainID
	return event
}

// WithProgress adds progress information to an event
func (pe *PhaseEvent) WithProgress(progress float64) *PhaseEvent {
	pe.Progress = &progress
	return pe
}

// WithMessage adds a message to an event
func (pe *PhaseEvent) WithMessage(message string) *PhaseEvent {
	pe.Message = &message
	return pe
}

// WithMetadata adds metadata to an event
func (pe *PhaseEvent) WithMetadata(key string, value interface{}) *PhaseEvent {
	if pe.Metadata == nil {
		pe.Metadata = make(map[string]interface{})
	}
	pe.Metadata[key] = value
	return pe
}

// WithProcessingTime adds processing time to an event
func (pe *PhaseEvent) WithProcessingTime(duration time.Duration) *PhaseEvent {
	pe.ProcessingTime = &duration
	return pe
}

// ToJSON converts the event to JSON
func (pe *PhaseEvent) ToJSON() ([]byte, error) {
	return json.Marshal(pe)
}

// Global event broadcaster instance
var globalEventBroadcaster *EventBroadcaster
var broadcasterOnce sync.Once

// GetGlobalEventBroadcaster returns the global event broadcaster instance
func GetGlobalEventBroadcaster() *EventBroadcaster {
	broadcasterOnce.Do(func() {
		globalEventBroadcaster = NewEventBroadcaster()
	})
	return globalEventBroadcaster
}

// EmitPhaseEvent is a convenience function to emit an event through the global broadcaster
func EmitPhaseEvent(ctx context.Context, event *PhaseEvent) error {
	broadcaster := GetGlobalEventBroadcaster()
	return broadcaster.BroadcastEvent(ctx, event)
}