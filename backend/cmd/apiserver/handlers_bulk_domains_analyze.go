package main

import (
	"context"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/models"
)

// BulkAnalyzeDomains implements POST /campaigns/bulk/domains/analyze
func (h *strictHandlers) BulkAnalyzeDomains(ctx context.Context, r gen.BulkAnalyzeDomainsRequestObject) (gen.BulkAnalyzeDomainsResponseObject, error) {
	if r.Body == nil {
		return gen.BulkAnalyzeDomains500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{
			Error:     gen.ApiError{Code: gen.INTERNALSERVERERROR, Message: "missing request body", Timestamp: time.Now()},
			RequestId: reqID(),
			Success:   boolPtr(false),
		}}, nil
	}

	// Track this analytics request as a bulk operation (analysis phase)
	opID := h.deps.BulkOps.NewOperation(BulkOpAnalysis, r.Body.CampaignIds)

	// Aggregate simple, real metrics from the store and orchestrator
	var totalDomains int64
	var totalValidDNS int64
	processedCampaigns := 0
	for _, cid := range r.Body.CampaignIds {
		if h.deps.Stores.Campaign != nil && h.deps.DB != nil {
			if n, err := h.deps.Stores.Campaign.CountGeneratedDomainsByCampaign(ctx, h.deps.DB, cid); err == nil {
				totalDomains += n
			}
			if dnsOK, err := h.deps.Stores.Campaign.CountDNSValidationResults(ctx, h.deps.DB, cid, true); err == nil {
				totalValidDNS += dnsOK
			}
		}
		if h.deps.Orchestrator != nil {
			if st, err := h.deps.Orchestrator.GetPhaseStatus(ctx, cid, models.PhaseTypeAnalysis); err == nil && st != nil {
				if st.Status == models.PhaseStatusCompleted {
					processedCampaigns++
				}
			}
		}
	}

	// Overall success rate as fraction of DNS-valid domains to total generated domains
	var overallSuccess *float32
	if totalDomains > 0 {
		rate := float32(float64(totalValidDNS) / float64(totalDomains))
		overallSuccess = &rate
	}

	// Map tracker status to response enum
	_, aggStatus, _, _ := h.deps.BulkOps.Aggregate(ctx, h.deps.Orchestrator, opID)
	var respStatus gen.BulkAnalyticsResponseStatus
	switch aggStatus {
	case BulkStatusCompleted:
		respStatus = gen.BulkAnalyticsResponseStatusCompleted
	case BulkStatusRunning:
		respStatus = gen.BulkAnalyticsResponseStatusRunning
	case BulkStatusPending:
		respStatus = gen.BulkAnalyticsResponseStatusPending
	default:
		// No explicit failed/cancelled in schema; treat as pending
		respStatus = gen.BulkAnalyticsResponseStatusPending
	}

	eta := time.Now().Add(10 * time.Minute)
	totalCampaigns := len(r.Body.CampaignIds)

	analytics := &struct {
		OverallSuccessRate *float32 `json:"overallSuccessRate,omitempty"`
		PerformanceMetrics *struct {
			AvgLeadScore    *float32 `json:"avgLeadScore,omitempty"`
			AvgResponseTime *float32 `json:"avgResponseTime,omitempty"`
			ConversionRate  *float32 `json:"conversionRate,omitempty"`
		} `json:"performanceMetrics,omitempty"`
		TopPerformingTLDs *[]struct {
			Domains     *int     `json:"domains,omitempty"`
			Leads       *int     `json:"leads,omitempty"`
			Rank        *int     `json:"rank,omitempty"`
			SuccessRate *float32 `json:"successRate,omitempty"`
			Tld         *string  `json:"tld,omitempty"`
		} `json:"topPerformingTLDs,omitempty"`
		TotalCampaigns *int `json:"totalCampaigns,omitempty"`
		TotalDomains   *int `json:"totalDomains,omitempty"`
		TotalLeads     *int `json:"totalLeads,omitempty"`
	}{
		OverallSuccessRate: overallSuccess,
		// Performance metrics and TLD breakdowns are not yet implemented
		TotalCampaigns: intPtr(totalCampaigns),
		TotalDomains:   intPtr(int(totalDomains)),
	}

	resp := gen.BulkAnalyticsResponse{
		Analytics:           analytics,
		EstimatedCompletion: &eta,
		OperationId:         opID,
		ProcessedCampaigns:  processedCampaigns,
		Status:              respStatus,
	}

	return gen.BulkAnalyzeDomains200JSONResponse(resp), nil
}

func float32Ptr(v float32) *float32 { return &v }
func intPtr(v int) *int             { return &v }
