package campaigns

import (
	"reflect"
	
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/utils"
)

// AddCampaignPaths adds campaign-related paths to the OpenAPI specification
func AddCampaignPaths(spec *openapi3.T) {
	addCampaignSchemas(spec)
	addCreateCampaignPath(spec)
	addListCampaignsPath(spec)
	addGetCampaignDetailsPath(spec)
	addUpdateCampaignPath(spec)
	addStartCampaignPath(spec)
	addPauseCampaignPath(spec)
	addResumeCampaignPath(spec)
	addCancelCampaignPath(spec)
	addValidateDNSPath(spec)
	addValidateHTTPPath(spec)
	addDeleteCampaignPath(spec)
	addBulkDeleteCampaignsPath(spec)
	addGetGeneratedDomainsPath(spec)
	addGetDNSValidationResultsPath(spec)
	addGetHTTPKeywordResultsPath(spec)
	addDomainGenerationPatternOffsetPath(spec)
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

	if spec.Paths.Find("/campaigns") == nil {
		spec.Paths.Set("/campaigns", &openapi3.PathItem{})
	}
	spec.Paths.Find("/campaigns").Post = createOp
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

// addUpdateCampaignPath adds the update campaign endpoint
func addUpdateCampaignPath(spec *openapi3.T) {
	putOp := &openapi3.Operation{
		OperationID: "updateCampaign",
		Summary:     "Update campaign",
		Description: "Updates an existing campaign with new configuration",
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
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/UpdateCampaignRequest",
						},
					},
				},
			},
		},
	}

	putOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Campaign updated successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Campaign",
				},
			},
		},
	})

	putOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	putOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	putOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	// Update the existing path to include both GET and PUT operations
	existingPath := spec.Paths.Find("/campaigns/{campaignId}")
	if existingPath != nil {
		existingPath.Put = putOp
	} else {
		spec.Paths.Set("/campaigns/{campaignId}", &openapi3.PathItem{
			Put: putOp,
		})
	}
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

// addValidateDNSPath adds the domain-centric DNS validation endpoint
func addValidateDNSPath(spec *openapi3.T) {
	validateOp := &openapi3.Operation{
		OperationID: "validateDNSForCampaign",
		Summary:     "Validate DNS for campaign domains",
		Description: "Triggers domain-centric DNS validation for all domains in a completed domain generation campaign",
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

	validateOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"DNS validation started successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/CampaignOperationResponse",
				},
			},
		},
	})

	addCampaignOperationErrorResponses(validateOp)

	spec.Paths.Set("/campaigns/{campaignId}/validate-dns", &openapi3.PathItem{
		Post: validateOp,
	})
}

// addValidateHTTPPath adds the domain-centric HTTP keyword validation endpoint
func addValidateHTTPPath(spec *openapi3.T) {
	validateOp := &openapi3.Operation{
		OperationID: "validateHTTPForCampaign",
		Summary:     "Validate HTTP for campaign domains",
		Description: "Triggers domain-centric HTTP keyword validation for all domains in a completed DNS validation campaign",
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

	validateOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"HTTP keyword validation started successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/CampaignOperationResponse",
				},
			},
		},
	})

	addCampaignOperationErrorResponses(validateOp)

	spec.Paths.Set("/campaigns/{campaignId}/validate-http", &openapi3.PathItem{
		Post: validateOp,
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

// addBulkDeleteCampaignsPath adds the bulk delete campaigns endpoint
func addBulkDeleteCampaignsPath(spec *openapi3.T) {
	bulkDeleteOp := &openapi3.Operation{
		OperationID: "bulkDeleteCampaigns",
		Summary:     "Bulk delete campaigns",
		Description: "Permanently deletes multiple campaigns and all their associated data",
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
							Ref: "#/components/schemas/BulkDeleteRequest",
						},
					},
				},
			},
		},
	}

	bulkDeleteOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Campaigns bulk delete completed"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/BulkDeleteResponse",
				},
			},
		},
	})

	bulkDeleteOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	bulkDeleteOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	bulkDeleteOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	campaignsPath := spec.Paths.Find("/campaigns")
	if campaignsPath == nil {
		campaignsPath = &openapi3.PathItem{}
		spec.Paths.Set("/campaigns", campaignsPath)
	}
	campaignsPath.Delete = bulkDeleteOp
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

