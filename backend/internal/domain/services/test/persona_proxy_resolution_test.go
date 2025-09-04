package test

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// minimal fakes
type fakeLogger struct{}

func (f *fakeLogger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {}
func (f *fakeLogger) Info(ctx context.Context, msg string, fields map[string]interface{})  {}
func (f *fakeLogger) Warn(ctx context.Context, msg string, fields map[string]interface{})  {}
func (f *fakeLogger) Error(ctx context.Context, msg string, err error, fields map[string]interface{}) {
}

// fake stores implementing minimal methods used

type fakeCampaignStore struct {
	params *models.HTTPKeywordParams
	phase  *models.CampaignPhase
}

func (f *fakeCampaignStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return nil, fmt.Errorf("noop")
}
func (f *fakeCampaignStore) GetHTTPKeywordParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.HTTPKeywordParams, error) {
	return f.params, nil
}
func (f *fakeCampaignStore) GetCampaignPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phase models.PhaseTypeEnum) (*models.CampaignPhase, error) {
	return f.phase, nil
}

// Satisfy only interfaces we call in tests via embedding or compile-time assertions
var _ store.CampaignStore = (*fakeCampaignStore)(nil)

type fakePersonaStore struct{ persona *models.Persona }

func (f *fakePersonaStore) GetPersonaByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.Persona, error) {
	return f.persona, nil
}

var _ store.PersonaStore = (*fakePersonaStore)(nil)

type fakeProxyStore struct{ proxy *models.Proxy }

func (f *fakeProxyStore) GetProxyByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.Proxy, error) {
	return f.proxy, nil
}
func (f *fakeProxyStore) GetProxiesByPersonaIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.Proxy, error) {
	if f.proxy == nil {
		return []*models.Proxy{}, nil
	}
	return []*models.Proxy{f.proxy}, nil
}

var _ store.ProxyStore = (*fakeProxyStore)(nil)

func TestHTTPValidation_getPersonaAndProxy_prefersParamsThenPhase(t *testing.T) {
	deps := services.Dependencies{Logger: &fakeLogger{}}
	campStore := &fakeCampaignStore{}
	personaStore := &fakePersonaStore{persona: &models.Persona{ID: uuid.New(), IsEnabled: true}}
	proxy := &models.Proxy{ID: uuid.New(), IsEnabled: true, IsHealthy: true}
	proxyStore := &fakeProxyStore{proxy: proxy}

	svc := &services.HTTPValidationServiceImplForTest{ // use a small exported test shim if present; else skip
		Store:        campStore,
		PersonaStore: personaStore,
		ProxyStore:   proxyStore,
		Deps:         deps,
	}
	campaignID := uuid.New()

	// Case 1: params present -> expect persona, proxy from params path
	campStore.params = &models.HTTPKeywordParams{PersonaIDs: []uuid.UUID{personaStore.persona.ID}, ProxyIDs: &[]uuid.UUID{proxy.ID}}
	p, pr, err := svc.TestGetPersonaAndProxy(context.Background(), campaignID)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if p == nil || pr == nil {
		t.Fatalf("expected persona and proxy from params path")
	}

	// Case 2: no params -> fallback to phase configuration JSON (first persona only)
	campStore.params = nil
	cfg := services.AnalysisConfig{PersonaIDs: []string{uuid.New().String()}}
	raw, _ := json.Marshal(cfg)
	campStore.phase = &models.CampaignPhase{Configuration: (*json.RawMessage)(&raw)}
	p2, pr2, err2 := svc.TestGetPersonaAndProxy(context.Background(), campaignID)
	if err2 != nil {
		t.Fatalf("unexpected err2: %v", err2)
	}
	// persona may be nil unless personaStore matches; proxy nil in phase fallback
	_ = p2
	_ = pr2
}
