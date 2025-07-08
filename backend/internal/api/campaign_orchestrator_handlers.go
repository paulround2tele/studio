// File: backend/internal/api/campaign_orchestrator_handlers.go
package api

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

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
	orchestratorService   services.CampaignOrchestratorService
	domainValidationSvc   services.DomainValidationService    // Domain-centric DNS validation
	httpKeywordSvc        services.HTTPKeywordCampaignService // Domain-centric HTTP validation
	campaignStore         store.CampaignStore // Direct access needed for pattern offset queries
	broadcaster           websocket.Broadcaster  // WebSocket broadcaster for real-time updates
}

// NewCampaignOrchestratorAPIHandler creates a new handler for campaign orchestration.
func NewCampaignOrchestratorAPIHandler(orchService services.CampaignOrchestratorService, domainValidationSvc services.DomainValidationService, httpKeywordSvc services.HTTPKeywordCampaignService, campaignStore store.CampaignStore, broadcaster websocket.Broadcaster) *CampaignOrchestratorAPIHandler {
	return &CampaignOrchestratorAPIHandler{
		orchestratorService: orchService,
		domainValidationSvc: domainValidationSvc,
		httpKeywordSvc:      httpKeywordSvc,
		campaignStore:       campaignStore,
		broadcaster:         broadcaster,
	}
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
func (h *CampaignOrchestratorAPIHandler) RegisterCampaignOrchestrationRoutes(group *gin.RouterGroup, authMiddleware *middleware.AuthMiddleware) {
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

	// Campaign modification routes - session-based auth
	group.PUT("/:campaignId", h.updateCampaign)

	// Campaign deletion routes - session-based auth
	group.DELETE("/:campaignId", h.deleteCampaign)
	group.DELETE("", h.bulkDeleteCampaigns)

	// Campaign results routes - session-based auth
	group.GET("/:campaignId/results/generated-domains", h.getGeneratedDomains)
	group.GET("/:campaignId/results/dns-validation", h.getDNSValidationResults)
	group.GET("/:campaignId/results/http-keyword", h.getHTTPKeywordResults)

	// Domain generation utilities - session-based auth
	group.POST("/domain-generation/pattern-offset", h.getPatternOffset)
}

// --- Unified Campaign Creation Handler ---

// createCampaign creates a new campaign.
func (h *CampaignOrchestratorAPIHandler) createCampaign(c *gin.Context) {
	var req services.CreateCampaignRequest
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

	// Validate that appropriate params are provided for the campaign type
	if err := h.validateCampaignRequest(req); err != nil {
		var validationErrors []ErrorDetail
		validationErrors = append(validationErrors, ErrorDetail{
			Code:    ErrorCodeValidation,
			Message: err.Error(),
		})
		respondWithValidationErrorGin(c, validationErrors)
		return
	}

	// Create campaign using the orchestrator service
	campaign, err := h.orchestratorService.CreateCampaignUnified(c.Request.Context(), req)
	if err != nil {
		log.Printf("Error creating campaign: %v", err)
		// Use detailed error response with appropriate error code
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
			"Failed to create campaign", []ErrorDetail{
				{
					Code:    ErrorCodeInternalServer,
					Message: err.Error(),
					Context: map[string]interface{}{
						"campaign_type": req.CampaignType,
					},
				},
			})
		return
	}

	// Broadcast campaign creation to WebSocket clients
	websocket.BroadcastCampaignCreated(campaign.ID.String(), campaign)
	log.Printf("Campaign created and broadcasted: %s", campaign.ID)

	respondWithJSONGin(c, http.StatusCreated, campaign)
}

// validateCampaignRequest ensures appropriate parameters are provided for each campaign type
func (h *CampaignOrchestratorAPIHandler) validateCampaignRequest(req services.CreateCampaignRequest) error {
	switch req.CampaignType {
	case "domain_generation":
		if req.DomainGenerationParams == nil {
			return fmt.Errorf("domainGenerationParams required for domain_generation campaigns")
		}
		if req.DnsValidationParams != nil || req.HttpKeywordParams != nil {
			return fmt.Errorf("only domainGenerationParams should be provided for domain_generation campaigns")
		}
	case "dns_validation":
		if req.DnsValidationParams == nil {
			return fmt.Errorf("dnsValidationParams required for dns_validation campaigns")
		}
		if req.DomainGenerationParams != nil || req.HttpKeywordParams != nil {
			return fmt.Errorf("only dnsValidationParams should be provided for dns_validation campaigns")
		}
	case "http_keyword_validation":
		if req.HttpKeywordParams == nil {
			return fmt.Errorf("httpKeywordParams required for http_keyword_validation campaigns")
		}
		if req.DomainGenerationParams != nil || req.DnsValidationParams != nil {
			return fmt.Errorf("only httpKeywordParams should be provided for http_keyword_validation campaigns")
		}
	default:
		return fmt.Errorf("unsupported campaign type: %s", req.CampaignType)
	}
	return nil
}

