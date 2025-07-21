// File: backend/internal/api/campaign_orchestrator_handlers.go
package api

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/domainexpert"
	"github.com/fntelecomllc/studio/backend/internal/middleware"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/websocket"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CampaignOrchestratorAPIHandler holds dependencies for campaign orchestration API endpoints.
type CampaignOrchestratorAPIHandler struct {
	orchestratorService services.CampaignOrchestratorService
	dnsService          services.DNSCampaignService         // DNS validation service
	httpKeywordSvc      services.HTTPKeywordCampaignService // Domain-centric HTTP validation
	campaignStore       store.CampaignStore                 // Direct access needed for pattern offset queries
	broadcaster         websocket.Broadcaster               // WebSocket broadcaster for real-time updates
}

// NewCampaignOrchestratorAPIHandler creates a new handler for campaign orchestration.
func NewCampaignOrchestratorAPIHandler(orchService services.CampaignOrchestratorService, dnsService services.DNSCampaignService, httpKeywordSvc services.HTTPKeywordCampaignService, campaignStore store.CampaignStore, broadcaster websocket.Broadcaster) *CampaignOrchestratorAPIHandler {
	return &CampaignOrchestratorAPIHandler{
		orchestratorService: orchService,
		dnsService:          dnsService,
		httpKeywordSvc:      httpKeywordSvc,
		campaignStore:       campaignStore,
		broadcaster:         broadcaster,
	}
}

// Helper functions for phases-based campaign responses
func getPhaseStatusString(campaign *models.Campaign) string {
	if campaign.PhaseStatus != nil {
		return string(*campaign.PhaseStatus)
	}
	return "not_started"
}

func getTotalItemsCount(campaign *models.Campaign) int {
	if campaign.TotalItems != nil {
		return int(*campaign.TotalItems)
	}
	return 0
}

func getCurrentPhaseString(campaign *models.Campaign) string {
	if campaign.CurrentPhase != nil {
		return string(*campaign.CurrentPhase)
	}
	return "setup"
}

// RegisterCampaignOrchestrationRoutes registers all campaign orchestration related routes.
// It requires a base group and auth middleware instance for session-based access control.
//
// CAMPAIGN CREATION ENDPOINT:
//
// POST /campaigns - Unified endpoint using CreateCampaignRequest payload
// - Supports all campaign types through a single, consistent interface
// - Uses discriminated union based on "campaignType" field
// - Provides comprehensive validation and error handling
// - All legacy type-specific endpoints have been removed in favor of this unified approach
func (h *CampaignOrchestratorAPIHandler) RegisterCampaignOrchestrationRoutes(group *gin.RouterGroup, authMiddleware *middleware.CachedAuthMiddleware) {
	// === CAMPAIGN CREATION ENDPOINTS ===

	// Campaign creation endpoint - session-based auth
	group.POST("", h.createCampaign)

	// Campaign reading routes - session-based auth
	group.GET("", h.listCampaigns)
	group.GET("/:campaignId", h.getCampaignDetails)
	// group.GET("/:campaignId/status", h.getCampaignStatus)

	// Campaign control routes - session-based auth
	group.POST("/:campaignId/start", h.startCampaign)
	group.POST("/:campaignId/pause", h.pauseCampaign)
	group.POST("/:campaignId/resume", h.resumeCampaign)
	group.POST("/:campaignId/cancel", h.cancelCampaign)

	// Domain-centric validation routes - session-based auth
	group.POST("/:campaignId/validate-dns", h.validateDNSForCampaign)
	group.POST("/:campaignId/validate-http", h.validateHTTPForCampaign)

	// Phase configuration routes - session-based auth
	group.POST("/:campaignId/configure-dns", h.configureDNSValidationGin)
	group.POST("/:campaignId/configure-http", h.configureHTTPValidationGin)

	// Campaign modification routes - session-based auth
	group.PUT("/:campaignId", h.updateCampaign)

	// Campaign deletion routes - session-based auth
	group.DELETE("/:campaignId", h.deleteCampaign)
	group.DELETE("", h.bulkDeleteCampaigns)

	// Campaign results routes - session-based auth
	group.GET("/:campaignId/results/generated-domains", h.getGeneratedDomains)
	group.GET("/:campaignId/results/dns-validation", h.getDNSValidationResults)
	group.GET("/:campaignId/results/http-keyword", h.getHTTPKeywordResults)

	// B2B BULK APIS: Efficient batch endpoints for large-scale operations
	group.POST("/bulk/enriched-data", h.getBulkEnrichedCampaignData)
	group.POST("/bulk/domains", h.getBulkDomains)
	group.POST("/bulk/logs", h.getBulkLogs)
	group.POST("/bulk/leads", h.getBulkLeads)

	// Domain generation utilities - session-based auth
	group.POST("/domain-generation/pattern-offset", h.getPatternOffset)
}

// --- Unified Campaign Creation Handler ---

// createCampaign creates a new campaign.
// @Summary Create new campaign
// @Description Create a new campaign with specified configuration parameters
// @Tags campaigns
// @ID createCampaign
// @Accept json
// @Produce json
// @Param request body services.CreateCampaignRequest true "Campaign creation request"
// @Success 200 {object} CampaignOperationResponse "Campaign created successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns [post]
func (h *CampaignOrchestratorAPIHandler) createCampaign(c *gin.Context) {
	var req CreateCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Use validation error response for binding errors
		var validationErrors []ErrorDetail
		validationErrors = append(validationErrors, ErrorDetail{
			Field:   "body",
			Code:    ErrorCodeValidation,
			Message: "Invalid request payload: " + err.Error(),
		})
		respondWithValidationErrorGin(c, validationErrors)
		return
	}

	// Validate struct if validator is available
	if validate != nil {
		if err := validate.Struct(req); err != nil {
			// Convert validation errors to ErrorDetail slice
			var validationErrors []ErrorDetail
			validationErrors = append(validationErrors, ErrorDetail{
				Code:    ErrorCodeValidation,
				Message: "Validation failed: " + err.Error(),
			})
			respondWithValidationErrorGin(c, validationErrors)
			return
		}
	}

	// Validate that domain generation params are provided for phases-based campaigns
	if req.DomainGenerationParams == nil {
		var validationErrors []ErrorDetail
		validationErrors = append(validationErrors, ErrorDetail{
			Code:    ErrorCodeValidation,
			Message: "domainGenerationParams required for campaign creation - all campaigns start with domain generation phase",
		})
		respondWithValidationErrorGin(c, validationErrors)
		return
	}

	// Get user ID from context (set by middleware)
	userID, _ := c.Get("user_id")

	// Convert CreateCampaignRequest to CreateDomainGenerationCampaignRequest
	domainGenReq := services.CreateDomainGenerationCampaignRequest{
		Name:                 req.Name,
		PatternType:          req.DomainGenerationParams.PatternType,
		VariableLength:       req.DomainGenerationParams.VariableLength,
		CharacterSet:         req.DomainGenerationParams.CharacterSet,
		ConstantString:       req.DomainGenerationParams.ConstantString,
		TLD:                  req.DomainGenerationParams.TLD,
		NumDomainsToGenerate: req.DomainGenerationParams.NumDomainsToGenerate,
		UserID:               userID.(uuid.UUID),
	}

	// Create campaign using the working phases-based method
	log.Printf("DEBUG [createCampaign]: Calling CreateDomainGenerationCampaign - Name: %s, PatternType: %s, TLD: %s",
		domainGenReq.Name, domainGenReq.PatternType, domainGenReq.TLD)

	campaign, err := h.orchestratorService.CreateDomainGenerationCampaign(c.Request.Context(), domainGenReq)
	if err != nil {
		log.Printf("DEBUG [createCampaign]: CreateDomainGenerationCampaign failed: %v", err)

		// Use detailed error response with appropriate error code
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
			"Failed to create campaign", []ErrorDetail{
				{
					Code:    ErrorCodeInternalServer,
					Message: err.Error(),
				},
			})
		return
	}

	log.Printf("DEBUG [createCampaign]: Campaign created successfully - ID: %s, Type: %T",
		campaign.ID, campaign)
	log.Printf("DEBUG [createCampaign]: Campaign CurrentPhase: %v, PhaseStatus: %v",
		campaign.CurrentPhase, campaign.PhaseStatus)

	// Broadcast campaign creation to WebSocket clients
	websocket.BroadcastCampaignCreated(campaign.ID.String(), campaign)
	log.Printf("Campaign created and broadcasted: %s", campaign.ID)

	log.Printf("DEBUG [createCampaign]: Response will be wrapped in APIResponse structure")
	respondWithJSONGin(c, http.StatusCreated, campaign)
}

