// File: backend/internal/services/state_coordinator_test.go
package services

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Simple mock implementations for testing without external dependencies

type MockCampaignStore struct {
	campaigns map[uuid.UUID]*models.Campaign
	mu        sync.RWMutex
}

func NewMockCampaignStore() *MockCampaignStore {
	return &MockCampaignStore{
		campaigns: make(map[uuid.UUID]*models.Campaign),
	}
}

func (m *MockCampaignStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	// Return nil for testing - transaction operations will be mocked
	return nil, nil
}

func (m *MockCampaignStore) CreateCampaign(ctx context.Context, exec store.Querier, campaign *models.Campaign) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.campaigns[campaign.ID] = campaign
	return nil
}

func (m *MockCampaignStore) GetCampaignByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.Campaign, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if campaign, exists := m.campaigns[id]; exists {
		// Return a copy to avoid race conditions
		campaignCopy := *campaign
		return &campaignCopy, nil
	}
	return nil, fmt.Errorf("campaign not found")
}

func (m *MockCampaignStore) UpdateCampaign(ctx context.Context, exec store.Querier, campaign *models.Campaign) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.campaigns[campaign.ID] = campaign
	return nil
}

func (m *MockCampaignStore) DeleteCampaign(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.campaigns, id)
	return nil
}

func (m *MockCampaignStore) ListCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) ([]*models.Campaign, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var campaigns []*models.Campaign
	for _, campaign := range m.campaigns {
		campaignCopy := *campaign
		campaigns = append(campaigns, &campaignCopy)
	}
	return campaigns, nil
}

func (m *MockCampaignStore) CountCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) (int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return int64(len(m.campaigns)), nil
}

// Stub implementations for other required methods
func (m *MockCampaignStore) UpdateCampaignStatus(ctx context.Context, exec store.Querier, id uuid.UUID, status models.CampaignStatusEnum, errorMessage sql.NullString) error {
	return nil
}

func (m *MockCampaignStore) UpdateCampaignProgress(ctx context.Context, exec store.Querier, id uuid.UUID, processedItems, totalItems int64, progressPercentage float64) error {
	return nil
}

func (m *MockCampaignStore) CreateDomainGenerationParams(ctx context.Context, exec store.Querier, params *models.DomainGenerationCampaignParams) error {
	return nil
}

func (m *MockCampaignStore) GetDomainGenerationParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.DomainGenerationCampaignParams, error) {
	return nil, nil
}

func (m *MockCampaignStore) UpdateDomainGenerationParamsOffset(ctx context.Context, exec store.Querier, campaignID uuid.UUID, newOffset int64) error {
	return nil
}

func (m *MockCampaignStore) GetDomainGenerationConfigStateByHash(ctx context.Context, exec store.Querier, configHash string) (*models.DomainGenerationConfigState, error) {
	return nil, nil
}

func (m *MockCampaignStore) CreateOrUpdateDomainGenerationConfigState(ctx context.Context, exec store.Querier, state *models.DomainGenerationConfigState) error {
	return nil
}

func (m *MockCampaignStore) CreateGeneratedDomains(ctx context.Context, exec store.Querier, domains []*models.GeneratedDomain) error {
	return nil
}

func (m *MockCampaignStore) GetGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit int, lastOffsetIndex int64) ([]*models.GeneratedDomain, error) {
	return nil, nil
}

func (m *MockCampaignStore) CountGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int64, error) {
	return 0, nil
}

func (m *MockCampaignStore) CreateDNSValidationParams(ctx context.Context, exec store.Querier, params *models.DNSValidationCampaignParams) error {
	return nil
}

func (m *MockCampaignStore) GetDNSValidationParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.DNSValidationCampaignParams, error) {
	return nil, nil
}

func (m *MockCampaignStore) CreateDNSValidationResults(ctx context.Context, exec store.Querier, results []*models.DNSValidationResult) error {
	return nil
}

func (m *MockCampaignStore) GetDNSValidationResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.DNSValidationResult, error) {
	return nil, nil
}

func (m *MockCampaignStore) CountDNSValidationResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, onlyValid bool) (int64, error) {
	return 0, nil
}

