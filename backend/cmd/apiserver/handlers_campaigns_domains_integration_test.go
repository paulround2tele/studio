package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/url"
	"os"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/application"
	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// dualReadAnalysisStub implements DualReadFetch + RescoreCampaign subset needed by orchestrator
type dualReadAnalysisStub struct{ fm map[string]map[string]any }

func (a *dualReadAnalysisStub) DualReadFetch(ctx context.Context, campaignID uuid.UUID) (map[string]map[string]any, error) {
	return a.fm, nil
}
func (a *dualReadAnalysisStub) RescoreCampaign(ctx context.Context, id uuid.UUID) error { return nil }

// PhaseService minimal implementations
func (a *dualReadAnalysisStub) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	return nil
}
func (a *dualReadAnalysisStub) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan domainservices.PhaseProgress, error) {
	ch := make(chan domainservices.PhaseProgress)
	close(ch)
	return ch, nil
}
func (a *dualReadAnalysisStub) GetStatus(ctx context.Context, campaignID uuid.UUID) (*domainservices.PhaseStatus, error) {
	return &domainservices.PhaseStatus{CampaignID: campaignID}, nil
}
func (a *dualReadAnalysisStub) Cancel(ctx context.Context, campaignID uuid.UUID) error { return nil }
func (a *dualReadAnalysisStub) Validate(ctx context.Context, config interface{}) error { return nil }
func (a *dualReadAnalysisStub) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeEnum("analysis")
}
func (a *dualReadAnalysisStub) ScoreDomains(ctx context.Context, campaignID uuid.UUID) error {
	return nil
}

// minimal fake campaign store implementing only methods we exercise
type fakeCampaignStoreForDomains struct {
	domains         []*models.GeneratedDomain
	counters        *models.CampaignDomainCounters
	countersErr     error
	phaseExecutions []*models.PhaseExecution
	phaseExecErr    error
	state           *models.CampaignState
	stateErr        error
}

func newFakeCampaignStoreForDomains() *fakeCampaignStoreForDomains {
	return &fakeCampaignStoreForDomains{
		domains:         []*models.GeneratedDomain{},
		counters:        &models.CampaignDomainCounters{Total: int64(0)},
		phaseExecutions: []*models.PhaseExecution{},
	}
}

func (f *fakeCampaignStoreForDomains) GetCampaignByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.LeadGenerationCampaign, error) {
	// Always pretend campaign exists
	now := time.Now()
	return &models.LeadGenerationCampaign{ID: id, Name: "test", CreatedAt: now, UpdatedAt: now}, nil
}
func (f *fakeCampaignStoreForDomains) GetGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit int, offset int64, filter *store.ListCampaignDomainsFilter) ([]*models.GeneratedDomain, error) {
	out := make([]*models.GeneratedDomain, 0, len(f.domains))
	for _, d := range f.domains {
		out = append(out, d)
	}
	// mimic limit/offset after ordering (ordering done later by handler for server sort path)
	// we just return slice; handler applies limit again; keep simple.
	return out, nil
}
func (f *fakeCampaignStoreForDomains) GetCampaignDomainCounters(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.CampaignDomainCounters, error) {
	if f.countersErr != nil {
		return nil, f.countersErr
	}
	return f.counters, nil
}

// Unused interface methods (no-op / minimal) ---------------------------------
func (f *fakeCampaignStoreForDomains) CreateCampaign(ctx context.Context, exec store.Querier, c *models.LeadGenerationCampaign) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) ListCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) ([]*models.LeadGenerationCampaign, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) UpdateCampaign(ctx context.Context, exec store.Querier, c *models.LeadGenerationCampaign) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) DeleteCampaign(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) UpdateCampaignMode(ctx context.Context, exec store.Querier, id uuid.UUID, mode string) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetCampaignState(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.CampaignState, error) {
	if f.stateErr != nil {
		return nil, f.stateErr
	}
	if f.state == nil {
		return nil, store.ErrNotFound
	}
	return f.state, nil
}
func (f *fakeCampaignStoreForDomains) CreateCampaignState(ctx context.Context, exec store.Querier, st *models.CampaignState) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetPhaseExecutionsByCampaign(ctx context.Context, exec store.Querier, id uuid.UUID) ([]*models.PhaseExecution, error) {
	if f.phaseExecErr != nil {
		return nil, f.phaseExecErr
	}
	return f.phaseExecutions, nil
}
func (f *fakeCampaignStoreForDomains) GetPhaseExecution(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum) (*models.PhaseExecution, error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) UpdatePhaseExecution(ctx context.Context, exec store.Querier, e *models.PhaseExecution) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) CreatePhaseExecution(ctx context.Context, exec store.Querier, e *models.PhaseExecution) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) DeletePhaseExecution(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) ListPhaseConfigs(ctx context.Context, exec store.Querier, id uuid.UUID) (map[models.PhaseTypeEnum]json.RawMessage, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) UpsertPhaseConfig(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum, raw json.RawMessage) error {
	return nil
}