// updateCampaign updates an existing campaign's configuration for DNS validation transition
// @Summary Update campaign configuration
// @Description Update an existing campaign's configuration parameters
// @Tags campaigns
// @ID updateCampaign
// @Accept json
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Param request body services.UpdateCampaignRequest true "Campaign update request"
// @Success 200 {object} models.Campaign "Campaign updated successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns/{campaignId} [put]
func (h *CampaignOrchestratorAPIHandler) updateCampaign(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid campaign ID format", []ErrorDetail{
				{
					Field:   "campaignId",
					Code:    ErrorCodeValidation,
					Message: "Campaign ID must be a valid UUID",
				},
			})
		return
	}

	var req UpdateCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		var validationErrors []ErrorDetail
		validationErrors = append(validationErrors, ErrorDetail{
			Field:   "body",
			Code:    ErrorCodeValidation,
			Message: "Invalid request payload: " + err.Error(),
		})
		respondWithValidationErrorGin(c, validationErrors)
		return
	}

	// Validate struct if validator is available
	if validate != nil {
		if err := validate.Struct(req); err != nil {
			var validationErrors []ErrorDetail
			validationErrors = append(validationErrors, ErrorDetail{
				Code:    ErrorCodeValidation,
				Message: "Validation failed: " + err.Error(),
			})
			respondWithValidationErrorGin(c, validationErrors)
			return
		}
	}

	// Update campaign using the orchestrator service
	campaign, err := h.orchestratorService.UpdateCampaign(c.Request.Context(), campaignID, req)
	if err != nil {
		log.Printf("Error updating campaign %s: %v", campaignIDStr, err)

		// Differentiate error types based on error message
		if err.Error() == "record not found" {
			respondWithDetailedErrorGin(c, http.StatusNotFound, ErrorCodeNotFound,
				"Campaign not found", nil)
		} else if err.Error() == "campaign cannot be updated" || err.Error() == "invalid campaign state" {
			respondWithDetailedErrorGin(c, http.StatusConflict, ErrorCodeInvalidState,
				"Campaign is in an invalid state for update", []ErrorDetail{
					{
						Code:    ErrorCodeInvalidState,
						Message: err.Error(),
						Context: ErrorContext{
							CampaignID: campaignID.String(),
						},
					},
				})
		} else if strings.Contains(err.Error(), "cannot transition to DNS validation") ||
			strings.Contains(err.Error(), "must be completed") ||
			strings.Contains(err.Error(), "personaIds required for DNS validation") {
			// Handle phase transition validation errors
			respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
				"Phase transition validation failed", []ErrorDetail{
					{
						Code:    ErrorCodeValidation,
						Message: err.Error(),
						Context: ErrorContext{
							CampaignID: campaignID.String(),
							ErrorType:  "phase_transition",
						},
					},
				})
		} else if strings.Contains(err.Error(), "campaign type transition") ||
			strings.Contains(err.Error(), "is not supported") {
			// Handle unsupported phase transition errors
			respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
				"Unsupported campaign type transition", []ErrorDetail{
					{
						Code:    ErrorCodeValidation,
						Message: err.Error(),
						Context: ErrorContext{
							CampaignID: campaignID.String(),
							ErrorType:  "unsupported_transition",
						},
					},
				})
		} else {
			respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
				"Failed to update campaign", []ErrorDetail{
					{
						Code:    ErrorCodeInternalServer,
						Message: err.Error(),
						Context: ErrorContext{
							CampaignID: campaignID.String(),
						},
					},
				})
		}
		return
	}

	// Broadcast campaign update to WebSocket clients
	websocket.BroadcastCampaignUpdated(campaignID.String(), campaign)
	log.Printf("Campaign updated and broadcasted: %s", campaignID)

	respondWithJSONGin(c, http.StatusOK, campaign)
}

// --- Campaign Information Handlers ---

// listCampaigns lists all campaigns.
// @Summary List all campaigns
// @Description Retrieve a list of all campaigns with optional filtering and pagination
// @Tags campaigns
// @ID listCampaigns
// @Produce json
// @Param limit query int false "Maximum number of campaigns to return" default(20)
// @Param offset query int false "Number of campaigns to skip" default(0)
// @Param status query string false "Filter by campaign status"
// @Success 200 {object} APIResponse "List of campaigns"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns [get]
func (h *CampaignOrchestratorAPIHandler) listCampaigns(c *gin.Context) {
	// Parse and validate query parameters
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 || limit > 100 {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid limit parameter", []ErrorDetail{
				{
					Field:   "limit",
					Code:    ErrorCodeValidation,
					Message: "Limit must be between 1 and 100",
				},
			})
		return
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid offset parameter", []ErrorDetail{
				{
					Field:   "offset",
					Code:    ErrorCodeValidation,
					Message: "Offset must be non-negative",
				},
			})
		return
	}

	// Simplified filtering for phases-based architecture - remove legacy filters for now
	filter := store.ListCampaignsFilter{
		Limit:     limit,
		Offset:    offset,
		SortBy:    c.Query("sortBy"),
		SortOrder: c.Query("sortOrder"),
	}

	campaigns, totalCount, err := h.orchestratorService.ListCampaigns(c.Request.Context(), filter)
	if err != nil {
		log.Printf("Error listing campaigns: %v", err)
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeDatabaseError,
			"Failed to retrieve campaigns", nil)
		return
	}

	// Use unified response with metadata for pagination
	c.Header("X-Total-Count", fmt.Sprintf("%d", totalCount))
	response := NewSuccessResponse(campaigns, getRequestID(c))
	response.WithMetadata(&Metadata{
		Page: &PageInfo{
			Current:  (offset / limit) + 1,
			Total:    int((totalCount + int64(limit) - 1) / int64(limit)),
			PageSize: limit,
			Count:    int(totalCount),
		},
	})
	respondWithJSONGin(c, http.StatusOK, response)
}

