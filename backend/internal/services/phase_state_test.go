package services

import (
	"encoding/json"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateTransition_ValidTransitions(t *testing.T) {
	tests := []struct {
		name string
		from models.PhaseStatusEnum
		to   models.PhaseStatusEnum
	}{
		{"not_started → in_progress (start)", models.PhaseStatusNotStarted, models.PhaseStatusInProgress},
		{"ready → in_progress (start)", models.PhaseStatusReady, models.PhaseStatusInProgress},
		{"configured → in_progress (start)", models.PhaseStatusConfigured, models.PhaseStatusInProgress},
		{"in_progress → paused (pause)", models.PhaseStatusInProgress, models.PhaseStatusPaused},
		{"paused → in_progress (resume)", models.PhaseStatusPaused, models.PhaseStatusInProgress},
		{"in_progress → completed (complete)", models.PhaseStatusInProgress, models.PhaseStatusCompleted},
		{"in_progress → failed (fail)", models.PhaseStatusInProgress, models.PhaseStatusFailed},
		{"completed → in_progress (rerun)", models.PhaseStatusCompleted, models.PhaseStatusInProgress},
		{"failed → in_progress (retry)", models.PhaseStatusFailed, models.PhaseStatusInProgress},
		{"not_started → skipped (skip)", models.PhaseStatusNotStarted, models.PhaseStatusSkipped},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTransition(tt.from, tt.to, models.PhaseTypeDNSValidation)
			assert.NoError(t, err, "transition %s → %s should be valid", tt.from, tt.to)
		})
	}
}

func TestValidateTransition_InvalidTransitions(t *testing.T) {
	tests := []struct {
		name string
		from models.PhaseStatusEnum
		to   models.PhaseStatusEnum
	}{
		{"not_started → paused (cannot pause what hasn't started)", models.PhaseStatusNotStarted, models.PhaseStatusPaused},
		{"not_started → completed (cannot complete without running)", models.PhaseStatusNotStarted, models.PhaseStatusCompleted},
		{"paused → completed (must resume before completing)", models.PhaseStatusPaused, models.PhaseStatusCompleted},
		{"completed → paused (cannot pause completed)", models.PhaseStatusCompleted, models.PhaseStatusPaused},
		{"failed → paused (cannot pause failed)", models.PhaseStatusFailed, models.PhaseStatusPaused},
		{"completed → failed (cannot fail completed)", models.PhaseStatusCompleted, models.PhaseStatusFailed},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTransition(tt.from, tt.to, models.PhaseTypeDNSValidation)
			require.Error(t, err, "transition %s → %s should be invalid", tt.from, tt.to)

			var transErr *PhaseTransitionError
			require.ErrorAs(t, err, &transErr)
			assert.Equal(t, tt.from, transErr.From)
			assert.Equal(t, tt.to, transErr.To)
		})
	}
}

func TestValidateTransition_SelfTransitionIsValid(t *testing.T) {
	states := []models.PhaseStatusEnum{
		models.PhaseStatusNotStarted,
		models.PhaseStatusInProgress,
		models.PhaseStatusPaused,
		models.PhaseStatusCompleted,
		models.PhaseStatusFailed,
	}

	for _, state := range states {
		t.Run(string(state), func(t *testing.T) {
			err := ValidateTransition(state, state, models.PhaseTypeDNSValidation)
			assert.NoError(t, err, "self-transition %s → %s should be valid (idempotent)", state, state)
		})
	}
}

func TestCanTransition(t *testing.T) {
	// Valid transitions
	assert.True(t, CanTransition(models.PhaseStatusInProgress, models.PhaseStatusPaused))
	assert.True(t, CanTransition(models.PhaseStatusPaused, models.PhaseStatusInProgress))

	// Invalid transitions
	assert.False(t, CanTransition(models.PhaseStatusNotStarted, models.PhaseStatusPaused))
	assert.False(t, CanTransition(models.PhaseStatusCompleted, models.PhaseStatusPaused))

	// Self-transition
	assert.True(t, CanTransition(models.PhaseStatusInProgress, models.PhaseStatusInProgress))
}

