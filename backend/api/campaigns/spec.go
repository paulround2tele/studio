package campaigns

import (
	"github.com/getkin/kin-openapi/openapi3"
)

// AddCampaignPaths adds campaign-related paths to the OpenAPI specification
func AddCampaignPaths(spec *openapi3.T) {
	addCampaignSchemas(spec)
	addCreateCampaignPath(spec)
	addListCampaignsPath(spec)
	addGetCampaignDetailsPath(spec)
	addStartCampaignPath(spec)
	addPauseCampaignPath(spec)
	addResumeCampaignPath(spec)
	addCancelCampaignPath(spec)
	addDeleteCampaignPath(spec)
	addGetGeneratedDomainsPath(spec)
	addGetDNSValidationResultsPath(spec)
	addGetHTTPKeywordResultsPath(spec)
}

// addCreateCampaignPath adds the create campaign endpoint
func addCreateCampaignPath(spec *openapi3.T) {
	createOp := &openapi3.Operation{
		OperationID: "createCampaign",
		Summary:     "Create campaign",
		Description: "Creates a new campaign using unified endpoint supporting all campaign types",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/CreateCampaignRequest",
						},
					},
				},
			},
		},
	}

	createOp.AddResponse(201, &openapi3.Response{
		Description: &[]string{"Campaign created successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Campaign",
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

	spec.Paths.Set("/campaigns", &openapi3.PathItem{
		Post: createOp,
	})
}

// addListCampaignsPath adds the list campaigns endpoint
func addListCampaignsPath(spec *openapi3.T) {
	listOp := &openapi3.Operation{
		OperationID: "listCampaigns",
		Summary:     "List campaigns",
		Description: "Lists all campaigns with pagination and filtering support",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "limit",
					In:          "query",
					Description: "Maximum number of campaigns to return (1-100)",
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
					Description: "Number of campaigns to skip for pagination",
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
					Name:        "status",
					In:          "query",
					Description: "Filter campaigns by status",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"string"},
							Enum: []interface{}{
								"pending", "queued", "running", "pausing", "paused",
								"completed", "failed", "archived", "cancelled",
							},
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "type",
					In:          "query",
					Description: "Filter campaigns by type",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"string"},
							Enum: []interface{}{
								"domain_generation", "dns_validation", "http_keyword_validation",
							},
						},
					},
				},
			},
		},
	}

	listOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Campaigns retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/CampaignListResponse",
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

	if spec.Paths.Find("/campaigns") == nil {
		spec.Paths.Set("/campaigns", &openapi3.PathItem{})
	}
	spec.Paths.Find("/campaigns").Get = listOp
}

// addGetCampaignDetailsPath adds the get campaign details endpoint
func addGetCampaignDetailsPath(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getCampaignDetails",
		Summary:     "Get campaign details",
		Description: "Gets detailed information about a campaign including type-specific parameters",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "campaignId",
					In:          "path",
					Required:    true,
					Description: "Campaign UUID",
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
		Description: &[]string{"Campaign details retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/CampaignDetailsResponse",
				},
			},
		},
	})

	getOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	getOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
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

	spec.Paths.Set("/campaigns/{campaignId}", &openapi3.PathItem{
		Get: getOp,
	})
}

// addStartCampaignPath adds the start campaign endpoint
func addStartCampaignPath(spec *openapi3.T) {
	startOp := &openapi3.Operation{
		OperationID: "startCampaign",
		Summary:     "Start campaign",
		Description: "Starts a campaign by transitioning it from pending to queued status",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "campaignId",
					In:          "path",
					Required:    true,
					Description: "Campaign UUID",
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

	startOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Campaign queued for start"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/CampaignOperationResponse",
				},
			},
		},
	})

	addCampaignOperationErrorResponses(startOp)

	spec.Paths.Set("/campaigns/{campaignId}/start", &openapi3.PathItem{
		Post: startOp,
	})
}

