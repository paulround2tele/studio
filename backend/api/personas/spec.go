package personas

import (
	"reflect"
	
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/utils"
)

// AddPersonaPaths adds persona-related paths to the OpenAPI specification
func AddPersonaPaths(spec *openapi3.T) {
	addPersonaSchemas(spec)
	addListPersonasPath(spec)
	addCreatePersonaPath(spec)
	addGetPersonaByIDPath(spec)
	addGetHttpPersonaByIDPath(spec)
	addGetDnsPersonaByIDPath(spec)
	addUpdatePersonaPath(spec)
	addDeletePersonaPath(spec)
	addTestPersonaPath(spec)
}

// addListPersonasPath adds the list personas endpoint
func addListPersonasPath(spec *openapi3.T) {
	listOp := &openapi3.Operation{
		OperationID: "listPersonas",
		Summary:     "List personas",
		Description: "Lists all personas with optional filtering by type and enabled status",
		Tags:        []string{"Personas"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "limit",
					In:          "query",
					Description: "Maximum number of personas to return",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Min:     &[]float64{1}[0],
							Max:     &[]float64{100}[0],
							Default: 20,
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "offset",
					In:          "query",
					Description: "Number of personas to skip for pagination",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Min:     &[]float64{0}[0],
							Default: 0,
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "personaType",
					In:          "query",
					Description: "Filter personas by type",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"string"},
							Enum: []interface{}{"dns", "http"},
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "isEnabled",
					In:          "query",
					Description: "Filter personas by enabled status",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"boolean"},
						},
					},
				},
			},
		},
	}

	listOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Personas retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/PersonaListResponse",
				},
			},
		},
	})

	listOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	listOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	listOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/personas", &openapi3.PathItem{
		Get: listOp,
	})
}

// addCreatePersonaPath adds the create persona endpoint
func addCreatePersonaPath(spec *openapi3.T) {
	createOp := &openapi3.Operation{
		OperationID: "createPersona",
		Summary:     "Create persona",
		Description: "Creates a new persona with structured configuration",
		Tags:        []string{"Personas"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/CreatePersonaRequest",
						},
					},
				},
			},
		},
	}

	createOp.AddResponse(201, &openapi3.Response{
		Description: &[]string{"Persona created successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Persona",
				},
			},
		},
	})

	createOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	createOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	createOp.AddResponse(409, &openapi3.Response{
		Description: &[]string{"Persona with name and type already exists"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	createOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	if spec.Paths.Find("/personas") == nil {
		spec.Paths.Set("/personas", &openapi3.PathItem{})
	}
	spec.Paths.Find("/personas").Post = createOp
}

// addGetPersonaByIDPath adds the get persona by ID endpoint
func addGetPersonaByIDPath(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getPersonaById",
		Summary:     "Get persona by ID",
		Description: "Gets a persona by ID regardless of type",
		Tags:        []string{"Personas"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Persona ID",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:   &openapi3.Types{"string"},
							Format: "uuid",
						},
					},
				},
			},
		},
	}

	getOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Persona retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Persona",
				},
			},
		},
	})

	addPersonaOperationErrorResponses(getOp)

	spec.Paths.Set("/personas/{id}", &openapi3.PathItem{
		Get: getOp,
	})
}

// addGetHttpPersonaByIDPath adds the get HTTP persona by ID endpoint
func addGetHttpPersonaByIDPath(spec *openapi3.T) {
	getHttpOp := &openapi3.Operation{
		OperationID: "getHttpPersonaById",
		Summary:     "Get HTTP persona by ID",
		Description: "Gets an HTTP persona by ID with typed configuration",
		Tags:        []string{"Personas"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Persona ID",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:   &openapi3.Types{"string"},
							Format: "uuid",
						},
					},
				},
			},
		},
	}

	getHttpOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"HTTP persona retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Persona",
				},
			},
		},
	})

	addPersonaOperationErrorResponses(getHttpOp)

	spec.Paths.Set("/personas/http/{id}", &openapi3.PathItem{
		Get: getHttpOp,
	})
}

