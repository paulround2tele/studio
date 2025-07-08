package proxies

import (
	"reflect"
	
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/utils"
)

// AddProxyPaths adds proxy-related paths to the OpenAPI specification
func AddProxyPaths(spec *openapi3.T) {
	addProxySchemas(spec)
	addListProxiesPath(spec)
	addCreateProxyPath(spec)
	addUpdateProxyPath(spec)
	addDeleteProxyPath(spec)
	addGetProxyStatusesPath(spec)
	addForceCheckSingleProxyPath(spec)
	addForceCheckAllProxiesPath(spec)
	addTestProxyPath(spec)
}

// addListProxiesPath adds the list proxies endpoint
func addListProxiesPath(spec *openapi3.T) {
	listOp := &openapi3.Operation{
		OperationID: "listProxies",
		Summary:     "List proxies",
		Description: "Lists all proxies with optional filtering",
		Tags:        []string{"Proxies"},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "limit",
					In:          "query",
					Description: "Number of items to return",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Default: 100,
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "offset",
					In:          "query",
					Description: "Number of items to skip",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Default: 0,
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "protocol",
					In:          "query",
					Description: "Filter by proxy protocol",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"string"},
							Enum: []interface{}{"http", "https", "socks5", "socks4"},
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "isEnabled",
					In:          "query",
					Description: "Filter by enabled status",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"boolean"},
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "isHealthy",
					In:          "query",
					Description: "Filter by health status",
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
		Description: &[]string{"Proxies retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/Proxy",
						},
					},
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

	spec.Paths.Set("/proxies", &openapi3.PathItem{
		Get: listOp,
	})
}

// addCreateProxyPath adds the create proxy endpoint
func addCreateProxyPath(spec *openapi3.T) {
	createOp := &openapi3.Operation{
		OperationID: "createProxy",
		Summary:     "Add proxy",
		Description: "Adds a new proxy",
		Tags:        []string{"Proxies"},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/CreateProxyRequest",
						},
					},
				},
			},
		},
	}

	createOp.AddResponse(201, &openapi3.Response{
		Description: &[]string{"Proxy created successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Proxy",
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

	if spec.Paths.Find("/proxies") == nil {
		spec.Paths.Set("/proxies", &openapi3.PathItem{})
	}
	spec.Paths.Find("/proxies").Post = createOp
}

// addUpdateProxyPath adds the update proxy endpoint
func addUpdateProxyPath(spec *openapi3.T) {
	updateOp := &openapi3.Operation{
		OperationID: "updateProxy",
		Summary:     "Update proxy",
		Description: "Updates a proxy by ID",
		Tags:        []string{"Proxies"},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "proxyId",
					In:          "path",
					Required:    true,
					Description: "Proxy ID",
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
							Ref: "#/components/schemas/UpdateProxyRequest",
						},
					},
				},
			},
		},
	}

	updateOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Proxy updated successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Proxy",
				},
			},
		},
	})

	addProxyOperationErrorResponses(updateOp)

	spec.Paths.Set("/proxies/{proxyId}", &openapi3.PathItem{
		Put: updateOp,
	})
}

// addDeleteProxyPath adds the delete proxy endpoint
func addDeleteProxyPath(spec *openapi3.T) {
	deleteOp := &openapi3.Operation{
		OperationID: "deleteProxy",
		Summary:     "Delete proxy",
		Description: "Deletes a proxy by ID",
		Tags:        []string{"Proxies"},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "proxyId",
					In:          "path",
					Required:    true,
					Description: "Proxy ID",
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

	deleteOp.AddResponse(204, &openapi3.Response{
		Description: &[]string{"Proxy deleted successfully"}[0],
	})

	addProxyOperationErrorResponses(deleteOp)

	if spec.Paths.Find("/proxies/{proxyId}") == nil {
		spec.Paths.Set("/proxies/{proxyId}", &openapi3.PathItem{})
	}
	spec.Paths.Find("/proxies/{proxyId}").Delete = deleteOp
}

// addGetProxyStatusesPath adds the get proxy statuses endpoint
func addGetProxyStatusesPath(spec *openapi3.T) {
	statusOp := &openapi3.Operation{
		OperationID: "getProxyStatuses",
		Summary:     "Get proxy statuses",
		Description: "Gets the status of all proxies",
		Tags:        []string{"Proxies"},
	}

	statusOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Proxy statuses retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/ProxyStatus",
						},
					},
				},
			},
		},
	})

	statusOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/proxies/status", &openapi3.PathItem{
		Get: statusOp,
	})
}

// addForceCheckSingleProxyPath adds the force single proxy health check endpoint
func addForceCheckSingleProxyPath(spec *openapi3.T) {
	checkOp := &openapi3.Operation{
		OperationID: "forceCheckSingleProxy",
		Summary:     "Force single proxy health check",
		Description: "Forces a health check on a single proxy",
		Tags:        []string{"Proxies"},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "proxyId",
					In:          "path",
					Required:    true,
					Description: "Proxy ID",
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

	checkOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Health check completed"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ProxyStatus",
				},
			},
		},
	})

	addProxyOperationErrorResponses(checkOp)

	spec.Paths.Set("/proxies/{proxyId}/health-check", &openapi3.PathItem{
		Post: checkOp,
	})
}

