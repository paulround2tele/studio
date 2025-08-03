package state

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// CampaignState represents the high-level campaign state
type CampaignState string

const (
	StateDraft     CampaignState = "draft"
	StateRunning   CampaignState = "running"
	StatePaused    CampaignState = "paused"
	StateCompleted CampaignState = "completed"
	StateFailed    CampaignState = "failed"
	StateCancelled CampaignState = "cancelled"
	StateArchived  CampaignState = "archived"
)

// PhaseState represents individual phase states
type PhaseState string

const (
	PhaseNotStarted PhaseState = "not_started"
	PhaseInProgress PhaseState = "in_progress"
	PhasePaused     PhaseState = "paused"
	PhaseCompleted  PhaseState = "completed"
	PhaseFailed     PhaseState = "failed"
)

// TransitionContext provides context for state transitions
type TransitionContext struct {
	CampaignID    uuid.UUID              `json:"campaign_id"`
	TriggeredBy   string                 `json:"triggered_by"`
	Reason        string                 `json:"reason"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
	Configuration map[string]interface{} `json:"configuration,omitempty"`
	Timestamp     time.Time              `json:"timestamp"`
}

// TransitionResult represents the result of a state transition
type TransitionResult struct {
	From       CampaignState `json:"from"`
	To         CampaignState `json:"to"`
	Success    bool          `json:"success"`
	Error      error         `json:"error,omitempty"`
	Version    int           `json:"version"`
	ExecutedAt time.Time     `json:"executed_at"`
}

// StateTransitionHook is a function called during state transitions
type StateTransitionHook func(ctx context.Context, context TransitionContext) error

// CampaignStateMachine manages valid state transitions for campaigns
type CampaignStateMachine struct {
	transitions map[CampaignState][]CampaignState
	hooks       map[string][]StateTransitionHook
	mutex       sync.RWMutex
}

// NewCampaignStateMachine creates a new state machine with predefined transitions
func NewCampaignStateMachine() *CampaignStateMachine {
	sm := &CampaignStateMachine{
		transitions: make(map[CampaignState][]CampaignState),
		hooks:       make(map[string][]StateTransitionHook),
	}

	sm.defineTransitions()
	return sm
}

// defineTransitions sets up valid state transitions
func (sm *CampaignStateMachine) defineTransitions() {
	sm.transitions = map[CampaignState][]CampaignState{
		StateDraft: {
			StateRunning,
			StateCancelled,
		},
		StateRunning: {
			StatePaused,
			StateCompleted,
			StateFailed,
			StateCancelled,
		},
		StatePaused: {
			StateRunning,
			StateCancelled,
			StateCompleted,
		},
		StateFailed: {
			StateRunning, // Allow retry
			StateCancelled,
		},
		StateCompleted: {
			StateArchived,
			StateRunning, // Allow restart with new configuration
		},
		StateCancelled: {
			StateArchived,
		},
		StateArchived: {
			// Terminal state - no transitions allowed
		},
	}
}

// CanTransition checks if a transition from current to target state is valid
func (sm *CampaignStateMachine) CanTransition(from, to CampaignState) bool {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	validTransitions, exists := sm.transitions[from]
	if !exists {
		return false
	}

	for _, valid := range validTransitions {
		if valid == to {
			return true
		}
	}
	return false
}

// ValidateTransition returns an error if the transition is invalid
func (sm *CampaignStateMachine) ValidateTransition(from, to CampaignState) error {
	if !sm.CanTransition(from, to) {
		return fmt.Errorf("invalid state transition from %s to %s", from, to)
	}
	return nil
}

// GetValidTransitions returns all valid transitions from the current state
func (sm *CampaignStateMachine) GetValidTransitions(current CampaignState) []CampaignState {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	if transitions, exists := sm.transitions[current]; exists {
		// Return a copy to prevent external modification
		result := make([]CampaignState, len(transitions))
		copy(result, transitions)
		return result
	}
	return []CampaignState{}
}

// IsTerminalState checks if a state is terminal (no further transitions)
func (sm *CampaignStateMachine) IsTerminalState(state CampaignState) bool {
	sm.mutex.RLock()
	defer sm.mutex.RUnlock()

	transitions, exists := sm.transitions[state]
	return exists && len(transitions) == 0
}

// AddPreHook adds a hook to be called before state transitions
func (sm *CampaignStateMachine) AddPreHook(transitionKey string, hook StateTransitionHook) {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	key := "pre_" + transitionKey
	sm.hooks[key] = append(sm.hooks[key], hook)
}

// AddPostHook adds a hook to be called after state transitions
func (sm *CampaignStateMachine) AddPostHook(transitionKey string, hook StateTransitionHook) {
	sm.mutex.Lock()
	defer sm.mutex.Unlock()

	key := "post_" + transitionKey
	sm.hooks[key] = append(sm.hooks[key], hook)
}

// ExecuteTransition performs a state transition with hooks
func (sm *CampaignStateMachine) ExecuteTransition(
	ctx context.Context,
	from, to CampaignState,
	transitionCtx TransitionContext,
) (*TransitionResult, error) {
	// Validate transition
	if err := sm.ValidateTransition(from, to); err != nil {
		return &TransitionResult{
			From:       from,
			To:         to,
			Success:    false,
			Error:      err,
			ExecutedAt: time.Now(),
		}, err
	}

	transitionKey := string(from) + "_to_" + string(to)
	transitionCtx.Timestamp = time.Now()

	// Execute pre-hooks
	if err := sm.executeHooks(ctx, "pre_"+transitionKey, transitionCtx); err != nil {
		return &TransitionResult{
			From:       from,
			To:         to,
			Success:    false,
			Error:      fmt.Errorf("pre-hook failed: %w", err),
			ExecutedAt: time.Now(),
		}, err
	}

	// The actual state transition happens in the calling service
	// This state machine only validates and coordinates hooks

	result := &TransitionResult{
		From:       from,
		To:         to,
		Success:    true,
		ExecutedAt: time.Now(),
	}

	// Execute post-hooks (non-blocking - failures logged but don't fail transition)
	go sm.executePostHooks(ctx, "post_"+transitionKey, transitionCtx)

	return result, nil
}

// executeHooks runs hooks for a given transition
func (sm *CampaignStateMachine) executeHooks(ctx context.Context, hookKey string, transitionCtx TransitionContext) error {
	sm.mutex.RLock()
	hooks := make([]StateTransitionHook, len(sm.hooks[hookKey]))
	copy(hooks, sm.hooks[hookKey])
	sm.mutex.RUnlock()

	for _, hook := range hooks {
		if err := hook(ctx, transitionCtx); err != nil {
			return err
		}
	}
	return nil
}

// executePostHooks runs post-hooks in background (non-blocking)
func (sm *CampaignStateMachine) executePostHooks(ctx context.Context, hookKey string, transitionCtx TransitionContext) {
	if err := sm.executeHooks(ctx, hookKey, transitionCtx); err != nil {
		// Log error but don't fail the transition
		fmt.Printf("post-hook error (non-fatal): %v\n", err)
	}
}

// PhaseStateMachine manages phase-level state transitions
type PhaseStateMachine struct {
	transitions map[PhaseState][]PhaseState
	mutex       sync.RWMutex
}

// NewPhaseStateMachine creates a phase-level state machine
func NewPhaseStateMachine() *PhaseStateMachine {
	psm := &PhaseStateMachine{
		transitions: make(map[PhaseState][]PhaseState),
	}

	psm.definePhaseTransitions()
	return psm
}

// definePhaseTransitions sets up valid phase state transitions
func (psm *PhaseStateMachine) definePhaseTransitions() {
	psm.transitions = map[PhaseState][]PhaseState{
		PhaseNotStarted: {
			PhaseInProgress,
			PhaseFailed,
		},
		PhaseInProgress: {
			PhasePaused,
			PhaseCompleted,
			PhaseFailed,
		},
		PhasePaused: {
			PhaseInProgress,
			PhaseFailed,
		},
		PhaseCompleted: {
			PhaseInProgress, // Allow restart
		},
		PhaseFailed: {
			PhaseNotStarted, // Allow reset and retry
			PhaseInProgress, // Allow direct retry
		},
	}
}

// CanTransitionPhase checks if a phase transition is valid
func (psm *PhaseStateMachine) CanTransitionPhase(from, to PhaseState) bool {
	psm.mutex.RLock()
	defer psm.mutex.RUnlock()

	validTransitions, exists := psm.transitions[from]
	if !exists {
		return false
	}

	for _, valid := range validTransitions {
		if valid == to {
			return true
		}
	}
	return false
}

// ValidatePhaseTransition returns an error if the phase transition is invalid
func (psm *PhaseStateMachine) ValidatePhaseTransition(from, to PhaseState) error {
	if !psm.CanTransitionPhase(from, to) {
		return fmt.Errorf("invalid phase transition from %s to %s", from, to)
	}
	return nil
}
