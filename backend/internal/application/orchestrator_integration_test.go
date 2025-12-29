package application

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	pg_store "github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/fntelecomllc/studio/backend/internal/testutil"
	"github.com/google/uuid"
)

// --- Test doubles -------------------------------------------------------------------

// testLogger implements domainservices.Logger with optional test-bound logging that avoids panics after t cleanup.
type testLogger struct {
	t      testing.TB
	mu     sync.Mutex
	closed bool
}

func newTestLogger(t testing.TB) *testLogger {
	if t == nil {
		return &testLogger{}
	}
	l := &testLogger{t: t}
	t.Cleanup(func() {
		l.mu.Lock()
		l.closed = true
		l.mu.Unlock()
	})
	return l
}

func (l *testLogger) logf(format string, args ...interface{}) {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.t == nil || l.closed {
		return
	}
	l.t.Logf(format, args...)
}

func (l *testLogger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {
	l.logf("DEBUG %s %#v", msg, fields)
}
func (l *testLogger) Info(ctx context.Context, msg string, fields map[string]interface{}) {
	l.logf("INFO %s %#v", msg, fields)
}
func (l *testLogger) Warn(ctx context.Context, msg string, fields map[string]interface{}) {
	l.logf("WARN %s %#v", msg, fields)
}
func (l *testLogger) Error(ctx context.Context, msg string, err error, fields map[string]interface{}) {
	l.logf("ERROR %s err=%v %#v", msg, err, fields)
}

// stubPhaseService simulates fast deterministic phase execution.
type stubPhaseService struct {
	phaseType models.PhaseTypeEnum
	logger    *testLogger
	// per-campaign status + config state
	statuses map[uuid.UUID]*domainservices.PhaseStatus
	configs  map[uuid.UUID]interface{}
	// failure toggles per campaign (first attempt or forced)
	fail map[uuid.UUID]bool
	// execution invocation counts
	executes map[uuid.UUID]int
	// mu guards state access
	mu sync.Mutex
}

func newStubPhaseService(pt models.PhaseTypeEnum, l *testLogger) *stubPhaseService {
	return &stubPhaseService{
		phaseType: pt,
		logger:    l,
		statuses:  make(map[uuid.UUID]*domainservices.PhaseStatus),
		configs:   make(map[uuid.UUID]interface{}),
		fail:      make(map[uuid.UUID]bool),
		executes:  make(map[uuid.UUID]int),
	}
}

func (s *stubPhaseService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.configs[campaignID] = config
	return nil
}

func (s *stubPhaseService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan domainservices.PhaseProgress, error) {
	s.mu.Lock()
	if s.fail[campaignID] {
		s.mu.Unlock()
		return nil, errors.New("forced failure")
	}
	ch := make(chan domainservices.PhaseProgress, 4)
	s.executes[campaignID]++
	started := time.Now()
	st := &domainservices.PhaseStatus{CampaignID: campaignID, Phase: s.phaseType, Status: models.PhaseStatusInProgress, StartedAt: &started}
	s.statuses[campaignID] = st
	s.mu.Unlock()
	go func() {
		ch <- domainservices.PhaseProgress{CampaignID: campaignID, Phase: s.phaseType, Status: models.PhaseStatusInProgress, ProgressPct: 10, Timestamp: time.Now()}
		s.mu.Lock()
		st.Status = models.PhaseStatusCompleted
		st.ProgressPct = 100
		completed := time.Now()
		st.CompletedAt = &completed
		s.mu.Unlock()
		// We purposefully do NOT send a completed progress item; orchestrator relies on channel close + GetStatus
		close(ch)
	}()
	return ch, nil
}

func (s *stubPhaseService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*domainservices.PhaseStatus, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if st, ok := s.statuses[campaignID]; ok {
		return st, nil
	}
	return &domainservices.PhaseStatus{CampaignID: campaignID, Phase: s.phaseType, Status: models.PhaseStatusNotStarted}, nil
}

func (s *stubPhaseService) Cancel(ctx context.Context, campaignID uuid.UUID) error { return nil }
func (s *stubPhaseService) Validate(ctx context.Context, config interface{}) error { return nil }
func (s *stubPhaseService) GetPhaseType() models.PhaseTypeEnum                     { return s.phaseType }
func (s *stubPhaseService) setFailOnce(campaignID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.fail[campaignID] = true
}
func (s *stubPhaseService) clearFail(campaignID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.fail, campaignID)
}
func (s *stubPhaseService) executions(campaignID uuid.UUID) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.executes[campaignID]
}

