//go:build legacy_gin
// +build legacy_gin

// File: backend/internal/api/bulk_domains_handlers.go
package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/application"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// BulkDomainsAPIHandler handles enterprise-scale bulk domain operations
type BulkDomainsAPIHandler struct {
	orchestrator *application.CampaignOrchestrator
	sseService   *services.SSEService
}

// NewBulkDomainsAPIHandler creates a new bulk domains API handler
func NewBulkDomainsAPIHandler(orchestrator *application.CampaignOrchestrator, sseService *services.SSEService) *BulkDomainsAPIHandler {
	return &BulkDomainsAPIHandler{
		orchestrator: orchestrator,
		sseService:   sseService,
	}
}

func (h *BulkDomainsAPIHandler) BulkGenerateDomains(c *gin.Context) {
	var request models.BulkDomainGenerationRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, NewErrorResponse(ErrorCodeBadRequest,
			"Invalid request format: "+err.Error(), getRequestID(c), c.Request.URL.Path))
		return
	}

	// Validate operations count
	if len(request.Operations) > 100 {
		c.JSON(http.StatusBadRequest, NewErrorResponse(ErrorCodeValidation,
			"Too many operations requested: maximum 100 operations allowed per bulk request", getRequestID(c), c.Request.URL.Path))
		return
	}

	// Generate operation ID for tracking
	operationID := uuid.New().String()
	startTime := time.Now()

	results := make(map[string]models.DomainGenerationResult)
	var totalGenerated, totalRequested int64
	successfulOps := 0
	failedOps := 0

	// Process each domain generation operation
	for _, op := range request.Operations {
		operationKey := uuid.New().String()
		totalRequested += int64(op.MaxDomains)

		// Broadcast domain generation start event via SSE
		h.sseService.BroadcastEvent(services.SSEEvent{
			ID:    uuid.New().String(),
			Event: services.SSEEventPhaseStarted,
			Data: map[string]interface{}{
				"phase":       "domain_generation",
				"campaign_id": op.CampaignID.String(),
				"operation":   "bulk_generation",
				"max_domains": op.MaxDomains,
				"start_from":  op.StartFrom,
			},
			Timestamp:  time.Now(),
			CampaignID: &op.CampaignID,
		})

		// Execute domain generation through orchestrator
		domainsGenerated, err := h.executeDomainGeneration(c.Request.Context(), op)

		result := models.DomainGenerationResult{
			CampaignID:       op.CampaignID,
			DomainsGenerated: domainsGenerated,
			StartOffset:      op.StartFrom,
			EndOffset:        op.StartFrom + int64(domainsGenerated),
			Success:          err == nil,
			Duration:         time.Since(startTime).Milliseconds(),
		}

		// Broadcast domain generation progress update via SSE
		h.sseService.BroadcastEvent(services.SSEEvent{
			ID:    uuid.New().String(),
			Event: services.SSEEventDomainGenerated,
			Data: map[string]interface{}{
				"campaign_id":       op.CampaignID.String(),
				"domains_generated": domainsGenerated,
				"operation":         "bulk_generation",
				"success":           err == nil,
			},
			Timestamp:  time.Now(),
			CampaignID: &op.CampaignID,
		})

		if err != nil {
			result.Error = err.Error()
			failedOps++
		} else {
			successfulOps++
			totalGenerated += int64(domainsGenerated)
		}

		results[operationKey] = result

		// Stop processing if too many failures for safety
		if failedOps > len(request.Operations)/2 {
			break
		}
	}

	// Determine operation status
	var status string
	if failedOps == 0 {
		status = "completed"
	} else if successfulOps == 0 {
		status = "failed"
	} else {
		status = "partial"
	}

	response := models.BulkDomainGenerationResponse{
		Operations:     results,
		TotalGenerated: totalGenerated,
		TotalRequested: totalRequested,
		SuccessfulOps:  successfulOps,
		FailedOps:      failedOps,
		ProcessingTime: time.Since(startTime).Milliseconds(),
		OperationID:    operationID,
		Status:         status,
	}

	// Use envelope-level metadata for consistency with database handlers
	bulkInfo := &BulkOperationInfo{
		ProcessedItems:   len(request.Operations),
		SkippedItems:     failedOps,
		ProcessingTimeMs: time.Since(startTime).Milliseconds(),
	}

	requestID := getRequestID(c)
	envelope := NewSuccessResponse(response, requestID).WithMetadata(&Metadata{
		Bulk: bulkInfo,
	})

	// Return appropriate HTTP status with unified envelope (no more 206 abuse!)
	if status == "failed" {
		respondWithErrorGin(c, http.StatusInternalServerError, "Domain generation operation failed")
	} else {
		// Use 200 OK for both partial and complete success, status is in the response body
		c.Header("X-Request-ID", requestID)
		c.JSON(http.StatusOK, envelope)
	}
}

// executeDomainGeneration executes domain generation for a single campaign
func (h *BulkDomainsAPIHandler) executeDomainGeneration(ctx context.Context, op models.DomainGenerationOperation) (int, error) {
	// Configure domain generation phase
	domainConfig := map[string]interface{}{
		"max_domains":    op.MaxDomains,
		"start_from":     op.StartFrom,
		"batch_size":     1000, // Process domains in batches of 1k
		"quality_filter": true,
	}

	// Merge the operation config if provided
	if op.Config.PatternBased != nil || op.Config.CustomLogic != nil {
		// Config contains DomainGenerationPhaseConfig
		domainConfig["operation_config"] = op.Config
	}

	// Configure the domain generation phase
	configErr := h.orchestrator.ConfigurePhase(ctx, op.CampaignID, models.PhaseTypeDomainGeneration, domainConfig)
	if configErr != nil {
		return 0, fmt.Errorf("failed to configure domain generation: %w", configErr)
	}

	// Start domain generation phase
	startErr := h.orchestrator.StartPhase(ctx, op.CampaignID, "domain_generation")
	if startErr != nil {
		return 0, fmt.Errorf("failed to start domain generation: %w", startErr)
	}

	// For bulk operations, return expected count (actual count will be updated via SSE)
	// This provides immediate feedback while the orchestrator processes asynchronously
	expectedDomains := op.MaxDomains
	if expectedDomains > 10000 {
		expectedDomains = 10000 // Cap at 10k for safety in bulk operations
	}
	if expectedDomains <= 0 {
		expectedDomains = 1000 // Default generation count
	}

	return expectedDomains, nil
}