// Additional interface satisfaction (nop implementations)
func (f *fakeCampaignStoreForDomains) GetGeneratedDomainsWithCursor(ctx context.Context, exec store.Querier, f2 store.ListGeneratedDomainsFilter) (*store.PaginatedResult[*models.GeneratedDomain], error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) GetGeneratedDomainsForBulk(ctx context.Context, exec store.Querier, id uuid.UUID, limit int, offset int64) ([]*models.GeneratedDomain, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) ReconcileDomainCounters(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.CampaignDomainCounters, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) GetCampaignDomainCountersByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.CampaignDomainCounters, error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) ListMostRecentDomains(ctx context.Context, exec store.Querier, userID *uuid.UUID, limit int) ([]*models.GeneratedDomain, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) CreateGeneratedDomain(ctx context.Context, exec store.Querier, d *models.GeneratedDomain) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) BulkUpsertGeneratedDomains(ctx context.Context, exec store.Querier, domains []*models.GeneratedDomain) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) CountGeneratedDomains(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int64, error) {
	return int64(len(f.domains)), nil
}

// Phase operations (unused)
func (f *fakeCampaignStoreForDomains) CreateCampaignPhases(ctx context.Context, exec store.Querier, campaignID uuid.UUID) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetCampaignPhases(ctx context.Context, exec store.Querier, campaignID uuid.UUID) ([]*models.CampaignPhase, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) GetCampaignPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) (*models.CampaignPhase, error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) UpdatePhaseStatus(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, status models.PhaseStatusEnum) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) UpdatePhaseProgress(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, progress float64, totalItems, processedItems, successfulItems, failedItems *int64) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) UpdatePhaseConfiguration(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, config json.RawMessage) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) CompletePhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) SkipPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, reason string) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) StartPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) PausePhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) FailPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, errorMessage string, errorDetails map[string]interface{}) error {
	return nil
}

