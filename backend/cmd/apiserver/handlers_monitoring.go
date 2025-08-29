package main

import (
	"context"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/monitoring"
	"github.com/google/uuid"
)

func (h *strictHandlers) MonitoringCampaignHealth(ctx context.Context, r gen.MonitoringCampaignHealthRequestObject) (gen.MonitoringCampaignHealthResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringCampaignHealth401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	integ := monitoring.GetGlobalMonitoringIntegration()
	if integ == nil {
		return gen.MonitoringCampaignHealth500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "monitoring integration unavailable", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	hres := integ.GetCampaignHealth(uuid.UUID(r.CampaignId))
	data := toMap(hres)
	return gen.MonitoringCampaignHealth200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringCampaignLimits(ctx context.Context, r gen.MonitoringCampaignLimitsRequestObject) (gen.MonitoringCampaignLimitsResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringCampaignLimits401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.MonitoringCampaignLimits400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var maxCPU float64 = 0
	if r.Body.MaxCPUPercent != nil {
		maxCPU = float64(*r.Body.MaxCPUPercent)
	}
	var maxMem uint64 = 0
	if r.Body.MaxMemoryMB != nil && *r.Body.MaxMemoryMB > 0 {
		maxMem = uint64(*r.Body.MaxMemoryMB) * 1024 * 1024
	}
	var maxDisk uint64 = 0
	if r.Body.MaxDiskMB != nil && *r.Body.MaxDiskMB > 0 {
		maxDisk = uint64(*r.Body.MaxDiskMB) * 1024 * 1024
	}
	maxDuration := 0
	if r.Body.MaxDurationSeconds != nil {
		maxDuration = *r.Body.MaxDurationSeconds
	}
	monitoring.GetGlobalMonitoringIntegration().SetCampaignResourceLimits(uuid.UUID(r.CampaignId), maxCPU, maxMem, maxDisk, maxDuration)
	return gen.MonitoringCampaignLimits200Response{}, nil
}

func (h *strictHandlers) MonitoringCampaignPerformance(ctx context.Context, r gen.MonitoringCampaignPerformanceRequestObject) (gen.MonitoringCampaignPerformanceResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringCampaignPerformance401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	limit := 100
	metrics := h.deps.Monitoring.PerformanceTracker.GetRecentMetrics(limit)
	campID := uuid.UUID(r.CampaignId)
	filtered := make([]monitoring.PerformanceMetric, 0)
	for _, m := range metrics {
		if m.CampaignID != nil && *m.CampaignID == campID {
			filtered = append(filtered, m)
		}
	}
	data := toMap(filtered)
	return gen.MonitoringCampaignPerformance200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringCampaignResources(ctx context.Context, r gen.MonitoringCampaignResourcesRequestObject) (gen.MonitoringCampaignResourcesResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringCampaignResources401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	usage, ok := h.deps.Monitoring.GetCampaignResourceUsage(uuid.UUID(r.CampaignId))
	if !ok || usage == nil {
		return gen.MonitoringCampaignResources404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found or no resource data", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	data := toMap(usage)
	return gen.MonitoringCampaignResources200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringCampaignGeneric(ctx context.Context, r gen.MonitoringCampaignGenericRequestObject) (gen.MonitoringCampaignGenericResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringCampaignGeneric401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	campID := uuid.UUID(r.CampaignId)
	integ := monitoring.GetGlobalMonitoringIntegration()
	if integ == nil {
		return gen.MonitoringCampaignGeneric500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "monitoring integration unavailable", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	health := integ.GetCampaignHealth(campID)
	usage, _ := h.deps.Monitoring.GetCampaignResourceUsage(campID)
	metrics := h.deps.Monitoring.PerformanceTracker.GetRecentMetrics(50)
	var campMetrics []monitoring.PerformanceMetric
	for _, m := range metrics {
		if m.CampaignID != nil && *m.CampaignID == campID {
			campMetrics = append(campMetrics, m)
		}
	}
	out := map[string]interface{}{
		"health":  toMap(health),
		"usage":   toMap(usage),
		"metrics": toMap(campMetrics),
	}
	return gen.MonitoringCampaignGeneric200JSONResponse{Data: &out, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringCleanupForce(ctx context.Context, r gen.MonitoringCleanupForceRequestObject) (gen.MonitoringCleanupForceResponseObject, error) {
	if h.deps == nil || h.deps.Cleanup == nil {
		return gen.MonitoringCleanupForce401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "cleanup service not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Cleanup.ForceCleanupCampaign(uuid.UUID(r.CampaignId)); err != nil {
		return gen.MonitoringCleanupForce404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: err.Error(), Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.MonitoringCleanupForce202Response{}, nil
}

func (h *strictHandlers) MonitoringCleanupStats(ctx context.Context, r gen.MonitoringCleanupStatsRequestObject) (gen.MonitoringCleanupStatsResponseObject, error) {
	if h.deps == nil || h.deps.Cleanup == nil {
		return gen.MonitoringCleanupStats401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "cleanup service not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	stats := h.deps.Cleanup.GetCleanupStats()
	data := toMap(stats)
	return gen.MonitoringCleanupStats200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringDashboardSummary(ctx context.Context, r gen.MonitoringDashboardSummaryRequestObject) (gen.MonitoringDashboardSummaryResponseObject, error) {
	integ := monitoring.GetGlobalMonitoringIntegration()
	if integ == nil {
		return gen.MonitoringDashboardSummary500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "monitoring integration unavailable", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	sum := integ.GetSystemHealthSummary()
	data := toMap(sum)
	return gen.MonitoringDashboardSummary200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringPerformanceTrends(ctx context.Context, r gen.MonitoringPerformanceTrendsRequestObject) (gen.MonitoringPerformanceTrendsResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceTrends401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	trends := h.deps.Monitoring.PerformanceTracker.GetThroughputTrends("domain_generation", 24)
	data := toMap(trends)
	return gen.MonitoringPerformanceTrends200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringHealth(ctx context.Context, r gen.MonitoringHealthRequestObject) (gen.MonitoringHealthResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringHealth401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	health := h.deps.Monitoring.GetSystemHealth()
	data := toMap(health)
	return gen.MonitoringHealth200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringPerformanceActive(ctx context.Context, r gen.MonitoringPerformanceActiveRequestObject) (gen.MonitoringPerformanceActiveResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceActive401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	ops := h.deps.Monitoring.PerformanceTracker.GetActiveOperations()
	data := toMap(ops)
	return gen.MonitoringPerformanceActive200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringPerformanceFailed(ctx context.Context, r gen.MonitoringPerformanceFailedRequestObject) (gen.MonitoringPerformanceFailedResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceFailed401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	failed := h.deps.Monitoring.PerformanceTracker.GetFailedOperations(50)
	data := toMap(failed)
	return gen.MonitoringPerformanceFailed200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringPerformanceMetrics(ctx context.Context, r gen.MonitoringPerformanceMetricsRequestObject) (gen.MonitoringPerformanceMetricsResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceMetrics401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	metrics := h.deps.Monitoring.PerformanceTracker.GetRecentMetrics(100)
	data := toMap(metrics)
	return gen.MonitoringPerformanceMetrics200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringPerformanceSlow(ctx context.Context, r gen.MonitoringPerformanceSlowRequestObject) (gen.MonitoringPerformanceSlowResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceSlow401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	slow := h.deps.Monitoring.PerformanceTracker.GetSlowOperations(5000, 50)
	data := toMap(slow)
	return gen.MonitoringPerformanceSlow200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringPerformanceSummary(ctx context.Context, r gen.MonitoringPerformanceSummaryRequestObject) (gen.MonitoringPerformanceSummaryResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringPerformanceSummary401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	summaries := h.deps.Monitoring.PerformanceTracker.GetAllSummaries()
	data := toMap(summaries)
	return gen.MonitoringPerformanceSummary200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringResourcesAlerts(ctx context.Context, r gen.MonitoringResourcesAlertsRequestObject) (gen.MonitoringResourcesAlertsResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringResourcesAlerts401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	alerts := h.deps.Monitoring.ResourceMonitor.GetActiveAlerts(50)
	data := toMap(alerts)
	return gen.MonitoringResourcesAlerts200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringResourcesHistory(ctx context.Context, r gen.MonitoringResourcesHistoryRequestObject) (gen.MonitoringResourcesHistoryResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringResourcesHistory401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	history := h.deps.Monitoring.ResourceMonitor.GetResourceHistory(24)
	data := toMap(history)
	return gen.MonitoringResourcesHistory200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringResourcesSystem(ctx context.Context, r gen.MonitoringResourcesSystemRequestObject) (gen.MonitoringResourcesSystemResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringResourcesSystem401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	usage := h.deps.Monitoring.ResourceMonitor.GetSystemUsage()
	data := toMap(usage)
	return gen.MonitoringResourcesSystem200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) MonitoringStats(ctx context.Context, r gen.MonitoringStatsRequestObject) (gen.MonitoringStatsResponseObject, error) {
	if h.deps == nil || h.deps.Monitoring == nil {
		return gen.MonitoringStats401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "monitoring not available", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	stats := h.deps.Monitoring.GetMonitoringStats()
	data := toMap(stats)
	return gen.MonitoringStats200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}