// addGetDnsPersonaByIDPath adds the get DNS persona by ID endpoint
func addGetDnsPersonaByIDPath(spec *openapi3.T) {
	getDnsOp := &openapi3.Operation{
		OperationID: "getDnsPersonaById",
		Summary:     "Get DNS persona by ID",
		Description: "Gets a DNS persona by ID with typed configuration",
		Tags:        []string{"Personas"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Persona ID",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:   &openapi3.Types{"string"},
							Format: "uuid",
						},
					},
				},
			},
		},
	}

	getDnsOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"DNS persona retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Persona",
				},
			},
		},
	})

	addPersonaOperationErrorResponses(getDnsOp)

	spec.Paths.Set("/personas/dns/{id}", &openapi3.PathItem{
		Get: getDnsOp,
	})
}

// addUpdatePersonaPath adds the update persona endpoint
func addUpdatePersonaPath(spec *openapi3.T) {
	updateOp := &openapi3.Operation{
		OperationID: "updatePersona",
		Summary:     "Update persona",
		Description: "Updates a persona by ID with structured configuration",
		Tags:        []string{"Personas"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Persona ID",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:   &openapi3.Types{"string"},
							Format: "uuid",
						},
					},
				},
			},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/UpdatePersonaRequest",
						},
					},
				},
			},
		},
	}

	updateOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Persona updated successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Persona",
				},
			},
		},
	})

	addPersonaOperationErrorResponses(updateOp)

	if spec.Paths.Find("/personas/{id}") == nil {
		spec.Paths.Set("/personas/{id}", &openapi3.PathItem{})
	}
	spec.Paths.Find("/personas/{id}").Put = updateOp
}

// addDeletePersonaPath adds the delete persona endpoint
func addDeletePersonaPath(spec *openapi3.T) {
	deleteOp := &openapi3.Operation{
		OperationID: "deletePersona",
		Summary:     "Delete persona",
		Description: "Deletes a persona by ID",
		Tags:        []string{"Personas"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Persona ID",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:   &openapi3.Types{"string"},
							Format: "uuid",
						},
					},
				},
			},
		},
	}

	deleteOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Persona deleted successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/StandardAPIResponse",
				},
			},
		},
	})

	addPersonaOperationErrorResponses(deleteOp)

	if spec.Paths.Find("/personas/{id}") == nil {
		spec.Paths.Set("/personas/{id}", &openapi3.PathItem{})
	}
	spec.Paths.Find("/personas/{id}").Delete = deleteOp
}

// addTestPersonaPath adds the test persona endpoint
func addTestPersonaPath(spec *openapi3.T) {
	testOp := &openapi3.Operation{
		OperationID: "testPersona",
		Summary:     "Test persona",
		Description: "Tests a persona by ID",
		Tags:        []string{"Personas"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Persona ID",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:   &openapi3.Types{"string"},
							Format: "uuid",
						},
					},
				},
			},
		},
	}

	testOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Persona test completed successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/PersonaTestResult",
				},
			},
		},
	})

	addPersonaOperationErrorResponses(testOp)

	spec.Paths.Set("/personas/{id}/test", &openapi3.PathItem{
		Post: testOp,
	})
}

// addPersonaOperationErrorResponses adds common error responses for persona operations
func addPersonaOperationErrorResponses(op *openapi3.Operation) {
	op.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	op.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	op.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Persona not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	op.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})
}

