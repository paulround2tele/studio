package cqrs

import (
	"context"
	"testing"

	"github.com/fntelecomllc/studio/backend/pkg/eventsourcing"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// --- Test structures ---
type createDomainCommand struct {
	id   string
	name string
}

func (c *createDomainCommand) CommandID() string   { return uuid.New().String() }
func (c *createDomainCommand) AggregateID() string { return c.id }
func (c *createDomainCommand) CommandType() string { return "CreateDomain" }
func (c *createDomainCommand) Validate() error     { return nil }

type createDomainHandler struct {
	store eventsourcing.EventStore
}

func (h *createDomainHandler) CommandType() string { return "CreateDomain" }
func (h *createDomainHandler) Handle(ctx context.Context, cmd Command) error {
	c := cmd.(*createDomainCommand)
	e := &eventsourcing.Event{
		AggregateID:   c.id,
		AggregateType: "Domain",
		EventType:     "DomainCreated",
		Data:          map[string]interface{}{"name": c.name},
	}
	return h.store.AppendEvent(ctx, e, nil)
}

func TestCommandBus_Handle(t *testing.T) {
	bus := NewCommandBus()
	store := eventsourcing.NewInMemoryEventStore()
	handler := &createDomainHandler{store: store}
	bus.RegisterHandler(handler)

	cmd := &createDomainCommand{id: "agg1", name: "example.com"}
	err := bus.Send(context.Background(), cmd)
	require.NoError(t, err)

	events, err := store.GetAggregateEvents(context.Background(), "agg1", 0)
	require.NoError(t, err)
	require.Len(t, events, 1)
	require.Equal(t, "DomainCreated", events[0].EventType)
}
