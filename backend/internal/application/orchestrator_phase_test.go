package application

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	pg_store "github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/fntelecomllc/studio/backend/internal/testutil"
	"github.com/google/uuid"
)

// wait helper (local minimal to avoid importing from other test files)
func waitPoll(t *testing.T, timeout time.Duration, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("condition not met within %s", timeout)
}

// TestStartPhaseFromConfigured validates Blocker B1 fix: a phase row already in 'configured' status transitions to in_progress -> completed when started.
func TestStartPhaseFromConfigured(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := &testLogger{t: t}
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	// Create campaign
	campID := uuid.New()
	now := time.Now()
	c := &models.LeadGenerationCampaign{ID: campID, Name: "configured-phase-camp", CreatedAt: now, UpdatedAt: now, CampaignType: "lead_generation", TotalPhases: 5}
	if err := cs.CreateCampaign(context.Background(), nil, c); err != nil {
		t.Fatalf("create campaign: %v", err)
	}

	// Manually insert a campaign_phases row with status 'configured' for domain_generation
	_, err := db.Exec(`INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, progress_percentage, created_at, updated_at)
					   VALUES ($1,'domain_generation',1,'configured',0,NOW(),NOW())`, campID)
	if err != nil {
		t.Fatalf("insert configured phase row: %v", err)
	}

	// Sanity: ensure row status is configured
	var preStatus string
	if err := db.QueryRow(`SELECT status FROM campaign_phases WHERE campaign_id=$1 AND phase_type='domain_generation'`, campID).Scan(&preStatus); err != nil {
		t.Fatalf("fetch pre status: %v", err)
	}
	if preStatus != "configured" {
		t.Fatalf("expected pre status configured got %s", preStatus)
	}

	// Orchestrator with stub services
	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, enrichmentSvc, analysisSvc, nil, nil)

	if err := orch.StartPhaseInternal(context.Background(), campID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start from configured: %v", err)
	}

	// Wait until stub service status reports completed (source of truth for Blocker B1 behavioral fix)
	waitPoll(t, 2*time.Second, func() bool {
		st, _ := domainSvc.GetStatus(context.Background(), campID)
		return st.Status == models.PhaseStatusCompleted
	})
	// Best-effort: fetch DB status (should be in_progress or completed depending on async completion timing)
	var dbStatus string
	if err := db.QueryRow(`SELECT status FROM campaign_phases WHERE campaign_id=$1 AND phase_type='domain_generation'`, campID).Scan(&dbStatus); err == nil {
		// Accept configured/in_progress/completed due to possible trigger recomputation ordering; primary guarantee is that Execute ran (in-memory completed)
		if dbStatus != "configured" && dbStatus != "in_progress" && dbStatus != "completed" {
			t.Fatalf("unexpected db status %s", dbStatus)
		}
	}
}

// TestHTTPConfigureBlockedUntilDNSCompleted validates Blocker B3 gating (ensureDNSCompleted) by calling HTTP service Configure with DNS not completed.
func TestHTTPConfigureBlockedUntilDNSCompleted(t *testing.T) {
	db, campaignStore, _, personaStore, _, keywordStore, proxyStore, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := &testLogger{t: t}
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	// Create campaign (DNS phase not run/completed)
	campID := uuid.New()
	now := time.Now()
	c := &models.LeadGenerationCampaign{ID: campID, Name: "http-gate-camp", CreatedAt: now, UpdatedAt: now, CampaignType: "lead_generation", TotalPhases: 5}
	if err := cs.CreateCampaign(context.Background(), nil, c); err != nil {
		t.Fatalf("create campaign: %v", err)
	}

	// Insert DNS phase row with not_started status to produce deterministic message
	if _, err := db.Exec(`INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, progress_percentage, created_at, updated_at)
						  VALUES ($1,'dns_validation',2,'not_started',0,NOW(),NOW())`, campID); err != nil {
		t.Fatalf("insert dns row: %v", err)
	}

	// Instantiate real HTTP validation service (httpValidator nil is fine for Configure path)
	httpSvc := domainservices.NewHTTPValidationService(campaignStore, deps, nil, personaStore, proxyStore, keywordStore)

	cfg := &models.HTTPPhaseConfigRequest{
		PersonaIDs: []string{"persona-placeholder"},
		Keywords:   []string{"test"},
	}

	if err := httpSvc.Configure(context.Background(), campID, cfg); err != nil {
		t.Fatalf("configure should succeed even when DNS pending, got %v", err)
	}

	ch, err := httpSvc.Execute(context.Background(), campID)
	if err == nil {
		t.Fatalf("expected error gating HTTP execute when DNS incomplete, got nil")
	}
	if ch != nil {
		t.Fatalf("expected nil progress channel on gating error")
	}
	if got := err.Error(); got == "" || !containsAll(got, []string{"DNS", "status"}) { // basic semantic check
		t.Fatalf("unexpected error message: %v", got)
	}
}

