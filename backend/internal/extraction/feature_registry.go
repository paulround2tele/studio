package extraction

import "fmt"

// AllowedFeatureKeys defines sanctioned keys for feature_vector governance.
var AllowedFeatureKeys = map[string]struct{}{
	"kw_unique":             {},
	"kw_hits_total":         {},
	"content_bytes":         {},
	"richness":              {},
	"microcrawl_gain_ratio": {},
	"parked_confidence":     {},
}

// ValidateFeatureVector returns error if unknown keys present (excluding experimental prefix exp_).
func ValidateFeatureVector(fv map[string]any) error {
	for k := range fv {
		if _, ok := AllowedFeatureKeys[k]; ok {
			continue
		}
		if len(k) > 4 && k[:4] == "exp_" { // experimental keys allowed
			continue
		}
		return fmt.Errorf("disallowed feature_vector key: %s", k)
	}
	return nil
}
