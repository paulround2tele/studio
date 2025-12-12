package main

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	application "github.com/fntelecomllc/studio/backend/internal/application"
	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

func TestCampaignsProgress_DependencyGuard(t *testing.T) {
	h := &strictHandlers{deps: &AppDeps{}}
	ctx := context.Background()
	id := openapi_types.UUID(uuid.New())
	resp, err := h.CampaignsProgress(ctx, gen.CampaignsProgressRequestObject{CampaignId: id})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(gen.CampaignsProgress401JSONResponse); !ok {
		t.Fatalf("expected 401 response when deps missing, got %T", resp)
	}
}

func TestCampaignsPhaseStop_DependencyGuard(t *testing.T) {
	h := &strictHandlers{deps: &AppDeps{}}
	ctx := context.Background()
	id := openapi_types.UUID(uuid.New())
	resp, err := h.CampaignsPhaseStop(ctx, gen.CampaignsPhaseStopRequestObject{CampaignId: id, Phase: gen.CampaignPhaseEnumDiscovery})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(gen.CampaignsPhaseStop401JSONResponse); !ok {
		t.Fatalf("expected 401 response when deps missing, got %T", resp)
	}
}

func TestCampaignsPhaseStop_Returns400WhenPhaseNotRunning(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer func() {
		if cerr := mock.ExpectationsWereMet(); cerr != nil {
			t.Fatalf("sql expectations: %v", cerr)
		}
	}()
	defer db.Close()
	sqlxDB := sqlx.NewDb(db, "sqlmock")
	defer sqlxDB.Close()

	store := newFakeCampaignStoreForDomains()
	campaignID := uuid.New()
	deps := domainservices.Dependencies{Logger: &noopDomainLogger{}}
	httpSvc := &stubHTTPService{cancelErr: fmt.Errorf("%w: not running", domainservices.ErrPhaseNotRunning)}
	orchestrator := application.NewCampaignOrchestrator(store, deps, nil, nil, httpSvc, nil, nil, nil, nil, nil)

	appDeps := &AppDeps{DB: sqlxDB, Orchestrator: orchestrator}
	appDeps.Stores.Campaign = store
	h := &strictHandlers{deps: appDeps}

	ctx := context.Background()
	req := gen.CampaignsPhaseStopRequestObject{CampaignId: openapi_types.UUID(campaignID), Phase: gen.CampaignPhaseEnumExtraction}
	resp, err := h.CampaignsPhaseStop(ctx, req)
	if err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	bad, ok := resp.(gen.CampaignsPhaseStop400JSONResponse)
	if !ok {
		t.Fatalf("expected 400 response, got %T", resp)
	}
	if bad.BadRequestJSONResponse.Error.Message == "" {
		t.Fatalf("expected error message to be populated")
	}
}

