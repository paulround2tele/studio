package services

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestBF002WorkerCoordination tests worker coordination and registration
func TestBF002WorkerCoordination(t *testing.T) {
	// Skip if not integration test
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	db := setupBF002TestDB(t)
	defer db.Close()

	ctx := context.Background()
	// Use existing campaign ID from campaigns table
	campaignID := uuid.MustParse("c6590932-b172-4e8a-937d-9c1154263aed")

	// Cleanup any existing workers before tests
	cleanupWorkers(t, db, campaignID)

	// Test worker registration
	t.Run("WorkerRegistration", func(t *testing.T) {
		// Clean up before this specific test
		cleanupWorkers(t, db, campaignID)

		workerSvc := NewWorkerCoordinationService(db, "test-worker-1")
		defer workerSvc.StopHeartbeat()

		err := workerSvc.RegisterWorker(ctx, campaignID, "domain_generation")
		require.NoError(t, err)

		// Verify worker is registered
		workers, err := workerSvc.GetActiveWorkers(ctx, campaignID)
		require.NoError(t, err)
		assert.Len(t, workers, 1)
		assert.Equal(t, "test-worker-1", workers[0].WorkerID)
		assert.Equal(t, "domain_generation", workers[0].WorkerType)
	})

	// Test heartbeat mechanism
	t.Run("HeartbeatMechanism", func(t *testing.T) {
		// Clean up before this specific test
		cleanupWorkers(t, db, campaignID)

		workerSvc := NewWorkerCoordinationService(db, "test-worker-heartbeat")

		err := workerSvc.RegisterWorker(ctx, campaignID, "campaign_worker")
		require.NoError(t, err)

		// Start heartbeat
		workerSvc.StartHeartbeat(ctx)
		defer workerSvc.StopHeartbeat()

		// Wait a bit for heartbeat to update
		time.Sleep(2 * time.Second)

		// Verify worker is still active
		workers, err := workerSvc.GetActiveWorkers(ctx, campaignID)
		require.NoError(t, err)
		assert.Len(t, workers, 1)

		// Stop heartbeat and wait for cleanup
		workerSvc.StopHeartbeat()
		time.Sleep(1 * time.Second)

		// Clean up stale workers
		err = workerSvc.CleanupStaleWorkers(ctx)
		require.NoError(t, err)
	})

	// Test concurrent worker registration
	t.Run("ConcurrentWorkerRegistration", func(t *testing.T) {
		const numWorkers = 5
		var wg sync.WaitGroup
		errors := make(chan error, numWorkers)

		for i := 0; i < numWorkers; i++ {
			wg.Add(1)
			go func(workerNum int) {
				defer wg.Done()
				workerID := fmt.Sprintf("concurrent-worker-%d", workerNum)
				workerSvc := NewWorkerCoordinationService(db, workerID)
				defer workerSvc.StopHeartbeat()

				err := workerSvc.RegisterWorker(ctx, campaignID, "test_worker")
				if err != nil {
					errors <- err
					return
				}

				workerSvc.StartHeartbeat(ctx)
				time.Sleep(500 * time.Millisecond) // Keep worker active briefly
			}(i)
		}

		wg.Wait()
		close(errors)

		// Check for any errors
		for err := range errors {
			t.Errorf("Worker registration error: %v", err)
		}

		// Verify all workers are registered
		workerSvc := NewWorkerCoordinationService(db, "verifier")
		workers, err := workerSvc.GetActiveWorkers(ctx, campaignID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(workers), numWorkers)
	})
}

