package services

import "testing"

func TestRealParkedHeuristic_Edges(t *testing.T) {
	cases := []struct {
		title       string
		snippet     string
		wantParked  bool
		wantMinConf float64
		wantMaxConf float64
		name        string
	}{
		{"Buy This Domain - Premium Name", "", true, 0.30, 1.0, "StrongBuyThisDomain"},
		{"Coming Soon", "Sedo parking page for premium domain", true, 0.30, 1.0, "CompositeSignals"},
		{"Welcome", "Just a placeholder index", false, 0.0, 0.29, "Neutral"},
		{"Parked", "", false, 0.0, 0.29, "SingleKeywordParkedTooWeak"},
		{"Welcome", "godaddy landing page namecheap coming soon", true, 0.30, 1.0, "MultipleSnippetSignals"},
		{"Buy this domain?", "(lowercase variant)", true, 0.30, 1.0, "PhraseVariant"},
	}
	for _, c := range cases {
		parked, conf := realParkedHeuristic(c.title, c.snippet)
		if parked != c.wantParked {
			t.Fatalf("%s: parked=%v want %v (conf=%.2f)", c.name, parked, c.wantParked, conf)
		}
		if conf < c.wantMinConf || conf > c.wantMaxConf {
			t.Fatalf("%s: confidence %.3f outside expected range [%.2f, %.2f]", c.name, conf, c.wantMinConf, c.wantMaxConf)
		}
	}
}