func TestCampaignsPhaseExecutionsList_ReturnsErrorDetails(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer func() {
		if cerr := mock.ExpectationsWereMet(); cerr != nil {
			t.Fatalf("sql expectations: %v", cerr)
		}
	}()
	defer db.Close()
	sqlxDB := sqlx.NewDb(db, "sqlmock")
	defer sqlxDB.Close()

	store := newFakeCampaignStoreForDomains()
	campaignID := uuid.New()
	now := time.Now().UTC()
	store.state = &models.CampaignState{
		CampaignID:   campaignID,
		CurrentState: models.CampaignStateFailed,
		Mode:         models.CampaignModeStepByStep,
		Version:      1,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	errorDetails := map[string]interface{}{
		"code":    "DNS_TIMEOUT",
		"message": "DNS resolver timeout",
		"context": map[string]interface{}{"resolver": "8.8.8.8"},
	}
	raw, err := json.Marshal(errorDetails)
	if err != nil {
		t.Fatalf("failed to marshal error details: %v", err)
	}
	rawMsg := json.RawMessage(raw)
	phaseExecution := &models.PhaseExecution{
		ID:           uuid.New(),
		CampaignID:   campaignID,
		PhaseType:    models.PhaseTypeDNSValidation,
		Status:       models.ExecutionStatusFailed,
		FailedAt:     &now,
		ErrorDetails: &rawMsg,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	store.phaseExecutions = []*models.PhaseExecution{phaseExecution}

	deps := &AppDeps{}
	deps.DB = sqlxDB
	deps.Stores.Campaign = store
	h := &strictHandlers{deps: deps}

	ctx := context.Background()
	req := gen.CampaignsPhaseExecutionsListRequestObject{CampaignId: openapi_types.UUID(campaignID)}
	resp, err := h.CampaignsPhaseExecutionsList(ctx, req)
	if err != nil {
		t.Fatalf("handler returned error: %v", err)
	}
	success, ok := resp.(gen.CampaignsPhaseExecutionsList200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	if len(success.PhaseExecutions) != 1 {
		t.Fatalf("expected 1 phase execution, got %d", len(success.PhaseExecutions))
	}

	pe := success.PhaseExecutions[0]
	if pe.ErrorDetails == nil {
		t.Fatalf("expected error details to be present")
	}
	codeValue, ok := (*pe.ErrorDetails)["code"]
	if !ok || codeValue == nil {
		t.Fatalf("expected errorDetails.code to be present")
	}
	codePrimitive, err := codeValue.AsFlexiblePrimitive()
	if err != nil {
		t.Fatalf("unable to decode code: %v", err)
	}
	code, err := codePrimitive.AsFlexiblePrimitive0()
	if err != nil {
		t.Fatalf("unable to read code primitive: %v", err)
	}
	if code != "DNS_TIMEOUT" {
		t.Fatalf("expected code DNS_TIMEOUT, got %s", code)
	}
	messageValue, ok := (*pe.ErrorDetails)["message"]
	if !ok || messageValue == nil {
		t.Fatalf("expected errorDetails.message to be present")
	}
	messagePrimitive, err := messageValue.AsFlexiblePrimitive()
	if err != nil {
		t.Fatalf("unable to decode message: %v", err)
	}
	message, err := messagePrimitive.AsFlexiblePrimitive0()
	if err != nil {
		t.Fatalf("unable to read message primitive: %v", err)
	}
	if message != "DNS resolver timeout" {
		t.Fatalf("unexpected message: %s", message)
	}

	if success.CampaignState.CampaignId != openapi_types.UUID(campaignID) {
		t.Fatalf("expected campaign state ID %s, got %s", campaignID, success.CampaignState.CampaignId)
	}
}

type noopDomainLogger struct{}

func (noopDomainLogger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {}
func (noopDomainLogger) Info(ctx context.Context, msg string, fields map[string]interface{})  {}
func (noopDomainLogger) Warn(ctx context.Context, msg string, fields map[string]interface{})  {}
func (noopDomainLogger) Error(ctx context.Context, msg string, err error, fields map[string]interface{}) {
}

type stubHTTPService struct {
	cancelErr error
}

func (s *stubHTTPService) Configure(ctx context.Context, campaignID uuid.UUID, config interface{}) error {
	return nil
}

func (s *stubHTTPService) Execute(ctx context.Context, campaignID uuid.UUID) (<-chan domainservices.PhaseProgress, error) {
	return nil, nil
}

func (s *stubHTTPService) GetStatus(ctx context.Context, campaignID uuid.UUID) (*domainservices.PhaseStatus, error) {
	return nil, nil
}

func (s *stubHTTPService) Cancel(ctx context.Context, campaignID uuid.UUID) error {
	return s.cancelErr
}

func (s *stubHTTPService) Validate(ctx context.Context, config interface{}) error {
	return nil
}

func (s *stubHTTPService) GetPhaseType() models.PhaseTypeEnum {
	return models.PhaseTypeHTTPKeywordValidation
}