// addPauseCampaignPath adds the pause campaign endpoint
func addPauseCampaignPath(spec *openapi3.T) {
	pauseOp := &openapi3.Operation{
		OperationID: "pauseCampaign",
		Summary:     "Pause campaign",
		Description: "Pauses a running or queued campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "campaignId",
					In:          "path",
					Required:    true,
					Description: "Campaign UUID",
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

	pauseOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Campaign paused successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/CampaignOperationResponse",
				},
			},
		},
	})

	addCampaignOperationErrorResponses(pauseOp)

	spec.Paths.Set("/campaigns/{campaignId}/pause", &openapi3.PathItem{
		Post: pauseOp,
	})
}

// addResumeCampaignPath adds the resume campaign endpoint
func addResumeCampaignPath(spec *openapi3.T) {
	resumeOp := &openapi3.Operation{
		OperationID: "resumeCampaign",
		Summary:     "Resume campaign",
		Description: "Resumes a paused campaign by queuing it for execution",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "campaignId",
					In:          "path",
					Required:    true,
					Description: "Campaign UUID",
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

	resumeOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Campaign resumed successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/CampaignOperationResponse",
				},
			},
		},
	})

	addCampaignOperationErrorResponses(resumeOp)

	spec.Paths.Set("/campaigns/{campaignId}/resume", &openapi3.PathItem{
		Post: resumeOp,
	})
}

// addCancelCampaignPath adds the cancel campaign endpoint
func addCancelCampaignPath(spec *openapi3.T) {
	cancelOp := &openapi3.Operation{
		OperationID: "cancelCampaign",
		Summary:     "Cancel campaign",
		Description: "Cancels a campaign, setting it to cancelled status",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "campaignId",
					In:          "path",
					Required:    true,
					Description: "Campaign UUID",
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

	cancelOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Campaign cancelled successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/CampaignOperationResponse",
				},
			},
		},
	})

	addCampaignOperationErrorResponses(cancelOp)

	spec.Paths.Set("/campaigns/{campaignId}/cancel", &openapi3.PathItem{
		Post: cancelOp,
	})
}

// addDeleteCampaignPath adds the delete campaign endpoint
func addDeleteCampaignPath(spec *openapi3.T) {
	deleteOp := &openapi3.Operation{
		OperationID: "deleteCampaign",
		Summary:     "Delete campaign",
		Description: "Permanently deletes a campaign and all its associated data",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "campaignId",
					In:          "path",
					Required:    true,
					Description: "Campaign UUID",
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
		Description: &[]string{"Campaign deleted successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/CampaignOperationResponse",
				},
			},
		},
	})

	addCampaignOperationErrorResponses(deleteOp)

	if spec.Paths.Find("/campaigns/{campaignId}") == nil {
		spec.Paths.Set("/campaigns/{campaignId}", &openapi3.PathItem{})
	}
	spec.Paths.Find("/campaigns/{campaignId}").Delete = deleteOp
}

// addGetGeneratedDomainsPath adds the get generated domains endpoint
func addGetGeneratedDomainsPath(spec *openapi3.T) {
	getDomainsOp := &openapi3.Operation{
		OperationID: "getGeneratedDomains",
		Summary:     "Get generated domains",
		Description: "Gets generated domains for a domain generation campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "campaignId",
					In:          "path",
					Required:    true,
					Description: "Campaign UUID",
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
					Name:        "limit",
					In:          "query",
					Description: "Maximum number of domains to return",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Min:     &[]float64{1}[0],
							Default: 20,
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "cursor",
					In:          "query",
					Description: "Cursor for pagination (offset index)",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Min:     &[]float64{0}[0],
							Default: 0,
						},
					},
				},
			},
		},
	}

	getDomainsOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Generated domains retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/GeneratedDomainsResponse",
				},
			},
		},
	})

	getDomainsOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	getDomainsOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/campaigns/{campaignId}/results/generated-domains", &openapi3.PathItem{
		Get: getDomainsOp,
	})
}

