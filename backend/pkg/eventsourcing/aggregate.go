package eventsourcing

import "context"

// AggregateRoot provides basic event sourcing behavior for aggregates.
type AggregateRoot struct {
	ID            string
	AggregateType string
	Version       int64
	pending       []*Event
	store         EventStore
}

// NewAggregateRoot initializes an aggregate root.
func NewAggregateRoot(id, typ string, store EventStore) *AggregateRoot {
	return &AggregateRoot{ID: id, AggregateType: typ, store: store}
}

// Apply records a new event to be persisted.
func (a *AggregateRoot) Apply(eventType string, data map[string]interface{}) {
	a.Version++
	e := &Event{
		AggregateID:   a.ID,
		AggregateType: a.AggregateType,
		EventType:     eventType,
		EventVersion:  1,
		Data:          data,
	}
	a.pending = append(a.pending, e)
}

// Flush saves pending events and clears the buffer.
func (a *AggregateRoot) Flush(ctx context.Context) error {
	for _, e := range a.pending {
		expected := a.Version - int64(len(a.pending))
		if err := a.store.AppendEvent(ctx, e, &expected); err != nil {
			return err
		}
		expected++
	}
	a.pending = nil
	return nil
}

// Replay loads events from the store to rebuild state.
func (a *AggregateRoot) Replay(ctx context.Context, fromVersion int64) ([]*Event, error) {
	events, err := a.store.GetAggregateEvents(ctx, a.ID, fromVersion)
	if err != nil {
		return nil, err
	}
	a.Version = fromVersion
	for _, e := range events {
		a.Version = e.StreamPosition
	}
	return events, nil
}
