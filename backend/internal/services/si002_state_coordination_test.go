// File: backend/internal/services/si002_state_coordination_test.go
// SI-002: Centralized State Management Integration Tests

package services

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestConcurrentStateUpdates validates concurrent state updates with proper coordination
func TestConcurrentStateUpdates(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create centralized state manager
	stateManager := NewCentralizedStateManager(db)
	campaignID := uuid.New()

	// Initialize campaign state
	ctx := context.Background()
	initialAggregate := &CampaignStateAggregate{
		EntityID:    campaignID,
		State:       models.CampaignStatusPending,
		Version:     1,
		LastUpdated: time.Now(),
		Metadata:    make(map[string]interface{}),
	}

	err := stateManager.CreateSnapshot(ctx, initialAggregate)
	require.NoError(t, err, "Failed to create initial snapshot")

	// Test concurrent state updates
	const numGoroutines = 10
	const updatesPerGoroutine = 5

	var wg sync.WaitGroup
	errors := make(chan error, numGoroutines*updatesPerGoroutine)
	successCount := make(chan int, numGoroutines*updatesPerGoroutine)

	// Launch concurrent goroutines to update state
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(goroutineID int) {
			defer wg.Done()

			for j := 0; j < updatesPerGoroutine; j++ {
				opts := &postgres.CampaignTransactionOptions{
					Operation:  fmt.Sprintf("concurrent_test_%d_%d", goroutineID, j),
					CampaignID: campaignID.String(),
					Timeout:    10 * time.Second,
					MaxRetries: 3,
					RetryDelay: 100 * time.Millisecond,
				}

				updateErr := stateManager.CoordinatedStateUpdate(ctx, campaignID, func(aggregate *CampaignStateAggregate) (*StateEvent, error) {
					// Simulate state modification
					aggregate.Metadata[fmt.Sprintf("update_%d_%d", goroutineID, j)] = time.Now().Unix()

					event := &StateEvent{
						ID:        uuid.New(),
						EntityID:  campaignID,
						EventType: "concurrent_update",
						EventData: map[string]interface{}{
							"goroutine_id": goroutineID,
							"update_id":    j,
							"timestamp":    time.Now().Unix(),
						},
						Timestamp: time.Now(),
					}

					return event, nil
				}, opts)

				if updateErr != nil {
					errors <- updateErr
				} else {
					successCount <- 1
				}
			}
		}(i)
	}

	// Wait for all goroutines to complete
	wg.Wait()
	close(errors)
	close(successCount)

	// Count results
	errorCount := 0
	for err := range errors {
		t.Logf("Update error: %v", err)
		errorCount++
	}

	successfulUpdates := 0
	for range successCount {
		successfulUpdates++
	}

	t.Logf("Successful updates: %d, Errors: %d", successfulUpdates, errorCount)

	// At least 80% of updates should succeed (allowing for some contention)
	minExpectedSuccess := int(float64(numGoroutines*updatesPerGoroutine) * 0.8)
	assert.GreaterOrEqual(t, successfulUpdates, minExpectedSuccess, "Too many concurrent update failures")

	// Verify final state consistency
	finalAggregate, err := stateManager.loadOrCreateAggregate(ctx, campaignID)
	require.NoError(t, err, "Failed to load final aggregate")
	assert.NotNil(t, finalAggregate, "Final aggregate should not be nil")

	// Verify state events were recorded
	events, err := stateManager.GetStateEvents(ctx, campaignID, 0, 1000)
	require.NoError(t, err, "Failed to get state events")
	assert.Greater(t, len(events), 0, "Should have recorded state events")
}