// TestBF002ResourceLockContention tests resource lock contention scenarios
func TestBF002ResourceLockContention(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	db := setupTestDB(t)
	defer db.Close()

	ctx := context.Background()
	resourceID := uuid.New().String()

	t.Run("ExclusiveLockContention", func(t *testing.T) {
		const numWorkers = 3
		lockResults := make(chan error, numWorkers)
		var startBarrier sync.WaitGroup
		startBarrier.Add(numWorkers)

		// Launch concurrent workers trying to acquire the same exclusive lock
		for i := 0; i < numWorkers; i++ {
			go func(workerNum int) {
				workerID := fmt.Sprintf("lock-worker-%d", workerNum)
				lockManager := NewResourceLockManager(db, workerID)

				// Wait for all workers to start simultaneously
				startBarrier.Done()
				startBarrier.Wait()

				lockID, err := lockManager.AcquireResourceLock(
					ctx,
					"test_resource",
					resourceID,
					"EXCLUSIVE",
					5*time.Second,
				)

				if err != nil {
					lockResults <- err
					return
				}

				// Hold lock briefly
				time.Sleep(100 * time.Millisecond)

				err = lockManager.ReleaseResourceLock(ctx, "test_resource", resourceID, "EXCLUSIVE")
				if err != nil {
					t.Logf("Release error for worker %d: %v", workerNum, err)
				} else {
					t.Logf("Worker %d successfully acquired and released lock %s", workerNum, lockID)
				}

				lockResults <- nil
			}(i)
		}

		// Collect results
		var successCount, errorCount int
		for i := 0; i < numWorkers; i++ {
			err := <-lockResults
			if err != nil {
				errorCount++
				t.Logf("Lock contention error: %v", err)
			} else {
				successCount++
			}
		}

		// At least one worker should succeed, others should get lock contention errors
		assert.GreaterOrEqual(t, successCount, 1, "At least one worker should acquire the lock")
		t.Logf("Lock contention results: %d successful, %d errors", successCount, errorCount)
	})

	t.Run("SharedLockScenario", func(t *testing.T) {
		const numReaders = 3
		var wg sync.WaitGroup
		errors := make(chan error, numReaders)

		// Multiple workers acquire shared locks simultaneously
		for i := 0; i < numReaders; i++ {
			wg.Add(1)
			go func(workerNum int) {
				defer wg.Done()
				workerID := fmt.Sprintf("reader-worker-%d", workerNum)
				lockManager := NewResourceLockManager(db, workerID)

				lockID, err := lockManager.AcquireResourceLock(
					ctx,
					"shared_resource",
					resourceID,
					"SHARED",
					3*time.Second,
				)

				if err != nil {
					errors <- err
					return
				}

				// Hold shared lock briefly
				time.Sleep(200 * time.Millisecond)

				err = lockManager.ReleaseResourceLock(ctx, "shared_resource", resourceID, "SHARED")
				if err != nil {
					errors <- fmt.Errorf("release error for worker %d: %w", workerNum, err)
				} else {
					t.Logf("Reader worker %d successfully used shared lock %s", workerNum, lockID)
				}

				errors <- nil
			}(i)
		}

		wg.Wait()
		close(errors)

		// All readers should succeed with shared locks
		successCount := 0
		for err := range errors {
			if err != nil {
				t.Errorf("Shared lock error: %v", err)
			} else {
				successCount++
			}
		}

		assert.Equal(t, numReaders, successCount, "All readers should acquire shared locks")
	})
}

// TestBF002DomainGenerationBatchCoordination tests coordinated domain generation
func TestBF002DomainGenerationBatchCoordination(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	db := setupBF002TestDB(t)
	defer db.Close()

	ctx := context.Background()

	// Create test stores
	campaignStore := postgres.NewCampaignStorePostgres(db)
	auditStore := postgres.NewAuditLogStorePostgres(db)

	// Create domain generation service with coordination
	domainSvc := NewDomainGenerationService(db, campaignStore, nil, auditStore, nil)

	// Create a test campaign
	campaignID := uuid.New()
	campaign := &models.Campaign{
		ID:                 campaignID,
		Name:               "BF002 Test Campaign",
		CampaignType:       models.CampaignTypeDomainGeneration,
		Status:             models.CampaignStatusPending,
		CreatedAt:          time.Now().UTC(),
		UpdatedAt:          time.Now().UTC(),
		TotalItems:         models.Int64Ptr(100),
		ProcessedItems:     models.Int64Ptr(0),
		ProgressPercentage: models.Float64Ptr(0.0),
	}

	// Create domain generation params
	domainParams := &models.DomainGenerationCampaignParams{
		CampaignID:                campaignID,
		PatternType:               "prefix",
		VariableLength:            models.IntPtr(3),
		CharacterSet:              models.StringPtr("abc"),
		ConstantString:            models.StringPtr(""),
		TLD:                       ".test",
		NumDomainsToGenerate:      100,
		TotalPossibleCombinations: 27, // 3^3
		CurrentOffset:             0,
	}

	campaign.DomainGenerationParams = domainParams

	// Store the campaign
	err := campaignStore.CreateCampaign(ctx, db, campaign)
	require.NoError(t, err)

	err = campaignStore.CreateDomainGenerationParams(ctx, db, domainParams)
	require.NoError(t, err)

	// Create domain generation batches for testing
	err = createTestDomainGenerationBatches(t, db, campaignID, 5)
	require.NoError(t, err)

	t.Run("CoordinatedBatchProcessing", func(t *testing.T) {
		// Test coordinated batch processing
		err := domainSvc.(*domainGenerationServiceImpl).ProcessDomainGenerationBatch(ctx, campaignID)
		require.NoError(t, err)

		// Verify batch was processed
		updatedCampaign, err := campaignStore.GetCampaignByID(ctx, db, campaignID)
		require.NoError(t, err)

		if updatedCampaign.ProcessedItems != nil {
			assert.Greater(t, *updatedCampaign.ProcessedItems, int64(0), "Some domains should be processed")
		}
	})

	t.Run("ConcurrentBatchProcessing", func(t *testing.T) {
		// Properly reset campaign state for concurrent test
		campaign.Status = models.CampaignStatusRunning
		campaign.ProcessedItems = models.Int64Ptr(0)
		err := campaignStore.UpdateCampaign(ctx, db, campaign)
		require.NoError(t, err)

		// Reset domain generation params offset
		_, err = db.ExecContext(ctx, `
			UPDATE domain_generation_campaign_params
			SET current_offset = 0
			WHERE campaign_id = $1
		`, campaignID)
		require.NoError(t, err)

		// Clear any existing generated domains
		_, err = db.ExecContext(ctx, `
			DELETE FROM generated_domains WHERE domain_generation_campaign_id = $1
		`, campaignID)
		require.NoError(t, err)

		// Reset batch statuses to pending
		_, err = db.ExecContext(ctx, `
			UPDATE domain_generation_batches
			SET status = 'pending', assigned_worker_id = NULL, started_at = NULL, completed_at = NULL
			WHERE campaign_id = $1
		`, campaignID)
		require.NoError(t, err)

		const numWorkers = 3
		var wg sync.WaitGroup
		errors := make(chan error, numWorkers)

		// Launch concurrent batch processors
		for i := 0; i < numWorkers; i++ {
			wg.Add(1)
			go func(workerNum int) {
				defer wg.Done()

				// Each worker gets its own service instance
				workerDomainSvc := NewDomainGenerationService(db, campaignStore, nil, auditStore, nil)

				err := workerDomainSvc.(*domainGenerationServiceImpl).ProcessDomainGenerationBatch(ctx, campaignID)
				errors <- err
			}(i)
		}

		wg.Wait()
		close(errors)

		// Check for errors
		errorCount := 0
		for err := range errors {
			if err != nil {
				errorCount++
				t.Logf("Concurrent batch processing error: %v", err)
			}
		}

		// Some workers may fail due to coordination, but overall progress should be made
		finalCampaign, err := campaignStore.GetCampaignByID(ctx, db, campaignID)
		require.NoError(t, err)

		if finalCampaign.ProcessedItems != nil {
			assert.Greater(t, *finalCampaign.ProcessedItems, int64(0), "Progress should be made despite coordination")
		}

		t.Logf("Concurrent processing result: %d errors, final processed items: %v",
			errorCount, finalCampaign.ProcessedItems)
	})
}

