package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	application "github.com/fntelecomllc/studio/backend/internal/application"
	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/domainexpert"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/phases"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/prometheus/client_golang/prometheus"
)

// ---- Server-side sorting / warnings thresholds (shared with frontend logic) ----
// NOTE: Keep these in sync with frontend getDomainWarnings thresholds. If updating, document change in
// DOMAIN_LIST_API spec section to avoid drift.
const (
	repetitionWarningThreshold  = 0.30
	anchorShareWarningThreshold = 0.40
)

// Telemetry (registered once)
var (
	domainsListMetricsOnce        sync.Once
	domainsListServerSortRequests *prometheus.CounterVec
)

// aggregatesRepo implements domainservices.AggregatesRepository
type aggregatesRepo struct{ db *sql.DB }

func (a aggregatesRepo) DB() *sql.DB { return a.db }

func ensureDomainsListMetrics() {
	domainsListMetricsOnce.Do(func() {
		domainsListServerSortRequests = prometheus.NewCounterVec(prometheus.CounterOpts{
			Name: "domains_list_server_sort_requests_total",
			Help: "Server-side domains list sort requests (ANALYSIS_SERVER_SORT enabled)",
		}, []string{"sort_field", "warnings_filter"})
		prometheus.MustRegister(domainsListServerSortRequests)
	})
}

// Wrapper to inject version header when server sorting active
type campaignsDomainsList200WithHeader struct {
	gen.CampaignsDomainsList200JSONResponse
}

func (r campaignsDomainsList200WithHeader) VisitCampaignsDomainsListResponse(w http.ResponseWriter) error {
	w.Header().Set("X-Domains-Sort-Version", "1")
	return r.CampaignsDomainsList200JSONResponse.VisitCampaignsDomainsListResponse(w)
}

// CampaignsEnrichedGet implements GET /campaigns/{campaignId}/enriched (strict)
func (h *strictHandlers) CampaignsEnrichedGet(ctx context.Context, r gen.CampaignsEnrichedGetRequestObject) (gen.CampaignsEnrichedGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsEnrichedGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if h.deps.Logger != nil {
		h.deps.Logger.Info(ctx, "campaigns.enriched.get", map[string]interface{}{"campaign_id": r.CampaignId})
	}
	// Load campaign
	c, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsEnrichedGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsEnrichedGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	campaignResp := mapCampaignToResponse(c)

	// State and executions
	var apiState *gen.CampaignState
	if st, stErr := h.deps.Stores.Campaign.GetCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); stErr == nil && st != nil {
		s := gen.CampaignState{CampaignId: openapi_types.UUID(st.CampaignID), CurrentState: gen.CampaignStateEnum(st.CurrentState), Mode: gen.CampaignModeEnum(st.Mode), Version: st.Version, CreatedAt: st.CreatedAt, UpdatedAt: st.UpdatedAt}
		if len(st.Configuration) > 0 {
			var m map[string]interface{}
			_ = json.Unmarshal(st.Configuration, &m)
			flexMap := make(map[string]*gen.FlexibleValue)
			for k, v := range m {
				flexMap[k] = flexibleValuePtrFromInterface(v)
			}
			s.Configuration = &flexMap
		}
		apiState = &s
	}
	execs := []gen.PhaseExecution{}
	if list, peErr := h.deps.Stores.Campaign.GetPhaseExecutionsByCampaign(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); peErr == nil {
		for _, pe := range list {
			if pe != nil {
				execs = append(execs, mapPhaseExecutionToAPI(*pe))
			}
		}
	}
	enriched := gen.EnrichedCampaignResponse{Campaign: campaignResp}

	// Add configsPresent map (phase -> bool) for UI readiness
	if h.deps.Stores.Campaign != nil {
		if cfgs, err := h.deps.Stores.Campaign.ListPhaseConfigs(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err == nil {
			present := map[string]bool{}
			for p := range cfgs {
				present[string(p)] = true
			}
			// inject via State.Configuration.extra or create metadata
			if enriched.State == nil {
				// create minimal state placeholder if absent to carry configsPresent
				mode := gen.CampaignModeEnum("step_by_step")
				st := gen.CampaignState{CampaignId: openapi_types.UUID(c.ID), Mode: mode, CurrentState: gen.CampaignStateEnum("draft"), Version: 1, CreatedAt: c.CreatedAt, UpdatedAt: c.UpdatedAt}
				enriched.State = &st
			}
			if enriched.State.Configuration == nil {
				flexMap := make(map[string]*gen.FlexibleValue)
				enriched.State.Configuration = &flexMap
			}
			(*enriched.State.Configuration)["configsPresent"] = flexibleValuePtrFromInterface(present)
		}
	}
	if apiState != nil {
		enriched.State = apiState
	}
	if len(execs) > 0 {
		enriched.PhaseExecutions = &execs
	}
	return gen.CampaignsEnrichedGet200JSONResponse(enriched), nil
}