// addDomainGenerationPatternOffsetPath adds the domain generation pattern offset endpoint
func addDomainGenerationPatternOffsetPath(spec *openapi3.T) {
	patternOffsetOp := &openapi3.Operation{
		OperationID: "getDomainGenerationPatternOffset",
		Summary:     "Get domain generation pattern offset",
		Description: "Gets the current offset for a domain generation pattern to prevent duplicate domains across campaigns",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required:    true,
				Description: "Pattern configuration",
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/PatternOffsetRequest",
						},
					},
				},
			},
		},
	}

	patternOffsetOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Current offset for the pattern"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"object"},
						Properties: map[string]*openapi3.SchemaRef{
							"currentOffset": {
								Value: &openapi3.Schema{
									Type:        &openapi3.Types{"integer"},
									Format:      "int64",
									Description: "Current global offset for this pattern signature",
								},
							},
						},
						Required: []string{"currentOffset"},
					},
				},
			},
		},
	})

	patternOffsetOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Invalid request parameters"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	patternOffsetOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	patternOffsetOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/campaigns/domain-generation/pattern-offset", &openapi3.PathItem{
		Post: patternOffsetOp,
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

	// BulkDeleteRequest schema
	spec.Components.Schemas["BulkDeleteRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to bulk delete campaigns",
			Required:    []string{"campaignIds"},
			Properties: map[string]*openapi3.SchemaRef{
				"campaignIds": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type:   &openapi3.Types{"string"},
								Format: "uuid",
							},
						},
						MinItems:    uint64(1),
						Description: "Array of campaign UUIDs to delete",
					},
				},
			},
		},
	}

	// BulkDeleteResponse schema
	spec.Components.Schemas["BulkDeleteResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Response for bulk delete operation",
			Properties: map[string]*openapi3.SchemaRef{
				"message": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Operation result message",
					},
				},
				"totalRequested": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Total number of campaigns requested for deletion",
					},
				},
				"successfulDeletions": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of campaigns successfully deleted",
					},
				},
				"failedDeletions": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of campaigns that failed to delete",
					},
				},
				"errors": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type:        &openapi3.Types{"string"},
								Description: "Error message for failed deletions",
							},
						},
						Description: "List of error messages for failed deletions",
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
						Enum: []interface{}{"prefix_variable", "suffix_variable", "both_variable"},
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

	// PatternOffsetRequest schema for domain generation pattern offset endpoint
	spec.Components.Schemas["PatternOffsetRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to get the current offset for a domain generation pattern",
			Required:    []string{"patternType", "variableLength", "characterSet", "constantString", "tld"},
			Properties: map[string]*openapi3.SchemaRef{
				"patternType": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"prefix", "suffix", "both"},
						Description: "Type of pattern (prefix, suffix, or both)",
					},
				},
				"variableLength": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Min:         &[]float64{1}[0],
						Description: "Length of the variable part",
					},
				},
				"characterSet": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Character set for domain generation (e.g., 'abc', '123')",
					},
				},
				"constantString": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Constant string part of the domain",
					},
				},
				"tld": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Top-level domain (e.g., '.com', '.net')",
					},
				},
			},
		},
	}

	// Auto-generate Campaign schema from Go struct
	utils.AddStructSchema(spec, reflect.TypeOf(models.Campaign{}), "Campaign")

	// Add core entity schemas
	addCoreEntitySchemas(spec)
	
	// Add configuration detail schemas
	addConfigurationSchemas(spec)
	
	// UpdateCampaignRequest schema
	spec.Components.Schemas["UpdateCampaignRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to update an existing campaign",
			Properties: map[string]*openapi3.SchemaRef{
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
						Description: "Campaign type for phase transitions",
					},
				},
				"status": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Campaign status",
						Enum: []interface{}{
							"pending", "queued", "running", "paused", "completed", "failed", "cancelled", "archived",
						},
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
						Description: "Keyword set IDs",
					},
				},
				"adHocKeywords": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type: &openapi3.Types{"string"},
							},
						},
						Description: "Ad-hoc keywords",
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
						Description: "Persona IDs",
					},
				},
				"proxyPoolId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Proxy pool ID",
					},
				},
				"processingSpeedPerMinute": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Processing speed per minute",
						Min:         &[]float64{1}[0],
					},
				},
				"batchSize": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Batch size for processing",
						Min:         &[]float64{1}[0],
					},
				},
				"retryAttempts": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of retry attempts",
						Min:         &[]float64{0}[0],
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
						Description: "Target HTTP ports",
					},
				},
			},
		},
	}

	// Add enum schemas
	addEnumSchemas(spec)
	
	// Response schemas
	addResponseSchemas(spec)
}

