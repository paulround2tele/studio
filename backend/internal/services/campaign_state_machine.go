package services

import (
	"fmt"
	"sync"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

// CampaignStateMachine manages valid state transitions for campaigns
type CampaignStateMachine struct {
	transitions map[models.CampaignPhaseStatusEnum][]models.CampaignPhaseStatusEnum
	mu          sync.RWMutex
}

// NewCampaignStateMachine creates a new state machine with valid transitions
func NewCampaignStateMachine() *CampaignStateMachine {
	return &CampaignStateMachine{
		transitions: map[models.CampaignPhaseStatusEnum][]models.CampaignPhaseStatusEnum{
			models.CampaignPhaseStatusPending:    {models.CampaignPhaseStatusInProgress, models.CampaignPhaseStatusFailed},
			models.CampaignPhaseStatusInProgress: {models.CampaignPhaseStatusPaused, models.CampaignPhaseStatusSucceeded, models.CampaignPhaseStatusFailed},
			models.CampaignPhaseStatusPaused:     {models.CampaignPhaseStatusInProgress},
			models.CampaignPhaseStatusSucceeded:  {},                                  // Terminal state
			models.CampaignPhaseStatusFailed:     {models.CampaignPhaseStatusPending}, // Allow retry
		},
	}
}

// CanTransition checks if a transition from current to target status is valid
func (sm *CampaignStateMachine) CanTransition(current, target models.CampaignPhaseStatusEnum) bool {
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

// ValidateTransition returns an error if the transition is invalid
func (sm *CampaignStateMachine) ValidateTransition(current, target models.CampaignPhaseStatusEnum) error {
	if !sm.CanTransition(current, target) {
		return fmt.Errorf("invalid state transition from %s to %s", current, target)
	}
	return nil
}

// GetValidTransitions returns all valid transitions from the current status
func (sm *CampaignStateMachine) GetValidTransitions(current models.CampaignPhaseStatusEnum) []models.CampaignPhaseStatusEnum {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	if transitions, exists := sm.transitions[current]; exists {
		// Return a copy to prevent external modification
		result := make([]models.CampaignPhaseStatusEnum, len(transitions))
		copy(result, transitions)
		return result
	}
	return []models.CampaignPhaseStatusEnum{}
}

// IsTerminalState checks if a status is a terminal state (no further transitions)
func (sm *CampaignStateMachine) IsTerminalState(status models.CampaignPhaseStatusEnum) bool {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	transitions, exists := sm.transitions[status]
	return exists && len(transitions) == 0
}

// StateMachineHook represents a function to be called on state transitions
type StateMachineHook func(campaignID string, from, to models.CampaignPhaseStatusEnum) error

// TransitionWithHooks performs a state transition with pre and post hooks
type TransitionManager struct {
	stateMachine *CampaignStateMachine
	preHooks     []StateMachineHook
	postHooks    []StateMachineHook
	mu           sync.Mutex
}

// NewTransitionManager creates a new transition manager
func NewTransitionManager(sm *CampaignStateMachine) *TransitionManager {
	return &TransitionManager{
		stateMachine: sm,
		preHooks:     []StateMachineHook{},
		postHooks:    []StateMachineHook{},
	}
}

// AddPreHook adds a hook to be called before a transition
func (tm *TransitionManager) AddPreHook(hook StateMachineHook) {
	tm.mu.Lock()
	defer tm.mu.Unlock()
	tm.preHooks = append(tm.preHooks, hook)
}

// AddPostHook adds a hook to be called after a transition
func (tm *TransitionManager) AddPostHook(hook StateMachineHook) {
	tm.mu.Lock()
	defer tm.mu.Unlock()
	tm.postHooks = append(tm.postHooks, hook)
}

// ExecuteTransition performs a state transition with all hooks
func (tm *TransitionManager) ExecuteTransition(campaignID string, from, to models.CampaignPhaseStatusEnum) error {
	// Validate transition
	if err := tm.stateMachine.ValidateTransition(from, to); err != nil {
		return err
	}

	// Execute pre-hooks
	tm.mu.Lock()
	preHooks := make([]StateMachineHook, len(tm.preHooks))
	copy(preHooks, tm.preHooks)
	tm.mu.Unlock()

	for _, hook := range preHooks {
		if err := hook(campaignID, from, to); err != nil {
			return fmt.Errorf("pre-hook failed: %w", err)
		}
	}

	// State transition would happen here in the actual implementation
	// This is where you would update the database

	// Execute post-hooks
	tm.mu.Lock()
	postHooks := make([]StateMachineHook, len(tm.postHooks))
	copy(postHooks, tm.postHooks)
	tm.mu.Unlock()

	for _, hook := range postHooks {
		if err := hook(campaignID, from, to); err != nil {
			// Log error but don't fail the transition
			// Post-hooks should not affect the transition outcome
			fmt.Printf("post-hook error (non-fatal): %v\n", err)
		}
	}

	return nil
}
