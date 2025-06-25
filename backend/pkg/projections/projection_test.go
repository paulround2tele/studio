package projections

import (
	"context"
	"testing"

	"github.com/fntelecomllc/studio/backend/pkg/eventsourcing"
	"github.com/stretchr/testify/require"
)

func TestDomainProjection_Rebuild(t *testing.T) {
	store := eventsourcing.NewInMemoryEventStore()
	ctx := context.Background()

	// seed events
	_ = store.AppendEvent(ctx, &eventsourcing.Event{
		AggregateID:   "1",
		AggregateType: "Domain",
		EventType:     "DomainCreated",
		Data:          map[string]interface{}{"name": "one.com"},
	}, nil)

	_ = store.AppendEvent(ctx, &eventsourcing.Event{
		AggregateID:   "2",
		AggregateType: "Domain",
		EventType:     "DomainCreated",
		Data:          map[string]interface{}{"name": "two.com"},
	}, nil)

	proj := NewDomainProjection()
	err := proj.Rebuild(ctx, store, 0)
	require.NoError(t, err)
	require.Equal(t, "one.com", proj.Domains["1"].Name)
	require.Equal(t, "two.com", proj.Domains["2"].Name)
}
