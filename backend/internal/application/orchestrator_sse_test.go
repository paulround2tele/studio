package application

import (
	"context"
	"sync"
	"testing"
	"time"

	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	pg_store "github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/fntelecomllc/studio/backend/internal/testutil"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// captureSSE implements SSEBroadcaster capturing events for assertions.
type captureSSE struct {
	mu     sync.Mutex
	events []services.SSEEvent
}

func (c *captureSSE) BroadcastToCampaign(_ uuid.UUID, evt services.SSEEvent) {
	c.mu.Lock()
	c.events = append(c.events, evt)
	c.mu.Unlock()
}

func (c *captureSSE) snapshot() []services.SSEEvent {
	c.mu.Lock()
	defer c.mu.Unlock()
	cp := make([]services.SSEEvent, len(c.events))
	copy(cp, c.events)
	return cp
}

// local stubPhaseService (duplicated minimal subset for isolation) ---------------------------------
type sseStubPhaseService struct {
	phaseType models.PhaseTypeEnum
	failFirst map[uuid.UUID]bool
	statuses  map[uuid.UUID]*domainservices.PhaseStatus
}

func newSSEStub(pt models.PhaseTypeEnum) *sseStubPhaseService {
	return &sseStubPhaseService{phaseType: pt, failFirst: map[uuid.UUID]bool{}, statuses: map[uuid.UUID]*domainservices.PhaseStatus{}}
}

func (s *sseStubPhaseService) Configure(ctx context.Context, campaignID uuid.UUID, cfg interface{}) error {
	return nil
}
func (s *sseStubPhaseService) GetPhaseType() models.PhaseTypeEnum { return s.phaseType }
func (s *sseStubPhaseService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*domainservices.PhaseStatus, error) {
	if st, ok := s.statuses[campaignID]; ok {
		return st, nil
	}
	return &domainservices.PhaseStatus{CampaignID: campaignID, Phase: s.phaseType, Status: models.PhaseStatusNotStarted}, nil
}
func (s *sseStubPhaseService) Cancel(ctx context.Context, campaignID uuid.UUID) error { return nil }
func (s *sseStubPhaseService) Validate(ctx context.Context, cfg interface{}) error    { return nil }
func (s *sseStubPhaseService) setFailOnce(id uuid.UUID)                               { s.failFirst[id] = true }
func (s *sseStubPhaseService) clearFail(id uuid.UUID)                                 { delete(s.failFirst, id) }
func (s *sseStubPhaseService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan domainservices.PhaseProgress, error) {
	if s.failFirst[campaignID] {
		return nil, context.DeadlineExceeded // generic error
	}
	ch := make(chan domainservices.PhaseProgress, 2)
	started := time.Now()
	st := &domainservices.PhaseStatus{CampaignID: campaignID, Phase: s.phaseType, Status: models.PhaseStatusInProgress, StartedAt: &started}
	s.statuses[campaignID] = st
	go func() {
		defer close(ch)
		ch <- domainservices.PhaseProgress{CampaignID: campaignID, Phase: s.phaseType, Status: models.PhaseStatusInProgress, ProgressPct: 10, Timestamp: time.Now()}
		time.Sleep(5 * time.Millisecond)
		st.Status = models.PhaseStatusCompleted
		st.ProgressPct = 100
		completed := time.Now()
		st.CompletedAt = &completed
	}()
	return ch, nil
}

// helper to create campaign with user id for SSE emission
func createCampaignWithUser(t *testing.T, db *sqlx.DB, cs store.CampaignStore) uuid.UUID {
	t.Helper()
	id := uuid.New()
	user := uuid.New()
	now := time.Now()
	// Insert user row to satisfy FK constraint
	_, err := db.Exec(`INSERT INTO users (id, email, password_hash, first_name, last_name) VALUES ($1,$2,$3,$4,$5)`, user, user.String()+"@test.local", "hash", "Test", "User")
	if err != nil { t.Fatalf("insert user: %v", err) }
	c := &models.LeadGenerationCampaign{ID: id, UserID: &user, Name: "sse-camp-" + id.String()[:8], CreatedAt: now, UpdatedAt: now, CampaignType: "lead_generation", TotalPhases: 4}
	if err := cs.CreateCampaign(context.Background(), nil, c); err != nil {
		t.Fatalf("create campaign: %v", err)
	}
	return id
}

// wait helper (duplicate to avoid import cycles)
func waitFor(t *testing.T, timeout time.Duration, cond func() bool) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("condition not met within %s", timeout)
}

func countEvents(evts []services.SSEEvent, typ services.SSEEventType) int {
	n := 0
	for _, e := range evts {
		if e.Event == typ {
			n++
		}
	}
	return n
}