// addCoreEntitySchemas adds core entity schemas (Persona, Proxy, KeywordSet, etc.)
func addCoreEntitySchemas(spec *openapi3.T) {
	// Persona schema
	spec.Components.Schemas["Persona"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "DNS or HTTP persona configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"id": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Persona unique identifier",
					},
				},
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
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
						Type:        &openapi3.Types{"object"},
						Description: "Persona configuration details",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether persona is enabled",
					},
				},
				"status": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"Active", "Disabled", "Testing", "Failed"},
						Description: "Persona status",
					},
				},
				"lastTested": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Last test timestamp",
					},
				},
				"lastError": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Last error message",
					},
				},
				"tags": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type: &openapi3.Types{"string"},
							},
						},
						Description: "Persona tags",
					},
				},
				"createdAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Creation timestamp",
					},
				},
				"updatedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Last update timestamp",
					},
				},
			},
		},
	}

	// Proxy schema
	spec.Components.Schemas["Proxy"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Proxy server configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"id": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Proxy unique identifier",
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
				"address": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Full proxy address",
					},
				},
				"protocol": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"http", "https", "socks5", "socks4"},
						Description: "Proxy protocol",
					},
				},
				"host": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy hostname or IP",
					},
				},
				"port": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Proxy port number",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether proxy is enabled",
					},
				},
				"isHealthy": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether proxy is healthy",
					},
				},
				"status": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"Active", "Disabled", "Testing", "Failed"},
						Description: "Proxy status",
					},
				},
				"lastStatus": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Last known status",
					},
				},
				"lastCheckedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Last health check timestamp",
					},
				},
				"latencyMs": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Last measured latency in milliseconds",
					},
				},
				"city": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy city location",
					},
				},
				"countryCode": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy country code",
					},
				},
				"provider": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy provider",
					},
				},
				"notes": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Proxy notes or comments",
					},
				},
				"successCount": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Count of successful operations",
					},
				},
				"failureCount": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Count of failed operations",
					},
				},
				"lastTested": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Last test timestamp",
					},
				},
				"lastError": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Last error message",
					},
				},
				"createdAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Creation timestamp",
					},
				},
				"updatedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Last update timestamp",
					},
				},
			},
		},
	}

	// KeywordSet schema
	spec.Components.Schemas["KeywordSet"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Collection of keyword rules",
			Properties: map[string]*openapi3.SchemaRef{
				"id": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "KeywordSet unique identifier",
					},
				},
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "KeywordSet name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "KeywordSet description",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether keyword set is enabled",
					},
				},
				"rules": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/KeywordRule",
						},
						Description: "Keyword rules in this set",
					},
				},
				"createdAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Creation timestamp",
					},
				},
				"updatedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Last update timestamp",
					},
				},
			},
		},
	}

	// KeywordRule schema
	spec.Components.Schemas["KeywordRule"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Specific rule within a KeywordSet",
			Properties: map[string]*openapi3.SchemaRef{
				"id": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "KeywordRule unique identifier",
					},
				},
				"keywordSetId": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "Parent KeywordSet ID",
					},
				},
				"pattern": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Keyword pattern",
					},
				},
				"ruleType": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"string", "regex"},
						Description: "Type of keyword rule",
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
						Description: "Rule category",
					},
				},
				"contextChars": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of context characters to capture",
					},
				},
				"createdAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Creation timestamp",
					},
				},
				"updatedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Last update timestamp",
					},
				},
			},
		},
	}

	// ProxyPool schema
	spec.Components.Schemas["ProxyPool"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Proxy pool configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"id": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "uuid",
						Description: "ProxyPool unique identifier",
					},
				},
				"name": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "ProxyPool name",
					},
				},
				"description": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "ProxyPool description",
					},
				},
				"isEnabled": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether proxy pool is enabled",
					},
				},
				"poolStrategy": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"round_robin", "random", "weighted", "failover"},
						Description: "Proxy selection strategy",
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
						Description: "Proxies in this pool",
					},
				},
				"createdAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Creation timestamp",
					},
				},
				"updatedAt": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Format:      "date-time",
						Description: "Last update timestamp",
					},
				},
			},
		},
	}
}