func (m *MockCampaignStore) GetDomainsForDNSValidation(ctx context.Context, exec store.Querier, dnsCampaignID uuid.UUID, sourceGenerationCampaignID uuid.UUID, limit int, lastOffsetIndex int64) ([]*models.GeneratedDomain, error) {
	return nil, nil
}

func (m *MockCampaignStore) CreateHTTPKeywordParams(ctx context.Context, exec store.Querier, params *models.HTTPKeywordCampaignParams) error {
	return nil
}

func (m *MockCampaignStore) GetHTTPKeywordParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.HTTPKeywordCampaignParams, error) {
	return nil, nil
}

func (m *MockCampaignStore) CreateHTTPKeywordResults(ctx context.Context, exec store.Querier, results []*models.HTTPKeywordResult) error {
	return nil
}

func (m *MockCampaignStore) GetHTTPKeywordResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.HTTPKeywordResult, error) {
	return nil, nil
}

func (m *MockCampaignStore) GetDomainsForHTTPValidation(ctx context.Context, exec store.Querier, httpKeywordCampaignID uuid.UUID, sourceCampaignID uuid.UUID, limit int, lastDomainName string) ([]*models.DNSValidationResult, error) {
	return nil, nil
}

// User-filtered methods for security
func (m *MockCampaignStore) GetCampaignByIDWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, userID uuid.UUID) (*models.Campaign, error) {
	return nil, nil
}

func (m *MockCampaignStore) UpdateCampaignWithUserFilter(ctx context.Context, exec store.Querier, campaign *models.Campaign, userID uuid.UUID) error {
	return nil
}

func (m *MockCampaignStore) DeleteCampaignWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, userID uuid.UUID) error {
	return nil
}

func (m *MockCampaignStore) UpdateCampaignStatusWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, status models.CampaignStatusEnum, errorMessage sql.NullString, userID uuid.UUID) error {
	return nil
}

func (m *MockCampaignStore) UpdateCampaignProgressWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, processedItems, totalItems int64, progressPercentage float64, userID uuid.UUID) error {
	return nil
}

// BL-002: Atomic configuration methods for race condition remediation
func (m *MockCampaignStore) AtomicUpdateDomainGenerationConfigState(ctx context.Context, exec store.Querier, request *models.ConfigUpdateRequest) (*models.AtomicConfigUpdateResult, error) {
	return &models.AtomicConfigUpdateResult{
		Success:    true,
		NewVersion: 1,
	}, nil
}

func (m *MockCampaignStore) GetVersionedDomainGenerationConfigState(ctx context.Context, exec store.Querier, configHash string, lockType models.ConfigLockType) (*models.VersionedDomainGenerationConfigState, error) {
	return &models.VersionedDomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    0,
		ConfigDetails: []byte(`{"test": "data"}`),
		Version:       1,
		UpdatedAt:     time.Now().UTC(),
		CreatedAt:     time.Now().UTC(),
	}, nil
}

func (m *MockCampaignStore) ValidateConfigConsistency(ctx context.Context, exec store.Querier, configHash string) (*models.ConfigValidationResult, error) {
	return &models.ConfigValidationResult{
		IsValid:          true,
		ConfigHash:       configHash,
		CurrentVersion:   1,
		CurrentOffset:    0,
		ValidationChecks: []models.ConfigValidationCheck{},
		ValidatedAt:      time.Now().UTC(),
	}, nil
}

type MockAuditLogStore struct {
	logs []models.AuditLog
	mu   sync.RWMutex
}

func NewMockAuditLogStore() *MockAuditLogStore {
	return &MockAuditLogStore{
		logs: make([]models.AuditLog, 0),
	}
}

func (m *MockAuditLogStore) CreateAuditLog(ctx context.Context, exec store.Querier, auditLog *models.AuditLog) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.logs = append(m.logs, *auditLog)
	return nil
}

func (m *MockAuditLogStore) ListAuditLogs(ctx context.Context, exec store.Querier, filter store.ListAuditLogsFilter) ([]*models.AuditLog, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []*models.AuditLog
	for i := range m.logs {
		result = append(result, &m.logs[i])
	}
	return result, nil
}

// BL-006 compliance methods
func (m *MockAuditLogStore) CreateAuditLogWithValidation(ctx context.Context, exec store.Querier, logEntry *models.AuditLog) error {
	return m.CreateAuditLog(ctx, exec, logEntry)
}

