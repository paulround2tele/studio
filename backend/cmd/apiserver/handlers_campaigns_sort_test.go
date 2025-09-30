package main

import (
	"testing"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

func TestSortMetricValue(t *testing.T) {
	toF := func(f float32) *float32 { return &f }
	toInt := func(i int) *int { return &i }

	item := gen.DomainListItem{Features: &gen.DomainAnalysisFeatures{
		Richness: &struct {
			AnchorShare              *float32 `json:"anchor_share"`
			AppliedBonus             *float32 `json:"applied_bonus"`
			AppliedDeductionsTotal   *float32 `json:"applied_deductions_total"`
			DiversityEffectiveUnique *float32 `json:"diversity_effective_unique"`
			DiversityNorm            *float32 `json:"diversity_norm"`
			EnrichmentNorm           *float32 `json:"enrichment_norm"`
			ProminenceNorm           *float32 `json:"prominence_norm"`
			RepetitionIndex          *float32 `json:"repetition_index"`
			Score                    *float32 `json:"score"`
			StuffingPenalty          *float32 `json:"stuffing_penalty"`
			Version                  *int     `json:"version"`
		}{Score: toF(12.5)},
		Microcrawl: &struct {
			GainRatio *float32 `json:"gain_ratio"`
		}{GainRatio: toF(0.42)},
		Keywords: &struct {
			HitsTotal          *int                `json:"hits_total"`
			SignalDistribution *map[string]float32 `json:"signal_distribution,omitempty"`
			Top3               *[]string           `json:"top3,omitempty"`
			UniqueCount        *int                `json:"unique_count"`
			WeightSum          *float32            `json:"weight_sum"`
		}{UniqueCount: toInt(7)},
	}}
	if v := sortMetricValue(item, "richness_score"); v != 12.5 {
		t.Fatalf("expected 12.5 got %v", v)
	}
	if v := sortMetricValue(item, "microcrawl_gain"); v < 0.419 || v > 0.421 {
		t.Fatalf("expected ~0.42 got %v", v)
	}
	if v := sortMetricValue(item, "keywords_unique"); v != 7 {
		t.Fatalf("expected 7 got %v", v)
	}
	empty := gen.DomainListItem{}
	if v := sortMetricValue(empty, "richness_score"); v > -1e100 {
		t.Fatalf("expected negInf sentinel got %v", v)
	}
}

func TestWarningsFilterLogic(t *testing.T) {
	toF := func(f float32) *float32 { return &f }
	mk := func(stuff, rep, anchor float32) gen.DomainListItem {
		return gen.DomainListItem{Features: &gen.DomainAnalysisFeatures{
			Richness: &struct {
				AnchorShare              *float32 `json:"anchor_share"`
				AppliedBonus             *float32 `json:"applied_bonus"`
				AppliedDeductionsTotal   *float32 `json:"applied_deductions_total"`
				DiversityEffectiveUnique *float32 `json:"diversity_effective_unique"`
				DiversityNorm            *float32 `json:"diversity_norm"`
				EnrichmentNorm           *float32 `json:"enrichment_norm"`
				ProminenceNorm           *float32 `json:"prominence_norm"`
				RepetitionIndex          *float32 `json:"repetition_index"`
				Score                    *float32 `json:"score"`
				StuffingPenalty          *float32 `json:"stuffing_penalty"`
				Version                  *int     `json:"version"`
			}{StuffingPenalty: toF(stuff), RepetitionIndex: toF(rep), AnchorShare: toF(anchor)},
		}}
	}
	cases := []struct {
		it         gen.DomainListItem
		expectWarn bool
	}{
		{mk(0, 0, 0), false},
		{mk(0.1, 0, 0), true},
		{mk(0, 0.31, 0), true},
		{mk(0, 0, 0.41), true},
		{mk(0.0, 0.29, 0.39), false},
	}
	for i, c := range cases {
		stuff := toFloat32Val(c.it.Features.Richness.StuffingPenalty)
		rep := toFloat32Val(c.it.Features.Richness.RepetitionIndex)
		anchor := toFloat32Val(c.it.Features.Richness.AnchorShare)
		hasWarn := (stuff > 0) || (rep > 0.30) || (anchor > 0.40)
		if hasWarn != c.expectWarn {
			t.Fatalf("case %d expected warn=%v got %v", i, c.expectWarn, hasWarn)
		}
	}
}
