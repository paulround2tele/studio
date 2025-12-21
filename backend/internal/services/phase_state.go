// Package services provides phase state machine for campaign orchestration.
// This module defines valid phase state transitions and enforces them.
// See docs/PHASE_STATE_CONTRACT.md for the authoritative contract.
package services

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// ====================================================================
// P2 Contract: 409 Error Envelope (§7 of PHASE_STATE_CONTRACT.md)
// ====================================================================

// TransitionErrorCode is a machine-readable code for transition failures.
type TransitionErrorCode string

const (
	// ErrorCodeInvalidTransition indicates the state transition is not allowed.
	ErrorCodeInvalidTransition TransitionErrorCode = "INVALID_PHASE_TRANSITION"
	// ErrorCodeRerunPreconditionFailed indicates rerun/retry preconditions not met.
	ErrorCodeRerunPreconditionFailed TransitionErrorCode = "RERUN_PRECONDITION_FAILED"
	// ErrorCodeNoControlPhase indicates no active phase to control.
	ErrorCodeNoControlPhase TransitionErrorCode = "NO_CONTROL_PHASE"
)

// TransitionError409 is the structured 409 Conflict response per the contract.
// All invalid transition responses use this standardized error shape.
type TransitionError409 struct {
	Code            TransitionErrorCode    `json:"code"`
	CurrentState    models.PhaseStatusEnum `json:"current_state"`
	AttemptedAction string                 `json:"attempted_action"`
	Message         string                 `json:"message"`
	// Optional fields for rerun/retry failures
	Reason        string `json:"reason,omitempty"`
	BlockingPhase string `json:"blocking_phase,omitempty"`
}

func (e *TransitionError409) Error() string {
	return e.Message
}

// MarshalJSON ensures proper JSON serialization for API responses.
func (e *TransitionError409) MarshalJSON() ([]byte, error) {
	type envelope struct {
		Error TransitionError409 `json:"error"`
	}
	return json.Marshal(envelope{Error: *e})
}

// NewTransitionError409 creates a 409 error for an invalid transition.
func NewTransitionError409(currentState models.PhaseStatusEnum, attemptedAction string) *TransitionError409 {
	return &TransitionError409{
		Code:            ErrorCodeInvalidTransition,
		CurrentState:    currentState,
		AttemptedAction: attemptedAction,
		Message:         fmt.Sprintf("Cannot %s from '%s' state", attemptedAction, currentState),
	}
}

// NewRerunPreconditionError409 creates a 409 error for failed rerun/retry preconditions.
func NewRerunPreconditionError409(currentState models.PhaseStatusEnum, reason, blockingPhase string) *TransitionError409 {
	return &TransitionError409{
		Code:            ErrorCodeRerunPreconditionFailed,
		CurrentState:    currentState,
		AttemptedAction: "rerun",
		Message:         fmt.Sprintf("Rerun precondition failed: %s", reason),
		Reason:          reason,
		BlockingPhase:   blockingPhase,
	}
}

// ====================================================================
// Legacy PhaseTransitionError (backward compatible)
// ====================================================================

// PhaseTransitionError is returned when an invalid state transition is attempted.
type PhaseTransitionError struct {
	From    models.PhaseStatusEnum
	To      models.PhaseStatusEnum
	Phase   models.PhaseTypeEnum
	Reason  string
}

func (e *PhaseTransitionError) Error() string {
	if e.Reason != "" {
		return fmt.Sprintf("invalid phase transition: %s → %s for phase %s: %s", e.From, e.To, e.Phase, e.Reason)
	}
	return fmt.Sprintf("invalid phase transition: %s → %s for phase %s", e.From, e.To, e.Phase)
}

// To409Error converts to the contract-compliant 409 envelope.
func (e *PhaseTransitionError) To409Error(attemptedAction string) *TransitionError409 {
	err := NewTransitionError409(e.From, attemptedAction)
	if e.Reason != "" {
		err.Message = e.Reason
	}
	return err
}

// TransitionTrigger describes what action caused a state transition.
type TransitionTrigger string

const (
	TriggerStart      TransitionTrigger = "start"
	TriggerPause      TransitionTrigger = "pause"
	TriggerResume     TransitionTrigger = "resume"
	TriggerComplete   TransitionTrigger = "complete"
	TriggerFail       TransitionTrigger = "fail"
	TriggerRerun      TransitionTrigger = "rerun"
	TriggerRetry      TransitionTrigger = "retry"
	TriggerSkip       TransitionTrigger = "skip"
	TriggerConfigure  TransitionTrigger = "configure"
)

