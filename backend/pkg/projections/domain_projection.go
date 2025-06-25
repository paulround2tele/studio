package projections

import (
	"context"

	"github.com/fntelecomllc/studio/backend/pkg/eventsourcing"
)

// Domain represents a simple read model used in tests.
type Domain struct {
	ID   string
	Name string
}

// DomainProjection keeps a map of domains keyed by ID.
type DomainProjection struct {
	Domains map[string]*Domain
}

// NewDomainProjection creates an empty domain projection.
func NewDomainProjection() *DomainProjection {
	return &DomainProjection{Domains: make(map[string]*Domain)}
}

// Name returns projection name.
func (p *DomainProjection) Name() string { return "DomainProjection" }

// Handle processes a single event.
func (p *DomainProjection) Handle(ctx context.Context, event *eventsourcing.Event) error {
	switch event.EventType {
	case "DomainCreated":
		name, _ := event.Data["name"].(string)
		p.Domains[event.AggregateID] = &Domain{ID: event.AggregateID, Name: name}
	case "DomainRenamed":
		if d, ok := p.Domains[event.AggregateID]; ok {
			d.Name, _ = event.Data["name"].(string)
		}
	}
	return nil
}

// Rebuild loads events from the store starting from a position.
func (p *DomainProjection) Rebuild(ctx context.Context, store eventsourcing.EventStore, fromPosition int64) error {
	pos := fromPosition
	for {
		events, err := store.GetEventStream(ctx, pos, 100)
		if err != nil {
			return err
		}
		if len(events) == 0 {
			return nil
		}
		for _, e := range events {
			if err := p.Handle(ctx, e); err != nil {
				return err
			}
			pos = e.GlobalPosition
		}
	}
}
