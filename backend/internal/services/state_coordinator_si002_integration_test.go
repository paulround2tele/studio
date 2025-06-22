// File: backend/internal/services/state_coordinator_si002_integration_test.go
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// SI-002 Integration Test Suite - Centralized State Management
// Tests the complete state event store implementation with real database persistence

func TestSI002_StateCoordinatorDatabaseIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping SI-002 integration test in short mode")
	}

	// Initialize database connection
	db := setupTestDatabase(t)
	defer db.Close()

	// Initialize stores and state coordinator
	campaignStore := postgres.NewCampaignStorePostgres(db)
	auditLogStore := postgres.NewAuditLogStorePostgres(db)

	config := StateCoordinatorConfig{
		EnableValidation:     true,
		EnableReconciliation: true,
		ValidationInterval:   1 * time.Second,
	}

	stateCoordinator := NewStateCoordinator(db, campaignStore, auditLogStore, config)

	t.Run("SI002_BasicStateEventPersistence", func(t *testing.T) {
		testBasicStateEventPersistence(t, db, stateCoordinator, campaignStore)
	})

	t.Run("SI002_StateTransitionWithEventSourcing", func(t *testing.T) {
		testStateTransitionWithEventSourcing(t, db, stateCoordinator, campaignStore)
	})

	t.Run("SI002_ConcurrentStateTransitions", func(t *testing.T) {
		testConcurrentStateTransitions(t, db, stateCoordinator, campaignStore)
	})

	t.Run("SI002_StateIntegrityValidation", func(t *testing.T) {
		testStateIntegrityValidation(t, db, stateCoordinator, campaignStore)
	})

	t.Run("SI002_EventReplayAndRecovery", func(t *testing.T) {
		testEventReplayAndRecovery(t, db, stateCoordinator, campaignStore)
	})

	t.Run("SI002_StateSnapshotCreation", func(t *testing.T) {
		testStateSnapshotCreation(t, db, stateCoordinator, campaignStore)
	})
}

func testBasicStateEventPersistence(t *testing.T, db *sqlx.DB, coordinator StateCoordinator, campaignStore store.CampaignStore) {
	ctx := context.Background()

	// Create a test campaign
	campaign := createTestCampaignSI002(t, db, campaignStore)

	// Test state transition with database persistence
	err := coordinator.TransitionState(
		ctx,
		campaign.ID,
		models.CampaignStatusQueued,
		models.StateEventSourceOrchestrator,
		"test_user",
		"SI-002 integration test",
		nil,
	)
	require.NoError(t, err)

	// Verify state event was persisted to database
	var eventCount int
	err = db.GetContext(ctx, &eventCount,
		"SELECT COUNT(*) FROM campaign_state_events WHERE campaign_id = $1",
		campaign.ID)
	require.NoError(t, err)
	assert.Greater(t, eventCount, 0, "State event should be persisted to database")

	// Verify transition event was persisted
	var transitionCount int
	err = db.GetContext(ctx, &transitionCount,
		"SELECT COUNT(*) FROM campaign_state_transitions WHERE campaign_id = $1",
		campaign.ID)
	require.NoError(t, err)
	assert.Greater(t, transitionCount, 0, "State transition should be persisted to database")

	// Verify campaign state was updated
	updatedCampaign, err := campaignStore.GetCampaignByID(ctx, db, campaign.ID)
	require.NoError(t, err)
	assert.Equal(t, models.CampaignStatusQueued, updatedCampaign.Status)

	t.Logf("✅ SI-002: Basic state event persistence validated")
}