func (m *MockAuditLogStore) GetAuditLogsWithUserFilter(ctx context.Context, exec store.Querier, userID uuid.UUID, filter store.ListAuditLogsFilter) ([]*models.AuditLog, error) {
	filter.UserID = userID.String()
	return m.ListAuditLogs(ctx, exec, filter)
}

func (m *MockAuditLogStore) ValidateAuditLogCompleteness(ctx context.Context, exec store.Querier, startTime, endTime time.Time) ([]string, error) {
	return []string{}, nil
}

type MockStateEventStore struct {
	events []interface{}
	mu     sync.RWMutex
}

func NewMockStateEventStore() *MockStateEventStore {
	return &MockStateEventStore{
		events: make([]interface{}, 0),
	}
}

func (m *MockStateEventStore) CreateStateChangeEvent(ctx context.Context, exec store.Querier, event *models.StateChangeEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.events = append(m.events, event)
	return nil
}

func (m *MockStateEventStore) CreateStateTransitionEvent(ctx context.Context, exec store.Querier, event *models.StateTransitionEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.events = append(m.events, event)
	return nil
}

func (m *MockStateEventStore) CreateStateValidationEvent(ctx context.Context, exec store.Querier, event *models.StateValidationEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.events = append(m.events, event)
	return nil
}

func (m *MockStateEventStore) CreateStateReconciliationEvent(ctx context.Context, exec store.Querier, event *models.StateReconciliationEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.events = append(m.events, event)
	return nil
}

func (m *MockStateEventStore) GetStateEventsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit int, offset int) ([]*models.StateChangeEvent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return []*models.StateChangeEvent{}, nil
}

func (m *MockStateEventStore) GetLastSequenceNumber(ctx context.Context, exec store.Querier) (int64, error) {
	return 0, nil
}

func (m *MockStateEventStore) GetEventCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.events)
}

// Test helper functions