// phaseTransition defines a valid state transition.
type phaseTransition struct {
	from    models.PhaseStatusEnum
	to      models.PhaseStatusEnum
	trigger TransitionTrigger
}

// validTransitions is the authoritative list of allowed phase state transitions.
// This is the single source of truth for the state machine.
var validTransitions = []phaseTransition{
	// Starting a phase
	{from: models.PhaseStatusNotStarted, to: models.PhaseStatusInProgress, trigger: TriggerStart},
	{from: models.PhaseStatusReady, to: models.PhaseStatusInProgress, trigger: TriggerStart},
	{from: models.PhaseStatusConfigured, to: models.PhaseStatusInProgress, trigger: TriggerStart},

	// Configuration transitions
	{from: models.PhaseStatusNotStarted, to: models.PhaseStatusReady, trigger: TriggerConfigure},
	{from: models.PhaseStatusReady, to: models.PhaseStatusConfigured, trigger: TriggerConfigure},
	{from: models.PhaseStatusNotStarted, to: models.PhaseStatusConfigured, trigger: TriggerConfigure},

	// Pause/Resume
	{from: models.PhaseStatusInProgress, to: models.PhaseStatusPaused, trigger: TriggerPause},
	{from: models.PhaseStatusPaused, to: models.PhaseStatusInProgress, trigger: TriggerResume},

	// Completion
	{from: models.PhaseStatusInProgress, to: models.PhaseStatusCompleted, trigger: TriggerComplete},

	// Failure
	{from: models.PhaseStatusInProgress, to: models.PhaseStatusFailed, trigger: TriggerFail},
	{from: models.PhaseStatusPaused, to: models.PhaseStatusFailed, trigger: TriggerFail}, // Can fail while paused (e.g., campaign stop)

	// Rerun (from completed state)
	{from: models.PhaseStatusCompleted, to: models.PhaseStatusInProgress, trigger: TriggerRerun},

	// Retry (from failed state)
	{from: models.PhaseStatusFailed, to: models.PhaseStatusInProgress, trigger: TriggerRetry},

	// Skip
	{from: models.PhaseStatusNotStarted, to: models.PhaseStatusSkipped, trigger: TriggerSkip},
	{from: models.PhaseStatusReady, to: models.PhaseStatusSkipped, trigger: TriggerSkip},
	{from: models.PhaseStatusConfigured, to: models.PhaseStatusSkipped, trigger: TriggerSkip},
}

// transitionIndex provides O(1) lookup for transition validity.
// Key format: "from:to"
var transitionIndex map[string]TransitionTrigger

func init() {
	transitionIndex = make(map[string]TransitionTrigger, len(validTransitions))
	for _, t := range validTransitions {
		key := string(t.from) + ":" + string(t.to)
		transitionIndex[key] = t.trigger
	}
}

// ValidateTransition checks if a state transition is valid according to the state machine.
// Returns nil if valid, or a PhaseTransitionError if invalid.
func ValidateTransition(from, to models.PhaseStatusEnum, phase models.PhaseTypeEnum) error {
	// Self-transition is always valid (idempotent)
	if from == to {
		return nil
	}

	key := string(from) + ":" + string(to)
	if _, ok := transitionIndex[key]; ok {
		return nil
	}

	return &PhaseTransitionError{
		From:  from,
		To:    to,
		Phase: phase,
	}
}

// CanTransition returns true if the transition is valid.
func CanTransition(from, to models.PhaseStatusEnum) bool {
	if from == to {
		return true
	}
	key := string(from) + ":" + string(to)
	_, ok := transitionIndex[key]
	return ok
}

// GetTriggerForTransition returns the trigger that causes this transition, or empty string if invalid.
func GetTriggerForTransition(from, to models.PhaseStatusEnum) TransitionTrigger {
	if from == to {
		return "" // Self-transition has no trigger
	}
	key := string(from) + ":" + string(to)
	return transitionIndex[key]
}

// ValidTransitionsFrom returns all valid target states from a given state.
func ValidTransitionsFrom(from models.PhaseStatusEnum) []models.PhaseStatusEnum {
	var targets []models.PhaseStatusEnum
	for _, t := range validTransitions {
		if t.from == from {
			targets = append(targets, t.to)
		}
	}
	return targets
}

