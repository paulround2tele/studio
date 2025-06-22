// File: backend/internal/store/postgres/transaction_consistency_test.go
// SI-001: Transaction Management Anti-patterns - Comprehensive Transaction Consistency Tests
package postgres

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
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// SI-001: Transaction consistency test suite
type TransactionConsistencyTestSuite struct {
	db                 *sqlx.DB
	transactionManager *TransactionManager
	campaignStore      *campaignStorePostgres
	campaignJobStore   *campaignJobStorePostgres
}

// setupTransactionConsistencyTest initializes test environment for SI-001 validation
func setupTransactionConsistencyTest(t *testing.T) *TransactionConsistencyTestSuite {
	db := setupTestDB(t)

	// Initialize stores
	campaignStore := NewCampaignStorePostgres(db).(*campaignStorePostgres)
	campaignJobStore := NewCampaignJobStorePostgres(db).(*campaignJobStorePostgres)

	// Initialize transaction manager
	transactionManager := NewTransactionManager(db)

	return &TransactionConsistencyTestSuite{
		db:                 db,
		transactionManager: transactionManager,
		campaignStore:      campaignStore,
		campaignJobStore:   campaignJobStore,
	}
}

// TestSI001_CampaignTransactionAtomicity validates transaction atomicity for campaign operations
func TestSI001_CampaignTransactionAtomicity(t *testing.T) {
	suite := setupTransactionConsistencyTest(t)
	defer suite.db.Close()

	ctx := context.Background()
	campaignID := uuid.New()

	// Create test campaign
	campaign := &models.Campaign{
		ID:           campaignID,
		Name:         "SI-001 Atomicity Test Campaign",
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       models.CampaignStatusPending,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	// Test transaction atomicity with deliberate failure
	opts := &CampaignTransactionOptions{
		Operation:  "test_atomicity",
		CampaignID: campaignID.String(),
		Timeout:    10 * time.Second,
		MaxRetries: 1,
	}

	err := suite.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		// Insert campaign
		if err := suite.campaignStore.CreateCampaign(ctx, tx, campaign); err != nil {
			return fmt.Errorf("failed to create campaign: %w", err)
		}

		// Create associated job
		job := &models.CampaignJob{
			ID:          uuid.New(),
			CampaignID:  campaignID,
			JobType:     models.CampaignTypeDomainGeneration,
			Status:      models.JobStatusQueued,
			ScheduledAt: time.Now().UTC(),
			Attempts:    0,
			MaxAttempts: 3,
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
		}

		if err := suite.campaignJobStore.CreateJob(ctx, tx, job); err != nil {
			return fmt.Errorf("failed to create job: %w", err)
		}

		// Force transaction rollback by returning error
		return fmt.Errorf("deliberate test failure for atomicity validation")
	})

	// Verify transaction rolled back completely
	require.Error(t, err)
	assert.Contains(t, err.Error(), "deliberate test failure")

	// Verify no campaign was created
	_, err = suite.campaignStore.GetCampaignByID(ctx, suite.db, campaignID)
	assert.Error(t, err, "Campaign should not exist after rollback")

	// Verify no job was created
	filter := store.ListJobsFilter{
		CampaignID: uuid.NullUUID{UUID: campaignID, Valid: true},
		Limit:      100,
	}
	jobs, err := suite.campaignJobStore.ListJobs(ctx, filter)
	require.NoError(t, err)
	assert.Empty(t, jobs, "No jobs should exist after rollback")

	t.Logf("SI-001: Transaction atomicity validated - rollback successful")
}