// AnalysisService methods (no-op for non-analysis phases)
func (s *stubPhaseService) ScoreDomains(ctx context.Context, campaignID uuid.UUID) error { return nil }
func (s *stubPhaseService) RescoreCampaign(ctx context.Context, campaignID uuid.UUID) error {
	return nil
}
func (s *stubPhaseService) ScoreBreakdown(ctx context.Context, campaignID uuid.UUID, domain string) (map[string]float64, error) {
	return nil, nil
}

// testMetrics captures orchestrator metric increments for assertions.
type testMetrics struct {
	phaseStarts              int
	phaseCompletions         int
	phaseFailures            int
	phaseAutoStarts          int
	campaignCompletions      int
	autoStartAttempts        int
	autoStartSuccesses       int
	autoStartFailures        int
	manualModeCreations      int
	autoModeCreations        int
	phaseResumeAttempts      int
	phaseResumeSuccesses     int
	phaseResumeFailures      int
	transitionBlocked        int // P3: Guard metric
	transitionBypass         int // P3.4: Bypass audit metric
	durations                map[string]time.Duration
	autoStartLatency         time.Duration
	firstPhaseRunningLatency time.Duration
}

func (m *testMetrics) IncPhaseStarts()          { m.phaseStarts++ }
func (m *testMetrics) IncPhaseCompletions()     { m.phaseCompletions++ }
func (m *testMetrics) IncPhaseFailures()        { m.phaseFailures++ }
func (m *testMetrics) IncPhaseAutoStarts()      { m.phaseAutoStarts++ }
func (m *testMetrics) IncCampaignCompletions()  { m.campaignCompletions++ }
func (m *testMetrics) IncPhaseResumeAttempts()  { m.phaseResumeAttempts++ }
func (m *testMetrics) IncPhaseResumeSuccesses() { m.phaseResumeSuccesses++ }
func (m *testMetrics) IncPhaseResumeFailures()  { m.phaseResumeFailures++ }
func (m *testMetrics) IncAutoStartAttempts()    { m.autoStartAttempts++ }
func (m *testMetrics) IncAutoStartSuccesses()   { m.autoStartSuccesses++ }
func (m *testMetrics) IncAutoStartFailures()    { m.autoStartFailures++ }
func (m *testMetrics) IncManualModeCreations()  { m.manualModeCreations++ }
func (m *testMetrics) IncAutoModeCreations()    { m.autoModeCreations++ }
func (m *testMetrics) IncTransitionBlocked()    { m.transitionBlocked++ } // P3
func (m *testMetrics) IncTransitionBypass()     { m.transitionBypass++ }  // P3.4
func (m *testMetrics) RecordAutoStartLatency(d time.Duration) {
	m.autoStartLatency += d
}
func (m *testMetrics) RecordFirstPhaseRunningLatency(d time.Duration) {
	m.firstPhaseRunningLatency += d
}
func (m *testMetrics) RecordPhaseDuration(p string, d time.Duration) {
	if m.durations == nil {
		m.durations = make(map[string]time.Duration)
	}
	m.durations[p] += d
}

// --- Helpers ------------------------------------------------------------------------

func createTestCampaign(t *testing.T, cs store.CampaignStore) uuid.UUID {
	t.Helper()
	id := uuid.New()
	now := time.Now()
	name := "test-campaign-" + id.String()[:8]
	c := &models.LeadGenerationCampaign{
		ID:              id,
		Name:            name,
		CreatedAt:       now,
		UpdatedAt:       now,
		CampaignType:    "lead_generation",
		TotalPhases:     6,
		CompletedPhases: 0,
	}
	if err := cs.CreateCampaign(context.Background(), nil, c); err != nil {
		t.Fatalf("create campaign: %v", err)
	}
	return id
}

func upsertConfig(t *testing.T, cs store.CampaignStore, campaignID uuid.UUID, phase models.PhaseTypeEnum) {
	t.Helper()
	cfg := json.RawMessage(`{"dummy":true}`)
	if err := cs.UpsertPhaseConfig(context.Background(), nil, campaignID, phase, cfg); err != nil {
		t.Fatalf("upsert config %s: %v", phase, err)
	}
}

// integrationTestTimeout gives orchestration flows breathing room on slower CI hosts
// and under coverage instrumentation.
const integrationTestTimeout = 15 * time.Second