// addPersonaSchemas adds persona-related schemas
func addPersonaSchemas(spec *openapi3.T) {
	// CreatePersonaRequest schema
	spec.Components.Schemas["CreatePersonaRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to create a new persona",
			Required:    []string{"name", "personaType", "configDetails"},
			Properties: map[string]*openapi3.SchemaRef{
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						MinLength:   1,
						MaxLength:   &[]uint64{255}[0],
						Description: "Persona name",
					},
				},
				"personaType": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"dns", "http"},
						Description: "Type of persona",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Persona description",
					},
				},
				"configDetails": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/HttpPersonaConfig"},
							{Ref: "#/components/schemas/DnsPersonaConfig"},
						},
						Description: "Type-specific configuration details",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the persona is enabled",
						Default:     false,
					},
				},
			},
		},
	}

	// UpdatePersonaRequest schema
	spec.Components.Schemas["UpdatePersonaRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to update an existing persona",
			Properties: map[string]*openapi3.SchemaRef{
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						MinLength:   1,
						MaxLength:   &[]uint64{255}[0],
						Description: "Persona name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Persona description",
					},
				},
				"configDetails": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/HttpPersonaConfig"},
							{Ref: "#/components/schemas/DnsPersonaConfig"},
						},
						Description: "Type-specific configuration details",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the persona is enabled",
					},
				},
			},
		},
	}

	// Auto-generate Persona schema from Go struct
	utils.AddStructSchema(spec, reflect.TypeOf(models.Persona{}), "Persona")

	// PersonaListResponse schema
	spec.Components.Schemas["PersonaListResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Response for persona list",
			Properties: map[string]*openapi3.SchemaRef{
				"status": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"success"},
					},
				},
				"data": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/Persona",
						},
					},
				},
				"message": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Response message",
					},
				},
			},
		},
	}

	// PersonaTestResult schema
	spec.Components.Schemas["PersonaTestResult"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Result of persona test operation",
			Properties: map[string]*openapi3.SchemaRef{
				"status": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"success"},
					},
				},
				"data": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"object"},
						Properties: map[string]*openapi3.SchemaRef{
							"personaId": {
								Value: &openapi3.Schema{
									Type:        &openapi3.Types{"string"},
									Format:      "uuid",
									Description: "Persona ID that was tested",
								},
							},
							"personaType": {
								Value: &openapi3.Schema{
									Type: &openapi3.Types{"string"},
									Enum: []interface{}{"dns", "http"},
									Description: "Type of persona tested",
								},
							},
							"status": {
								Value: &openapi3.Schema{
									Type:        &openapi3.Types{"string"},
									Description: "Test result status",
								},
							},
							"message": {
								Value: &openapi3.Schema{
									Type:        &openapi3.Types{"string"},
									Description: "Test result message",
								},
							},
							"testedAt": {
								Value: &openapi3.Schema{
									Type:        &openapi3.Types{"string"},
									Format:      "date-time",
									Description: "Test execution timestamp",
								},
							},
						},
					},
				},
				"message": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Response message",
					},
				},
			},
		},
	}

	// HttpPersonaConfig schema
	spec.Components.Schemas["HttpPersonaConfig"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "HTTP persona configuration details",
			Required:    []string{"userAgent"},
			Properties: map[string]*openapi3.SchemaRef{
				"userAgent": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "User agent string for HTTP requests",
					},
				},
				"headers": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"object"},
						AdditionalProperties: openapi3.AdditionalProperties{
							Schema: &openapi3.SchemaRef{
								Value: &openapi3.Schema{
									Type: &openapi3.Types{"string"},
								},
							},
						},
						Description: "Custom HTTP headers",
					},
				},
				"headerOrder": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type: &openapi3.Types{"string"},
							},
						},
						Description: "Order of HTTP headers",
					},
				},
				"tlsClientHello": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/TLSClientHello"},
						},
					},
				},
				"http2Settings": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/HTTP2SettingsConfig"},
						},
					},
				},
				"cookieHandling": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/CookieHandling"},
						},
					},
				},
				"allowInsecureTls": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Allow insecure TLS connections",
					},
				},
				"requestTimeoutSec": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Max:         &[]float64{300}[0],
						Description: "Request timeout in seconds",
					},
				},
				"maxRedirects": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Max:         &[]float64{20}[0],
						Description: "Maximum number of redirects to follow",
					},
				},
				"allowedStatusCodes": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type: &openapi3.Types{"integer"},
								Min:  &[]float64{100}[0],
								Max:  &[]float64{599}[0],
							},
						},
						Description: "Allowed HTTP status codes",
					},
				},
				"followRedirects": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether to follow HTTP redirects",
					},
				},
				"insecureSkipVerify": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Skip TLS certificate verification",
					},
				},
				"rateLimitDps": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"number"},
						Min:         &[]float64{0}[0],
						Description: "Rate limit in requests per second",
					},
				},
				"rateLimitBurst": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Description: "Rate limit burst capacity",
					},
				},
				"useHeadless": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Use headless browser for requests",
					},
				},
				"viewportWidth": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{320}[0],
						Max:         &[]float64{4096}[0],
						Description: "Viewport width for headless browser",
					},
				},
				"viewportHeight": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{240}[0],
						Max:         &[]float64{4096}[0],
						Description: "Viewport height for headless browser",
					},
				},
				"headlessUserAgent": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "User agent for headless browser",
					},
				},
				"scriptExecution": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable JavaScript execution in headless browser",
					},
				},
				"loadImages": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Load images in headless browser",
					},
				},
				"screenshot": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Take screenshots in headless browser",
					},
				},
				"domSnapshot": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Capture DOM snapshots in headless browser",
					},
				},
				"headlessTimeoutSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Max:         &[]float64{300}[0],
						Description: "Headless browser timeout in seconds",
					},
				},
				"waitDelaySeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Max:         &[]float64{60}[0],
						Description: "Wait delay before capturing content",
					},
				},
				"fetchBodyForKeywords": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Fetch response body for keyword scanning",
					},
				},
			},
		},
	}

	// DnsPersonaConfig schema
	spec.Components.Schemas["DnsPersonaConfig"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "DNS persona configuration details",
			Required:    []string{"resolvers", "queryTimeoutSeconds", "maxDomainsPerRequest", "resolverStrategy"},
			Properties: map[string]*openapi3.SchemaRef{
				"resolvers": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type:   &openapi3.Types{"string"},
								Format: "ipv4",
							},
						},
						MinItems:    uint64(1),
						Description: "DNS resolver IP addresses",
					},
				},
				"useSystemResolvers": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Use system DNS resolvers",
					},
				},
				"queryTimeoutSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Max:         &[]float64{60}[0],
						Description: "DNS query timeout in seconds",
					},
				},
				"maxDomainsPerRequest": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Max:         &[]float64{1000}[0],
						Description: "Maximum domains per request",
					},
				},
				"resolverStrategy": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"round_robin", "random", "weighted", "priority"},
						Description: "Strategy for selecting DNS resolvers",
					},
				},
				"resolversWeighted": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"object"},
						AdditionalProperties: openapi3.AdditionalProperties{
							Schema: &openapi3.SchemaRef{
								Value: &openapi3.Schema{
									Type: &openapi3.Types{"number"},
								},
							},
						},
						Description: "Weighted resolver configuration",
					},
				},
				"resolversPreferredOrder": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type: &openapi3.Types{"string"},
							},
						},
						Description: "Preferred order of resolvers",
					},
				},
				"concurrentQueriesPerDomain": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Max:         &[]float64{10}[0],
						Description: "Concurrent queries per domain",
					},
				},
				"queryDelayMinMs": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Max:         &[]float64{5000}[0],
						Description: "Minimum query delay in milliseconds",
					},
				},
				"queryDelayMaxMs": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Max:         &[]float64{10000}[0],
						Description: "Maximum query delay in milliseconds",
					},
				},
				"maxConcurrentGoroutines": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Max:         &[]float64{1000}[0],
						Description: "Maximum concurrent goroutines",
					},
				},
				"rateLimitDps": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"number"},
						Min:         &[]float64{0}[0],
						Description: "Rate limit in queries per second",
					},
				},
				"rateLimitBurst": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Description: "Rate limit burst capacity",
					},
				},
			},
		},
	}

	// TLSClientHello schema
	spec.Components.Schemas["TLSClientHello"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "TLS ClientHello configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"minVersion": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"TLS10", "TLS11", "TLS12", "TLS13"},
						Description: "Minimum TLS version",
					},
				},
				"maxVersion": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"TLS10", "TLS11", "TLS12", "TLS13"},
						Description: "Maximum TLS version",
					},
				},
				"cipherSuites": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type: &openapi3.Types{"string"},
							},
						},
						Description: "Supported cipher suites",
					},
				},
				"curvePreferences": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type: &openapi3.Types{"string"},
							},
						},
						Description: "Supported curve preferences",
					},
				},
				"ja3": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "JA3 fingerprint",
					},
				},
			},
		},
	}

	// HTTP2SettingsConfig schema
	spec.Components.Schemas["HTTP2SettingsConfig"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "HTTP/2 settings configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"enabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable HTTP/2",
					},
				},
			},
		},
	}

	// CookieHandling schema
	spec.Components.Schemas["CookieHandling"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Cookie handling configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"mode": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"preserve", "ignore", "custom", "clear", "session_only"},
						Description: "Cookie handling mode",
					},
				},
			},
		},
	}

}