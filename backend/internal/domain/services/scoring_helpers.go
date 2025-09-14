package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
)

// Allowed scoring weight keys and default weights (sum does not have to be 1; we will normalize internally)
var DefaultScoringWeights = map[string]float64{
	"keyword_density_weight":         0.35,
	"unique_keyword_coverage_weight": 0.25,
	"non_parked_weight":              0.10,
	"content_length_quality_weight":  0.10,
	"title_keyword_weight":           0.10,
	"freshness_weight":               0.10,
	"tf_lite_weight":                 0.00, // experimental; default 0 (off)
}

// ValidateScoringWeights ensures keys are a subset of allowed and each value is in [0,1].
// Returns a normalized (sum=1) weights map (if any value >0). Unknown keys or out-of-range values -> error.
func ValidateScoringWeights(input map[string]float64) (map[string]float64, error) {
	if len(input) == 0 {
		return nil, errors.New("weights map empty")
	}
	out := make(map[string]float64, len(DefaultScoringWeights))
	sum := 0.0
	for k, v := range input {
		if _, ok := DefaultScoringWeights[k]; !ok {
			return nil, fmt.Errorf("unknown weight key: %s", k)
		}
		if v < 0 || v > 1 {
			return nil, fmt.Errorf("weight %s out of range: %v (expected 0..1)", k, v)
		}
		sum += v
		out[k] = v
	}
	// Include missing keys with default (optional) - we choose to backfill with 0 to keep explicitness
	for k := range DefaultScoringWeights {
		if _, ok := out[k]; !ok {
			// treat omitted weights as their default proportion (optional). To keep semantics stable, use default.
			v := DefaultScoringWeights[k]
			out[k] = v
			sum += v
		}
	}
	if sum == 0 {
		return nil, errors.New("sum of weights is zero")
	}
	// Normalize to sum=1 for consistent downstream computation
	for k, v := range out {
		out[k] = v / sum
	}
	return out, nil
}

// loadCampaignScoringWeights fetches campaign-linked scoring profile weights or returns normalized defaults.
func loadCampaignScoringWeights(ctx context.Context, db *sql.DB, campaignID interface{}) (map[string]float64, *float64, error) {
	if db == nil {
		// Fallback to normalized defaults
		return normalizeDefaults(), nil, nil
	}
	// Query campaign_scoring_profile
	var raw json.RawMessage
	var penalty sql.NullFloat64
	q := `SELECT sp.weights, sp.parked_penalty_factor FROM campaign_scoring_profile csp JOIN scoring_profiles sp ON sp.id = csp.scoring_profile_id WHERE csp.campaign_id = $1`
	if err := db.QueryRowContext(ctx, q, campaignID).Scan(&raw, &penalty); err != nil {
		if err == sql.ErrNoRows {
			return normalizeDefaults(), nil, nil
		}
		return nil, nil, fmt.Errorf("load scoring profile: %w", err)
	}
	if len(raw) == 0 {
		return normalizeDefaults(), nil, nil
	}
	tmp := map[string]float64{}
	if err := json.Unmarshal(raw, &tmp); err != nil {
		return nil, nil, fmt.Errorf("unmarshal scoring weights: %w", err)
	}
	validated, err := ValidateScoringWeights(tmp)
	if err != nil {
		return nil, nil, err
	}
	var penaltyPtr *float64
	if penalty.Valid {
		v := penalty.Float64
		if v < 0 {
			v = 0
		} else if v > 1 {
			v = 1
		}
		penaltyPtr = &v
	}
	return validated, penaltyPtr, nil
}

func normalizeDefaults() map[string]float64 {
	sum := 0.0
	for _, v := range DefaultScoringWeights {
		sum += v
	}
	out := make(map[string]float64, len(DefaultScoringWeights))
	for k, v := range DefaultScoringWeights {
		out[k] = math.Round((v/sum)*100000) / 100000
	}
	return out
}