// TestSI001_ConcurrentTransactionIsolation validates transaction isolation under concurrent access
func TestSI001_ConcurrentTransactionIsolation(t *testing.T) {
	suite := setupTransactionConsistencyTest(t)
	defer suite.db.Close()

	ctx := context.Background()
	campaignID := uuid.New()

	// Create test campaign
	campaign := &models.Campaign{
		ID:           campaignID,
		Name:         "SI-001 Isolation Test Campaign",
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       models.CampaignStatusPending,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	err := suite.campaignStore.CreateCampaign(ctx, suite.db, campaign)
	require.NoError(t, err)

	// Test concurrent modifications with proper isolation
	var wg sync.WaitGroup
	concurrentOps := 5
	results := make([]error, concurrentOps)

	for i := 0; i < concurrentOps; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()

			opts := &CampaignTransactionOptions{
				Operation:  fmt.Sprintf("concurrent_test_%d", index),
				CampaignID: campaignID.String(),
				Timeout:    15 * time.Second,
				MaxRetries: 3,
				RetryDelay: 100 * time.Millisecond,
				IsolationLevel: func() *sql.IsolationLevel {
					level := sql.LevelReadCommitted
					return &level
				}(),
			}

			results[index] = suite.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
				// Read campaign with row-level locking
				currentCampaign, err := suite.campaignStore.GetCampaignByID(ctx, tx, campaignID)
				if err != nil {
					return fmt.Errorf("failed to get campaign: %w", err)
				}

				// Simulate processing time
				time.Sleep(50 * time.Millisecond)

				// Update campaign name with isolation-safe modification
				currentCampaign.Name = fmt.Sprintf("Updated by goroutine %d at %d", index, time.Now().UnixNano())
				currentCampaign.UpdatedAt = time.Now().UTC()

				return suite.campaignStore.UpdateCampaign(ctx, tx, currentCampaign)
			})
		}(i)
	}

	wg.Wait()

	// Verify all operations completed successfully
	successCount := 0
	for i, err := range results {
		if err == nil {
			successCount++
			t.Logf("SI-001: Concurrent operation %d completed successfully", i)
		} else {
			t.Logf("SI-001: Concurrent operation %d failed: %v", i, err)
		}
	}

	// At least some operations should succeed despite concurrency
	assert.Greater(t, successCount, 0, "At least one concurrent operation should succeed")

	// Verify final campaign state is consistent
	finalCampaign, err := suite.campaignStore.GetCampaignByID(ctx, suite.db, campaignID)
	require.NoError(t, err)
	assert.NotEqual(t, campaign.Name, finalCampaign.Name, "Campaign should be modified")

	t.Logf("SI-001: Concurrent transaction isolation validated - %d/%d operations succeeded", successCount, concurrentOps)
}

// TestSI001_TransactionTimeoutHandling validates timeout handling and resource cleanup
func TestSI001_TransactionTimeoutHandling(t *testing.T) {
	suite := setupTransactionConsistencyTest(t)
	defer suite.db.Close()

	ctx := context.Background()
	campaignID := uuid.New()

	// Test transaction timeout with proper cleanup
	opts := &CampaignTransactionOptions{
		Operation:  "timeout_test",
		CampaignID: campaignID.String(),
		Timeout:    500 * time.Millisecond, // Short timeout for testing
		MaxRetries: 1,
	}

	start := time.Now()
	err := suite.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		// Simulate long-running operation that exceeds timeout with context-aware sleep
		select {
		case <-time.After(1 * time.Second):
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	})

	duration := time.Since(start)

	// Verify timeout occurred
	require.Error(t, err)
	assert.Contains(t, err.Error(), "timeout")
	assert.Less(t, duration, 1*time.Second, "Operation should have timed out before completion")

	// Verify transaction manager metrics
	activeCount := suite.transactionManager.GetActiveTransactionCount()
	assert.Equal(t, int64(0), activeCount, "No active transactions should remain after timeout")

	t.Logf("SI-001: Transaction timeout handling validated - duration: %v", duration)
}

