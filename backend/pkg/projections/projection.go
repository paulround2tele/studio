package projections

import (
	"context"

	"github.com/fntelecomllc/studio/backend/pkg/eventsourcing"
)

// Projection processes events to maintain a read model.
type Projection interface {
	Name() string
	Handle(ctx context.Context, event *eventsourcing.Event) error
	Rebuild(ctx context.Context, store eventsourcing.EventStore, fromPosition int64) error
}
