package main

import (
	"encoding/json"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

func flexibleValuePtr(val gen.FlexibleValue) *gen.FlexibleValue {
	return &val
}

func flexibleValuePtrFromInterface(v interface{}) *gen.FlexibleValue {
	var fv gen.FlexibleValue
	if b, err := json.Marshal(v); err == nil {
		_ = fv.UnmarshalJSON(b)
	}
	return flexibleValuePtr(fv)
}

func flexibleValueMapPtrFromInterfaceMap(src map[string]interface{}) *map[string]*gen.FlexibleValue {
	if src == nil {
		return nil
	}
	flexMap := make(map[string]*gen.FlexibleValue, len(src))
	for k, v := range src {
		flexMap[k] = flexibleValuePtrFromInterface(v)
	}
	return &flexMap
}

func flexibleValueFromString(val string) *gen.FlexibleValue {
	var primitive gen.FlexiblePrimitive
	primitive.FromFlexiblePrimitive0(val)
	var fv gen.FlexibleValue
	fv.FromFlexiblePrimitive(primitive)
	return &fv
}

func flexibleValueFromBool(val bool) *gen.FlexibleValue {
	var primitive gen.FlexiblePrimitive
	primitive.FromFlexiblePrimitive3(val)
	var fv gen.FlexibleValue
	fv.FromFlexiblePrimitive(primitive)
	return &fv
}