func createTestCampaign(id uuid.UUID, status models.CampaignStatusEnum) *models.Campaign {
	userID := uuid.New()
	return &models.Campaign{
		ID:           id,
		UserID:       &userID,
		Name:         "Test Campaign",
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       status,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
}

// MockTransactionManager provides a mock implementation for testing
type MockTransactionManager struct{}

func (m *MockTransactionManager) SafeTransaction(ctx context.Context, opts *sql.TxOptions, operation string, fn func(tx *sqlx.Tx) error) error {
	// For testing, execute the function without a real transaction
	// Create a mock transaction object for testing
	return fn(nil)
}

func createMockDB() *sqlx.DB {
	// For testing, we use an in-memory mock or skip actual DB operations
	// This would typically connect to a test database
	return &sqlx.DB{}
}

func setupStateCoordinator() (StateCoordinator, *MockCampaignStore, *MockAuditLogStore, *MockStateEventStore) {
	mockDB := createMockDB()
	mockCampaignStore := NewMockCampaignStore()
	mockAuditLogStore := NewMockAuditLogStore()
	mockEventStore := NewMockStateEventStore()

	config := StateCoordinatorConfig{
		EnableValidation:     true,
		EnableReconciliation: true,
		ValidationInterval:   time.Second * 5,
	}

	// Create the state coordinator and cast to implementation to set test dependencies
	sc := NewStateCoordinator(mockDB, mockCampaignStore, mockAuditLogStore, config)
	impl := sc.(*StateCoordinatorImpl)
	impl.eventStore = mockEventStore

	// Replace the transaction manager with our mock
	impl.transactionMgr = &MockTransactionManager{}

	return sc, mockCampaignStore, mockAuditLogStore, mockEventStore
}

// Unit Tests

func TestStateCoordinator_TransitionState_ValidTransition(t *testing.T) {
	sc, mockCampaignStore, _, _ := setupStateCoordinator()

	campaignID := uuid.New()
	campaign := createTestCampaign(campaignID, models.CampaignStatusPending)

	// Store the campaign in the mock store
	err := mockCampaignStore.CreateCampaign(context.Background(), nil, campaign)
	if err != nil {
		t.Fatalf("Failed to create test campaign: %v", err)
	}

	ctx := context.Background()
	err = sc.TransitionState(
		ctx,
		campaignID,
		models.CampaignStatusQueued,
		models.StateEventSourceEnum("campaign_orchestrator"),
		"test_user",
		"Testing transition",
		nil,
	)

	if err != nil {
		t.Errorf("Expected successful transition, got error: %v", err)
	}

	// Verify the state was updated
	updatedCampaign, err := mockCampaignStore.GetCampaignByID(ctx, nil, campaignID)
	if err != nil {
		t.Fatalf("Failed to get updated campaign: %v", err)
	}

	if updatedCampaign.Status != models.CampaignStatusQueued {
		t.Errorf("Expected status %s, got %s", models.CampaignStatusQueued, updatedCampaign.Status)
	}

	// Verify metrics
	metrics := sc.GetMetrics()
	if metrics["transitions"] != 1 {
		t.Errorf("Expected 1 transition, got %d", metrics["transitions"])
	}
}

func TestStateCoordinator_TransitionState_InvalidTransition(t *testing.T) {
	sc, mockCampaignStore, _, _ := setupStateCoordinator()

	campaignID := uuid.New()
	campaign := createTestCampaign(campaignID, models.CampaignStatusCompleted)

	// Store the campaign in the mock store
	err := mockCampaignStore.CreateCampaign(context.Background(), nil, campaign)
	if err != nil {
		t.Fatalf("Failed to create test campaign: %v", err)
	}

	ctx := context.Background()
	err = sc.TransitionState(
		ctx,
		campaignID,
		models.CampaignStatusRunning, // Invalid: can't go from completed to running
		models.StateEventSourceEnum("test"),
		"test_user",
		"Invalid transition test",
		nil,
	)

	if err == nil {
		t.Error("Expected error for invalid transition, got nil")
	}

	if err != nil && !stringContains(err.Error(), "state transition validation failed") {
		t.Errorf("Expected validation error, got: %v", err)
	}

	// Verify error metrics
	metrics := sc.GetMetrics()
	if metrics["errors"] != 1 {
		t.Errorf("Expected 1 error, got %d", metrics["errors"])
	}
}

func TestStateCoordinator_ConcurrentStateTransitions(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping concurrent test in short mode")
	}

	sc, mockCampaignStore, _, _ := setupStateCoordinator()

	campaignID := uuid.New()
	numGoroutines := 100 // Exceeds minimum requirement of 50
	var wg sync.WaitGroup
	errors := make(chan error, numGoroutines)

	// Create test campaign
	campaign := createTestCampaign(campaignID, models.CampaignStatusPending)
	err := mockCampaignStore.CreateCampaign(context.Background(), nil, campaign)
	if err != nil {
		t.Fatalf("Failed to create test campaign: %v", err)
	}

	ctx := context.Background()

	// Launch concurrent state transitions
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(goroutineID int) {
			defer wg.Done()

			// Alternate between valid transitions to test locking
			var targetState models.CampaignStatusEnum
			if goroutineID%2 == 0 {
				targetState = models.CampaignStatusQueued
			} else {
				targetState = models.CampaignStatusRunning
			}

			err := sc.TransitionState(
				ctx,
				campaignID,
				targetState,
				models.StateEventSourceEnum("concurrent_test"),
				fmt.Sprintf("goroutine_%d", goroutineID),
				fmt.Sprintf("Concurrent test %d", goroutineID),
				nil,
			)

			if err != nil {
				errors <- err
			}
		}(i)
	}

	// Wait for all goroutines to complete
	wg.Wait()
	close(errors)

	// Check for race condition errors
	errorCount := 0
	for err := range errors {
		t.Logf("Concurrent transition error: %v", err)
		errorCount++
	}

	// Verify no data races occurred and metrics are consistent
	metrics := sc.GetMetrics()
	t.Logf("Final metrics: %+v", metrics)
	t.Logf("Errors encountered: %d", errorCount)

	// Ensure some transitions succeeded (allowing for validation failures due to state machine rules)
	if metrics["transitions"] == 0 {
		t.Error("Expected at least some successful transitions")
	}

	if metrics["active_locks"] != 1 {
		t.Errorf("Expected 1 lock for the campaign, got %d", metrics["active_locks"])
	}
}

