package extraction

import (
	"context"
	"math"
	"os"
	"strconv"
)

// Microcrawler defines contract for shallow breadth-first crawl to enrich keyword signals.
type Microcrawler interface {
	Crawl(ctx context.Context, rootURL string, budgetPages int) (MicrocrawlResult, []KeywordHit, error)
}

// NoopMicrocrawler provides disabled implementation.
type NoopMicrocrawler struct{}

func (n NoopMicrocrawler) Crawl(ctx context.Context, rootURL string, budgetPages int) (MicrocrawlResult, []KeywordHit, error) {
	return MicrocrawlResult{}, nil, nil
}

// AdaptiveMicrocrawlGate decides whether to run microcrawl based on base richness metrics.
func AdaptiveMicrocrawlGate(base FeatureAggregate, params BuilderParams) bool {
	// Configurable thresholds via env; defaults chosen empirically.
	cfg := loadMicrocrawlConfig()
	// Hard disqualifiers
	if base.KwUniqueCount == 0 && base.KwTotalOccurrences == 0 {
		// Likely empty / error fetch; don't waste crawl budget
		return false
	}
	if base.ContentRichnessScore >= cfg.StopRichnessCeiling {
		return false
	}
	if base.KwUniqueCount >= cfg.StopUniqueCeiling {
		return false
	}

	// Expected marginal gain estimation using saturation curve model:
	// We model unique keyword discovery as U(pages) = U0 + a*(1 - exp(-lambda*pages))
	// For gating, invert to estimate lambda from small-sample if we have microcrawl preview (not yet) -> we fallback to heuristic using current diversity gap.
	diversityTarget := 12.0
	if v, ok := base.FeatureVector["diversity_target"]; ok {
		diversityTarget = getFloat(v)
	}
	effectiveUnique := base.KwUniqueCount
	gap := diversityTarget - float64(effectiveUnique)
	if gap <= 0 {
		return false
	}

	// Estimate potential added uniques with configured page budget (cfg.BudgetPages)
	lambda := cfg.EstimatedLambda // discovery rate parameter
	expectedAdded := gap * (1 - math.Exp(-lambda*float64(cfg.BudgetPages)))
	// Convert to relative diversity improvement
	relGain := 0.0
	if diversityTarget > 0 {
		relGain = expectedAdded / diversityTarget
	}
	if relGain < cfg.MinRelativeGain {
		return false
	}

	// Also require that base richness is below dynamic floor combining richness + diversity shortfall
	richness := base.ContentRichnessScore
	diversityNorm := float64(effectiveUnique) / diversityTarget
	if diversityNorm > 1 {
		diversityNorm = 1
	}
	composite := 0.6*richness + 0.4*diversityNorm
	if composite >= cfg.CompositeCeiling {
		return false
	}

	return true
}

// MicrocrawlConfig holds gating thresholds.
type MicrocrawlConfig struct {
	StopRichnessCeiling float64
	StopUniqueCeiling   int
	MinRelativeGain     float64
	EstimatedLambda     float64
	BudgetPages         int
	CompositeCeiling    float64
}

var defaultMicrocrawlConfig = MicrocrawlConfig{
	StopRichnessCeiling: 0.72,
	StopUniqueCeiling:   20,
	MinRelativeGain:     0.10, // expect at least 10% of diversity target improvement
	EstimatedLambda:     0.25,
	BudgetPages:         3,
	CompositeCeiling:    0.62,
}

func loadMicrocrawlConfig() MicrocrawlConfig {
	cfg := defaultMicrocrawlConfig
	if v := os.Getenv("MICROCRAWL_STOP_RICHNESS"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.StopRichnessCeiling = f
		}
	}
	if v := os.Getenv("MICROCRAWL_STOP_UNIQUE"); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			cfg.StopUniqueCeiling = i
		}
	}
	if v := os.Getenv("MICROCRAWL_MIN_REL_GAIN"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.MinRelativeGain = f
		}
	}
	if v := os.Getenv("MICROCRAWL_LAMBDA"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.EstimatedLambda = f
		}
	}
	if v := os.Getenv("MICROCRAWL_BUDGET_PAGES"); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			cfg.BudgetPages = i
		}
	}
	if v := os.Getenv("MICROCRAWL_COMPOSITE_CEIL"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			cfg.CompositeCeiling = f
		}
	}
	return cfg
}
