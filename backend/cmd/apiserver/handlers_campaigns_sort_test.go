package main

import (
	"testing"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

func TestSortMetricValue(t *testing.T) {
	toF := func(f float32) *float32 { return &f }
	toI := func(i int64) *int64 { return &i }
	item := gen.DomainListItem{Features: &gen.DomainAnalysisFeatures{Richness: &gen.DomainAnalysisFeaturesRichness{Score: toF(12.5)}, Microcrawl: &gen.DomainAnalysisFeaturesMicrocrawl{GainRatio: toF(0.42)}, Keywords: &gen.DomainAnalysisFeaturesKeywords{UniqueCount: toI(7)}}}
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
		return gen.DomainListItem{Features: &gen.DomainAnalysisFeatures{Richness: &gen.DomainAnalysisFeaturesRichness{StuffingPenalty: toF(stuff), RepetitionIndex: toF(rep), AnchorShare: toF(anchor)}}}
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