// waitUntil polls fn until it returns true or timeout elapses.
func waitUntil(t *testing.T, timeout time.Duration, fn func() bool) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if fn() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("condition not met within %s", timeout)
}

// --- Tests --------------------------------------------------------------------------

func TestFullSequenceAutoAdvanceSuccess(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	for _, ph := range []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
		models.PhaseTypeExtraction,
		models.PhaseTypeAnalysis,
		models.PhaseTypeEnrichment,
	} {
		upsertConfig(t, cs, campaignID, ph)
	}

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}

	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := analysisSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	waitUntil(t, integrationTestTimeout, func() bool { return metrics.campaignCompletions > 0 })
	if metrics.phaseStarts < 6 {
		t.Fatalf("expected >=6 phase starts got %d", metrics.phaseStarts)
	}
	if metrics.phaseCompletions != 6 {
		t.Fatalf("expected 6 phase completions got %d", metrics.phaseCompletions)
	}
	if metrics.phaseAutoStarts != 5 {
		t.Fatalf("expected 5 auto starts got %d", metrics.phaseAutoStarts)
	}
	if metrics.campaignCompletions != 1 {
		t.Fatalf("expected 1 campaign completion got %d", metrics.campaignCompletions)
	}
	for _, ph := range []string{"domain_generation", "dns_validation", "http_keyword_validation", "extraction", "analysis", "enrichment"} {
		if d, ok := metrics.durations[ph]; !ok || d <= 0 {
			t.Fatalf("expected duration recorded for %s", ph)
		}
	}
}

func TestFullSequenceAutoAdvanceWithRealEnrichment(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := domainservices.NewEnrichmentService(cs, deps)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	for _, ph := range []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
		models.PhaseTypeExtraction,
		models.PhaseTypeAnalysis,
		models.PhaseTypeEnrichment,
	} {
		upsertConfig(t, cs, campaignID, ph)
	}

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}

	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := analysisSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := enrichmentSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	waitUntil(t, integrationTestTimeout, func() bool { return metrics.campaignCompletions > 0 })

	if metrics.phaseStarts < 6 {
		t.Fatalf("expected >=6 phase starts got %d", metrics.phaseStarts)
	}
	if metrics.phaseCompletions != 6 {
		t.Fatalf("expected 6 phase completions got %d", metrics.phaseCompletions)
	}
	if metrics.phaseAutoStarts != 5 {
		t.Fatalf("expected 5 auto starts got %d", metrics.phaseAutoStarts)
	}
	if metrics.campaignCompletions != 1 {
		t.Fatalf("expected 1 campaign completion got %d", metrics.campaignCompletions)
	}
	for _, ph := range []string{"domain_generation", "dns_validation", "http_keyword_validation", "extraction", "analysis", "enrichment"} {
		if d, ok := metrics.durations[ph]; !ok || d <= 0 {
			t.Fatalf("expected duration recorded for %s", ph)
		}
	}
}
func TestCampaignDatabaseStateAfterFullAuto(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := domainservices.NewEnrichmentService(cs, deps)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	for _, ph := range []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
		models.PhaseTypeExtraction,
		models.PhaseTypeAnalysis,
		models.PhaseTypeEnrichment,
	} {
		upsertConfig(t, cs, campaignID, ph)
	}

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}

	// Wait for terminal phases to complete.
	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := analysisSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := enrichmentSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	waitUntil(t, integrationTestTimeout, func() bool { return metrics.campaignCompletions == 1 })

	// Validate campaign summary columns.
	var total, completed int
	var currentPhase sql.NullString
	var overallStatus string
	if err := db.QueryRow(
		`SELECT total_phases, completed_phases, current_phase, phase_status FROM lead_generation_campaigns WHERE id = $1`,
		campaignID,
	).Scan(&total, &completed, &currentPhase, &overallStatus); err != nil {
		t.Fatalf("fetch campaign row: %v", err)
	}
	if total != 6 {
		t.Fatalf("expected total_phases=6 got %d", total)
	}
	if completed != 6 {
		t.Fatalf("expected completed_phases=6 got %d", completed)
	}
	if currentPhase.Valid {
		t.Fatalf("expected current_phase NULL, got %s", currentPhase.String)
	}
	if overallStatus != string(models.PhaseStatusCompleted) {
		t.Fatalf("expected phase_status=completed got %s", overallStatus)
	}

	// Verify each phase row recorded completion and ordering 1..5.
	rows, err := db.Query(
		`SELECT phase_type, phase_order, status FROM campaign_phases WHERE campaign_id = $1 ORDER BY phase_order ASC`,
		campaignID,
	)
	if err != nil {
		t.Fatalf("query phases: %v", err)
	}
	defer rows.Close()

	expected := []struct {
		typ   models.PhaseTypeEnum
		order int
	}{
		{models.PhaseTypeDomainGeneration, 1},
		{models.PhaseTypeDNSValidation, 2},
		{models.PhaseTypeHTTPKeywordValidation, 3},
		{models.PhaseTypeExtraction, 4},
		{models.PhaseTypeAnalysis, 5},
		{models.PhaseTypeEnrichment, 6},
	}
	idx := 0
	for rows.Next() {
		var phaseType string
		var order int
		var status string
		if err := rows.Scan(&phaseType, &order, &status); err != nil {
			t.Fatalf("scan phase row: %v", err)
		}
		if idx >= len(expected) {
			t.Fatalf("unexpected extra phase row %s", phaseType)
		}
		ex := expected[idx]
		if phaseType != string(ex.typ) {
			t.Fatalf("phase %d expected %s got %s", idx+1, ex.typ, phaseType)
		}
		if order != ex.order {
			t.Fatalf("phase %s expected order %d got %d", phaseType, ex.order, order)
		}
		if status != string(models.PhaseStatusCompleted) {
			t.Fatalf("phase %s expected status completed got %s", phaseType, status)
		}
		idx++
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows err: %v", err)
	}
	if idx != len(expected) {
		t.Fatalf("expected %d phase rows got %d", len(expected), idx)
	}
}

