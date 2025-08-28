package main

import (
	"encoding/json"
	"fmt"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
)

// strictHandlers implements gen.StrictServerInterface and is split across files in this package.
type strictHandlers struct {
	deps *AppDeps
}

func boolPtr(b bool) *bool { return &b }

// ---- Helpers ----
func notImpl(name string) error { return fmt.Errorf("%s not implemented", name) }

func okMeta() *gen.Metadata { return &gen.Metadata{} }
func reqID() string         { return "" }
func toMap(v interface{}) map[string]interface{} {
	b, _ := json.Marshal(v)
	var m map[string]interface{}
	_ = json.Unmarshal(b, &m)
	return m
}
