package application

import (
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

func TestRestoreInFlightPhases_PausedPhaseRemainsDormant(t *testing.T) {
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
		t.Fatalf("start phase: %v", err)
	}
	waitUntil(t, 2*time.Second, func() bool { return domainSvc.executions(campaignID) == 1 })

	if err := orch.PausePhase(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("pause phase: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc.isPaused(campaignID) })

	// Simulate restart with a new orchestrator + stub service
	domainSvc2 := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	dnsSvc2 := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc2 := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc2 := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc2 := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc2 := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	orch2 := NewCampaignOrchestrator(cs, deps, domainSvc2, dnsSvc2, httpSvc2, extractionSvc2, enrichmentSvc2, analysisSvc2, nil, nil)
	orch2.SetAutoResumeOnRestart(true)
	registerPhaseCleanup(t, orch2, domainSvc2, campaignID, models.PhaseTypeDomainGeneration)

	if err := orch2.RestoreInFlightPhases(context.Background()); err != nil {
		t.Fatalf("restore: %v", err)
	}
	time.Sleep(50 * time.Millisecond)
	if got := domainSvc2.executions(campaignID); got != 0 {
		t.Fatalf("expected paused phase to stay dormant after restore, got %d executions", got)
	}
	if got := domainSvc2.progressEventCount(campaignID); got != 0 {
		t.Fatalf("expected no progress to emit after restore, got %d events", got)
	}
	campaign, err := cs.GetCampaignByID(context.Background(), db, campaignID)
	if err != nil {
		t.Fatalf("get campaign: %v", err)
	}
	if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusPaused {
		t.Fatalf("expected campaign to remain paused, got %v", campaign.PhaseStatus)
	}
}

func TestRestoreInFlightPhases_DefaultSkipsAutoResume(t *testing.T) {
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
		t.Fatalf("start phase: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc.executions(campaignID) == 1 })

	domainSvc2 := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	dnsSvc2 := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc2 := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc2 := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc2 := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc2 := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	orch2 := NewCampaignOrchestrator(cs, deps, domainSvc2, dnsSvc2, httpSvc2, extractionSvc2, enrichmentSvc2, analysisSvc2, nil, nil)
	registerPhaseCleanup(t, orch2, domainSvc2, campaignID, models.PhaseTypeDomainGeneration)

	if err := orch2.RestoreInFlightPhases(context.Background()); err != nil {
		t.Fatalf("restore: %v", err)
	}
	if got := domainSvc2.executions(campaignID); got != 0 {
		t.Fatalf("expected no auto-resume executions, got %d", got)
	}
	time.Sleep(50 * time.Millisecond)
	if got := domainSvc2.progressEventCount(campaignID); got != 0 {
		t.Fatalf("expected no progress during rehydrate when auto-resume disabled, got %d events", got)
	}
	campaign, err := cs.GetCampaignByID(context.Background(), db, campaignID)
	if err != nil {
		t.Fatalf("get campaign: %v", err)
	}
	if campaign.PhaseStatus == nil || *campaign.PhaseStatus != models.PhaseStatusPaused {
		t.Fatalf("expected campaign status paused after restore, got %v", campaign.PhaseStatus)
	}
}

func TestRestoreInFlightPhases_CancelsLegacyExecutions(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, newStubPhaseService(models.PhaseTypeDNSValidation, logger), newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger), newStubPhaseService(models.PhaseTypeExtraction, logger), newStubPhaseService(models.PhaseTypeEnrichment, logger), newStubPhaseService(models.PhaseTypeAnalysis, logger), nil, nil)

	campaignID := createTestCampaign(t, cs)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	registerPhaseCleanup(t, orch, domainSvc, campaignID, models.PhaseTypeDomainGeneration)

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start phase: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc.executions(campaignID) == 1 })
	waitUntil(t, time.Second, func() bool { return domainSvc.progressEventCount(campaignID) > 5 })

	domainSvc2 := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	orch2 := NewCampaignOrchestrator(cs, deps, domainSvc2, newStubPhaseService(models.PhaseTypeDNSValidation, logger), newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger), newStubPhaseService(models.PhaseTypeExtraction, logger), newStubPhaseService(models.PhaseTypeEnrichment, logger), newStubPhaseService(models.PhaseTypeAnalysis, logger), nil, nil)
	registerPhaseCleanup(t, orch2, domainSvc2, campaignID, models.PhaseTypeDomainGeneration)

	if err := orch2.RestoreInFlightPhases(context.Background()); err != nil {
		t.Fatalf("restore: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc.isTerminated(campaignID) })
	baseline := domainSvc.progressEventCount(campaignID)
	time.Sleep(50 * time.Millisecond)
	if domainSvc.progressEventCount(campaignID) != baseline {
		t.Fatalf("expected legacy execution to stop emitting progress after cancellation")
	}
}

func TestRestoreInFlightPhases_StopAfterRestore(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, newStubPhaseService(models.PhaseTypeDNSValidation, logger), newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger), newStubPhaseService(models.PhaseTypeExtraction, logger), newStubPhaseService(models.PhaseTypeEnrichment, logger), newStubPhaseService(models.PhaseTypeAnalysis, logger), nil, nil)

	campaignID := createTestCampaign(t, cs)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	registerPhaseCleanup(t, orch, domainSvc, campaignID, models.PhaseTypeDomainGeneration)

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start phase: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc.executions(campaignID) == 1 })

	// Restart
	domainSvc2 := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	orch2 := NewCampaignOrchestrator(cs, deps, domainSvc2, newStubPhaseService(models.PhaseTypeDNSValidation, logger), newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger), newStubPhaseService(models.PhaseTypeExtraction, logger), newStubPhaseService(models.PhaseTypeEnrichment, logger), newStubPhaseService(models.PhaseTypeAnalysis, logger), nil, nil)
	orch2.SetAutoResumeOnRestart(true)
	registerPhaseCleanup(t, orch2, domainSvc2, campaignID, models.PhaseTypeDomainGeneration)
	if err := orch2.RestoreInFlightPhases(context.Background()); err != nil {
		t.Fatalf("restore: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc2.executions(campaignID) == 1 })

	if err := orch2.CancelPhase(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("cancel after restore: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc2.isTerminated(campaignID) })
}

func TestRestoreInFlightPhases_Idempotent(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, newStubPhaseService(models.PhaseTypeDNSValidation, logger), newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger), newStubPhaseService(models.PhaseTypeExtraction, logger), newStubPhaseService(models.PhaseTypeEnrichment, logger), newStubPhaseService(models.PhaseTypeAnalysis, logger), nil, nil)

	campaignID := createTestCampaign(t, cs)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	registerPhaseCleanup(t, orch, domainSvc, campaignID, models.PhaseTypeDomainGeneration)

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start phase: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc.executions(campaignID) == 1 })

	// Restart orchestrator for restore tests
	domainSvc2 := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	orch2 := NewCampaignOrchestrator(cs, deps, domainSvc2, newStubPhaseService(models.PhaseTypeDNSValidation, logger), newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger), newStubPhaseService(models.PhaseTypeExtraction, logger), newStubPhaseService(models.PhaseTypeEnrichment, logger), newStubPhaseService(models.PhaseTypeAnalysis, logger), nil, nil)
	orch2.SetAutoResumeOnRestart(true)
	registerPhaseCleanup(t, orch2, domainSvc2, campaignID, models.PhaseTypeDomainGeneration)

	if err := orch2.RestoreInFlightPhases(context.Background()); err != nil {
		t.Fatalf("first restore: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc2.executions(campaignID) == 1 })
	if err := orch2.RestoreInFlightPhases(context.Background()); err != nil {
		t.Fatalf("second restore: %v", err)
	}
	if got := domainSvc2.executions(campaignID); got != 1 {
		t.Fatalf("expected idempotent restore to keep single execution, got %d", got)
	}
}

func TestBroadcastControlSignal_RetryOnMissingChannel(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, newStubPhaseService(models.PhaseTypeDNSValidation, logger), newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger), newStubPhaseService(models.PhaseTypeExtraction, logger), newStubPhaseService(models.PhaseTypeEnrichment, logger), newStubPhaseService(models.PhaseTypeAnalysis, logger), nil, nil)

	campaignID := createTestCampaign(t, cs)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	registerPhaseCleanup(t, orch, domainSvc, campaignID, models.PhaseTypeDomainGeneration)

	flaky := newFlakyControlManager()
	orch.SetControlManager(flaky)
	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start phase: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc.executions(campaignID) == 1 })

	flaky.DropNext(campaignID, models.PhaseTypeDomainGeneration)

	if err := orch.PausePhase(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("pause with retry: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc.isPaused(campaignID) })

	key := controlMapKey(campaignID, models.PhaseTypeDomainGeneration)
	if flaky.failureCount(key) != 1 {
		t.Fatalf("expected exactly one broadcast failure, got %d", flaky.failureCount(key))
	}
	if domainSvc.pauseEventCount(campaignID) != 1 {
		t.Fatalf("expected a single pause event")
	}
}

func TestRestoreInFlightPhases_SkipsWhenConfigMissing(t *testing.T) {
	phases := []models.PhaseTypeEnum{
		models.PhaseTypeDomainGeneration,
		models.PhaseTypeDNSValidation,
		models.PhaseTypeHTTPKeywordValidation,
	}

	for _, phase := range phases {
		phase := phase
		t.Run(string(phase), func(t *testing.T) {
			db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
			cs := pg_store.NewCampaignStorePostgres(db)
			logger := newTestLogger(t)
			deps := domainservices.Dependencies{Logger: logger, DB: db}

			bundle := buildPhaseServiceBundle(phase, logger, cs, db)
			orch := NewCampaignOrchestrator(cs, deps, bundle.domain, bundle.dns, bundle.http, bundle.extraction, bundle.enrichment, bundle.analysis, nil, nil)

			campaignID := createTestCampaign(t, cs)
			upsertConfig(t, cs, campaignID, phase)
			if phase == models.PhaseTypeHTTPKeywordValidation {
				upsertConfig(t, cs, campaignID, models.PhaseTypeDNSValidation)
			}
			registerPhaseCleanup(t, orch, bundle.target, campaignID, phase)

			ctx := context.Background()

			if phase == models.PhaseTypeHTTPKeywordValidation {
				if err := orch.StartPhaseInternal(ctx, campaignID, models.PhaseTypeDNSValidation); err != nil {
					t.Fatalf("start dns prerequisite: %v", err)
				}
				waitForPhaseStatus(t, cs, db, campaignID, models.PhaseTypeDNSValidation, models.PhaseStatusCompleted)
			}

			if err := orch.StartPhaseInternal(ctx, campaignID, phase); err != nil {
				t.Fatalf("start %s: %v", phase, err)
			}
			waitUntil(t, time.Second, func() bool { return bundle.target.executions(campaignID) == 1 })

			if err := orch.PausePhase(ctx, campaignID, phase); err != nil {
				t.Fatalf("pause %s: %v", phase, err)
			}
			waitUntil(t, time.Second, func() bool { return bundle.target.isPaused(campaignID) })

			wipeStoredPhaseConfig(t, db, campaignID, phase)

			bundle2 := buildPhaseServiceBundle(phase, logger, cs, db)
			orch2 := NewCampaignOrchestrator(cs, deps, bundle2.domain, bundle2.dns, bundle2.http, bundle2.extraction, bundle2.enrichment, bundle2.analysis, nil, nil)
			orch2.SetAutoResumeOnRestart(true)
			registerPhaseCleanup(t, orch2, bundle2.target, campaignID, phase)

			if err := orch2.RestoreInFlightPhases(ctx); err != nil {
				t.Fatalf("restore %s: %v", phase, err)
			}
			if got := bundle2.target.executions(campaignID); got != 0 {
				t.Fatalf("expected no restart when configuration missing for %s, got %d", phase, got)
			}
		})
	}
}

func TestRestoreInFlightPhases_AutoResumeRecordsMetrics(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	domainSvc := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, newStubPhaseService(models.PhaseTypeDNSValidation, logger), newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger), newStubPhaseService(models.PhaseTypeExtraction, logger), newStubPhaseService(models.PhaseTypeEnrichment, logger), newStubPhaseService(models.PhaseTypeAnalysis, logger), nil, nil)

	campaignID := createTestCampaign(t, cs)
	upsertConfig(t, cs, campaignID, models.PhaseTypeDomainGeneration)
	registerPhaseCleanup(t, orch, domainSvc, campaignID, models.PhaseTypeDomainGeneration)

	if err := orch.StartPhaseInternal(context.Background(), campaignID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start domain_generation: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc.executions(campaignID) == 1 })

	metrics := &testMetrics{}
	domainSvc2 := newControlAwarePhaseService(models.PhaseTypeDomainGeneration, logger, cs, db)
	orch2 := NewCampaignOrchestrator(cs, deps, domainSvc2, newStubPhaseService(models.PhaseTypeDNSValidation, logger), newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger), newStubPhaseService(models.PhaseTypeExtraction, logger), newStubPhaseService(models.PhaseTypeEnrichment, logger), newStubPhaseService(models.PhaseTypeAnalysis, logger), nil, metrics)
	orch2.SetAutoResumeOnRestart(true)
	registerPhaseCleanup(t, orch2, domainSvc2, campaignID, models.PhaseTypeDomainGeneration)

	if err := orch2.RestoreInFlightPhases(context.Background()); err != nil {
		t.Fatalf("restore: %v", err)
	}
	waitUntil(t, time.Second, func() bool { return domainSvc2.executions(campaignID) == 1 })

	if metrics.phaseResumeAttempts != 1 {
		t.Fatalf("expected 1 resume attempt, got %d", metrics.phaseResumeAttempts)
	}
	if metrics.phaseResumeSuccesses != 1 {
		t.Fatalf("expected 1 resume success, got %d", metrics.phaseResumeSuccesses)
	}
	if metrics.phaseResumeFailures != 0 {
		t.Fatalf("expected 0 resume failures, got %d", metrics.phaseResumeFailures)
	}
}

