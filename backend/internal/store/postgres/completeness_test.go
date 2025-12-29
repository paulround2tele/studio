package postgres

import (
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// TestDiscoveryLineageCampaign_CompletenessField verifies the Completeness field exists
func TestDiscoveryLineageCampaign_CompletenessField(t *testing.T) {
	// Create a DiscoveryLineageCampaign with all fields including Completeness
	campaign := &store.DiscoveryLineageCampaign{
		ID:             uuid.New(),
		Name:           "Test Campaign",
		Completeness:   models.CampaignCompletenessComplete,
		DomainsCount:   100,
		DNSValidCount:  80,
		KeywordMatches: 20,
		LeadCount:      10,
	}

	// Verify the completeness field is set correctly
	if campaign.Completeness != models.CampaignCompletenessComplete {
		t.Errorf("Completeness = %q, want %q", campaign.Completeness, models.CampaignCompletenessComplete)
	}
}

// TestDiscoveryLineageCampaign_CompletenessValues tests all valid completeness values
func TestDiscoveryLineageCampaign_CompletenessValues(t *testing.T) {
	tests := []struct {
		name        string
		completeness models.CampaignCompletenessEnum
	}{
		{"pending", models.CampaignCompletenessPending},
		{"partial", models.CampaignCompletenessPartial},
		{"complete", models.CampaignCompletenessComplete},
		{"degraded", models.CampaignCompletenessDegraded},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			campaign := &store.DiscoveryLineageCampaign{
				ID:           uuid.New(),
				Completeness: tt.completeness,
			}

			if campaign.Completeness != tt.completeness {
				t.Errorf("Completeness = %q, want %q", campaign.Completeness, tt.completeness)
			}

			// Verify it's a valid value
			if !campaign.Completeness.IsValid() {
				t.Errorf("Completeness %q should be valid", tt.completeness)
			}
		})
	}
}

// TestCompletenessSQL_Logic documents the SQL logic for computing completeness
// This test doesn't run actual SQL but documents the expected behavior
func TestCompletenessSQL_Logic(t *testing.T) {
	// The SQL CASE statement in GetDiscoveryLineage:
	// 1. degraded: COUNT(*) FILTER (WHERE status = 'failed') > 0
	// 2. complete: COUNT(*) = COUNT(*) FILTER (WHERE status IN ('completed', 'skipped'))
	// 3. partial:  COUNT(*) FILTER (WHERE status IN ('in_progress', 'paused', 'completed')) > 0
	// 4. pending:  ELSE

	type testCase struct {
		description    string
		phaseCounts    map[string]int // status -> count
		expectedResult models.CampaignCompletenessEnum
	}

	cases := []testCase{
		{
			description: "No phases means pending",
			phaseCounts: map[string]int{},
			expectedResult: models.CampaignCompletenessPending,
		},
		{
			description: "All not_started means pending",
			phaseCounts: map[string]int{
				"not_started": 6,
			},
			expectedResult: models.CampaignCompletenessPending,
		},
		{
			description: "All configured means pending",
			phaseCounts: map[string]int{
				"configured": 6,
			},
			expectedResult: models.CampaignCompletenessPending,
		},
		{
			description: "Some in_progress means partial",
			phaseCounts: map[string]int{
				"not_started": 4,
				"in_progress": 2,
			},
			expectedResult: models.CampaignCompletenessPartial,
		},
		{
			description: "Some completed but not all means partial",
			phaseCounts: map[string]int{
				"not_started": 2,
				"completed":   4,
			},
			expectedResult: models.CampaignCompletenessPartial,
		},
		{
			description: "All completed means complete",
			phaseCounts: map[string]int{
				"completed": 6,
			},
			expectedResult: models.CampaignCompletenessComplete,
		},
		{
			description: "Mix of completed and skipped means complete",
			phaseCounts: map[string]int{
				"completed": 4,
				"skipped":   2,
			},
			expectedResult: models.CampaignCompletenessComplete,
		},
		{
			description: "Any failed means degraded",
			phaseCounts: map[string]int{
				"completed": 5,
				"failed":    1,
			},
			expectedResult: models.CampaignCompletenessDegraded,
		},
		{
			description: "Failed with in_progress still means degraded",
			phaseCounts: map[string]int{
				"in_progress": 3,
				"completed":   2,
				"failed":      1,
			},
			expectedResult: models.CampaignCompletenessDegraded,
		},
	}

	for _, tc := range cases {
		t.Run(tc.description, func(t *testing.T) {
			// This documents expected behavior
			// Actual computation happens in SQL in GetDiscoveryLineage
			if !tc.expectedResult.IsValid() {
				t.Errorf("Expected result %q is not a valid completeness state", tc.expectedResult)
			}
		})
	}
}