// configureDNSValidationGin configures DNS validation phase for a campaign
// @Summary Configure DNS validation phase
// @Description Configure DNS validation phase for a campaign and transition to dns_validation phase
// @Tags campaigns
// @ID configureDNSValidation
// @Accept json
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Param request body DNSPhaseConfigRequest true "DNS validation configuration"
// @Success 200 {object} APIResponse "Campaign configured successfully"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 404 {object} ErrorResponse "Campaign not found"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/{campaignId}/configure-dns [post]
func (h *CampaignOrchestratorAPIHandler) configureDNSValidationGin(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid campaign ID format", nil)
		return
	}

	var req DNSPhaseConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid request body", nil)
		return
	}

	campaign, err := h.orchestratorService.ConfigureDNSValidationPhase(c.Request.Context(), campaignID, req)
	if err != nil {
		log.Printf("Error configuring DNS validation for campaign %s: %v", campaignIDStr, err)
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation, err.Error(), nil)
		return
	}

	log.Printf("Successfully configured DNS validation for campaign %s", campaignIDStr)

	// ✅ FIX: Use UNIFIED APIResponse format instead of direct campaign object
	response := NewSuccessResponse(campaign, getRequestID(c))
	respondWithJSONGin(c, http.StatusOK, response)
}

// configureHTTPValidationGin configures HTTP validation phase for a campaign
// @Summary Configure HTTP validation phase
// @Description Configure HTTP validation phase for a campaign and transition to http_validation phase
// @Tags campaigns
// @ID configureHTTPValidation
// @Accept json
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Param request body HTTPPhaseConfigRequest true "HTTP validation configuration"
// @Success 200 {object} APIResponse "Campaign configured successfully"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 404 {object} ErrorResponse "Campaign not found"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/{campaignId}/configure-http [post]
func (h *CampaignOrchestratorAPIHandler) configureHTTPValidationGin(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid campaign ID format", nil)
		return
	}

	var req HTTPPhaseConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid request body", nil)
		return
	}

	campaign, err := h.orchestratorService.ConfigureHTTPValidationPhase(c.Request.Context(), campaignID, req)
	if err != nil {
		log.Printf("Error configuring HTTP validation for campaign %s: %v", campaignIDStr, err)
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation, err.Error(), nil)
		return
	}

	log.Printf("Successfully configured HTTP validation for campaign %s", campaignIDStr)

	// ✅ FIX: Use UNIFIED APIResponse format instead of direct campaign object
	response := NewSuccessResponse(campaign, getRequestID(c))
	respondWithJSONGin(c, http.StatusOK, response)
}

// @Summary Get campaign details
// @Description Retrieve detailed information about a specific campaign including its configuration parameters
// @Tags campaigns
// @ID getCampaignDetails
// @Accept json
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Success 200 {object} CampaignDetailsResponse "Campaign details retrieved successfully"
// @Failure 400 {object} ErrorResponse "Invalid campaign ID format"
// @Failure 404 {object} ErrorResponse "Campaign not found"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /campaigns/{campaignId} [get]
func (h *CampaignOrchestratorAPIHandler) getCampaignDetails(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid campaign ID format")
		return
	}

	baseCampaign, _, err := h.orchestratorService.GetCampaignDetails(c.Request.Context(), campaignID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			respondWithErrorGin(c, http.StatusNotFound, "Campaign not found")
		} else {
			log.Printf("Error getting campaign details for %s: %v", campaignIDStr, err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to get campaign details")
		}
		return
	}

	// Use phases-based campaign response format
	resp := CampaignDetailsResponse{
		Campaign: CampaignData{
			ID:           baseCampaign.ID.String(),
			Name:         baseCampaign.Name,
			CurrentPhase: baseCampaign.CurrentPhase,
			PhaseStatus:  baseCampaign.PhaseStatus,
			CreatedAt:    baseCampaign.CreatedAt.Format(time.RFC3339),
			UpdatedAt:    baseCampaign.UpdatedAt.Format(time.RFC3339),
			Description:  "",                           // Description field will be populated from service layer
			Progress:     make(map[string]interface{}), // Initialize progress map
		},
		Params: CampaignParamsData{
			DomainCount:   getTotalItemsCount(baseCampaign),
			KeywordSetID:  "", // Will be populated from actual params
			PersonaID:     "", // Will be populated from actual params
			ProxyPoolID:   "", // Will be populated from actual params
			Configuration: getCurrentPhaseString(baseCampaign),
		},
	}
	respondWithJSONGin(c, http.StatusOK, resp)
}

// --- Campaign Control Handlers ---

// startCampaign starts a campaign.
// @Summary Start campaign
// @Description Start the execution of a campaign
// @Tags campaigns
// @ID startCampaign
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Success 200 {object} CampaignOperationResponse "Campaign started successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns/{campaignId}/start [post]
func (h *CampaignOrchestratorAPIHandler) startCampaign(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid campaign ID format", []ErrorDetail{
				{
					Field:   "campaignId",
					Code:    ErrorCodeValidation,
					Message: "Campaign ID must be a valid UUID",
				},
			})
		return
	}

	if err := h.orchestratorService.StartCampaign(c.Request.Context(), campaignID); err != nil {
		log.Printf("Error starting campaign %s: %v", campaignIDStr, err)

		// Differentiate error types based on error message
		// In production, use proper error types from the service layer
		if err.Error() == "record not found" {
			respondWithDetailedErrorGin(c, http.StatusNotFound, ErrorCodeNotFound,
				"Campaign not found", nil)
		} else if err.Error() == "campaign already running" || err.Error() == "invalid campaign state" {
			respondWithDetailedErrorGin(c, http.StatusConflict, ErrorCodeInvalidState,
				"Campaign is in an invalid state for this operation", []ErrorDetail{
					{
						Code:    ErrorCodeInvalidState,
						Message: err.Error(),
						Context: ErrorContext{
							CampaignID: campaignID.String(),
						},
					},
				})
		} else {
			respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
				"Failed to start campaign", nil)
		}
		return
	}

	startResponse := CampaignStartResponse{
		Message:    "Campaign queued for start",
		CampaignID: campaignID.String(),
		QueuedAt:   time.Now().Format(time.RFC3339),
	}
	respondWithJSONGin(c, http.StatusOK, startResponse)
}

// pauseCampaign pauses a campaign.
// @Summary Pause campaign
// @Description Pause the execution of a running campaign
// @Tags campaigns
// @ID pauseCampaign
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Success 200 {object} CampaignOperationResponse "Campaign paused successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns/{campaignId}/pause [post]
func (h *CampaignOrchestratorAPIHandler) pauseCampaign(c *gin.Context) {
	h.handleCampaignOperation(c, "pausing", h.orchestratorService.PauseCampaign)
}

// resumeCampaign resumes a campaign.
// @Summary Resume campaign
// @Description Resume the execution of a paused campaign
// @Tags campaigns
// @ID resumeCampaign
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Success 200 {object} CampaignOperationResponse "Campaign resumed successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns/{campaignId}/resume [post]
func (h *CampaignOrchestratorAPIHandler) resumeCampaign(c *gin.Context) {
	h.handleCampaignOperation(c, "resuming", h.orchestratorService.ResumeCampaign)
}