func TestHydratePhaseConfigurationDomainGeneration(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	logger := newTestLogger(t)
	deps := domainservices.Dependencies{Logger: logger, DB: db}

	campaignID := createTestCampaign(t, cs)
	cfg := domainservices.DomainGenerationConfig{
		PatternType:          string(models.PatternTypePrefixVariable),
		VariableLength:       3,
		PrefixVariableLength: 2,
		SuffixVariableLength: 1,
		CharacterSet:         "abc",
		ConstantString:       "seed",
		TLD:                  "com",
		NumDomains:           25,
		BatchSize:            5,
		OffsetStart:          7,
	}
	payload, err := json.Marshal(cfg)
	if err != nil {
		t.Fatalf("marshal domain config: %v", err)
	}
	if err := cs.UpsertPhaseConfig(context.Background(), nil, campaignID, models.PhaseTypeDomainGeneration, json.RawMessage(payload)); err != nil {
		t.Fatalf("upsert domain generation config: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, progress_percentage, configuration, created_at, updated_at)
		VALUES ($1,'domain_generation',1,'configured',0,$2,NOW(),NOW())
		ON CONFLICT (campaign_id, phase_type) DO UPDATE SET configuration = EXCLUDED.configuration, updated_at = NOW()`, campaignID, json.RawMessage(payload)); err != nil {
		t.Fatalf("seed campaign phase configuration: %v", err)
	}

	domainSvc := newStubPhaseService(models.PhaseTypeDomainGeneration, logger)
	dnsSvc := newStubPhaseService(models.PhaseTypeDNSValidation, logger)
	httpSvc := newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger)
	extractionSvc := newStubPhaseService(models.PhaseTypeExtraction, logger)
	enrichmentSvc := newStubPhaseService(models.PhaseTypeEnrichment, logger)
	analysisSvc := newStubPhaseService(models.PhaseTypeAnalysis, logger)
	orch := NewCampaignOrchestrator(cs, deps, domainSvc, dnsSvc, httpSvc, extractionSvc, enrichmentSvc, analysisSvc, nil, nil)

	if err := orch.hydratePhaseConfiguration(context.Background(), db, campaignID, models.PhaseTypeDomainGeneration, domainSvc); err != nil {
		t.Fatalf("hydrate domain generation config: %v", err)
	}

	stored, ok := domainSvc.configs[campaignID].(domainservices.DomainGenerationConfig)
	if !ok {
		t.Fatalf("expected domain generation config, got %T", domainSvc.configs[campaignID])
	}
	if stored != cfg {
		t.Fatalf("unexpected domain generation config rehydrated: %#v", stored)
	}
}

// --- test doubles ---

type controlAwarePhaseService struct {
	phaseType models.PhaseTypeEnum
	logger    *testLogger
	store     store.CampaignStore
	db        store.Querier

	mu             sync.Mutex
	statuses       map[uuid.UUID]*domainservices.PhaseStatus
	cancels        map[uuid.UUID]context.CancelFunc
	paused         map[uuid.UUID]bool
	terminated     map[uuid.UUID]bool
	executionsMap  map[uuid.UUID]int
	pauseEvents    map[uuid.UUID]int
	attachEvents   map[uuid.UUID]int
	progressEvents map[uuid.UUID]int
}

func newControlAwarePhaseService(phase models.PhaseTypeEnum, logger *testLogger, cs store.CampaignStore, db store.Querier) *controlAwarePhaseService {
	return &controlAwarePhaseService{
		phaseType:      phase,
		logger:         logger,
		store:          cs,
		db:             db,
		statuses:       make(map[uuid.UUID]*domainservices.PhaseStatus),
		cancels:        make(map[uuid.UUID]context.CancelFunc),
		paused:         make(map[uuid.UUID]bool),
		terminated:     make(map[uuid.UUID]bool),
		executionsMap:  make(map[uuid.UUID]int),
		pauseEvents:    make(map[uuid.UUID]int),
		attachEvents:   make(map[uuid.UUID]int),
		progressEvents: make(map[uuid.UUID]int),
	}
}

func (s *controlAwarePhaseService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	return nil
}

func (s *controlAwarePhaseService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan domainservices.PhaseProgress, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.terminated[campaignID] {
		return nil, domainservices.ErrPhaseNotRunning
	}
	progressCh := make(chan domainservices.PhaseProgress, 8)
	runCtx, cancel := context.WithCancel(ctx)
	s.cancels[campaignID] = cancel
	status := &domainservices.PhaseStatus{CampaignID: campaignID, Phase: s.phaseType, Status: models.PhaseStatusInProgress}
	started := time.Now()
	status.StartedAt = &started
	s.statuses[campaignID] = status
	s.executionsMap[campaignID]++

	go s.runExecution(runCtx, campaignID, progressCh)
	return progressCh, nil
}

func (s *controlAwarePhaseService) runExecution(ctx context.Context, campaignID uuid.UUID, progressCh chan domainservices.PhaseProgress) {
	ticker := time.NewTicker(5 * time.Millisecond)
	defer ticker.Stop()
	defer close(progressCh)
	for {
		select {
		case <-ctx.Done():
			s.mu.Lock()
			if status, ok := s.statuses[campaignID]; ok {
				completed := time.Now()
				status.CompletedAt = &completed
				if !s.terminated[campaignID] {
					status.Status = models.PhaseStatusFailed
				}
			}
			s.terminated[campaignID] = true
			s.mu.Unlock()
			return
		case <-ticker.C:
			s.mu.Lock()
			status := s.statuses[campaignID]
			var (
				_ domainservices.DomainGenerationService = (*controlAwarePhaseService)(nil)
				_ domainservices.DNSValidationService    = (*controlAwarePhaseService)(nil)
				_ domainservices.HTTPValidationService   = (*controlAwarePhaseService)(nil)
				_ domainservices.ControlAwarePhase       = (*controlAwarePhaseService)(nil)
			)
			paused := s.paused[campaignID]
			if status == nil || paused {
				s.mu.Unlock()
				continue
			}
			status.ItemsProcessed++
			status.ProgressPct = float64(status.ItemsProcessed)
			progress := domainservices.PhaseProgress{
				CampaignID:     campaignID,
				Phase:          s.phaseType,
				Status:         status.Status,
				ItemsProcessed: status.ItemsProcessed,
				ItemsTotal:     100,
				ProgressPct:    status.ProgressPct,
				Timestamp:      time.Now(),
			}
			s.progressEvents[campaignID]++
			s.mu.Unlock()
			select {
			case progressCh <- progress:
			default:
			}
		}
	}
}

func (s *controlAwarePhaseService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*domainservices.PhaseStatus, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if status, ok := s.statuses[campaignID]; ok {
		return status, nil
	}
	return &domainservices.PhaseStatus{CampaignID: campaignID, Phase: s.phaseType, Status: models.PhaseStatusNotStarted}, nil
}

func (s *controlAwarePhaseService) Cancel(ctx context.Context, campaignID uuid.UUID) error {
	s.mu.Lock()
	cancel := s.cancels[campaignID]
	s.terminated[campaignID] = true
	s.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	return nil
}

func (s *controlAwarePhaseService) Validate(ctx context.Context, config interface{}) error {
	return nil
}

func (s *controlAwarePhaseService) GetPhaseType() models.PhaseTypeEnum { return s.phaseType }

func (s *controlAwarePhaseService) AttachControlChannel(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, commands <-chan domainservices.ControlCommand) {
	if phase != s.phaseType {
		return
	}
	s.mu.Lock()
	s.attachEvents[campaignID]++
	s.mu.Unlock()

	go func() {
		for cmd := range commands {
			switch cmd.Signal {
			case domainservices.ControlSignalPause:
				s.handlePause(campaignID)
				if cmd.Ack != nil {
					cmd.Ack <- nil
				}
			case domainservices.ControlSignalResume:
				s.handleResume(campaignID)
				if cmd.Ack != nil {
					cmd.Ack <- nil
				}
			case domainservices.ControlSignalStop:
				s.handleStop(campaignID)
				if cmd.Ack != nil {
					cmd.Ack <- nil
				}
				return
			}
		}
	}()
}

func (s *controlAwarePhaseService) handlePause(campaignID uuid.UUID) {
	s.mu.Lock()
	status := s.statuses[campaignID]
	if status != nil {
		status.Status = models.PhaseStatusPaused
	}
	s.paused[campaignID] = true
	s.pauseEvents[campaignID]++
	s.mu.Unlock()

	if s.store != nil {
		_ = s.store.PausePhase(context.Background(), s.db, campaignID, s.phaseType)
		phase := s.phaseType
		paused := models.PhaseStatusPaused
		_ = s.store.UpdateCampaignPhaseFields(context.Background(), s.db, campaignID, &phase, &paused)
	}
}

func (s *controlAwarePhaseService) handleResume(campaignID uuid.UUID) {
	s.mu.Lock()
	status := s.statuses[campaignID]
	if status != nil {
		status.Status = models.PhaseStatusInProgress
	}
	s.paused[campaignID] = false
	s.mu.Unlock()

	if s.store != nil {
		_ = s.store.UpdatePhaseStatus(context.Background(), s.db, campaignID, s.phaseType, models.PhaseStatusInProgress)
		phase := s.phaseType
		running := models.PhaseStatusInProgress
		_ = s.store.UpdateCampaignPhaseFields(context.Background(), s.db, campaignID, &phase, &running)
	}
}

func (s *controlAwarePhaseService) handleStop(campaignID uuid.UUID) {
	s.mu.Lock()
	cancel := s.cancels[campaignID]
	s.terminated[campaignID] = true
	if status, ok := s.statuses[campaignID]; ok {
		status.Status = models.PhaseStatusFailed
	}
	s.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	if s.store != nil {
		failed := models.PhaseStatusFailed
		phase := s.phaseType
		// Mirror production behavior so restored campaigns do not linger as active.
		_ = s.store.UpdatePhaseStatus(context.Background(), s.db, campaignID, s.phaseType, failed)
		_ = s.store.UpdateCampaignPhaseFields(context.Background(), s.db, campaignID, &phase, &failed)
	}
}

func (s *controlAwarePhaseService) executions(campaignID uuid.UUID) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.executionsMap[campaignID]
}

func (s *controlAwarePhaseService) isPaused(campaignID uuid.UUID) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.paused[campaignID]
}

func (s *controlAwarePhaseService) isTerminated(campaignID uuid.UUID) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.terminated[campaignID]
}

func (s *controlAwarePhaseService) pauseEventCount(campaignID uuid.UUID) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.pauseEvents[campaignID]
}

func (s *controlAwarePhaseService) attachEventCount(campaignID uuid.UUID) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.attachEvents[campaignID]
}

func (s *controlAwarePhaseService) progressEventCount(campaignID uuid.UUID) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.progressEvents[campaignID]
}

var (
	_ domainservices.DomainGenerationService = (*controlAwarePhaseService)(nil)
	_ domainservices.DNSValidationService    = (*controlAwarePhaseService)(nil)
	_ domainservices.HTTPValidationService   = (*controlAwarePhaseService)(nil)
	_ domainservices.ControlAwarePhase       = (*controlAwarePhaseService)(nil)
)

type phaseServiceBundle struct {
	domain     domainservices.DomainGenerationService
	dns        domainservices.DNSValidationService
	http       domainservices.HTTPValidationService
	extraction domainservices.PhaseService
	enrichment domainservices.EnrichmentService
	analysis   domainservices.AnalysisService
	target     *controlAwarePhaseService
}

func buildPhaseServiceBundle(phase models.PhaseTypeEnum, logger *testLogger, cs store.CampaignStore, db store.Querier) phaseServiceBundle {
	ctrl := newControlAwarePhaseService(phase, logger, cs, db)
	bundle := phaseServiceBundle{
		domain:     newStubPhaseService(models.PhaseTypeDomainGeneration, logger),
		dns:        newStubPhaseService(models.PhaseTypeDNSValidation, logger),
		http:       newStubPhaseService(models.PhaseTypeHTTPKeywordValidation, logger),
		extraction: newStubPhaseService(models.PhaseTypeExtraction, logger),
		enrichment: newStubPhaseService(models.PhaseTypeEnrichment, logger),
		analysis:   newStubPhaseService(models.PhaseTypeAnalysis, logger),
		target:     ctrl,
	}
	switch phase {
	case models.PhaseTypeDomainGeneration:
		bundle.domain = ctrl
	case models.PhaseTypeDNSValidation:
		bundle.dns = ctrl
	case models.PhaseTypeHTTPKeywordValidation:
		bundle.http = ctrl
	}
	return bundle
}

type sqlExec interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
}

func wipeStoredPhaseConfig(t *testing.T, exec sqlExec, campaignID uuid.UUID, phase models.PhaseTypeEnum) {
	t.Helper()
	phaseStr := string(phase)
	if _, err := exec.Exec(`UPDATE campaign_phases SET configuration = NULL WHERE campaign_id = $1 AND phase_type = $2`, campaignID, phaseStr); err != nil {
		t.Fatalf("null campaign phase config %s: %v", phase, err)
	}
	if _, err := exec.Exec(`UPDATE phase_executions SET configuration = NULL WHERE campaign_id = $1 AND phase_type = $2`, campaignID, phaseStr); err != nil {
		t.Fatalf("null execution config %s: %v", phase, err)
	}
	if _, err := exec.Exec(`DELETE FROM phase_configurations WHERE campaign_id = $1 AND phase = $2`, campaignID, phaseStr); err != nil {
		t.Fatalf("delete stored config %s: %v", phase, err)
	}
}

func waitForPhaseStatus(t *testing.T, cs store.CampaignStore, db store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum, status models.PhaseStatusEnum) {
	t.Helper()
	waitUntil(t, time.Second, func() bool {
		row, err := cs.GetCampaignPhase(context.Background(), db, campaignID, phase)
		if err != nil || row == nil {
			return false
		}
		return row.Status == status
	})
}

func registerPhaseCleanup(t *testing.T, orch *CampaignOrchestrator, svc *controlAwarePhaseService, campaignID uuid.UUID, phase models.PhaseTypeEnum) {
	t.Helper()
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if orch != nil {
			if err := orch.CancelPhase(ctx, campaignID, phase); err != nil && !errors.Is(err, domainservices.ErrPhaseNotRunning) {
				t.Fatalf("cleanup cancel %s: %v", phase, err)
			}
		}
		if svc != nil && svc.executions(campaignID) > 0 {
			waitUntil(t, time.Second, func() bool { return svc.isTerminated(campaignID) })
		}
	})
}

// flakyControlManager injects a single ErrControlChannelMissing before succeeding.
type flakyControlManager struct {
	inner    *inMemoryPhaseControlManager
	mu       sync.Mutex
	drops    map[string]int
	failures map[string]int
}

func newFlakyControlManager() *flakyControlManager {
	return &flakyControlManager{
		inner:    newInMemoryPhaseControlManager(),
		drops:    make(map[string]int),
		failures: make(map[string]int),
	}
}

func (f *flakyControlManager) DropNext(campaignID uuid.UUID, phase models.PhaseTypeEnum) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.drops[controlMapKey(campaignID, phase)]++
}

func (f *flakyControlManager) failureCount(key string) int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.failures[key]
}

func (f *flakyControlManager) Subscribe(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum) (<-chan domainservices.ControlCommand, error) {
	return f.inner.Subscribe(ctx, campaignID, phase)
}

func (f *flakyControlManager) Broadcast(ctx context.Context, campaignID uuid.UUID, phase models.PhaseTypeEnum, signal domainservices.ControlSignal, ack chan<- error) error {
	key := controlMapKey(campaignID, phase)
	f.mu.Lock()
	if f.drops[key] > 0 {
		f.drops[key]--
		f.failures[key]++
		f.mu.Unlock()
		return ErrControlChannelMissing
	}
	f.mu.Unlock()
	return f.inner.Broadcast(ctx, campaignID, phase, signal, ack)
}

func (f *flakyControlManager) Close(campaignID uuid.UUID, phase models.PhaseTypeEnum) {
	f.inner.Close(campaignID, phase)
}
