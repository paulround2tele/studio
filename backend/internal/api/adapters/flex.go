package adapters

import (
	"encoding/json"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

// MapAnyToFlexible converts a map[string]interface{} to *map[string]gen.FlexibleValue
// returning nil if the input is nil or empty and preserveEmpty=false.
func MapAnyToFlexible(in map[string]interface{}, preserveEmpty bool) *map[string]gen.FlexibleValue {
	if in == nil || len(in) == 0 {
		if preserveEmpty {
			empty := map[string]gen.FlexibleValue{}
			return &empty
		}
		return nil
	}
	out := make(map[string]gen.FlexibleValue, len(in))
	for k, v := range in {
		out[k] = AnyToFlexible(v)
	}
	return &out
}

// AnyToFlexible marshals an arbitrary value into a FlexibleValue union.
func AnyToFlexible(v interface{}) gen.FlexibleValue {
	var fv gen.FlexibleValue
	if b, err := json.Marshal(v); err == nil {
		_ = fv.UnmarshalJSON(b)
	}
	return fv
}
