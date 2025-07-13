package campaigns

import (
	"reflect"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/utils"
	"github.com/getkin/kin-openapi/openapi3"
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

	spec.Paths.Set("/api/campaigns", &openapi3.PathItem{
		Post: createOp,
	})
}

// addListCampaignsPath adds the list campaigns endpoint
func addListCampaignsPath(spec *openapi3.T) {
	listOp := &openapi3.Operation{
		OperationID: "listCampaigns",
		Summary:     "List campaigns",
		Description: "Retrieves a paginated list of campaigns with optional filtering",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "page",
					In:          "query",
					Description: "Page number (1-based)",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Default: 1,
							Min: &[]float64{1}[0],
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "limit",
					In:          "query",
					Description: "Number of items per page",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Default: 20,
							Min: &[]float64{1}[0],
							Max: &[]float64{100}[0],
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "campaignType",
					In:          "query",
					Description: "Filter by campaign type",
					Schema: &openapi3.SchemaRef{
						Ref: "#/components/schemas/CampaignTypeEnum",
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "status",
					In:          "query",
					Description: "Filter by campaign status",
					Schema: &openapi3.SchemaRef{
						Ref: "#/components/schemas/CampaignStatusEnum",
					},
				},
			},
		},
	}

	listOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"List of campaigns"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/CampaignListResponse",
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

	// Get existing path item or create new one
	pathItem := spec.Paths.Find("/api/campaigns")
	if pathItem == nil {
		pathItem = &openapi3.PathItem{}
		spec.Paths.Set("/api/campaigns", pathItem)
	}
	pathItem.Get = listOp
}

// addGetCampaignDetailsPath adds the get campaign details endpoint
func addGetCampaignDetailsPath(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getCampaignDetails",
		Summary:     "Get campaign details",
		Description: "Retrieves detailed information about a specific campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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
		Description: &[]string{"Campaign details"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Campaign",
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

	spec.Paths.Set("/api/campaigns/{id}", &openapi3.PathItem{
		Get: getOp,
	})
}

// addUpdateCampaignPath adds the update campaign endpoint
func addUpdateCampaignPath(spec *openapi3.T) {
	updateOp := &openapi3.Operation{
		OperationID: "updateCampaign",
		Summary:     "Update campaign",
		Description: "Updates campaign details and configuration",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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

	updateOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Campaign updated successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Campaign",
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

	updateOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
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

	// Get existing path item or create new one
	pathItem := spec.Paths.Find("/api/campaigns/{id}")
	if pathItem == nil {
		pathItem = &openapi3.PathItem{}
		spec.Paths.Set("/api/campaigns/{id}", pathItem)
	}
	pathItem.Put = updateOp
}

// addStartCampaignPath adds the start campaign endpoint
func addStartCampaignPath(spec *openapi3.T) {
	startOp := &openapi3.Operation{
		OperationID: "startCampaign",
		Summary:     "Start campaign",
		Description: "Starts a campaign execution",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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
		Description: &[]string{"Campaign started successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Campaign",
				},
			},
		},
	})

	startOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request - campaign cannot be started"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	startOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	startOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	startOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/api/campaigns/{id}/start", &openapi3.PathItem{
		Post: startOp,
	})
}

// addPauseCampaignPath adds the pause campaign endpoint
func addPauseCampaignPath(spec *openapi3.T) {
	pauseOp := &openapi3.Operation{
		OperationID: "pauseCampaign",
		Summary:     "Pause campaign",
		Description: "Pauses a running campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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
					Ref: "#/components/schemas/Campaign",
				},
			},
		},
	})

	pauseOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request - campaign cannot be paused"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	pauseOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	pauseOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	pauseOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/api/campaigns/{id}/pause", &openapi3.PathItem{
		Post: pauseOp,
	})
}