// TestBF002CampaignWorkerCoordination tests coordinated worker operations
func TestBF002CampaignWorkerCoordination(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	db := setupBF002TestDB(t)
	defer db.Close()

	ctx := context.Background()
	// Use existing campaign ID from campaigns table
	campaignID := uuid.MustParse("6f0f3812-3725-4467-a366-64fadbc5a296")

	// Create mock stores
	jobStore := &mockCampaignJobStore{}

	// Create campaign worker service with coordination
	appConfig := &config.AppConfig{
		Worker: config.WorkerConfig{
			PollIntervalSeconds:         1,
			MaxJobRetries:               3,
			ErrorRetryDelaySeconds:      1,
			JobProcessingTimeoutMinutes: 5,
		},
	}

	workerSvc := NewCampaignWorkerService(
		jobStore,
		nil, // domain service
		nil, // dns service
		nil, // http keyword service
		nil, // orchestrator service
		"test-worker",
		appConfig,
		db,
	).(*campaignWorkerServiceImpl)

	t.Run("CoordinatedOperation", func(t *testing.T) {
		operationExecuted := false

		err := workerSvc.ConcurrentWorkerOperation(
			ctx,
			campaignID,
			"test_operation",
			func(ctx context.Context, id uuid.UUID) error {
				operationExecuted = true
				assert.Equal(t, campaignID, id)
				time.Sleep(100 * time.Millisecond) // Simulate work
				return nil
			},
		)

		require.NoError(t, err)
		assert.True(t, operationExecuted, "Operation should be executed")
	})

	t.Run("ConcurrentOperationContention", func(t *testing.T) {
		const numWorkers = 3
		var wg sync.WaitGroup
		errors := make(chan error, numWorkers)

		// Launch concurrent operations
		for i := 0; i < numWorkers; i++ {
			wg.Add(1)
			go func(workerNum int) {
				defer wg.Done()

				workerID := fmt.Sprintf("test-worker-%d", workerNum)
				workerInstance := NewCampaignWorkerService(
					jobStore,
					nil, nil, nil, nil,
					workerID,
					appConfig,
					db,
				).(*campaignWorkerServiceImpl)

				err := workerInstance.ConcurrentWorkerOperation(
					ctx,
					campaignID,
					"concurrent_test",
					func(ctx context.Context, id uuid.UUID) error {
						// Simulate atomic operation
						time.Sleep(50 * time.Millisecond)
						return nil
					},
				)

				errors <- err
			}(i)
		}

		wg.Wait()
		close(errors)

		// Check results
		successCount := 0
		for err := range errors {
			if err != nil {
				t.Logf("Concurrent operation error: %v", err)
			} else {
				successCount++
			}
		}

		assert.GreaterOrEqual(t, successCount, 1, "At least one operation should succeed")
		t.Logf("Concurrent operation results: %d successful", successCount)
	})

	t.Run("WorkerStats", func(t *testing.T) {
		stats, err := workerSvc.GetWorkerStats(ctx)
		require.NoError(t, err)

		assert.True(t, stats["coordination_enabled"].(bool))
		assert.Equal(t, "test-worker", stats["worker_id"])
		assert.Contains(t, stats, "total_workers")
	})

	t.Run("StaleWorkerCleanup", func(t *testing.T) {
		err := workerSvc.CleanupStaleWorkers(ctx)
		require.NoError(t, err)
	})
}

