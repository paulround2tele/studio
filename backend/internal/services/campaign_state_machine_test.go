package services

import (
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

func TestCampaignStateMachine(t *testing.T) {
	sm := NewCampaignStateMachine()

	tests := []struct {
		name     string
		from     models.CampaignStatusEnum
		to       models.CampaignStatusEnum
		expected bool
	}{
		// Valid transitions
		{"pending to queued", models.CampaignStatusPending, models.CampaignStatusQueued, true},
		{"pending to cancelled", models.CampaignStatusPending, models.CampaignStatusCancelled, true},
		{"queued to running", models.CampaignStatusQueued, models.CampaignStatusRunning, true},
		{"queued to paused", models.CampaignStatusQueued, models.CampaignStatusPaused, true},
		{"queued to cancelled", models.CampaignStatusQueued, models.CampaignStatusCancelled, true},
		{"running to paused", models.CampaignStatusRunning, models.CampaignStatusPaused, true},
		{"running to completed", models.CampaignStatusRunning, models.CampaignStatusCompleted, true},
		{"running to failed", models.CampaignStatusRunning, models.CampaignStatusFailed, true},
		{"paused to running", models.CampaignStatusPaused, models.CampaignStatusRunning, true},
		{"paused to cancelled", models.CampaignStatusPaused, models.CampaignStatusCancelled, true},
		{"completed to archived", models.CampaignStatusCompleted, models.CampaignStatusArchived, true},
		{"failed to queued", models.CampaignStatusFailed, models.CampaignStatusQueued, true},
		{"failed to archived", models.CampaignStatusFailed, models.CampaignStatusArchived, true},

		// Invalid transitions
		{"pending to running", models.CampaignStatusPending, models.CampaignStatusRunning, false},
		{"pending to completed", models.CampaignStatusPending, models.CampaignStatusCompleted, false},
		{"queued to completed", models.CampaignStatusQueued, models.CampaignStatusCompleted, false},
		{"running to queued", models.CampaignStatusRunning, models.CampaignStatusQueued, false},
		{"completed to running", models.CampaignStatusCompleted, models.CampaignStatusRunning, false},
		{"archived to any", models.CampaignStatusArchived, models.CampaignStatusRunning, false},
		{"cancelled to any", models.CampaignStatusCancelled, models.CampaignStatusRunning, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sm.CanTransition(tt.from, tt.to)
			if result != tt.expected {
				t.Errorf("CanTransition(%s, %s) = %v, want %v", tt.from, tt.to, result, tt.expected)
			}
		})
	}
}

func TestGetValidTransitions(t *testing.T) {
	sm := NewCampaignStateMachine()

	tests := []struct {
		status   models.CampaignStatusEnum
		expected []models.CampaignStatusEnum
	}{
		{models.CampaignStatusPending, []models.CampaignStatusEnum{models.CampaignStatusQueued, models.CampaignStatusCancelled}},
		{models.CampaignStatusQueued, []models.CampaignStatusEnum{models.CampaignStatusRunning, models.CampaignStatusPaused, models.CampaignStatusCancelled}},
		{models.CampaignStatusRunning, []models.CampaignStatusEnum{models.CampaignStatusPaused, models.CampaignStatusCompleted, models.CampaignStatusFailed}},
		{models.CampaignStatusPaused, []models.CampaignStatusEnum{models.CampaignStatusRunning, models.CampaignStatusCancelled}},
		{models.CampaignStatusCompleted, []models.CampaignStatusEnum{models.CampaignStatusArchived}},
		{models.CampaignStatusFailed, []models.CampaignStatusEnum{models.CampaignStatusQueued, models.CampaignStatusArchived}},
		{models.CampaignStatusArchived, []models.CampaignStatusEnum{}},
		{models.CampaignStatusCancelled, []models.CampaignStatusEnum{}},
	}

	for _, tt := range tests {
		t.Run(string(tt.status), func(t *testing.T) {
			result := sm.GetValidTransitions(tt.status)
			if len(result) != len(tt.expected) {
				t.Errorf("GetValidTransitions(%s) returned %d transitions, want %d", tt.status, len(result), len(tt.expected))
				return
			}
			for i, status := range result {
				if status != tt.expected[i] {
					t.Errorf("GetValidTransitions(%s)[%d] = %s, want %s", tt.status, i, status, tt.expected[i])
				}
			}
		})
	}
}

func TestIsTerminalState(t *testing.T) {
	sm := NewCampaignStateMachine()

	tests := []struct {
		status     models.CampaignStatusEnum
		isTerminal bool
	}{
		{models.CampaignStatusPending, false},
		{models.CampaignStatusQueued, false},
		{models.CampaignStatusRunning, false},
		{models.CampaignStatusPaused, false},
		{models.CampaignStatusCompleted, false},
		{models.CampaignStatusFailed, false},
		{models.CampaignStatusArchived, true},
		{models.CampaignStatusCancelled, true},
	}

	for _, tt := range tests {
		t.Run(string(tt.status), func(t *testing.T) {
			result := sm.IsTerminalState(tt.status)
			if result != tt.isTerminal {
				t.Errorf("IsTerminalState(%s) = %v, want %v", tt.status, result, tt.isTerminal)
			}
		})
	}
}

func TestTransitionManager(t *testing.T) {
	sm := NewCampaignStateMachine()
	tm := NewTransitionManager(sm)

	// Test pre-hook
	preHookCalled := false
	tm.AddPreHook(func(campaignID string, from, to models.CampaignStatusEnum) error {
		preHookCalled = true
		if campaignID != "test-campaign" {
			t.Errorf("Expected campaignID 'test-campaign', got '%s'", campaignID)
		}
		if from != models.CampaignStatusPending || to != models.CampaignStatusQueued {
			t.Errorf("Expected transition from %s to %s, got from %s to %s", models.CampaignStatusPending, models.CampaignStatusQueued, from, to)
		}
		return nil
	})

	// Test post-hook
	postHookCalled := false
	tm.AddPostHook(func(campaignID string, from, to models.CampaignStatusEnum) error {
		postHookCalled = true
		return nil
	})

	// Execute valid transition
	err := tm.ExecuteTransition("test-campaign", models.CampaignStatusPending, models.CampaignStatusQueued)
	if err != nil {
		t.Errorf("ExecuteTransition failed: %v", err)
	}

	if !preHookCalled {
		t.Error("Pre-hook was not called")
	}
	if !postHookCalled {
		t.Error("Post-hook was not called")
	}

	// Test invalid transition
	err = tm.ExecuteTransition("test-campaign", models.CampaignStatusPending, models.CampaignStatusCompleted)
	if err == nil {
		t.Error("Expected error for invalid transition, got nil")
	}
}
