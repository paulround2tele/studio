// File: backend/internal/api/campaign_orchestrator_handlers.go
package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
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
	phaseExecutionService   services.PhaseExecutionService   // Universal phase execution service
	domainGenerationService services.DomainGenerationService // Domain generation service for offset queries
	campaignStore           store.CampaignStore              // Direct access needed for pattern offset queries
	broadcaster             websocket.Broadcaster            // WebSocket broadcaster for real-time updates
	db                      store.Querier                    // Database connection for store operations
}

// NewCampaignOrchestratorAPIHandler creates a new handler for campaign orchestration.
func NewCampaignOrchestratorAPIHandler(
	phaseExecutionService services.PhaseExecutionService,
	domainGenerationService services.DomainGenerationService,
	campaignStore store.CampaignStore,
	broadcaster websocket.Broadcaster,
	db store.Querier) *CampaignOrchestratorAPIHandler {
	return &CampaignOrchestratorAPIHandler{
		phaseExecutionService:   phaseExecutionService,
		domainGenerationService: domainGenerationService,
		campaignStore:           campaignStore,
		broadcaster:             broadcaster,
		db:                      db,
	}
}

// Helper functions for phases-based campaign responses
func getPhaseStatusString(campaign *models.LeadGenerationCampaign) string {
	if campaign.PhaseStatus != nil {
		return string(*campaign.PhaseStatus)
	}
	return "not_started"
}

func getTotalItemsCount(campaign *models.LeadGenerationCampaign) int {
	if campaign.TotalItems != nil {
		return int(*campaign.TotalItems)
	}
	return 0
}

func getCurrentPhaseString(campaign *models.LeadGenerationCampaign) string {
	if campaign.CurrentPhase != nil {
		return string(*campaign.CurrentPhase)
	}
	return "setup"
}

// RegisterCampaignOrchestrationRoutes registers all campaign orchestration related routes.
// CLEANED UP: Only standalone service endpoints remain
func (h *CampaignOrchestratorAPIHandler) RegisterCampaignOrchestrationRoutes(group *gin.RouterGroup, authMiddleware *middleware.CachedAuthMiddleware) {
	// === STANDALONE SERVICE ENDPOINTS ONLY ===

	// Lead generation campaign creation endpoint - standalone service
	group.POST("/lead-generation", h.createLeadGenerationCampaign)

	// Campaign listing endpoint - standalone service
	group.GET("", h.getCampaignsStandalone)

	// Standalone services phase control routes
	group.POST("/:campaignId/phases/:phase/configure", h.configurePhaseStandalone)
	group.POST("/:campaignId/phases/:phase/start", h.startPhaseStandalone)
	group.GET("/:campaignId/phases/:phase/status", h.getPhaseStatusStandalone)
	group.GET("/:campaignId/progress", h.getCampaignProgressStandalone)

	// Domain generation utilities - standalone service
	group.POST("/domain-generation/pattern-offset", h.getPatternOffset)

	// --- B2B BULK APIS FOR LARGE-SCALE OPERATIONS ---
	// Bulk enriched data endpoint for processing millions of domains
	group.POST("/bulk/enriched-data", h.getBulkEnrichedCampaignData)
}

