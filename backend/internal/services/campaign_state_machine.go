package services

import (
	"fmt"
	"sync"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

// DEPRECATED: Legacy CampaignStateMachine for backward compatibility
// Use state.CampaignStateMachine for new implementations
type CampaignStateMachine struct {
	transitions map[models.PhaseStatusEnum][]models.PhaseStatusEnum
	mu          sync.RWMutex
}

// DEPRECATED: Use state.NewCampaignStateMachine() instead
func NewCampaignStateMachine() *CampaignStateMachine {
	return &CampaignStateMachine{
		transitions: map[models.PhaseStatusEnum][]models.PhaseStatusEnum{
			models.PhaseStatusNotStarted: {models.PhaseStatusInProgress, models.PhaseStatusFailed},
			models.PhaseStatusInProgress: {models.PhaseStatusPaused, models.PhaseStatusCompleted, models.PhaseStatusFailed},
			models.PhaseStatusPaused:     {models.PhaseStatusInProgress},
			models.PhaseStatusCompleted:  {models.PhaseStatusInProgress},                               // Allow restart
			models.PhaseStatusFailed:     {models.PhaseStatusNotStarted, models.PhaseStatusInProgress}, // Allow retry
		},
	}
}

// DEPRECATED: Use state.CampaignStateMachine.CanTransition() instead
func (sm *CampaignStateMachine) CanTransition(current, target models.PhaseStatusEnum) bool {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	validTransitions, exists := sm.transitions[current]
	if !exists {
		return false
	}

	for _, valid := range validTransitions {
		if valid == target {
			return true
		}
	}
	return false
}

// DEPRECATED: Use state.CampaignStateMachine.ValidateTransition() instead
func (sm *CampaignStateMachine) ValidateTransition(current, target models.PhaseStatusEnum) error {
	if !sm.CanTransition(current, target) {
		return fmt.Errorf("invalid state transition from %s to %s", current, target)
	}
	return nil
}

// DEPRECATED: Use state.CampaignStateMachine.GetValidTransitions() instead
func (sm *CampaignStateMachine) GetValidTransitions(current models.PhaseStatusEnum) []models.PhaseStatusEnum {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	if transitions, exists := sm.transitions[current]; exists {
		// Return a copy to prevent external modification
		result := make([]models.PhaseStatusEnum, len(transitions))
		copy(result, transitions)
		return result
	}
	return []models.PhaseStatusEnum{}
}

// DEPRECATED: Use state.CampaignStateMachine.IsTerminalState() instead
func (sm *CampaignStateMachine) IsTerminalState(status models.PhaseStatusEnum) bool {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	transitions, exists := sm.transitions[status]
	return exists && len(transitions) == 0
}

// ============================================================================
// NEW STATE MANAGEMENT SYSTEM - DISABLED DUE TO MISSING DEPENDENCIES
// ============================================================================

// DEPRECATED: CampaignStateManager coordinators are replaced by domain services
// This code is disabled due to missing modes package implementation
// Use the new domain services in internal/domain/services/ instead

/*
// CampaignStateManager coordinates state machine and campaign modes
type CampaignStateManager struct {
	stateMachine *state.CampaignStateMachine
	modeFactory  interface{} // Placeholder for missing modes.ModeFactory
}

// NewCampaignStateManager creates a new state manager with proper architecture
func NewCampaignStateManager() *CampaignStateManager {
	return &CampaignStateManager{
		stateMachine: state.NewCampaignStateMachine(),
		modeFactory:  nil, // Disabled - missing modes package
	}
}

// TransitionCampaignState performs a campaign state transition with mode validation
func (csm *CampaignStateManager) TransitionCampaignState(
	ctx context.Context,
	campaign *models.LeadGenerationCampaign,
	targetState state.CampaignState,
	context state.TransitionContext,
) (*state.TransitionResult, error) {
	return nil, fmt.Errorf("DEPRECATED: use domain services instead")
}

// TransitionPhase performs a phase transition with mode validation
func (csm *CampaignStateManager) TransitionPhase(
	ctx context.Context,
	campaign *models.LeadGenerationCampaign,
	targetPhase models.PhaseTypeEnum,
) error {
	return fmt.Errorf("DEPRECATED: use domain services instead")
}

// GetCampaignConfiguration returns configuration for a campaign based on its mode
func (csm *CampaignStateManager) GetCampaignConfiguration(
	ctx context.Context,
	campaign *models.LeadGenerationCampaign,
) (interface{}, error) {
	return nil, fmt.Errorf("DEPRECATED: use domain services instead")
}

// mapCampaignStatusToState converts legacy business status to new state enum
func (csm *CampaignStateManager) mapCampaignStatusToState(businessStatus *string) state.CampaignState {
	if businessStatus == nil {
		return state.StateDraft
	}

	switch *businessStatus {
	case "draft":
		return state.StateDraft
	case "running":
		return state.StateRunning
	case "paused":
		return state.StatePaused
	case "completed":
		return state.StateCompleted
	case "failed":
		return state.StateFailed
	case "cancelled":
		return state.StateCancelled
	case "archived":
		return state.StateArchived
	default:
		return state.StateDraft
	}
}
*/