func TestGetTriggerForTransition(t *testing.T) {
	assert.Equal(t, TriggerPause, GetTriggerForTransition(models.PhaseStatusInProgress, models.PhaseStatusPaused))
	assert.Equal(t, TriggerResume, GetTriggerForTransition(models.PhaseStatusPaused, models.PhaseStatusInProgress))
	assert.Equal(t, TriggerComplete, GetTriggerForTransition(models.PhaseStatusInProgress, models.PhaseStatusCompleted))
	assert.Equal(t, TriggerRerun, GetTriggerForTransition(models.PhaseStatusCompleted, models.PhaseStatusInProgress))
	assert.Equal(t, TriggerRetry, GetTriggerForTransition(models.PhaseStatusFailed, models.PhaseStatusInProgress))

	// Invalid transition returns empty
	assert.Equal(t, TransitionTrigger(""), GetTriggerForTransition(models.PhaseStatusNotStarted, models.PhaseStatusPaused))

	// Self-transition returns empty
	assert.Equal(t, TransitionTrigger(""), GetTriggerForTransition(models.PhaseStatusInProgress, models.PhaseStatusInProgress))
}

func TestValidTransitionsFrom(t *testing.T) {
	t.Run("from not_started", func(t *testing.T) {
		targets := ValidTransitionsFrom(models.PhaseStatusNotStarted)
		assert.Contains(t, targets, models.PhaseStatusInProgress)
		assert.Contains(t, targets, models.PhaseStatusReady)
		assert.Contains(t, targets, models.PhaseStatusConfigured)
		assert.Contains(t, targets, models.PhaseStatusSkipped)
		assert.NotContains(t, targets, models.PhaseStatusPaused)
		assert.NotContains(t, targets, models.PhaseStatusCompleted)
	})

	t.Run("from in_progress", func(t *testing.T) {
		targets := ValidTransitionsFrom(models.PhaseStatusInProgress)
		assert.Contains(t, targets, models.PhaseStatusPaused)
		assert.Contains(t, targets, models.PhaseStatusCompleted)
		assert.Contains(t, targets, models.PhaseStatusFailed)
		assert.NotContains(t, targets, models.PhaseStatusNotStarted)
	})

	t.Run("from paused", func(t *testing.T) {
		targets := ValidTransitionsFrom(models.PhaseStatusPaused)
		assert.Contains(t, targets, models.PhaseStatusInProgress)
		assert.Contains(t, targets, models.PhaseStatusFailed) // Can fail while paused (campaign stop)
		assert.NotContains(t, targets, models.PhaseStatusCompleted)
	})
}

func TestIsTerminalState(t *testing.T) {
	assert.True(t, IsTerminalState(models.PhaseStatusCompleted))
	assert.True(t, IsTerminalState(models.PhaseStatusFailed))
	assert.True(t, IsTerminalState(models.PhaseStatusSkipped))

	assert.False(t, IsTerminalState(models.PhaseStatusNotStarted))
	assert.False(t, IsTerminalState(models.PhaseStatusInProgress))
	assert.False(t, IsTerminalState(models.PhaseStatusPaused))
}

func TestIsActiveState(t *testing.T) {
	assert.True(t, IsActiveState(models.PhaseStatusInProgress))

	assert.False(t, IsActiveState(models.PhaseStatusNotStarted))
	assert.False(t, IsActiveState(models.PhaseStatusPaused))
	assert.False(t, IsActiveState(models.PhaseStatusCompleted))
}

func TestIsPausedState(t *testing.T) {
	assert.True(t, IsPausedState(models.PhaseStatusPaused))

	assert.False(t, IsPausedState(models.PhaseStatusInProgress))
	assert.False(t, IsPausedState(models.PhaseStatusNotStarted))
}

func TestCanStart(t *testing.T) {
	assert.True(t, CanStart(models.PhaseStatusNotStarted))
	assert.True(t, CanStart(models.PhaseStatusReady))
	assert.True(t, CanStart(models.PhaseStatusConfigured))

	assert.False(t, CanStart(models.PhaseStatusInProgress))
	assert.False(t, CanStart(models.PhaseStatusPaused))
	assert.False(t, CanStart(models.PhaseStatusCompleted))
}