// CampaignsFunnelGet implements GET /campaigns/{campaignId}/funnel
func (h *strictHandlers) CampaignsFunnelGet(ctx context.Context, r gen.CampaignsFunnelGetRequestObject) (gen.CampaignsFunnelGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.AggregatesCache == nil {
		return gen.CampaignsFunnelGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Optional campaign existence check (avoid unnecessary aggregation for 404)
	if h.deps.Stores.Campaign != nil {
		if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
			if err == store.ErrNotFound {
				return gen.CampaignsFunnelGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			return gen.CampaignsFunnelGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}
	repo := aggregatesRepo{db: h.deps.DB.DB}
	dto, err := domainservices.GetCampaignFunnel(ctx, repo, h.deps.AggregatesCache, uuid.UUID(r.CampaignId))
	if err != nil {
		return gen.CampaignsFunnelGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "aggregation failure", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Map DTO to typed response struct for schema compliance
	data := gen.CampaignFunnelResponse{
		Generated:     int(dto.Generated),
		DnsValid:      int(dto.DNSValid),
		HttpValid:     int(dto.HTTPValid),
		KeywordHits:   int(dto.KeywordHits),
		Analyzed:      int(dto.Analyzed),
		HighPotential: int(dto.HighPotential),
		Leads:         int(dto.Leads),
	}
	return gen.CampaignsFunnelGet200JSONResponse(data), nil
}

// CampaignsClassificationsGet implements GET /campaigns/{campaignId}/classifications
func (h *strictHandlers) CampaignsClassificationsGet(ctx context.Context, r gen.CampaignsClassificationsGetRequestObject) (gen.CampaignsClassificationsGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.AggregatesCache == nil {
		return gen.CampaignsClassificationsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Optional campaign existence check
	if h.deps.Stores.Campaign != nil {
		if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
			if err == store.ErrNotFound {
				return gen.CampaignsClassificationsGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			return gen.CampaignsClassificationsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}
	repo := aggregatesRepo{db: h.deps.DB.DB}
	dto, err := domainservices.GetCampaignClassifications(ctx, repo, h.deps.AggregatesCache, uuid.UUID(r.CampaignId))
	if err != nil {
		return gen.CampaignsClassificationsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "aggregation failure", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Map DTO to typed response struct
	samples := make([]gen.CampaignClassificationBucketSample, len(dto.Samples))
	for i, sample := range dto.Samples {
		domains := make([]struct {
			Domain   string   `json:"domain"`
			Richness *float32 `json:"richness"`
		}, len(sample.Domains))
		for j, domain := range sample.Domains {
			richness := (*float32)(nil)
			if domain.Richness != nil {
				r := float32(*domain.Richness)
				richness = &r
			}
			domains[j] = struct {
				Domain   string   `json:"domain"`
				Richness *float32 `json:"richness"`
			}{
				Domain:   domain.Domain,
				Richness: richness,
			}
		}
		samples[i] = gen.CampaignClassificationBucketSample{
			Bucket:  gen.CampaignClassificationBucketSampleBucket(sample.Bucket),
			Domains: domains,
		}
	}

	data := gen.CampaignClassificationsResponse{
		Counts: struct {
			AtRisk        int `json:"atRisk"`
			Emerging      int `json:"emerging"`
			HighPotential int `json:"highPotential"`
			LeadCandidate int `json:"leadCandidate"`
			LowValue      int `json:"lowValue"`
			Other         int `json:"other"`
		}{
			HighPotential: int(dto.Counts.HighPotential),
			Emerging:      int(dto.Counts.Emerging),
			AtRisk:        int(dto.Counts.AtRisk),
			LeadCandidate: int(dto.Counts.LeadCandidate),
			LowValue:      int(dto.Counts.LowValue),
			Other:         int(dto.Counts.Other),
		},
		Samples: &samples,
	}
	return gen.CampaignsClassificationsGet200JSONResponse(data), nil
}

// CampaignsDuplicatePost implements POST /campaigns/{campaignId}/duplicate
func (h *strictHandlers) CampaignsDuplicatePost(ctx context.Context, r gen.CampaignsDuplicatePostRequestObject) (gen.CampaignsDuplicatePostResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsDuplicatePost500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Load the original campaign
	originalCampaign, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsDuplicatePost404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsDuplicatePost500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Create a new campaign with the same configuration but different ID and name
	newCampaignID := uuid.New()
	duplicatedCampaign := *originalCampaign // Copy the struct
	duplicatedCampaign.ID = newCampaignID
	duplicatedCampaign.Name = fmt.Sprintf("%s (Copy)", originalCampaign.Name)
	// Reset status-related fields to defaults
	duplicatedCampaign.PhaseStatus = nil // Reset to default/draft
	duplicatedCampaign.StartedAt = nil
	duplicatedCampaign.CompletedAt = nil
	duplicatedCampaign.CreatedAt = time.Now()
	duplicatedCampaign.UpdatedAt = time.Now()

	// Create the duplicated campaign
	err = h.deps.Stores.Campaign.CreateCampaign(ctx, h.deps.DB, &duplicatedCampaign)
	if err != nil {
		return gen.CampaignsDuplicatePost500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create duplicate", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Map to response
	campaignResp := mapCampaignToResponse(&duplicatedCampaign)
	return gen.CampaignsDuplicatePost201JSONResponse(campaignResp), nil
}

// CampaignsMomentumGet implements GET /campaigns/{campaignId}/momentum
func (h *strictHandlers) CampaignsMomentumGet(ctx context.Context, r gen.CampaignsMomentumGetRequestObject) (gen.CampaignsMomentumGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.AggregatesCache == nil {
		return gen.CampaignsMomentumGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Optional campaign existence check
	if h.deps.Stores.Campaign != nil {
		if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
			if err == store.ErrNotFound {
				return gen.CampaignsMomentumGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			return gen.CampaignsMomentumGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}
	repo := aggregatesRepo{db: h.deps.DB.DB}
	dto, err := domainservices.GetCampaignMomentum(ctx, repo, h.deps.AggregatesCache, uuid.UUID(r.CampaignId))
	if err != nil {
		return gen.CampaignsMomentumGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "aggregation failure", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Map DTO to typed response struct
	moversUp := make([]struct {
		Delta  float32 `json:"delta"`
		Domain string  `json:"domain"`
	}, len(dto.MoversUp))
	for i, mover := range dto.MoversUp {
		moversUp[i] = struct {
			Delta  float32 `json:"delta"`
			Domain string  `json:"domain"`
		}{
			Domain: mover.Domain,
			Delta:  float32(mover.Delta),
		}
	}

	moversDown := make([]struct {
		Delta  float32 `json:"delta"`
		Domain string  `json:"domain"`
	}, len(dto.MoversDown))
	for i, mover := range dto.MoversDown {
		moversDown[i] = struct {
			Delta  float32 `json:"delta"`
			Domain string  `json:"domain"`
		}{
			Domain: mover.Domain,
			Delta:  float32(mover.Delta),
		}
	}

	// Note: The schema shows histogram as []int but our DTO has bucket names,
	// for now return counts only - TODO: align schema with implementation needs
	histogram := make([]int, len(dto.Histogram))
	for i, hist := range dto.Histogram {
		histogram[i] = int(hist.Count)
	}

	data := gen.CampaignMomentumResponse{
		MoversUp:   moversUp,
		MoversDown: moversDown,
		Histogram:  histogram,
	}
	return gen.CampaignsMomentumGet200JSONResponse(data), nil
}

// CampaignsRecommendationsGet implements GET /campaigns/{campaignId}/insights/recommendations
func (h *strictHandlers) CampaignsRecommendationsGet(ctx context.Context, r gen.CampaignsRecommendationsGetRequestObject) (gen.CampaignsRecommendationsGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.AggregatesCache == nil {
		return gen.CampaignsRecommendationsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Optional campaign existence check
	if h.deps.Stores.Campaign != nil {
		if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
			if err == store.ErrNotFound {
				return gen.CampaignsRecommendationsGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			return gen.CampaignsRecommendationsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}
	repo := aggregatesRepo{db: h.deps.DB.DB}
	dto, err := domainservices.GetCampaignRecommendations(ctx, repo, h.deps.AggregatesCache, uuid.UUID(r.CampaignId))
	if err != nil {
		return gen.CampaignsRecommendationsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "aggregation failure", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Map DTO to typed response struct
	recommendations := make([]gen.CampaignRecommendation, len(dto.Recommendations))
	for i, rec := range dto.Recommendations {
		recommendations[i] = gen.CampaignRecommendation{
			Id:            rec.ID,
			Message:       rec.Message,
			RationaleCode: gen.CampaignRecommendationRationaleCode(rec.RationaleCode),
			Severity:      gen.RecommendationSeverity(rec.Severity),
		}
	}

	data := gen.CampaignRecommendationsResponse{
		Recommendations: recommendations,
	}
	return gen.CampaignsRecommendationsGet200JSONResponse(data), nil
}

// CampaignsStatusGet implements GET /campaigns/{campaignId}/status
func (h *strictHandlers) CampaignsStatusGet(ctx context.Context, r gen.CampaignsStatusGetRequestObject) (gen.CampaignsStatusGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.AggregatesCache == nil {
		return gen.CampaignsStatusGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Optional campaign existence check
	if h.deps.Stores.Campaign != nil {
		if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
			if err == store.ErrNotFound {
				return gen.CampaignsStatusGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			return gen.CampaignsStatusGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}
	repo := aggregatesRepo{db: h.deps.DB.DB}
	dto, err := domainservices.GetCampaignStatus(ctx, repo, h.deps.AggregatesCache, uuid.UUID(r.CampaignId))
	if err != nil {
		return gen.CampaignsStatusGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "aggregation failure", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Map DTO to typed response struct
	phases := make([]struct {
		CompletedAt        *time.Time                                   `json:"completedAt"`
		Phase              gen.CampaignPhasesStatusResponsePhasesPhase  `json:"phase"`
		ProgressPercentage float32                                      `json:"progressPercentage"`
		StartedAt          *time.Time                                   `json:"startedAt"`
		Status             gen.CampaignPhasesStatusResponsePhasesStatus `json:"status"`
	}, len(dto.Phases))

	for i, phase := range dto.Phases {
		phases[i] = struct {
			CompletedAt        *time.Time                                   `json:"completedAt"`
			Phase              gen.CampaignPhasesStatusResponsePhasesPhase  `json:"phase"`
			ProgressPercentage float32                                      `json:"progressPercentage"`
			StartedAt          *time.Time                                   `json:"startedAt"`
			Status             gen.CampaignPhasesStatusResponsePhasesStatus `json:"status"`
		}{
			Phase:              gen.CampaignPhasesStatusResponsePhasesPhase(phase.Phase),
			Status:             gen.CampaignPhasesStatusResponsePhasesStatus(phase.Status),
			ProgressPercentage: float32(phase.ProgressPercentage),
			StartedAt:          phase.StartedAt,
			CompletedAt:        phase.CompletedAt,
		}
	}

	data := gen.CampaignPhasesStatusResponse{
		CampaignId:                dto.CampaignID,
		OverallProgressPercentage: float32(dto.OverallProgressPercentage),
		Phases:                    phases,
	}
	return gen.CampaignsStatusGet200JSONResponse(data), nil
}

// CampaignsMetricsGet implements GET /campaigns/{campaignId}/metrics
func (h *strictHandlers) CampaignsMetricsGet(ctx context.Context, r gen.CampaignsMetricsGetRequestObject) (gen.CampaignsMetricsGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.AggregatesCache == nil {
		return gen.CampaignsMetricsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}}}, nil
	}
	if h.deps.Stores.Campaign != nil {
		if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
			return gen.CampaignsMetricsGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}}}, nil
		}
	}
	repo := aggregatesRepo{db: h.deps.DB.DB}
	dto, err := domainservices.GetCampaignMetrics(ctx, repo, h.deps.AggregatesCache, uuid.UUID(r.CampaignId))
	if err != nil {
		return gen.CampaignsMetricsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "aggregation failure", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}}}, nil
	}
	f32 := func(p *float64) float32 {
		if p == nil {
			return 0
		}
		return float32(*p)
	}
	data := gen.CampaignMetricsResponse{
		HighPotential:      int(dto.HighPotential),
		Leads:              int(dto.Leads),
		KeywordCoveragePct: f32(dto.KeywordCoveragePct),
		AvgRichness:        f32(dto.AvgRichness),
		WarningRatePct:     f32(dto.WarningRatePct),
		MedianGain:         f32(dto.MedianGain),
		Stuffing:           int(dto.StuffingCount),
		Repetition:         int(dto.RepetitionCount),
		Anchor:             int(dto.AnchorCount),
		TotalAnalyzed:      int(dto.TotalAnalyzed),
	}
	return gen.CampaignsMetricsGet200JSONResponse(data), nil
}

// mapToDomainGenerationConfig converts a generic map into the typed DomainGenerationConfig expected by the domain generation service
func mapToDomainGenerationConfig(in map[string]interface{}) (domainservices.DomainGenerationConfig, error) {
	var cfg domainservices.DomainGenerationConfig
	if in == nil {
		return cfg, fmt.Errorf("missing configuration")
	}
	// Helper to get string
	getString := func(key string) string {
		if v, ok := in[key]; ok {
			if s, ok2 := v.(string); ok2 {
				return s
			}
		}
		return ""
	}
	// Helper to get int (from float64 JSON numbers)
	getInt := func(key string, def int) int {
		if v, ok := in[key]; ok {
			switch t := v.(type) {
			case float64:
				return int(t)
			case int:
				return t
			case int32:
				return int(t)
			case int64:
				return int(t)
			}
		}
		return def
	}
	// Helper to get int64
	getInt64 := func(key string, def int64) int64 {
		if v, ok := in[key]; ok {
			switch t := v.(type) {
			case float64:
				return int64(t)
			case int:
				return int64(t)
			case int32:
				return int64(t)
			case int64:
				return t
			}
		}
		return def
	}
	// Helper to get first TLD from array under key "tlds" or key "tld"
	getTLD := func() string {
		if v, ok := in["tld"]; ok {
			if s, ok2 := v.(string); ok2 && s != "" {
				return s
			}
		}
		if v, ok := in["tlds"]; ok {
			if arr, ok2 := v.([]interface{}); ok2 && len(arr) > 0 {
				if s, ok3 := arr[0].(string); ok3 {
					return s
				}
			}
			if arrS, ok2 := v.([]string); ok2 && len(arrS) > 0 {
				return arrS[0]
			}
		}
		return ""
	}

	cfg.PatternType = getString("patternType")
	if cfg.PatternType == "" {
		// accept snake_case too
		if v := getString("pattern_type"); v != "" {
			cfg.PatternType = v
		}
	}
	cfg.VariableLength = getInt("variableLength", 0)
	if cfg.VariableLength == 0 {
		cfg.VariableLength = getInt("variable_length", 0)
	}
	cfg.PrefixVariableLength = getInt("prefixVariableLength", 0)
	if cfg.PrefixVariableLength == 0 {
		cfg.PrefixVariableLength = getInt("prefix_variable_length", 0)
	}
	cfg.SuffixVariableLength = getInt("suffixVariableLength", 0)
	if cfg.SuffixVariableLength == 0 {
		cfg.SuffixVariableLength = getInt("suffix_variable_length", 0)
	}
	cfg.CharacterSet = getString("characterSet")
	if cfg.CharacterSet == "" {
		cfg.CharacterSet = getString("character_set")
	}
	cfg.ConstantString = getString("constantString")
	if cfg.ConstantString == "" {
		cfg.ConstantString = getString("constant_string")
	}
	cfg.TLD = getTLD()
	cfg.NumDomains = getInt64("numDomainsToGenerate", 0)
	if cfg.NumDomains == 0 {
		cfg.NumDomains = getInt64("num_domains", 0)
	}
	cfg.BatchSize = getInt("batchSize", 1000)
	if cfg.BatchSize == 0 {
		cfg.BatchSize = getInt("batch_size", 1000)
	}
	cfg.OffsetStart = getInt64("offsetStart", 0)
	if cfg.OffsetStart == 0 {
		cfg.OffsetStart = getInt64("offset_start", 0)
	}

	// Basic required checks mirroring service.Validate (allow 0 to enable constant-only domain e.g. example.com)
	if cfg.CharacterSet == "" {
		return cfg, fmt.Errorf("characterSet cannot be empty")
	}
	if cfg.TLD == "" {
		return cfg, fmt.Errorf("tld cannot be empty")
	}
	if cfg.NumDomains <= 0 {
		return cfg, fmt.Errorf("numDomains must be positive")
	}
	if cfg.PatternType == "" {
		cfg.PatternType = string(models.PatternTypePrefixVariable)
	}
	if err := cfg.Normalize(); err != nil {
		return cfg, err
	}

	switch cfg.PatternType {
	case string(models.PatternTypePrefixVariable):
		if cfg.PrefixVariableLength <= 0 {
			return cfg, fmt.Errorf("prefixVariableLength must be > 0 for prefix pattern")
		}
	case string(models.PatternTypeSuffixVariable):
		if cfg.SuffixVariableLength <= 0 {
			return cfg, fmt.Errorf("suffixVariableLength must be > 0 for suffix pattern")
		}
	case string(models.PatternTypeBothVariable):
		if cfg.PrefixVariableLength <= 0 || cfg.SuffixVariableLength <= 0 {
			return cfg, fmt.Errorf("both pattern requires prefixVariableLength and suffixVariableLength > 0")
		}
	}

	return cfg, nil
}

// CampaignsList implements GET /campaigns
func (h *strictHandlers) CampaignsList(ctx context.Context, r gen.CampaignsListRequestObject) (gen.CampaignsListResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}}}, nil
	}
	filter := store.ListCampaignsFilter{Limit: 50, Offset: 0}
	if v := ctx.Value("user_id"); v != nil {
		if s, ok := v.(string); ok && s != "" {
			filter.UserID = s
		}
	}
	rows, err := h.deps.Stores.Campaign.ListCampaigns(ctx, h.deps.DB, filter)
	if err != nil {
		log.Printf("ERROR CampaignsList: failed to list campaigns filter=%+v err=%v", filter, err)
		return gen.CampaignsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list campaigns", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}}}, nil
	}
	out := make([]gen.CampaignResponse, 0, len(rows))
	for _, c := range rows {
		out = append(out, mapCampaignToResponse(c))
	}
	return gen.CampaignsList200JSONResponse{Body: out, Headers: gen.CampaignsList200ResponseHeaders{XRequestId: reqID()}}, nil
}

// CampaignsCreate implements POST /campaigns
func (h *strictHandlers) CampaignsCreate(ctx context.Context, r gen.CampaignsCreateRequestObject) (gen.CampaignsCreateResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || r.Body.Name == "" {
		return gen.CampaignsCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "name is required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Generate correlation ID for traceability
	correlationID := uuid.New()

	now := time.Now().UTC()
	// Default initial phase and status
	phase := models.PhaseTypeDomainGeneration
	status := models.PhaseStatusNotStarted

	// Track campaign mode for metrics (to be implemented via mode update call)
	// For now, assume manual mode since the mode is set separately
	if h.deps.Metrics != nil {
		h.deps.Metrics.IncManualModeCreations()
	}

	// Log campaign creation start with correlation ID
	if h.deps.Logger != nil {
		h.deps.Logger.Info(ctx, "campaign.create.start", map[string]interface{}{
			"correlation_id": correlationID.String(),
			"campaign_name":  r.Body.Name,
			"execution_mode": "manual", // Mode set separately
		})
	}

	// Attach user if available (record raw for diagnostics)
	var userIDPtr *uuid.UUID
	var rawUserID string
	if v := ctx.Value("user_id"); v != nil {
		if s, ok := v.(string); ok && s != "" {
			rawUserID = s
			if uid, err := uuid.Parse(s); err == nil {
				userIDPtr = &uid
				log.Printf("DEBUG CampaignsCreate: context user_id raw=%s parsed=%s", s, uid)
			} else {
				log.Printf("DEBUG CampaignsCreate: failed to parse context user_id=%s: %v", s, err)
			}
		}
	}

	// Defensive: verify referenced user exists to avoid FK violation if session is stale
	if userIDPtr != nil {
		var exists bool
		if err := h.deps.DB.GetContext(ctx, &exists, "SELECT EXISTS (SELECT 1 FROM users WHERE id = $1)", *userIDPtr); err == nil {
			if !exists {
				log.Printf("WARN CampaignsCreate: user %s (raw=%s) not found, clearing user_id to avoid FK error", userIDPtr.String(), rawUserID)
				userIDPtr = nil
			} else {
				log.Printf("DEBUG CampaignsCreate: verified user %s exists", userIDPtr.String())
			}
		} else {
			log.Printf("WARN CampaignsCreate: user existence check failed (%v) for raw=%s, proceeding without user_id", err, rawUserID)
			userIDPtr = nil
		}
	}

	// Store configuration (if provided) into metadata JSON for now
	var metadata *json.RawMessage
	if r.Body.Configuration != nil {
		if b, err := json.Marshal(r.Body.Configuration); err == nil {
			raw := json.RawMessage(b)
			metadata = &raw
		}
	}

	campaign := &models.LeadGenerationCampaign{
		ID:           uuid.New(),
		Name:         r.Body.Name,
		UserID:       userIDPtr,
		CreatedAt:    now,
		UpdatedAt:    now,
		CurrentPhase: &phase,
		PhaseStatus:  &status,
		Metadata:     metadata,
	}

	if err := h.deps.Stores.Campaign.CreateCampaign(ctx, h.deps.DB, campaign); err != nil {
		log.Printf("ERROR CampaignsCreate: store insert error=%v user_id=%v raw_user_id=%s correlation_id=%s", err, campaign.UserID, rawUserID, correlationID.String())
		if strings.Contains(err.Error(), "foreign key constraint \"lead_generation_campaigns_user_id_fkey\"") && campaign.UserID != nil {
			log.Printf("INFO CampaignsCreate: retrying without user_id after FK violation (user %s) correlation_id=%s", campaign.UserID.String(), correlationID.String())
			campaign.UserID = nil
			if rerr := h.deps.Stores.Campaign.CreateCampaign(ctx, h.deps.DB, campaign); rerr == nil {
				resp := mapCampaignToResponse(campaign)
				// Log successful creation with correlation ID
				if h.deps.Logger != nil {
					h.deps.Logger.Info(ctx, "campaign.create.success", map[string]interface{}{
						"correlation_id": correlationID.String(),
						"campaign_id":    campaign.ID.String(),
						"campaign_name":  campaign.Name,
						"execution_mode": "manual",
					})
				}
				// Seed canonical phase rows once the campaign exists
				if phaseErr := h.deps.Stores.Campaign.CreateCampaignPhases(ctx, h.deps.DB, campaign.ID); phaseErr != nil {
					if h.deps.Logger != nil {
						h.deps.Logger.Error(ctx, "campaign.create.phases_failed", phaseErr, map[string]interface{}{
							"correlation_id": correlationID.String(),
							"campaign_id":    campaign.ID.String(),
						})
					}
					_ = h.deps.Stores.Campaign.DeleteCampaign(ctx, h.deps.DB, campaign.ID)
					return gen.CampaignsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to initialize campaign phases", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
				}
				if h.deps.Logger != nil {
					h.deps.Logger.Info(ctx, "campaign.create.phases_seeded", map[string]interface{}{
						"correlation_id": correlationID.String(),
						"campaign_id":    campaign.ID.String(),
						"phase_count":    5,
					})
				}
				return gen.CampaignsCreate201JSONResponse{Body: resp, Headers: gen.CampaignsCreate201ResponseHeaders{XRequestId: reqID()}}, nil
			} else {
				log.Printf("ERROR CampaignsCreate: retry without user_id failed: %v correlation_id=%s", rerr, correlationID.String())
			}
		}
		return gen.CampaignsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Log successful creation with correlation ID
	if h.deps.Logger != nil {
		h.deps.Logger.Info(ctx, "campaign.create.success", map[string]interface{}{
			"correlation_id": correlationID.String(),
			"campaign_id":    campaign.ID.String(),
			"campaign_name":  campaign.Name,
			"execution_mode": "manual",
		})
	}

	// Seed canonical campaign phase rows immediately so downstream configuration persists cleanly
	if err := h.deps.Stores.Campaign.CreateCampaignPhases(ctx, h.deps.DB, campaign.ID); err != nil {
		if h.deps.Logger != nil {
			h.deps.Logger.Error(ctx, "campaign.create.phases_failed", err, map[string]interface{}{
				"correlation_id": correlationID.String(),
				"campaign_id":    campaign.ID.String(),
			})
		}
		_ = h.deps.Stores.Campaign.DeleteCampaign(ctx, h.deps.DB, campaign.ID)
		return gen.CampaignsCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to initialize campaign phases", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if h.deps.Logger != nil {
		h.deps.Logger.Info(ctx, "campaign.create.phases_seeded", map[string]interface{}{
			"correlation_id": correlationID.String(),
			"campaign_id":    campaign.ID.String(),
			"phase_count":    5,
		})
	}

	resp := mapCampaignToResponse(campaign)
	return gen.CampaignsCreate201JSONResponse{Body: resp, Headers: gen.CampaignsCreate201ResponseHeaders{XRequestId: reqID()}}, nil
}

// CampaignsGet implements GET /campaigns/{campaignId}
func (h *strictHandlers) CampaignsGet(ctx context.Context, r gen.CampaignsGetRequestObject) (gen.CampaignsGetResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}}}, nil
	}
	c, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}}}, nil
		}
		return gen.CampaignsGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}}}, nil
	}
	resp := mapCampaignToResponse(c)
	return gen.CampaignsGet200JSONResponse{Body: resp, Headers: gen.CampaignsGet200ResponseHeaders{XRequestId: reqID()}}, nil
}

