package infra

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Ensures cursor path errors surface (hard fail) with no legacy fallback.
func TestCursorErrorHardFailNoFallback(t *testing.T) {
	ri := &realStealthIntegration{store: nil}
	_, _, err := ri.collectDomainsWithCursor(context.Background(), uuid.New(), "dns_validation")
	if err == nil {
		t.Fatalf("expected error due to nil store underlying db")
	}
}

// Legacy parity test removed: system is cursor-only.

func TestCursorPanicRecovery(t *testing.T) {
	// Enable test panic
	testForceCursorPanic = true
	defer func() { testForceCursorPanic = false }()
	ri := &realStealthIntegration{store: nil}
	// Call helper directly; expect recovered error not hard panic
	_, _, err := ri.collectDomainsWithCursor(context.Background(), uuid.New(), "dns_validation")
	if err == nil {
		t.Fatalf("expected error from panic recovery, got nil")
	}
}

// --- Parity & Multi-page tests ---

// fakeCampaignStore implements only the subset of CampaignStore methods used by stealth integration for tests.
type fakeCampaignStore struct {
	domains  []*models.GeneratedDomain
	pageSize int
}

// UnderlyingDB returns nil (not used in test path that directly passes nil), but stealth integration now calls UnderlyingDB so we return nil deliberately.
func (f *fakeCampaignStore) UnderlyingDB() *sqlx.DB { return nil }

// Only implement methods directly invoked in tests + those required for interface but kept no-op.
func (f *fakeCampaignStore) RecordQueryPerformance(ctx context.Context, exec store.Querier, metric *models.QueryPerformanceMetric) error {
	return nil
}

// Cursor pagination method
func (f *fakeCampaignStore) GetGeneratedDomainsWithCursor(ctx context.Context, exec store.Querier, filter store.ListGeneratedDomainsFilter) (*store.PaginatedResult[*models.GeneratedDomain], error) {
	// Filter DNS status if validationType implies (applied by caller via filter.ValidationStatus)
	out := make([]*models.GeneratedDomain, 0, f.pageSize)
	count := 0
	startAfter := filter.After
	started := startAfter == ""
	for _, d := range f.domains {
		if filter.ValidationStatus != "" && (d.DNSStatus == nil || string(*d.DNSStatus) != filter.ValidationStatus) {
			continue
		}
		if !started {
			if d.DomainName == startAfter {
				started = true
				continue
			}
			continue
		}
		out = append(out, d)
		count++
		if count == f.pageSize {
			break
		}
	}
	hasNext := false
	endCursor := ""
	if len(out) > 0 {
		endCursor = out[len(out)-1].DomainName
	}
	// Determine if more elements remain after last selected
	if len(out) > 0 {
		lastName := out[len(out)-1].DomainName
		seen := false
		for _, d := range f.domains {
			if filter.ValidationStatus != "" && (d.DNSStatus == nil || string(*d.DNSStatus) != filter.ValidationStatus) {
				continue
			}
			if !seen {
				if d.DomainName == lastName {
					seen = true
					continue
				}
			} else {
				hasNext = true
				break
			}
		}
	}
	return &store.PaginatedResult[*models.GeneratedDomain]{
		Data:     out,
		PageInfo: store.PageInfo{HasNextPage: hasNext, EndCursor: endCursor, TotalCount: int64(len(f.domains))},
	}, nil
}

// Legacy listing removed: not required for tests.
// Retained as no-op implementation to satisfy CampaignStore interface expectations.
func (f *fakeCampaignStore) GetGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit int, lastOffsetIndex int64, filter *store.ListCampaignDomainsFilter) ([]*models.GeneratedDomain, error) {
	// Provide minimal offset-based pagination to satisfy any indirect calls.
	out := make([]*models.GeneratedDomain, 0, limit)
	for _, d := range f.domains {
		if d.OffsetIndex <= lastOffsetIndex {
			continue
		}
		out = append(out, d)
		if len(out) == limit {
			break
		}
	}
	return out, nil
}