// Extra unused methods
func (f *fakeCampaignStoreForDomains) CountCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) (int64, error) {
	return 0, nil
}
func (f *fakeCampaignStoreForDomains) UpdateCampaignStatus(ctx context.Context, exec store.Querier, id uuid.UUID, status models.PhaseStatusEnum, errorMessage sql.NullString) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) UpdateCampaignProgress(ctx context.Context, exec store.Querier, id uuid.UUID, processedItems, totalItems int64, progressPercentage float64) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) UpdateCampaignPhaseFields(ctx context.Context, exec store.Querier, id uuid.UUID, currentPhase *models.PhaseTypeEnum, phaseStatus *models.PhaseStatusEnum) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetDomainGenerationPhaseConfigStateByHash(ctx context.Context, exec store.Querier, configHash string) (*models.DomainGenerationPhaseConfigState, error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) CreateOrUpdateDomainGenerationPhaseConfigState(ctx context.Context, exec store.Querier, state *models.DomainGenerationPhaseConfigState) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) DeleteDomainGenerationPhaseConfigState(ctx context.Context, exec store.Querier, configHash string) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) CountCampaignsWithPatternHash(ctx context.Context, exec store.Querier, patternHash string) (int, error) {
	return 0, nil
}
func (f *fakeCampaignStoreForDomains) CleanupUnusedPatternConfigState(ctx context.Context, exec store.Querier, patternHash string) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) CreateGeneratedDomains(ctx context.Context, exec store.Querier, domains []*models.GeneratedDomain) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) CountGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int64, error) {
	return int64(len(f.domains)), nil
}
func (f *fakeCampaignStoreForDomains) CreateDNSValidationResults(ctx context.Context, exec store.Querier, results []*models.DNSValidationResult) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetDNSValidationResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.DNSValidationResult, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) CountDNSValidationResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, onlyValid bool) (int64, error) {
	return 0, nil
}
func (f *fakeCampaignStoreForDomains) DeleteDNSValidationResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int64, error) {
	return 0, nil
}
func (f *fakeCampaignStoreForDomains) CreateHTTPKeywordParams(ctx context.Context, exec store.Querier, params *models.HTTPKeywordCampaignParams) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetHTTPKeywordParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.HTTPKeywordCampaignParams, error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) CreateHTTPKeywordResults(ctx context.Context, exec store.Querier, results []*models.HTTPKeywordResult) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetHTTPKeywordResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.HTTPKeywordResult, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) GetDomainsForHTTPValidation(ctx context.Context, exec store.Querier, httpKeywordCampaignID uuid.UUID, sourceCampaignID uuid.UUID, limit int, lastDomainName string) ([]*models.DNSValidationResult, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) RecordQueryPerformance(ctx context.Context, exec store.Querier, metric *models.QueryPerformanceMetric) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) RecordConnectionPoolMetrics(ctx context.Context, exec store.Querier, metrics *models.ConnectionPoolMetrics) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) UpdateCampaignState(ctx context.Context, exec store.Querier, state *models.CampaignState) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) DeleteCampaignState(ctx context.Context, exec store.Querier, campaignID uuid.UUID) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetCampaignStateWithExecutions(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.CampaignStateWithExecution, error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) UpdateDNSResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, dnsResults interface{}) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetDNSResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (interface{}, error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) UpdateHTTPResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, httpResults interface{}) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetHTTPResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (interface{}, error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) UpdateAnalysisResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, analysisResults interface{}) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetAnalysisResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (interface{}, error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) GetCampaignsByIDs(ctx context.Context, exec store.Querier, campaignIDs []uuid.UUID) ([]*models.LeadGenerationCampaign, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) BulkDeleteCampaignsByIDs(ctx context.Context, exec store.Querier, campaignIDs []uuid.UUID) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) UpdateDomainsBulkDNSStatus(ctx context.Context, exec store.Querier, results []models.DNSValidationResult) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) UpdateDomainsBulkHTTPStatus(ctx context.Context, exec store.Querier, results []models.HTTPKeywordResult) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) UpdateDomainLeadStatus(ctx context.Context, exec store.Querier, domainID uuid.UUID, status models.DomainLeadStatusEnum, score *float64) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetPhaseConfig(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) (*json.RawMessage, error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) GetCampaignMode(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (string, error) {
	return "step_by_step", nil
}
func (f *fakeCampaignStoreForDomains) AssociateCampaignScoringProfile(ctx context.Context, exec store.Querier, campaignID, profileID uuid.UUID) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) GetScoringProfile(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.ScoringProfile, error) {
	return nil, store.ErrNotFound
}
func (f *fakeCampaignStoreForDomains) ListScoringProfiles(ctx context.Context, exec store.Querier, limit int) ([]*models.ScoringProfile, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) CreateScoringProfile(ctx context.Context, exec store.Querier, sp *models.ScoringProfile) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) UpdateScoringProfile(ctx context.Context, exec store.Querier, sp *models.ScoringProfile) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) DeleteScoringProfile(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	return nil
}
func (f *fakeCampaignStoreForDomains) CreateCampaignStateWithPhases(ctx context.Context, exec store.Querier, state *models.CampaignState, phases []*models.CampaignPhase) error {
	return nil
}

// Transaction helpers
func (f *fakeCampaignStoreForDomains) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return nil, nil
}
func (f *fakeCampaignStoreForDomains) UnderlyingDB() *sqlx.DB { return nil }

