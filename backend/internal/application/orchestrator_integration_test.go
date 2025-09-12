package application

import (
	"context"
	"encoding/json"
	"errors"
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

// testLogger implements domainservices.Logger with no-op methods (minimal output via t.Logf when bound).
type testLogger struct{ t *testing.T }

func (l *testLogger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {
	if l.t != nil {
		l.t.Logf("DEBUG %s %#v", msg, fields)
	}
}
func (l *testLogger) Info(ctx context.Context, msg string, fields map[string]interface{}) {
	if l.t != nil {
		l.t.Logf("INFO %s %#v", msg, fields)
	}
}
func (l *testLogger) Warn(ctx context.Context, msg string, fields map[string]interface{}) {
	if l.t != nil {
		l.t.Logf("WARN %s %#v", msg, fields)
	}
}
func (l *testLogger) Error(ctx context.Context, msg string, err error, fields map[string]interface{}) {
	if l.t != nil {
		l.t.Logf("ERROR %s err=%v %#v", msg, err, fields)
	}
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
	s.configs[campaignID] = config
	return nil
}

func (s *stubPhaseService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan domainservices.PhaseProgress, error) {
	if s.fail[campaignID] {
		return nil, errors.New("forced failure")
	}
	ch := make(chan domainservices.PhaseProgress, 4)
	s.executes[campaignID]++
	started := time.Now()
	st := &domainservices.PhaseStatus{CampaignID: campaignID, Phase: s.phaseType, Status: models.PhaseStatusInProgress, StartedAt: &started}
	s.statuses[campaignID] = st
	go func() {
		defer close(ch)
		// Simulate a tiny bit of work
		ch <- domainservices.PhaseProgress{CampaignID: campaignID, Phase: s.phaseType, Status: models.PhaseStatusInProgress, ProgressPct: 10, Timestamp: time.Now()}
		time.Sleep(5 * time.Millisecond)
		st.Status = models.PhaseStatusCompleted
		st.ProgressPct = 100
		completed := time.Now()
		st.CompletedAt = &completed
		// We purposefully do NOT send a completed progress item; orchestrator relies on channel close + GetStatus
	}()
	return ch, nil
}

func (s *stubPhaseService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*domainservices.PhaseStatus, error) {
	if st, ok := s.statuses[campaignID]; ok {
		return st, nil
	}
	return &domainservices.PhaseStatus{CampaignID: campaignID, Phase: s.phaseType, Status: models.PhaseStatusNotStarted}, nil
}

func (s *stubPhaseService) Cancel(ctx context.Context, campaignID uuid.UUID) error { return nil }
func (s *stubPhaseService) Validate(ctx context.Context, config interface{}) error { return nil }
func (s *stubPhaseService) GetPhaseType() models.PhaseTypeEnum                     { return s.phaseType }
func (s *stubPhaseService) setFailOnce(campaignID uuid.UUID)                       { s.fail[campaignID] = true }
func (s *stubPhaseService) clearFail(campaignID uuid.UUID)                         { delete(s.fail, campaignID) }
func (s *stubPhaseService) executions(campaignID uuid.UUID) int                    { return s.executes[campaignID] }

// AnalysisService methods (no-op for non-analysis phases)
func (s *stubPhaseService) ScoreDomains(ctx context.Context, campaignID uuid.UUID) error { return nil }
func (s *stubPhaseService) RescoreCampaign(ctx context.Context, campaignID uuid.UUID) error {
	return nil
}

// testMetrics captures orchestrator metric increments for assertions.
type testMetrics struct {
	phaseStarts         int
	phaseCompletions    int
	phaseFailures       int
	phaseAutoStarts     int
	campaignCompletions int
	durations           map[string]time.Duration
}

func (m *testMetrics) IncPhaseStarts()         { m.phaseStarts++ }
func (m *testMetrics) IncPhaseCompletions()    { m.phaseCompletions++ }
func (m *testMetrics) IncPhaseFailures()       { m.phaseFailures++ }
func (m *testMetrics) IncPhaseAutoStarts()     { m.phaseAutoStarts++ }
func (m *testMetrics) IncCampaignCompletions() { m.campaignCompletions++ }
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
		TotalPhases:     4,
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
	logger := &testLogger{t: t}
	deps := domainservices.Dependencies{Logger: logger, DB: db}
	// Stub services
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	// Enable full sequence mode
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	// Provide downstream configs required for gating + domain config (optional)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeHTTPKeywordValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeAnalysis)

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}

	// Wait for analysis phase completion (last phase)
	waitUntil(t, 2*time.Second, func() bool {
		st, _ := analysisSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	// Wait for orchestrator to process completion and increment metric (async goroutine)
	waitUntil(t, 2*time.Second, func() bool { return metrics.campaignCompletions > 0 })
	// Expect 4 starts (domain + 3 auto)
	if metrics.phaseStarts < 4 {
		t.Fatalf("expected >=4 phase starts got %d", metrics.phaseStarts)
	}
	if metrics.phaseCompletions != 4 {
		t.Fatalf("expected 4 phase completions got %d", metrics.phaseCompletions)
	}
	if metrics.phaseAutoStarts != 3 { // domain manual, remaining 3 auto
		t.Fatalf("expected 3 auto starts got %d", metrics.phaseAutoStarts)
	}
	if metrics.campaignCompletions != 1 {
		t.Fatalf("expected 1 campaign completion got %d", metrics.campaignCompletions)
	}
	// Durations should exist for each phase
	for _, ph := range []string{"domain_generation", "dns_validation", "http_keyword_validation", "analysis"} {
		if d, ok := metrics.durations[ph]; !ok || d <= 0 {
			t.Fatalf("expected duration recorded for %s", ph)
		}
	}
}

func TestFirstPhaseMissingConfigsGated(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := &testLogger{t: t}
	deps := domainservices.Dependencies{Logger: logger, DB: db}
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	// Only provide DNS config (insufficient: missing HTTP + Analysis)
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

func TestMidChainMissingNextConfigBlocks(t *testing.T) {
	t.Skip("Mid-chain missing next config scenario not valid with current gating (first phase requires all downstream configs). Needs redesign if desired.")
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := &testLogger{t: t}
	deps := domainservices.Dependencies{Logger: logger, DB: db}
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, analysisSvc, nil, metrics)

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
	waitUntil(t, 2*time.Second, func() bool {
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
	logger := &testLogger{t: t}
	deps := domainservices.Dependencies{Logger: logger, DB: db}
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	// Provide all downstream configs so gating passes and later phases can start after retry.
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeHTTPKeywordValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeAnalysis)

	// Force DNS failure on first attempt.
	dnsSvc.setFailOnce(campaignID)

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}

	// Wait for domain completion
	waitUntil(t, 2*time.Second, func() bool {
		st, _ := domainSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})

	// Auto attempt to start DNS should fail once (forced) and increment phaseFailures before we clear flag.
	waitUntil(t, 2*time.Second, func() bool { return metrics.phaseFailures == 1 })
	// Clear failure and manually start DNS.
	dnsSvc.clearFail(campaignID)
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDNSValidation); err != nil {
		t.Fatalf("retry dns start: %v", err)
	}
	// Wait for analysis completion (end of chain)
	waitUntil(t, 2*time.Second, func() bool {
		st, _ := analysisSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	// Wait for async campaign completion handling
	waitUntil(t, 2*time.Second, func() bool { return metrics.campaignCompletions > 0 })

	// Metrics assertions: one failure (auto dns start), 4 completions, 4 starts (domain, dns manual, http auto, analysis auto)
	if metrics.phaseFailures != 1 {
		t.Fatalf("expected 1 phase failure got %d", metrics.phaseFailures)
	}
	if metrics.phaseCompletions != 4 {
		t.Fatalf("expected 4 phase completions got %d", metrics.phaseCompletions)
	}
	if metrics.phaseStarts != 4 {
		t.Fatalf("expected 4 phase starts got %d", metrics.phaseStarts)
	}
	if metrics.phaseAutoStarts != 2 { // http + analysis
		t.Fatalf("expected 2 successful auto starts got %d", metrics.phaseAutoStarts)
	}
	if metrics.campaignCompletions != 1 {
		t.Fatalf("expected 1 campaign completion got %d", metrics.campaignCompletions)
	}
	for _, ph := range []string{"domain_generation", "dns_validation", "http_keyword_validation", "analysis"} {
		if d, ok := metrics.durations[ph]; !ok || d <= 0 {
			t.Fatalf("expected duration recorded for %s", ph)
		}
	}
}

// TestPhaseStartFailureMetrics ensures metrics reflect a direct start failure (pre-execution) properly.
func TestPhaseStartFailureMetrics(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := &testLogger{t: t}
	deps := domainservices.Dependencies{Logger: logger, DB: db}
	// Only need the failing phase service (domain) and minimal others
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, analysisSvc, nil, metrics)

	campaignID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}
	// Provide downstream configs so gating wouldn't block; we want an execution failure not gating error.
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeHTTPKeywordValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeAnalysis)

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