// addConfigurationSchemas adds configuration detail schemas
func addConfigurationSchemas(spec *openapi3.T) {
	// DNSConfigDetails schema
	spec.Components.Schemas["DNSConfigDetails"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "DNS persona configuration details",
			Properties: map[string]*openapi3.SchemaRef{
				"resolvers": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type: &openapi3.Types{"string"},
							},
						},
						Description: "DNS resolver addresses",
					},
				},
				"useSystemResolvers": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether to use system resolvers",
					},
				},
				"queryTimeoutSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Query timeout in seconds",
					},
				},
				"maxDomainsPerRequest": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum domains per request",
					},
				},
				"resolverStrategy": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"round_robin", "random", "weighted", "priority"},
						Description: "Resolver selection strategy",
					},
				},
				"concurrentQueriesPerDomain": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Concurrent queries per domain",
					},
				},
				"queryDelayMinMs": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Minimum query delay in milliseconds",
					},
				},
				"queryDelayMaxMs": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum query delay in milliseconds",
					},
				},
				"maxConcurrentGoroutines": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum concurrent goroutines",
					},
				},
				"rateLimitDps": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"number"},
						Description: "Rate limit in domains per second",
					},
				},
				"rateLimitBurst": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Rate limit burst size",
					},
				},
			},
		},
	}

	// HTTPConfigDetails schema
	spec.Components.Schemas["HTTPConfigDetails"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "HTTP persona configuration details",
			Properties: map[string]*openapi3.SchemaRef{
				"userAgent": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "User agent string",
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
						Description: "HTTP headers",
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
				"cookieHandling": {
					Value: &openapi3.Schema{
						OneOf: []*openapi3.SchemaRef{
							{Ref: "#/components/schemas/HTTPCookieHandling"},
						},
					},
				},
				"requestTimeoutSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Request timeout in seconds",
					},
				},
				"followRedirects": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether to follow redirects",
					},
				},
				"allowedStatusCodes": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type: &openapi3.Types{"integer"},
							},
						},
						Description: "Allowed HTTP status codes",
					},
				},
				"rateLimitDps": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"number"},
						Description: "Rate limit in requests per second",
					},
				},
				"rateLimitBurst": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Rate limit burst size",
					},
				},
				"notes": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Configuration notes",
					},
				},
			},
		},
	}

	// HTTPCookieHandling schema
	spec.Components.Schemas["HTTPCookieHandling"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "HTTP cookie handling configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"mode": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
						Enum: []interface{}{"preserve", "ignore", "custom"},
						Description: "Cookie handling mode",
					},
				},
			},
		},
	}
}

// addEnumSchemas adds enum-related schemas
func addEnumSchemas(spec *openapi3.T) {
	// No additional enum schemas needed as they're inline in the entity schemas
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
			"dnsStatus": {
				Value: &openapi3.Schema{
					Type: &openapi3.Types{"string"},
					Enum: []interface{}{
						"pending", "ok", "error", "timeout",
					},
					Description: "DNS validation status",
				},
			},
			"dnsIp": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "DNS resolved IP address",
				},
			},
			"httpStatus": {
				Value: &openapi3.Schema{
					Type: &openapi3.Types{"string"},
					Enum: []interface{}{
						"pending", "ok", "error", "timeout",
					},
					Description: "HTTP validation status",
				},
			},
			"httpStatusCode": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"integer"},
					Description: "HTTP response status code",
				},
			},
			"httpTitle": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "HTTP page title",
				},
			},
			"httpKeywords": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Description: "HTTP keywords found",
				},
			},
			"leadScore": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"number"},
					Description: "Lead quality score",
				},
			},
			"lastValidatedAt": {
				Value: &openapi3.Schema{
					Type:        &openapi3.Types{"string"},
					Format:      "date-time",
					Description: "Last validation timestamp",
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
						