func TestCanPause(t *testing.T) {
	assert.True(t, CanPause(models.PhaseStatusInProgress))

	assert.False(t, CanPause(models.PhaseStatusNotStarted))
	assert.False(t, CanPause(models.PhaseStatusPaused))
	assert.False(t, CanPause(models.PhaseStatusCompleted))
}

func TestCanResume(t *testing.T) {
	assert.True(t, CanResume(models.PhaseStatusPaused))

	assert.False(t, CanResume(models.PhaseStatusNotStarted))
	assert.False(t, CanResume(models.PhaseStatusInProgress))
	assert.False(t, CanResume(models.PhaseStatusCompleted))
}

func TestCanRerun(t *testing.T) {
	assert.True(t, CanRerun(models.PhaseStatusCompleted))

	assert.False(t, CanRerun(models.PhaseStatusNotStarted))
	assert.False(t, CanRerun(models.PhaseStatusInProgress))
	assert.False(t, CanRerun(models.PhaseStatusFailed))
}

func TestCanRetry(t *testing.T) {
	assert.True(t, CanRetry(models.PhaseStatusFailed))

	assert.False(t, CanRetry(models.PhaseStatusNotStarted))
	assert.False(t, CanRetry(models.PhaseStatusInProgress))
	assert.False(t, CanRetry(models.PhaseStatusCompleted))
}

func TestPhaseTransitionError_Error(t *testing.T) {
	err := &PhaseTransitionError{
		From:  models.PhaseStatusNotStarted,
		To:    models.PhaseStatusPaused,
		Phase: models.PhaseTypeDNSValidation,
	}
	assert.Contains(t, err.Error(), "not_started")
	assert.Contains(t, err.Error(), "paused")
	assert.Contains(t, err.Error(), "dns_validation")

	errWithReason := &PhaseTransitionError{
		From:   models.PhaseStatusNotStarted,
		To:     models.PhaseStatusPaused,
		Phase:  models.PhaseTypeDNSValidation,
		Reason: "phase must be running to pause",
	}
	assert.Contains(t, errWithReason.Error(), "phase must be running to pause")
}

// ====================================================================
// P2 Contract: 409 Error Envelope Tests (§7 of PHASE_STATE_CONTRACT.md)
// ====================================================================

func TestTransitionError409_Structure(t *testing.T) {
	t.Run("invalid transition error", func(t *testing.T) {
		err := NewTransitionError409(models.PhaseStatusPaused, "complete")

		assert.Equal(t, ErrorCodeInvalidTransition, err.Code)
		assert.Equal(t, models.PhaseStatusPaused, err.CurrentState)
		assert.Equal(t, "complete", err.AttemptedAction)
		assert.Contains(t, err.Message, "Cannot complete from 'paused' state")
	})

	t.Run("rerun precondition error", func(t *testing.T) {
		err := NewRerunPreconditionError409(
			models.PhaseStatusCompleted,
			"another_phase_in_progress",
			"http_validation",
		)

		assert.Equal(t, ErrorCodeRerunPreconditionFailed, err.Code)
		assert.Equal(t, models.PhaseStatusCompleted, err.CurrentState)
		assert.Equal(t, "another_phase_in_progress", err.Reason)
		assert.Equal(t, "http_validation", err.BlockingPhase)
	})
}

