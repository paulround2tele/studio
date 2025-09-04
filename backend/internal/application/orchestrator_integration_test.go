package application

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"testing"
	"time"

	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
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

// --- SSE stub ----------------------------------------------------------------------
type capturedEvent struct {
	event string
	phase string
}
type stubSSE struct{ events []capturedEvent }

func (s *stubSSE) BroadcastToCampaign(id uuid.UUID, evt services.SSEEvent) {
	ce := capturedEvent{event: string(evt.Event)}
	if ph, ok := evt.Data["phase"].(string); ok {
		ce.phase = ph
	}
	s.events = append(s.events, ce)
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
	if metrics.phaseStarts != 4 {
		t.Fatalf("expected 4 phase starts got %d", metrics.phaseStarts)
	}
	if metrics.phaseCompletions != 4 {
		t.Fatalf("expected 4 phase completions got %d", metrics.phaseCompletions)
	}
	if metrics.phaseAutoStarts != 3 { // auto for dns, http, analysis
		t.Fatalf("expected 3 phase auto-starts got %d", metrics.phaseAutoStarts)
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
	// Do NOT provide DNS config (immediate next phase) to trigger gating under relaxed rules.
	// Downstream further phases are irrelevant for initial gating now.

	err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration)
	if err == nil {
		t.Fatalf("expected gating error, got nil")
	}
	var missingErr *MissingPhaseConfigsError
	if !errors.As(err, &missingErr) {
		t.Fatalf("expected MissingPhaseConfigsError got %T", err)
	}
	// Former gating metric removed under strict model A.
}

// Removed TestMidChainMissingNextConfigBlocks: mid-chain gating eliminated in strict model A.

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

	// Auto attempt to start DNS should have failed.
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

	// DNS first attempt failed (no completion), then manual start completes DNS, auto-starts HTTP & Analysis (2 auto starts)
	if metrics.phaseStarts != 4 { // domain + dns (manual retry) + http + analysis
		t.Fatalf("expected 4 phase starts got %d", metrics.phaseStarts)
	}
	if metrics.phaseAutoStarts != 2 { // http & analysis only
		t.Fatalf("expected 2 auto-starts got %d", metrics.phaseAutoStarts)
	}
	if metrics.phaseCompletions != 4 { // all four phases eventually complete
		t.Fatalf("expected 4 phase completions got %d", metrics.phaseCompletions)
	}
}

// Added by migration fix: ensure no ambiguous 'key' column error in audit trigger.
func TestAuditTriggerNoAmbiguousKey(t *testing.T) {
	db, cs, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	ctx := context.Background()
	id := createTestCampaign(t, cs)
	st := models.PhaseStatusCompleted
	if err := cs.UpdateCampaignStatus(ctx, db, id, st, sql.NullString{}); err != nil {
		t.Fatalf("unexpected error updating campaign status: %v", err)
	}
	var count int
	if err := db.Get(&count, `SELECT COUNT(*) FROM audit_logs WHERE entity_type = 'lead_generation_campaigns' AND entity_id = $1`, id); err != nil {
		t.Fatalf("failed to read audit logs: %v", err)
	}
	if count == 0 {
		t.Fatalf("expected at least one audit log entry, got 0")
	}
}

// A. Unblock scenario: initially missing HTTP config blocks chain; adding config and manual start resumes chain.
// Removed TestMidChainUnblockAfterConfigAdded: obsolete under strict model A.