// addGetDNSValidationResultsPath adds the get DNS validation results endpoint
func addGetDNSValidationResultsPath(spec *openapi3.T) {
	getDNSOp := &openapi3.Operation{
		OperationID: "getDNSValidationResults",
		Summary:     "Get DNS validation results",
		Description: "Gets DNS validation results for a DNS validation campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "campaignId",
					In:          "path",
					Required:    true,
					Description: "Campaign UUID",
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
					Name:        "limit",
					In:          "query",
					Description: "Maximum number of results to return",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Min:     &[]float64{1}[0],
							Default: 20,
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "cursor",
					In:          "query",
					Description: "Cursor for pagination",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"string"},
						},
					},
				},
			},
		},
	}

	getDNSOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"DNS validation results retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/DNSValidationResultsResponse",
				},
			},
		},
	})

	getDNSOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	getDNSOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/campaigns/{campaignId}/results/dns-validation", &openapi3.PathItem{
		Get: getDNSOp,
	})
}

// addGetHTTPKeywordResultsPath adds the get HTTP keyword results endpoint
func addGetHTTPKeywordResultsPath(spec *openapi3.T) {
	getHTTPOp := &openapi3.Operation{
		OperationID: "getHTTPKeywordResults",
		Summary:     "Get HTTP keyword results",
		Description: "Gets HTTP keyword validation results for an HTTP keyword validation campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: openapi3.Parameters{
			{
				Value: &openapi3.Parameter{
					Name:        "campaignId",
					In:          "path",
					Required:    true,
					Description: "Campaign UUID",
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
					Name:        "limit",
					In:          "query",
					Description: "Maximum number of results to return",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Min:     &[]float64{1}[0],
							Default: 20,
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "cursor",
					In:          "query",
					Description: "Cursor for pagination",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"string"},
						},
					},
				},
			},
		},
	}

	getHTTPOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"HTTP keyword results retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/HTTPKeywordResultsResponse",
				},
			},
		},
	})

	getHTTPOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	getHTTPOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/campaigns/{campaignId}/results/http-keyword", &openapi3.PathItem{
		Get: getHTTPOp,
	})
}

