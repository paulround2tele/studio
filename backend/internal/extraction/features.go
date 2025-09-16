package extraction

import (
	"encoding/json"
	"math"
	mrand "math/rand"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/logging"
)

// Environment flag helpers (mirroring existing ENABLE_* pattern)
func EnabledFeatureTable() bool  { return flagEnabled("EXTRACTION_FEATURE_TABLE_ENABLED") }
func EnabledKeywordDetail() bool { return flagEnabled("EXTRACTION_KEYWORD_DETAIL_ENABLED") }

func flagEnabled(name string) bool {
	if v, ok := os.LookupEnv(name); ok {
		return v == "1" || strings.EqualFold(v, "true") || strings.EqualFold(v, "on")
	}
	return false
}

// RawSignals represents the immediate outputs of low-level fetch/parse steps.
type RawSignals struct {
	HTML                []byte
	HTTPStatusCode      int
	FetchLatencyMs      int
	ContentHash         string
	ContentBytes        int
	Language            string
	ParsedKeywordHits   []KeywordHit // flattened hits from title/h1/body/anchor/meta
	Microcrawl          *MicrocrawlResult
	IsParked            bool
	ParkedConfidence    float64
	SecondaryPages      int
	MicrocrawlExhausted bool
}

// KeywordHit captures a single keyword occurrence context.
type KeywordHit struct {
	KeywordID   string
	SurfaceForm string
	SignalType  string // title|h1|body|anchor|meta|microcrawl|derived
	Position    int    // optional position (character/token index)
	BaseWeight  float64
	ValueScore  float64 // semantic/dictionary multiplier
}

// MicrocrawlResult holds incremental stats from shallow crawl.
type MicrocrawlResult struct {
	PagesVisited        int
	AddedUniqueKeywords int
	BaseUniqueBefore    int
	GainRatio           float64
	DiminishingReturns  bool
}

// FeatureAggregate is the derived, analysis-ready aggregation (subset of planned columns).
type FeatureAggregate struct {
	KwUniqueCount        int
	KwTotalOccurrences   int
	KwWeightSum          float64
	Top3                 []WeightedKeyword
	SignalDistribution   map[string]int
	MicrocrawlGainRatio  float64
	ContentRichnessScore float64
	PageArchetype        string
	IsParked             bool
	ParkedConfidence     float64
	FeatureVector        map[string]any
}

// WeightedKeyword summarises top keywords for quick UI/analysis.
type WeightedKeyword struct {
	KeywordID string
	Weight    float64
}

// BuilderParams allow evolvable tuning knobs without changing signature.
type BuilderParams struct {
	ExtractionVersion        int
	KeywordDictionaryVersion int
	Now                      time.Time
}