// addResumeCampaignPath adds the resume campaign endpoint
func addResumeCampaignPath(spec *openapi3.T) {
	resumeOp := &openapi3.Operation{
		OperationID: "resumeCampaign",
		Summary:     "Resume campaign",
		Description: "Resumes a paused campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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
					Ref: "#/components/schemas/Campaign",
				},
			},
		},
	})

	resumeOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request - campaign cannot be resumed"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	resumeOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	resumeOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	resumeOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/api/campaigns/{id}/resume", &openapi3.PathItem{
		Post: resumeOp,
	})
}

// addCancelCampaignPath adds the cancel campaign endpoint
func addCancelCampaignPath(spec *openapi3.T) {
	cancelOp := &openapi3.Operation{
		OperationID: "cancelCampaign",
		Summary:     "Cancel campaign",
		Description: "Cancels a campaign execution",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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
					Ref: "#/components/schemas/Campaign",
				},
			},
		},
	})

	cancelOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request - campaign cannot be cancelled"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	cancelOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	cancelOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	cancelOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/api/campaigns/{id}/cancel", &openapi3.PathItem{
		Post: cancelOp,
	})
}

// addValidateDNSPath adds the DNS validation endpoint
func addValidateDNSPath(spec *openapi3.T) {
	validateOp := &openapi3.Operation{
		OperationID: "validateDNSForCampaign",
		Summary:     "Validate DNS for campaign domains",
		Description: "Starts DNS validation for a domain generation campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "campaignId",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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
							Ref: "#/components/schemas/InPlaceDNSValidationRequest",
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
					Ref: "#/components/schemas/Campaign",
				},
			},
		},
	})

	validateOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	validateOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	validateOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	validateOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/campaigns/{campaignId}/validate-dns", &openapi3.PathItem{
		Post: validateOp,
	})
}

// addValidateHTTPPath adds the HTTP validation endpoint
func addValidateHTTPPath(spec *openapi3.T) {
	validateOp := &openapi3.Operation{
		OperationID: "validateHTTPForCampaign",
		Summary:     "Validate HTTP for campaign domains",
		Description: "Starts HTTP validation for a campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "campaignId",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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
							Ref: "#/components/schemas/CreateHTTPKeywordCampaignRequest",
						},
					},
				},
			},
		},
	}

	validateOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"HTTP validation started successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/Campaign",
				},
			},
		},
	})

	validateOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	validateOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	validateOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	validateOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/campaigns/{campaignId}/validate-http", &openapi3.PathItem{
		Post: validateOp,
	})
}

// addDeleteCampaignPath adds the delete campaign endpoint
func addDeleteCampaignPath(spec *openapi3.T) {
	deleteOp := &openapi3.Operation{
		OperationID: "deleteCampaign",
		Summary:     "Delete campaign",
		Description: "Deletes a campaign and all associated data",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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
		Description: &[]string{"Campaign deleted successfully"}[0],
	})

	deleteOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	deleteOp.AddResponse(409, &openapi3.Response{
		Description: &[]string{"Conflict - campaign has dependencies"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/CampaignDependencyInfo",
				},
			},
		},
	})

	deleteOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	deleteOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	// Get existing path item or create new one
	pathItem := spec.Paths.Find("/api/campaigns/{id}")
	if pathItem == nil {
		pathItem = &openapi3.PathItem{}
		spec.Paths.Set("/api/campaigns/{id}", pathItem)
	}
	pathItem.Delete = deleteOp
}