// createLeadGenerationCampaign creates a new lead generation campaign using standalone services
// @Summary Create lead generation campaign
// @Description Create a new lead generation campaign with domain generation configuration
// @Tags campaigns
// @ID createLeadGenerationCampaign
// @Accept json
// @Produce json
// @Param request body services.CreateLeadGenerationCampaignRequest true "Lead generation campaign creation request"
// @Success 201 {object} APIResponse "Campaign created successfully"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/lead-generation [post]
func (h *CampaignOrchestratorAPIHandler) createLeadGenerationCampaign(c *gin.Context) {
	var req services.CreateLeadGenerationCampaignRequest
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

	// Get user ID from context (set by middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		respondWithDetailedErrorGin(c, http.StatusUnauthorized, ErrorCodeUnauthorized,
			"User authentication required", nil)
		return
	}

	// Set UserID from authenticated context (frontend doesn't send this)
	req.UserID = userID.(uuid.UUID)

	// Create campaign using the standalone lead generation service
	log.Printf("Creating lead generation campaign using standalone service: %s", req.Name)

	campaign, err := h.phaseExecutionService.CreateCampaign(c.Request.Context(), req)
	if err != nil {
		log.Printf("Failed to create lead generation campaign: %v", err)
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
			"Failed to create campaign", []ErrorDetail{
				{
					Code:    ErrorCodeInternalServer,
					Message: err.Error(),
				},
			})
		return
	}

	log.Printf("Successfully created lead generation campaign: %s", campaign.ID)

	// Broadcast campaign creation to WebSocket clients
	websocket.BroadcastCampaignCreated(campaign.ID.String(), campaign)

	// Use unified APIResponse format
	response := NewSuccessResponse(campaign, getRequestID(c))
	respondWithJSONGin(c, http.StatusCreated, response)
}

// configurePhaseStandalone configures a specific phase for a campaign using standalone services
// @Summary Configure campaign phase (standalone)
// @Description Configure a specific phase for a campaign using standalone services
// @Tags campaigns
// @ID configurePhaseStandalone
// @Accept json
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Param phase path string true "Phase type" Enums(dns_validation, http_keyword_validation, analysis)
// @Param request body PhaseConfigureRequest true "Phase configuration request"
// @Success 200 {object} APIResponse "Phase configured successfully"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 404 {object} ErrorResponse "Campaign not found"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/{campaignId}/phases/{phase}/configure [post]
func (h *CampaignOrchestratorAPIHandler) configurePhaseStandalone(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	phase := c.Param("phase")

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

	var req PhaseConfigureRequest
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

	// Validate phase type matches request
	if req.PhaseType != phase {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Phase type mismatch", []ErrorDetail{
				{
					Field:   "phaseType",
					Code:    ErrorCodeValidation,
					Message: fmt.Sprintf("Phase type in request (%s) must match URL parameter (%s)", req.PhaseType, phase),
				},
			})
		return
	}

	log.Printf("Configuring phase %s for campaign %s using standalone services", phase, campaignID)

	// Use the lead generation service to configure phases - this method needs to be implemented
	err = h.phaseExecutionService.ConfigurePhase(c.Request.Context(), campaignID, phase, req.Config)

	if err != nil {
		log.Printf("Error configuring phase %s for campaign %s: %v", phase, campaignID, err)
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
			"Failed to configure phase", []ErrorDetail{
				{
					Code:    ErrorCodeInternalServer,
					Message: err.Error(),
				},
			})
		return
	}

	response := NewSuccessResponse(map[string]interface{}{
		"message":    fmt.Sprintf("Phase %s configured successfully", phase),
		"campaignId": campaignID.String(),
		"phase":      phase,
	}, getRequestID(c))
	respondWithJSONGin(c, http.StatusOK, response)
}

// startPhaseStandalone starts a specific phase using standalone services
// @Summary Start campaign phase (standalone)
// @Description Start a specific phase of a campaign using standalone services
// @Tags campaigns
// @ID startPhaseStandalone
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Param phase path string true "Phase name" Enums(domain-generation, dns-validation, http-validation)
// @Success 200 {object} APIResponse "Phase started successfully"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 404 {object} ErrorResponse "Campaign not found"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/{campaignId}/phases/{phase}/start [post]
func (h *CampaignOrchestratorAPIHandler) startPhaseStandalone(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	phase := c.Param("phase")

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

	log.Printf("Starting phase %s for campaign %s using standalone services", phase, campaignID)

	// Use the lead generation service to start phases
	// Phase 4.11: User-controlled phase execution with dual-mode support
	err = h.phaseExecutionService.StartPhase(c.Request.Context(), campaignID, phase)

	if err != nil {
		log.Printf("Error starting phase %s for campaign %s: %v", phase, campaignID, err)
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
			"Failed to start phase", []ErrorDetail{
				{
					Code:    ErrorCodeInternalServer,
					Message: err.Error(),
				},
			})
		return
	}

	response := NewSuccessResponse(map[string]interface{}{
		"message":    fmt.Sprintf("Phase %s started successfully", phase),
		"campaignId": campaignID.String(),
		"phase":      phase,
	}, getRequestID(c))
	respondWithJSONGin(c, http.StatusOK, response)
}