// IsTerminalState returns true if the phase is in a terminal state (completed, failed, skipped).
func IsTerminalState(status models.PhaseStatusEnum) bool {
	switch status {
	case models.PhaseStatusCompleted, models.PhaseStatusFailed, models.PhaseStatusSkipped:
		return true
	default:
		return false
	}
}

// IsActiveState returns true if the phase is actively executing.
func IsActiveState(status models.PhaseStatusEnum) bool {
	return status == models.PhaseStatusInProgress
}

// IsPausedState returns true if the phase is paused.
func IsPausedState(status models.PhaseStatusEnum) bool {
	return status == models.PhaseStatusPaused
}

// CanStart returns true if the phase can be started from its current state.
func CanStart(status models.PhaseStatusEnum) bool {
	switch status {
	case models.PhaseStatusNotStarted, models.PhaseStatusReady, models.PhaseStatusConfigured:
		return true
	default:
		return false
	}
}

// CanPause returns true if the phase can be paused from its current state.
func CanPause(status models.PhaseStatusEnum) bool {
	return status == models.PhaseStatusInProgress
}

// CanResume returns true if the phase can be resumed from its current state.
func CanResume(status models.PhaseStatusEnum) bool {
	return status == models.PhaseStatusPaused
}

// CanRerun returns true if the phase can be rerun from its current state.
func CanRerun(status models.PhaseStatusEnum) bool {
	return status == models.PhaseStatusCompleted
}

// CanRetry returns true if the phase can be retried from its current state.
func CanRetry(status models.PhaseStatusEnum) bool {
	return status == models.PhaseStatusFailed
}

// ====================================================================
// P2 Contract: Control Phase Resolution (§1 of PHASE_STATE_CONTRACT.md)
// ====================================================================

// PhaseWithStatus represents a phase and its current status for controlPhase resolution.
type PhaseWithStatus struct {
	Phase  models.PhaseTypeEnum
	Status models.PhaseStatusEnum
}

// ResolveControlPhase determines the controlPhase from a list of phase statuses.
// Per contract: controlPhase = pausedPhase ?? inProgressPhase ?? null
//
// Resolution order:
// 1. If any phase is paused → that phase is controlPhase
// 2. Else if any phase is in_progress → that phase is controlPhase  
// 3. Else → nil (no active work)
func ResolveControlPhase(phases []PhaseWithStatus) *models.PhaseTypeEnum {
	var inProgressPhase *models.PhaseTypeEnum

	for i := range phases {
		p := &phases[i]
		switch p.Status {
		case models.PhaseStatusPaused:
			// Paused takes priority - return immediately
			return &p.Phase
		case models.PhaseStatusInProgress:
			// Track in_progress, but keep looking for paused
			if inProgressPhase == nil {
				inProgressPhase = &p.Phase
			}
		}
	}

	// Return in_progress if found, otherwise nil
	return inProgressPhase
}

// ====================================================================
// P2 Contract: Lifecycle Transition Record (§5 of PHASE_STATE_CONTRACT.md)
// ====================================================================

// LifecycleTransition captures a state transition with sequence for SSE emission.
// Sequence is generated in the orchestrator at the moment the transition is persisted.
type LifecycleTransition struct {
	CampaignID uuid.UUID              `json:"campaign_id"`
	Phase      models.PhaseTypeEnum   `json:"phase"`
	FromState  models.PhaseStatusEnum `json:"from_state"`
	ToState    models.PhaseStatusEnum `json:"to_state"`
	Trigger    TransitionTrigger      `json:"trigger"`
	Sequence   int64                  `json:"sequence"`
	Timestamp  time.Time              `json:"timestamp"`
}

// NewLifecycleTransition creates a transition record.
// The sequence should be assigned by the orchestrator when persisting.
func NewLifecycleTransition(
	campaignID uuid.UUID,
	phase models.PhaseTypeEnum,
	from, to models.PhaseStatusEnum,
	sequence int64,
) *LifecycleTransition {
	return &LifecycleTransition{
		CampaignID: campaignID,
		Phase:      phase,
		FromState:  from,
		ToState:    to,
		Trigger:    GetTriggerForTransition(from, to),
		Sequence:   sequence,
		Timestamp:  time.Now(),
	}
}