// addForceCheckAllProxiesPath adds the force all proxies health check endpoint
func addForceCheckAllProxiesPath(spec *openapi3.T) {
	checkAllOp := &openapi3.Operation{
		OperationID: "forceCheckAllProxies",
		Summary:     "Force all proxies health check",
		Description: "Forces a health check on all proxies",
		Tags:        []string{"Proxies"},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: false,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/ForceCheckProxiesRequest",
						},
					},
				},
			},
		},
	}

	checkAllOp.AddResponse(202, &openapi3.Response{
		Description: &[]string{"Health check process initiated"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"object"},
						Properties: map[string]*openapi3.SchemaRef{
							"message": {
								Value: &openapi3.Schema{
									Type:        &openapi3.Types{"string"},
									Description: "Status message",
								},
							},
						},
					},
				},
			},
		},
	})

	checkAllOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	checkAllOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/proxies/health-check", &openapi3.PathItem{
		Post: checkAllOp,
	})
}

// addTestProxyPath adds the test proxy endpoint
func addTestProxyPath(spec *openapi3.T) {
	testOp := &openapi3.Operation{
		OperationID: "testProxy",
		Summary:     "Test proxy",
		Description: "Tests a proxy by ID",
		Tags:        []string{"Proxies"},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "proxyId",
					In:          "path",
					Required:    true,
					Description: "Proxy ID",
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
		Description: &[]string{"Proxy test completed"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ProxyTestResult",
				},
			},
		},
	})

	addProxyOperationErrorResponses(testOp)

	spec.Paths.Set("/proxies/{proxyId}/test", &openapi3.PathItem{
		Post: testOp,
	})
}

// addProxyOperationErrorResponses adds common error responses for proxy operations
func addProxyOperationErrorResponses(op *openapi3.Operation) {
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

	op.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Proxy not found"}[0],
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

// addProxySchemas adds proxy-related schemas
func addProxySchemas(spec *openapi3.T) {
	// CreateProxyRequest schema
	spec.Components.Schemas["CreateProxyRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to create a new proxy",
			Required:    []string{"name", "protocol", "address"},
			Properties: map[string]*openapi3.SchemaRef{
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						MinLength:   1,
						MaxLength:   &[]uint64{255}[0],
						Description: "Proxy name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy description",
					},
				},
				"protocol": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"http", "https", "socks5", "socks4"},
						Description: "Proxy protocol",
					},
				},
				"address": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy address (host:port)",
					},
				},
				"username": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy username for authentication",
					},
				},
				"password": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy password for authentication",
					},
				},
				"countryCode": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Country code for the proxy location",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the proxy is enabled",
					},
				},
			},
		},
	}

	// UpdateProxyRequest schema
	spec.Components.Schemas["UpdateProxyRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to update an existing proxy",
			Properties: map[string]*openapi3.SchemaRef{
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						MinLength:   1,
						MaxLength:   &[]uint64{255}[0],
						Description: "Proxy name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy description",
					},
				},
				"protocol": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"http", "https", "socks5", "socks4"},
						Description: "Proxy protocol",
					},
				},
				"address": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy address (host:port)",
					},
				},
				"username": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy username for authentication",
					},
				},
				"password": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy password for authentication",
					},
				},
				"countryCode": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Country code for the proxy location",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the proxy is enabled",
					},
				},
			},
		},
	}

	// Auto-generate Proxy schema from Go struct
	utils.AddStructSchema(spec, reflect.TypeOf(models.Proxy{}), "Proxy")

	// ProxyStatus schema
	spec.Components.Schemas["ProxyStatus"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Proxy status information",
			Properties: map[string]*openapi3.SchemaRef{
				"id": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy ID",
					},
				},
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy description",
					},
				},
				"protocol": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy protocol",
					},
				},
				"address": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy address",
					},
				},
				"username": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy username",
					},
				},
				"password": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy password (may be masked)",
					},
				},
				"userEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the proxy is enabled by user",
					},
				},
				"isHealthy": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the proxy is healthy",
					},
				},
				"lastFailure": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Last failure timestamp",
					},
				},
				"consecutiveFailures": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of consecutive failures",
					},
				},
			},
		},
	}

	// ProxyTestResult schema
	spec.Components.Schemas["ProxyTestResult"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Result of proxy test operation",
			Properties: map[string]*openapi3.SchemaRef{
				"proxyId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy ID that was tested",
					},
				},
				"success": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the test was successful",
					},
				},
				"statusCode": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "HTTP status code from test request",
					},
				},
				"returnedIp": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "IP address returned by the proxy test",
					},
				},
				"error": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Error message if test failed",
					},
				},
				"durationMs": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Test duration in milliseconds",
					},
				},
			},
		},
	}

	// ForceCheckProxiesRequest schema
	spec.Components.Schemas["ForceCheckProxiesRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to force health check on specific proxies",
			Properties: map[string]*openapi3.SchemaRef{
				"ids": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type: &openapi3.Types{"string"},
							},
						},
						Description: "List of proxy IDs to check (empty for all)",
					},
				},
			},
		},
	}
}