// getPhaseStatusStandalone gets status for a specific phase using standalone services
// @Summary Get phase status (standalone)
// @Description Get status information for a specific phase of a campaign using standalone services
// @Tags campaigns
// @ID getPhaseStatusStandalone
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Param phase path string true "Phase type" Enums(domain_generation, dns_validation, http_keyword_validation, analysis)
// @Success 200 {object} APIResponse "Phase status retrieved successfully"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 404 {object} ErrorResponse "Campaign or phase not found"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/{campaignId}/phases/{phase}/status [get]
func (h *CampaignOrchestratorAPIHandler) getPhaseStatusStandalone(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	phase := c.Param("phase")

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

	log.Printf("Getting status for phase %s of campaign %s using standalone services", phase, campaignID)

	// Get campaign from store to retrieve phase status and metadata
	campaign, err := h.campaignStore.GetCampaignByID(c.Request.Context(), h.db, campaignID)
	if err != nil {
		log.Printf("Error getting campaign %s: %v", campaignIDStr, err)
		if err.Error() == "record not found" {
			respondWithDetailedErrorGin(c, http.StatusNotFound, ErrorCodeNotFound,
				"Campaign not found", nil)
		} else {
			respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
				"Failed to get campaign", []ErrorDetail{
					{
						Code:    ErrorCodeInternalServer,
						Message: err.Error(),
					},
				})
		}
		return
	}

	// Build phase status response
	phaseStatus := map[string]interface{}{
		"campaignId":    campaignID.String(),
		"phase":         phase,
		"currentPhase":  getCurrentPhaseString(campaign),
		"phaseStatus":   getPhaseStatusString(campaign),
		"isReady":       false,
		"isConfigured":  false,
		"configuration": nil,
	}

	// Parse metadata to get phase configuration
	if campaign.Metadata != nil {
		var metadata map[string]interface{}
		if err := json.Unmarshal(*campaign.Metadata, &metadata); err == nil {
			phaseStatus["metadata"] = metadata

			// Check for phase-specific configuration
			configKey := fmt.Sprintf("%s_config", phase)
			if config, exists := metadata[configKey]; exists {
				phaseStatus["isConfigured"] = true
				phaseStatus["configuration"] = config
			}

			// Determine phase readiness based on current phase and phase status
			currentPhase := getCurrentPhaseString(campaign)
			phaseStatusEnum := getPhaseStatusString(campaign)

			switch phase {
			case "domain_generation":
				// Domain generation is ready if it's the current phase or already completed
				phaseStatus["isReady"] = (currentPhase == "domain_generation" || currentPhase != "setup")
			case "dns_validation":
				// DNS validation is ready if domain generation is completed
				phaseStatus["isReady"] = (currentPhase == "dns_validation" ||
					(currentPhase != "setup" && currentPhase != "domain_generation"))
			case "http_keyword_validation":
				// HTTP validation is ready if DNS validation is completed
				phaseStatus["isReady"] = (currentPhase == "http_keyword_validation" ||
					currentPhase == "analysis")
			case "analysis":
				// Analysis is ready if HTTP validation is completed
				phaseStatus["isReady"] = (currentPhase == "analysis")
			}

			// Override readiness if phase is already completed
			if phaseStatusEnum == "completed" {
				phaseStatus["isReady"] = true
			}
		}
	}

	// Include phase-specific results if available
	switch phase {
	case "domain_generation":
		if campaign.DomainsData != nil {
			var domainsData interface{}
			if err := json.Unmarshal(*campaign.DomainsData, &domainsData); err == nil {
				phaseStatus["results"] = domainsData
			}
		}
	case "dns_validation":
		if campaign.DNSResults != nil {
			var dnsResults interface{}
			if err := json.Unmarshal(*campaign.DNSResults, &dnsResults); err == nil {
				phaseStatus["results"] = dnsResults
			}
		}
	case "http_keyword_validation":
		if campaign.HTTPResults != nil {
			var httpResults interface{}
			if err := json.Unmarshal(*campaign.HTTPResults, &httpResults); err == nil {
				phaseStatus["results"] = httpResults
			}
		}
	case "analysis":
		if campaign.AnalysisResults != nil {
			var analysisResults interface{}
			if err := json.Unmarshal(*campaign.AnalysisResults, &analysisResults); err == nil {
				phaseStatus["results"] = analysisResults
			}
		}
	}

	response := NewSuccessResponse(phaseStatus, getRequestID(c))
	respondWithJSONGin(c, http.StatusOK, response)
}