// cancelCampaign cancels a campaign.
// @Summary Cancel campaign
// @Description Cancel the execution of a campaign
// @Tags campaigns
// @ID cancelCampaign
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Success 200 {object} CampaignOperationResponse "Campaign cancelled successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns/{campaignId}/cancel [post]
func (h *CampaignOrchestratorAPIHandler) cancelCampaign(c *gin.Context) {
	h.handleCampaignOperation(c, "cancelling", h.orchestratorService.CancelCampaign)
}

// deleteCampaign deletes a campaign.
// @Summary Delete campaign
// @Description Delete a campaign and all associated data
// @Tags campaigns
// @ID deleteCampaign
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Success 200 {object} DeletionResponse "Campaign deleted successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns/{campaignId} [delete]
func (h *CampaignOrchestratorAPIHandler) deleteCampaign(c *gin.Context) {
	h.handleCampaignOperation(c, "deleting", h.orchestratorService.DeleteCampaign)
}

// BulkDeleteRequest represents the request payload for bulk delete operations
type BulkDeleteRequest struct {
	CampaignIDs []string `json:"campaignIds" validate:"required,min=1,dive,uuid"`
}

// HTTPValidationRequest represents the request body for HTTP validation
type HTTPValidationRequest struct {
	PersonaIDs               []uuid.UUID `json:"personaIds" validate:"required,min=1,dive,uuid"`
	KeywordSetIDs            []uuid.UUID `json:"keywordSetIds,omitempty" validate:"omitempty,dive,uuid"`
	AdHocKeywords            []string    `json:"adHocKeywords,omitempty" validate:"omitempty,dive,min=1"`
	ProxyPoolID              *uuid.UUID  `json:"proxyPoolId,omitempty"`
	ProcessingSpeedPerMinute *int        `json:"processingSpeedPerMinute,omitempty" validate:"omitempty,gte=0"`
	BatchSize                *int        `json:"batchSize,omitempty" validate:"omitempty,gt=0"`
	RetryAttempts            *int        `json:"retryAttempts,omitempty" validate:"omitempty,gte=0"`
	TargetHTTPPorts          []int       `json:"targetHttpPorts,omitempty" validate:"omitempty,dive,gt=0,lte=65535"`
}

// bulkDeleteCampaigns deletes multiple campaigns at once.
// @Summary Bulk delete campaigns
// @Description Delete multiple campaigns in a single operation
// @Tags campaigns
// @ID bulkDeleteCampaigns
// @Accept json
// @Produce json
// @Param body body BulkDeleteRequest true "Bulk delete request with campaign IDs"
// @Success 200 {object} BulkDeleteResult "Bulk delete results"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns [delete]
func (h *CampaignOrchestratorAPIHandler) bulkDeleteCampaigns(c *gin.Context) {
	// Diagnostic logging for request body debugging
	log.Printf("[DIAGNOSTIC] bulkDeleteCampaigns: Content-Length=%d, Content-Type=%s",
		c.Request.ContentLength, c.Request.Header.Get("Content-Type"))

	var req BulkDeleteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[DIAGNOSTIC] bulkDeleteCampaigns: ShouldBindJSON failed: %v", err)
		var validationErrors []ErrorDetail
		validationErrors = append(validationErrors, ErrorDetail{
			Field:   "body",
			Code:    ErrorCodeValidation,
			Message: "Invalid request payload: " + err.Error(),
		})
		respondWithValidationErrorGin(c, validationErrors)
		return
	}

	// Validate request structure
	if validate != nil {
		if err := validate.Struct(req); err != nil {
			var validationErrors []ErrorDetail
			validationErrors = append(validationErrors, ErrorDetail{
				Code:    ErrorCodeValidation,
				Message: "Validation failed: " + err.Error(),
			})
			respondWithValidationErrorGin(c, validationErrors)
			return
		}
	}

	// Validate campaign IDs and convert to UUIDs
	var campaignUUIDs []uuid.UUID
	for i, idStr := range req.CampaignIDs {
		campaignID, err := uuid.Parse(idStr)
		if err != nil {
			respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
				"Invalid campaign ID format", []ErrorDetail{
					{
						Field:   fmt.Sprintf("campaignIds[%d]", i),
						Code:    ErrorCodeValidation,
						Message: "Campaign ID must be a valid UUID",
						Context: ErrorContext{
							ProvidedValue: idStr,
						},
					},
				})
			return
		}
		campaignUUIDs = append(campaignUUIDs, campaignID)
	}

	// Perform bulk deletion through orchestrator service
	result, err := h.orchestratorService.BulkDeleteCampaigns(c.Request.Context(), campaignUUIDs)
	if err != nil {
		log.Printf("Error bulk deleting campaigns: %v", err)
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
			"Failed to delete campaigns", []ErrorDetail{
				{
					Code:    ErrorCodeInternalServer,
					Message: err.Error(),
					Context: ErrorContext{
						CampaignCount: len(campaignUUIDs),
					},
				},
			})
		return
	}

	// Broadcast deletions for successfully deleted campaigns
	for _, deletedID := range result.DeletedCampaignIDs {
		websocket.BroadcastCampaignDeleted(deletedID.String())
		log.Printf("Campaign bulk deleted and broadcasted: %s", deletedID)
	}

	// Convert UUIDs to strings
	deletedIDStrings := make([]string, len(result.DeletedCampaignIDs))
	for i, id := range result.DeletedCampaignIDs {
		deletedIDStrings[i] = id.String()
	}

	bulkResult := BulkDeleteResult{
		Message:             "Bulk deletion completed",
		TotalRequested:      len(campaignUUIDs),
		SuccessfullyDeleted: result.SuccessfullyDeleted,
		FailedDeletions:     result.FailedDeletions,
		DeletedCampaignIDs:  deletedIDStrings,
	}
	respondWithJSONGin(c, http.StatusOK, bulkResult)
}

// getGeneratedDomains gets generated domains for a campaign.
// @Summary Get generated domains
// @Description Retrieve all generated domains for a specific campaign with pagination support
// @Tags campaigns
// @ID getGeneratedDomains
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Param limit query int false "Number of domains to return (default: 20, max: 1000)"
// @Param cursor query int false "Cursor for pagination (offset index, default: 0)"
// @Success 200 {object} services.GeneratedDomainsResponse "Paginated list of generated domains"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns/{campaignId}/results/generated-domains [get]
func (h *CampaignOrchestratorAPIHandler) getGeneratedDomains(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid campaign ID format")
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	cursor, _ := strconv.ParseInt(c.DefaultQuery("cursor", "0"), 10, 64)

	resp, err := h.orchestratorService.GetGeneratedDomainsForCampaign(c.Request.Context(), campaignID, limit, cursor)
	if err != nil {
		log.Printf("Error getting generated domains for campaign %s: %v", campaignIDStr, err)
		respondWithErrorGin(c, http.StatusInternalServerError, fmt.Sprintf("Failed to get generated domains: %v", err))
		return
	}

	respondWithJSONGin(c, http.StatusOK, resp)
}