// CampaignsUpdate implements PATCH /campaigns/{campaignId}
func (h *strictHandlers) CampaignsUpdate(ctx context.Context, r gen.CampaignsUpdateRequestObject) (gen.CampaignsUpdateResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.CampaignsUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	existing, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	up := r.Body
	if up.Name != nil {
		existing.Name = *up.Name
	}
	if up.Description != nil {
		// store description in metadata as { description: "..." } merged into existing metadata
		var m map[string]interface{}
		if existing.Metadata != nil {
			_ = json.Unmarshal(*existing.Metadata, &m)
		}
		if m == nil {
			m = map[string]interface{}{}
		}
		if up.Description != nil {
			m["description"] = *up.Description
		}
		b, _ := json.Marshal(m)
		raw := json.RawMessage(b)
		existing.Metadata = &raw
	}
	if up.Configuration != nil {
		b, _ := json.Marshal(up.Configuration)
		raw := json.RawMessage(b)
		existing.Metadata = &raw
	}
	existing.UpdatedAt = time.Now().UTC()

	if err := h.deps.Stores.Campaign.UpdateCampaign(ctx, h.deps.DB, existing); err != nil {
		// Try to detect duplicate
		if err == sql.ErrNoRows {
			return gen.CampaignsUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	resp := mapCampaignToResponse(existing)
	return gen.CampaignsUpdate200JSONResponse(resp), nil
}

// CampaignsModeUpdate implements PATCH /campaigns/{campaignId}/mode (strict spec)
func (h *strictHandlers) CampaignsModeUpdate(ctx context.Context, r gen.CampaignsModeUpdateRequestObject) (gen.CampaignsModeUpdateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsModeUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil || r.Body.Mode == "" {
		return gen.CampaignsModeUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "mode is required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	mode := string(r.Body.Mode)
	if mode != "full_sequence" && mode != "step_by_step" {
		return gen.CampaignsModeUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid mode", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	campaignID := uuid.UUID(r.CampaignId)
	c, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, campaignID)
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsModeUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsModeUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Campaign.UpdateCampaignMode(ctx, h.deps.DB, campaignID, mode); err != nil {
		return gen.CampaignsModeUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update mode", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if h.deps.Metrics != nil {
		h.deps.Metrics.IncModeChanges()
	}
	if h.deps.Logger != nil {
		h.deps.Logger.Info(ctx, "campaign.mode.updated", map[string]interface{}{"campaign_id": campaignID, "mode": mode})
	}
	if h.deps.SSE != nil && c.UserID != nil {
		evt := services.CreateModeChangedEvent(campaignID, *c.UserID, mode)
		h.deps.SSE.BroadcastToCampaign(campaignID, evt)
	}
	// Successful response: data.mode per spec
	// build mode pointer
	modeEnum := gen.CampaignModeEnum(mode)
	return gen.CampaignsModeUpdate200JSONResponse{Mode: modeEnum}, nil
}

// CampaignsDelete implements DELETE /campaigns/{campaignId}
func (h *strictHandlers) CampaignsDelete(ctx context.Context, r gen.CampaignsDeleteRequestObject) (gen.CampaignsDeleteResponseObject, error) {
	if h.deps == nil || h.deps.DB == nil || h.deps.Stores.Campaign == nil {
		return gen.CampaignsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Campaign.DeleteCampaign(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.CampaignsDelete204Response{}, nil
}

// CampaignsPhaseConfigure implements POST /campaigns/{campaignId}/phase/{phase}/configure
func (h *strictHandlers) CampaignsPhaseConfigure(ctx context.Context, r gen.CampaignsPhaseConfigureRequestObject) (gen.CampaignsPhaseConfigureResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseConfigure401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Ensure campaign exists
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseConfigure404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseConfigure500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	var cfg interface{}
	var rawToPersist []byte
	if r.Body != nil {
		incoming := r.Body.Configuration
		if incoming == nil {
			incoming = map[string]interface{}{}
		}
		// Minimal validation per phase
		switch phaseModel {
		case models.PhaseTypeDomainGeneration:
			if typed, err := mapToDomainGenerationConfig(incoming); err == nil {
				cfg = typed
			} else {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid domain generation configuration: " + err.Error(), Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
		case models.PhaseTypeDNSValidation:
			// Build typed DNSValidationConfig
			idsRaw, ok := incoming["personaIds"]
			if !ok {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			arrIfc, ok := idsRaw.([]interface{})
			if !ok || len(arrIfc) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds must be a non-empty array", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			personaIDs := make([]uuid.UUID, 0, len(arrIfc))
			for _, v := range arrIfc {
				if s, ok := v.(string); ok {
					if id, err := uuid.Parse(s); err == nil {
						personaIDs = append(personaIDs, id)
					}
				}
			}
			if len(personaIDs) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "no valid persona UUIDs provided", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			cfg = &domainservices.DNSValidationConfig{
				PersonaIDs:      personaIDs,
				BatchSize:       intFromAny(incoming["batchSize"], 100),
				Timeout:         intFromAny(incoming["timeout"], 30),
				MaxRetries:      intFromAny(incoming["maxRetries"], 2),
				ValidationTypes: sliceString(incoming["validation_types"]),
				RequiredRecords: sliceString(incoming["required_records"]),
			}
		case models.PhaseTypeHTTPKeywordValidation:
			// HTTP validation expects *models.HTTPPhaseConfigRequest
			idsRaw, ok := incoming["personaIds"]
			if !ok {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			arrIfc, ok := idsRaw.([]interface{})
			if !ok || len(arrIfc) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds must be a non-empty array", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			personaIDs := make([]uuid.UUID, 0, len(arrIfc))
			for _, v := range arrIfc {
				if s, ok := v.(string); ok {
					if id, err := uuid.Parse(s); err == nil {
						personaIDs = append(personaIDs, id)
					}
				}
			}
			if len(personaIDs) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "no valid persona UUIDs provided", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			// HTTPPhaseConfigRequest expects []string PersonaIDs; convert UUIDs to strings
			personaStrs := make([]string, 0, len(personaIDs))
			for _, id := range personaIDs {
				personaStrs = append(personaStrs, id.String())
			}
			if h.deps.Logger != nil {
				kraw, _ := json.Marshal(incoming["keywords"])
				adhocRaw, _ := json.Marshal(incoming["adHocKeywords"])
				setRaw, _ := json.Marshal(incoming["keywordSetIds"])
				h.deps.Logger.Info(ctx, "HTTP phase configure payload", map[string]interface{}{
					"campaign_id":      r.CampaignId,
					"persona_ids":      personaStrs,
					"keywords_raw":     string(kraw),
					"adhoc_raw":        string(adhocRaw),
					"keyword_sets_raw": string(setRaw),
				})
			}
			httpCfg := &models.HTTPPhaseConfigRequest{PersonaIDs: personaStrs}
			keywordSetIDs := extractStringArray(incoming, "keywordSetIds", "keyword_set_ids")
			if len(keywordSetIDs) == 0 {
				if nested, ok := incoming["targeting"].(map[string]interface{}); ok {
					keywordSetIDs = extractStringArray(nested, "keywordSetIds", "keyword_set_ids")
				}
			}
			if normalized := filterUUIDStrings(keywordSetIDs); len(normalized) > 0 {
				httpCfg.KeywordSetIDs = normalized
			}
			keywords := extractStringArray(incoming, "keywords", "includeKeywords")
			if len(keywords) == 0 {
				if nested, ok := incoming["targeting"].(map[string]interface{}); ok {
					keywords = extractStringArray(nested, "keywords", "includeKeywords")
				}
			}
			httpCfg.Keywords = keywords
			adHoc := extractStringArray(incoming, "adHocKeywords", "adHoc", "customKeywords")
			if len(adHoc) == 0 {
				if nested, ok := incoming["targeting"].(map[string]interface{}); ok {
					adHoc = extractStringArray(nested, "adHocKeywords", "adHoc", "customKeywords")
				}
			}
			httpCfg.AdHocKeywords = adHoc
			if len(httpCfg.Keywords) == 0 && len(httpCfg.KeywordSetIDs) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "at least one keyword or keyword set is required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			if h.deps.Logger != nil {
				h.deps.Logger.Info(ctx, "HTTP phase configure parsed", map[string]interface{}{
					"campaign_id":      r.CampaignId,
					"keywords_len":     len(httpCfg.Keywords),
					"keyword_sets_len": len(httpCfg.KeywordSetIDs),
					"adhoc_len":        len(httpCfg.AdHocKeywords),
				})
			}
			cfg = httpCfg
		case models.PhaseTypeAnalysis:
			// Build typed AnalysisConfig with extended symmetry (personaIds, includeExternal, keywordRules, name)
			// Backward compatibility: some clients may nest under `analysis` key
			if _, present := incoming["personaIds"]; !present {
				if nested, okn := incoming["analysis"].(map[string]interface{}); okn {
					incoming = nested
				}
			}
			idsRaw, ok := incoming["personaIds"]
			if !ok {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds required", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			arrIfc, ok := idsRaw.([]interface{})
			if !ok || len(arrIfc) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "personaIds must be a non-empty array", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			personaIDs := make([]string, 0, len(arrIfc))
			for _, v := range arrIfc {
				if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
					personaIDs = append(personaIDs, s)
				}
			}
			if len(personaIDs) == 0 {
				return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "no valid persona IDs provided", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			analysisCfg := &domainservices.AnalysisConfig{PersonaIDs: personaIDs}
			if inc, ok := incoming["includeExternal"].(bool); ok {
				analysisCfg.IncludeExternal = inc
			}
			if nm, ok := incoming["name"].(string); ok {
				trim := strings.TrimSpace(nm)
				if trim != "" {
					analysisCfg.Name = &trim
				}
			}
			// Parse keywordRules if provided (array of objects with at least pattern, ruleType)
			if krRaw, ok := incoming["keywordRules"]; ok && krRaw != nil {
				if arr, ok := krRaw.([]interface{}); ok {
					parsed := make([]models.KeywordRule, 0, len(arr))
					for _, item := range arr {
						obj, ok := item.(map[string]interface{})
						if !ok {
							continue // skip non-object entries quietly
						}
						pattern, _ := obj["pattern"].(string)
						ruleType, _ := obj["ruleType"].(string)
						if strings.TrimSpace(pattern) == "" || strings.TrimSpace(ruleType) == "" {
							continue
						}
						isCase := false
						if b, ok := obj["isCaseSensitive"].(bool); ok {
							isCase = b
						}
						// Generate ephemeral ID so downstream validation expecting UUID is satisfied
						kr := models.KeywordRule{ID: uuid.New(), Pattern: pattern, RuleType: models.KeywordRuleTypeEnum(ruleType), IsCaseSensitive: isCase, CreatedAt: time.Now(), UpdatedAt: time.Now()}
						parsed = append(parsed, kr)
					}
					if len(parsed) > 0 {
						analysisCfg.KeywordRules = parsed
					}
				}
			}
			// Legacy customRules (array of strings) -> map to keywordRules if keywordRules absent
			if len(analysisCfg.KeywordRules) == 0 {
				if crRaw, ok := incoming["customRules"]; ok && crRaw != nil {
					if arr, ok := crRaw.([]interface{}); ok {
						legacy := make([]models.KeywordRule, 0, len(arr))
						for _, v := range arr {
							if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
								legacy = append(legacy, models.KeywordRule{ID: uuid.New(), Pattern: s, RuleType: models.KeywordRuleTypeEnum("string"), IsCaseSensitive: false, CreatedAt: time.Now(), UpdatedAt: time.Now()})
							}
						}
						if len(legacy) > 0 {
							analysisCfg.KeywordRules = legacy
						}
					}
				}
			}
			cfg = analysisCfg
		default:
			cfg = incoming
		}
		// Marshal original (possibly normalized) config for persistence
		if b, err := json.Marshal(incoming); err == nil {
			rawToPersist = b
		}
	}
	// Persist config JSON if available
	if len(rawToPersist) > 0 {
		rawMsg := json.RawMessage(rawToPersist)
		if err := h.deps.Stores.Campaign.UpsertPhaseConfig(ctx, h.deps.DB, uuid.UUID(r.CampaignId), phaseModel, rawMsg); err != nil {
			return gen.CampaignsPhaseConfigure500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to persist phase configuration", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		if h.deps.Metrics != nil {
			h.deps.Metrics.IncPhaseConfigUpdates()
		}
	}
	if err := h.deps.Orchestrator.ConfigurePhase(ctx, uuid.UUID(r.CampaignId), phaseModel, cfg); err != nil {
		// Map known validation/precondition errors to 400
		if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "cannot ") || strings.Contains(err.Error(), "must ") {
			return gen.CampaignsPhaseConfigure400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "failed to configure phase: " + err.Error(), Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseConfigure500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to configure phase: " + err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Immediately fetch updated status to ensure configured response reflects new configuration
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseConfigure200JSONResponse(data), nil
}

// intFromAny attempts to coerce an interface{} numeric to int with fallback default.
func intFromAny(v interface{}, def int) int {
	switch t := v.(type) {
	case int:
		return t
	case int32:
		return int(t)
	case int64:
		return int(t)
	case float64:
		return int(t)
	case float32:
		return int(t)
	default:
		return def
	}
}

// sliceString converts an interface (array) into []string if possible.
func sliceString(v interface{}) []string {
	if v == nil {
		return []string{}
	}
	out := []string{}
	switch arr := v.(type) {
	case []string:
		return arr
	case []interface{}:
		for _, elem := range arr {
			if s, ok := elem.(string); ok {
				if trimmed := strings.TrimSpace(s); trimmed != "" {
					out = append(out, trimmed)
				}
			}
		}
	case string:
		trimmedAll := strings.TrimSpace(arr)
		if trimmedAll == "" || strings.EqualFold(trimmedAll, "null") || strings.EqualFold(trimmedAll, "undefined") {
			return out
		}
		if strings.HasPrefix(trimmedAll, "[") && strings.HasSuffix(trimmedAll, "]") {
			// Best effort handle JSON array encoded as a string
			var parsed []string
			if err := json.Unmarshal([]byte(trimmedAll), &parsed); err == nil {
				return dedupeStrings(parsed)
			}
		}
		for _, part := range strings.FieldsFunc(trimmedAll, func(r rune) bool { return r == ',' || r == '\n' || r == ';' }) {
			if trimmed := strings.TrimSpace(part); trimmed != "" {
				out = append(out, trimmed)
			}
		}
	}
	return out
}

// dedupeStrings returns unique non-empty strings preserving order of first appearance.
func dedupeStrings(in []string) []string {
	if len(in) == 0 {
		return []string{}
	}
	seen := make(map[string]struct{}, len(in))
	out := make([]string, 0, len(in))
	for _, raw := range in {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

// filterUUIDStrings returns unique UUID strings (case-preserving) from the provided slice.
func filterUUIDStrings(in []string) []string {
	if len(in) == 0 {
		return []string{}
	}
	seen := make(map[string]struct{}, len(in))
	out := make([]string, 0, len(in))
	for _, raw := range in {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			continue
		}
		if _, err := uuid.Parse(trimmed); err != nil {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		out = append(out, trimmed)
	}
	return out
}

// extractStringArray attempts to gather a list of strings using the provided keys and fallbacks.
// It understands common payload shapes (plain slice, delimited string, or nested object with items/values keys).
func extractStringArray(source map[string]interface{}, primary string, fallbacks ...string) []string {
	if source == nil {
		return []string{}
	}
	candidates := append([]string{primary}, fallbacks...)
	acc := []string{}
	for _, key := range candidates {
		val, ok := source[key]
		if !ok || val == nil {
			continue
		}
		acc = append(acc, gatherStringValues(val)...)
	}
	return dedupeStrings(acc)
}

// gatherStringValues flattens supported string container shapes.
func gatherStringValues(val interface{}) []string {
	switch typed := val.(type) {
	case map[string]interface{}:
		collected := []string{}
		for _, candidateKey := range []string{"items", "values", "keywords", "list"} {
			if nested, ok := typed[candidateKey]; ok {
				collected = append(collected, gatherStringValues(nested)...)
			}
		}
		return dedupeStrings(collected)
	default:
		return sliceString(val)
	}
}

// CampaignsPhaseStart implements POST /campaigns/{campaignId}/phase/{phase}/start
func (h *strictHandlers) CampaignsPhaseStart(ctx context.Context, r gen.CampaignsPhaseStartRequestObject) (gen.CampaignsPhaseStartResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseStart401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Track if this is an auto-start (look for correlation ID in context or assume manual for now)
	// TODO: Implement proper correlation ID tracking via headers or request enhancement
	isAutoStart := false
	correlationID := ""

	// Track auto-start attempts
	startTime := time.Now()
	if isAutoStart && h.deps.Metrics != nil {
		h.deps.Metrics.IncAutoStartAttempts()
	}

	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		// Track failed auto-start attempts
		if isAutoStart && h.deps.Metrics != nil {
			h.deps.Metrics.IncAutoStartFailures()
		}
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseStart404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseStart500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		// Track failed auto-start attempts
		if isAutoStart && h.deps.Metrics != nil {
			h.deps.Metrics.IncAutoStartFailures()
		}
		return gen.CampaignsPhaseStart400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Orchestrator.StartPhaseInternal(ctx, uuid.UUID(r.CampaignId), phaseModel); err != nil {
		// Track failed auto-start attempts
		if isAutoStart && h.deps.Metrics != nil {
			h.deps.Metrics.IncAutoStartFailures()
		}

		if errors.Is(err, application.ErrMissingPhaseConfigs) {
			missing := []string{}
			// Attempt typed extraction using concrete error type
			var mpe *application.MissingPhaseConfigsError
			if errors.As(err, &mpe) && mpe != nil {
				missing = mpe.Missing
			}
			conflict := gen.CampaignsPhaseStart409JSONResponse{Error: gen.ApiError{Message: "missing required phase configurations", Code: gen.CONFLICT, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}
			if len(missing) > 0 {
				conflict.MissingPhases = &missing
			}
			if h.deps.Logger != nil {
				h.deps.Logger.Warn(ctx, "campaign.phase.start.blocked_missing_configs", map[string]interface{}{
					"campaign_id":    r.CampaignId,
					"phase":          phaseModel,
					"missing":        missing,
					"correlation_id": correlationID,
					"is_auto_start":  isAutoStart,
				})
			}
			return conflict, nil
		}
		if strings.Contains(err.Error(), "not configured") || strings.Contains(err.Error(), "cannot start") {
			return gen.CampaignsPhaseStart400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "failed to start phase: " + err.Error(), Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseStart500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to start phase: " + err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Track successful auto-start and timing
	if isAutoStart && h.deps.Metrics != nil {
		h.deps.Metrics.IncAutoStartSuccesses()
		h.deps.Metrics.RecordAutoStartLatency(time.Since(startTime))
	}

	if h.deps.Logger != nil {
		h.deps.Logger.Info(ctx, "campaign.phase.start", map[string]interface{}{
			"campaign_id":    r.CampaignId,
			"phase":          phaseModel,
			"correlation_id": correlationID,
			"is_auto_start":  isAutoStart,
		})
	}
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseStart200JSONResponse(data), nil
}

// CampaignsPhaseStatus implements GET /campaigns/{campaignId}/phase/{phase}/status
func (h *strictHandlers) CampaignsPhaseStatus(ctx context.Context, r gen.CampaignsPhaseStatusRequestObject) (gen.CampaignsPhaseStatusResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseStatus401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseStatus404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseStatus500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		return gen.CampaignsPhaseStatus404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseStatus200JSONResponse(data), nil
}

// CampaignsPhaseConfigsList implements GET /campaigns/{campaignId}/configs
func (h *strictHandlers) CampaignsPhaseConfigsList(ctx context.Context, r gen.CampaignsPhaseConfigsListRequestObject) (gen.CampaignsPhaseConfigsListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseConfigsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Ensure campaign exists
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseConfigsList404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseConfigsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	cfgs, err := h.deps.Stores.Campaign.ListPhaseConfigs(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		return gen.CampaignsPhaseConfigsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list configs", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	present := map[string]bool{}
	configsOut := map[string]map[string]interface{}{}
	for p, raw := range cfgs {
		present[string(p)] = true
		if len(raw) > 0 {
			var m map[string]interface{}
			if err := json.Unmarshal(raw, &m); err == nil {
				configsOut[string(p)] = m
			}
		}
	}
	cid := openapi_types.UUID(r.CampaignId)
	if h.deps.Logger != nil {
		h.deps.Logger.Info(ctx, "campaign.phase.configs.list", map[string]interface{}{"campaign_id": r.CampaignId, "configs_present_count": len(present)})
	}
	data := &struct {
		CampaignId     *openapi_types.UUID                `json:"campaignId,omitempty"`
		Configs        *map[string]map[string]interface{} `json:"configs,omitempty"`
		ConfigsPresent *map[string]bool                   `json:"configsPresent,omitempty"`
	}{CampaignId: &cid, Configs: &configsOut, ConfigsPresent: &present}
	return gen.CampaignsPhaseConfigsList200JSONResponse{
		CampaignId:     data.CampaignId,
		Configs:        data.Configs,
		ConfigsPresent: data.ConfigsPresent,
	}, nil
}

// mapCampaignToResponse converts a models.LeadGenerationCampaign to API response
func mapCampaignToResponse(c *models.LeadGenerationCampaign) gen.CampaignResponse {
	status := gen.CampaignResponseStatus("draft")
	if c.PhaseStatus != nil {
		switch *c.PhaseStatus {
		case models.PhaseStatusInProgress:
			status = gen.CampaignResponseStatus("running")
		case models.PhaseStatusCompleted:
			status = gen.CampaignResponseStatus("completed")
		case models.PhaseStatusFailed:
			status = gen.CampaignResponseStatus("failed")
		case models.PhaseStatusPaused:
			status = gen.CampaignResponseStatus("paused")
		case models.PhaseStatusConfigured, models.PhaseStatusReady:
			status = gen.CampaignResponseStatus("draft")
		}
	}
	resp := gen.CampaignResponse{
		Id:            openapi_types.UUID(c.ID),
		Name:          c.Name,
		CreatedAt:     c.CreatedAt,
		UpdatedAt:     c.UpdatedAt,
		Status:        status,
		Configuration: map[string]interface{}{},
	}
	if c.StartedAt != nil {
		resp.StartedAt = c.StartedAt
	}
	if c.CompletedAt != nil {
		resp.CompletedAt = c.CompletedAt
	}
	if c.CurrentPhase != nil {
		v := gen.CampaignResponseCurrentPhase(string(*c.CurrentPhase))
		resp.CurrentPhase = &v
	}
	return resp
}

// ---- Phase helpers ----
// mapAPIPhaseToModel now delegates to the central phases translation utility.
func mapAPIPhaseToModel(p string) (models.PhaseTypeEnum, error) {
	internal := phases.ToInternal(p)
	switch internal {
	case string(models.PhaseTypeDomainGeneration), string(models.PhaseTypeDNSValidation), string(models.PhaseTypeHTTPKeywordValidation), string(models.PhaseTypeEnrichment), string(models.PhaseTypeAnalysis):
		return models.PhaseTypeEnum(internal), nil
	default:
		return "", fmt.Errorf("unknown phase: %s", p)
	}
}

// mapModelPhaseToAPI converts internal enum to API phase via phases utility.
func mapModelPhaseToAPI(phase models.PhaseTypeEnum) gen.PhaseStatusResponsePhase {
	api := phases.ToAPI(string(phase))
	return gen.PhaseStatusResponsePhase(api)
}

func mapStatusToAPI(status *models.PhaseStatusEnum) gen.PhaseStatusResponseStatus {
	if status == nil {
		return gen.PhaseStatusResponseStatus("not_started")
	}
	switch *status {
	case models.PhaseStatusNotStarted:
		return gen.PhaseStatusResponseStatus("not_started")
	case models.PhaseStatusReady:
		return gen.PhaseStatusResponseStatus("not_started")
	case models.PhaseStatusConfigured:
		return gen.PhaseStatusResponseStatus("configured")
	case models.PhaseStatusInProgress:
		return gen.PhaseStatusResponseStatus("running")
	case models.PhaseStatusPaused:
		return gen.PhaseStatusResponseStatus("paused")
	case models.PhaseStatusCompleted:
		return gen.PhaseStatusResponseStatus("completed")
	case models.PhaseStatusFailed:
		return gen.PhaseStatusResponseStatus("failed")
	default:
		return gen.PhaseStatusResponseStatus("not_started")
	}
}

func buildPhaseStatusResponse(phase models.PhaseTypeEnum, st *domainservices.PhaseStatus) gen.PhaseStatusResponse {
	resp := gen.PhaseStatusResponse{
		Phase:       mapModelPhaseToAPI(phase),
		StartedAt:   nil,
		CompletedAt: nil,
		Status:      gen.PhaseStatusResponseStatus("not_started"),
	}
	// Default progress (all zero pointers so JSON shape stable)
	var total, processed, success, failed int
	var pct float32
	resp.Progress.TotalItems = &total
	resp.Progress.ProcessedItems = &processed
	resp.Progress.SuccessfulItems = &success
	resp.Progress.FailedItems = &failed
	resp.Progress.PercentComplete = &pct

	if st == nil {
		return resp
	}

	// Map timestamps only if non-nil and not zero to avoid 0001-01-01 sentinel values
	if st.StartedAt != nil && !st.StartedAt.IsZero() {
		resp.StartedAt = st.StartedAt
	}
	if st.CompletedAt != nil && !st.CompletedAt.IsZero() {
		resp.CompletedAt = st.CompletedAt
	}

	// Map status
	status := st.Status
	resp.Status = mapStatusToAPI(&status)

	// Map progress
	t := int(st.ItemsTotal)
	p := int(st.ItemsProcessed)
	// With no granular success/failure counts yet, treat processed as success
	s := p
	f := 0
	pctF := float32(st.ProgressPct)
	resp.Progress.TotalItems = &t
	resp.Progress.ProcessedItems = &p
	resp.Progress.SuccessfulItems = &s
	resp.Progress.FailedItems = &f
	resp.Progress.PercentComplete = &pctF

	// Always include configuration snapshot if available
	if len(st.Configuration) > 0 {
		cfg := map[string]interface{}(st.Configuration)
		resp.Configuration = &cfg
	}

	// Map errors
	if st.LastError != "" {
		now := time.Now()
		code := "phase_error"
		msg := st.LastError
		resp.Errors = &[]struct {
			Code      *string    `json:"code,omitempty"`
			Message   *string    `json:"message,omitempty"`
			Timestamp *time.Time `json:"timestamp,omitempty"`
		}{{Code: &code, Message: &msg, Timestamp: &now}}
	}
	return resp
}

// CampaignsPhaseStop implements POST /campaigns/{campaignId}/phase/{phase}/stop
func (h *strictHandlers) CampaignsPhaseStop(ctx context.Context, r gen.CampaignsPhaseStopRequestObject) (gen.CampaignsPhaseStopResponseObject, error) {
	if h.deps == nil || h.deps.Orchestrator == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseStop401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if _, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseStop404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseStop500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.Phase))
	if err != nil {
		return gen.CampaignsPhaseStop400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid phase", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Orchestrator.CancelPhase(ctx, uuid.UUID(r.CampaignId), phaseModel); err != nil {
		return gen.CampaignsPhaseStop500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to stop phase: " + err.Error(), Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	st, _ := h.deps.Orchestrator.GetPhaseStatus(ctx, uuid.UUID(r.CampaignId), phaseModel)
	data := buildPhaseStatusResponse(phaseModel, st)
	return gen.CampaignsPhaseStop200JSONResponse(data), nil
}

// CampaignsProgress implements GET /campaigns/{campaignId}/progress
func (h *strictHandlers) CampaignsProgress(ctx context.Context, r gen.CampaignsProgressRequestObject) (gen.CampaignsProgressResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsProgress401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	c, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsProgress404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsProgress401JSONResponse{UnauthorizedJSONResponse: gen.UnauthorizedJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.UNAUTHORIZED, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	resp := gen.CampaignProgressResponse{CampaignId: openapi_types.UUID(c.ID)}
	// Initialize Timeline with basic events
	resp.Timeline = []gen.TimelineEvent{
		{
			Type:        "campaign_created",
			Timestamp:   c.CreatedAt,
			Description: ptrString("Campaign created"),
			Status:      (*gen.TimelineEventStatus)(ptrString("completed")),
		},
	}
	// Add completion event if campaign is completed
	if c.CompletedAt != nil {
		resp.Timeline = append(resp.Timeline, gen.TimelineEvent{
			Type:        "campaign_completed",
			Timestamp:   *c.CompletedAt,
			Description: ptrString("Campaign completed"),
			Status:      (*gen.TimelineEventStatus)(ptrString("completed")),
		})
	}
	return gen.CampaignsProgress200JSONResponse(resp), nil
}

// CampaignsDomainsList implements GET /campaigns/{campaignId}/domains
func (h *strictHandlers) CampaignsDomainsList(ctx context.Context, r gen.CampaignsDomainsListRequestObject) (gen.CampaignsDomainsListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsDomainsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Ensure campaign exists (fast fail for 404)
	_, err := h.deps.Stores.Campaign.GetCampaignByID(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsDomainsList404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsDomainsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Pagination params (legacy offset path defaults)
	limit := 100
	if r.Params.Limit != nil && *r.Params.Limit > 0 {
		if *r.Params.Limit > 1000 {
			limit = 1000
		} else {
			limit = int(*r.Params.Limit)
		}
	}
	startOffset := int64(0)
	if r.Params.Offset != nil && *r.Params.Offset > 0 {
		startOffset = int64(*r.Params.Offset)
	}

	// Phase 2: Advanced filtering & cursor mode (typed params via OpenAPI)
	var (
		advancedRequested bool
		minScorePtr       *float64
		notParkedPtr      *bool
		hasContactPtr     *bool
		keywordPtr        *string
		firstParam        *int
		afterParam        *string
		sortBy            string
		sortOrder         string
	)
	featureFlag := strings.EqualFold(os.Getenv("ENABLE_ADVANCED_FILTERS"), "true") || os.Getenv("ENABLE_ADVANCED_FILTERS") == "1"
	if featureFlag {
		if r.Params.MinScore != nil {
			f := float64(*r.Params.MinScore)
			minScorePtr = &f
		}
		if r.Params.NotParked != nil {
			notParkedPtr = r.Params.NotParked
		}
		if r.Params.HasContact != nil {
			hasContactPtr = r.Params.HasContact
		}
		if r.Params.Keyword != nil && *r.Params.Keyword != "" {
			keywordPtr = r.Params.Keyword
		}
		if r.Params.First != nil && *r.Params.First > 0 {
			firstParam = r.Params.First
		}
		if r.Params.After != nil && *r.Params.After != "" {
			afterParam = r.Params.After
		}
		if r.Params.Sort != nil {
			switch *r.Params.Sort {
			case "score_desc":
				sortBy = "domain_score"
				sortOrder = "DESC"
			case "score_asc":
				sortBy = "domain_score"
				sortOrder = "ASC"
			case "last_http_fetched_at_desc":
				sortBy = "last_http_fetched_at"
				sortOrder = "DESC"
			}
		}
		if minScorePtr != nil || notParkedPtr != nil || hasContactPtr != nil || keywordPtr != nil || firstParam != nil || afterParam != nil || sortBy != "" {
			advancedRequested = true
		}
	}

	// Fetch current counters (for total + aggregates). Continue on error, but attempt to rebuild on cache miss.
	var counters *models.CampaignDomainCounters
	if c, cerr := h.deps.Stores.Campaign.GetCampaignDomainCounters(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); cerr == nil {
		counters = c
	} else {
		logFields := map[string]interface{}{"campaign_id": uuid.UUID(r.CampaignId)}
		if h.deps.Logger != nil {
			// store.ErrNotFound happens when counters row has not been materialized yet; rebuild below
			if errors.Is(cerr, store.ErrNotFound) {
				h.deps.Logger.Warn(ctx, "campaigns.domains.counters.missing", logFields)
			} else {
				h.deps.Logger.Error(ctx, "campaigns.domains.counters.fetch_failed", cerr, logFields)
			}
		} else {
			if errors.Is(cerr, store.ErrNotFound) {
				log.Printf("WARN campaigns.domains.counters.missing campaign=%s", uuid.UUID(r.CampaignId))
			} else {
				log.Printf("ERROR campaigns.domains.counters.fetch_failed campaign=%s err=%v", uuid.UUID(r.CampaignId), cerr)
			}
		}
		if rebuilt, rebuildErr := h.rebuildCampaignDomainCounters(ctx, uuid.UUID(r.CampaignId)); rebuildErr == nil {
			counters = rebuilt
			if h.deps.Logger != nil {
				h.deps.Logger.Info(ctx, "campaigns.domains.counters.rebuilt", map[string]interface{}{"campaign_id": uuid.UUID(r.CampaignId)})
			} else {
				log.Printf("INFO campaigns.domains.counters.rebuilt campaign=%s", uuid.UUID(r.CampaignId))
			}
		} else {
			if h.deps.Logger != nil {
				h.deps.Logger.Error(ctx, "campaigns.domains.counters.rebuild_failed", rebuildErr, map[string]interface{}{"campaign_id": uuid.UUID(r.CampaignId)})
			} else {
				log.Printf("ERROR campaigns.domains.counters.rebuild_failed campaign=%s err=%v", uuid.UUID(r.CampaignId), rebuildErr)
			}
		}
	}

	// Build optional filter
	var domainFilter *store.ListCampaignDomainsFilter
	if r.Params.DnsStatus != nil || r.Params.HttpStatus != nil || r.Params.DnsReason != nil || r.Params.HttpReason != nil {
		f := &store.ListCampaignDomainsFilter{}
		if r.Params.DnsStatus != nil {
			v := string(*r.Params.DnsStatus)
			f.DNSStatus = &v
		}
		if r.Params.HttpStatus != nil {
			v := string(*r.Params.HttpStatus)
			f.HTTPStatus = &v
		}
		if r.Params.DnsReason != nil {
			f.DNSReason = r.Params.DnsReason
		}
		if r.Params.HttpReason != nil {
			f.HTTPReason = r.Params.HttpReason
		}
		domainFilter = f
	}
	// Advanced path (cursor-based)
	if advancedRequested {
		lf := store.ListGeneratedDomainsFilter{CampaignID: uuid.UUID(r.CampaignId)}
		if firstParam != nil {
			lf.First = *firstParam
		} else {
			lf.First = limit
		}
		if afterParam != nil {
			lf.After = *afterParam
		}
		if sortBy != "" {
			lf.SortBy = sortBy
		}
		if sortOrder != "" {
			lf.SortOrder = sortOrder
		}
		lf.MinScore = minScorePtr
		lf.NotParked = notParkedPtr
		lf.HasContact = hasContactPtr
		lf.Keyword = keywordPtr
		page, derr := h.deps.Stores.Campaign.GetGeneratedDomainsWithCursor(ctx, h.deps.DB, lf)
		if derr != nil {
			return gen.CampaignsDomainsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed advanced domain listing", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		items := make([]gen.DomainListItem, 0, len(page.Data))
		var featureMap map[string]map[string]any
		if h.deps != nil && h.deps.Orchestrator != nil {
			// Non-fatal on error
			if fm, err := h.deps.Orchestrator.FetchAnalysisReadyFeatures(ctx, uuid.UUID(r.CampaignId)); err == nil {
				featureMap = fm
			}
		}
		for _, gd := range page.Data {
			if gd == nil {
				continue
			}
			var offsetPtr *int64
			if gd.OffsetIndex >= 0 {
				tmp := gd.OffsetIndex
				offsetPtr = &tmp
			}
			var dnsStatusPtr, httpStatusPtr, leadStatusPtr *string
			if gd.DNSStatus != nil {
				v := string(*gd.DNSStatus)
				dnsStatusPtr = &v
			}
			if gd.HTTPStatus != nil {
				v := string(*gd.HTTPStatus)
				httpStatusPtr = &v
			}
			if gd.LeadStatus != nil {
				v := string(*gd.LeadStatus)
				leadStatusPtr = &v
			}
			var dnsReasonPtr, httpReasonPtr *string
			if gd.DNSReason.Valid {
				dnsReasonPtr = &gd.DNSReason.String
			}
			if gd.HTTPReason.Valid {
				httpReasonPtr = &gd.HTTPReason.String
			}
			id := openapi_types.UUID(gd.ID)
			createdAt := gd.CreatedAt
			domainCopy := gd.DomainName
			var features *gen.DomainAnalysisFeatures
			if fv, ok := featureMap[domainCopy]; ok {
				features = mapRawToDomainAnalysisFeatures(fv)
			}
			items = append(items, gen.DomainListItem{Id: &id, Domain: &domainCopy, Offset: offsetPtr, CreatedAt: &createdAt, DnsStatus: dnsStatusPtr, HttpStatus: httpStatusPtr, LeadStatus: leadStatusPtr, DnsReason: dnsReasonPtr, HttpReason: httpReasonPtr, Features: features})
		}
		resp := gen.CampaignDomainsListResponse{CampaignId: openapi_types.UUID(r.CampaignId), Items: items}
		if counters != nil {
			resp.Total = int(counters.Total)
			resp.Aggregates = buildDomainAggregates(counters)
		} else {
			resp.Total = len(items)
		}
		// If feature map present, perform a JSON-level augmentation by serializing then injecting 'features'
		// features already embedded per item
		return gen.CampaignsDomainsList200JSONResponse(resp), nil
	}

	// ---- Phase 3: In-memory server-side richness sorting & warnings filtering (feature-flag guarded) ----
	// Environment flag ANALYSIS_SERVER_SORT enables provisional in-memory sorting & filtering by analysis features
	// using query params: sort (richness_score|microcrawl_gain|keywords_unique), dir (asc|desc), warnings (has|none).
	// This operates AFTER core DB filtering (dns/http status/reason) but BEFORE pagination window sizing (limit/offset).
	// NOTE: Once richness/microcrawl metrics are persisted in table columns, this logic should be replaced by
	// proper SQL ORDER BY and WHERE predicates; keep this block self-contained for easy removal.
	enableServerSort := strings.EqualFold(os.Getenv("ANALYSIS_SERVER_SORT"), "true") || os.Getenv("ANALYSIS_SERVER_SORT") == "1"
	requestedSortField := "richness_score"
	requestedSortDir := "desc"
	requestedWarnings := "" // "has" or "none"
	if enableServerSort {
		if r.Params.Sort != nil {
			// Reuse existing enum for score ordering only when advanced path used; new fields are custom
			// For Phase 3 we accept new textual fields present in OpenAPI but not generated enums yet.
			candidate := strings.ToLower(string(*r.Params.Sort))
			switch candidate { // accept canonical names
			case "richness_score", "microcrawl_gain", "keywords_unique":
				requestedSortField = candidate
			default:
				// keep default
			}
		}
		if v := getQueryRaw(ctx, "dir"); v != "" { // helper to fetch raw query when generator lacks field
			vd := strings.ToLower(v)
			if vd == "asc" || vd == "desc" {
				requestedSortDir = vd
			}
		}
		if v := getQueryRaw(ctx, "warnings"); v != "" {
			vw := strings.ToLower(v)
			if vw == "has" || vw == "none" {
				requestedWarnings = vw
			}
		}
	}

	rows, derr := h.deps.Stores.Campaign.GetGeneratedDomainsByCampaign(ctx, h.deps.DB, uuid.UUID(r.CampaignId), limit, startOffset, domainFilter)
	if derr != nil {
		return gen.CampaignsDomainsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed domain listing", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	var featureMap map[string]map[string]any
	if h.deps != nil && h.deps.Orchestrator != nil {
		if fm, err := h.deps.Orchestrator.FetchAnalysisReadyFeatures(ctx, uuid.UUID(r.CampaignId)); err == nil {
			featureMap = fm
		}
	}

	buildDomainItems := func(domains []*models.GeneratedDomain) []gen.DomainListItem {
		items := make([]gen.DomainListItem, 0, len(domains))
		for _, gd := range domains {
			if gd == nil {
				continue
			}
			var offsetPtr *int64
			if gd.OffsetIndex >= 0 {
				tmp := gd.OffsetIndex
				offsetPtr = &tmp
			}
			var dnsStatusPtr, httpStatusPtr, leadStatusPtr *string
			if gd.DNSStatus != nil {
				v := string(*gd.DNSStatus)
				dnsStatusPtr = &v
			}
			if gd.HTTPStatus != nil {
				v := string(*gd.HTTPStatus)
				httpStatusPtr = &v
			}
			if gd.LeadStatus != nil {
				v := string(*gd.LeadStatus)
				leadStatusPtr = &v
			}
			var dnsReasonPtr, httpReasonPtr *string
			if gd.DNSReason.Valid {
				dnsReasonPtr = &gd.DNSReason.String
			}
			if gd.HTTPReason.Valid {
				httpReasonPtr = &gd.HTTPReason.String
			}
			id := openapi_types.UUID(gd.ID)
			createdAt := gd.CreatedAt
			domainCopy := gd.DomainName
			var features *gen.DomainAnalysisFeatures
			if fv, ok := featureMap[domainCopy]; ok {
				features = mapRawToDomainAnalysisFeatures(fv)
			}
			items = append(items, gen.DomainListItem{Id: &id, Domain: &domainCopy, Offset: offsetPtr, CreatedAt: &createdAt, DnsStatus: dnsStatusPtr, HttpStatus: httpStatusPtr, LeadStatus: leadStatusPtr, DnsReason: dnsReasonPtr, HttpReason: httpReasonPtr, Features: features})
		}
		return items
	}

	leadStatusMatch := string(models.DomainLeadStatusMatch)
	hasLeadMatches := func(list []gen.DomainListItem) bool {
		for _, it := range list {
			if it.LeadStatus != nil && strings.EqualFold(*it.LeadStatus, leadStatusMatch) {
				return true
			}
		}
		return false
	}

	items := buildDomainItems(rows)
	fallbackEligible := startOffset == 0 && domainFilter == nil && counters != nil && counters.LeadMatch > 0
	if fallbackEligible && !hasLeadMatches(items) {
		leadFilter := &store.ListCampaignDomainsFilter{LeadStatus: &leadStatusMatch}
		if leadRows, err := h.deps.Stores.Campaign.GetGeneratedDomainsByCampaign(ctx, h.deps.DB, uuid.UUID(r.CampaignId), limit, 0, leadFilter); err == nil && len(leadRows) > 0 {
			items = buildDomainItems(leadRows)
		}
	}

	// legacy metadata wrapper removed; pagination info is embedded in response model
	if enableServerSort {
		// Apply warnings filter first (has/none)
		if requestedWarnings != "" {
			filtered := make([]gen.DomainListItem, 0, len(items))
			for _, it := range items {
				if it.Features == nil || it.Features.Richness == nil { // treat missing richness as clean
					if requestedWarnings == "none" {
						filtered = append(filtered, it)
					}
					continue
				}
				stuff := toFloat32Val(it.Features.Richness.StuffingPenalty)
				rep := toFloat32Val(it.Features.Richness.RepetitionIndex)
				anchor := toFloat32Val(it.Features.Richness.AnchorShare)
				hasWarn := (stuff > 0) || (rep > repetitionWarningThreshold) || (anchor > anchorShareWarningThreshold)
				if (requestedWarnings == "has" && hasWarn) || (requestedWarnings == "none" && !hasWarn) {
					filtered = append(filtered, it)
				}
			}
			items = filtered
		}
		// Sort by requested field
		if len(items) > 1 {
			// Decorate with index for stability
			// Convert nil metrics to sentinel -Inf for desc, +Inf for asc to push them to end
			// Implementation: compute value according to requestedSortField
			sort.SliceStable(items, func(i, j int) bool {
				vi := sortMetricValue(items[i], requestedSortField)
				vj := sortMetricValue(items[j], requestedSortField)
				if vi == vj {
					return i < j
				} // stable fallback
				if requestedSortDir == "asc" {
					return vi < vj
				}
				return vi > vj
			})
		}
		// Legacy metadata.extra removed; sort/filter info can be derived client-side
	}

	resp := gen.CampaignDomainsListResponse{CampaignId: openapi_types.UUID(r.CampaignId), Items: items}
	if counters != nil { // prefer counters total; fallback to len(items)
		resp.Total = int(counters.Total)
		resp.Aggregates = buildDomainAggregates(counters)
	} else {
		resp.Total = len(items)
	}
	// features already embedded
	if enableServerSort {
		ensureDomainsListMetrics()
		if domainsListServerSortRequests != nil {
			domainsListServerSortRequests.WithLabelValues(requestedSortField, requestedWarnings).Inc()
		}
		return campaignsDomainsList200WithHeader{gen.CampaignsDomainsList200JSONResponse(resp)}, nil
	}
	return gen.CampaignsDomainsList200JSONResponse(resp), nil
}

// getQueryRaw extracts a raw query parameter from context when not represented in generated params
// This relies on the request URL being available via standard library semantics in context when using net/http handlers.
// If unavailable, returns empty string.
func getQueryRaw(ctx context.Context, key string) string {
	// oapi-codegen stores *http.Request under context key, but to avoid importing net/http here unnecessarily
	// we attempt a reflective minimal approach: look for interface exposing URL() or RequestURI.
	// Simplify: param parsing already happened; only need for newly added params absent in generated struct (temporary shim).
	type urlGetter interface{ URL() *url.URL }
	if v := ctx.Value("http_request"); v != nil { // custom key if set upstream
		if ug, ok := v.(urlGetter); ok && ug.URL() != nil {
			return ug.URL().Query().Get(key)
		}
	}
	// Fallback: try conventional key used by chi/oapi middleware
	if v := ctx.Value("request_url"); v != nil {
		if u, ok := v.(*url.URL); ok && u != nil {
			return u.Query().Get(key)
		}
	}
	return ""
}

// toFloat32Val safely dereferences *float32 returning 0 when nil
func toFloat32Val(p *float32) float32 {
	if p == nil {
		return 0
	}
	return *p
}

// sortMetricValue extracts a float comparison key from DomainListItem given a field name.
// Missing metrics map to -Inf so they sink to the bottom for descending order and rise for ascending with caller logic.
func sortMetricValue(it gen.DomainListItem, field string) float64 {
	const negInf = -1.0 * 1e308
	if it.Features == nil {
		return negInf
	}
	switch field {
	case "microcrawl_gain":
		if it.Features.Microcrawl != nil && it.Features.Microcrawl.GainRatio != nil {
			return float64(*it.Features.Microcrawl.GainRatio)
		}
	case "keywords_unique":
		if it.Features.Keywords != nil && it.Features.Keywords.UniqueCount != nil {
			return float64(*it.Features.Keywords.UniqueCount)
		}
	default: // richness_score
		if it.Features.Richness != nil && it.Features.Richness.Score != nil {
			return float64(*it.Features.Richness.Score)
		}
	}
	return negInf
}

// CampaignsDomainGenerationPatternOffset implements POST /campaigns/domain-generation/pattern-offset
func (h *strictHandlers) CampaignsDomainGenerationPatternOffset(ctx context.Context, r gen.CampaignsDomainGenerationPatternOffsetRequestObject) (gen.CampaignsDomainGenerationPatternOffsetResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsDomainGenerationPatternOffset500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.CampaignsDomainGenerationPatternOffset400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Build params and hash using domainexpert to compute config hash
	constant := r.Body.ConstantString
	if constant == nil {
		s := ""
		constant = &s
	}
	// Normalize TLD: accept with or without dot, store without dot in hash params
	tld := ""
	if r.Body.Tld != nil {
		tld = *r.Body.Tld
		tld = strings.TrimPrefix(tld, ".")
	}
	var prefixNull sql.NullInt32
	var suffixNull sql.NullInt32
	legacyVar := 0
	if r.Body.VariableLength != nil {
		legacyVar = *r.Body.VariableLength
	}
	prefixVar := 0
	if r.Body.PrefixVariableLength != nil {
		prefixVar = *r.Body.PrefixVariableLength
	}
	suffixVar := 0
	if r.Body.SuffixVariableLength != nil {
		suffixVar = *r.Body.SuffixVariableLength
	}
	pattern := string(r.Body.PatternType)
	variableLengthTotal := 0

	switch r.Body.PatternType {
	case gen.PatternOffsetRequestPatternTypePrefix:
		if prefixVar == 0 {
			prefixVar = legacyVar
		}
		if prefixVar > 0 {
			prefixNull = sql.NullInt32{Int32: int32(prefixVar), Valid: true}
			variableLengthTotal = prefixVar
		}
		pattern = string(models.PatternTypePrefixVariable)
	case gen.PatternOffsetRequestPatternTypeSuffix:
		if suffixVar == 0 {
			suffixVar = legacyVar
		}
		if suffixVar > 0 {
			suffixNull = sql.NullInt32{Int32: int32(suffixVar), Valid: true}
			variableLengthTotal = suffixVar
		}
		pattern = string(models.PatternTypeSuffixVariable)
	case gen.PatternOffsetRequestPatternTypeBoth:
		if prefixVar == 0 {
			prefixVar = legacyVar
		}
		if suffixVar == 0 {
			suffixVar = legacyVar
		}
		if prefixVar > 0 {
			prefixNull = sql.NullInt32{Int32: int32(prefixVar), Valid: true}
		}
		if suffixVar > 0 {
			suffixNull = sql.NullInt32{Int32: int32(suffixVar), Valid: true}
		}
		variableLengthTotal = prefixVar + suffixVar
		pattern = string(models.PatternTypeBothVariable)
	default:
		variableLengthTotal = legacyVar
	}

	params := models.DomainGenerationCampaignParams{
		PatternType:          pattern,
		VariableLength:       variableLengthTotal,
		PrefixVariableLength: prefixNull,
		SuffixVariableLength: suffixNull,
		CharacterSet:         r.Body.CharacterSet,
		ConstantString:       models.StringPtr(*constant),
		TLD:                  tld,
	}
	hashRes, err := domainexpert.GenerateDomainGenerationPhaseConfigHash(params)
	if err != nil {
		return gen.CampaignsDomainGenerationPatternOffset500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to compute pattern hash", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	cfgHash := hashRes.HashString
	// Prefer config manager path when available via services, else store fallback
	var current int64
	// Try via store
	st, getErr := h.deps.Stores.Campaign.GetDomainGenerationPhaseConfigStateByHash(ctx, h.deps.DB, cfgHash)
	if getErr == nil && st != nil {
		current = st.LastOffset
	} else if getErr == store.ErrNotFound {
		current = 0
	} else if getErr != nil {
		log.Printf("pattern-offset: failed to get state by hash: %v", getErr)
		current = 0
	}
	data := gen.PatternOffsetResponse{CurrentOffset: &current}
	return gen.CampaignsDomainGenerationPatternOffset200JSONResponse(data), nil
}

// augmentDomainFeatures injects feature objects into response.Items by converting each item to a generic map then back.
// Because generated structs lack 'features' until next Go codegen integration, we append via reflection-safe JSON maps.
// mapRawToDomainAnalysisFeatures converts raw nested map to typed struct.
func mapRawToDomainAnalysisFeatures(raw map[string]any) *gen.DomainAnalysisFeatures {
	if raw == nil {
		return nil
	}
	kw, _ := raw["keywords"].(map[string]any)
	rich, _ := raw["richness"].(map[string]any)
	mc, _ := raw["microcrawl"].(map[string]any)
	toFloat32 := func(v any) *float32 {
		switch x := v.(type) {
		case float64:
			f := float32(x)
			return &f
		case float32:
			return &x
		case int:
			f := float32(x)
			return &f
		default:
			return nil
		}
	}
	toInt64 := func(v any) *int64 {
		switch x := v.(type) {
		case int64:
			return &x
		case int:
			xi := int64(x)
			return &xi
		case float64:
			xi := int64(x)
			return &xi
		default:
			return nil
		}
	}
	var top3 *[]string
	if arr, ok := kw["top3"].([]any); ok {
		tmp := make([]string, 0, len(arr))
		for _, e := range arr {
			if s, ok := e.(string); ok {
				tmp = append(tmp, s)
			}
		}
		top3 = &tmp
	} else if arrs, ok := kw["top3"].([]string); ok {
		top3 = &arrs
	}
	var sigMap *map[string]int32
	if sd, ok := kw["signal_distribution"].(map[string]any); ok {
		tmp := make(map[string]int32, len(sd))
		for k, v := range sd {
			switch n := v.(type) {
			case float64:
				tmp[k] = int32(n)
			case int:
				tmp[k] = int32(n)
			case int64:
				tmp[k] = int32(n)
			}
		}
		sigMap = &tmp
	}
	keywordsStruct := &struct {
		HitsTotal          *int                `json:"hits_total"`
		SignalDistribution *map[string]float32 `json:"signal_distribution,omitempty"`
		Top3               *[]string           `json:"top3,omitempty"`
		UniqueCount        *int                `json:"unique_count"`
		WeightSum          *float32            `json:"weight_sum"`
	}{
		UniqueCount: func() *int {
			if v := toInt64(kw["unique_count"]); v != nil {
				t := int(*v)
				return &t
			}
			return nil
		}(),
		HitsTotal: func() *int {
			if v := toInt64(kw["hits_total"]); v != nil {
				t := int(*v)
				return &t
			}
			return nil
		}(),
		WeightSum: toFloat32(kw["weight_sum"]),
		Top3:      top3,
		SignalDistribution: func() *map[string]float32 {
			if sigMap == nil {
				return nil
			}
			tmp := make(map[string]float32, len(*sigMap))
			for k, v := range *sigMap {
				tmp[k] = float32(v)
			}
			return &tmp
		}(),
	}
	richnessStruct := &struct {
		AnchorShare              *float32 `json:"anchor_share"`
		AppliedBonus             *float32 `json:"applied_bonus"`
		AppliedDeductionsTotal   *float32 `json:"applied_deductions_total"`
		DiversityEffectiveUnique *float32 `json:"diversity_effective_unique"`
		DiversityNorm            *float32 `json:"diversity_norm"`
		EnrichmentNorm           *float32 `json:"enrichment_norm"`
		ProminenceNorm           *float32 `json:"prominence_norm"`
		RepetitionIndex          *float32 `json:"repetition_index"`
		Score                    *float32 `json:"score"`
		StuffingPenalty          *float32 `json:"stuffing_penalty"`
		Version                  *int     `json:"version"`
	}{
		Score: toFloat32(rich["score"]),
		Version: func() *int {
			if v := rich["version"]; v != nil {
				switch x := v.(type) {
				case int:
					return &x
				case int32:
					t := int(x)
					return &t
				case float64:
					t := int(x)
					return &t
				}
			}
			return nil
		}(),
		ProminenceNorm:           toFloat32(rich["prominence_norm"]),
		DiversityEffectiveUnique: toFloat32(rich["diversity_effective_unique"]),
		DiversityNorm:            toFloat32(rich["diversity_norm"]),
		EnrichmentNorm:           toFloat32(rich["enrichment_norm"]),
		AppliedBonus:             toFloat32(rich["applied_bonus"]),
		AppliedDeductionsTotal:   toFloat32(rich["applied_deductions_total"]),
		StuffingPenalty:          toFloat32(rich["stuffing_penalty"]),
		RepetitionIndex:          toFloat32(rich["repetition_index"]),
		AnchorShare:              toFloat32(rich["anchor_share"]),
	}
	microcrawlStruct := &struct {
		GainRatio *float32 `json:"gain_ratio"`
	}{GainRatio: toFloat32(mc["gain_ratio"])}
	return &gen.DomainAnalysisFeatures{Keywords: keywordsStruct, Richness: richnessStruct, Microcrawl: microcrawlStruct}
}

// CampaignsStateGet implements GET /campaigns/{campaignId}/state
func (h *strictHandlers) CampaignsStateGet(ctx context.Context, r gen.CampaignsStateGetRequestObject) (gen.CampaignsStateGetResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsStateGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	st, err := h.deps.Stores.Campaign.GetCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsStateGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign state not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsStateGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign state", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Map models.CampaignState to API CampaignState
	api := gen.CampaignState{
		CampaignId:   openapi_types.UUID(st.CampaignID),
		CurrentState: gen.CampaignStateEnum(st.CurrentState),
		Mode:         gen.CampaignModeEnum(st.Mode),
		Version:      st.Version,
		CreatedAt:    st.CreatedAt,
		UpdatedAt:    st.UpdatedAt,
	}
	// configuration JSON -> map
	if len(st.Configuration) > 0 {
		var m map[string]interface{}
		if err := json.Unmarshal(st.Configuration, &m); err == nil {
			flexMap := make(map[string]*gen.FlexibleValue)
			for k, v := range m {
				flexMap[k] = flexibleValuePtrFromInterface(v)
			}
			api.Configuration = &flexMap
		}
	}
	return gen.CampaignsStateGet200JSONResponse(api), nil
}

// CampaignsStatePut implements PUT /campaigns/{campaignId}/state
func (h *strictHandlers) CampaignsStatePut(ctx context.Context, r gen.CampaignsStatePutRequestObject) (gen.CampaignsStatePutResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsStatePut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.CampaignsStatePut400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Build models.CampaignState from request
	var cfg json.RawMessage
	if r.Body.Configuration != nil {
		b, _ := json.Marshal(r.Body.Configuration)
		cfg = b
	}
	// Try to read existing to keep immutable fields
	existing, _ := h.deps.Stores.Campaign.GetCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	st := &models.CampaignState{
		CampaignID: uuid.UUID(r.CampaignId),
		CurrentState: func() models.CampaignStateEnum {
			if r.Body.CurrentState != nil {
				return models.CampaignStateEnum(*r.Body.CurrentState)
			}
			if existing != nil {
				return existing.CurrentState
			}
			return models.CampaignStateDraft
		}(),
		Mode: func() models.CampaignModeEnum {
			if r.Body.Mode != nil {
				return models.CampaignModeEnum(*r.Body.Mode)
			}
			if existing != nil {
				return existing.Mode
			}
			return models.CampaignModeStepByStep
		}(),
		Configuration: cfg,
		Version:       int(0),
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
	}
	if r.Body.Version != nil {
		st.Version = int(*r.Body.Version)
	} else if existing != nil {
		st.Version = existing.Version
	}
	// Upsert via CreateCampaignState implementation (conflict updates)
	if err := h.deps.Stores.Campaign.CreateCampaignState(ctx, h.deps.DB, st); err != nil {
		return gen.CampaignsStatePut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to save campaign state", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Return fresh copy
	fresh, _ := h.deps.Stores.Campaign.GetCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	api := gen.CampaignState{
		CampaignId:   openapi_types.UUID(fresh.CampaignID),
		CurrentState: gen.CampaignStateEnum(fresh.CurrentState),
		Mode:         gen.CampaignModeEnum(fresh.Mode),
		Version:      fresh.Version,
		CreatedAt:    fresh.CreatedAt,
		UpdatedAt:    fresh.UpdatedAt,
	}
	if len(fresh.Configuration) > 0 {
		var m map[string]interface{}
		if err := json.Unmarshal(fresh.Configuration, &m); err == nil {
			flexMap := make(map[string]*gen.FlexibleValue)
			for k, v := range m {
				flexMap[k] = flexibleValuePtrFromInterface(v)
			}
			api.Configuration = &flexMap
		}
	}
	return gen.CampaignsStatePut200JSONResponse(api), nil
}

// CampaignsStateDelete implements DELETE /campaigns/{campaignId}/state
func (h *strictHandlers) CampaignsStateDelete(ctx context.Context, r gen.CampaignsStateDeleteRequestObject) (gen.CampaignsStateDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsStateDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Campaign.DeleteCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId)); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsStateDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "campaign state not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsStateDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete campaign state", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.CampaignsStateDelete204Response{}, nil
}

// CampaignsPhaseExecutionsList implements GET /campaigns/{campaignId}/phase-executions
func (h *strictHandlers) CampaignsPhaseExecutionsList(ctx context.Context, r gen.CampaignsPhaseExecutionsListRequestObject) (gen.CampaignsPhaseExecutionsListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseExecutionsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	list, err := h.deps.Stores.Campaign.GetPhaseExecutionsByCampaign(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if err != nil {
		return gen.CampaignsPhaseExecutionsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list phase executions", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Load state if available
	st, stErr := h.deps.Stores.Campaign.GetCampaignState(ctx, h.deps.DB, uuid.UUID(r.CampaignId))
	if stErr != nil && stErr != store.ErrNotFound {
		return gen.CampaignsPhaseExecutionsList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load campaign state", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	apiState := gen.CampaignState{}
	if st != nil {
		apiState = gen.CampaignState{CampaignId: openapi_types.UUID(st.CampaignID), CurrentState: gen.CampaignStateEnum(st.CurrentState), Mode: gen.CampaignModeEnum(st.Mode), Version: st.Version, CreatedAt: st.CreatedAt, UpdatedAt: st.UpdatedAt}
		if len(st.Configuration) > 0 {
			var m map[string]interface{}
			_ = json.Unmarshal(st.Configuration, &m)
			flexMap := make(map[string]*gen.FlexibleValue)
			for k, v := range m {
				flexMap[k] = flexibleValuePtrFromInterface(v)
			}
			apiState.Configuration = &flexMap
		}
	}
	execs := make([]gen.PhaseExecution, 0, len(list))
	for _, pe := range list {
		if pe != nil {
			execs = append(execs, mapPhaseExecutionToAPI(*pe))
		}
	}
	composite := gen.CampaignStateWithExecutions{CampaignState: apiState, PhaseExecutions: execs}
	return gen.CampaignsPhaseExecutionsList200JSONResponse(composite), nil
}

// CampaignsPhaseExecutionGet implements GET /campaigns/{campaignId}/phase-executions/{phaseType}
func (h *strictHandlers) CampaignsPhaseExecutionGet(ctx context.Context, r gen.CampaignsPhaseExecutionGetRequestObject) (gen.CampaignsPhaseExecutionGetResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseExecutionGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Map API phaseType to models.PhaseTypeEnum using existing map
	phaseModel, err := mapAPIPhaseToModel(string(r.PhaseType))
	if err != nil {
		return gen.CampaignsPhaseExecutionGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "invalid phase type", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	pe, err := h.deps.Stores.Campaign.GetPhaseExecution(ctx, h.deps.DB, uuid.UUID(r.CampaignId), phaseModel)
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseExecutionGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "phase execution not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseExecutionGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to get phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	api := mapPhaseExecutionToAPI(*pe)
	return gen.CampaignsPhaseExecutionGet200JSONResponse(api), nil
}

// CampaignsPhaseExecutionPut implements PUT /campaigns/{campaignId}/phase-executions/{phaseType}
func (h *strictHandlers) CampaignsPhaseExecutionPut(ctx context.Context, r gen.CampaignsPhaseExecutionPutRequestObject) (gen.CampaignsPhaseExecutionPutResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseExecutionPut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Map phase type
	phaseModel, err := mapAPIPhaseToModel(string(r.PhaseType))
	if err != nil {
		return gen.CampaignsPhaseExecutionPut404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "invalid phase type", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Fetch existing if any
	existing, err := h.deps.Stores.Campaign.GetPhaseExecution(ctx, h.deps.DB, uuid.UUID(r.CampaignId), phaseModel)
	if err != nil && err != store.ErrNotFound {
		return gen.CampaignsPhaseExecutionPut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Build model entity by applying updates (partial update semantics)
	applyUpdate := func(dst *models.PhaseExecution, body *gen.PhaseExecutionUpdate) {
		if body == nil {
			return
		}
		if body.Status != nil {
			dst.Status = models.ExecutionStatusEnum(*body.Status)
		}
		if body.StartedAt != nil {
			dst.StartedAt = body.StartedAt
		}
		if body.CompletedAt != nil {
			dst.CompletedAt = body.CompletedAt
		}
		if body.PausedAt != nil {
			dst.PausedAt = body.PausedAt
		}
		if body.FailedAt != nil {
			dst.FailedAt = body.FailedAt
		}
		if body.ProgressPercentage != nil {
			f := float64(*body.ProgressPercentage)
			dst.ProgressPercentage = &f
		}
		if body.TotalItems != nil {
			dst.TotalItems = body.TotalItems
		}
		if body.ProcessedItems != nil {
			dst.ProcessedItems = body.ProcessedItems
		}
		if body.SuccessfulItems != nil {
			dst.SuccessfulItems = body.SuccessfulItems
		}
		if body.FailedItems != nil {
			dst.FailedItems = body.FailedItems
		}
		if body.Configuration != nil {
			if b, err := json.Marshal(body.Configuration); err == nil {
				raw := json.RawMessage(b)
				dst.Configuration = &raw
			}
		}
		if body.ErrorDetails != nil {
			if b, err := json.Marshal(body.ErrorDetails); err == nil {
				raw := json.RawMessage(b)
				dst.ErrorDetails = &raw
			}
		}
		if body.Metrics != nil {
			if b, err := json.Marshal(body.Metrics); err == nil {
				raw := json.RawMessage(b)
				dst.Metrics = &raw
			}
		}
		// updated_at handled by DB
	}

	if existing != nil {
		// Update path
		e := *existing
		applyUpdate(&e, r.Body)
		if err := h.deps.Stores.Campaign.UpdatePhaseExecution(ctx, h.deps.DB, &e); err != nil {
			if err == store.ErrNotFound {
				return gen.CampaignsPhaseExecutionPut404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "phase execution not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
			}
			return gen.CampaignsPhaseExecutionPut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	} else {
		// Create path (upsert) with sensible defaults
		e := &models.PhaseExecution{
			CampaignID: uuid.UUID(r.CampaignId),
			PhaseType:  phaseModel,
			Status:     models.ExecutionStatusNotStarted,
		}
		// Apply body fields
		applyUpdate(e, r.Body)
		if err := h.deps.Stores.Campaign.CreatePhaseExecution(ctx, h.deps.DB, e); err != nil {
			return gen.CampaignsPhaseExecutionPut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
	}

	// Load fresh and return
	fresh, err := h.deps.Stores.Campaign.GetPhaseExecution(ctx, h.deps.DB, uuid.UUID(r.CampaignId), phaseModel)
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseExecutionPut404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "phase execution not found after save", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseExecutionPut500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load phase execution after save", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	api := mapPhaseExecutionToAPI(*fresh)
	return gen.CampaignsPhaseExecutionPut200JSONResponse(api), nil
}

// CampaignsPhaseExecutionDelete implements DELETE /campaigns/{campaignId}/phase-executions/{phaseType}
func (h *strictHandlers) CampaignsPhaseExecutionDelete(ctx context.Context, r gen.CampaignsPhaseExecutionDeleteRequestObject) (gen.CampaignsPhaseExecutionDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Campaign == nil || h.deps.DB == nil {
		return gen.CampaignsPhaseExecutionDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "dependencies not ready", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	phaseModel, err := mapAPIPhaseToModel(string(r.PhaseType))
	if err != nil {
		return gen.CampaignsPhaseExecutionDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "invalid phase type", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	// Find existing to get ID
	pe, err := h.deps.Stores.Campaign.GetPhaseExecution(ctx, h.deps.DB, uuid.UUID(r.CampaignId), phaseModel)
	if err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseExecutionDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "phase execution not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseExecutionDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to load phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Campaign.DeletePhaseExecution(ctx, h.deps.DB, pe.ID); err != nil {
		if err == store.ErrNotFound {
			return gen.CampaignsPhaseExecutionDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "phase execution not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.CampaignsPhaseExecutionDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete phase execution", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	return gen.CampaignsPhaseExecutionDelete204Response{}, nil
}

// mapPhaseExecutionToAPI converts models.PhaseExecution to API PhaseExecution
func mapPhaseExecutionToAPI(pe models.PhaseExecution) gen.PhaseExecution {
	api := gen.PhaseExecution{
		Id:         openapi_types.UUID(pe.ID),
		CampaignId: openapi_types.UUID(pe.CampaignID),
		PhaseType:  gen.PhaseExecutionPhaseType(mapModelPhaseToAPI(pe.PhaseType)),
		Status:     gen.ExecutionStatusEnum(pe.Status),
		CreatedAt:  pe.CreatedAt,
		UpdatedAt:  pe.UpdatedAt,
	}
	api.StartedAt = pe.StartedAt
	api.CompletedAt = pe.CompletedAt
	api.PausedAt = pe.PausedAt
	api.FailedAt = pe.FailedAt
	if pe.ProgressPercentage != nil {
		v := float32(*pe.ProgressPercentage)
		api.ProgressPercentage = &v
	}
	if pe.TotalItems != nil {
		vv := int64(*pe.TotalItems)
		api.TotalItems = &vv
	}
	if pe.ProcessedItems != nil {
		vv := int64(*pe.ProcessedItems)
		api.ProcessedItems = &vv
	}
	if pe.SuccessfulItems != nil {
		vv := int64(*pe.SuccessfulItems)
		api.SuccessfulItems = &vv
	}
	if pe.FailedItems != nil {
		vv := int64(*pe.FailedItems)
		api.FailedItems = &vv
	}
	// JSON fields
	if pe.Configuration != nil && len(*pe.Configuration) > 0 {
		var m map[string]interface{}
		if err := json.Unmarshal(*pe.Configuration, &m); err == nil {
			api.Configuration = &m
		}
	}
	if pe.ErrorDetails != nil && len(*pe.ErrorDetails) > 0 {
		var m map[string]interface{}
		if err := json.Unmarshal(*pe.ErrorDetails, &m); err == nil {
			flexMap := make(map[string]*gen.FlexibleValue)
			for k, v := range m {
				flexMap[k] = flexibleValuePtrFromInterface(v)
			}
			api.ErrorDetails = &flexMap
		}
	}
	if pe.Metrics != nil && len(*pe.Metrics) > 0 {
		var m map[string]interface{}
		if err := json.Unmarshal(*pe.Metrics, &m); err == nil {
			flexMap := make(map[string]*gen.FlexibleValue)
			for k, v := range m {
				flexMap[k] = flexibleValuePtrFromInterface(v)
			}
			api.Metrics = &flexMap
		}
	}
	return api
}

func toStringPtr(v interface{}) *string {
	if v == nil {
		return nil
	}
	s, ok := v.(string)
	if !ok {
		return nil
	}
	return &s
}

func toStringVal(v interface{}) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// aggregateHelper builds the aggregates payload for CampaignDomainsListResponse
func buildDomainAggregates(counters *models.CampaignDomainCounters) *struct {
	Dns *struct {
		Error   *int `json:"error,omitempty"`
		Ok      *int `json:"ok,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	} `json:"dns,omitempty"`
	Http *struct {
		Error   *int `json:"error,omitempty"`
		Ok      *int `json:"ok,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	} `json:"http,omitempty"`
	Lead *struct {
		Error   *int `json:"error,omitempty"`
		Match   *int `json:"match,omitempty"`
		NoMatch *int `json:"noMatch,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	} `json:"lead,omitempty"`
} {
	if counters == nil {
		return nil
	}
	toPtr := func(v int64) *int { x := int(v); return &x }
	agg := struct {
		Dns *struct {
			Error   *int `json:"error,omitempty"`
			Ok      *int `json:"ok,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"dns,omitempty"`
		Http *struct {
			Error   *int `json:"error,omitempty"`
			Ok      *int `json:"ok,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"http,omitempty"`
		Lead *struct {
			Error   *int `json:"error,omitempty"`
			Match   *int `json:"match,omitempty"`
			NoMatch *int `json:"noMatch,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"lead,omitempty"`
	}{}
	agg.Dns = &struct {
		Error   *int `json:"error,omitempty"`
		Ok      *int `json:"ok,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	}{Error: toPtr(counters.DNSError), Ok: toPtr(counters.DNSOk), Pending: toPtr(counters.DNSPending), Timeout: toPtr(counters.DNSTimeout)}
	agg.Http = &struct {
		Error   *int `json:"error,omitempty"`
		Ok      *int `json:"ok,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	}{Error: toPtr(counters.HTTPError), Ok: toPtr(counters.HTTPOk), Pending: toPtr(counters.HTTPPending), Timeout: toPtr(counters.HTTPTimeout)}
	agg.Lead = &struct {
		Error   *int `json:"error,omitempty"`
		Match   *int `json:"match,omitempty"`
		NoMatch *int `json:"noMatch,omitempty"`
		Pending *int `json:"pending,omitempty"`
		Timeout *int `json:"timeout,omitempty"`
	}{Error: toPtr(counters.LeadError), Match: toPtr(counters.LeadMatch), NoMatch: toPtr(counters.LeadNoMatch), Pending: toPtr(counters.LeadPending), Timeout: toPtr(counters.LeadTimeout)}
	return &struct {
		Dns *struct {
			Error   *int `json:"error,omitempty"`
			Ok      *int `json:"ok,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"dns,omitempty"`
		Http *struct {
			Error   *int `json:"error,omitempty"`
			Ok      *int `json:"ok,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"http,omitempty"`
		Lead *struct {
			Error   *int `json:"error,omitempty"`
			Match   *int `json:"match,omitempty"`
			NoMatch *int `json:"noMatch,omitempty"`
			Pending *int `json:"pending,omitempty"`
			Timeout *int `json:"timeout,omitempty"`
		} `json:"lead,omitempty"`
	}{Dns: agg.Dns, Http: agg.Http, Lead: agg.Lead}
}

type domainCounterSnapshot struct {
	TotalDomains int64 `db:"total_domains"`
	DNSPending   int64 `db:"dns_pending"`
	DNSOk        int64 `db:"dns_ok"`
	DNSError     int64 `db:"dns_error"`
	DNSTimeout   int64 `db:"dns_timeout"`
	HTTPPending  int64 `db:"http_pending"`
	HTTPOk       int64 `db:"http_ok"`
	HTTPError    int64 `db:"http_error"`
	HTTPTimeout  int64 `db:"http_timeout"`
	LeadPending  int64 `db:"lead_pending"`
	LeadMatch    int64 `db:"lead_match"`
	LeadNoMatch  int64 `db:"lead_no_match"`
	LeadError    int64 `db:"lead_error"`
	LeadTimeout  int64 `db:"lead_timeout"`
}

const campaignDomainCountersAggregationSQL = `
SELECT
    COUNT(*) AS total_domains,
    COUNT(*) FILTER (WHERE dns_status = 'pending') AS dns_pending,
    COUNT(*) FILTER (WHERE dns_status = 'ok') AS dns_ok,
    COUNT(*) FILTER (WHERE dns_status = 'error') AS dns_error,
    COUNT(*) FILTER (WHERE dns_status = 'timeout') AS dns_timeout,
    COUNT(*) FILTER (WHERE http_status = 'pending') AS http_pending,
    COUNT(*) FILTER (WHERE http_status = 'ok') AS http_ok,
    COUNT(*) FILTER (WHERE http_status = 'error') AS http_error,
    COUNT(*) FILTER (WHERE http_status = 'timeout') AS http_timeout,
    COUNT(*) FILTER (WHERE lead_status = 'pending') AS lead_pending,
    COUNT(*) FILTER (WHERE lead_status = 'match') AS lead_match,
    COUNT(*) FILTER (WHERE lead_status = 'no_match') AS lead_no_match,
    COUNT(*) FILTER (WHERE lead_status = 'error') AS lead_error,
    COUNT(*) FILTER (WHERE lead_status = 'timeout') AS lead_timeout
FROM generated_domains
WHERE campaign_id = $1;
`

const campaignDomainCountersUpsertSQL = `
INSERT INTO campaign_domain_counters (
    campaign_id,
    total_domains,
    dns_pending,
    dns_ok,
    dns_error,
    dns_timeout,
    http_pending,
    http_ok,
    http_error,
    http_timeout,
    lead_pending,
    lead_match,
    lead_no_match,
    lead_error,
    lead_timeout
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
)
ON CONFLICT (campaign_id) DO UPDATE SET
    total_domains = EXCLUDED.total_domains,
    dns_pending = EXCLUDED.dns_pending,
    dns_ok = EXCLUDED.dns_ok,
    dns_error = EXCLUDED.dns_error,
    dns_timeout = EXCLUDED.dns_timeout,
    http_pending = EXCLUDED.http_pending,
    http_ok = EXCLUDED.http_ok,
    http_error = EXCLUDED.http_error,
    http_timeout = EXCLUDED.http_timeout,
    lead_pending = EXCLUDED.lead_pending,
    lead_match = EXCLUDED.lead_match,
    lead_no_match = EXCLUDED.lead_no_match,
    lead_error = EXCLUDED.lead_error,
    lead_timeout = EXCLUDED.lead_timeout,
    updated_at = NOW()
RETURNING campaign_id, total_domains, dns_pending, dns_ok, dns_error, dns_timeout,
          http_pending, http_ok, http_error, http_timeout,
          lead_pending, lead_match, lead_no_match, lead_error, lead_timeout,
          updated_at, created_at;
`

func (h *strictHandlers) rebuildCampaignDomainCounters(ctx context.Context, campaignID uuid.UUID) (*models.CampaignDomainCounters, error) {
	if h == nil || h.deps == nil || h.deps.DB == nil {
		return nil, fmt.Errorf("database dependency not initialized")
	}
	tCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	var snapshot domainCounterSnapshot
	if err := h.deps.DB.GetContext(tCtx, &snapshot, campaignDomainCountersAggregationSQL, campaignID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			snapshot = domainCounterSnapshot{}
		} else {
			return nil, err
		}
	}
	args := []interface{}{
		campaignID,
		snapshot.TotalDomains,
		snapshot.DNSPending,
		snapshot.DNSOk,
		snapshot.DNSError,
		snapshot.DNSTimeout,
		snapshot.HTTPPending,
		snapshot.HTTPOk,
		snapshot.HTTPError,
		snapshot.HTTPTimeout,
		snapshot.LeadPending,
		snapshot.LeadMatch,
		snapshot.LeadNoMatch,
		snapshot.LeadError,
		snapshot.LeadTimeout,
	}
	var stored models.CampaignDomainCounters
	if err := h.deps.DB.GetContext(tCtx, &stored, campaignDomainCountersUpsertSQL, args...); err != nil {
		return nil, err
	}
	return &stored, nil
}
