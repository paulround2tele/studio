package eventsourcing

import (
	"context"
	"errors"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Event represents a domain event stored in the event store.
type Event struct {
	ID             uuid.UUID              `json:"id"`
	AggregateID    string                 `json:"aggregate_id"`
	AggregateType  string                 `json:"aggregate_type"`
	EventType      string                 `json:"event_type"`
	EventVersion   int                    `json:"event_version"`
	Data           map[string]interface{} `json:"data"`
	Metadata       map[string]interface{} `json:"metadata"`
	StreamPosition int64                  `json:"stream_position"`
	GlobalPosition int64                  `json:"global_position"`
	OccurredAt     time.Time              `json:"occurred_at"`
}

// EventStore defines the storage interface used by aggregates and projections.
type EventStore interface {
	AppendEvent(ctx context.Context, event *Event, expectedVersion *int64) error
	GetAggregateEvents(ctx context.Context, aggregateID string, fromVersion int64) ([]*Event, error)
	GetEventStream(ctx context.Context, fromPosition int64, limit int) ([]*Event, error)
}

// InMemoryEventStore provides a lightweight event store for testing.
type InMemoryEventStore struct {
	mu      sync.Mutex
	events  map[string][]*Event
	global  []*Event
	nextPos int64
}

// NewInMemoryEventStore creates an empty in-memory event store.
func NewInMemoryEventStore() *InMemoryEventStore {
	return &InMemoryEventStore{events: make(map[string][]*Event)}
}

// AppendEvent stores a new event. If expectedVersion is provided, optimistic
// concurrency is enforced by comparing it with the current aggregate version.
func (s *InMemoryEventStore) AppendEvent(ctx context.Context, event *Event, expectedVersion *int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	aggEvents := s.events[event.AggregateID]
	current := int64(len(aggEvents))
	if expectedVersion != nil && current != *expectedVersion {
		return errors.New("concurrency conflict")
	}

	s.nextPos++
	event.StreamPosition = current + 1
	event.GlobalPosition = s.nextPos
	if event.ID == uuid.Nil {
		event.ID = uuid.New()
	}
	if event.OccurredAt.IsZero() {
		event.OccurredAt = time.Now().UTC()
	}

	s.events[event.AggregateID] = append(aggEvents, event)
	s.global = append(s.global, event)
	return nil
}

// GetAggregateEvents returns events for the given aggregate after fromVersion.
func (s *InMemoryEventStore) GetAggregateEvents(ctx context.Context, aggregateID string, fromVersion int64) ([]*Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	all := s.events[aggregateID]
	if fromVersion < 0 || fromVersion >= int64(len(all)) {
		return nil, nil
	}
	// Copy slice to avoid data races
	res := make([]*Event, len(all[fromVersion:]))
	copy(res, all[fromVersion:])
	return res, nil
}

// GetEventStream returns events globally after a position with a limit.
func (s *InMemoryEventStore) GetEventStream(ctx context.Context, fromPosition int64, limit int) ([]*Event, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if fromPosition < 0 || fromPosition >= int64(len(s.global)) {
		return nil, nil
	}
	end := int(fromPosition) + limit
	if end > len(s.global) {
		end = len(s.global)
	}
	res := make([]*Event, end-int(fromPosition))
	copy(res, s.global[fromPosition:end])
	return res, nil
}
