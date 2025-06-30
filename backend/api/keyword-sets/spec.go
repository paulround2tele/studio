package keywordsets

import (
	"github.com/getkin/kin-openapi/openapi3"
)

// AddKeywordSetPaths adds keyword set-related paths to the OpenAPI specification
func AddKeywordSetPaths(spec *openapi3.T) {
	addKeywordSetSchemas(spec)
	addCreateKeywordSetPath(spec)
	addListKeywordSetsPath(spec)
	addGetKeywordSetPath(spec)
	addUpdateKeywordSetPath(spec)
	addDeleteKeywordSetPath(spec)
}

// addCreateKeywordSetPath adds the create keyword set endpoint
func addCreateKeywordSetPath(spec *openapi3.T) {
	createOp := &openapi3.Operation{
		OperationID: "createKeywordSet",
		Summary:     "Create keyword set",
		Description: "Creates a new keyword set with optional rules",
		Tags:        []string{"KeywordSets"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/CreateKeywordSetRequest",
						},
					},
				},
			},
		},
	}

	createOp.AddResponse(201, &openapi3.Response{
		Description: &[]string{"Keyword set created successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/KeywordSetResponse",
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
		Description: &[]string{"Keyword set with name already exists"}[0],
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

	spec.Paths.Set("/keywords/sets", &openapi3.PathItem{
		Post: createOp,
	})
}

// addListKeywordSetsPath adds the list keyword sets endpoint
func addListKeywordSetsPath(spec *openapi3.T) {
	listOp := &openapi3.Operation{
		OperationID: "listKeywordSets",
		Summary:     "List keyword sets",
		Description: "Lists all keyword sets with optional filtering and pagination",
		Tags:        []string{"KeywordSets"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "limit",
					In:          "query",
					Description: "Maximum number of keyword sets to return",
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
					Description: "Number of keyword sets to skip for pagination",
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
					Name:        "isEnabled",
					In:          "query",
					Description: "Filter keyword sets by enabled status",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"boolean"},
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "includeRules",
					In:          "query",
					Description: "Include keyword rules in the response",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"boolean"},
							Default: false,
						},
					},
				},
			},
		},
	}

	listOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Keyword sets retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/KeywordSetResponse",
						},
					},
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

	if spec.Paths.Find("/keywords/sets") == nil {
		spec.Paths.Set("/keywords/sets", &openapi3.PathItem{})
	}
	spec.Paths.Find("/keywords/sets").Get = listOp
}

// addGetKeywordSetPath adds the get keyword set endpoint
func addGetKeywordSetPath(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getKeywordSet",
		Summary:     "Get keyword set",
		Description: "Gets a keyword set by ID including its rules",
		Tags:        []string{"KeywordSets"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "setId",
					In:          "path",
					Required:    true,
					Description: "Keyword set ID",
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
		Description: &[]string{"Keyword set retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/KeywordSetResponse",
				},
			},
		},
	})

	addKeywordSetOperationErrorResponses(getOp)

	spec.Paths.Set("/keywords/sets/{setId}", &openapi3.PathItem{
		Get: getOp,
	})
}