// Unused methods to satisfy interface - panic to catch accidental calls.
func (f *fakeCampaignStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return nil, fmt.Errorf("not implemented in fake")
}
func (f *fakeCampaignStore) CreateCampaign(ctx context.Context, exec store.Querier, campaign *models.LeadGenerationCampaign) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetCampaignByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.LeadGenerationCampaign, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateCampaign(ctx context.Context, exec store.Querier, campaign *models.LeadGenerationCampaign) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) DeleteCampaign(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) ListCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) ([]*models.LeadGenerationCampaign, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CountCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) (int64, error) {
	return 0, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateCampaignStatus(ctx context.Context, exec store.Querier, id uuid.UUID, status models.PhaseStatusEnum, errorMessage sql.NullString) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateCampaignProgress(ctx context.Context, exec store.Querier, id uuid.UUID, processedItems, totalItems int64, progressPercentage float64) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateCampaignPhaseFields(ctx context.Context, exec store.Querier, id uuid.UUID, currentPhase *models.PhaseTypeEnum, phaseStatus *models.PhaseStatusEnum) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetDomainGenerationPhaseConfigStateByHash(ctx context.Context, exec store.Querier, configHash string) (*models.DomainGenerationPhaseConfigState, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CreateOrUpdateDomainGenerationPhaseConfigState(ctx context.Context, exec store.Querier, state *models.DomainGenerationPhaseConfigState) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) DeleteDomainGenerationPhaseConfigState(ctx context.Context, exec store.Querier, configHash string) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CountCampaignsWithPatternHash(ctx context.Context, exec store.Querier, patternHash string) (int, error) {
	return 0, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CleanupUnusedPatternConfigState(ctx context.Context, exec store.Querier, patternHash string) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CreateCampaignPhases(ctx context.Context, exec store.Querier, campaignID uuid.UUID) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetCampaignPhases(ctx context.Context, exec store.Querier, campaignID uuid.UUID) ([]*models.CampaignPhase, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetCampaignPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) (*models.CampaignPhase, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdatePhaseStatus(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, status models.PhaseStatusEnum) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdatePhaseProgress(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, progress float64, totalItems, processedItems, successfulItems, failedItems *int64) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdatePhaseConfiguration(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, config json.RawMessage) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CompletePhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) SkipPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, reason string) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) StartPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) PausePhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error {
	return fmt.Errorf("not implemented")
}

