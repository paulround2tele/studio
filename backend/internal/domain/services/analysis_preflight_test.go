package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"regexp"
	"sync"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// minimalLogger satisfies Logger without noise
type minimalLogger struct{}

func (l *minimalLogger) Debug(ctx context.Context, msg string, f map[string]interface{})            {}
func (l *minimalLogger) Info(ctx context.Context, msg string, f map[string]interface{})             {}
func (l *minimalLogger) Warn(ctx context.Context, msg string, f map[string]interface{})             {}
func (l *minimalLogger) Error(ctx context.Context, msg string, err error, f map[string]interface{}) {}

// stubCampaignStore implements only methods touched by analysis preflight + config retrieval + status updates.
type stubCampaignStore struct {
	phase           *models.CampaignPhase
	mu              sync.Mutex
	failed          bool
	completed       bool
	progressUpdates int
}

func (s *stubCampaignStore) UnderlyingDB() *sqlx.DB { return nil }
func (s *stubCampaignStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return nil, nil
}

// Unused large interface methods: provide no-op / minimal implementations
func (s *stubCampaignStore) CreateCampaign(ctx context.Context, exec store.Querier, c *models.LeadGenerationCampaign) error {
	return nil
}
func (s *stubCampaignStore) GetCampaignByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.LeadGenerationCampaign, error) {
	return nil, nil
}
func (s *stubCampaignStore) UpdateCampaign(ctx context.Context, exec store.Querier, c *models.LeadGenerationCampaign) error {
	return nil
}
func (s *stubCampaignStore) DeleteCampaign(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	return nil
}
func (s *stubCampaignStore) ListCampaigns(ctx context.Context, exec store.Querier, f store.ListCampaignsFilter) ([]*models.LeadGenerationCampaign, error) {
	return nil, nil
}
func (s *stubCampaignStore) CountCampaigns(ctx context.Context, exec store.Querier, f store.ListCampaignsFilter) (int64, error) {
	return 0, nil
}
func (s *stubCampaignStore) UpdateCampaignStatus(ctx context.Context, exec store.Querier, id uuid.UUID, st models.PhaseStatusEnum, em sql.NullString) error {
	return nil
}
func (s *stubCampaignStore) UpdateCampaignProgress(ctx context.Context, exec store.Querier, id uuid.UUID, p, t int64, pct float64) error {
	return nil
}
func (s *stubCampaignStore) UpdateCampaignPhaseFields(ctx context.Context, exec store.Querier, id uuid.UUID, cp *models.PhaseTypeEnum, ps *models.PhaseStatusEnum) error {
	return nil
}
func (s *stubCampaignStore) GetDomainGenerationPhaseConfigStateByHash(ctx context.Context, exec store.Querier, h string) (*models.DomainGenerationPhaseConfigState, error) {
	return nil, nil
}
func (s *stubCampaignStore) CreateOrUpdateDomainGenerationPhaseConfigState(ctx context.Context, exec store.Querier, st *models.DomainGenerationPhaseConfigState) error {
	return nil
}
func (s *stubCampaignStore) CountCampaignsWithPatternHash(ctx context.Context, exec store.Querier, h string) (int, error) {
	return 0, nil
}
func (s *stubCampaignStore) CleanupUnusedPatternConfigState(ctx context.Context, exec store.Querier, h string) error {
	return nil
}
func (s *stubCampaignStore) CreateCampaignPhases(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	return nil
}
func (s *stubCampaignStore) GetCampaignPhases(ctx context.Context, exec store.Querier, id uuid.UUID) ([]*models.CampaignPhase, error) {
	return nil, nil
}
func (s *stubCampaignStore) GetCampaignPhase(ctx context.Context, exec store.Querier, id uuid.UUID, pt models.PhaseTypeEnum) (*models.CampaignPhase, error) {
	return s.phase, nil
}
func (s *stubCampaignStore) UpdatePhaseStatus(ctx context.Context, exec store.Querier, id uuid.UUID, pt models.PhaseTypeEnum, st models.PhaseStatusEnum) error {
	return nil
}
func (s *stubCampaignStore) UpdatePhaseProgress(ctx context.Context, exec store.Querier, id uuid.UUID, pt models.PhaseTypeEnum, prog float64, total, processed, succ, fail *int64) error {
	s.mu.Lock()
	s.progressUpdates++
	s.mu.Unlock()
	return nil
}
func (s *stubCampaignStore) UpdatePhaseConfiguration(ctx context.Context, exec store.Querier, id uuid.UUID, pt models.PhaseTypeEnum, cfg json.RawMessage) error {
	return nil
}
func (s *stubCampaignStore) CompletePhase(ctx context.Context, exec store.Querier, id uuid.UUID, pt models.PhaseTypeEnum) error {
	s.mu.Lock()
	s.completed = true
	s.mu.Unlock()
	return nil
}
func (s *stubCampaignStore) StartPhase(ctx context.Context, exec store.Querier, id uuid.UUID, pt models.PhaseTypeEnum) error {
	return nil
}
func (s *stubCampaignStore) PausePhase(ctx context.Context, exec store.Querier, id uuid.UUID, pt models.PhaseTypeEnum) error {
	return nil
}
func (s *stubCampaignStore) FailPhase(ctx context.Context, exec store.Querier, id uuid.UUID, pt models.PhaseTypeEnum, em string) error {
	s.mu.Lock()
	s.failed = true
	s.mu.Unlock()
	return nil
}
func (s *stubCampaignStore) CreateGeneratedDomains(ctx context.Context, exec store.Querier, d []*models.GeneratedDomain) error {
	return nil
}
func (s *stubCampaignStore) GetGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, id uuid.UUID, limit int, lastOffsetIndex int64, f *store.ListCampaignDomainsFilter) ([]*models.GeneratedDomain, error) {
	return nil, nil
}
func (s *stubCampaignStore) CountGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, id uuid.UUID) (int64, error) {
	return 0, nil
}
func (s *stubCampaignStore) GetCampaignDomainCounters(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.CampaignDomainCounters, error) {
	return nil, nil
}
func (s *stubCampaignStore) CreateDNSValidationResults(ctx context.Context, exec store.Querier, r []*models.DNSValidationResult) error {
	return nil
}
func (s *stubCampaignStore) GetDNSValidationResultsByCampaign(ctx context.Context, exec store.Querier, id uuid.UUID, f store.ListValidationResultsFilter) ([]*models.DNSValidationResult, error) {
	return nil, nil
}
func (s *stubCampaignStore) CountDNSValidationResults(ctx context.Context, exec store.Querier, id uuid.UUID, onlyValid bool) (int64, error) {
	return 0, nil
}
func (s *stubCampaignStore) DeleteDNSValidationResults(ctx context.Context, exec store.Querier, id uuid.UUID) (int64, error) {
	return 0, nil
}
func (s *stubCampaignStore) CreateHTTPKeywordParams(ctx context.Context, exec store.Querier, p *models.HTTPKeywordCampaignParams) error {
	return nil
}
func (s *stubCampaignStore) GetHTTPKeywordParams(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.HTTPKeywordCampaignParams, error) {
	return nil, nil
}
func (s *stubCampaignStore) CreateHTTPKeywordResults(ctx context.Context, exec store.Querier, r []*models.HTTPKeywordResult) error {
	return nil
}
func (s *stubCampaignStore) GetHTTPKeywordResultsByCampaign(ctx context.Context, exec store.Querier, id uuid.UUID, f store.ListValidationResultsFilter) ([]*models.HTTPKeywordResult, error) {
	return nil, nil
}
func (s *stubCampaignStore) GetDomainsForHTTPValidation(ctx context.Context, exec store.Querier, httpID uuid.UUID, srcID uuid.UUID, limit int, last string) ([]*models.DNSValidationResult, error) {
	return nil, nil
}
func (s *stubCampaignStore) GetGeneratedDomainsWithCursor(ctx context.Context, exec store.Querier, f store.ListGeneratedDomainsFilter) (*store.PaginatedResult[*models.GeneratedDomain], error) {
	return nil, nil
}
func (s *stubCampaignStore) RecordQueryPerformance(ctx context.Context, exec store.Querier, m *models.QueryPerformanceMetric) error {
	return nil
}
func (s *stubCampaignStore) RecordConnectionPoolMetrics(ctx context.Context, exec store.Querier, m *models.ConnectionPoolMetrics) error {
	return nil
}
func (s *stubCampaignStore) CreateCampaignState(ctx context.Context, exec store.Querier, st *models.CampaignState) error {
	return nil
}
func (s *stubCampaignStore) GetCampaignState(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.CampaignState, error) {
	return nil, nil
}
func (s *stubCampaignStore) UpdateCampaignState(ctx context.Context, exec store.Querier, st *models.CampaignState) error {
	return nil
}
func (s *stubCampaignStore) DeleteCampaignState(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	return nil
}
func (s *stubCampaignStore) CreatePhaseExecution(ctx context.Context, exec store.Querier, e *models.PhaseExecution) error {
	return nil
}
func (s *stubCampaignStore) GetPhaseExecution(ctx context.Context, exec store.Querier, id uuid.UUID, pt models.PhaseTypeEnum) (*models.PhaseExecution, error) {
	return nil, nil
}
func (s *stubCampaignStore) GetPhaseExecutionsByCampaign(ctx context.Context, exec store.Querier, id uuid.UUID) ([]*models.PhaseExecution, error) {
	return nil, nil
}
func (s *stubCampaignStore) UpdatePhaseExecution(ctx context.Context, exec store.Querier, e *models.PhaseExecution) error {
	return nil
}
func (s *stubCampaignStore) DeletePhaseExecution(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	return nil
}
func (s *stubCampaignStore) GetCampaignStateWithExecutions(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.CampaignStateWithExecution, error) {
	return nil, nil
}
func (s *stubCampaignStore) UpdateDNSResults(ctx context.Context, exec store.Querier, id uuid.UUID, dns interface{}) error {
	return nil
}
func (s *stubCampaignStore) GetDNSResults(ctx context.Context, exec store.Querier, id uuid.UUID) (interface{}, error) {
	return nil, nil
}
func (s *stubCampaignStore) UpdateHTTPResults(ctx context.Context, exec store.Querier, id uuid.UUID, http interface{}) error {
	return nil
}
func (s *stubCampaignStore) GetHTTPResults(ctx context.Context, exec store.Querier, id uuid.UUID) (interface{}, error) {
	return nil, nil
}
func (s *stubCampaignStore) UpdateAnalysisResults(ctx context.Context, exec store.Querier, id uuid.UUID, a interface{}) error {
	return nil
}
func (s *stubCampaignStore) GetAnalysisResults(ctx context.Context, exec store.Querier, id uuid.UUID) (interface{}, error) {
	return nil, nil
}
func (s *stubCampaignStore) GetCampaignsByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.LeadGenerationCampaign, error) {
	return nil, nil
}
func (s *stubCampaignStore) BulkDeleteCampaignsByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) error {
	return nil
}
func (s *stubCampaignStore) UpdateDomainsBulkDNSStatus(ctx context.Context, exec store.Querier, r []models.DNSValidationResult) error {
	return nil
}
func (s *stubCampaignStore) UpdateDomainsBulkHTTPStatus(ctx context.Context, exec store.Querier, r []models.HTTPKeywordResult) error {
	return nil
}
func (s *stubCampaignStore) UpsertPhaseConfig(ctx context.Context, exec store.Querier, id uuid.UUID, pt models.PhaseTypeEnum, cfg json.RawMessage) error {
	return nil
}
func (s *stubCampaignStore) GetPhaseConfig(ctx context.Context, exec store.Querier, id uuid.UUID, pt models.PhaseTypeEnum) (*json.RawMessage, error) {
	return nil, nil
}
func (s *stubCampaignStore) ListPhaseConfigs(ctx context.Context, exec store.Querier, id uuid.UUID) (map[models.PhaseTypeEnum]json.RawMessage, error) {
	return nil, nil
}
func (s *stubCampaignStore) UpdateCampaignMode(ctx context.Context, exec store.Querier, id uuid.UUID, mode string) error {
	return nil
}
func (s *stubCampaignStore) GetCampaignMode(ctx context.Context, exec store.Querier, id uuid.UUID) (string, error) {
	return "", nil
}