func testStateTransitionWithEventSourcing(t *testing.T, db *sqlx.DB, coordinator StateCoordinator, campaignStore store.CampaignStore) {
	ctx := context.Background()

	// Create a test campaign
	campaign := createTestCampaignSI002(t, db, campaignStore)

	// Perform a series of state transitions
	transitions := []struct {
		toState models.CampaignStatusEnum
		source  models.StateEventSourceEnum
		reason  string
	}{
		{models.CampaignStatusQueued, models.StateEventSourceOrchestrator, "Campaign queued"},
		{models.CampaignStatusRunning, models.StateEventSourceDomainGen, "Domain generation started"},
		{models.CampaignStatusPaused, models.StateEventSourceOrchestrator, "User paused campaign"},
		{models.CampaignStatusRunning, models.StateEventSourceOrchestrator, "Campaign resumed"},
		{models.CampaignStatusCompleted, models.StateEventSourceHTTPKeyword, "All tasks completed"},
	}

	for i, transition := range transitions {
		err := coordinator.TransitionState(
			ctx,
			campaign.ID,
			transition.toState,
			transition.source,
			"integration_test",
			transition.reason,
			nil,
		)
		require.NoError(t, err, "Transition %d should succeed", i+1)
	}

	// Verify complete event history
	events, err := coordinator.GetStateHistory(ctx, campaign.ID, 100, 0)
	require.NoError(t, err)
	assert.Len(t, events, len(transitions), "Should have one event per transition")

	// Verify sequence numbers are sequential
	for i, event := range events {
		assert.Greater(t, event.SequenceNumber, int64(0), "Event %d should have positive sequence number", i)
		if i > 0 {
			assert.Greater(t, event.SequenceNumber, events[i-1].SequenceNumber,
				"Event %d should have sequence number greater than previous", i)
		}
	}

	// Verify final campaign state
	finalCampaign, err := campaignStore.GetCampaignByID(ctx, db, campaign.ID)
	require.NoError(t, err)
	assert.Equal(t, models.CampaignStatusCompleted, finalCampaign.Status)
	assert.NotNil(t, finalCampaign.CompletedAt)

	t.Logf("✅ SI-002: State transition with event sourcing validated")
}

func testConcurrentStateTransitions(t *testing.T, db *sqlx.DB, coordinator StateCoordinator, campaignStore store.CampaignStore) {
	ctx := context.Background()

	// Create multiple test campaigns for concurrent testing
	campaignCount := 10
	campaigns := make([]*models.Campaign, campaignCount)

	for i := 0; i < campaignCount; i++ {
		campaigns[i] = createTestCampaignSI002(t, db, campaignStore)
	}

	// Perform concurrent state transitions
	var wg sync.WaitGroup
	errors := make(chan error, campaignCount*3) // 3 transitions per campaign

	for i, campaign := range campaigns {
		wg.Add(1)
		go func(campaignID uuid.UUID, workerID int) {
			defer wg.Done()

			// Each worker performs 3 state transitions
			transitions := []models.CampaignStatusEnum{
				models.CampaignStatusQueued,
				models.CampaignStatusRunning,
				models.CampaignStatusCompleted,
			}

			for j, toState := range transitions {
				err := coordinator.TransitionState(
					ctx,
					campaignID,
					toState,
					models.StateEventSourceOrchestrator,
					fmt.Sprintf("worker_%d", workerID),
					fmt.Sprintf("Concurrent transition %d", j+1),
					nil,
				)
				if err != nil {
					errors <- fmt.Errorf("worker %d transition %d failed: %w", workerID, j+1, err)
					return
				}

				// Small delay to increase chance of race conditions
				time.Sleep(10 * time.Millisecond)
			}
		}(campaign.ID, i)
	}

	// Wait for all workers to complete
	wg.Wait()
	close(errors)

	// Check for any errors
	var allErrors []error
	for err := range errors {
		allErrors = append(allErrors, err)
	}

	if len(allErrors) > 0 {
		for _, err := range allErrors {
			t.Errorf("Concurrent transition error: %v", err)
		}
		t.FailNow()
	}

	// Verify all campaigns reached final state
	for i, campaign := range campaigns {
		finalCampaign, err := campaignStore.GetCampaignByID(ctx, db, campaign.ID)
		require.NoError(t, err, "Failed to get campaign %d final state", i)
		assert.Equal(t, models.CampaignStatusCompleted, finalCampaign.Status,
			"Campaign %d should be in completed state", i)

		// Verify event history integrity
		events, err := coordinator.GetStateHistory(ctx, campaign.ID, 100, 0)
		require.NoError(t, err, "Failed to get campaign %d event history", i)
		assert.Len(t, events, 3, "Campaign %d should have 3 state events", i)
	}

	t.Logf("✅ SI-002: Concurrent state transitions validated for %d campaigns", campaignCount)
}