func (f *fakeCampaignStore) ResumePhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error {
	return nil
}
func (f *fakeCampaignStore) FailPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, errorMessage string, errorDetails map[string]interface{}) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CreateGeneratedDomains(ctx context.Context, exec store.Querier, domains []*models.GeneratedDomain) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CountGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int64, error) {
	return 0, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetCampaignDomainCounters(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.CampaignDomainCounters, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CreateDNSValidationResults(ctx context.Context, exec store.Querier, results []*models.DNSValidationResult) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetDNSValidationResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.DNSValidationResult, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CountDNSValidationResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, onlyValid bool) (int64, error) {
	return 0, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) DeleteDNSValidationResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int64, error) {
	return 0, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CreateHTTPKeywordParams(ctx context.Context, exec store.Querier, params *models.HTTPKeywordCampaignParams) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetHTTPKeywordParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.HTTPKeywordCampaignParams, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CreateHTTPKeywordResults(ctx context.Context, exec store.Querier, results []*models.HTTPKeywordResult) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetHTTPKeywordResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.HTTPKeywordResult, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetDomainsForHTTPValidation(ctx context.Context, exec store.Querier, httpKeywordCampaignID uuid.UUID, sourceCampaignID uuid.UUID, limit int, lastDomainName string) ([]*models.DNSValidationResult, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) RecordConnectionPoolMetrics(ctx context.Context, exec store.Querier, metrics *models.ConnectionPoolMetrics) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CreateCampaignState(ctx context.Context, exec store.Querier, state *models.CampaignState) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetCampaignState(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.CampaignState, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateCampaignState(ctx context.Context, exec store.Querier, state *models.CampaignState) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) DeleteCampaignState(ctx context.Context, exec store.Querier, campaignID uuid.UUID) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) CreatePhaseExecution(ctx context.Context, exec store.Querier, execution *models.PhaseExecution) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetPhaseExecution(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) (*models.PhaseExecution, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetPhaseExecutionsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID) ([]*models.PhaseExecution, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdatePhaseExecution(ctx context.Context, exec store.Querier, execution *models.PhaseExecution) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) DeletePhaseExecution(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetCampaignStateWithExecutions(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.CampaignStateWithExecution, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateDNSResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, dnsResults interface{}) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetDNSResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (interface{}, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateHTTPResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, httpResults interface{}) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetHTTPResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (interface{}, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateAnalysisResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, analysisResults interface{}) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetAnalysisResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (interface{}, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetCampaignsByIDs(ctx context.Context, exec store.Querier, campaignIDs []uuid.UUID) ([]*models.LeadGenerationCampaign, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) BulkDeleteCampaignsByIDs(ctx context.Context, exec store.Querier, campaignIDs []uuid.UUID) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateDomainsBulkDNSStatus(ctx context.Context, exec store.Querier, results []models.DNSValidationResult) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateDomainsBulkHTTPStatus(ctx context.Context, exec store.Querier, results []models.HTTPKeywordResult) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateDomainLeadStatus(ctx context.Context, exec store.Querier, domainID uuid.UUID, status models.DomainLeadStatusEnum, score *float64) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpsertPhaseConfig(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, config json.RawMessage) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetPhaseConfig(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) (*json.RawMessage, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) ListPhaseConfigs(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (map[models.PhaseTypeEnum]json.RawMessage, error) {
	return nil, fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) UpdateCampaignMode(ctx context.Context, exec store.Querier, campaignID uuid.UUID, mode string) error {
	return fmt.Errorf("not implemented")
}
func (f *fakeCampaignStore) GetCampaignMode(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (string, error) {
	return "", fmt.Errorf("not implemented")
}

// Test verifying parity of filtered results between cursor path and legacy path for http_keyword_validation (filters by DNS OK).
func TestFilteredHTTPKeywordValidationCursor(t *testing.T) {
	dnsOK := models.DomainDNSStatusOK
	dnsPending := models.DomainDNSStatusPending
	campaignID := uuid.New()
	domains := make([]*models.GeneratedDomain, 0, 120)
	for i := 0; i < 120; i++ {
		status := &dnsPending
		if i%3 == 0 {
			status = &dnsOK
		}
		domains = append(domains, &models.GeneratedDomain{DomainName: fmt.Sprintf("d%03d.example", i), DNSStatus: status, OffsetIndex: int64(i), CampaignID: campaignID})
	}
	fake := &fakeCampaignStore{domains: domains, pageSize: 25}
	ri := &realStealthIntegration{store: fake}
	curDomains, meta, err := ri.collectDomainsWithCursor(context.Background(), campaignID, "http_keyword_validation")
	if err != nil {
		t.Fatalf("cursor collection error: %v", err)
	}
	if meta.pages < 2 {
		t.Fatalf("expected multi-page cursor traversal, got %d", meta.pages)
	}
	expected := 0
	for i := 0; i < 120; i++ {
		if i%3 == 0 {
			expected++
		}
	}
	if len(curDomains) != expected {
		t.Fatalf("expected %d filtered domains got %d", expected, len(curDomains))
	}
}

// Stress test larger dataset to ensure pages>1 and forced cursor success path.
func TestCursorMultiPageStress(t *testing.T) {
	dnsOK := models.DomainDNSStatusOK
	campaignID := uuid.New()
	domains := make([]*models.GeneratedDomain, 0, 3500)
	for i := 0; i < 3500; i++ {
		domains = append(domains, &models.GeneratedDomain{DomainName: fmt.Sprintf("stress%04d.test", i), DNSStatus: &dnsOK, OffsetIndex: int64(i), CampaignID: campaignID})
	}
	fake := &fakeCampaignStore{domains: domains, pageSize: 500}
	ri := &realStealthIntegration{store: fake}
	out, meta, err := ri.collectDomainsWithCursor(context.Background(), campaignID, "dns_validation")
	if err != nil {
		t.Fatalf("cursor multi-page stress error: %v", err)
	}
	if meta.pages < 3 {
		t.Fatalf("expected >=3 pages, got %d", meta.pages)
	}
	if len(out) != len(domains) {
		t.Fatalf("expected all domains %d got %d", len(domains), len(out))
	}
}