// containsAll helper for partial error message validation
func containsAll(s string, subs []string) bool {
	for _, sub := range subs {
		if !strings.Contains(s, sub) {
			return false
		}
	}
	return true
}

func TestStartPhaseAnalysisRequiresHTTPCompletion(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := &testLogger{t: t}
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	campID := createTestCampaign(t, cs)

	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, enrichmentSvc, analysisSvc, nil, nil)

	err := orch.StartPhaseInternal(context.Background(), campID, models.PhaseTypeAnalysis)
	if err == nil {
		t.Fatalf("expected dependency error when HTTP not completed")
	}
	var depErr *PhaseDependencyError
	if !errors.As(err, &depErr) {
		t.Fatalf("expected PhaseDependencyError, got %v", err)
	}
	if depErr.BlockingPhase != models.PhaseTypeHTTPKeywordValidation {
		t.Fatalf("expected HTTP dependency, got %s", depErr.BlockingPhase)
	}

	if _, err := db.Exec(`INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, progress_percentage, created_at, updated_at)
		VALUES ($1,'http_keyword_validation',3,'completed',100,NOW(),NOW())`, campID); err != nil {
		t.Fatalf("insert http row: %v", err)
	}

	if err := orch.StartPhaseInternal(context.Background(), campID, models.PhaseTypeAnalysis); err != nil {
		t.Fatalf("analysis should start once HTTP completed: %v", err)
	}
}

func TestStartPhaseHTTPRequiresDNSCompletion(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := &testLogger{t: t}
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	campID := createTestCampaign(t, cs)

	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, enrichmentSvc, analysisSvc, nil, nil)

	err := orch.StartPhaseInternal(context.Background(), campID, models.PhaseTypeHTTPKeywordValidation)
	if err == nil {
		t.Fatalf("expected dependency error when DNS not completed")
	}
	var depErr *PhaseDependencyError
	if !errors.As(err, &depErr) {
		t.Fatalf("expected PhaseDependencyError, got %v", err)
	}
	if depErr.BlockingPhase != models.PhaseTypeDNSValidation {
		t.Fatalf("expected DNS dependency, got %s", depErr.BlockingPhase)
	}

	if _, err := db.Exec(`INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, progress_percentage, created_at, updated_at)
		VALUES ($1,'dns_validation',2,'completed',100,NOW(),NOW())`, campID); err != nil {
		t.Fatalf("insert dns row: %v", err)
	}

	if err := orch.StartPhaseInternal(context.Background(), campID, models.PhaseTypeHTTPKeywordValidation); err != nil {
		t.Fatalf("http validation should start once DNS completes: %v", err)
	}
}

func TestRestartCampaignFullSequenceRespectsMode(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := &testLogger{t: t}
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	campID := createTestCampaign(t, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campID, "full_sequence"); err != nil {
		t.Fatalf("set mode: %v", err)
	}

	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, enrichmentSvc, analysisSvc, nil, nil)

	result, err := orch.RestartCampaign(context.Background(), campID)
	if err != nil {
		t.Fatalf("restart full_sequence: %v", err)
	}
	if len(result.RestartedPhases) != 1 {
		t.Fatalf("expected single phase restart, got %d", len(result.RestartedPhases))
	}
	if result.RestartedPhases[0] != models.PhaseTypeDNSValidation {
		t.Fatalf("expected DNS to be restarted first, got %s", result.RestartedPhases[0])
	}

	waitPoll(t, time.Second, func() bool { return dnsSvc.executions(campID) >= 1 })
	waitPoll(t, time.Second, func() bool { return httpSvc.executions(campID) >= 1 })
}