// Mock implementations for testing
type mockCampaignJobStore struct{}

func (m *mockCampaignJobStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return nil, fmt.Errorf("mock does not support transactions")
}

func (m *mockCampaignJobStore) CreateJob(ctx context.Context, exec store.Querier, job *models.CampaignJob) error {
	return nil
}

func (m *mockCampaignJobStore) GetJobByID(ctx context.Context, jobID uuid.UUID) (*models.CampaignJob, error) {
	return nil, store.ErrNotFound
}

func (m *mockCampaignJobStore) UpdateJob(ctx context.Context, exec store.Querier, job *models.CampaignJob) error {
	return nil
}

func (m *mockCampaignJobStore) ListJobs(ctx context.Context, filter store.ListJobsFilter) ([]*models.CampaignJob, error) {
	return []*models.CampaignJob{}, nil
}

func (m *mockCampaignJobStore) GetNextQueuedJob(ctx context.Context, campaignTypes []models.CampaignTypeEnum, workerID string) (*models.CampaignJob, error) {
	return nil, store.ErrNotFound
}

func (m *mockCampaignJobStore) DeleteJob(ctx context.Context, jobID uuid.UUID) error {
	return nil
}

// setupBF002TestDB creates a test database connection for BF-002 tests
func setupBF002TestDB(t *testing.T) *sqlx.DB {
	// This would typically connect to a test database
	// For integration tests, you'd use a real PostgreSQL test instance
	// For now, we'll skip if no test DB is available

	dbURL := "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable"
	db, err := sqlx.Open("postgres", dbURL)
	if err != nil {
		t.Skip("Test database not available:", err)
	}

	// Test connection
	if err := db.Ping(); err != nil {
		t.Skip("Test database not reachable:", err)
	}

	return db
}

// cleanupWorkers removes all workers for a given campaign to ensure test isolation
func cleanupWorkers(t *testing.T, db *sqlx.DB, campaignID uuid.UUID) {
	ctx := context.Background()
	_, err := db.ExecContext(ctx, `
		DELETE FROM worker_coordination
		WHERE campaign_id = $1
	`, campaignID)
	if err != nil {
		t.Logf("Warning: Failed to cleanup workers: %v", err)
	}
}

// createTestDomainGenerationBatches creates test batches in the domain_generation_batches table
func createTestDomainGenerationBatches(t *testing.T, db *sqlx.DB, campaignID uuid.UUID, numBatches int) error {
	ctx := context.Background()

	for i := 0; i < numBatches; i++ {
		batchID := uuid.New()
		batchNumber := i + 1
		totalDomains := 10 // Each batch will process 10 domains

		_, err := db.ExecContext(ctx, `
			INSERT INTO domain_generation_batches (
				batch_id,
				campaign_id,
				batch_number,
				total_domains,
				status,
				created_at
			) VALUES ($1, $2, $3, $4, 'pending', NOW())
		`, batchID, campaignID, batchNumber, totalDomains)

		if err != nil {
			return fmt.Errorf("failed to create test batch %d: %w", i, err)
		}
	}

	return nil
}

// TestBF002IntegrationSuite runs the complete BF-002 integration test suite
func TestBF002IntegrationSuite(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test suite in short mode")
	}

	// Setup global cleanup
	db := setupBF002TestDB(t)
	defer db.Close()

	// Clean up all workers before starting integration suite
	ctx := context.Background()
	_, err := db.ExecContext(ctx, "DELETE FROM worker_coordination")
	if err != nil {
		t.Logf("Warning: Failed to cleanup all workers: %v", err)
	}

	t.Run("WorkerCoordination", TestBF002WorkerCoordination)
	t.Run("ResourceLockContention", TestBF002ResourceLockContention)
	t.Run("DomainGenerationBatchCoordination", TestBF002DomainGenerationBatchCoordination)
	t.Run("CampaignWorkerCoordination", TestBF002CampaignWorkerCoordination)
}
