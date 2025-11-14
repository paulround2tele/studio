package phases

// Package phases provides a central translation layer between internal engine
// phase identifiers (persisted in the database / orchestrator) and the
// user-facing API phase identifiers defined in the OpenAPI spec.
//
// Internal (engine / DB) -> API (friendly):
//   domain_generation       -> discovery
//   dns_validation          -> validation
//   http_keyword_validation -> extraction (legacy HTTP keyword checks)
//   analysis                -> analysis
//   enrichment              -> enrichment
//
// The translation is intentionally lossless and symmetric; unknown inputs
// return the original string so calling code can decide how to handle errors.
// Handlers should still validate against the enumerated set when required.

// ToAPI converts an internal phase enum string to the public API phase name.
func ToAPI(in string) string {
	if v, ok := internalToAPI[in]; ok {
		return v
	}
	return in
}

// ToInternal converts an API phase name to the internal engine/DB phase enum.
func ToInternal(api string) string {
	if v, ok := apiToInternal[api]; ok {
		return v
	}
	return api
}

// AllInternal returns the canonical ordered list of internal phase identifiers.
func AllInternal() []string {
	return []string{PhaseDomainGeneration, PhaseDNSValidation, PhaseHTTPKeywordValidation, PhaseAnalysis, PhaseEnrichmentInternal}
}

// AllAPI returns the canonical ordered list of API phase identifiers.
func AllAPI() []string {
	return []string{PhaseDiscovery, PhaseValidation, PhaseExtraction, PhaseAnalysis, PhaseEnrichment}
}

const (
	PhaseDomainGeneration      = "domain_generation"
	PhaseDNSValidation         = "dns_validation"
	PhaseHTTPKeywordValidation = "http_keyword_validation"
	PhaseEnrichmentInternal    = "enrichment"
	PhaseAnalysis              = "analysis"

	PhaseDiscovery  = "discovery"
	PhaseValidation = "validation"
	PhaseExtraction = "extraction"
	PhaseEnrichment = "enrichment"
)

var internalToAPI = map[string]string{
	PhaseDomainGeneration:      PhaseDiscovery,
	PhaseDNSValidation:         PhaseValidation,
	PhaseHTTPKeywordValidation: PhaseExtraction,
	PhaseEnrichmentInternal:    PhaseEnrichment,
	PhaseAnalysis:              PhaseAnalysis,
}

var apiToInternal = map[string]string{
	PhaseDiscovery:  PhaseDomainGeneration,
	PhaseValidation: PhaseDNSValidation,
	PhaseExtraction: PhaseHTTPKeywordValidation,
	PhaseEnrichment: PhaseEnrichmentInternal,
	PhaseAnalysis:   PhaseAnalysis,
}