// BuildFeatures performs pure aggregation from RawSignals -> FeatureAggregate.
// NOTE: Initial stub implementation; will be expanded in WP2/WP5.
func BuildFeatures(signals RawSignals, params BuilderParams) FeatureAggregate {
	// Aggregate counts & weights
	kwCounts := map[string]int{}
	kwWeights := map[string]float64{}
	signalDistribution := map[string]int{}
	signalKeywordSet := map[string]map[string]struct{}{}
	for _, hit := range signals.ParsedKeywordHits {
		kwCounts[hit.KeywordID]++
		w := hit.BaseWeight
		if hit.ValueScore > 0 {
			w *= hit.ValueScore
		}
		kwWeights[hit.KeywordID] += w
		signalDistribution[hit.SignalType]++
		if _, ok := signalKeywordSet[hit.SignalType]; !ok {
			signalKeywordSet[hit.SignalType] = map[string]struct{}{}
		}
		signalKeywordSet[hit.SignalType][hit.KeywordID] = struct{}{}
	}
	unique := len(kwCounts)
	total := 0
	weightSum := 0.0
	for _, c := range kwCounts {
		total += c
	}
	for _, w := range kwWeights {
		weightSum += w
	}

	// Deterministic top3 extraction
	all := make([]WeightedKeyword, 0, len(kwWeights))
	for id, w := range kwWeights {
		all = append(all, WeightedKeyword{KeywordID: id, Weight: w})
	}
	sort.Slice(all, func(i, j int) bool {
		if all[i].Weight == all[j].Weight {
			return all[i].KeywordID < all[j].KeywordID
		}
		return all[i].Weight > all[j].Weight
	})
	if len(all) > 3 {
		all = all[:3]
	}

	v2Enabled := flagEnabled("RICHNESS_V2_ENABLED")
	canaryCompare := flagEnabled("RICHNESS_V2_CANARY_DIFF") // if true compute both legacy and v2 and record diff

	richness := 0.0
	featureVector := map[string]any{
		"kw_unique":     unique,
		"kw_hits_total": total,
		"content_bytes": signals.ContentBytes,
	}

	var legacyRichness float64
	computeLegacy := func() float64 {
		lr := 0.0
		if signals.ContentBytes > 0 {
			bytesPerKB := float64(signals.ContentBytes) / 1024.0
			if bytesPerKB < 1 {
				bytesPerKB = 1
			}
			kwPerKB := float64(total) / bytesPerKB
			if kwPerKB > 5 {
				kwPerKB = 5
			}
			lr = (kwPerKB / 5.0)
			if len(signalDistribution) > 3 {
				lr *= 1.05
			}
			if lr > 1 {
				lr = 1
			}
		}
		return lr
	}

	if v2Enabled {
		rv2 := computeRichnessV2(signals, kwCounts, signalDistribution, signalKeywordSet)
		richness = rv2.Final
		for k, v := range rv2.FeatureVectorExtras {
			featureVector[k] = v
		}
		// telemetry
		if comps, ok := extractComponentMap(rv2.FeatureVectorExtras); ok {
			penalties := map[string]float64{
				"stuffing":   getFloat(rv2.FeatureVectorExtras["stuffing_penalty"]),
				"repetition": repetitionPenaltyFromFV(rv2.FeatureVectorExtras),
				"anchor":     anchorPenaltyFromFV(rv2.FeatureVectorExtras),
			}
			ObserveRichnessComponents(comps, penalties, richness)
		}
		if canaryCompare {
			legacyRichness = computeLegacy()
			diff := abs(richness - legacyRichness)
			ObserveRichnessCanaryDiff(diff)
			ObserveRichnessCanaryDiffArchetype(diff, "unknown")
			featureVector["richness_legacy_canary"] = legacyRichness
			// Sampled structured log for large diffs (>0.15)
			if diff > 0.15 {
				denom := getSampleDenom()
				if shouldSample(denom) {
					logging.GlobalExtractionLogger.Log("extraction", "richness_canary_diff", map[string]any{
						"diff":      diff,
						"legacy":    legacyRichness,
						"v2":        richness,
						"kw_unique": unique,
						"weights":   featureVector["richness_weight_profile"],
					})
				}
			}
		}
	} else {
		richness = computeLegacy()
		if richness > 0 {
			featureVector["richness"] = richness
		}
	}

	return FeatureAggregate{
		KwUniqueCount:      unique,
		KwTotalOccurrences: total,
		KwWeightSum:        weightSum,
		Top3:               all,
		SignalDistribution: signalDistribution,
		MicrocrawlGainRatio: func() float64 {
			if signals.Microcrawl != nil {
				return signals.Microcrawl.GainRatio
			}
			return 0
		}(),
		ContentRichnessScore: richness,
		PageArchetype:        "unknown",
		IsParked:             signals.IsParked,
		ParkedConfidence:     signals.ParkedConfidence,
		FeatureVector:        featureVector,
	}
}

// richnessV2Result encapsulates computed richness and extra fields
type richnessV2Result struct {
	Final               float64
	FeatureVectorExtras map[string]any
}