// getCampaignProgressStandalone gets campaign progress using standalone services
// @Summary Get campaign progress (standalone)
// @Description Get campaign progress information using standalone services
// @Tags campaigns
// @ID getCampaignProgressStandalone
// @Produce json
// @Param campaignId path string true "Campaign ID (UUID)"
// @Success 200 {object} APIResponse "Campaign progress"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 404 {object} ErrorResponse "Campaign not found"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/{campaignId}/progress [get]
func (h *CampaignOrchestratorAPIHandler) getCampaignProgressStandalone(c *gin.Context) {
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

	// Get campaign from store directly
	campaign, err := h.campaignStore.GetCampaignByID(c.Request.Context(), h.db, campaignID)
	if err != nil {
		log.Printf("Error getting campaign %s: %v", campaignIDStr, err)
		if err.Error() == "record not found" {
			respondWithDetailedErrorGin(c, http.StatusNotFound, ErrorCodeNotFound,
				"Campaign not found", nil)
		} else {
			respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
				"Failed to get campaign", []ErrorDetail{
					{
						Code:    ErrorCodeInternalServer,
						Message: err.Error(),
					},
				})
		}
		return
	}

	progress := map[string]interface{}{
		"campaignId":   campaign.ID.String(),
		"name":         campaign.Name,
		"currentPhase": getCurrentPhaseString(campaign),
		"phaseStatus":  getPhaseStatusString(campaign),
		"totalItems":   getTotalItemsCount(campaign),
		"createdAt":    campaign.CreatedAt.Format(time.RFC3339),
		"updatedAt":    campaign.UpdatedAt.Format(time.RFC3339),
	}

	// Include bulk JSONB data for enterprise-scale processing
	if campaign.DomainsData != nil {
		var domainsData interface{}
		if err := json.Unmarshal(*campaign.DomainsData, &domainsData); err == nil {
			progress["domainsData"] = domainsData
		}
	}

	if campaign.DNSResults != nil {
		var dnsResults interface{}
		if err := json.Unmarshal(*campaign.DNSResults, &dnsResults); err == nil {
			progress["dnsResults"] = dnsResults
		}
	}

	if campaign.HTTPResults != nil {
		var httpResults interface{}
		if err := json.Unmarshal(*campaign.HTTPResults, &httpResults); err == nil {
			progress["httpResults"] = httpResults
		}
	}

	if campaign.AnalysisResults != nil {
		var analysisResults interface{}
		if err := json.Unmarshal(*campaign.AnalysisResults, &analysisResults); err == nil {
			progress["analysisResults"] = analysisResults
		}
	}

	// Include phase-centric progress information
	if campaign.OverallProgress != nil {
		progress["progress"] = *campaign.OverallProgress
	}
	if campaign.Domains != nil {
		progress["domains"] = *campaign.Domains
	}
	if campaign.Leads != nil {
		progress["leads"] = *campaign.Leads
	}
	if campaign.DNSValidatedDomains != nil {
		progress["dnsValidatedDomains"] = *campaign.DNSValidatedDomains
	}

	response := NewSuccessResponse(progress, getRequestID(c))
	respondWithJSONGin(c, http.StatusOK, response)
}