func TestSSEEventEmissionFullSequence(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	cap := &captureSSE{}
	// stub services
	dom := newSSEStub(models.PhaseTypeDomainGeneration)
	dns := newSSEStub(models.PhaseTypeDNSValidation)
	http := newSSEStub(models.PhaseTypeHTTPKeywordValidation)
	analysis := newSSEStub(models.PhaseTypeAnalysis)
	orch := NewCampaignOrchestrator(cs, domainservices.Dependencies{DB: db, Logger: &testLogger{t}}, dom, dns, http, analysis, cap, nil)

	campID := createCampaignWithUser(t, db, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campID, "full_sequence"); err != nil {
		t.Fatalf("mode: %v", err)
	}
	// provide configs (gating)
	for _, ph := range []models.PhaseTypeEnum{models.PhaseTypeDomainGeneration, models.PhaseTypeDNSValidation, models.PhaseTypeHTTPKeywordValidation, models.PhaseTypeAnalysis} {
		if err := cs.UpsertPhaseConfig(context.Background(), nil, campID, ph, []byte(`{"ok":true}`)); err != nil {
			t.Fatalf("config %s: %v", ph, err)
		}
	}
	if err := orch.StartPhaseInternal(context.Background(), campID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start: %v", err)
	}

	// wait for completion campaign_completed event (last one broadcast)
	waitFor(t, 2*time.Second, func() bool {
		evts := cap.snapshot()
		return countEvents(evts, services.SSEEventCampaignCompleted) == 1
	})

	evts := cap.snapshot()
	if countEvents(evts, services.SSEEventPhaseStarted) != 4 {
		t.Fatalf("expected 4 phase_started got %d", countEvents(evts, services.SSEEventPhaseStarted))
	}
	if countEvents(evts, services.SSEEventPhaseCompleted) != 4 {
		t.Fatalf("expected 4 phase_completed got %d", countEvents(evts, services.SSEEventPhaseCompleted))
	}
	if countEvents(evts, services.SSEEventPhaseAutoStarted) != 3 {
		t.Fatalf("expected 3 phase_auto_started got %d", countEvents(evts, services.SSEEventPhaseAutoStarted))
	}
	if countEvents(evts, services.SSEEventCampaignProgress) != 4 {
		t.Fatalf("expected 4 campaign_progress got %d", countEvents(evts, services.SSEEventCampaignProgress))
	}
	if countEvents(evts, services.SSEEventCampaignCompleted) != 1 {
		t.Fatalf("expected 1 campaign_completed got %d", countEvents(evts, services.SSEEventCampaignCompleted))
	}
	if countEvents(evts, services.SSEEventPhaseFailed) != 0 {
		t.Fatalf("expected 0 phase_failed got %d", countEvents(evts, services.SSEEventPhaseFailed))
	}
}

func TestSSEEventEmissionFailureThenRetry(t *testing.T) {
	db, _, _, _, _, _, _, _ := testutil.SetupTestStores(t)
	cs := pg_store.NewCampaignStorePostgres(db)
	cap := &captureSSE{}
	dom := newSSEStub(models.PhaseTypeDomainGeneration)
	dns := newSSEStub(models.PhaseTypeDNSValidation)
	http := newSSEStub(models.PhaseTypeHTTPKeywordValidation)
	analysis := newSSEStub(models.PhaseTypeAnalysis)
	orch := NewCampaignOrchestrator(cs, domainservices.Dependencies{DB: db, Logger: &testLogger{t}}, dom, dns, http, analysis, cap, nil)

	campID := createCampaignWithUser(t, db, cs)
	if err := cs.UpdateCampaignMode(context.Background(), nil, campID, "full_sequence"); err != nil {
		t.Fatalf("mode: %v", err)
	}
	for _, ph := range []models.PhaseTypeEnum{models.PhaseTypeDomainGeneration, models.PhaseTypeDNSValidation, models.PhaseTypeHTTPKeywordValidation, models.PhaseTypeAnalysis} {
		if err := cs.UpsertPhaseConfig(context.Background(), nil, campID, ph, []byte(`{"ok":true}`)); err != nil {
			t.Fatalf("config %s: %v", ph, err)
		}
	}
	dns.setFailOnce(campID)
	if err := orch.StartPhaseInternal(context.Background(), campID, models.PhaseTypeDomainGeneration); err != nil {
		t.Fatalf("start: %v", err)
	}

	// wait until first dns failure emitted (phase_failed) after auto start attempt
	waitFor(t, 2*time.Second, func() bool { return countEvents(cap.snapshot(), services.SSEEventPhaseFailed) == 1 })

	// manual retry
	dns.clearFail(campID)
	if err := orch.StartPhaseInternal(context.Background(), campID, models.PhaseTypeDNSValidation); err != nil {
		t.Fatalf("retry dns: %v", err)
	}

	waitFor(t, 2*time.Second, func() bool { return countEvents(cap.snapshot(), services.SSEEventCampaignCompleted) == 1 })

	evts := cap.snapshot()
	if countEvents(evts, services.SSEEventPhaseFailed) != 1 {
		t.Fatalf("expected 1 phase_failed got %d", countEvents(evts, services.SSEEventPhaseFailed))
	}
	if countEvents(evts, services.SSEEventPhaseStarted) != 4 {
		t.Fatalf("expected 4 phase_started got %d", countEvents(evts, services.SSEEventPhaseStarted))
	}
	if countEvents(evts, services.SSEEventPhaseCompleted) != 4 {
		t.Fatalf("expected 4 phase_completed got %d", countEvents(evts, services.SSEEventPhaseCompleted))
	}
	if countEvents(evts, services.SSEEventPhaseAutoStarted) != 3 {
		t.Fatalf("expected 3 phase_auto_started got %d", countEvents(evts, services.SSEEventPhaseAutoStarted))
	}
	if countEvents(evts, services.SSEEventCampaignProgress) != 4 {
		t.Fatalf("expected 4 campaign_progress got %d", countEvents(evts, services.SSEEventCampaignProgress))
	}
	if countEvents(evts, services.SSEEventCampaignCompleted) != 1 {
		t.Fatalf("expected 1 campaign_completed got %d", countEvents(evts, services.SSEEventCampaignCompleted))
	}
}