// B. SSE event ordering basic assertions.
func TestSSEEventOrderingFullSequence(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := &testLogger{t: t}
	deps := domainservices.Dependencies{Logger: logger, DB: db}
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	metrics := &testMetrics{}
	sseStub := &stubSSE{}
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, analysisSvc, sseStub, metrics)
	campaignID := createTestCampaign(t, cs)
	// Create a valid user row then assign to campaign to enable SSE events
	userID := uuid.New()
	if _, err := db.Exec(`INSERT INTO users (id,email,password_hash,first_name,last_name) VALUES ($1,$2,'x','Test','User')`, userID, userID.String()+"@example.com"); err != nil {
		t.Fatalf("create user: %v", err)
	}
	if _, err := db.Exec(`UPDATE lead_generation_campaigns SET user_id = $1 WHERE id = $2`, userID, campaignID); err != nil {
		t.Fatalf("assign user_id: %v", err)
	}
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("mode: %v", err)
	}
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeHTTPKeywordValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeAnalysis)
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start: %v", err)
	}
	waitUntil(t, 2*time.Second, func() bool {
		st, _ := analysisSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	// wait for campaign_completed specifically (broadcast may lag a bit)
	waitUntil(t, 750*time.Millisecond, func() bool {
		for _, e := range sseStub.events {
			if e.event == string(services.SSEEventCampaignCompleted) {
				return true
			}
		}
		return false
	})
	if len(sseStub.events) == 0 {
		t.Fatalf("expected SSE events, got none")
	}
	if sseStub.events[0].event != string(services.SSEEventPhaseStarted) {
		t.Fatalf("first event expected phase_started got %s", sseStub.events[0].event)
	}
	foundAuto := false
	foundCompleted := false
	for _, e := range sseStub.events {
		if e.event == string(services.SSEEventPhaseAutoStarted) {
			foundAuto = true
		}
		if e.event == string(services.SSEEventCampaignCompleted) {
			foundCompleted = true
		}
	}
	if !foundAuto {
		t.Fatalf("expected at least one phase_auto_started event")
	}
	if !foundCompleted {
		t.Fatalf("expected campaign_completed event")
	}
}

// C. Mid-chain failure stops further auto-advance; simulate HTTP failure.
func TestMidChainFailureStopsAutoAdvance(t *testing.T) {
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
		t.Fatalf("mode: %v", err)
	}
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)
	upsertConfig(t, cs, campaignID, models.PhaseTypeHTTPKeywordValidation)
	// Omit analysis config intentionally
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain: %v", err)
	}
	waitUntil(t, 2*time.Second, func() bool {
		st, _ := domainSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	// Force HTTP failure before auto-start attempt
	httpSvc.setFailOnce(campaignID)
	waitUntil(t, 2*time.Second, func() bool {
		st, _ := dnsSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	// Give time for failed auto-advance attempt
	time.Sleep(150 * time.Millisecond)
	stAnalysis, _ := analysisSvc.GetStatus(context.Background(), campaignID)
	if stAnalysis.Status != models.PhaseStatusNotStarted {
		t.Fatalf("expected analysis not started got %s", stAnalysis.Status)
	}
}

// New test: phase failure metrics increment when start fails and when runtime failure occurs.
func TestPhaseFailureMetrics(t *testing.T) {
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
	// Enable full sequence and provide only first + dns configs so failure will be start-level for http later.
	if err := cs.UpdateCampaignMode(context.Background(), nil, campaignID, "full_sequence"); err != nil {
		t.Fatalf("mode: %v", err)
	}
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)
	// Force domain to fail on start
	domainSvc.setFailOnce(campaignID)
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err == nil {
		t.Fatalf("expected start failure")
	}
	if metrics.phaseFailures != 1 {
		t.Fatalf("expected 1 failure metric (start failure) got %d", metrics.phaseFailures)
	}
	// Clear and start successfully now, then force DNS runtime failure by failing its execute on next auto start
	domainSvc.clearFail(campaignID)
	dnsSvc.setFailOnce(campaignID)
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain: %v", err)
	}
	// Wait for domain completion (dns auto start will fail immediately to start, counted as failure)
	waitUntil(t, 2*time.Second, func() bool {
		st, _ := domainSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	// Allow some time for dns auto start attempt
	time.Sleep(150 * time.Millisecond)
	if metrics.phaseFailures < 2 {
		t.Fatalf("expected at least 2 failure metrics (start + runtime) got %d", metrics.phaseFailures)
	}
}

// step_by_step mode should NOT auto-advance.
func TestStepByStepNoAutoAdvance(t *testing.T) {
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
	// Default mode is step_by_step (do not set full_sequence)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain: %v", err)
	}
	waitUntil(t, 2*time.Second, func() bool {
		st, _ := domainSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	// DNS should not have started automatically
	stDNS, _ := dnsSvc.GetStatus(context.Background(), campaignID)
	if stDNS.Status != models.PhaseStatusNotStarted {
		t.Fatalf("expected dns not started, got %s", stDNS.Status)
	}
	if metrics.phaseAutoStarts != 0 {
		t.Fatalf("expected 0 auto starts got %d", metrics.phaseAutoStarts)
	}
}

// Cancellation test: Start a phase then cancel it (no failure metric expected because cancel returns nil).
func TestCancelPhase(t *testing.T) {
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
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain: %v", err)
	}
	// Immediately cancel
	if err := orch.CancelPhase(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("cancel: %v", err)
	}
	// Give time for goroutine to finish naturally
	time.Sleep(50 * time.Millisecond)
	// Since cancel is a no-op in stub, phase likely completed quickly; just assert no failure metric inflation.
	if metrics.phaseFailures != 0 {
		t.Fatalf("expected 0 failures got %d", metrics.phaseFailures)
	}
}

// Duplicate start test: starting the same phase twice while in progress should not increment starts twice.
func TestDuplicateStartIgnored(t *testing.T) {
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
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain: %v", err)
	}
	// Immediately attempt duplicate start
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("duplicate start returned error: %v", err)
	}
	// Wait end
	waitUntil(t, 2*time.Second, func() bool {
		st, _ := domainSvc.GetStatus(context.Background(), campaignID)
		return st.Status == models.PhaseStatusCompleted
	})
	if metrics.phaseStarts != 1 {
		t.Fatalf("expected 1 start got %d", metrics.phaseStarts)
	}
}