func testStateIntegrityValidation(t *testing.T, db *sqlx.DB, coordinator StateCoordinator, campaignStore store.CampaignStore) {
	ctx := context.Background()

	// Create a test campaign
	campaign := createTestCampaignSI002(t, db, campaignStore)

	// Perform some state transitions
	err := coordinator.TransitionState(ctx, campaign.ID, models.CampaignStatusQueued,
		models.StateEventSourceOrchestrator, "test", "queued", nil)
	require.NoError(t, err)

	err = coordinator.TransitionState(ctx, campaign.ID, models.CampaignStatusRunning,
		models.StateEventSourceDomainGen, "test", "running", nil)
	require.NoError(t, err)

	// Test state integrity validation
	err = coordinator.ValidateStateConsistency(ctx, campaign.ID)
	assert.NoError(t, err, "State consistency validation should pass")

	// Test state integrity validation using campaign store method
	result, err := campaignStore.ValidateStateEventIntegrity(ctx, db, campaign.ID)
	require.NoError(t, err)
	assert.True(t, result.IsValid, "State integrity should be valid")
	assert.Greater(t, result.TotalEvents, int64(0), "Should have recorded events")
	assert.Len(t, result.MissingSequences, 0, "Should not have missing sequences")
	assert.Greater(t, len(result.ValidationChecks), 0, "Should have validation checks")

	// Verify validation checks passed
	for _, check := range result.ValidationChecks {
		assert.True(t, check.CheckPassed, "Validation check %s should pass", check.CheckType)
	}

	t.Logf("✅ SI-002: State integrity validation passed for campaign %s", campaign.ID)
}

func testEventReplayAndRecovery(t *testing.T, db *sqlx.DB, coordinator StateCoordinator, campaignStore store.CampaignStore) {
	ctx := context.Background()

	// Create a test campaign
	campaign := createTestCampaignSI002(t, db, campaignStore)

	// Perform state transitions to build event history
	transitions := []models.CampaignStatusEnum{
		models.CampaignStatusQueued,
		models.CampaignStatusRunning,
		models.CampaignStatusPaused,
		models.CampaignStatusRunning,
	}

	for _, toState := range transitions {
		err := coordinator.TransitionState(ctx, campaign.ID, toState,
			models.StateEventSourceOrchestrator, "test", "replay test", nil)
		require.NoError(t, err)
	}

	// Test event replay functionality
	replayEvents, err := campaignStore.ReplayStateEvents(ctx, db, campaign.ID, 0)
	require.NoError(t, err)
	assert.Len(t, replayEvents, len(transitions), "Should replay all events")

	// Verify events are in correct order
	for i, event := range replayEvents {
		assert.Equal(t, transitions[i], event.NewState, "Event %d should have correct target state", i)
		if i > 0 {
			assert.Greater(t, event.SequenceNumber, replayEvents[i-1].SequenceNumber,
				"Event %d should have greater sequence number", i)
		}
	}

	// Test partial replay from specific sequence
	if len(replayEvents) >= 2 {
		partialReplay, err := campaignStore.ReplayStateEvents(ctx, db, campaign.ID, replayEvents[1].SequenceNumber)
		require.NoError(t, err)
		assert.Len(t, partialReplay, len(transitions)-2, "Should replay events from specified sequence")
	}

	t.Logf("✅ SI-002: Event replay and recovery validated")
}

