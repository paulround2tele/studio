package proxypools

import (
	"github.com/getkin/kin-openapi/openapi3"
)

// AddProxyPoolPaths adds proxy pool-related paths to the OpenAPI specification
func AddProxyPoolPaths(spec *openapi3.T) {
	addProxyPoolSchemas(spec)
	addListProxyPoolsPath(spec)
	addCreateProxyPoolPath(spec)
	addUpdateProxyPoolPath(spec)
	addDeleteProxyPoolPath(spec)
	addAddProxyToPoolPath(spec)
	addRemoveProxyFromPoolPath(spec)
}

// addListProxyPoolsPath adds the list proxy pools endpoint
func addListProxyPoolsPath(spec *openapi3.T) {
	listOp := &openapi3.Operation{
		OperationID: "listProxyPools",
		Summary:     "List proxy pools",
		Description: "Returns all proxy pools",
		Tags:        []string{"ProxyPools"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}

	listOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Proxy pools retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/ProxyPool",
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

	spec.Paths.Set("/proxy-pools", &openapi3.PathItem{
		Get: listOp,
	})
}

// addCreateProxyPoolPath adds the create proxy pool endpoint
func addCreateProxyPoolPath(spec *openapi3.T) {
	createOp := &openapi3.Operation{
		OperationID: "createProxyPool",
		Summary:     "Create proxy pool",
		Description: "Creates a new proxy pool",
		Tags:        []string{"ProxyPools"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/ProxyPoolRequest",
						},
					},
				},
			},
		},
	}

	createOp.AddResponse(201, &openapi3.Response{
		Description: &[]string{"Proxy pool created successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ProxyPool",
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

	if spec.Paths.Find("/proxy-pools") == nil {
		spec.Paths.Set("/proxy-pools", &openapi3.PathItem{})
	}
	spec.Paths.Find("/proxy-pools").Post = createOp
}

// addUpdateProxyPoolPath adds the update proxy pool endpoint
func addUpdateProxyPoolPath(spec *openapi3.T) {
	updateOp := &openapi3.Operation{
		OperationID: "updateProxyPool",
		Summary:     "Update proxy pool",
		Description: "Updates a proxy pool by ID",
		Tags:        []string{"ProxyPools"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "poolId",
					In:          "path",
					Required:    true,
					Description: "Pool ID",
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
							Ref: "#/components/schemas/ProxyPoolRequest",
						},
					},
				},
			},
		},
	}

	updateOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Proxy pool updated successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ProxyPool",
				},
			},
		},
	})

	addProxyPoolOperationErrorResponses(updateOp)

	spec.Paths.Set("/proxy-pools/{poolId}", &openapi3.PathItem{
		Put: updateOp,
	})
}

// addDeleteProxyPoolPath adds the delete proxy pool endpoint
func addDeleteProxyPoolPath(spec *openapi3.T) {
	deleteOp := &openapi3.Operation{
		OperationID: "deleteProxyPool",
		Summary:     "Delete proxy pool",
		Description: "Deletes a proxy pool by ID",
		Tags:        []string{"ProxyPools"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "poolId",
					In:          "path",
					Required:    true,
					Description: "Pool ID",
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
		Description: &[]string{"Proxy pool deleted successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"object"},
						Properties: map[string]*openapi3.SchemaRef{
							"deleted": {
								Value: &openapi3.Schema{
									Type:        &openapi3.Types{"boolean"},
									Description: "Deletion status",
								},
							},
						},
					},
				},
			},
		},
	})

	addProxyPoolOperationErrorResponses(deleteOp)

	if spec.Paths.Find("/proxy-pools/{poolId}") == nil {
		spec.Paths.Set("/proxy-pools/{poolId}", &openapi3.PathItem{})
	}
	spec.Paths.Find("/proxy-pools/{poolId}").Delete = deleteOp
}

// addAddProxyToPoolPath adds the add proxy to pool endpoint
func addAddProxyToPoolPath(spec *openapi3.T) {
	addProxyOp := &openapi3.Operation{
		OperationID: "addProxyToPool",
		Summary:     "Add proxy to pool",
		Description: "Assigns a proxy to a pool",
		Tags:        []string{"ProxyPools"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "poolId",
					In:          "path",
					Required:    true,
					Description: "Pool ID",
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
							Ref: "#/components/schemas/AddProxyToPoolRequest",
						},
					},
				},
			},
		},
	}

	addProxyOp.AddResponse(201, &openapi3.Response{
		Description: &[]string{"Proxy added to pool successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ProxyPoolMembership",
				},
			},
		},
	})

	addProxyPoolOperationErrorResponses(addProxyOp)

	spec.Paths.Set("/proxy-pools/{poolId}/proxies", &openapi3.PathItem{
		Post: addProxyOp,
	})
}