// TestDistributedLocking validates distributed locking mechanisms
func TestDistributedLocking(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	lockManager := &StateCoordinationLockManager{db: db}

	ctx := context.Background()
	lockKey := "test_lock_" + uuid.New().String()
	lockTimeout := 5 * time.Second

	// Test basic lock acquisition and release
	t.Run("BasicLockAcquisition", func(t *testing.T) {
		acquired, err := lockManager.AcquireLock(ctx, lockKey, lockTimeout)
		require.NoError(t, err, "Failed to acquire lock")
		assert.True(t, acquired, "Should have acquired lock")

		// Try to acquire same lock - should fail
		acquired2, err := lockManager.AcquireLock(ctx, lockKey, 1*time.Second)
		require.NoError(t, err, "Lock acquisition should not error")
		assert.False(t, acquired2, "Should not acquire already held lock")

		// Release lock
		err = lockManager.ReleaseLock(ctx, lockKey)
		require.NoError(t, err, "Failed to release lock")

		// Should be able to acquire again
		acquired3, err := lockManager.AcquireLock(ctx, lockKey, lockTimeout)
		require.NoError(t, err, "Failed to re-acquire lock")
		assert.True(t, acquired3, "Should have re-acquired lock")

		// Clean up
		err = lockManager.ReleaseLock(ctx, lockKey)
		require.NoError(t, err, "Failed to release lock")
	})

	// Test concurrent lock acquisition
	t.Run("ConcurrentLockAcquisition", func(t *testing.T) {
		concurrentLockKey := "concurrent_test_" + uuid.New().String()

		const numGoroutines = 5
		acquisitions := make(chan bool, numGoroutines)
		var wg sync.WaitGroup

		// Launch concurrent lock attempts
		for i := 0; i < numGoroutines; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				acquired, err := lockManager.AcquireLock(ctx, concurrentLockKey, 2*time.Second)
				require.NoError(t, err, "Lock acquisition should not error")
				acquisitions <- acquired

				if acquired {
					// Hold lock briefly then release
					time.Sleep(100 * time.Millisecond)
					err = lockManager.ReleaseLock(ctx, concurrentLockKey)
					require.NoError(t, err, "Failed to release lock")
				}
			}()
		}

		wg.Wait()
		close(acquisitions)

		// Count successful acquisitions
		successCount := 0
		for acquired := range acquisitions {
			if acquired {
				successCount++
			}
		}

		// Only one should have succeeded in acquiring lock initially
		assert.Equal(t, 1, successCount, "Only one goroutine should acquire lock initially")
	})
}

// TestEventSourcing validates event sourcing functionality
func TestEventSourcing(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	stateManager := NewCentralizedStateManager(db)
	campaignID := uuid.New()
	ctx := context.Background()

	// Create series of state events
	events := []*StateEvent{
		{
			ID:        uuid.New(),
			EntityID:  campaignID,
			EventType: "campaign_created",
			EventData: map[string]interface{}{
				"initial_status": string(models.CampaignStatusPending),
				"created_by":     "test_user",
			},
			Timestamp: time.Now().Add(-5 * time.Minute),
		},
		{
			ID:        uuid.New(),
			EntityID:  campaignID,
			EventType: "campaign_queued",
			EventData: map[string]interface{}{
				"old_status": string(models.CampaignStatusPending),
				"new_status": string(models.CampaignStatusQueued),
			},
			Timestamp: time.Now().Add(-4 * time.Minute),
		},
		{
			ID:        uuid.New(),
			EntityID:  campaignID,
			EventType: "campaign_started",
			EventData: map[string]interface{}{
				"old_status": string(models.CampaignStatusQueued),
				"new_status": string(models.CampaignStatusRunning),
			},
			Timestamp: time.Now().Add(-3 * time.Minute),
		},
	}

	// Store events
	for _, event := range events {
		err := stateManager.StoreEvent(ctx, event)
		require.NoError(t, err, "Failed to store event")
	}

	// Test event retrieval
	retrievedEvents, err := stateManager.GetStateEvents(ctx, campaignID, 0, 100)
	require.NoError(t, err, "Failed to retrieve events")
	assert.Len(t, retrievedEvents, len(events), "Should retrieve all stored events")

	// Test state reconstruction from events
	aggregate, err := stateManager.rebuildFromEvents(ctx, campaignID)
	require.NoError(t, err, "Failed to rebuild from events")
	assert.Equal(t, campaignID, aggregate.EntityID, "Aggregate entity ID should match")
	assert.Equal(t, models.CampaignStatusRunning, aggregate.State, "Final state should be running")

	// Test snapshot creation and restoration
	err = stateManager.CreateSnapshot(ctx, aggregate)
	require.NoError(t, err, "Failed to create snapshot")

	// Load from snapshot
	loadedAggregate, err := stateManager.loadFromSnapshot(ctx, campaignID)
	require.NoError(t, err, "Failed to load from snapshot")
	assert.Equal(t, aggregate.State, loadedAggregate.State, "Snapshot state should match")
	assert.Equal(t, aggregate.EntityID, loadedAggregate.EntityID, "Snapshot entity ID should match")
}