// addBulkDeleteCampaignsPath adds the bulk delete campaigns endpoint
func addBulkDeleteCampaignsPath(spec *openapi3.T) {
	bulkDeleteOp := &openapi3.Operation{
		OperationID: "bulkDeleteCampaigns",
		Summary:     "Bulk delete campaigns",
		Description: "Deletes multiple campaigns and all associated data",
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
		Description: &[]string{"Bulk delete completed"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/BulkDeleteResult",
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

	spec.Paths.Set("/api/campaigns/bulk-delete", &openapi3.PathItem{
		Post: bulkDeleteOp,
	})
}

// addGetGeneratedDomainsPath adds the get generated domains endpoint
func addGetGeneratedDomainsPath(spec *openapi3.T) {
	getDomainsOp := &openapi3.Operation{
		OperationID: "getGeneratedDomains",
		Summary:     "Get generated domains",
		Description: "Retrieves the list of generated domains for a campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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
					Name:        "page",
					In:          "query",
					Description: "Page number (1-based)",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Default: 1,
							Min: &[]float64{1}[0],
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "limit",
					In:          "query",
					Description: "Number of items per page",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Default: 100,
							Min: &[]float64{1}[0],
							Max: &[]float64{1000}[0],
						},
					},
				},
			},
		},
	}

	getDomainsOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"List of generated domains"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/GeneratedDomainsResponse",
				},
			},
		},
	})

	getDomainsOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	getDomainsOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
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

	spec.Paths.Set("/api/campaigns/{id}/domains", &openapi3.PathItem{
		Get: getDomainsOp,
	})
}

// addGetDNSValidationResultsPath adds the DNS validation results endpoint
func addGetDNSValidationResultsPath(spec *openapi3.T) {
	getResultsOp := &openapi3.Operation{
		OperationID: "getDNSValidationResults",
		Summary:     "Get DNS validation results",
		Description: "Retrieves DNS validation results for a campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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
					Name:        "page",
					In:          "query",
					Description: "Page number (1-based)",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Default: 1,
							Min: &[]float64{1}[0],
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "limit",
					In:          "query",
					Description: "Number of items per page",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Default: 100,
							Min: &[]float64{1}[0],
							Max: &[]float64{1000}[0],
						},
					},
				},
			},
		},
	}

	getResultsOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"DNS validation results"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/DNSValidationResultsResponse",
				},
			},
		},
	})

	getResultsOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	getResultsOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	getResultsOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/api/campaigns/{id}/dns-results", &openapi3.PathItem{
		Get: getResultsOp,
	})
}