// getCampaignsStandalone lists all campaigns using standalone services
// @Summary List campaigns (standalone)
// @Description Get list of all campaigns with phase-centric bulk data
// @Tags campaigns
// @ID getCampaignsStandalone
// @Produce json
// @Success 200 {object} APIResponse "Campaigns retrieved successfully"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns [get]
func (h *CampaignOrchestratorAPIHandler) getCampaignsStandalone(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("user_id")
	if !exists {
		respondWithDetailedErrorGin(c, http.StatusUnauthorized, ErrorCodeUnauthorized,
			"User not authenticated", nil)
		return
	}

	userUUID, ok := userID.(uuid.UUID)
	if !ok {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid user ID", nil)
		return
	}

	// Get campaigns from store using filter
	filter := store.ListCampaignsFilter{
		UserID: userUUID.String(),
		Limit:  1000, // Default limit for campaign listing
	}

	campaigns, err := h.campaignStore.ListCampaigns(c.Request.Context(), h.db, filter)
	if err != nil {
		log.Printf("Error getting campaigns for user %s: %v", userUUID, err)
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
			"Failed to get campaigns", []ErrorDetail{
				{
					Code:    ErrorCodeInternalServer,
					Message: err.Error(),
				},
			})
		return
	}

	// Build response with bulk data for each campaign
	campaignList := make([]map[string]interface{}, 0, len(campaigns))
	for _, campaign := range campaigns {
		campaignData := map[string]interface{}{
			"campaignId":   campaign.ID.String(),
			"name":         campaign.Name,
			"currentPhase": getCurrentPhaseString(campaign),
			"phaseStatus":  getPhaseStatusString(campaign),
			"totalItems":   getTotalItemsCount(campaign),
			"createdAt":    campaign.CreatedAt.Format(time.RFC3339),
			"updatedAt":    campaign.UpdatedAt.Format(time.RFC3339),
		}

		// Include bulk JSONB data for enterprise-scale processing
		if campaign.DomainsData != nil {
			var domainsData interface{}
			if err := json.Unmarshal(*campaign.DomainsData, &domainsData); err == nil {
				campaignData["domainsData"] = domainsData
			}
		}

		if campaign.DNSResults != nil {
			var dnsResults interface{}
			if err := json.Unmarshal(*campaign.DNSResults, &dnsResults); err == nil {
				campaignData["dnsResults"] = dnsResults
			}
		}

		if campaign.HTTPResults != nil {
			var httpResults interface{}
			if err := json.Unmarshal(*campaign.HTTPResults, &httpResults); err == nil {
				campaignData["httpResults"] = httpResults
			}
		}

		if campaign.AnalysisResults != nil {
			var analysisResults interface{}
			if err := json.Unmarshal(*campaign.AnalysisResults, &analysisResults); err == nil {
				campaignData["analysisResults"] = analysisResults
			}
		}

		// Include phase-centric progress information
		if campaign.OverallProgress != nil {
			campaignData["progress"] = *campaign.OverallProgress
		}
		if campaign.Domains != nil {
			campaignData["domains"] = *campaign.Domains
		}
		if campaign.Leads != nil {
			campaignData["leads"] = *campaign.Leads
		}
		if campaign.DNSValidatedDomains != nil {
			campaignData["dnsValidatedDomains"] = *campaign.DNSValidatedDomains
		}

		campaignList = append(campaignList, campaignData)
	}

	response := NewSuccessResponse(campaignList, getRequestID(c))
	respondWithJSONGin(c, http.StatusOK, response)
}

