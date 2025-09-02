package hooks

import (
	"context"
	"fmt"

	"github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// SummaryReportHook logs a simple summary and can be extended to enqueue a report/export
// Feature-guarded by features.post_completion_hooks config flag.
// It requires a CampaignStore and Dependencies for logging.

type SummaryReportHook struct {
	Store store.CampaignStore
	Deps  services.Dependencies
}

func (h *SummaryReportHook) Run(ctx context.Context, campaignID uuid.UUID) error {
	querier, ok := h.Deps.DB.(store.Querier)
	if !ok || h.Store == nil {
		return nil
	}
	campaign, err := h.Store.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return err
	}
	h.Deps.Logger.Info(ctx, "SummaryReportHook: campaign summary", map[string]interface{}{
		"campaign_id": campaignID,
		"name":        campaign.Name,
		"status":      fmt.Sprintf("%v", campaign.PhaseStatus),
	})
	return nil
}
