package extraction

import "testing"

func TestGenerateKeywordDetails(t *testing.T) {
	Hits := []KeywordHit{
		{KeywordID: "k1", SurfaceForm: "Alpha", SignalType: "title", BaseWeight: 1, ValueScore: 0.5, Position: 10},
		{KeywordID: "k1", SurfaceForm: "Alpha", SignalType: "title", BaseWeight: 1, ValueScore: 0.5, Position: 5},
		{KeywordID: "k2", SurfaceForm: "Beta", SignalType: "body", BaseWeight: 2, ValueScore: 0, Position: 50},
	}
	details := GenerateKeywordDetails("c1", "d1", Hits, "primary")
	if len(details) != 2 {
		t.Fatalf("expected 2 details, got %d", len(details))
	}
	var k1 KeywordDetail
	for _, d := range details {
		if d.KeywordID == "k1" {
			k1 = d
		}
	}
	if k1.Occurrences != 2 {
		t.Fatalf("expected k1 occ=2 got %d", k1.Occurrences)
	}
	if k1.Position != 5 {
		t.Fatalf("expected earliest position 5 got %d", k1.Position)
	}
	if k1.EffectiveWeight <= k1.BaseWeight {
		t.Fatalf("expected effective weight boosted")
	}
}
