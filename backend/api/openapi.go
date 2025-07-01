package api

import (
	"encoding/json"
	"fmt"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/fntelecomllc/studio/backend/api/auth"
	"github.com/fntelecomllc/studio/backend/api/campaigns"
	"github.com/fntelecomllc/studio/backend/api/config"
	keywordsets "github.com/fntelecomllc/studio/backend/api/keyword-sets"
	"github.com/fntelecomllc/studio/backend/api/personas"
	"github.com/fntelecomllc/studio/backend/api/proxies"
	proxypools "github.com/fntelecomllc/studio/backend/api/proxy-pools"
)

// GenerateOpenAPISpec creates the complete OpenAPI 3.0.3 specification
func GenerateOpenAPISpec() *openapi3.T {
	spec := &openapi3.T{
		OpenAPI: "3.0.3",
		Info: &openapi3.Info{
			Title:       "DomainFlow API",
			Version:     "2.0.0",
			Description: "DomainFlow API for domain generation, validation, and campaign management.",
			Contact: &openapi3.Contact{
				Name:  "API Support",
				URL:   "http://www.domainflow.com/support",
				Email: "support@domainflow.com",
			},
			License: &openapi3.License{
				Name: "MIT",
				URL:  "https://opensource.org/licenses/MIT",
			},
		},
		Servers: openapi3.Servers{
			{URL: "http://localhost:8080/api/v2", Description: "Development server"},
		},
	}

	// Initialize paths and components
	spec.Paths = &openapi3.Paths{}
	spec.Components = &openapi3.Components{
		Schemas:         make(openapi3.Schemas),
		SecuritySchemes: make(openapi3.SecuritySchemes),
		Parameters:      make(openapi3.ParametersMap),
		RequestBodies:   make(openapi3.RequestBodies),
		Responses:       make(openapi3.ResponseBodies),
	}

	// Add security schemes for session-based authentication
	addSecuritySchemes(spec)

	// Add common schemas
	addCommonSchemas(spec)

	// Add domain-specific specifications
	auth.AddAuthPaths(spec)
	campaigns.AddCampaignPaths(spec)
	config.AddConfigPaths(spec)
	keywordsets.AddKeywordSetPaths(spec)
	personas.AddPersonaPaths(spec)
	proxies.AddProxyPaths(spec)
	proxypools.AddProxyPoolPaths(spec)
	
	// Add missing endpoint specifications
	config.AddHealthCheckPaths(spec)
	config.AddWebSocketPaths(spec)
	config.AddKeywordExtractionPaths(spec)
	config.AddUtilityPaths(spec)

	return spec
}


// addSecuritySchemes adds session-based authentication security schemes
func addSecuritySchemes(spec *openapi3.T) {
	spec.Components.SecuritySchemes["sessionAuth"] = &openapi3.SecuritySchemeRef{
		Value: &openapi3.SecurityScheme{
			Type:        "apiKey",
			In:          "cookie",
			Name:        "session",
			Description: "Session-based authentication using HTTP cookies",
		},
	}
}

// addCommonSchemas adds commonly used schemas across all domains
func addCommonSchemas(spec *openapi3.T) {
	// StandardAPIResponse schema
	spec.Components.Schemas["StandardAPIResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Standard API response wrapper",
			Required:    []string{"status", "message"},
			Properties: map[string]*openapi3.SchemaRef{
				"status": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"success", "error"},
						Description: "Status of the response",
					},
				},
				"data": {
					Value: &openapi3.Schema{
						Description: "Response data (only present on success)",
					},
				},
				"message": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Human-readable message",
					},
				},
				"error": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Error details (only present on error)",
					},
				},
			},
		},
	}

	// Error response schema
	spec.Components.Schemas["ErrorResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type: &openapi3.Types{"object"},
			Properties: map[string]*openapi3.SchemaRef{
				"error": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Error message",
					},
				},
			},
		},
	}

	// UUID schema
	spec.Components.Schemas["UUID"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:   &openapi3.Types{"string"},
			Format: "uuid",
			Pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
		},
	}
}

// GenerateYAML generates the OpenAPI specification as YAML string
func GenerateYAML() ([]byte, error) {
	spec := GenerateOpenAPISpec()
	return spec.MarshalJSON()
}

// GenerateJSON generates the OpenAPI specification as JSON string
func GenerateJSON() (string, error) {
	spec := GenerateOpenAPISpec()
	data, err := json.MarshalIndent(spec, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal OpenAPI spec to JSON: %w", err)
	}
	return string(data), nil
}

// ValidateSpec validates the OpenAPI specification
func ValidateSpec() error {
	spec := GenerateOpenAPISpec()
	loader := openapi3.NewLoader()
	return loader.ResolveRefsIn(spec, nil)
}