// addCampaignOperationErrorResponses adds common error responses for campaign operations
func addCampaignOperationErrorResponses(op *openapi3.Operation) {
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
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	op.AddResponse(409, &openapi3.Response{
		Description: &[]string{"Campaign is in an invalid state for this operation"}[0],
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

// addCampaignSchemas adds campaign-related schemas
func addCampaignSchemas(spec *openapi3.T) {
	// CreateCampaignRequest schema
	spec.Components.Schemas["CreateCampaignRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to create a new campaign",
			Required:    []string{"campaignType", "name"},
			Properties: map[string]*openapi3.SchemaRef{
				"campaignType": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{
							"domain_generation", "dns_validation", "http_keyword_validation",
						},
						Description: "Type of campaign to create",
					},
				},
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Campaign name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Campaign description",
					},
				},
				"userId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "User ID creating the campaign",
					},
				},
				"domainGenerationParams": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/DomainGenerationParams"},
						},
					},
				},
				"dnsValidationParams": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/DnsValidationParams"},
						},
					},
				},
				"httpKeywordParams": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/HttpKeywordParams"},
						},
					},
				},
			},
		},
	}

	// DomainGenerationParams schema
	spec.Components.Schemas["DomainGenerationParams"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Parameters for domain generation campaigns",
			Required:    []string{"patternType", "variableLength", "characterSet", "constantString", "tld"},
			Properties: map[string]*openapi3.SchemaRef{
				"patternType": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"prefix", "suffix", "both"},
						Description: "Pattern type for domain generation",
					},
				},
				"variableLength": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Description: "Length of variable portion",
					},
				},
				"characterSet": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Character set for generation",
					},
				},
				"constantString": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Constant string portion",
					},
				},
				"tld": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Top-level domain",
					},
				},
				"numDomainsToGenerate": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Number of domains to generate",
					},
				},
			},
		},
	}

	// DnsValidationParams schema
	spec.Components.Schemas["DnsValidationParams"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Parameters for DNS validation campaigns",
			Required:    []string{"sourceCampaignId", "personaIds"},
			Properties: map[string]*openapi3.SchemaRef{
				"sourceCampaignId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Source domain generation campaign ID",
					},
				},
				"personaIds": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type:   &openapi3.Types{"string"},
								Format: "uuid",
							},
						},
						MinItems:    uint64(1),
						Description: "DNS personas to use for validation",
					},
				},
				"rotationIntervalSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Persona rotation interval in seconds",
					},
				},
				"processingSpeedPerMinute": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Processing speed per minute",
					},
				},
				"batchSize": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Description: "Batch size for processing",
					},
				},
				"retryAttempts": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Number of retry attempts",
					},
				},
			},
		},
	}

	// HttpKeywordParams schema
	spec.Components.Schemas["HttpKeywordParams"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Parameters for HTTP keyword validation campaigns",
			Required:    []string{"sourceCampaignId", "personaIds"},
			Properties: map[string]*openapi3.SchemaRef{
				"sourceCampaignId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Source DNS validation campaign ID",
					},
				},
				"keywordSetIds": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type:   &openapi3.Types{"string"},
								Format: "uuid",
							},
						},
						Description: "Keyword set IDs to use for validation",
					},
				},
				"adHocKeywords": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type:      &openapi3.Types{"string"},
								MinLength: 1,
							},
						},
						Description: "Ad-hoc keywords for validation",
					},
				},
				"personaIds": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type:   &openapi3.Types{"string"},
								Format: "uuid",
							},
						},
						MinItems:    uint64(1),
						Description: "HTTP personas to use for validation",
					},
				},
				"proxyPoolId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Proxy pool ID for requests",
					},
				},
				"proxySelectionStrategy": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Strategy for proxy selection",
					},
				},
				"rotationIntervalSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Persona rotation interval in seconds",
					},
				},
				"processingSpeedPerMinute": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Processing speed per minute",
					},
				},
				"batchSize": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Description: "Batch size for processing",
					},
				},
				"retryAttempts": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Number of retry attempts",
					},
				},
				"targetHttpPorts": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type: &openapi3.Types{"integer"},
								Min:  &[]float64{1}[0],
								Max:  &[]float64{65535}[0],
							},
						},
						Description: "Target HTTP ports for validation",
					},
				},
			},
		},
	}

	// Campaign schema
	spec.Components.Schemas["Campaign"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Campaign information",
			Properties: map[string]*openapi3.SchemaRef{
				"id": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Campaign unique identifier",
					},
				},
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Campaign name",
					},
				},
				"campaignType": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{
							"domain_generation", "dns_validation", "http_keyword_validation",
						},
						Description: "Type of campaign",
					},
				},
				"status": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{
							"pending", "queued", "running", "pausing", "paused",
							"completed", "failed", "archived", "cancelled",
						},
						Description: "Campaign status",
					},
				},
				"userId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "User ID who created the campaign",
					},
				},
				"createdAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Campaign creation timestamp",
					},
				},
				"updatedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Campaign last update timestamp",
					},
				},
				"startedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Campaign start timestamp",
					},
				},
				"completedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Campaign completion timestamp",
					},
				},
				"progressPercentage": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"number"},
						Min:         &[]float64{0}[0],
						Max:         &[]float64{100}[0],
						Description: "Campaign progress percentage",
					},
				},
				"totalItems": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Total number of items to process",
					},
				},
				"processedItems": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Number of items processed",
					},
				},
				"successfulItems": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Number of successfully processed items",
					},
				},
				"failedItems": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{0}[0],
						Description: "Number of failed items",
					},
				},
				"errorMessage": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Error message if campaign failed",
					},
				},
				"metadata": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"object"},
						Description: "Additional campaign metadata",
					},
				},
				"estimatedCompletionAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Estimated completion timestamp",
					},
				},
				"avgProcessingRate": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"number"},
						Description: "Average processing rate",
					},
				},
				"lastHeartbeatAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Last heartbeat timestamp",
					},
				},
			},
		},
	}

	// Response schemas
	addResponseSchemas(spec)
}