func testStateSnapshotCreation(t *testing.T, db *sqlx.DB, coordinator StateCoordinator, campaignStore store.CampaignStore) {
	ctx := context.Background()

	// Create a test campaign
	campaign := createTestCampaignSI002(t, db, campaignStore)

	// Perform some state transitions
	err := coordinator.TransitionState(ctx, campaign.ID, models.CampaignStatusQueued,
		models.StateEventSourceOrchestrator, "test", "snapshot test", nil)
	require.NoError(t, err)

	err = coordinator.TransitionState(ctx, campaign.ID, models.CampaignStatusRunning,
		models.StateEventSourceDomainGen, "test", "snapshot test", nil)
	require.NoError(t, err)

	// Create state snapshot
	stateData := map[string]interface{}{
		"current_jobs":        5,
		"completed_jobs":      3,
		"failed_jobs":         0,
		"progress_percentage": 60.0,
	}

	stateDataJSON, err := json.Marshal(stateData)
	require.NoError(t, err)
	rawStateData := json.RawMessage(stateDataJSON)

	snapshot := models.NewStateSnapshotEvent(
		campaign.ID,
		models.CampaignStatusRunning,
		&rawStateData,
		2, // Last event sequence
	)

	err = campaignStore.CreateStateSnapshot(ctx, db, snapshot)
	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, snapshot.ID, "Snapshot should have valid ID")

	// Retrieve latest snapshot
	latestSnapshot, err := campaignStore.GetLatestStateSnapshot(ctx, db, campaign.ID)
	require.NoError(t, err)
	assert.Equal(t, snapshot.ID, latestSnapshot.ID, "Should retrieve the created snapshot")
	assert.Equal(t, models.CampaignStatusRunning, latestSnapshot.CurrentState)
	assert.Equal(t, int64(2), latestSnapshot.LastEventSequence)
	assert.True(t, latestSnapshot.IsValid)

	// Verify snapshot data integrity
	var retrievedStateData map[string]interface{}
	err = json.Unmarshal(*latestSnapshot.StateData, &retrievedStateData)
	require.NoError(t, err)

	// JSON unmarshaling converts numbers to float64, so we need to handle type conversion
	assert.Equal(t, float64(5), retrievedStateData["current_jobs"])
	assert.Equal(t, float64(3), retrievedStateData["completed_jobs"])
	assert.Equal(t, float64(0), retrievedStateData["failed_jobs"])
	assert.Equal(t, 60.0, retrievedStateData["progress_percentage"])

	t.Logf("✅ SI-002: State snapshot creation and retrieval validated")
}

// Helper function to create test campaign for SI-002 testing
func createTestCampaignSI002(t *testing.T, db *sqlx.DB, campaignStore store.CampaignStore) *models.Campaign {
	ctx := context.Background()

	userID := uuid.New()
	campaign := &models.Campaign{
		ID:           uuid.New(),
		UserID:       &userID,
		Name:         fmt.Sprintf("SI-002 Test Campaign %s", uuid.New().String()[:8]),
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       models.CampaignStatusPending,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	err := campaignStore.CreateCampaign(ctx, db, campaign)
	require.NoError(t, err)

	return campaign
}

// Helper function to setup test database
func setupTestDatabase(t *testing.T) *sqlx.DB {
	// Use real database connection for SI-002 testing
	connectionString := "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable"

	db, err := sqlx.Connect("postgres", connectionString)
	require.NoError(t, err, "Failed to connect to test database")

	// Verify state event tables exist
	var tableCount int
	err = db.Get(&tableCount, "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('campaign_state_events', 'campaign_state_transitions', 'campaign_state_snapshots')")
	require.NoError(t, err)
	require.Equal(t, 3, tableCount, "SI-002 state event tables should exist")

	return db
}
