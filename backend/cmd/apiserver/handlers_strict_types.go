package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/google/uuid"
)

// strictHandlers implements gen.StrictServerInterface and is split across files in this package.
type strictHandlers struct {
	deps *AppDeps
}

func boolPtr(b bool) *bool { return &b }

// ---- Helpers ----
func notImpl(name string) error { return fmt.Errorf("%s not implemented", name) }

func okMeta() *gen.Metadata { return &gen.Metadata{} }

// reqID is used in handlers where http.Request is not available.
// It returns an empty string to keep response shape stable without leaking transport details.
func reqID() string { return "" }

// requestID returns a request ID from header or generates a new one for HTTP error hooks.
func requestID(r *http.Request) string {
	if r == nil {
		return ""
	}
	if rid := r.Header.Get("X-Request-ID"); rid != "" {
		return rid
	}
	return uuid.NewString()
}
func toMap(v interface{}) map[string]interface{} {
	b, _ := json.Marshal(v)
	var m map[string]interface{}
	_ = json.Unmarshal(b, &m)
	return m
}