// addResponseSchemas adds response-related schemas
func addResponseSchemas(spec *openapi3.T) {
	// CampaignDetailsResponse schema
	spec.Components.Schemas["CampaignDetailsResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Campaign details with type-specific parameters",
			Properties: map[string]*openapi3.SchemaRef{
				"campaign": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/Campaign"},
						},
					},
				},
				"params": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"object"},
						Description: "Type-specific campaign parameters",
					},
				},
			},
		},
	}

	// CampaignListResponse schema
	spec.Components.Schemas["CampaignListResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Response for campaign list with pagination metadata",
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
							Ref: "#/components/schemas/Campaign",
						},
					},
				},
				"metadata": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/PaginationMetadata"},
						},
					},
				},
			},
		},
	}
// CampaignOperationResponse schema
spec.Components.Schemas["CampaignOperationResponse"] = &openapi3.SchemaRef{
	Value: &openapi3.Schema{
		Type:        &openapi3.Types{"object"},
		Description: "Response for campaign operations",
		Properties: map[string]*openapi3.SchemaRef{
			"message": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Operation result message",
				},
			},
			"campaign_id": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "Campaign ID",
				},
			},
		},
	},
}

// GeneratedDomainsResponse schema
spec.Components.Schemas["GeneratedDomainsResponse"] = &openapi3.SchemaRef{
	Value: &openapi3.Schema{
		Type:        &openapi3.Types{"object"},
		Description: "Response for generated domains",
		Properties: map[string]*openapi3.SchemaRef{
			"data": {
				Value: &openapi3.Schema{
					Type: &openapi3.Types{"array"},
					Items: &openapi3.SchemaRef{
						Ref: "#/components/schemas/GeneratedDomain",
					},
				},
			},
			"nextCursor": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "Next cursor for pagination",
				},
			},
			"totalCount": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "Total number of generated domains",
				},
			},
		},
	},
}

// DNSValidationResultsResponse schema
spec.Components.Schemas["DNSValidationResultsResponse"] = &openapi3.SchemaRef{
	Value: &openapi3.Schema{
		Type:        &openapi3.Types{"object"},
		Description: "Response for DNS validation results",
		Properties: map[string]*openapi3.SchemaRef{
			"data": {
				Value: &openapi3.Schema{
					Type: &openapi3.Types{"array"},
					Items: &openapi3.SchemaRef{
						Ref: "#/components/schemas/DNSValidationResult",
					},
				},
			},
			"nextCursor": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Next cursor for pagination",
				},
			},
			"totalCount": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "Total number of DNS validation results",
				},
			},
		},
	},
}

// HTTPKeywordResultsResponse schema
spec.Components.Schemas["HTTPKeywordResultsResponse"] = &openapi3.SchemaRef{
	Value: &openapi3.Schema{
		Type:        &openapi3.Types{"object"},
		Description: "Response for HTTP keyword validation results",
		Properties: map[string]*openapi3.SchemaRef{
			"data": {
				Value: &openapi3.Schema{
					Type: &openapi3.Types{"array"},
					Items: &openapi3.SchemaRef{
						Ref: "#/components/schemas/HTTPKeywordResult",
					},
				},
			},
			"nextCursor": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Next cursor for pagination",
				},
			},
			"totalCount": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "Total number of HTTP keyword results",
				},
			},
		},
	},
}

// GeneratedDomain schema
spec.Components.Schemas["GeneratedDomain"] = &openapi3.SchemaRef{
	Value: &openapi3.Schema{
		Type:        &openapi3.Types{"object"},
		Description: "Generated domain information",
		Properties: map[string]*openapi3.SchemaRef{
			"id": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "Domain unique identifier",
				},
			},
			"generationCampaignId": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "Generation campaign ID",
				},
			},
			"domainName": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Generated domain name",
				},
			},
			"offsetIndex": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "Offset index in generation space",
				},
			},
			"generatedAt": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "date-time",
					Description: "Domain generation timestamp",
				},
			},
			"sourceKeyword": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Source keyword used for generation",
				},
			},
			"sourcePattern": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Source pattern used for generation",
				},
			},
			"tld": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Top-level domain",
				},
			},
			"createdAt": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "date-time",
					Description: "Record creation timestamp",
				},
			},
		},
	},
}