// addUpdateKeywordSetPath adds the update keyword set endpoint
func addUpdateKeywordSetPath(spec *openapi3.T) {
	updateOp := &openapi3.Operation{
		OperationID: "updateKeywordSet",
		Summary:     "Update keyword set",
		Description: "Updates a keyword set by ID including its rules",
		Tags:        []string{"KeywordSets"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "setId",
					In:          "path",
					Required:    true,
					Description: "Keyword set ID",
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
							Ref: "#/components/schemas/UpdateKeywordSetRequest",
						},
					},
				},
			},
		},
	}

	updateOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Keyword set updated successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/KeywordSetResponse",
				},
			},
		},
	})

	addKeywordSetOperationErrorResponses(updateOp)

	updateOp.AddResponse(409, &openapi3.Response{
		Description: &[]string{"Keyword set name already exists"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	if spec.Paths.Find("/keywords/sets/{setId}") == nil {
		spec.Paths.Set("/keywords/sets/{setId}", &openapi3.PathItem{})
	}
	spec.Paths.Find("/keywords/sets/{setId}").Put = updateOp
}

// addDeleteKeywordSetPath adds the delete keyword set endpoint
func addDeleteKeywordSetPath(spec *openapi3.T) {
	deleteOp := &openapi3.Operation{
		OperationID: "deleteKeywordSet",
		Summary:     "Delete keyword set",
		Description: "Deletes a keyword set by ID including all its rules",
		Tags:        []string{"KeywordSets"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "setId",
					In:          "path",
					Required:    true,
					Description: "Keyword set ID",
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
		Description: &[]string{"Keyword set deleted successfully"}[0],
	})

	addKeywordSetOperationErrorResponses(deleteOp)

	if spec.Paths.Find("/keywords/sets/{setId}") == nil {
		spec.Paths.Set("/keywords/sets/{setId}", &openapi3.PathItem{})
	}
	spec.Paths.Find("/keywords/sets/{setId}").Delete = deleteOp
}

// addKeywordSetOperationErrorResponses adds common error responses for keyword set operations
func addKeywordSetOperationErrorResponses(op *openapi3.Operation) {
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
		Description: &[]string{"Keyword set not found"}[0],
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

// addKeywordSetSchemas adds keyword set-related schemas
func addKeywordSetSchemas(spec *openapi3.T) {
	// KeywordRuleRequest schema
	spec.Components.Schemas["KeywordRuleRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to create or update a keyword rule",
			Required:    []string{"pattern", "ruleType"},
			Properties: map[string]*openapi3.SchemaRef{
				"pattern": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						MinLength:   1,
						Description: "Pattern to match against content",
					},
				},
				"ruleType": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"string", "regex"},
						Description: "Type of rule pattern matching",
					},
				},
				"isCaseSensitive": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether pattern matching is case sensitive",
						Default:     false,
					},
				},
				"category": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Category for organizing related rules",
					},
				},
				"contextChars": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Number of context characters to include around matches",
						Default:     0,
					},
				},
			},
		},
	}

	// CreateKeywordSetRequest schema
	spec.Components.Schemas["CreateKeywordSetRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to create a new keyword set",
			Required:    []string{"name"},
			Properties: map[string]*openapi3.SchemaRef{
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						MinLength:   1,
						MaxLength:   &[]uint64{255}[0],
						Description: "Keyword set name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Keyword set description",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the keyword set is enabled",
						Default:     true,
					},
				},
				"rules": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/KeywordRuleRequest",
						},
						Description: "List of keyword rules to include in the set",
					},
				},
			},
		},
	}

	// UpdateKeywordSetRequest schema
	spec.Components.Schemas["UpdateKeywordSetRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to update an existing keyword set",
			Properties: map[string]*openapi3.SchemaRef{
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						MinLength:   1,
						MaxLength:   &[]uint64{255}[0],
						Description: "Keyword set name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Keyword set description",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the keyword set is enabled",
					},
				},
				"rules": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/KeywordRuleRequest",
						},
						Description: "List of keyword rules (replaces all existing rules)",
					},
				},
			},
		},
	}

	// KeywordRule schema
	spec.Components.Schemas["KeywordRule"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Keyword rule information",
			Properties: map[string]*openapi3.SchemaRef{
				"id": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Rule unique identifier",
					},
				},
				"keywordSetId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Parent keyword set ID",
					},
				},
				"pattern": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Pattern to match against content",
					},
				},
				"ruleType": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"string", "regex"},
						Description: "Type of rule pattern matching",
					},
				},
				"isCaseSensitive": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether pattern matching is case sensitive",
					},
				},
				"category": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Category for organizing related rules",
					},
				},
				"contextChars": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of context characters to include around matches",
					},
				},
				"createdAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Rule creation timestamp",
					},
				},
				"updatedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Rule last update timestamp",
					},
				},
			},
		},
	}

	// KeywordSetResponse schema
	spec.Components.Schemas["KeywordSetResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Keyword set information with rules",
			Properties: map[string]*openapi3.SchemaRef{
				"id": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Keyword set unique identifier",
					},
				},
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Keyword set name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Keyword set description",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether the keyword set is enabled",
					},
				},
				"rules": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/KeywordRule",
						},
						Description: "List of keyword rules in the set",
					},
				},
				"ruleCount": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Number of rules in the set",
					},
				},
				"createdAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Keyword set creation timestamp",
					},
				},
				"updatedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Keyword set last update timestamp",
					},
				},
			},
		},
	}
}