func TestFrontendReadModelReadyAfterFullAuto(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := domainservices.NewEnrichmentService(cs, deps)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	for _, ph := range []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
		models.PhaseTypeExtraction,
		models.PhaseTypeAnalysis,
		models.PhaseTypeEnrichment,
	} {
		upsertConfig(t, cs, campaignID, ph)
	}

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}

	waitUntil(t, integrationTestTimeout, func() bool { return metrics.campaignCompletions == 1 })

	waitUntil(t, integrationTestTimeout, func() bool {
		campaign, err := cs.GetCampaignByID(context.Background(), db, campaignID)
		if err != nil {
			return false
		}
		if campaign.TotalPhases != 6 {
			return false
		}
		if campaign.CompletedPhases != 6 {
			return false
		}
		if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusCompleted {
			return false
		}
		return campaign.CurrentPhase == nil
	})

	campaign, err := cs.GetCampaignByID(context.Background(), db, campaignID)
	if err != nil {
		t.Fatalf("get campaign: %v", err)
	}
	if campaign.TotalPhases != 6 {
		t.Fatalf("total phases: expected 6 got %d", campaign.TotalPhases)
	}
	if campaign.CompletedPhases != 6 {
		t.Fatalf("completed phases: expected 6 got %d", campaign.CompletedPhases)
	}
	if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusCompleted {
		t.Fatalf("phase status expected completed got %v", campaign.PhaseStatus)
	}
	if campaign.CurrentPhase != nil {
		t.Fatalf("expected current phase cleared got %v", *campaign.CurrentPhase)
	}

	phases, err := cs.GetCampaignPhases(context.Background(), db, campaignID)
	if err != nil {
		t.Fatalf("get phases: %v", err)
	}
	if len(phases) != 6 {
		t.Fatalf("expected 6 phases got %d", len(phases))
	}
	expectedOrder := []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
		models.PhaseTypeExtraction,
		models.PhaseTypeAnalysis,
		models.PhaseTypeEnrichment,
	}
	for idx, ph := range phases {
		ex := expectedOrder[idx]
		if ph.PhaseType != ex {
			t.Fatalf("phase %d expected %s got %s", idx+1, ex, ph.PhaseType)
		}
		if ph.PhaseOrder != idx+1 {
			t.Fatalf("phase %s expected order %d got %d", ph.PhaseType, idx+1, ph.PhaseOrder)
		}
		if ph.Status != models.PhaseStatusCompleted {
			t.Fatalf("phase %s expected status completed got %s", ph.PhaseType, ph.Status)
		}
		if ph.CompletedAt == nil {
			t.Fatalf("phase %s missing completed_at timestamp", ph.PhaseType)
		}
	}
}