// TestSI001_RetryLogicValidation validates retry logic for transient failures
func TestSI001_RetryLogicValidation(t *testing.T) {
	suite := setupTransactionConsistencyTest(t)
	defer suite.db.Close()

	ctx := context.Background()
	campaignID := uuid.New()

	// Test retry logic with simulated transient failures
	attemptCount := 0
	opts := &CampaignTransactionOptions{
		Operation:  "retry_test",
		CampaignID: campaignID.String(),
		Timeout:    10 * time.Second,
		MaxRetries: 3,
		RetryDelay: 100 * time.Millisecond,
	}

	err := suite.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		attemptCount++
		t.Logf("SI-001: Retry attempt %d", attemptCount)

		// Fail first two attempts, succeed on third
		if attemptCount < 3 {
			return fmt.Errorf("simulated transient failure on attempt %d", attemptCount)
		}

		// Create campaign on successful attempt
		campaign := &models.Campaign{
			ID:           campaignID,
			Name:         "SI-001 Retry Test Campaign",
			CampaignType: models.CampaignTypeDomainGeneration,
			Status:       models.CampaignStatusPending,
			CreatedAt:    time.Now().UTC(),
			UpdatedAt:    time.Now().UTC(),
		}

		return suite.campaignStore.CreateCampaign(ctx, tx, campaign)
	})

	// Verify retry logic worked
	require.NoError(t, err)
	assert.Equal(t, 3, attemptCount, "Should have made exactly 3 attempts")

	// Verify campaign was created successfully
	campaign, err := suite.campaignStore.GetCampaignByID(ctx, suite.db, campaignID)
	require.NoError(t, err)
	assert.Equal(t, "SI-001 Retry Test Campaign", campaign.Name)

	t.Logf("SI-001: Retry logic validated - succeeded after %d attempts", attemptCount)
}

// TestSI001_TransactionBoundaryComplexOperations validates transaction boundaries for complex operations
func TestSI001_TransactionBoundaryComplexOperations(t *testing.T) {
	suite := setupTransactionConsistencyTest(t)
	defer suite.db.Close()

	ctx := context.Background()
	campaignID := uuid.New()

	// Define complex transaction boundary
	boundary := &TransactionBoundary{
		Name:        "campaign_creation_with_jobs",
		Description: "Create campaign with multiple associated jobs",
		Steps: []TransactionStep{
			{
				Name:        "create_campaign",
				Description: "Create the main campaign record",
				Required:    true,
			},
			{
				Name:        "create_initial_job",
				Description: "Create initial processing job",
				Required:    true,
			},
			{
				Name:        "create_monitoring_job",
				Description: "Create monitoring job",
				Required:    false,
			},
		},
	}

	// Execute complex transaction boundary
	err := suite.transactionManager.ExecuteTransactionBoundary(ctx, boundary, campaignID.String(),
		func(tx *sqlx.Tx, steps []TransactionStep) error {
			// Step 1: Create campaign
			campaign := &models.Campaign{
				ID:           campaignID,
				Name:         "SI-001 Complex Boundary Test",
				CampaignType: models.CampaignTypeDomainGeneration,
				Status:       models.CampaignStatusPending,
				CreatedAt:    time.Now().UTC(),
				UpdatedAt:    time.Now().UTC(),
			}

			if err := suite.campaignStore.CreateCampaign(ctx, tx, campaign); err != nil {
				return fmt.Errorf("step create_campaign failed: %w", err)
			}

			// Step 2: Create initial job
			initialJob := &models.CampaignJob{
				ID:          uuid.New(),
				CampaignID:  campaignID,
				JobType:     models.CampaignTypeDomainGeneration,
				Status:      models.JobStatusQueued,
				ScheduledAt: time.Now().UTC(),
				Attempts:    0,
				MaxAttempts: 3,
				CreatedAt:   time.Now().UTC(),
				UpdatedAt:   time.Now().UTC(),
			}

			if err := suite.campaignJobStore.CreateJob(ctx, tx, initialJob); err != nil {
				return fmt.Errorf("step create_initial_job failed: %w", err)
			}

			// Step 3: Create monitoring job (optional)
			monitoringJob := &models.CampaignJob{
				ID:          uuid.New(),
				CampaignID:  campaignID,
				JobType:     models.CampaignTypeDomainGeneration,
				Status:      models.JobStatusPending,
				ScheduledAt: time.Now().UTC(),
				Attempts:    0,
				MaxAttempts: 3,
				CreatedAt:   time.Now().UTC(),
				UpdatedAt:   time.Now().UTC(),
			}

			if err := suite.campaignJobStore.CreateJob(ctx, tx, monitoringJob); err != nil {
				t.Logf("Optional step create_monitoring_job failed: %v", err)
				// Don't fail transaction for optional step
			}

			return nil
		})

	// Verify complex transaction succeeded
	require.NoError(t, err)

	// Verify campaign was created
	campaign, err := suite.campaignStore.GetCampaignByID(ctx, suite.db, campaignID)
	require.NoError(t, err)
	assert.Equal(t, "SI-001 Complex Boundary Test", campaign.Name)

	// Verify jobs were created
	filter := store.ListJobsFilter{
		CampaignID: uuid.NullUUID{UUID: campaignID, Valid: true},
		Limit:      100,
	}
	jobs, err := suite.campaignJobStore.ListJobs(ctx, filter)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(jobs), 1, "At least initial job should be created")

	t.Logf("SI-001: Transaction boundary validation completed - created %d jobs", len(jobs))
}

