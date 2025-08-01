// backend/internal/services/phase_status_derivation.go
package services

import (
	"context"
	"fmt"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// PhaseStatusDerivationService handles deriving campaign-level status from individual phases
type PhaseStatusDerivationService struct {
	campaignStore store.CampaignStore
	db            store.Querier
}

// NewPhaseStatusDerivationService creates a new derivation service
func NewPhaseStatusDerivationService(campaignStore store.CampaignStore, db store.Querier) *PhaseStatusDerivationService {
	return &PhaseStatusDerivationService{
		campaignStore: campaignStore,
		db:            db,
	}
}

// DeriveCurrentPhaseFromPhases determines current phase and status from campaign_phases table
func (s *PhaseStatusDerivationService) DeriveCurrentPhaseFromPhases(ctx context.Context, campaignID uuid.UUID) (*models.PhaseTypeEnum, *models.PhaseStatusEnum, error) {
	// Get all phases for this campaign ordered by phase_order
	phases, err := s.campaignStore.GetCampaignPhases(ctx, s.db, campaignID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get campaign phases: %w", err)
	}

	if len(phases) == 0 {
		// No phases exist, campaign should be in domain_generation/not_started
		domainGenPhase := models.PhaseTypeDomainGeneration
		notStartedStatus := models.PhaseStatusNotStarted
		return &domainGenPhase, &notStartedStatus, nil
	}

	// Find the current active phase based on the business logic:
	// 1. If any phase is in_progress, that's the current phase
	// 2. If no phase is in_progress, find the first non-completed phase
	// 3. If all phases are completed, the last phase is current with status completed

	var currentPhase *models.PhaseTypeEnum
	var currentStatus *models.PhaseStatusEnum

	// Check for any in_progress phase first
	for _, phase := range phases {
		if phase.Status == models.PhaseStatusInProgress {
			currentPhase = &phase.PhaseType
			currentStatus = &phase.Status
			return currentPhase, currentStatus, nil
		}
	}

	// No in_progress phase, find first non-completed phase
	for _, phase := range phases {
		if phase.Status != models.PhaseStatusCompleted {
			currentPhase = &phase.PhaseType
			currentStatus = &phase.Status
			return currentPhase, currentStatus, nil
		}
	}

	// All phases are completed, use the last phase
	if len(phases) > 0 {
		lastPhase := phases[len(phases)-1]
		currentPhase = &lastPhase.PhaseType
		currentStatus = &lastPhase.Status
	}

	return currentPhase, currentStatus, nil
}

// SyncCampaignStatusFromPhases updates campaign-level status to match phases
func (s *PhaseStatusDerivationService) SyncCampaignStatusFromPhases(ctx context.Context, campaignID uuid.UUID) error {
	currentPhase, currentStatus, err := s.DeriveCurrentPhaseFromPhases(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to derive current phase: %w", err)
	}

	// Update campaign with derived values
	err = s.campaignStore.UpdateCampaignPhaseFields(ctx, s.db, campaignID, currentPhase, currentStatus)
	if err != nil {
		return fmt.Errorf("failed to update campaign phase fields: %w", err)
	}

	return nil
}

// GetCompletedPhasesCount returns the number of completed phases
func (s *PhaseStatusDerivationService) GetCompletedPhasesCount(ctx context.Context, campaignID uuid.UUID) (int, error) {
	phases, err := s.campaignStore.GetCampaignPhases(ctx, s.db, campaignID)
	if err != nil {
		return 0, fmt.Errorf("failed to get campaign phases: %w", err)
	}

	completedCount := 0
	for _, phase := range phases {
		if phase.Status == models.PhaseStatusCompleted {
			completedCount++
		}
	}

	return completedCount, nil
}
