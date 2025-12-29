package models

import (
	"testing"
)

// TestCampaignCompletenessEnumValues verifies all 4 completeness states exist
func TestCampaignCompletenessEnumValues(t *testing.T) {
	tests := []struct {
		name  string
		value CampaignCompletenessEnum
		want  string
	}{
		{"pending", CampaignCompletenessPending, "pending"},
		{"partial", CampaignCompletenessPartial, "partial"},
		{"complete", CampaignCompletenessComplete, "complete"},
		{"degraded", CampaignCompletenessDegraded, "degraded"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.value) != tt.want {
				t.Errorf("CampaignCompletenessEnum %s = %q, want %q", tt.name, tt.value, tt.want)
			}
		})
	}
}

// TestCampaignCompletenessEnumIsValid verifies IsValid() function
func TestCampaignCompletenessEnumIsValid(t *testing.T) {
	tests := []struct {
		name  string
		value CampaignCompletenessEnum
		want  bool
	}{
		{"pending is valid", CampaignCompletenessPending, true},
		{"partial is valid", CampaignCompletenessPartial, true},
		{"complete is valid", CampaignCompletenessComplete, true},
		{"degraded is valid", CampaignCompletenessDegraded, true},
		{"invalid value", CampaignCompletenessEnum("unknown"), false},
		{"empty value", CampaignCompletenessEnum(""), false},
		{"legacy is NOT valid", CampaignCompletenessEnum("legacy"), false},
		{"running is NOT valid", CampaignCompletenessEnum("running"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.value.IsValid(); got != tt.want {
				t.Errorf("CampaignCompletenessEnum(%q).IsValid() = %v, want %v", tt.value, got, tt.want)
			}
		})
	}
}

// TestValidCompletenessStates verifies the list of valid states
func TestValidCompletenessStates(t *testing.T) {
	states := ValidCompletenessStates()
	if len(states) != 4 {
		t.Errorf("ValidCompletenessStates() returned %d states, want 4", len(states))
	}

	// Verify specific states are present
	expected := map[CampaignCompletenessEnum]bool{
		CampaignCompletenessPending:  false,
		CampaignCompletenessPartial:  false,
		CampaignCompletenessComplete: false,
		CampaignCompletenessDegraded: false,
	}

	for _, state := range states {
		if _, ok := expected[state]; ok {
			expected[state] = true
		} else {
			t.Errorf("Unexpected state in ValidCompletenessStates(): %s", state)
		}
	}

	for state, found := range expected {
		if !found {
			t.Errorf("Missing expected state in ValidCompletenessStates(): %s", state)
		}
	}
}

// TestParseCompleteness verifies the ParseCompleteness function
func TestParseCompleteness(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    CampaignCompletenessEnum
		wantErr bool
	}{
		{"valid pending", "pending", CampaignCompletenessPending, false},
		{"valid partial", "partial", CampaignCompletenessPartial, false},
		{"valid complete", "complete", CampaignCompletenessComplete, false},
		{"valid degraded", "degraded", CampaignCompletenessDegraded, false},
		{"invalid unknown", "unknown", "", true},
		{"invalid empty", "", "", true},
		{"invalid running", "running", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseCompleteness(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseCompleteness(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("ParseCompleteness(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

// TestCompletenessStateDeterminism documents the expected state transitions
// pending  -> Campaign not started (all phases not_started/configured)
// partial  -> Campaign running (some phases in_progress/completed, not all done)
// complete -> Campaign finished (all phases completed/skipped)
// degraded -> Campaign has failures (at least one phase failed)
func TestCompletenessStateDeterminism(t *testing.T) {
	// These test cases document the expected business logic for completeness
	type phaseScenario struct {
		description      string
		hasNotStarted    bool
		hasInProgress    bool
		hasCompleted     bool
		hasFailed        bool
		expectedState    CampaignCompletenessEnum
	}

	scenarios := []phaseScenario{
		// pending scenarios
		{
			description:      "all phases not started = pending",
			hasNotStarted:    true,
			hasInProgress:    false,
			hasCompleted:     false,
			hasFailed:        false,
			expectedState:    CampaignCompletenessPending,
		},
		// partial scenarios
		{
			description:      "some phases in progress = partial",
			hasNotStarted:    true,
			hasInProgress:    true,
			hasCompleted:     false,
			hasFailed:        false,
			expectedState:    CampaignCompletenessPartial,
		},
		{
			description:      "some phases completed but not all = partial",
			hasNotStarted:    true,
			hasInProgress:    false,
			hasCompleted:     true,
			hasFailed:        false,
			expectedState:    CampaignCompletenessPartial,
		},
		// complete scenarios
		{
			description:      "all phases completed = complete",
			hasNotStarted:    false,
			hasInProgress:    false,
			hasCompleted:     true,
			hasFailed:        false,
			expectedState:    CampaignCompletenessComplete,
		},
		// degraded scenarios
		{
			description:      "any phase failed = degraded",
			hasNotStarted:    false,
			hasInProgress:    false,
			hasCompleted:     true,
			hasFailed:        true,
			expectedState:    CampaignCompletenessDegraded,
		},
		{
			description:      "failed even with in-progress = degraded",
			hasNotStarted:    false,
			hasInProgress:    true,
			hasCompleted:     false,
			hasFailed:        true,
			expectedState:    CampaignCompletenessDegraded,
		},
	}

	for _, scenario := range scenarios {
		t.Run(scenario.description, func(t *testing.T) {
			// This test documents expected behavior; actual computation is in SQL
			if !scenario.expectedState.IsValid() {
				t.Errorf("Expected state %q is not valid", scenario.expectedState)
			}
		})
	}
}