func computeRichnessV2(signals RawSignals, kwCounts map[string]int, signalDistribution map[string]int, signalKeywordSet map[string]map[string]struct{}) richnessV2Result {
	totalHits := 0
	for _, c := range kwCounts {
		totalHits += c
	}
	// guard
	if signals.ContentBytes <= 0 || totalHits == 0 {
		return richnessV2Result{Final: 0, FeatureVectorExtras: map[string]any{"richness_weights_version": 2}}
	}

	// Effective Unique (keywords with >=2 occurrences OR appear in >=2 distinct signals)
	keywordSignalCount := map[string]int{}
	for sig, set := range signalKeywordSet {
		_ = sig
		for k := range set {
			keywordSignalCount[k]++
		}
	}
	effectiveUnique := 0
	for k, cnt := range kwCounts {
		if cnt >= 2 || keywordSignalCount[k] >= 2 {
			effectiveUnique++
		}
	}
	target := 12.0
	if v := os.Getenv("RICHNESS_DIVERSITY_TARGET"); v != "" {
		if parsed, err := parseFloat(v); err == nil && parsed > 0 {
			target = parsed
		}
	}
	// Diversity using diminishing returns: V = 1 - exp(-effectiveUnique/target)
	V := 1 - math.Exp(-float64(effectiveUnique)/target)
	if V > 1 {
		V = 1
	}

	// Prominence: weighted placement (configurable)
	weights := loadSignalWeights()
	var promNumer float64
	for sig, occ := range signalDistribution {
		w := weights[sig]
		if sig == "title" { // cap title occurrences weight contribution at 2
			capped := occ
			if capped > 2 {
				capped = 2
			}
			promNumer += float64(capped) * w
		} else {
			promNumer += float64(occ) * w
		}
	}
	P := promNumer / (float64(totalHits) * 10.0)
	if P > 1 {
		P = 1
	}
	// Guardrail: for very low occurrence pages (<3 total hits) scale prominence gently instead of potential near-zero collapse
	if totalHits < 3 {
		if P < 0.15 {
			P = P*0.5 + 0.075
		} // nudge toward mid floor without overstating
	}

	// Density with anti-stuffing
	bytesPerKB := float64(signals.ContentBytes) / 1024.0
	if bytesPerKB < 1 {
		bytesPerKB = 1
	}
	hitsPerKB := float64(totalHits) / bytesPerKB
	if hitsPerKB > 6 {
		hitsPerKB = 6
	}
	D := hitsPerKB / 6.0
	// Stuffing penalty if a single keyword dominates >30%
	maxShare := 0.0
	for _, c := range kwCounts {
		share := float64(c) / float64(totalHits)
		if share > maxShare {
			maxShare = share
		}
	}
	stuffingPenalty := 0.0
	if maxShare > 0.30 {
		stuffingPenalty = (maxShare - 0.30) * 0.5
	} // grows up to ~0.35 penalty if one keyword fully dominates (capped later)
	if stuffingPenalty > 0.15 {
		stuffingPenalty = 0.15
	}

	// Signal Entropy (structural variety)
	var entropy float64
	for _, occ := range signalDistribution {
		p := float64(occ) / float64(totalHits)
		entropy += -p * math.Log2(p)
	}
	// Max entropy with n signal categories
	nCats := float64(len(signalDistribution))
	var S float64
	if nCats > 1 {
		S = entropy / math.Log2(nCats)
	} else {
		S = 0
	}
	if S > 1 {
		S = 1
	}

	// Length quality
	cappedKB := bytesPerKB
	if cappedKB > 200 {
		cappedKB = 200
	}
	L := cappedKB / 80.0
	if L > 1 {
		L = 1
	}
	if bytesPerKB > 80 && bytesPerKB <= 160 {
		L *= 0.9
	} else if bytesPerKB > 160 {
		L *= 0.8
	}

	// Repetition index & anchor share for penalties
	repetitionIndex := maxShare
	anchorShare := 0.0
	if occ, ok := signalDistribution["anchor"]; ok {
		anchorShare = float64(occ) / float64(totalHits)
	}
	repetitionPenalty := 0.0
	if repetitionIndex > 0.35 {
		repetitionPenalty = 0.04
	}
	anchorPenalty := 0.0
	if anchorShare > 0.55 {
		anchorPenalty = 0.03
	}
	penalties := stuffingPenalty + repetitionPenalty + anchorPenalty

	// Enrichment Gain (G)
	G := 0.0 // safe default no-op when Microcrawl absent
	if signals.Microcrawl != nil && signals.Microcrawl.BaseUniqueBefore >= 0 {
		base := float64(signals.Microcrawl.BaseUniqueBefore)
		added := float64(signals.Microcrawl.AddedUniqueKeywords)
		rel := 0.0
		if base+4 > 0 {
			rel = added / (base + 4)
		}
		abs := added / 40.0
		if rel > 1 {
			rel = 1
		}
		if abs > 1 {
			abs = 1
		}
		Graw := 0.5*rel + 0.5*abs
		if Graw > 1 {
			Graw = 1
		}
		if signals.Microcrawl.DiminishingReturns {
			Graw *= 0.7
		}
		G = Graw
	}

	// Base richness weights (version 2) configurable via RICHNESS_WEIGHT_JSON
	weightsProfile := loadRichnessWeights()
	base := weightsProfile.V*V + weightsProfile.P*P + weightsProfile.D*D + weightsProfile.S*S + weightsProfile.L*L
	bonus := weightsProfile.BonusMax * G
	final := base*(1+bonus) - penalties
	if final < 0 {
		final = 0
	}
	if final > 1 {
		final = 1
	}

	fvExtras := map[string]any{
		"richness":                   final,
		"richness_weights_version":   2,
		"diversity_effective_unique": effectiveUnique,
		"diversity_target":           target,
		"prominence_norm":            P,
		"density_norm":               D,
		"signal_entropy_norm":        S,
		"length_quality_norm":        L,
		"enrichment_norm":            G,
		"stuffing_penalty":           stuffingPenalty,
		"repetition_index":           repetitionIndex,
		"anchor_share":               anchorShare,
		"applied_bonus":              bonus,
		"applied_deductions_total":   penalties,
		"richness_weight_profile":    map[string]any{"V": weightsProfile.V, "P": weightsProfile.P, "D": weightsProfile.D, "S": weightsProfile.S, "L": weightsProfile.L, "bonus_max": weightsProfile.BonusMax},
	}
	return richnessV2Result{Final: final, FeatureVectorExtras: fvExtras}
}

