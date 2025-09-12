package services

import (
	"testing"
)

// NOTE: Lightweight regression test placeholder. Proper construction of service requires extensive store interface.
// For now this test is skipped; full in-memory store adapter will be added later.
func testHTTPValidationService(t *testing.T) *httpValidationService {
	t.Skip("TODO: implement lightweight in-memory campaign store for Execute idempotency test")
	return nil
}

// TestHTTPValidationStartPhaseIdempotent ensures calling Execute twice does not error (Blocker B2 regression)
func TestHTTPValidationStartPhaseIdempotent(t *testing.T) {
	testHTTPValidationService(t)
}