// getDNSValidationResults gets DNS validation results for a campaign.
// @Summary Get DNS validation results
// @Description Retrieve DNS validation results for a specific campaign with pagination support
// @Tags campaigns
// @ID getDNSValidationResults
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Param limit query int false "Number of results to return (default: 20)"
// @Param cursor query string false "Cursor for pagination (default: empty)"
// @Success 200 {object} services.DNSValidationResultsResponse "Paginated list of DNS validation results"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns/{campaignId}/results/dns-validation [get]
func (h *CampaignOrchestratorAPIHandler) getDNSValidationResults(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid campaign ID format")
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	cursor := c.DefaultQuery("cursor", "")

	// Create an empty filter since the query parameters don't include filter options
	filter := store.ListValidationResultsFilter{
		Limit:  limit,
		Offset: 0, // Will be set by the service based on cursor
	}

	resp, err := h.orchestratorService.GetDNSValidationResultsForCampaign(c.Request.Context(), campaignID, limit, cursor, filter)
	if err != nil {
		log.Printf("Error getting DNS validation results for campaign %s: %v", campaignIDStr, err)
		respondWithErrorGin(c, http.StatusInternalServerError, fmt.Sprintf("Failed to get DNS validation results: %v", err))
		return
	}

	respondWithJSONGin(c, http.StatusOK, resp)
}

// getHTTPKeywordResults gets HTTP keyword results for a campaign.
// @Summary Get HTTP keyword results
// @Description Retrieve HTTP keyword validation results for a specific campaign with pagination support
// @Tags campaigns
// @ID getHTTPKeywordResults
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Param limit query int false "Number of results to return (default: 20)"
// @Param cursor query string false "Cursor for pagination (default: empty)"
// @Success 200 {object} services.HTTPKeywordResultsResponse "Paginated list of HTTP keyword results"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns/{campaignId}/results/http-keyword [get]
func (h *CampaignOrchestratorAPIHandler) getHTTPKeywordResults(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid campaign ID format")
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	cursor := c.DefaultQuery("cursor", "")

	// Create an empty filter since the query parameters don't include filter options
	filter := store.ListValidationResultsFilter{
		Limit:  limit,
		Offset: 0, // Will be set by the service based on cursor
	}

	resp, err := h.orchestratorService.GetHTTPKeywordResultsForCampaign(c.Request.Context(), campaignID, limit, cursor, filter)
	if err != nil {
		log.Printf("Error getting HTTP keyword results for campaign %s: %v", campaignIDStr, err)
		respondWithErrorGin(c, http.StatusInternalServerError, fmt.Sprintf("Failed to get HTTP keyword results: %v", err))
		return
	}

	respondWithJSONGin(c, http.StatusOK, resp)
}

// validateDNSForCampaign triggers domain-centric DNS validation for all domains in a campaign.
// @Summary Validate DNS for campaign
// @Description Trigger DNS validation for all domains in a specific campaign
// @Tags campaigns
// @ID validateDNSForCampaign
// @Accept json
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Param request body DNSValidatorConfigJSON false "DNS validation configuration"
// @Success 200 {object} ValidationOperationResponse "DNS validation started successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns/{campaignId}/validate-dns [post]
func (h *CampaignOrchestratorAPIHandler) validateDNSForCampaign(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid campaign ID format", []ErrorDetail{
				{
					Field:   "campaignId",
					Code:    ErrorCodeValidation,
					Message: "Campaign ID must be a valid UUID",
				},
			})
		return
	}

	log.Printf("[DNS_VALIDATION_TRIGGER] Starting validateDNSForCampaign handler for campaign %s", campaignID)

	// Handle optional request body for persona configuration
	var req DNSValidationAPIRequest

	// Try to bind JSON for optional request parameters (for backward compatibility)
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("INFO [DNS Validation]: No request body provided for campaign %s, will use stored campaign configuration", campaignID)
	}

	log.Printf("INFO [DNS Validation]: Processing in-place DNS validation request for campaign %s", campaignID)

	// Get the source campaign for DNS validation
	sourceCampaign, _, err := h.orchestratorService.GetCampaignDetails(c.Request.Context(), campaignID)
	if err != nil {
		log.Printf("ERROR [DNS Validation]: Failed to get source campaign %s: %v", campaignID, err)
		respondWithDetailedErrorGin(c, http.StatusNotFound, ErrorCodeNotFound,
			"Source campaign not found", []ErrorDetail{
				{
					Code:    ErrorCodeNotFound,
					Message: "The specified campaign could not be found or you do not have permission to access it",
					Context: ErrorContext{
						CampaignID: campaignID.String(),
					},
				},
			})
		return
	}

	// Validate the source campaign can be used for DNS validation
	currentPhaseStr := "unknown"
	if sourceCampaign.CurrentPhase != nil {
		currentPhaseStr = string(*sourceCampaign.CurrentPhase)
	}

	if sourceCampaign.CurrentPhase == nil ||
		(*sourceCampaign.CurrentPhase != models.CampaignPhaseGeneration && *sourceCampaign.CurrentPhase != models.CampaignPhaseDNSValidation) {
		log.Printf("ERROR [DNS Validation]: Invalid campaign phase for DNS validation. Expected generation or dns_validation, got %s", currentPhaseStr)
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid campaign phase for DNS validation", []ErrorDetail{
				{
					Code:    ErrorCodeValidation,
					Message: "DNS validation can only be performed on domain generation or DNS validation campaigns",
					Context: ErrorContext{
						CampaignID:    campaignID.String(),
						CampaignPhase: currentPhaseStr,
					},
				},
			})
		return
	}

	phaseStatusStr := "unknown"
	if sourceCampaign.PhaseStatus != nil {
		phaseStatusStr = string(*sourceCampaign.PhaseStatus)
	}

	if sourceCampaign.PhaseStatus == nil ||
		(*sourceCampaign.PhaseStatus != models.CampaignPhaseStatusSucceeded && *sourceCampaign.PhaseStatus != models.CampaignPhaseStatusInProgress) {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Campaign must be completed or running", []ErrorDetail{
				{
					Code:    ErrorCodeValidation,
					Message: "Source campaign must be completed or running before in-place DNS validation can be performed",
					Context: ErrorContext{
						CampaignID:  campaignID.String(),
						PhaseStatus: phaseStatusStr,
					},
				},
			})
		return
	}

	// Create DNS phase configuration request using clean single-campaign architecture
	dnsPhaseReq := models.DNSPhaseConfigRequest{
		PersonaIDs: make([]string, len(req.PersonaIDs)),
	}

	// Convert UUIDs to strings for phase config
	for i, personaID := range req.PersonaIDs {
		dnsPhaseReq.PersonaIDs[i] = personaID.String()
	}

	// Use the orchestrator's clean phase configuration method
	_, err = h.orchestratorService.ConfigureDNSValidationPhase(c.Request.Context(), campaignID, dnsPhaseReq)
	if err != nil {
		log.Printf("ERROR [DNS Validation]: Failed to start in-place DNS validation for campaign %s: %v", campaignID, err)

		// Handle different error types
		if err.Error() == "record not found" || err.Error() == "campaign not found" {
			respondWithDetailedErrorGin(c, http.StatusNotFound, ErrorCodeNotFound,
				"Source campaign not found", nil)
		} else if strings.Contains(err.Error(), "no DNS personas found") {
			respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
				"DNS personas required", []ErrorDetail{
					{
						Code:    ErrorCodeValidation,
						Message: err.Error(),
						Context: ErrorContext{
							CampaignID:    campaignID.String(),
							RequiredField: "personaIds",
							Help:          "DNS personas define the validation profiles used for domain checking. Please configure DNS personas in the validation panel and try again.",
						},
					},
				})
		} else if strings.Contains(err.Error(), "no domains found") {
			respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
				"No domains found for DNS validation", []ErrorDetail{
					{
						Code:    ErrorCodeValidation,
						Message: "Campaign must have generated domains before DNS validation can be performed",
						Context: ErrorContext{
							CampaignID: campaignID.String(),
						},
					},
				})
		} else {
			respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
				"Failed to start in-place DNS validation", []ErrorDetail{
					{
						Code:    ErrorCodeInternalServer,
						Message: err.Error(),
						Context: ErrorContext{
							CampaignID: campaignID.String(),
						},
					},
				})
		}
		return
	}

	log.Printf("SUCCESS [DNS Validation]: In-place DNS validation started successfully for campaign %s", campaignID)

	dnsResponse := DNSValidationStartResponse{
		Message:          "In-place DNS validation started successfully",
		CampaignID:       campaignID.String(),
		ValidationJobID:  "validation_in_progress", // Use status as job ID for now
		DomainsToProcess: 0,                        // Will be populated from service layer
	}
	respondWithJSONGin(c, http.StatusOK, dnsResponse)
}