// updateCampaign updates an existing campaign's configuration for DNS validation transition
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

	var req services.UpdateCampaignRequest
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
						Context: map[string]interface{}{
							"campaign_id": campaignID,
						},
					},
				})
		} else {
			respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
				"Failed to update campaign", []ErrorDetail{
					{
						Code:    ErrorCodeInternalServer,
						Message: err.Error(),
						Context: map[string]interface{}{
							"campaign_id": campaignID,
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

	statusFilter := models.CampaignStatusEnum(c.Query("status"))
	typeFilter := models.CampaignTypeEnum(c.Query("type"))

	filter := store.ListCampaignsFilter{
		Limit:  limit,
		Offset: offset,
		Status: statusFilter,
		Type:   typeFilter,
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

// getCampaignDetails gets a campaign by ID.
func (h *CampaignOrchestratorAPIHandler) getCampaignDetails(c *gin.Context) {
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid campaign ID format")
		return
	}

	baseCampaign, params, err := h.orchestratorService.GetCampaignDetails(c.Request.Context(), campaignID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			respondWithErrorGin(c, http.StatusNotFound, "Campaign not found")
		} else {
			log.Printf("Error getting campaign details for %s: %v", campaignIDStr, err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to get campaign details")
		}
		return
	}

	// Combine base campaign and specific params into a single response DTO
	type CampaignDetailsResponse struct { // Corrected 'ype' to 'type'
		*models.Campaign
		Params interface{} `json:"params"`
	}
	resp := CampaignDetailsResponse{
		Campaign: baseCampaign,
		Params:   params,
	}
	respondWithJSONGin(c, http.StatusOK, resp)
}

// --- Campaign Control Handlers ---

// startCampaign starts a campaign.
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
						Context: map[string]interface{}{
							"campaign_id": campaignID,
						},
					},
				})
		} else {
			respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
				"Failed to start campaign", nil)
		}
		return
	}

	respondWithJSONGin(c, http.StatusOK, map[string]interface{}{
		"message":     "Campaign queued for start",
		"campaign_id": campaignID,
	})
}

// pauseCampaign pauses a campaign.
func (h *CampaignOrchestratorAPIHandler) pauseCampaign(c *gin.Context) {
	h.handleCampaignOperation(c, "pausing", h.orchestratorService.PauseCampaign)
}

// resumeCampaign resumes a campaign.
func (h *CampaignOrchestratorAPIHandler) resumeCampaign(c *gin.Context) {
	h.handleCampaignOperation(c, "resuming", h.orchestratorService.ResumeCampaign)
}

// cancelCampaign cancels a campaign.
func (h *CampaignOrchestratorAPIHandler) cancelCampaign(c *gin.Context) {
	h.handleCampaignOperation(c, "cancelling", h.orchestratorService.CancelCampaign)
}

// deleteCampaign deletes a campaign.
func (h *CampaignOrchestratorAPIHandler) deleteCampaign(c *gin.Context) {
	h.handleCampaignOperation(c, "deleting", h.orchestratorService.DeleteCampaign)
}

// BulkDeleteRequest represents the request payload for bulk delete operations
type BulkDeleteRequest struct {
	CampaignIDs []string `json:"campaignIds" validate:"required,min=1,dive,uuid"`
}

// bulkDeleteCampaigns deletes multiple campaigns at once.
func (h *CampaignOrchestratorAPIHandler) bulkDeleteCampaigns(c *gin.Context) {
	var req BulkDeleteRequest
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
						Context: map[string]interface{}{
							"provided_value": idStr,
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
					Context: map[string]interface{}{
						"campaign_count": len(campaignUUIDs),
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

	respondWithJSONGin(c, http.StatusOK, map[string]interface{}{
		"message":           "Bulk deletion completed",
		"total_requested":   len(campaignUUIDs),
		"successfully_deleted": result.SuccessfullyDeleted,
		"failed_deletions":  result.FailedDeletions,
		"deleted_campaign_ids": result.DeletedCampaignIDs,
	})
}

// getGeneratedDomains gets generated domains for a campaign.
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

	log.Printf("INFO [DNS Validation]: Starting domain-centric DNS validation for campaign %s", campaignID)

	// For now, we'll need to provide persona IDs. In a production system, these could be:
	// 1. Retrieved from campaign configuration if it was a DNS validation campaign
	// 2. Retrieved from system defaults
	// 3. Made configurable via request body
	// For this fix, we'll use an empty slice to let the service handle defaults
	var personaIDs []uuid.UUID

	// Use the domain-centric validation service to validate all domains for this campaign
	if err := h.domainValidationSvc.StartDNSValidation(c.Request.Context(), campaignID, personaIDs); err != nil {
		log.Printf("ERROR [DNS Validation]: Failed to start DNS validation for campaign %s: %v", campaignIDStr, err)

		// Handle different error types
		if err.Error() == "record not found" || err.Error() == "campaign not found" {
			respondWithDetailedErrorGin(c, http.StatusNotFound, ErrorCodeNotFound,
				"Campaign not found", nil)
		} else if err.Error() == "no domains found for campaign" {
			respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
				"No domains found for DNS validation", []ErrorDetail{
					{
						Code:    ErrorCodeValidation,
						Message: "Campaign must have generated domains before DNS validation can be performed",
						Context: map[string]interface{}{
							"campaign_id": campaignID,
						},
					},
				})
		} else {
			respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
				"Failed to start DNS validation", []ErrorDetail{
					{
						Code:    ErrorCodeInternalServer,
						Message: err.Error(),
						Context: map[string]interface{}{
							"campaign_id": campaignID,
						},
					},
				})
		}
		return
	}

	log.Printf("SUCCESS [DNS Validation]: DNS validation started successfully for campaign %s", campaignID)

	respondWithJSONGin(c, http.StatusOK, map[string]interface{}{
		"message":     "DNS validation started successfully",
		"campaign_id": campaignID,
		"status":      "validation_in_progress",
	})
}