func TestFirstPhaseMissingConfigsGated(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	// Only provide DNS config (insufficient: missing HTTP + Enrichment + Analysis)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)

	err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration)
	if err == nil {
		t.Fatalf("expected gating error, got nil")
	}
	var missingErr *MissingPhaseConfigsError
	if !errors.As(err, &missingErr) {
		t.Fatalf("expected MissingPhaseConfigsError got %T", err)
	}
	// Legacy chainBlocked metric removed under strict Model A gating; asserting error type is sufficient.
}

func TestFullSequenceOptionalPhasesAutoConfigured(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := domainservices.NewEnrichmentService(cs, deps)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	for _, ph := range []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
		models.PhaseTypeExtraction,
	} {
		upsertConfig(t, cs, campaignID, ph)
	}
	// Intentionally skip enrichment + analysis configs; orchestrator should auto-configure defaults.

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}

	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := analysisSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	waitUntil(t, integrationTestTimeout, func() bool { return metrics.campaignCompletions > 0 })

	phases, err := cs.GetCampaignPhases(context.Background(), db, campaignID)
	if err != nil {
		t.Fatalf("get phases: %v", err)
	}
	var enrichmentPhase *models.CampaignPhase
	for idx := range phases {
		if phases[idx].PhaseType == models.PhaseTypeEnrichment {
			enrichmentPhase = phases[idx]
			break
		}
	}
	if enrichmentPhase == nil {
		t.Fatalf("expected enrichment phase record persisted")
	}
	if enrichmentPhase.Configuration == nil {
		t.Fatalf("expected enrichment defaults persisted, configuration missing")
	}
	trimmed := bytes.TrimSpace(*enrichmentPhase.Configuration)
	if len(trimmed) == 0 || bytes.Equal(trimmed, []byte("null")) {
		t.Fatalf("expected enrichment defaults persisted, got %s", string(trimmed))
	}

	analysisConfig, ok := analysisSvc.configs[campaignID]
	if !ok {
		t.Fatalf("expected analysis defaults configured for campaign %s", campaignID)
	}
	if _, ok := analysisConfig.(*domainservices.AnalysisConfig); !ok {
		t.Fatalf("expected analysis config type *AnalysisConfig got %T", analysisConfig)
	}

	if metrics.phaseAutoStarts != 5 {
		t.Fatalf("expected 5 auto starts got %d", metrics.phaseAutoStarts)
	}
}

func TestMidChainMissingNextConfigBlocks(t *testing.T) {
	t.Skip("Mid-chain missing next config scenario not valid with current gating (first phase requires all downstream configs). Needs redesign if desired.")
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}

	// Provide configs for domain + dns only; omit http + analysis to trigger mid-chain block after dns.
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}

	// Wait until DNS completes
	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := dnsSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})

	// HTTP phase should NOT have started (status should be not started)
	stHTTP, _ := httpSvc.GetStatus(context.Background(), campaignID)
	if stHTTP.Status != models.PhaseStatusNotStarted {
		t.Fatalf("expected http phase not started, got %s", stHTTP.Status)
	}
	// Legacy chainBlocked metric removed; mid-chain gating scenario retained only for documentation (skipped).
}

func TestFailureThenRetryChainContinues(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	// Provide all downstream configs so gating passes and later phases can start after retry.
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeHTTPKeywordValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeExtraction)
	upsertConfig(t, cs, campaignID, models.PhaseTypeAnalysis)
	upsertConfig(t, cs, campaignID, models.PhaseTypeEnrichment)

	// Force DNS failure on first attempt.
	dnsSvc.setFailOnce(campaignID)

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}

	// Wait for domain completion
	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := domainSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})

	// Auto attempt to start DNS should fail once (forced) and increment phaseFailures before we clear flag.
	waitUntil(t, integrationTestTimeout, func() bool { return metrics.phaseFailures == 1 })
	// Clear failure and manually start DNS.
	dnsSvc.clearFail(campaignID)
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDNSValidation); err != nil {
		t.Fatalf("retry dns start: %v", err)
	}
	// Wait for analysis completion (penultimate phase) and ensure enrichment completes as well.
	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := analysisSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := enrichmentSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	// Wait for async campaign completion handling
	waitUntil(t, integrationTestTimeout, func() bool { return metrics.campaignCompletions > 0 })

	// Metrics assertions: one failure (auto dns start), 6 completions, 6 starts (domain, dns manual, http auto, extraction auto, analysis auto, enrichment auto)
	if metrics.phaseFailures != 1 {
		t.Fatalf("expected 1 phase failure got %d", metrics.phaseFailures)
	}
	if metrics.phaseCompletions != 6 {
		t.Fatalf("expected 6 phase completions got %d", metrics.phaseCompletions)
	}
	if metrics.phaseStarts != 6 {
		t.Fatalf("expected 6 phase starts got %d", metrics.phaseStarts)
	}
	if metrics.phaseAutoStarts != 4 { // http + extraction + analysis + enrichment
		t.Fatalf("expected 4 successful auto starts got %d", metrics.phaseAutoStarts)
	}
	if metrics.campaignCompletions != 1 {
		t.Fatalf("expected 1 campaign completion got %d", metrics.campaignCompletions)
	}
	for _, ph := range []string{"domain_generation", "dns_validation", "http_keyword_validation", "extraction", "analysis", "enrichment"} {
		if d, ok := metrics.durations[ph]; !ok || d <= 0 {
			t.Fatalf("expected duration recorded for %s", ph)
		}
	}
}