// addGetHTTPKeywordResultsPath adds the HTTP keyword results endpoint
func addGetHTTPKeywordResultsPath(spec *openapi3.T) {
	getResultsOp := &openapi3.Operation{
		OperationID: "getHTTPKeywordResults",
		Summary:     "Get HTTP keyword results",
		Description: "Retrieves HTTP keyword validation results for a campaign",
		Tags:        []string{"Campaigns"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		Parameters: []*openapi3.ParameterRef{
			{
				Value: &openapi3.Parameter{
					Name:        "id",
					In:          "path",
					Required:    true,
					Description: "Campaign ID",
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
					Name:        "page",
					In:          "query",
					Description: "Page number (1-based)",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Default: 1,
							Min: &[]float64{1}[0],
						},
					},
				},
			},
			{
				Value: &openapi3.Parameter{
					Name:        "limit",
					In:          "query",
					Description: "Number of items per page",
					Schema: &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type:    &openapi3.Types{"integer"},
							Default: 100,
							Min: &[]float64{1}[0],
							Max: &[]float64{1000}[0],
						},
					},
				},
			},
		},
	}

	getResultsOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"HTTP keyword results"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/HTTPKeywordResultsResponse",
				},
			},
		},
	})

	getResultsOp.AddResponse(404, &openapi3.Response{
		Description: &[]string{"Campaign not found"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	getResultsOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	getResultsOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/api/campaigns/{id}/http-results", &openapi3.PathItem{
		Get: getResultsOp,
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
		Description: &[]string{"Bad request"}[0],
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

// addCampaignSchemas adds all campaign-related schemas using auto-generation
func addCampaignSchemas(spec *openapi3.T) {
	// Auto-generate main entity schemas from Go structs
	utils.AddStructSchema(spec, reflect.TypeOf(models.Campaign{}), "Campaign")
	utils.AddStructSchema(spec, reflect.TypeOf(services.CreateCampaignRequest{}), "CreateCampaignRequest")
	utils.AddStructSchema(spec, reflect.TypeOf(services.UpdateCampaignRequest{}), "UpdateCampaignRequest")

	// Auto-generate parameter schemas from Go structs
	utils.AddStructSchema(spec, reflect.TypeOf(services.DomainGenerationParams{}), "DomainGenerationParams")
	utils.AddStructSchema(spec, reflect.TypeOf(services.DnsValidationParams{}), "DnsValidationParams")
	utils.AddStructSchema(spec, reflect.TypeOf(services.HttpKeywordParams{}), "HttpKeywordParams")

	// Auto-generate request schemas from Go structs
	utils.AddStructSchema(spec, reflect.TypeOf(services.CreateDomainGenerationCampaignRequest{}), "CreateDomainGenerationCampaignRequest")
	utils.AddStructSchema(spec, reflect.TypeOf(services.CreateDNSValidationCampaignRequest{}), "CreateDNSValidationCampaignRequest")
	utils.AddStructSchema(spec, reflect.TypeOf(services.CreateHTTPKeywordCampaignRequest{}), "CreateHTTPKeywordCampaignRequest")
	utils.AddStructSchema(spec, reflect.TypeOf(services.InPlaceDNSValidationRequest{}), "InPlaceDNSValidationRequest")

	// Auto-generate core entity schemas from Go structs
	utils.AddStructSchema(spec, reflect.TypeOf(models.Persona{}), "Persona")
	utils.AddStructSchema(spec, reflect.TypeOf(models.Proxy{}), "Proxy")
	utils.AddStructSchema(spec, reflect.TypeOf(models.KeywordSet{}), "KeywordSet")
	utils.AddStructSchema(spec, reflect.TypeOf(models.KeywordRule{}), "KeywordRule")
	utils.AddStructSchema(spec, reflect.TypeOf(models.ProxyPool{}), "ProxyPool")
	utils.AddStructSchema(spec, reflect.TypeOf(models.ProxyPoolMembership{}), "ProxyPoolMembership")

	// Auto-generate campaign parameter schemas from Go structs
	utils.AddStructSchema(spec, reflect.TypeOf(models.DomainGenerationCampaignParams{}), "DomainGenerationCampaignParams")
	utils.AddStructSchema(spec, reflect.TypeOf(models.DNSValidationCampaignParams{}), "DNSValidationCampaignParams")
	utils.AddStructSchema(spec, reflect.TypeOf(models.HTTPKeywordCampaignParams{}), "HTTPKeywordCampaignParams")

	// Auto-generate result and dependency schemas from Go structs
	utils.AddStructSchema(spec, reflect.TypeOf(services.BulkDeleteResult{}), "BulkDeleteResult")
	utils.AddStructSchema(spec, reflect.TypeOf(services.CampaignDependencyInfo{}), "CampaignDependencyInfo")

	// Auto-generate enum schemas from Go structs
	utils.AddStructSchema(spec, reflect.TypeOf(models.CampaignTypeEnum("")), "CampaignTypeEnum")
	utils.AddStructSchema(spec, reflect.TypeOf(models.CampaignStatusEnum("")), "CampaignStatusEnum")
	utils.AddStructSchema(spec, reflect.TypeOf(models.CampaignPhaseEnum("")), "CampaignPhaseEnum")
	utils.AddStructSchema(spec, reflect.TypeOf(models.CampaignPhaseStatusEnum("")), "CampaignPhaseStatusEnum")
	utils.AddStructSchema(spec, reflect.TypeOf(models.PersonaTypeEnum("")), "PersonaTypeEnum")
	utils.AddStructSchema(spec, reflect.TypeOf(models.PersonaStatusEnum("")), "PersonaStatusEnum")
	utils.AddStructSchema(spec, reflect.TypeOf(models.KeywordRuleTypeEnum("")), "KeywordRuleTypeEnum")

	// Add remaining manually defined schemas that don't have Go struct equivalents
	addManualSchemas(spec)
}

// addManualSchemas adds schemas that cannot be auto-generated
func addManualSchemas(spec *openapi3.T) {
	// BulkDeleteRequest schema (request-only, no corresponding Go struct)
	spec.Components.Schemas["BulkDeleteRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to delete multiple campaigns",
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
						Description: "List of campaign IDs to delete",
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
						Type:        &openapi3.Types{"string"},
						Description: "Type of pattern (prefix, suffix, or both)",
						Enum:        []interface{}{"prefix", "suffix", "both"},
					},
				},
				"variableLength": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Length of the variable part",
						Min:         &[]float64{1}[0],
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

	// UpdatePatternOffsetRequest schema (request-only, no corresponding Go struct)
	spec.Components.Schemas["UpdatePatternOffsetRequest"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Request to update domain generation pattern offset",
			Required:    []string{"offset"},
			Properties: map[string]*openapi3.SchemaRef{
				"offset": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Format:      "int64",
						Description: "New pattern offset value",
						Min:     &[]float64{0}[0],
					},
				},
			},
		},
	}

	// CampaignListResponse schema (response wrapper)
	spec.Components.Schemas["CampaignListResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Paginated list of campaigns",
			Required:    []string{"campaigns", "total", "page", "limit"},
			Properties: map[string]*openapi3.SchemaRef{
				"campaigns": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/Campaign",
						},
						Description: "List of campaigns",
					},
				},
				"total": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Total number of campaigns",
					},
				},
				"page": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Current page number",
					},
				},
				"limit": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of items per page",
					},
				},
			},
		},
	}

	// GeneratedDomainsResponse schema (response wrapper)
	spec.Components.Schemas["GeneratedDomainsResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Paginated list of generated domains",
			Required:    []string{"domains", "total", "page", "limit"},
			Properties: map[string]*openapi3.SchemaRef{
				"domains": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/GeneratedDomain",
						},
						Description: "List of generated domains",
					},
				},
				"total": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Total number of domains",
					},
				},
				"page": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Current page number",
					},
				},
				"limit": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of items per page",
					},
				},
			},
		},
	}

	// DNSValidationResultsResponse schema (response wrapper)
	spec.Components.Schemas["DNSValidationResultsResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Paginated list of DNS validation results",
			Required:    []string{"results", "total", "page", "limit"},
			Properties: map[string]*openapi3.SchemaRef{
				"results": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/DNSValidationResult",
						},
						Description: "List of DNS validation results",
					},
				},
				"total": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Total number of results",
					},
				},
				"page": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Current page number",
					},
				},
				"limit": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of items per page",
					},
				},
			},
		},
	}

	// HTTPKeywordResultsResponse schema (response wrapper)
	spec.Components.Schemas["HTTPKeywordResultsResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Paginated list of HTTP keyword results",
			Required:    []string{"results", "total", "page", "limit"},
			Properties: map[string]*openapi3.SchemaRef{
				"results": {
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"array"},
						Items: &openapi3.SchemaRef{
							Ref: "#/components/schemas/HTTPKeywordResult",
						},
						Description: "List of HTTP keyword results",
					},
				},
				"total": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Total number of results",
					},
				},
				"page": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Current page number",
					},
				},
				"limit": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of items per page",
					},
				},
			},
		},
	}

	// ErrorResponse schema (standard error response)
	spec.Components.Schemas["ErrorResponse"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Standard error response",
			Required:    []string{"error"},
			Properties: map[string]*openapi3.SchemaRef{
				"error": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Error message",
					},
				},
				"details": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Additional error details",
					},
				},
			},
		},
	}

	// Auto-generate remaining result schemas from Go structs if they exist
	// These might be defined in the models package
	utils.AddStructSchema(spec, reflect.TypeOf(models.GeneratedDomain{}), "GeneratedDomain")
	utils.AddStructSchema(spec, reflect.TypeOf(models.DNSValidationResult{}), "DNSValidationResult")
	utils.AddStructSchema(spec, reflect.TypeOf(models.HTTPKeywordResult{}), "HTTPKeywordResult")
}