// mockSSEPreflight for capturing events
type mockSSEPreflight struct {
	mu       sync.Mutex
	messages []string
}

func (m *mockSSEPreflight) HandleSSE(w http.ResponseWriter, r *http.Request) {}
func (m *mockSSEPreflight) Send(event string) {
	m.mu.Lock()
	m.messages = append(m.messages, event)
	m.mu.Unlock()
}

// helper to find event by name
func findEvent(msgs []string, name string) bool {
	for _, m := range msgs {
		if regexp.MustCompile(`"event"\s*:\s*"`+name+`"`).FindStringIndex(m) != nil {
			return true
		}
	}
	return false
}

// TestAnalysisPreflightFailure ensures analysis fails fast with structured error when no feature vectors.
func TestAnalysisPreflightFailure(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()
	campaignID := uuid.New()
	// Preflight count returns 0
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COUNT(*) FROM generated_domains WHERE campaign_id=$1 AND feature_vector IS NOT NULL`)).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))
	// Configure stub store returning empty analysis phase
	phase := &models.CampaignPhase{PhaseType: models.PhaseTypeAnalysis, Status: models.PhaseStatusConfigured}
	st := &stubCampaignStore{phase: phase}
	mSSE := &mockSSEPreflight{}
	svc := &analysisService{store: st, deps: Dependencies{DB: db, SSE: mSSE, Logger: &minimalLogger{}}, executions: map[uuid.UUID]*analysisExecution{}}
	// Seed execution state as orchestrator would
	svc.executions[campaignID] = &analysisExecution{CampaignID: campaignID, Status: models.PhaseStatusInProgress, StartedAt: time.Now(), ProgressChan: make(chan PhaseProgress, 8), CancelChan: make(chan struct{})}
	svc.executeAnalysis(context.Background(), campaignID, []string{"example.com"})
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
	// Assert failure flagged
	st.mu.Lock()
	failed := st.failed
	st.mu.Unlock()
	if !failed {
		t.Fatalf("expected store FailPhase invocation")
	}
	mSSE.mu.Lock()
	msgs := append([]string{}, mSSE.messages...)
	mSSE.mu.Unlock()
	if !findEvent(msgs, "analysis_failed") {
		t.Fatalf("expected analysis_failed event: %v", msgs)
	}
	// Ensure error code present
	foundCode := false
	for _, m := range msgs {
		if regexp.MustCompile(ErrCodeAnalysisMissingFeatures).FindStringIndex(m) != nil {
			foundCode = true
			break
		}
	}
	if !foundCode {
		t.Fatalf("missing error code %s in SSE payloads", ErrCodeAnalysisMissingFeatures)
	}
}

// TestAnalysisPreflightSuccess ensures reuse event then scoring occurs when feature vectors present.
func TestAnalysisPreflightSuccess(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()
	campaignID := uuid.New()
	// Preflight count >0
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COUNT(*) FROM generated_domains WHERE campaign_id=$1 AND feature_vector IS NOT NULL`)).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))
	// Scoring weight lookup (no profile -> no rows -> defaults). Load function queries campaign_scoring_profile join; return no rows.
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT sp.weights, sp.parked_penalty_factor FROM campaign_scoring_profile csp JOIN scoring_profiles sp ON sp.id = csp.scoring_profile_id WHERE csp.campaign_id = $1`)).
		WithArgs(campaignID).WillReturnError(sql.ErrNoRows)
	// Count inside scoring (again)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COUNT(*) FROM generated_domains WHERE campaign_id = $1 AND feature_vector IS NOT NULL`)).
		WithArgs(campaignID).WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))
	// Feature vectors query
	fv1, _ := json.Marshal(map[string]any{"kw_unique": 2.0, "kw_hits_total": 4.0, "content_bytes": 2048.0, "title_has_keyword": true})
	fv2, _ := json.Marshal(map[string]any{"kw_unique": 1.0, "kw_hits_total": 2.0, "content_bytes": 1024.0, "title_has_keyword": false})
	now := time.Now()
	rows := sqlmock.NewRows([]string{"domain_name", "feature_vector", "last_http_fetched_at", "is_parked", "parked_confidence"}).
		AddRow("a.test", fv1, now, false, nil).AddRow("b.test", fv2, now, false, nil)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT domain_name, feature_vector, last_http_fetched_at, is_parked, parked_confidence FROM generated_domains WHERE campaign_id = $1 AND feature_vector IS NOT NULL`)).
		WithArgs(campaignID).WillReturnRows(rows)
	// Bulk update
	mock.ExpectExec(regexp.QuoteMeta(`WITH incoming`)).WillReturnResult(sqlmock.NewResult(0, 2))
	phase := &models.CampaignPhase{PhaseType: models.PhaseTypeAnalysis, Status: models.PhaseStatusConfigured}
	st := &stubCampaignStore{phase: phase}
	mSSE := &mockSSEPreflight{}
	svc := &analysisService{store: st, deps: Dependencies{DB: db, SSE: mSSE, Logger: &minimalLogger{}}, executions: map[uuid.UUID]*analysisExecution{}}
	svc.executions[campaignID] = &analysisExecution{CampaignID: campaignID, Status: models.PhaseStatusInProgress, StartedAt: time.Now(), ProgressChan: make(chan PhaseProgress, 16), CancelChan: make(chan struct{})}
	svc.executeAnalysis(context.Background(), campaignID, []string{"a.test", "b.test"})
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
	// Assert completed
	st.mu.Lock()
	completed := st.completed
	failed := st.failed
	st.mu.Unlock()
	if !completed || failed {
		t.Fatalf("expected completed=true failed=false got completed=%v failed=%v", completed, failed)
	}
	mSSE.mu.Lock()
	msgs := append([]string{}, mSSE.messages...)
	mSSE.mu.Unlock()
	if !findEvent(msgs, "analysis_reuse_enrichment") {
		t.Fatalf("missing analysis_reuse_enrichment event: %v", msgs)
	}
	if !findEvent(msgs, "domain_scored") {
		t.Fatalf("missing domain_scored sample event")
	}
}