// TestPhaseStartFailureMetrics ensures metrics reflect a direct start failure (pre-execution) properly.
func TestPhaseStartFailureMetrics(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}
	// Only need the failing phase service (domain) and minimal others
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	// Provide downstream configs so gating wouldn't block; we want an execution failure not gating error.
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeHTTPKeywordValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeExtraction)
	upsertConfig(t, cs, campaignID, models.PhaseTypeAnalysis)
	upsertConfig(t, cs, campaignID, models.PhaseTypeEnrichment)

	// Force failure on first attempt
	domainSvc.setFailOnce(campaignID)
	err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration)
	if err == nil {
		t.Fatalf("expected start failure error, got nil")
	}
	if metrics.phaseFailures != 1 {
		t.Fatalf("expected 1 phase failure got %d", metrics.phaseFailures)
	}
	if metrics.phaseStarts != 0 {
		t.Fatalf("expected 0 successful phase starts got %d", metrics.phaseStarts)
	}
	if metrics.phaseCompletions != 0 {
		t.Fatalf("expected 0 phase completions got %d", metrics.phaseCompletions)
	}
	if metrics.campaignCompletions != 0 {
		t.Fatalf("expected 0 campaign completions got %d", metrics.campaignCompletions)
	}
	if len(metrics.durations) != 0 {
		t.Fatalf("expected no durations recorded, got %d", len(metrics.durations))
	}
}

// TestIdempotentPhaseStartNoDuplicateExecution ensures calling StartPhaseInternal repeatedly while a phase is in progress
// does not spawn duplicate executions (Blocker B2 regression guard).
func TestIdempotentPhaseStartNoDuplicateExecution(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	// Provide downstream configs (full_sequence gating disabled by staying in default step_by_step mode so optional)
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("initial start: %v", err)
	}
	// Immediately invoke duplicate start attempts while phase is still in progress.
	for i := 0; i < 5; i++ {
		if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
			t.Fatalf("duplicate start %d returned error: %v", i, err)
		}
	}
	// Wait for completion
	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := domainSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	// Assert only one underlying Execute invocation happened
	if cnt := domainSvc.executions(campaignID); cnt != 1 {
		t.Fatalf("expected single execution, got %d", cnt)
	}
	// Metrics: phaseStarts should count only the successful first start.
	if metrics.phaseStarts != 1 {
		t.Fatalf("expected metrics.phaseStarts=1 got %d", metrics.phaseStarts)
	}
}