// getBulkEnrichedCampaignData retrieves bulk enriched data for campaigns
// @Summary Get bulk enriched campaign data
// @Description Retrieve bulk enriched data across multiple campaigns for enterprise-scale processing
// @Tags campaigns
// @ID getBulkEnrichedCampaignData
// @Accept json
// @Produce json
// @Param request body BulkEnrichedDataRequest true "Bulk data request"
// @Success 200 {object} APIResponse "Bulk data retrieved successfully"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/bulk/enriched-data [post]
func (h *CampaignOrchestratorAPIHandler) getBulkEnrichedCampaignData(c *gin.Context) {
	var request BulkEnrichedDataRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid request payload", []ErrorDetail{
				{
					Field:   "request",
					Code:    ErrorCodeValidation,
					Message: err.Error(),
				},
			})
		return
	}

	// Get user from context
	userID, exists := c.Get("user_id")
	if !exists {
		respondWithDetailedErrorGin(c, http.StatusUnauthorized, ErrorCodeUnauthorized,
			"User not authenticated", nil)
		return
	}

	userUUID, ok := userID.(uuid.UUID)
	if !ok {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid user ID", nil)
		return
	}

	// Process bulk data request
	enrichedCampaigns := make(map[string]EnrichedCampaignData)

	// Convert campaign ID strings to UUIDs, skipping invalid ones
	campaignUUIDs := make([]uuid.UUID, 0, len(request.CampaignIDs))
	for _, campaignIDStr := range request.CampaignIDs {
		if campaignID, err := uuid.Parse(campaignIDStr); err == nil {
			campaignUUIDs = append(campaignUUIDs, campaignID)
		} else {
			log.Printf("Invalid campaign ID %s for bulk request: %v", campaignIDStr, err)
		}
	}

	// Single bulk query instead of N+1 individual queries
	campaigns, err := h.campaignStore.GetCampaignsByIDs(c.Request.Context(), h.db, campaignUUIDs)
	if err != nil {
		log.Printf("Error getting campaigns for bulk request: %v", err)
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeDatabaseError,
			"Failed to retrieve campaigns", nil)
		return
	}

	// Process each campaign from the bulk result
	for _, campaign := range campaigns {
		// Verify user owns this campaign
		if campaign.UserID == nil || *campaign.UserID != userUUID {
			continue // Skip campaigns user doesn't own
		}

		// Create phase enum pointers
		currentPhase := models.PhaseTypeEnum(getCurrentPhaseString(campaign))
		phaseStatus := models.PhaseStatusEnum(getPhaseStatusString(campaign))

		// Build progress map with bulk JSONB data
		progressData := make(map[string]interface{})

		// Include bulk JSONB data for enterprise-scale processing
		if campaign.DomainsData != nil {
			var domainsData interface{}
			if err := json.Unmarshal(*campaign.DomainsData, &domainsData); err == nil {
				progressData["domainsData"] = domainsData
			}
		}

		if campaign.DNSResults != nil {
			var dnsResults interface{}
			if err := json.Unmarshal(*campaign.DNSResults, &dnsResults); err == nil {
				progressData["dnsResults"] = dnsResults
			}
		}

		if campaign.HTTPResults != nil {
			var httpResults interface{}
			if err := json.Unmarshal(*campaign.HTTPResults, &httpResults); err == nil {
				progressData["httpResults"] = httpResults
			}
		}

		if campaign.AnalysisResults != nil {
			var analysisResults interface{}
			if err := json.Unmarshal(*campaign.AnalysisResults, &analysisResults); err == nil {
				progressData["analysisResults"] = analysisResults
			}
		}

		// Include phase-centric metrics
		if campaign.OverallProgress != nil {
			progressData["overallProgress"] = *campaign.OverallProgress
		}
		if campaign.Domains != nil {
			progressData["domains"] = *campaign.Domains
		}
		if campaign.Leads != nil {
			progressData["leads"] = *campaign.Leads
		}
		if campaign.DNSValidatedDomains != nil {
			progressData["dnsValidatedDomains"] = *campaign.DNSValidatedDomains
		}

		// Create enriched campaign data
		enrichedData := EnrichedCampaignData{
			Campaign: CampaignData{
				ID:           campaign.ID.String(),
				Name:         campaign.Name,
				CurrentPhase: &currentPhase,
				PhaseStatus:  &phaseStatus,
				CreatedAt:    campaign.CreatedAt.Format(time.RFC3339),
				UpdatedAt:    campaign.UpdatedAt.Format(time.RFC3339),
				Progress:     progressData,
			},
		}

		enrichedCampaigns[campaign.ID.String()] = enrichedData
	}

	response := BulkEnrichedDataResponse{
		Campaigns:  enrichedCampaigns,
		TotalCount: len(enrichedCampaigns),
	}

	apiResponse := NewSuccessResponse(response, getRequestID(c))
	respondWithJSONGin(c, http.StatusOK, apiResponse)
}