func TestTransitionError409_JSON(t *testing.T) {
	err := NewTransitionError409(models.PhaseStatusPaused, "complete")

	jsonBytes, marshalErr := err.MarshalJSON()
	require.NoError(t, marshalErr)

	// Should produce the contract-defined envelope structure
	var envelope struct {
		Error struct {
			Code            string `json:"code"`
			CurrentState    string `json:"current_state"`
			AttemptedAction string `json:"attempted_action"`
			Message         string `json:"message"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(jsonBytes, &envelope))

	assert.Equal(t, "INVALID_PHASE_TRANSITION", envelope.Error.Code)
	assert.Equal(t, "paused", envelope.Error.CurrentState)
	assert.Equal(t, "complete", envelope.Error.AttemptedAction)
	assert.Contains(t, envelope.Error.Message, "Cannot complete")
}

func TestPhaseTransitionError_To409Error(t *testing.T) {
	legacyErr := &PhaseTransitionError{
		From:   models.PhaseStatusNotStarted,
		To:     models.PhaseStatusPaused,
		Phase:  models.PhaseTypeDNSValidation,
		Reason: "phase must be running to pause",
	}

	err409 := legacyErr.To409Error("pause")

	assert.Equal(t, ErrorCodeInvalidTransition, err409.Code)
	assert.Equal(t, models.PhaseStatusNotStarted, err409.CurrentState)
	assert.Equal(t, "pause", err409.AttemptedAction)
	assert.Equal(t, "phase must be running to pause", err409.Message)
}

// ====================================================================
// P2 Contract: Control Phase Resolution Tests (§1 of PHASE_STATE_CONTRACT.md)
// ====================================================================

func TestResolveControlPhase(t *testing.T) {
	t.Run("paused phase takes priority", func(t *testing.T) {
		phases := []PhaseWithStatus{
			{Phase: models.PhaseTypeDomainGeneration, Status: models.PhaseStatusCompleted},
			{Phase: models.PhaseTypeDNSValidation, Status: models.PhaseStatusPaused},
			{Phase: models.PhaseTypeHTTPKeywordValidation, Status: models.PhaseStatusNotStarted},
		}

		result := ResolveControlPhase(phases)
		require.NotNil(t, result)
		assert.Equal(t, models.PhaseTypeDNSValidation, *result)
	})

	t.Run("in_progress when no paused", func(t *testing.T) {
		phases := []PhaseWithStatus{
			{Phase: models.PhaseTypeDomainGeneration, Status: models.PhaseStatusCompleted},
			{Phase: models.PhaseTypeDNSValidation, Status: models.PhaseStatusInProgress},
			{Phase: models.PhaseTypeHTTPKeywordValidation, Status: models.PhaseStatusNotStarted},
		}

		result := ResolveControlPhase(phases)
		require.NotNil(t, result)
		assert.Equal(t, models.PhaseTypeDNSValidation, *result)
	})

	t.Run("nil when no active phases", func(t *testing.T) {
		phases := []PhaseWithStatus{
			{Phase: models.PhaseTypeDomainGeneration, Status: models.PhaseStatusCompleted},
			{Phase: models.PhaseTypeDNSValidation, Status: models.PhaseStatusCompleted},
			{Phase: models.PhaseTypeHTTPKeywordValidation, Status: models.PhaseStatusNotStarted},
		}

		result := ResolveControlPhase(phases)
		assert.Nil(t, result)
	})

	t.Run("paused beats in_progress", func(t *testing.T) {
		// This shouldn't happen normally (can't have both), but contract says paused wins
		phases := []PhaseWithStatus{
			{Phase: models.PhaseTypeDomainGeneration, Status: models.PhaseStatusInProgress},
			{Phase: models.PhaseTypeDNSValidation, Status: models.PhaseStatusPaused},
		}

		result := ResolveControlPhase(phases)
		require.NotNil(t, result)
		assert.Equal(t, models.PhaseTypeDNSValidation, *result)
	})

	t.Run("empty list returns nil", func(t *testing.T) {
		result := ResolveControlPhase([]PhaseWithStatus{})
		assert.Nil(t, result)
	})
}

// ====================================================================
// P2 Contract: Lifecycle Transition Tests (§5 of PHASE_STATE_CONTRACT.md)
// ====================================================================

func TestNewLifecycleTransition(t *testing.T) {
	campaignID := uuid.New()

	transition := NewLifecycleTransition(
		campaignID,
		models.PhaseTypeDNSValidation,
		models.PhaseStatusInProgress,
		models.PhaseStatusPaused,
		42,
	)

	assert.Equal(t, campaignID, transition.CampaignID)
	assert.Equal(t, models.PhaseTypeDNSValidation, transition.Phase)
	assert.Equal(t, models.PhaseStatusInProgress, transition.FromState)
	assert.Equal(t, models.PhaseStatusPaused, transition.ToState)
	assert.Equal(t, TriggerPause, transition.Trigger)
	assert.Equal(t, int64(42), transition.Sequence)
	assert.False(t, transition.Timestamp.IsZero())
}