// validateHTTPForCampaign triggers domain-centric HTTP keyword validation for all domains in a campaign.
// @Summary Validate HTTP for campaign
// @Description Trigger HTTP keyword validation for all domains in a specific campaign
// @Tags campaigns
// @ID validateHTTPForCampaign
// @Accept json
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Param request body HTTPValidatorConfigJSON false "HTTP validation configuration"
// @Success 200 {object} ValidationOperationResponse "HTTP validation started successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Campaign not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /campaigns/{campaignId}/validate-http [post]
func (h *CampaignOrchestratorAPIHandler) validateHTTPForCampaign(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid campaign ID format", []ErrorDetail{
				{
					Field:   "campaignId",
					Code:    ErrorCodeValidation,
					Message: "Campaign ID must be a valid UUID",
				},
			})
		return
	}

	log.Printf("INFO [HTTP Validation]: Starting domain-centric HTTP keyword validation for campaign %s", campaignID)

	// For domain-centric HTTP validation, we need to create a new HTTP keyword campaign
	// that sources from the completed DNS validation campaign
	// The request body could contain persona IDs and keyword configuration
	var req HTTPValidationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid request body", []ErrorDetail{
				{
					Field:   "body",
					Code:    ErrorCodeValidation,
					Message: "Invalid request payload: " + err.Error(),
				},
			})
		return
	}

	// Validate required fields
	if len(req.PersonaIDs) == 0 {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Persona IDs required", []ErrorDetail{
				{
					Field:   "personaIds",
					Code:    ErrorCodeValidation,
					Message: "At least one persona ID is required for HTTP keyword validation",
				},
			})
		return
	}

	if len(req.KeywordSetIDs) == 0 && len(req.AdHocKeywords) == 0 {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Keywords required", []ErrorDetail{
				{
					Field:   "keywords",
					Code:    ErrorCodeValidation,
					Message: "Either keyword set IDs or ad-hoc keywords must be provided",
				},
			})
		return
	}

	// ARCHITECTURAL FIX: Use Campaign Orchestrator's phase transition instead of separate campaign creation
	log.Printf("ARCHITECTURAL FIX: HTTP validation should use phase transition, not separate campaign creation")
	// ARCHITECTURAL FIX: Use phase transition instead of separate campaign creation
	// Convert persona UUIDs to strings for the phase config request
	personaIDStrings := make([]string, len(req.PersonaIDs))
	for i, personaID := range req.PersonaIDs {
		personaIDStrings[i] = personaID.String()
	}

	// Create HTTP phase configuration request
	httpPhaseReq := models.HTTPPhaseConfigRequest{
		Name:          nil, // Keep existing campaign name
		PersonaIDs:    personaIDStrings,
		AdHocKeywords: req.AdHocKeywords,
	}

	// Configure HTTP validation phase on the existing campaign
	httpCampaign, err := h.orchestratorService.ConfigureHTTPValidationPhase(c.Request.Context(), campaignID, httpPhaseReq)
	if err != nil {
		log.Printf("ERROR [HTTP Validation]: Failed to create HTTP keyword campaign for source %s: %v", campaignIDStr, err)

		// Handle different error types
		if err.Error() == "record not found" || err.Error() == "campaign not found" {
			respondWithDetailedErrorGin(c, http.StatusNotFound, ErrorCodeNotFound,
				"Source campaign not found", nil)
		} else if err.Error() == "no domains found for campaign" {
			respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
				"No domains found for HTTP validation", []ErrorDetail{
					{
						Code:    ErrorCodeValidation,
						Message: "Source campaign must have DNS validation results before HTTP validation can be performed",
						Context: ErrorContext{
							CampaignID: campaignID.String(),
						},
					},
				})
		} else {
			respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
				"Failed to start HTTP validation", []ErrorDetail{
					{
						Code:    ErrorCodeInternalServer,
						Message: err.Error(),
						Context: ErrorContext{
							CampaignID: campaignID.String(),
						},
					},
				})
		}
		return
	}

	log.Printf("SUCCESS [HTTP Validation]: HTTP keyword validation campaign created successfully for source %s, new campaign ID: %s", campaignID, httpCampaign.ID)

	httpResponse := HTTPValidationStartResponse{
		Message:         "HTTP keyword validation started successfully",
		CampaignID:      httpCampaign.ID.String(),
		ValidationJobID: campaignID.String(), // Source campaign ID as job reference
		DomainsToTest:   0,                   // Will be populated from service layer
	}
	respondWithJSONGin(c, http.StatusOK, httpResponse)
}

// Helper function to dereference int pointers with defaults
func derefIntPtr(ptr *int, defaultVal int) int {
	if ptr == nil {
		return defaultVal
	}
	return *ptr
}

// handleCampaignOperation is a helper method for common campaign operation handling
func (h *CampaignOrchestratorAPIHandler) handleCampaignOperation(c *gin.Context, operationName string, operation func(ctx context.Context, campaignID uuid.UUID) error) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid campaign ID format", []ErrorDetail{
				{
					Field:   "campaignId",
					Code:    ErrorCodeValidation,
					Message: "Campaign ID must be a valid UUID",
				},
			})
		return
	}

	if err := operation(c.Request.Context(), campaignID); err != nil {
		log.Printf("Error %s campaign %s: %v", operationName, campaignIDStr, err)

		// Differentiate error types based on error message
		// In production, use proper error types from the service layer
		if err.Error() == "record not found" {
			respondWithDetailedErrorGin(c, http.StatusNotFound, ErrorCodeNotFound,
				"Campaign not found", nil)
		} else if err.Error() == "campaign already running" || err.Error() == "invalid campaign state" {
			respondWithDetailedErrorGin(c, http.StatusConflict, ErrorCodeInvalidState,
				"Campaign is in an invalid state for this operation", []ErrorDetail{
					{
						Code:    ErrorCodeInvalidState,
						Message: err.Error(),
						Context: ErrorContext{
							CampaignID: campaignID.String(),
						},
					},
				})
		} else {
			respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
				fmt.Sprintf("Failed to %s campaign", operationName), nil)
		}
		return
	}

	// Broadcast WebSocket events for specific operations
	switch operationName {
	case "deleting":
		// Broadcast campaign deletion to WebSocket clients
		websocket.BroadcastCampaignDeleted(campaignID.String())
		log.Printf("Campaign deleted and broadcasted: %s", campaignID)
	}

	// Different success messages for different operations
	var message string
	switch operationName {
	case "deleting":
		message = "Campaign deleted successfully"
	default:
		message = fmt.Sprintf("Campaign %s successful", operationName)
	}

	operationResponse := CampaignOperationResponse{
		Success:    true,
		Message:    message,
		CampaignID: campaignID.String(),
		Status:     "completed",
	}
	respondWithJSONGin(c, http.StatusOK, operationResponse)
}

