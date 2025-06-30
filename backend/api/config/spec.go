package config

import (
	"github.com/getkin/kin-openapi/openapi3"
)

// AddConfigPaths adds config-related paths to the OpenAPI specification
func AddConfigPaths(spec *openapi3.T) {
	addConfigSchemas(spec)
	addGetFeatureFlagsPath(spec)
	addUpdateFeatureFlagsPath(spec)
}

// addGetFeatureFlagsPath adds the get feature flags endpoint
func addGetFeatureFlagsPath(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getFeatureFlags",
		Summary:     "Get feature flags",
		Description: "Returns current feature flag settings",
		Tags:        []string{"Config"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}

	getOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Feature flags retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/FeatureFlags",
				},
			},
		},
	})

	getOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	getOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/config/features", &openapi3.PathItem{
		Get: getOp,
	})
}

// addUpdateFeatureFlagsPath adds the update feature flags endpoint
func addUpdateFeatureFlagsPath(spec *openapi3.T) {
	updateOp := &openapi3.Operation{
		OperationID: "updateFeatureFlags",
		Summary:     "Update feature flags",
		Description: "Updates feature flag settings",
		Tags:        []string{"Config"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/FeatureFlags",
						},
					},
				},
			},
		},
	}

	updateOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Feature flags updated successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/FeatureFlags",
				},
			},
		},
	})

	updateOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	updateOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	updateOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	if spec.Paths.Find("/config/features") == nil {
		spec.Paths.Set("/config/features", &openapi3.PathItem{})
	}
	spec.Paths.Find("/config/features").Post = updateOp
}

// addConfigSchemas adds config-related schemas
func addConfigSchemas(spec *openapi3.T) {
	// FeatureFlags schema
	spec.Components.Schemas["FeatureFlags"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Feature flag settings",
			Properties: map[string]*openapi3.SchemaRef{
				"enableRealTimeUpdates": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable real-time updates feature",
					},
				},
				"enableOfflineMode": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable offline mode feature",
					},
				},
				"enableAnalytics": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable analytics feature",
					},
				},
				"enableDebugMode": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable debug mode feature",
					},
				},
			},
		},
	}
}