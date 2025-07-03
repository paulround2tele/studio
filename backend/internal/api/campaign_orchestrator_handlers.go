// File: backend/internal/api/campaign_orchestrator_handlers.go
package api

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/fntelecomllc/studio/backend/internal/middleware"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CampaignOrchestratorAPIHandler holds dependencies for campaign orchestration API endpoints.
type CampaignOrchestratorAPIHandler struct {
	orchestratorService services.CampaignOrchestratorService
	// No direct store access needed here, orchestrator service handles it.
}

// NewCampaignOrchestratorAPIHandler creates a new handler for campaign orchestration.
func NewCampaignOrchestratorAPIHandler(orchService services.CampaignOrchestratorService) *CampaignOrchestratorAPIHandler {
	return &CampaignOrchestratorAPIHandler{orchestratorService: orchService}
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

	// Campaign modification routes - session-based auth
	// group.PUT("/:campaignId", h.updateCampaign)

	// Campaign deletion routes - session-based auth
	group.DELETE("/:campaignId", h.deleteCampaign)
	group.DELETE("", h.bulkDeleteCampaigns)

	// Campaign results routes - session-based auth
	group.GET("/:campaignId/results/generated-domains", h.getGeneratedDomains)
	group.GET("/:campaignId/results/dns-validation", h.getDNSValidationResults)
	group.GET("/:campaignId/results/http-keyword", h.getHTTPKeywordResults)
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