// getPatternOffset handles POST /campaigns/domain-generation/pattern-offset
// Uses existing domain_generation_config_states system to get current offset for a pattern
// @Summary Get domain generation pattern offset
// @Description Gets the current offset for a domain generation pattern to prevent duplicate domains across campaigns
// @Tags campaigns
// @ID getPatternOffset
// @Accept json
// @Produce json
// @Param request body PatternOffsetRequest true "Pattern configuration"
// @Success 200 {object} map[string]int64 "Current offset for the pattern"
// @Failure 400 {object} map[string]string "Invalid request parameters"
// @Failure 500 {object} map[string]string "Internal server error"
// @Router /campaigns/domain-generation/pattern-offset [post]
// @Security SessionAuth
func (h *CampaignOrchestratorAPIHandler) getPatternOffset(c *gin.Context) {
	var req PatternOffsetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, fmt.Sprintf("Invalid request: %v", err))
		return
	}

	// Note: We only need the currentOffset for the frontend, not total combinations

	// Convert request to DomainGenerationCampaignParams for hash generation
	// Use exact same approach as domain generation service for consistency
	params := models.DomainGenerationCampaignParams{
		PatternType:    req.PatternType,
		VariableLength: req.VariableLength,
		CharacterSet:   req.CharacterSet,
		ConstantString: models.StringPtr(req.ConstantString), // Use models.StringPtr like domain generation service
		TLD:            req.TLD,
		// Other fields are not used for hashing
	}

	// Generate config hash using existing system
	hashResult, err := domainexpert.GenerateDomainGenerationConfigHash(params)
	if err != nil {
		log.Printf("ERROR [Pattern Offset]: Failed to generate config hash for pattern %+v: %v", req, err)
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to generate pattern hash")
		return
	}

	log.Printf("DEBUG [Pattern Offset]: Generated hash %s for pattern: Type=%s, VarLen=%d, CharSet=%s, ConstStr=%s, TLD=%s",
		hashResult.HashString, req.PatternType, req.VariableLength, req.CharacterSet, req.ConstantString, req.TLD)

	// Get current offset from existing global offset tracking system
	currentOffset := int64(0)
	configState, err := h.campaignStore.GetDomainGenerationConfigStateByHash(c.Request.Context(), nil, hashResult.HashString)
	if err != nil {
		if err != store.ErrNotFound {
			log.Printf("ERROR [Pattern Offset]: Database error getting config state for hash %s: %v", hashResult.HashString, err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to get pattern offset")
			return
		}
		// If no state exists yet, offset remains 0
		log.Printf("DEBUG [Pattern Offset]: No existing config state found for hash %s - returning offset 0", hashResult.HashString)
	} else {
		currentOffset = configState.LastOffset
		log.Printf("DEBUG [Pattern Offset]: Found existing config state for hash %s with offset %d", hashResult.HashString, currentOffset)
	}

	// Return only the currentOffset as expected by frontend
	response := map[string]int64{
		"currentOffset": currentOffset,
	}

	respondWithJSONGin(c, http.StatusOK, response)
}

// --- B2B BULK APIS FOR LARGE-SCALE OPERATIONS ---

// getBulkEnrichedCampaignData gets enriched data for multiple campaigns in one call.
// @Summary Get bulk enriched campaign data
// @Description Efficiently retrieve enriched data for multiple campaigns in a single request for B2B scale
// @Tags campaigns
// @ID getBulkEnrichedCampaignData
// @Accept json
// @Produce json
// @Param request body BulkEnrichedDataRequest true "Bulk enriched data request"
// @Success 200 {object} APIResponse "Bulk enriched campaign data"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/bulk/enriched-data [post]
func (h *CampaignOrchestratorAPIHandler) getBulkEnrichedCampaignData(c *gin.Context) {
	startTime := time.Now()
	var req BulkEnrichedDataRequest

	// Parse and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		var validationErrors []ErrorDetail
		validationErrors = append(validationErrors, ErrorDetail{
			Field:   "body",
			Code:    ErrorCodeValidation,
			Message: "Invalid request payload: " + err.Error(),
		})
		respondWithValidationErrorGin(c, validationErrors)
		return
	}

	// Validate struct if validator is available
	if validate != nil {
		if err := validate.Struct(req); err != nil {
			var validationErrors []ErrorDetail
			validationErrors = append(validationErrors, ErrorDetail{
				Code:    ErrorCodeValidation,
				Message: "Validation failed: " + err.Error(),
			})
			respondWithValidationErrorGin(c, validationErrors)
			return
		}
	}

	// Validate campaign IDs
	if len(req.CampaignIDs) == 0 {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Campaign IDs list cannot be empty", []ErrorDetail{
				{
					Field:   "campaignIds",
					Code:    ErrorCodeValidation,
					Message: "At least one campaign ID must be provided",
				},
			})
		return
	}

	const maxBatchSize = 1000 // Enterprise-scale limit
	if len(req.CampaignIDs) > maxBatchSize {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			fmt.Sprintf("Maximum %d campaigns allowed per request", maxBatchSize), []ErrorDetail{
				{
					Field:   "campaignIds",
					Code:    ErrorCodeValidation,
					Message: fmt.Sprintf("Batch size %d exceeds maximum of %d", len(req.CampaignIDs), maxBatchSize),
					Context: ErrorContext{
						CampaignCount: len(req.CampaignIDs),
					},
				},
			})
		return
	}

	response := BulkEnrichedDataResponse{
		Campaigns:  make(map[string]EnrichedCampaignData),
		TotalCount: 0,
	}

	metadata := &BulkMetadata{
		ProcessedCampaigns: 0,
		SkippedCampaigns:   0,
		FailedCampaigns:    []string{},
	}

	// Enterprise-scale processing with bulk operations to eliminate N+1 queries
	ctx := c.Request.Context()

	// Parse all campaign IDs upfront
	campaignIDs := make([]uuid.UUID, 0, len(req.CampaignIDs))
	for _, campaignIDStr := range req.CampaignIDs {
		campaignID, err := uuid.Parse(campaignIDStr)
		if err != nil {
			log.Printf("Invalid campaign ID format: %s", campaignIDStr)
			metadata.SkippedCampaigns++
			metadata.FailedCampaigns = append(metadata.FailedCampaigns, campaignIDStr)
			continue
		}
		campaignIDs = append(campaignIDs, campaignID)
	}

	// Process campaigns in optimized batches to prevent memory issues
	batchSize := 50 // Process 50 campaigns at a time for optimal memory usage
	for i := 0; i < len(campaignIDs); i += batchSize {
		end := i + batchSize
		if end > len(campaignIDs) {
			end = len(campaignIDs)
		}

		batchCampaignIDs := campaignIDs[i:end]

		// Process each campaign in the batch
		for _, campaignID := range batchCampaignIDs {
			campaignIDStr := campaignID.String()

			// Get campaign details with error handling
			campaign, _, err := h.orchestratorService.GetCampaignDetails(ctx, campaignID)
			if err != nil {
				log.Printf("Error getting campaign %s: %v", campaignIDStr, err)
				metadata.SkippedCampaigns++
				metadata.FailedCampaigns = append(metadata.FailedCampaigns, campaignIDStr)
				continue
			}

			// Get enriched data with enterprise-scale limits (10K per campaign instead of 100)
			domains, _ := h.orchestratorService.GetGeneratedDomainsForCampaign(ctx, campaignID, 10000, 0)
			dnsResults, _ := h.orchestratorService.GetDNSValidationResultsForCampaign(ctx, campaignID, 10000, "", store.ListValidationResultsFilter{})
			httpResults, _ := h.orchestratorService.GetHTTPKeywordResultsForCampaign(ctx, campaignID, 10000, "", store.ListValidationResultsFilter{})

			// Extract domain lists with null checks
			var domainList, dnsValidatedList []string
			var leads []models.LeadItem
			var httpKeywordResults []interface{}

			if domains != nil && domains.Data != nil {
				for _, d := range domains.Data {
					domainList = append(domainList, d.DomainName)
				}
			}

			if dnsResults != nil && dnsResults.Data != nil {
				for _, r := range dnsResults.Data {
					dnsValidatedList = append(dnsValidatedList, r.DomainName)
				}
			}

			if httpResults != nil && httpResults.Data != nil {
				for _, r := range httpResults.Data {
					httpKeywordResults = append(httpKeywordResults, r)
					// Extract lead data from keyword results
					if r.FoundAdHocKeywords != nil && len(*r.FoundAdHocKeywords) > 0 {
						sourceURL := r.DomainName
						leads = append(leads, models.LeadItem{
							ID:        r.DomainName,
							SourceURL: &sourceURL,
						})
					}
				}
			}

			// Convert campaign to CampaignData with phases-based architecture
			campaignData := CampaignData{
				ID:           campaign.ID.String(),
				Name:         campaign.Name,
				CurrentPhase: campaign.CurrentPhase,
				PhaseStatus:  campaign.PhaseStatus,
				CreatedAt:    campaign.CreatedAt.Format(time.RFC3339),
				UpdatedAt:    campaign.UpdatedAt.Format(time.RFC3339),
				Description:  "",                           // Add description if available
				Progress:     make(map[string]interface{}), // Initialize progress map
			}

			response.Campaigns[campaignIDStr] = EnrichedCampaignData{
				Campaign:            campaignData,
				Domains:             domainList,
				DNSValidatedDomains: dnsValidatedList,
				Leads:               leads,
				HTTPKeywordResults:  httpKeywordResults,
			}

			metadata.ProcessedCampaigns++
			response.TotalCount++
		}
	}

	// Set processing time
	metadata.ProcessingTimeMs = time.Since(startTime).Milliseconds()
	response.Metadata = metadata

	apiResponse := NewSuccessResponse(response, getRequestID(c))
	respondWithJSONGin(c, http.StatusOK, apiResponse)
}