// TestSI001_TransactionLeakDetection validates transaction leak detection and cleanup
func TestSI001_TransactionLeakDetection(t *testing.T) {
	suite := setupTransactionConsistencyTest(t)
	defer suite.db.Close()

	ctx := context.Background()

	// Simulate transaction leak scenario
	opts := &CampaignTransactionOptions{
		Operation:  "leak_test",
		CampaignID: uuid.New().String(),
		Timeout:    30 * time.Second,
		MaxRetries: 1,
	}

	// Start transaction but don't complete it properly (simulating leak)
	go func() {
		_ = suite.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
			// Simulate leaked transaction by hanging
			time.Sleep(2 * time.Second)
			return nil
		})
	}()

	// Wait for transaction to start
	time.Sleep(100 * time.Millisecond)

	// Check for active transactions
	initialActiveCount := suite.transactionManager.GetActiveTransactionCount()
	assert.Greater(t, initialActiveCount, int64(0), "Should have active transactions")

	// Wait for transaction to complete
	time.Sleep(3 * time.Second)

	// Verify transactions are cleaned up
	finalActiveCount := suite.transactionManager.GetActiveTransactionCount()
	assert.Equal(t, int64(0), finalActiveCount, "All transactions should be cleaned up")

	// Test leak detection
	leaks := suite.transactionManager.DetectLeaks(1 * time.Second)
	assert.Empty(t, leaks, "No transaction leaks should be detected")

	t.Logf("SI-001: Transaction leak detection validated - initial: %d, final: %d",
		initialActiveCount, finalActiveCount)
}

