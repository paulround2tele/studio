package personas

// Lightweight factory helpers for constructing persona configuration request payloads
// or internal model instances with the correct personaType field populated.
// These helpers deliberately live outside generated code so regeneration is safe.

import (
	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/models"
)

// NewHTTPConfig returns a gen.PersonaConfigHttp with required personaType preset.
func NewHTTPConfig(userAgent string, opts ...func(*gen.PersonaConfigHttp)) gen.PersonaConfigHttp {
	cfg := gen.PersonaConfigHttp{PersonaType: "http", UserAgent: userAgent}
	for _, opt := range opts {
		opt(&cfg)
	}
	return cfg
}

// NewDNSConfig returns a gen.PersonaConfigDns with required personaType preset.
func NewDNSConfig(resolvers []string, queryTimeoutSeconds, maxDomainsPerRequest, concurrentQueriesPerDomain int, opts ...func(*gen.PersonaConfigDns)) gen.PersonaConfigDns {
	cfg := gen.PersonaConfigDns{
		PersonaType:                "dns",
		Resolvers:                  resolvers,
		QueryTimeoutSeconds:        queryTimeoutSeconds,
		MaxDomainsPerRequest:       maxDomainsPerRequest,
		ConcurrentQueriesPerDomain: concurrentQueriesPerDomain,
	}
	for _, opt := range opts {
		opt(&cfg)
	}
	return cfg
}

// NewCreateHTTPRequest constructs a gen.CreatePersonaRequest for an HTTP persona.
func NewCreateHTTPRequest(name string, httpCfg gen.PersonaConfigHttp, isEnabled bool) gen.CreatePersonaRequest {
	// Wrap in union PersonaConfigDetails
	var details gen.PersonaConfigDetails
	_ = details.FromPersonaConfigHttp(httpCfg)
	return gen.CreatePersonaRequest{
		Name:          name,
		PersonaType:   gen.PersonaTypeHttp,
		ConfigDetails: details,
		IsEnabled:     &isEnabled,
	}
}

// NewCreateDNSRequest constructs a gen.CreatePersonaRequest for a DNS persona.
func NewCreateDNSRequest(name string, dnsCfg gen.PersonaConfigDns, isEnabled bool) gen.CreatePersonaRequest {
	var details gen.PersonaConfigDetails
	_ = details.FromPersonaConfigDns(dnsCfg)
	return gen.CreatePersonaRequest{
		Name:          name,
		PersonaType:   gen.PersonaTypeDns,
		ConfigDetails: details,
		IsEnabled:     &isEnabled,
	}
}

// ToModel converts a generated CreatePersonaRequest into the internal models.Persona domain model.
// This keeps translation logic centralized.
func ToModel(req gen.CreatePersonaRequest) *models.Persona {
	m := &models.Persona{
		Name:        req.Name,
		PersonaType: models.PersonaTypeEnum(req.PersonaType),
		IsEnabled:   true,
	}
	if req.IsEnabled != nil {
		m.IsEnabled = *req.IsEnabled
	}
	// Persist raw config details as JSON (internal model uses map[string]any / raw bytes depending on implementation)
	if b, err := req.ConfigDetails.MarshalJSON(); err == nil {
		m.ConfigDetails = b
	}
	return m
}