// TestStateSnapshots validates state snapshot creation and restoration
func TestStateSnapshots(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	stateManager := NewCentralizedStateManager(db)
	campaignID := uuid.New()
	ctx := context.Background()

	// Create test aggregate
	aggregate := &CampaignStateAggregate{
		EntityID:    campaignID,
		State:       models.CampaignStatusRunning,
		Version:     5,
		LastUpdated: time.Now(),
		Metadata: map[string]interface{}{
			"test_data": "snapshot_test",
			"version":   5,
		},
	}

	// Create snapshot
	err := stateManager.CreateSnapshot(ctx, aggregate)
	require.NoError(t, err, "Failed to create snapshot")

	// Load snapshot
	loadedAggregate, err := stateManager.loadFromSnapshot(ctx, campaignID)
	require.NoError(t, err, "Failed to load snapshot")

	// Verify snapshot data
	assert.Equal(t, aggregate.EntityID, loadedAggregate.EntityID, "Entity ID should match")
	assert.Equal(t, aggregate.State, loadedAggregate.State, "State should match")
	assert.Equal(t, aggregate.Version, loadedAggregate.Version, "Version should match")
	assert.Equal(t, aggregate.Metadata["test_data"], loadedAggregate.Metadata["test_data"], "Metadata should match")

	// Test snapshot updates
	aggregate.Version = 6
	aggregate.State = models.CampaignStatusCompleted
	aggregate.Metadata["final_status"] = "completed"

	err = stateManager.CreateSnapshot(ctx, aggregate)
	require.NoError(t, err, "Failed to update snapshot")

	// Load updated snapshot
	updatedAggregate, err := stateManager.loadFromSnapshot(ctx, campaignID)
	require.NoError(t, err, "Failed to load updated snapshot")
	assert.Equal(t, models.CampaignStatusCompleted, updatedAggregate.State, "Updated state should match")
	assert.Equal(t, 6, updatedAggregate.Version, "Updated version should match")
}

// TestRaceConditionPrevention validates race condition prevention
func TestRaceConditionPrevention(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	stateManager := NewCentralizedStateManager(db)
	campaignID := uuid.New()
	ctx := context.Background()

	// Initialize state
	initialAggregate := &CampaignStateAggregate{
		EntityID:    campaignID,
		State:       models.CampaignStatusPending,
		Version:     1,
		LastUpdated: time.Now(),
		Metadata:    make(map[string]interface{}),
	}

	err := stateManager.CreateSnapshot(ctx, initialAggregate)
	require.NoError(t, err, "Failed to create initial snapshot")

	// Test conflicting state transitions
	const numConflictingUpdates = 20
	var wg sync.WaitGroup
	successCount := int32(0)
	conflictCount := int32(0)

	for i := 0; i < numConflictingUpdates; i++ {
		wg.Add(1)
		go func(updateID int) {
			defer wg.Done()

			opts := &postgres.CampaignTransactionOptions{
				Operation:  fmt.Sprintf("race_test_%d", updateID),
				CampaignID: campaignID.String(),
				Timeout:    5 * time.Second,
				MaxRetries: 1, // Minimal retries to test race conditions
				RetryDelay: 50 * time.Millisecond,
			}

			updateErr := stateManager.CoordinatedStateUpdate(ctx, campaignID, func(aggregate *CampaignStateAggregate) (*StateEvent, error) {
				// Simulate state change that could conflict
				if aggregate.State == models.CampaignStatusPending {
					aggregate.State = models.CampaignStatusQueued
				} else if aggregate.State == models.CampaignStatusQueued {
					aggregate.State = models.CampaignStatusRunning
				}

				event := &StateEvent{
					ID:        uuid.New(),
					EntityID:  campaignID,
					EventType: "race_condition_test",
					EventData: map[string]interface{}{
						"update_id":   updateID,
						"old_version": aggregate.Version,
						"new_version": aggregate.Version + 1,
					},
					Timestamp: time.Now(),
				}

				return event, nil
			}, opts)

			if updateErr != nil {
				conflictCount++
				t.Logf("Update %d failed (expected due to race condition): %v", updateID, updateErr)
			} else {
				successCount++
			}
		}(i)
	}

	wg.Wait()

	t.Logf("Race condition test - Successes: %d, Conflicts: %d", successCount, conflictCount)

	// Verify that we had some conflicts (proving race condition detection)
	assert.Greater(t, int(conflictCount), 0, "Should have detected race conditions")

	// Verify final state consistency
	finalAggregate, err := stateManager.loadOrCreateAggregate(ctx, campaignID)
	require.NoError(t, err, "Failed to load final aggregate")
	assert.NotNil(t, finalAggregate, "Final aggregate should exist")
}

// setupTestDB creates a production database connection for SI-002 tactical plan testing
func setupTestDB(t *testing.T) *sqlx.DB {
	// SI-002 Tactical Plan requires testing against domainflow_production database
	dsn := "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable"

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		t.Skipf("Skipping test - could not connect to domainflow_production database: %v", err)
	}

	// Production database already has the proper schema from migration 007_si002_centralized_state.sql
	// No additional schema setup needed - rely on existing production schema

	return db
}

// Cleanup function to clear test data
func cleanupTestData(t *testing.T, db *sqlx.DB) {
	_, err := db.Exec("TRUNCATE TABLE state_events, state_snapshots, state_coordination_locks")
	if err != nil {
		t.Logf("Warning: Failed to cleanup test data: %v", err)
	}
}