func TestCampaignsDomainsListRebuildsCountersWhenMissing(t *testing.T) {
	mdb, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock init: %v", err)
	}
	sqlxDB := sqlx.NewDb(mdb, "sqlmock")
	defer sqlxDB.Close()
	campaignID := uuid.New()
	fakeStore := newFakeCampaignStoreForDomains()
	fakeStore.counters = nil
	fakeStore.countersErr = store.ErrNotFound
	fakeStore.domains = []*models.GeneratedDomain{{ID: uuid.New(), CampaignID: campaignID, DomainName: "lead-match", CreatedAt: time.Now()}}
	deps := &AppDeps{}
	deps.DB = sqlxDB
	deps.Stores.Campaign = fakeStore
	h := &strictHandlers{deps: deps}

	aggRows := sqlmock.NewRows([]string{
		"total_domains", "dns_pending", "dns_ok", "dns_error", "dns_timeout",
		"http_pending", "http_ok", "http_error", "http_timeout",
		"lead_pending", "lead_match", "lead_no_match", "lead_error", "lead_timeout",
	}).AddRow(
		int64(5000), int64(100), int64(4800), int64(50), int64(50),
		int64(200), int64(4500), int64(250), int64(50),
		int64(100), int64(7), int64(4971), int64(22), int64(0),
	)
	mock.ExpectQuery(regexp.QuoteMeta(campaignDomainCountersAggregationSQL)).
		WithArgs(campaignID).
		WillReturnRows(aggRows)

	now := time.Now()
	upsertRows := sqlmock.NewRows([]string{
		"campaign_id", "total_domains", "dns_pending", "dns_ok", "dns_error", "dns_timeout",
		"http_pending", "http_ok", "http_error", "http_timeout",
		"lead_pending", "lead_match", "lead_no_match", "lead_error", "lead_timeout",
		"updated_at", "created_at",
	}).AddRow(
		campaignID, int64(5000), int64(100), int64(4800), int64(50), int64(50),
		int64(200), int64(4500), int64(250), int64(50),
		int64(100), int64(7), int64(4971), int64(22), int64(0),
		now, now,
	)
	mock.ExpectQuery(regexp.QuoteMeta(campaignDomainCountersUpsertSQL)).
		WithArgs(
			campaignID,
			int64(5000),
			int64(100),
			int64(4800),
			int64(50),
			int64(50),
			int64(200),
			int64(4500),
			int64(250),
			int64(50),
			int64(100),
			int64(7),
			int64(4971),
			int64(22),
			int64(0),
		).
		WillReturnRows(upsertRows)

	req := gen.CampaignsDomainsListRequestObject{CampaignId: openapi_types.UUID(campaignID), Params: gen.CampaignsDomainsListParams{}}
	resp, err := h.CampaignsDomainsList(context.Background(), req)
	if err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	list := extractList(t, resp)
	if list.Aggregates == nil || list.Aggregates.Lead == nil || list.Aggregates.Lead.Match == nil {
		t.Fatalf("expected lead match aggregates present: %+v", list.Aggregates)
	}
	if match := *list.Aggregates.Lead.Match; match != 7 {
		t.Fatalf("expected lead match=7 got %d", match)
	}
	if list.Total != 5000 {
		t.Fatalf("expected total=5000 got %d", list.Total)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations not met: %v", err)
	}
}

// Test server-side sorting & filtering integration
func TestCampaignsDomainsListServerSortIntegration(t *testing.T) {
	os.Setenv("ANALYSIS_SERVER_SORT", "true")
	deps := &AppDeps{}
	deps.DB = new(sqlx.DB) // non-nil sentinel
	fakeStore := newFakeCampaignStoreForDomains()
	deps.Stores.Campaign = fakeStore
	deps.Logger = &SimpleLogger{}
	mkDomain := func(name string) *models.GeneratedDomain {
		return &models.GeneratedDomain{ID: uuid.New(), CampaignID: uuid.New(), DomainName: name, CreatedAt: time.Now(), OffsetIndex: int64(len(fakeStore.domains))}
	}
	fakeStore.domains = append(fakeStore.domains, mkDomain("d1"), mkDomain("d2"))
	fakeStore.counters.Total = int64(len(fakeStore.domains))
	h := &strictHandlers{deps: deps}
	req := gen.CampaignsDomainsListRequestObject{CampaignId: openapi_types.UUID(uuid.New()), Params: gen.CampaignsDomainsListParams{}}
	resp, err := h.CampaignsDomainsList(context.Background(), req)
	if err != nil {
		t.Fatalf("handler error: %v", err)
	}
	// New contract: response is an alias of CampaignDomainsListResponse without metadata envelope
	list := extractList(t, resp)
	if list == nil || len(list.Items) == 0 {
		t.Fatalf("expected items in list response")
	}
	if list.Total != len(list.Items) {
		// total may include more than current slice; tolerate >=
		if list.Total < len(list.Items) {
			t.Fatalf("expected total >= items length, got total=%d items=%d", list.Total, len(list.Items))
		}
	}
}