// getPatternOffset gets the current pattern offset for domain generation
// @Summary Get domain generation pattern offset
// @Description Get the current offset for domain generation patterns
// @Tags campaigns
// @ID getPatternOffset
// @Accept json
// @Produce json
// @Param request body PatternOffsetRequest true "Pattern offset request"
// @Success 200 {object} PatternOffsetResponse "Pattern offset retrieved successfully"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /campaigns/domain-generation/pattern-offset [post]
func (h *CampaignOrchestratorAPIHandler) getPatternOffset(c *gin.Context) {
	var req PatternOffsetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid request payload", []ErrorDetail{
				{
					Field:   "body",
					Code:    ErrorCodeValidation,
					Message: "Invalid pattern offset request: " + err.Error(),
				},
			})
		return
	}

	// Use domain expert to calculate pattern offset
	generator, err := domainexpert.NewDomainGenerator(
		domainexpert.CampaignPatternType(req.PatternType),
		req.VariableLength,
		req.CharacterSet,
		req.ConstantString,
		req.TLD,
	)
	if err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid domain generation parameters", []ErrorDetail{
				{
					Code:    ErrorCodeValidation,
					Message: err.Error(),
				},
			})
		return
	}

	// Get actual current offset using simplified direct database query
	totalCombinations := generator.GetTotalCombinations()

	// Generate config hash to lookup existing offset - same logic as CreateCampaign
	tempGenParams := models.DomainGenerationCampaignParams{
		PatternType:    req.PatternType,
		VariableLength: req.VariableLength,
		CharacterSet:   req.CharacterSet,
		ConstantString: models.StringPtr(req.ConstantString),
		TLD:            req.TLD,
	}

	hashResult, hashErr := domainexpert.GenerateDomainGenerationPhaseConfigHash(tempGenParams)
	if hashErr != nil {
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
			"Failed to generate config hash", []ErrorDetail{
				{
					Code:    ErrorCodeInternalServer,
					Message: "Could not generate configuration hash: " + hashErr.Error(),
				},
			})
		return
	}

	configHashString := hashResult.HashString
	var currentOffset int64 = 0

	// Query existing offset from campaign store if available
	if h.campaignStore != nil {
		ctx := c.Request.Context()

		// Get existing config state directly from campaign store
		if configState, err := h.campaignStore.GetDomainGenerationPhaseConfigStateByHash(ctx, h.db, configHashString); err == nil && configState != nil {
			// Check if there are any active campaigns using this pattern
			countQuery := `
				SELECT COUNT(DISTINCT dgcp.campaign_id)
				FROM domain_generation_campaign_params dgcp
				INNER JOIN campaigns c ON c.id = dgcp.campaign_id
				WHERE c.current_phase = 'generation'
				AND dgcp.pattern_type = $1
				AND dgcp.variable_length = $2
				AND dgcp.character_set = $3
				AND COALESCE(dgcp.constant_string, '') = $4
				AND dgcp.tld = $5
			`
			var existingCampaignCount int
			if countErr := h.db.GetContext(ctx, &existingCampaignCount, countQuery,
				req.PatternType, req.VariableLength, req.CharacterSet, req.ConstantString, req.TLD); countErr == nil {

				if existingCampaignCount == 0 {
					currentOffset = 0 // Reset to 0 when no existing campaigns
				} else {
					currentOffset = configState.LastOffset
				}
			}
		}
	}

	response := PatternOffsetResponse{
		PatternType:               req.PatternType,
		VariableLength:            req.VariableLength,
		CharacterSet:              req.CharacterSet,
		ConstantString:            req.ConstantString,
		TLD:                       req.TLD,
		CurrentOffset:             currentOffset,
		TotalPossibleCombinations: totalCombinations,
	}

	respondWithJSONGin(c, http.StatusOK, response)
}