// getBulkDomains gets domain data for multiple campaigns.
// @Summary Get bulk domain data
// @Description Efficiently retrieve domain data for multiple campaigns
// @Tags campaigns
// @ID getBulkDomains
// @Accept json
// @Produce json
// @Param request body BulkDomainsRequest true "Bulk domains request"
// @Success 200 {object} APIResponse "Bulk domain data"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/bulk/domains [post]
func (h *CampaignOrchestratorAPIHandler) getBulkDomains(c *gin.Context) {
	var req BulkDomainsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid request format", nil)
		return
	}

	// Validate request parameters
	if len(req.CampaignIDs) == 0 {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Campaign IDs list cannot be empty", nil)
		return
	}

	// Set default limit if not provided
	limit := req.Limit
	if limit <= 0 {
		limit = 10000 // Enterprise-scale default
	}

	response := BulkDomainsResponse{
		Domains:    make(map[string][]string),
		TotalCount: 0,
	}

	metadata := &BulkMetadata{
		ProcessedCampaigns: 0,
		SkippedCampaigns:   0,
		FailedCampaigns:    []string{},
	}

	// Process campaigns in parallel batches for optimal performance
	ctx := c.Request.Context()

	for _, campaignIDStr := range req.CampaignIDs {
		campaignID, err := uuid.Parse(campaignIDStr)
		if err != nil {
			log.Printf("Invalid campaign ID format: %s", campaignIDStr)
			metadata.SkippedCampaigns++
			metadata.FailedCampaigns = append(metadata.FailedCampaigns, campaignIDStr)
			continue
		}

		// Use optimized bulk domain retrieval
		domains, err := h.orchestratorService.GetGeneratedDomainsForCampaign(ctx, campaignID, limit, int64(req.Offset))
		if err != nil {
			log.Printf("Error getting domains for campaign %s: %v", campaignIDStr, err)
			metadata.SkippedCampaigns++
			metadata.FailedCampaigns = append(metadata.FailedCampaigns, campaignIDStr)
			continue
		}

		// Extract domain names efficiently
		var domainList []string
		if domains != nil && domains.Data != nil {
			domainList = make([]string, 0, len(domains.Data))
			for _, d := range domains.Data {
				domainList = append(domainList, d.DomainName)
			}
		}

		response.Domains[campaignIDStr] = domainList
		response.TotalCount += len(domainList)
		metadata.ProcessedCampaigns++
	}

	// Add metadata to response
	response.Metadata = metadata

	apiResponse := NewSuccessResponse(response, getRequestID(c))
	c.JSON(http.StatusOK, apiResponse)
}

// getBulkLogs gets log data for multiple campaigns.
// @Summary Get bulk log data
// @Description Efficiently retrieve log data for multiple campaigns
// @Tags campaigns
// @ID getBulkLogs
// @Accept json
// @Produce json
// @Param request body BulkLogsRequest true "Bulk logs request"
// @Success 200 {object} APIResponse "Bulk log data"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/bulk/logs [post]
func (h *CampaignOrchestratorAPIHandler) getBulkLogs(c *gin.Context) {
	var req BulkLogsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid request format", nil)
		return
	}

	// Implementation placeholder - will be enhanced based on specific logging system
	result := map[string]interface{}{
		"message":     "Bulk logs endpoint - implementation in progress",
		"campaignIds": req.CampaignIDs,
	}

	apiResponse := NewSuccessResponse(result, getRequestID(c))
	c.JSON(http.StatusOK, apiResponse)
}

// getBulkLeads gets lead data for multiple campaigns.
// @Summary Get bulk lead data
// @Description Efficiently retrieve lead data for multiple campaigns
// @Tags campaigns
// @ID getBulkLeads
// @Accept json
// @Produce json
// @Param request body BulkLeadsRequest true "Bulk leads request"
// @Success 200 {object} APIResponse "Bulk lead data"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/bulk/leads [post]
func (h *CampaignOrchestratorAPIHandler) getBulkLeads(c *gin.Context) {
	var req BulkLeadsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid request format", nil)
		return
	}

	// Implementation placeholder - will be enhanced based on specific lead data structure
	result := map[string]interface{}{
		"message":     "Bulk leads endpoint - implementation in progress",
		"campaignIds": req.CampaignIDs,
	}

	apiResponse := NewSuccessResponse(result, getRequestID(c))
	c.JSON(http.StatusOK, apiResponse)
}