// validateHTTPForCampaign triggers domain-centric HTTP keyword validation for all domains in a campaign.
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

	// Create HTTP keyword campaign request
	createReq := services.CreateHTTPKeywordCampaignRequest{
		Name:                     fmt.Sprintf("HTTP Validation for Campaign %s", campaignIDStr),
		SourceCampaignID:         campaignID,
		KeywordSetIDs:            req.KeywordSetIDs,
		AdHocKeywords:            req.AdHocKeywords,
		PersonaIDs:               req.PersonaIDs,
		ProxyPoolID:              req.ProxyPoolID,
		ProxySelectionStrategy:   "round_robin", // Default strategy
		RotationIntervalSeconds:  0,             // Default
		ProcessingSpeedPerMinute: derefIntPtr(req.ProcessingSpeedPerMinute, 60),
		BatchSize:                derefIntPtr(req.BatchSize, 20),
		RetryAttempts:            derefIntPtr(req.RetryAttempts, 1),
		TargetHTTPPorts:          req.TargetHTTPPorts,
		UserID:                   uuid.Nil, // Would be extracted from session in real implementation
	}

	// Create the HTTP keyword campaign using the service
	httpCampaign, err := h.httpKeywordSvc.CreateCampaign(c.Request.Context(), createReq)
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
						Context: map[string]interface{}{
							"campaign_id": campaignID,
						},
					},
				})
		} else {
			respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
				"Failed to start HTTP validation", []ErrorDetail{
					{
						Code:    ErrorCodeInternalServer,
						Message: err.Error(),
						Context: map[string]interface{}{
							"campaign_id": campaignID,
						},
					},
				})
		}
		return
	}

	log.Printf("SUCCESS [HTTP Validation]: HTTP keyword validation campaign created successfully for source %s, new campaign ID: %s", campaignID, httpCampaign.ID)

	respondWithJSONGin(c, http.StatusOK, map[string]interface{}{
		"message":            "HTTP keyword validation started successfully",
		"source_campaign_id": campaignID,
		"new_campaign_id":    httpCampaign.ID,
		"status":             "validation_in_progress",
	})
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
						Context: map[string]interface{}{
							"campaign_id": campaignID,
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

	respondWithJSONGin(c, http.StatusOK, map[string]interface{}{
		"message":     message,
		"campaign_id": campaignID,
	})
}

// PatternOffsetRequest represents the request to get pattern offset
type PatternOffsetRequest struct {
	PatternType     string `json:"patternType" binding:"required" validate:"oneof=prefix suffix both"`
	VariableLength  int    `json:"variableLength" binding:"required,min=1"`
	CharacterSet    string `json:"characterSet" binding:"required"`
	ConstantString  string `json:"constantString" binding:"required"`
	TLD             string `json:"tld" binding:"required"`
}

// PatternOffsetResponse represents the pattern offset response
type PatternOffsetResponse struct {
	PatternType                string `json:"patternType"`
	VariableLength             int    `json:"variableLength"`
	CharacterSet               string `json:"characterSet"`
	ConstantString             string `json:"constantString"`
	TLD                        string `json:"tld"`
	CurrentOffset              int64  `json:"currentOffset"`
	TotalPossibleCombinations  int64  `json:"totalPossibleCombinations"`
}

// getPatternOffset handles POST /campaigns/domain-generation/pattern-offset
// Uses existing domain_generation_config_states system to get current offset for a pattern
func (h *CampaignOrchestratorAPIHandler) getPatternOffset(c *gin.Context) {
	var req PatternOffsetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid request: %v", err)})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate pattern hash"})
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
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get pattern offset"})
			return
		}
		// If no state exists yet, offset remains 0
		log.Printf("DEBUG [Pattern Offset]: No existing config state found for hash %s - returning offset 0", hashResult.HashString)
	} else {
		currentOffset = configState.LastOffset
		log.Printf("DEBUG [Pattern Offset]: Found existing config state for hash %s with offset %d", hashResult.HashString, currentOffset)
	}

	// Return only the currentOffset as expected by frontend
	response := gin.H{
		"currentOffset": currentOffset,
	}

	c.JSON(http.StatusOK, response)
}
