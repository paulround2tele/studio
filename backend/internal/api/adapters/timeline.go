package adapters

import (
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/models"
)

// BuildBasicTimeline constructs a minimal timeline slice with creation and optional completion events.
func BuildBasicTimeline(c *models.LeadGenerationCampaign) []gen.TimelineEvent {
	if c == nil {
		return []gen.TimelineEvent{}
	}
	createdAt := c.CreatedAt
	events := []gen.TimelineEvent{
		{
			Type:      "campaign_created",
			Timestamp: createdAt,
			Description: func() *string {
				msg := "Campaign created"
				return &msg
			}(),
			Status: func() *gen.TimelineEventStatus {
				st := gen.TimelineEventStatus("completed")
				return &st
			}(),
		},
	}
	if c.CompletedAt != nil && !c.CompletedAt.IsZero() {
		completed := *c.CompletedAt
		events = append(events, gen.TimelineEvent{
			Type:      "campaign_completed",
			Timestamp: completed,
			Description: func() *string {
				msg := "Campaign completed"
				return &msg
			}(),
			Status: func() *gen.TimelineEventStatus {
				st := gen.TimelineEventStatus("completed")
				return &st
			}(),
		})
	}
	return events
}

// ExtendTimelineWithPhase adds phase transition events if available.
func ExtendTimelineWithPhase(base []gen.TimelineEvent, phase string, started *time.Time, completed *time.Time) []gen.TimelineEvent {
	out := base
	if started != nil && !started.IsZero() {
		out = append(out, gen.TimelineEvent{Type: "phase_started", Phase: &phase, Timestamp: *started})
	}
	if completed != nil && !completed.IsZero() {
		out = append(out, gen.TimelineEvent{Type: "phase_completed", Phase: &phase, Timestamp: *completed, Status: func() *gen.TimelineEventStatus { s := gen.TimelineEventStatus("completed"); return &s }()})
	}
	return out
}