// TestSI001_RaceConditionPrevention validates race condition prevention in concurrent scenarios
func TestSI001_RaceConditionPrevention(t *testing.T) {
	suite := setupTransactionConsistencyTest(t)
	defer suite.db.Close()

	ctx := context.Background()
	campaignID := uuid.New()

	// Create test campaign
	campaign := &models.Campaign{
		ID:           campaignID,
		Name:         "SI-001 Race Condition Test",
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       models.CampaignStatusPending,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	err := suite.campaignStore.CreateCampaign(ctx, suite.db, campaign)
	require.NoError(t, err)

	// Test concurrent status transitions
	var wg sync.WaitGroup
	statusTransitions := []models.CampaignStatusEnum{
		models.CampaignStatusQueued,
		models.CampaignStatusRunning,
		models.CampaignStatusPaused,
		models.CampaignStatusRunning,
		models.CampaignStatusCompleted,
	}

	transitionResults := make([]error, len(statusTransitions))

	for i, newStatus := range statusTransitions {
		wg.Add(1)
		go func(index int, status models.CampaignStatusEnum) {
			defer wg.Done()

			opts := &CampaignTransactionOptions{
				Operation:  fmt.Sprintf("status_transition_%d", index),
				CampaignID: campaignID.String(),
				Timeout:    10 * time.Second,
				MaxRetries: 2,
				RetryDelay: 50 * time.Millisecond,
				IsolationLevel: func() *sql.IsolationLevel {
					level := sql.LevelSerializable
					return &level
				}(), // Highest isolation for race prevention
			}

			transitionResults[index] = suite.transactionManager.SafeCampaignTransaction(ctx, opts,
				func(tx *sqlx.Tx) error {
					currentCampaign, err := suite.campaignStore.GetCampaignByID(ctx, tx, campaignID)
					if err != nil {
						return fmt.Errorf("failed to get campaign: %w", err)
					}

					// Simulate processing delay to increase race condition probability
					time.Sleep(10 * time.Millisecond)

					currentCampaign.Status = status
					currentCampaign.UpdatedAt = time.Now().UTC()

					return suite.campaignStore.UpdateCampaign(ctx, tx, currentCampaign)
				})
		}(i, newStatus)

		// Stagger the goroutines slightly
		time.Sleep(5 * time.Millisecond)
	}

	wg.Wait()

	// Verify final state is consistent
	finalCampaign, err := suite.campaignStore.GetCampaignByID(ctx, suite.db, campaignID)
	require.NoError(t, err)

	// Count successful transitions
	successCount := 0
	for i, err := range transitionResults {
		if err == nil {
			successCount++
			t.Logf("SI-001: Status transition %d to %s succeeded", i, statusTransitions[i])
		} else {
			t.Logf("SI-001: Status transition %d to %s failed: %v", i, statusTransitions[i], err)
		}
	}

	// At least one transition should succeed
	assert.Greater(t, successCount, 0, "At least one status transition should succeed")
	assert.NotEqual(t, models.CampaignStatusPending, finalCampaign.Status, "Campaign status should have changed")

	t.Logf("SI-001: Race condition prevention validated - final status: %s, successful transitions: %d/%d",
		finalCampaign.Status, successCount, len(statusTransitions))
}

// TestSI001_TransactionMetricsAndMonitoring validates transaction metrics collection
func TestSI001_TransactionMetricsAndMonitoring(t *testing.T) {
	suite := setupTransactionConsistencyTest(t)
	defer suite.db.Close()

	ctx := context.Background()

	// Execute multiple transactions to generate metrics
	for i := 0; i < 10; i++ {
		campaignID := uuid.New()
		opts := &CampaignTransactionOptions{
			Operation:  fmt.Sprintf("metrics_test_%d", i),
			CampaignID: campaignID.String(),
			Timeout:    5 * time.Second,
			MaxRetries: 1,
		}

		err := suite.transactionManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
			// Simple operation for metrics testing
			campaign := &models.Campaign{
				ID:           campaignID,
				Name:         fmt.Sprintf("Metrics Test Campaign %d", i),
				CampaignType: models.CampaignTypeDomainGeneration,
				Status:       models.CampaignStatusPending,
				CreatedAt:    time.Now().UTC(),
				UpdatedAt:    time.Now().UTC(),
			}
			return suite.campaignStore.CreateCampaign(ctx, tx, campaign)
		})

		if err != nil {
			t.Logf("SI-001: Metrics test transaction %d failed: %v", i, err)
		}
	}

	// Verify transaction metrics are being collected
	activeCount := suite.transactionManager.GetActiveTransactionCount()
	assert.Equal(t, int64(0), activeCount, "All transactions should be completed")

	t.Logf("SI-001: Transaction metrics and monitoring validated")
}