func TestStateCoordinator_StateValidation(t *testing.T) {
	sc, mockCampaignStore, _, _ := setupStateCoordinator()

	campaignID := uuid.New()
	campaign := createTestCampaign(campaignID, models.CampaignStatusRunning)

	// Store the campaign in the mock store
	err := mockCampaignStore.CreateCampaign(context.Background(), nil, campaign)
	if err != nil {
		t.Fatalf("Failed to create test campaign: %v", err)
	}

	ctx := context.Background()
	err = sc.ValidateStateConsistency(ctx, campaignID)

	if err != nil {
		t.Errorf("Expected successful validation, got error: %v", err)
	}

	// Verify validation metrics
	metrics := sc.GetMetrics()
	if metrics["validations"] != 1 {
		t.Errorf("Expected 1 validation, got %d", metrics["validations"])
	}
}

func TestStateCoordinator_StateReconciliation(t *testing.T) {
	sc, mockCampaignStore, _, _ := setupStateCoordinator()

	campaignID := uuid.New()
	campaign := createTestCampaign(campaignID, models.CampaignStatusRunning)

	// Store the campaign in the mock store
	err := mockCampaignStore.CreateCampaign(context.Background(), nil, campaign)
	if err != nil {
		t.Fatalf("Failed to create test campaign: %v", err)
	}

	ctx := context.Background()
	err = sc.ReconcileState(ctx, campaignID)

	if err != nil {
		t.Errorf("Expected successful reconciliation, got error: %v", err)
	}
}

func TestStateCoordinator_EventHandlers(t *testing.T) {
	sc, mockCampaignStore, _, _ := setupStateCoordinator()

	var handlerCalled bool
	var handledEvent *models.StateChangeEvent

	// Add event handler
	sc.AddEventHandler(models.StateEventTypeEnum("change"), func(ctx context.Context, event *models.StateChangeEvent) error {
		handlerCalled = true
		handledEvent = event
		return nil
	})

	campaignID := uuid.New()
	campaign := createTestCampaign(campaignID, models.CampaignStatusPending)

	// Store the campaign in the mock store
	err := mockCampaignStore.CreateCampaign(context.Background(), nil, campaign)
	if err != nil {
		t.Fatalf("Failed to create test campaign: %v", err)
	}

	ctx := context.Background()
	err = sc.TransitionState(
		ctx,
		campaignID,
		models.CampaignStatusQueued,
		models.StateEventSourceEnum("test"),
		"test_user",
		"Handler test",
		nil,
	)

	if err != nil {
		t.Fatalf("Expected successful transition, got error: %v", err)
	}

	if !handlerCalled {
		t.Error("Event handler should have been called")
	}

	if handledEvent == nil {
		t.Error("Handler should have received event")
	}

	if handledEvent != nil {
		if handledEvent.CampaignID != campaignID {
			t.Errorf("Expected campaign ID %s, got %s", campaignID, handledEvent.CampaignID)
		}
		if handledEvent.PreviousState != models.CampaignStatusPending {
			t.Errorf("Expected previous state %s, got %s", models.CampaignStatusPending, handledEvent.PreviousState)
		}
		if handledEvent.NewState != models.CampaignStatusQueued {
			t.Errorf("Expected new state %s, got %s", models.CampaignStatusQueued, handledEvent.NewState)
		}
	}
}

func TestStateCoordinator_StateValidators(t *testing.T) {
	sc, mockCampaignStore, _, _ := setupStateCoordinator()

	var validatorCalled bool
	var validatedCampaignID uuid.UUID
	var validatedState models.CampaignStatusEnum

	// Add custom validator
	sc.AddStateValidator(func(ctx context.Context, campaignID uuid.UUID, currentState models.CampaignStatusEnum) error {
		validatorCalled = true
		validatedCampaignID = campaignID
		validatedState = currentState
		return nil
	})

	campaignID := uuid.New()
	campaign := createTestCampaign(campaignID, models.CampaignStatusRunning)

	// Store the campaign in the mock store
	err := mockCampaignStore.CreateCampaign(context.Background(), nil, campaign)
	if err != nil {
		t.Fatalf("Failed to create test campaign: %v", err)
	}

	ctx := context.Background()
	err = sc.ValidateStateConsistency(ctx, campaignID)

	if err != nil {
		t.Fatalf("Expected successful validation, got error: %v", err)
	}

	if !validatorCalled {
		t.Error("Custom validator should have been called")
	}

	if validatedCampaignID != campaignID {
		t.Errorf("Expected campaign ID %s, got %s", campaignID, validatedCampaignID)
	}

	if validatedState != models.CampaignStatusRunning {
		t.Errorf("Expected state %s, got %s", models.CampaignStatusRunning, validatedState)
	}
}