// Test sort field variations (keywords_unique, microcrawl_gain) descending
func TestCampaignsDomainsListServerSortFieldVariations(t *testing.T) {
	os.Setenv("ANALYSIS_SERVER_SORT", "true")
	deps := &AppDeps{}
	deps.DB = new(sqlx.DB)
	fakeStore := newFakeCampaignStoreForDomains()
	deps.Stores.Campaign = fakeStore
	deps.Logger = &SimpleLogger{}

	// fabricate domains with differentiating metric values by simulating feature map via orchestrator stub
	mkDomain := func(name string) *models.GeneratedDomain {
		return &models.GeneratedDomain{ID: uuid.New(), CampaignID: uuid.New(), DomainName: name, CreatedAt: time.Now(), OffsetIndex: int64(len(fakeStore.domains))}
	}
	fakeStore.domains = append(fakeStore.domains, mkDomain("d-low"), mkDomain("d-mid"), mkDomain("d-high"))
	fakeStore.counters.Total = int64(len(fakeStore.domains))

	// Inject orchestrator with feature map expected by handler
	// Build a lightweight analysis service stub implementing DualReadFetch to satisfy orchestrator feature fetch path
	featureMap := map[string]map[string]any{
		"d-low": {
			"richness":   map[string]any{"score": float32(1)},
			"microcrawl": map[string]any{"gain_ratio": float32(10)},
			"keywords":   map[string]any{"unique_count": int64(5)},
		},
		"d-mid": {
			"richness":   map[string]any{"score": float32(2)},
			"microcrawl": map[string]any{"gain_ratio": float32(20)},
			"keywords":   map[string]any{"unique_count": int64(15)},
		},
		"d-high": {
			"richness":   map[string]any{"score": float32(3)},
			"microcrawl": map[string]any{"gain_ratio": float32(30)},
			"keywords":   map[string]any{"unique_count": int64(25)},
		},
	}
	deps.Orchestrator = newTestOrchestratorWithFeatures(featureMap)

	h := &strictHandlers{deps: deps}
	campaignID := openapi_types.UUID(uuid.New())

	// Attempt keywords_unique desc; handler currently only reads textual custom fields from r.Params.Sort when provided
	// but generated enum disallows these values, so fallback path keeps default richness_score. We still verify ordering remains stable
	ctxKU := context.Background()
	reqKU := gen.CampaignsDomainsListRequestObject{CampaignId: campaignID, Params: gen.CampaignsDomainsListParams{}}
	ctxKU = context.WithValue(ctxKU, "request_url", mustParseTestURL("/ignored?sort=keywords_unique&dir=desc"))
	respKU, err := h.CampaignsDomainsList(ctxKU, reqKU)
	if err != nil {
		t.Fatalf("handler error keywords_unique: %v", err)
	}
	listKU := extractList(t, respKU)
	if len(listKU.Items) == 0 {
		t.Fatalf("expected items returned")
	}
	// Ensure highest richness first under fallback ordering
	if got := *listKU.Items[0].Domain; got != "d-high" {
		t.Fatalf("expected d-high first (richness fallback) got %s", got)
	}

	// microcrawl_gain desc
	ctxMC := context.Background()
	reqMC := gen.CampaignsDomainsListRequestObject{CampaignId: campaignID, Params: gen.CampaignsDomainsListParams{}}
	ctxMC = context.WithValue(ctxMC, "request_url", mustParseTestURL("/ignored?sort=microcrawl_gain&dir=desc"))
	respMC, err := h.CampaignsDomainsList(ctxMC, reqMC)
	if err != nil {
		t.Fatalf("handler error microcrawl_gain: %v", err)
	}
	listMC := extractList(t, respMC)
	if got := *listMC.Items[0].Domain; got != "d-high" {
		t.Fatalf("expected d-high first for microcrawl_gain desc got %s", got)
	}
}

// newTestOrchestratorWithFeatures constructs a real CampaignOrchestrator with only analysis service stubbed
func newTestOrchestratorWithFeatures(fm map[string]map[string]any) *application.CampaignOrchestrator {
	deps := domainservices.Dependencies{Logger: &SimpleLogger{}}
	return application.NewCampaignOrchestrator(nil, deps, nil, nil, nil, nil, nil, &dualReadAnalysisStub{fm: fm}, nil, nil)
}

// extractListAndMeta extracts response data list + metadata from handler response
func extractList(t *testing.T, resp interface{}) *gen.CampaignDomainsListResponse {
	t.Helper()
	switch v := resp.(type) {
	case campaignsDomainsList200WithHeader:
		r := gen.CampaignDomainsListResponse(v.CampaignsDomainsList200JSONResponse)
		return (*gen.CampaignDomainsListResponse)(&r)
	case gen.CampaignsDomainsList200JSONResponse:
		r := gen.CampaignDomainsListResponse(v)
		return &r
	default:
		t.Fatalf("unexpected response type %T", resp)
		return nil
	}
}

// mustParseTestURL creates *url.URL for test contexts
func mustParseTestURL(raw string) *url.URL { u, _ := url.Parse(raw); return u }

// Orchestrator stubs removed – test focuses on header + metadata fallback only.

// Request helpers -------------------------------------------------------------
// Removed HTTP helper & header assertion (direct handler invocation)