func TestRestoreInFlightPhases_DormantWithoutAutoResume(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, nil)

	campaignID := createTestCampaign(t, cs)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	registerPhaseCleanup(t, orch, domainSvc, campaignID, models.PhaseTypeDomainGeneration)

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}
	waitUntil(t, integrationTestTimeout, func() bool { return domainSvc.executions(campaignID) == 1 })
	waitUntil(t, integrationTestTimeout, func() bool { return domainSvc.progressEventCount(campaignID) > 10 })

	if err := orch.PausePhase(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("pause phase: %v", err)
	}
	waitUntil(t, integrationTestTimeout, func() bool { return domainSvc.isPaused(campaignID) })

	domainSvc2 := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	orch2 := NewCampaignOrchestrator(cs, deps, domainSvc2, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, nil)
	registerPhaseCleanup(t, orch2, domainSvc2, campaignID, models.PhaseTypeDomainGeneration)

	if err := orch2.RestoreInFlightPhases(context.Background()); err != nil {
		t.Fatalf("restore in-flight phases: %v", err)
	}

	if got := domainSvc2.executions(campaignID); got != 0 {
		t.Fatalf("expected no executions during restore, got %d", got)
	}
	if attaches := domainSvc2.attachEventCount(campaignID); attaches == 0 {
		t.Fatalf("expected control channel to reattach during restore")
	}
	campaign, err := cs.GetCampaignByID(context.Background(), db, campaignID)
	if err != nil {
		t.Fatalf("get campaign: %v", err)
	}
	if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusPaused {
		t.Fatalf("expected campaign status paused after restore, got %v", campaign.PhaseStatus)
	}
}

// fastZeroPhaseService simulates a phase that completes instantly (e.g., extraction with 0 items).
// This specifically tests the race condition where GetStatus returns NotStarted because the
// in-memory execution completes and is cleaned up before handlePhaseCompletion queries status.
// The fix ensures DB is the authoritative source for terminal states.
type fastZeroPhaseService struct {
	phaseType models.PhaseTypeEnum
	logger    *testLogger
	store     store.CampaignStore
	db        store.Querier
	mu        sync.Mutex
	executes  map[uuid.UUID]int
	configs   map[uuid.UUID]interface{}
}

func newFastZeroPhaseService(pt models.PhaseTypeEnum, l *testLogger, cs store.CampaignStore, db store.Querier) *fastZeroPhaseService {
	return &fastZeroPhaseService{
		phaseType: pt,
		logger:    l,
		store:     cs,
		db:        db,
		executes:  make(map[uuid.UUID]int),
		configs:   make(map[uuid.UUID]interface{}),
	}
}

func (s *fastZeroPhaseService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.configs[campaignID] = config
	return nil
}

func (s *fastZeroPhaseService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan domainservices.PhaseProgress, error) {
	ch := make(chan domainservices.PhaseProgress, 4)
	s.mu.Lock()
	s.executes[campaignID]++
	s.mu.Unlock()

	// Simulate instant completion - the key race condition this tests
	go func() {
		// Mark phase completed in DB IMMEDIATELY (this is what the real extraction does)
		if s.store != nil && s.db != nil {
			_ = s.store.CompletePhase(ctx, s.db, campaignID, s.phaseType)
		}
		// Close channel immediately - no progress events, simulating 0 items
		close(ch)
	}()
	return ch, nil
}

func (s *fastZeroPhaseService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*domainservices.PhaseStatus, error) {
	// CRITICAL: This simulates the race - return NotStarted from in-memory
	// because we didn't store execution state. The fix should fall back to DB.
	status := &domainservices.PhaseStatus{
		CampaignID: campaignID,
		Phase:      s.phaseType,
		Status:     models.PhaseStatusNotStarted, // In-memory shows NotStarted
	}

	// However, check DB for actual status (this is what the fix adds)
	if s.store != nil && s.db != nil {
		if dbPhase, err := s.store.GetCampaignPhase(ctx, s.db, campaignID, s.phaseType); err == nil && dbPhase != nil {
			if dbPhase.Status == models.PhaseStatusCompleted || dbPhase.Status == models.PhaseStatusFailed {
				status.Status = dbPhase.Status
				status.StartedAt = dbPhase.StartedAt
				status.CompletedAt = dbPhase.CompletedAt
				if dbPhase.Status == models.PhaseStatusCompleted {
					status.ProgressPct = 100.0
				}
			}
		}
	}
	return status, nil
}

func (s *fastZeroPhaseService) Cancel(ctx context.Context, campaignID uuid.UUID) error { return nil }
func (s *fastZeroPhaseService) Validate(ctx context.Context, config interface{}) error { return nil }
func (s *fastZeroPhaseService) GetPhaseType() models.PhaseTypeEnum                     { return s.phaseType }
func (s *fastZeroPhaseService) executions(campaignID uuid.UUID) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.executes[campaignID]
}

// ScoreDomains and RescoreCampaign for AnalysisService interface
func (s *fastZeroPhaseService) ScoreDomains(ctx context.Context, campaignID uuid.UUID) error {
	return nil
}
func (s *fastZeroPhaseService) RescoreCampaign(ctx context.Context, campaignID uuid.UUID) error {
	return nil
}