// weight configuration structures
type richnessWeights struct{ V, P, D, S, L, BonusMax float64 }

var defaultRichnessWeights = richnessWeights{V: 0.30, P: 0.25, D: 0.15, S: 0.15, L: 0.15, BonusMax: 0.25}

func loadRichnessWeights() richnessWeights {
	if raw, ok := os.LookupEnv("RICHNESS_WEIGHT_JSON"); ok && raw != "" {
		var generic map[string]float64
		if json.Unmarshal([]byte(raw), &generic) == nil {
			rw := defaultRichnessWeights
			if v, ok := generic["V"]; ok {
				rw.V = v
			}
			if v, ok := generic["P"]; ok {
				rw.P = v
			}
			if v, ok := generic["D"]; ok {
				rw.D = v
			}
			if v, ok := generic["S"]; ok {
				rw.S = v
			}
			if v, ok := generic["L"]; ok {
				rw.L = v
			}
			if v, ok := generic["bonus_max"]; ok {
				rw.BonusMax = v
			}
			return rw
		}
	}
	return defaultRichnessWeights
}

func loadSignalWeights() map[string]float64 {
	base := map[string]float64{"title": 10, "h1": 7, "meta": 5, "anchor": 4, "body": 2, "microcrawl": 1}
	if raw, ok := os.LookupEnv("RICHNESS_SIGNAL_WEIGHT_JSON"); ok && raw != "" {
		var override map[string]float64
		if json.Unmarshal([]byte(raw), &override) == nil {
			for k, v := range override {
				base[k] = v
			}
		}
	}
	return base
}

// helper extraction for telemetry
func extractComponentMap(fv map[string]any) (map[string]float64, bool) {
	keys := []string{"diversity_effective_unique", "prominence_norm", "density_norm", "signal_entropy_norm", "length_quality_norm", "enrichment_norm"}
	out := map[string]float64{}
	okAny := false
	for _, k := range keys {
		if v, ok := fv[k]; ok {
			f := getFloat(v)
			out[k] = f
			okAny = true
		}
	}
	return out, okAny
}

func getFloat(v any) float64 {
	switch x := v.(type) {
	case float64:
		return x
	case int:
		return float64(x)
	case int64:
		return float64(x)
	case string:
		if f, err := strconv.ParseFloat(x, 64); err == nil {
			return f
		}
	}
	return 0
}

func abs(f float64) float64 {
	if f < 0 {
		return -f
	}
	return f
}

// derive penalties not directly stored (for repetition & anchor penalty we infer from indices if needed) placeholders for now
func repetitionPenaltyFromFV(fv map[string]any) float64 {
	if r := getFloat(fv["repetition_index"]); r > 0.35 {
		return 0.04
	}
	return 0
}
func anchorPenaltyFromFV(fv map[string]any) float64 {
	if a := getFloat(fv["anchor_share"]); a > 0.55 {
		return 0.03
	}
	return 0
}

func parseFloat(s string) (float64, error) { return strconv.ParseFloat(strings.TrimSpace(s), 64) }

// shouldSample returns true roughly 1/n times.
func shouldSample(n int) bool {
	if n <= 1 {
		return true
	}
	return mrand.Intn(n) == 0
}

func getSampleDenom() int {
	if v := os.Getenv("RICHNESS_CANARY_SAMPLE_DENOM"); v != "" {
		if i, err := strconv.Atoi(strings.TrimSpace(v)); err == nil && i > 0 {
			return i
		}
	}
	return 20 // default 5% sample
}
