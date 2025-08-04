// File: backend/internal/api/bulk_domains_handlers.go
package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/application"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// BulkDomainsAPIHandler handles enterprise-scale bulk domain operations
type BulkDomainsAPIHandler struct {
	orchestrator *application.CampaignOrchestrator
}

// NewBulkDomainsAPIHandler creates a new bulk domains API handler
func NewBulkDomainsAPIHandler(orchestrator *application.CampaignOrchestrator) *BulkDomainsAPIHandler {
	return &BulkDomainsAPIHandler{
		orchestrator: orchestrator,
	}
}

// @Summary Generate domains in bulk using orchestrator
// @Description Generate large batches of domains with stealth-aware configuration and resource management
// @Tags bulk-operations,domains
// @ID bulkGenerateDomains
// @Accept json
// @Produce json
// @Param request body models.BulkDomainGenerationRequest true "Bulk domain generation request"
// @Success 200 {object} models.BulkDomainGenerationResponse "Domains generated successfully"
// @Success 202 {object} models.BulkDomainGenerationResponse "Operation accepted and processing"
// @Failure 400 {object} APIResponse "Bad Request - Invalid configuration"
// @Failure 429 {object} APIResponse "Rate Limited - Too many concurrent operations"
// @Failure 500 {object} APIResponse "Internal Server Error"
// @Router /campaigns/bulk/domains/generate [post]
func (h *BulkDomainsAPIHandler) BulkGenerateDomains(c *gin.Context) {
	var request models.BulkDomainGenerationRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    ErrorCodeBadRequest,
				Message: "Invalid request format",
				Details: []ErrorDetail{{
					Code:    ErrorCodeValidation,
					Message: err.Error(),
				}},
				Timestamp: time.Now(),
			},
		})
		return
	}

	// Validate operations count
	if len(request.Operations) > 100 {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    ErrorCodeValidation,
				Message: "Too many operations requested",
				Details: []ErrorDetail{{
					Field:   "operations",
					Code:    ErrorCodeValidation,
					Message: "Maximum 100 operations allowed per bulk request",
				}},
				Timestamp: time.Now(),
			},
		})
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

	// Return appropriate HTTP status
	if status == "failed" {
		c.JSON(http.StatusInternalServerError, response)
	} else if status == "partial" {
		c.JSON(http.StatusPartialContent, response)
	} else {
		c.JSON(http.StatusOK, response)
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
	if op.Config != nil {
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