func TestStateCoordinator_GetStateHistory(t *testing.T) {
	sc, _, _, _ := setupStateCoordinator()

	campaignID := uuid.New()

	ctx := context.Background()
	events, err := sc.GetStateHistory(ctx, campaignID, 10, 0)

	if err != nil {
		t.Fatalf("Expected successful history retrieval, got error: %v", err)
	}

	// Should return empty list from mock
	if len(events) != 0 {
		t.Errorf("Expected empty events list, got %d events", len(events))
	}
}

func TestStateCoordinator_TerminalStates(t *testing.T) {
	sc, mockCampaignStore, _, _ := setupStateCoordinator()

	testCases := []models.CampaignStatusEnum{
		models.CampaignStatusCompleted,
		models.CampaignStatusFailed,
		models.CampaignStatusCancelled,
	}

	for _, terminalState := range testCases {
		t.Run(fmt.Sprintf("terminal_state_%s", terminalState), func(t *testing.T) {
			campaignID := uuid.New()
			campaign := createTestCampaign(campaignID, models.CampaignStatusRunning)

			// Store the campaign in the mock store
			err := mockCampaignStore.CreateCampaign(context.Background(), nil, campaign)
			if err != nil {
				t.Fatalf("Failed to create test campaign: %v", err)
			}

			ctx := context.Background()
			err = sc.TransitionState(
				ctx,
				campaignID,
				terminalState,
				models.StateEventSourceEnum("test"),
				"test_user",
				fmt.Sprintf("Testing terminal state %s", terminalState),
				nil,
			)

			if err != nil {
				t.Errorf("Expected successful transition to %s, got error: %v", terminalState, err)
			}

			// Verify that completion time is set for terminal states
			updatedCampaign, err := mockCampaignStore.GetCampaignByID(ctx, nil, campaignID)
			if err != nil {
				t.Fatalf("Failed to get updated campaign: %v", err)
			}

			if updatedCampaign.CompletedAt == nil {
				t.Errorf("Expected CompletedAt to be set for terminal state %s", terminalState)
			}
		})
	}
}

// Benchmark tests for performance validation

func BenchmarkStateCoordinator_SingleTransition(b *testing.B) {
	sc, mockCampaignStore, _, _ := setupStateCoordinator()

	campaignID := uuid.New()
	campaign := createTestCampaign(campaignID, models.CampaignStatusPending)

	// Store the campaign in the mock store
	err := mockCampaignStore.CreateCampaign(context.Background(), nil, campaign)
	if err != nil {
		b.Fatalf("Failed to create test campaign: %v", err)
	}

	ctx := context.Background()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = sc.TransitionState(
			ctx,
			campaignID,
			models.CampaignStatusQueued,
			models.StateEventSourceEnum("benchmark"),
			"benchmark_user",
			"Benchmark test",
			nil,
		)
	}
}

func BenchmarkStateCoordinator_ConcurrentTransitions(b *testing.B) {
	sc, mockCampaignStore, _, _ := setupStateCoordinator()

	numCampaigns := 10
	campaigns := make([]*models.Campaign, numCampaigns)
	for i := 0; i < numCampaigns; i++ {
		campaignID := uuid.New()
		campaigns[i] = createTestCampaign(campaignID, models.CampaignStatusPending)
		err := mockCampaignStore.CreateCampaign(context.Background(), nil, campaigns[i])
		if err != nil {
			b.Fatalf("Failed to create test campaign: %v", err)
		}
	}

	ctx := context.Background()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			campaign := campaigns[i%numCampaigns]
			_ = sc.TransitionState(
				ctx,
				campaign.ID,
				models.CampaignStatusQueued,
				models.StateEventSourceEnum("benchmark"),
				"benchmark_user",
				"Concurrent benchmark test",
				nil,
			)
			i++
		}
	})
}

// Helper function to check if string contains substring
func stringContains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(substr) == 0 ||
		(len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
			func() bool {
				for i := 1; i <= len(s)-len(substr); i++ {
					if s[i:i+len(substr)] == substr {
						return true
					}
				}
				return false
			}())))
}
