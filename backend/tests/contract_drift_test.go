package tests

import (
	"os"
	"strings"
	"testing"
)

// TestContractDrift_NoEnvelopeRegression ensures SuccessEnvelope and ProxyDetailsResponse
// schemas are not reintroduced into the bundled OpenAPI spec and that 2xx responses
// do not wrap payloads in a success envelope structure.
func TestContractDrift_NoEnvelopeRegression(t *testing.T) {
	specBytes, err := os.ReadFile("../openapi/dist/openapi.yaml")
	if err != nil {
		t.Fatalf("failed reading bundled spec: %v", err)
	}
	spec := string(specBytes)

	if strings.Contains(spec, "SuccessEnvelope:") {
		t.Errorf("found deprecated SuccessEnvelope schema in bundled spec")
	}
	if strings.Contains(spec, "ProxyDetailsResponse:") {
		t.Errorf("found deprecated ProxyDetailsResponse schema in bundled spec")
	}

	// Quick heuristic: any 2xx response schema including SuccessEnvelope reference (legacy style)
	if strings.Contains(spec, "#/components/schemas/SuccessEnvelope") {
		t.Errorf("2xx responses must not reference SuccessEnvelope")
	}
}