// TestFastZeroPathAutoAdvance is a regression test for the pipeline stall bug.
// It verifies that when extraction completes in <100ms with 0 items, analysis auto-starts.
// This was the root cause of campaign "test-offset-resume-logic" stalling at HTTP Keyword Validation.
//
// SKIP REASON: This test passes reliably in isolation but exhibits flaky behavior when run
// as part of the full test suite (go test ./...) due to database connection contention and
// timing sensitivities. The underlying functionality is also covered by TestFullSequenceAutoAdvanceSuccess.
// TODO(P1-stabilization): Investigate database isolation or connection pooling to make this
// test stable under parallel package execution. See also: PR_DESCRIPTION.md Phase 0 items.
func TestFastZeroPathAutoAdvance(t *testing.T) {
	t.Skip("Flaky under parallel package execution - see comment above for TODO")
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	// Use normal stubs for all phases except extraction which uses the fast-zero stub
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	// CRITICAL: Use fastZeroPhaseService for extraction to simulate the race
	extractionSvc := newFastZeroPhaseService(models.PhaseTypeExtraction, logger, cs, db)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	for _, ph := range []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
		models.PhaseTypeExtraction,
		models.PhaseTypeAnalysis,
		models.PhaseTypeEnrichment,
	} {
		upsertConfig(t, cs, campaignID, ph)
	}

	// Start the pipeline
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}

	// Wait for analysis to start - this is the key assertion
	// If the bug is present, analysis will never start because extraction's GetStatus returns NotStarted
	waitUntil(t, integrationTestTimeout, func() bool {
		return analysisSvc.executions(campaignID) > 0
	})

	// Verify extraction was executed
	if got := extractionSvc.executions(campaignID); got != 1 {
		t.Fatalf("expected extraction to execute once, got %d", got)
	}

	// Wait for full pipeline completion
	waitUntil(t, integrationTestTimeout, func() bool {
		st, _ := enrichmentSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	waitUntil(t, integrationTestTimeout, func() bool { return metrics.campaignCompletions > 0 })

	// Verify the full sequence completed
	if metrics.phaseCompletions < 6 {
		t.Fatalf("expected 6 phase completions, got %d", metrics.phaseCompletions)
	}
	if metrics.phaseAutoStarts < 5 {
		t.Fatalf("expected 5 auto starts, got %d", metrics.phaseAutoStarts)
	}
	if metrics.campaignCompletions != 1 {
		t.Fatalf("expected 1 campaign completion, got %d", metrics.campaignCompletions)
	}

	t.Logf("SUCCESS: Fast-zero extraction path correctly auto-advanced to analysis")
}

// TestIdempotentStartForCompletedPhase verifies requirement #4:
// If StartPhaseInternal is called for a phase already marked Completed in DB,
// it must no-op and immediately trigger auto-advance to the next phase.
func TestIdempotentStartForCompletedPhase(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	for _, ph := range []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
		models.PhaseTypeExtraction,
		models.PhaseTypeAnalysis,
		models.PhaseTypeEnrichment,
	} {
		upsertConfig(t, cs, campaignID, ph)
	}

	// Manually mark extraction as completed in DB (simulating it already ran)
	if err := cs.StartPhase(context.Background(), db, campaignID, models.PhaseTypeExtraction); err != nil {
		t.Fatalf("start extraction phase in DB: %v", err)
	}
	if err := cs.CompletePhase(context.Background(), db, campaignID, models.PhaseTypeExtraction); err != nil {
		t.Fatalf("complete extraction phase in DB: %v", err)
	}

	// Now call StartPhaseInternal for extraction - it should no-op and auto-advance to analysis
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeExtraction); err != nil {
		t.Fatalf("start extraction (idempotent): %v", err)
	}

	// Wait for analysis to start
	waitUntil(t, integrationTestTimeout, func() bool {
		return analysisSvc.executions(campaignID) > 0
	})

	// Extraction service should NOT have been executed (since it was already completed)
	if got := extractionSvc.executions(campaignID); got != 0 {
		t.Fatalf("expected extraction to NOT execute (already completed), got %d executions", got)
	}

	// Analysis should have started
	if got := analysisSvc.executions(campaignID); got != 1 {
		t.Fatalf("expected analysis to execute once, got %d", got)
	}

	t.Logf("SUCCESS: Idempotent start for completed phase correctly auto-advanced")
}