// DNSValidationResult schema
spec.Components.Schemas["DNSValidationResult"] = &openapi3.SchemaRef{
	Value: &openapi3.Schema{
		Type:        &openapi3.Types{"object"},
		Description: "DNS validation result information",
		Properties: map[string]*openapi3.SchemaRef{
			"id": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "Result unique identifier",
				},
			},
			"dnsCampaignId": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "DNS campaign ID",
				},
			},
			"generatedDomainId": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "Generated domain ID",
				},
			},
			"domainName": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Domain name validated",
				},
			},
			"validationStatus": {
				Value: &openapi3.Schema{
					Type: &openapi3.Types{"string"},
					Enum: []interface{}{
						"pending", "valid", "invalid", "error", "skipped",
					},
					Description: "Validation status",
				},
			},
			"businessStatus": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Business status",
				},
			},
			"dnsRecords": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"object"},
					Description: "DNS records found",
				},
			},
			"validatedByPersonaId": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "Persona used for validation",
				},
			},
			"attempts": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "Number of validation attempts",
				},
			},
			"lastCheckedAt": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "date-time",
					Description: "Last validation timestamp",
				},
			},
			"createdAt": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "date-time",
					Description: "Record creation timestamp",
				},
			},
		},
	},
}

// HTTPKeywordResult schema
spec.Components.Schemas["HTTPKeywordResult"] = &openapi3.SchemaRef{
	Value: &openapi3.Schema{
		Type:        &openapi3.Types{"object"},
		Description: "HTTP keyword validation result information",
		Properties: map[string]*openapi3.SchemaRef{
			"id": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "Result unique identifier",
				},
			},
			"httpKeywordCampaignId": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "HTTP keyword campaign ID",
				},
			},
			"dnsResultId": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "Associated DNS result ID",
				},
			},
			"domainName": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Domain name validated",
				},
			},
			"validationStatus": {
				Value: &openapi3.Schema{
					Type: &openapi3.Types{"string"},
					Enum: []interface{}{
						"pending", "valid", "invalid", "error", "skipped",
					},
					Description: "Validation status",
				},
			},
			"httpStatusCode": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "HTTP status code received",
				},
			},
			"responseHeaders": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"object"},
					Description: "HTTP response headers",
				},
			},
			"pageTitle": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Page title extracted",
				},
			},
			"extractedContentSnippet": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Content snippet extracted",
				},
			},
			"foundKeywordsFromSets": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"object"},
					Description: "Keywords found from keyword sets",
				},
			},
			"foundAdHocKeywords": {
				Value: &openapi3.Schema{
					Type: &openapi3.Types{"array"},
					Items: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"string"},
						},
					},
					Description: "Ad-hoc keywords found",
				},
			},
			"contentHash": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "Content hash for deduplication",
				},
			},
			"validatedByPersonaId": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "Persona used for validation",
				},
			},
			"usedProxyId": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "uuid",
					Description: "Proxy used for validation",
				},
			},
			"attempts": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "Number of validation attempts",
				},
			},
			"lastCheckedAt": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "date-time",
					Description: "Last validation timestamp",
				},
			},
			"createdAt": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "date-time",
					Description: "Record creation timestamp",
				},
			},
		},
	},
}

// PaginationMetadata schema
spec.Components.Schemas["PaginationMetadata"] = &openapi3.SchemaRef{
	Value: &openapi3.Schema{
		Type:        &openapi3.Types{"object"},
		Description: "Pagination metadata",
		Properties: map[string]*openapi3.SchemaRef{
			"page": {
				Value: &openapi3.Schema{
					OneOf: []*openapi3.SchemaRef{
						{Ref: "#/components/schemas/PageInfo"},
					},
				},
			},
		},
	},
}

// PageInfo schema
spec.Components.Schemas["PageInfo"] = &openapi3.SchemaRef{
	Value: &openapi3.Schema{
		Type:        &openapi3.Types{"object"},
		Description: "Page information for pagination",
		Properties: map[string]*openapi3.SchemaRef{
			"current": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "Current page number",
				},
			},
			"total": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "Total number of pages",
				},
			},
			"pageSize": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "Number of items per page",
				},
			},
			"count": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "Total number of items",
				},
			},
		},
	},
}
}
						