// addRemoveProxyFromPoolPath adds the remove proxy from pool endpoint
func addRemoveProxyFromPoolPath(spec *openapi3.T) {
	removeProxyOp := &openapi3.Operation{
		OperationID: "removeProxyFromPool",
		Summary:     "Remove proxy from pool",
		Description: "Removes a proxy from a pool",
		Tags:        []string{"ProxyPools"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "poolId",
					In:          "path",
					Required:    true,
					Description: "Pool ID",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:   &openapi3.Types{"string"},
							Format: "uuid",
						},
					},
				},
			},
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

	removeProxyOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Proxy removed from pool successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"object"},
						Properties: map[string]*openapi3.SchemaRef{
							"removed": {
								Value: &openapi3.Schema{
									Type:        &openapi3.Types{"boolean"},
									Description: "Removal status",
								},
							},
						},
					},
				},
			},
		},
	})

	addProxyPoolOperationErrorResponses(removeProxyOp)

	spec.Paths.Set("/proxy-pools/{poolId}/proxies/{proxyId}", &openapi3.PathItem{
		Delete: removeProxyOp,
	})
}

// addProxyPoolOperationErrorResponses adds common error responses for proxy pool operations
func addProxyPoolOperationErrorResponses(op *openapi3.Operation) {
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
		Description: &[]string{"Proxy pool not found"}[0],
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

// addProxyPoolSchemas adds proxy pool-related schemas
func addProxyPoolSchemas(spec *openapi3.T) {
	// ProxyPoolRequest schema
	spec.Components.Schemas["ProxyPoolRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to create or update a proxy pool",
			Required:    []string{"name"},
			Properties: map[string]*openapi3.SchemaRef{
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						MinLength:   1,
						MaxLength:   &[]uint64{255}[0],
						Description: "Proxy pool name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy pool description",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the proxy pool is enabled",
					},
				},
				"poolStrategy": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Pool selection strategy (e.g., round_robin, random, weighted)",
					},
				},
				"healthCheckEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether health checks are enabled for the pool",
					},
				},
				"healthCheckIntervalSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Max:         &[]float64{3600}[0],
						Description: "Health check interval in seconds",
					},
				},
				"maxRetries": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Max:         &[]float64{10}[0],
						Description: "Maximum retry attempts for proxy requests",
					},
				},
				"timeoutSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Max:         &[]float64{300}[0],
						Description: "Timeout for proxy requests in seconds",
					},
				},
			},
		},
	}

	// ProxyPool schema
	spec.Components.Schemas["ProxyPool"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Proxy pool configuration and status information",
			Properties: map[string]*openapi3.SchemaRef{
				"id": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Proxy pool unique identifier",
					},
				},
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy pool name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy pool description",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the proxy pool is enabled",
					},
				},
				"poolStrategy": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Pool selection strategy",
					},
				},
				"healthCheckEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether health checks are enabled",
					},
				},
				"healthCheckIntervalSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Health check interval in seconds",
					},
				},
				"maxRetries": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum retry attempts",
					},
				},
				"timeoutSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Timeout in seconds",
					},
				},
				"proxies": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/Proxy",
						},
						Description: "List of proxies in the pool",
					},
				},
				"createdAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Pool creation timestamp",
					},
				},
				"updatedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Pool last update timestamp",
					},
				},
			},
		},
	}

	// AddProxyToPoolRequest schema
	spec.Components.Schemas["AddProxyToPoolRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to add a proxy to a pool",
			Required:    []string{"proxyId"},
			Properties: map[string]*openapi3.SchemaRef{
				"proxyId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Proxy ID to add to the pool",
					},
				},
				"weight": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Max:         &[]float64{100}[0],
						Description: "Weight for weighted pool strategies",
					},
				},
			},
		},
	}

	// ProxyPoolMembership schema
	spec.Components.Schemas["ProxyPoolMembership"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Proxy pool membership information",
			Properties: map[string]*openapi3.SchemaRef{
				"poolId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Pool ID",
					},
				},
				"proxyId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Proxy ID",
					},
				},
				"weight": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Weight for proxy selection",
					},
				},
				"isActive": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the membership is active",
					},
				},
				"addedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Timestamp when proxy was added to pool",
					},
				},
			},
		},
	}
}