// File: backend/internal/store/postgres/resource_cleanup_integration_test.go
package postgres

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testStore wraps stores for testing
type testStore struct {
	db               *sqlx.DB
	campaignStore    *campaignStorePostgres
	campaignJobStore *campaignJobStorePostgres
	keywordStore     *keywordStorePostgres
	txManager        *TransactionManager
	stmtManager      *PreparedStatementManager
}

// setupTestStore creates a test store instance with all dependencies
func setupTestStore(t *testing.T) *testStore {
	// This would normally connect to a test database
	// For now, we'll skip if no test DB is available
	if testing.Short() {
		t.Skip("Skipping integration test - requires database")
	}

	// In a real setup, you'd create a test database connection here
	// This is a placeholder that would need actual test DB setup
	t.Skip("Test database setup not implemented - would need actual test DB")
	return nil
}

// cleanupTestStore cleans up test resources
func cleanupTestStore(t *testing.T, store *testStore) {
	if store != nil && store.db != nil {
		store.db.Close()
	}
}

// TestConnectionPoolStabilityUnderStress tests that connection pools remain stable
// under high concurrency and error conditions
func TestConnectionPoolStabilityUnderStress(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	store := setupTestStore(t)
	defer cleanupTestStore(t, store)

	// Get initial connection pool stats
	initialStats := store.db.Stats()
	t.Logf("Initial connection pool stats: Open=%d, InUse=%d, Idle=%d",
		initialStats.OpenConnections, initialStats.InUse, initialStats.Idle)

	// Create test campaign
	campaign := &models.Campaign{
		ID:        uuid.New(),
		Name:      "Stress Test Campaign",
		UserID:    &uuid.UUID{},
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := store.campaignStore.CreateCampaign(context.Background(), store.db, campaign)
	require.NoError(t, err)

	// Run high-concurrency operations
	const numGoroutines = 50
	const operationsPerGoroutine = 20

	var wg sync.WaitGroup
	errChan := make(chan error, numGoroutines*operationsPerGoroutine)

	// Test concurrent transaction operations
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			for j := 0; j < operationsPerGoroutine; j++ {
				// Mix of successful and failing operations
				if j%3 == 0 {
					// Test successful transaction
					err := testSuccessfulTransaction(store, campaign.ID)
					if err != nil {
						errChan <- err
					}
				} else if j%3 == 1 {
					// Test transaction that fails but should cleanup properly
					err := testFailingTransaction(store, campaign.ID)
					if err != nil {
						errChan <- err
					}
				} else {
					// Test prepared statement operations
					err := testPreparedStatementOperations(store, campaign.ID)
					if err != nil {
						errChan <- err
					}
				}
			}
		}(i)
	}

	// Wait for all operations to complete
	wg.Wait()
	close(errChan)

	// Check for unexpected errors
	var errors []error
	for err := range errChan {
		errors = append(errors, err)
	}

	if len(errors) > 0 {
		t.Logf("Encountered %d errors during stress test:", len(errors))
		for _, err := range errors {
			t.Logf("  - %v", err)
		}
	}

	// Allow time for cleanup
	time.Sleep(2 * time.Second)

	// Verify connection pool stability
	finalStats := store.db.Stats()
	t.Logf("Final connection pool stats: Open=%d, InUse=%d, Idle=%d",
		finalStats.OpenConnections, finalStats.InUse, finalStats.Idle)

	// Assert connection pool health
	assert.LessOrEqual(t, finalStats.InUse, int32(5),
		"Too many connections in use after stress test")
	assert.LessOrEqual(t, finalStats.OpenConnections, int32(20),
		"Too many open connections after stress test")

	// Verify no transaction leaks
	activeTransactions := store.txManager.GetActiveTransactionCount()

	assert.Equal(t, int64(0), activeTransactions,
		"Active transactions should be zero after cleanup")

	// Check for any leaked transactions with longer duration
	leaks := store.txManager.DetectLeaks(1 * time.Second)
	assert.Empty(t, leaks, "Should have no transaction leaks detected")
}

// testSuccessfulTransaction tests a successful transaction operation
func testSuccessfulTransaction(store *testStore, campaignID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	jobID := uuid.New()
	job := &models.CampaignJob{
		ID:         jobID,
		CampaignID: campaignID,
		Status:     "queued",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	// Create job
	err := store.campaignJobStore.CreateJob(ctx, store.db, job)
	if err != nil {
		return err
	}

	// Update job status
	job.Status = "completed"
	return store.campaignJobStore.UpdateJob(ctx, store.db, job)
}

// testFailingTransaction tests transaction operations that should fail but cleanup properly
func testFailingTransaction(store *testStore, campaignID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Attempt to get next job when none exist
	// This should not leak transactions even if it fails
	_, _ = store.campaignJobStore.GetNextQueuedJob(ctx, []models.CampaignTypeEnum{models.CampaignTypeDomainGeneration}, "test-worker")

	// We expect this to fail sometimes, but it should not leak resources
	return nil // Don't propagate expected errors
}

// testPreparedStatementOperations tests bulk operations that use prepared statements
func testPreparedStatementOperations(store *testStore, campaignID uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Create test domains
	domains := []*models.GeneratedDomain{
		{
			ID:                   uuid.New(),
			GenerationCampaignID: campaignID,
			DomainName:           "test1.example.com",
			CreatedAt:            time.Now(),
		},
		{
			ID:                   uuid.New(),
			GenerationCampaignID: campaignID,
			DomainName:           "test2.example.com",
			CreatedAt:            time.Now(),
		},
	}

	// This uses prepared statements internally
	return store.campaignStore.CreateGeneratedDomains(ctx, store.db, domains)
}

// TestTransactionTimeoutRecovery tests that transactions are properly cleaned up on timeout
func TestTransactionTimeoutRecovery(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	store := setupTestStore(t)
	defer cleanupTestStore(t, store)

	// Create campaign for testing
	campaign := &models.Campaign{
		ID:        uuid.New(),
		Name:      "Timeout Test Campaign",
		UserID:    &uuid.UUID{},
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := store.campaignStore.CreateCampaign(context.Background(), store.db, campaign)
	require.NoError(t, err)

	// Test very short timeout that should trigger cleanup
	shortCtx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	// This should timeout and trigger cleanup
	_, err = store.campaignJobStore.GetNextQueuedJob(shortCtx, []models.CampaignTypeEnum{models.CampaignTypeDomainGeneration}, "test-worker")

	// The operation should fail due to timeout
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "context deadline exceeded")

	// Allow time for cleanup
	time.Sleep(1 * time.Second)

	// Verify no leaked resources
	activeTransactions := store.txManager.GetActiveTransactionCount()

	assert.Equal(t, int64(0), activeTransactions,
		"Should have no active transactions after timeout")

	// Check for leaks
	leaks := store.txManager.DetectLeaks(500 * time.Millisecond)
	assert.Empty(t, leaks, "Should have no transaction leaks after timeout")
}

// TestConcurrentResourceCleanup tests that concurrent operations don't interfere with cleanup
func TestConcurrentResourceCleanup(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	store := setupTestStore(t)
	defer cleanupTestStore(t, store)

	const numWorkers = 20
	const opsPerWorker = 10

	var wg sync.WaitGroup

	// Create test campaign
	campaign := &models.Campaign{
		ID:        uuid.New(),
		Name:      "Concurrent Test Campaign",
		UserID:    &uuid.UUID{},
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := store.campaignStore.CreateCampaign(context.Background(), store.db, campaign)
	require.NoError(t, err)

	// Start multiple workers doing different operations
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			for j := 0; j < opsPerWorker; j++ {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)

				switch j % 4 {
				case 0:
					// Transaction operation
					job := &models.CampaignJob{
						ID:         uuid.New(),
						CampaignID: campaign.ID,
						Status:     "queued",
						CreatedAt:  time.Now(),
						UpdatedAt:  time.Now(),
					}
					store.campaignJobStore.CreateJob(ctx, store.db, job)

				case 1:
					// Prepared statement operation
					domains := []*models.GeneratedDomain{
						{
							ID:                   uuid.New(),
							GenerationCampaignID: campaign.ID,
							DomainName:           "concurrent.example.com",
							CreatedAt:            time.Now(),
						},
					}
					store.campaignStore.CreateGeneratedDomains(ctx, store.db, domains)

				case 2:
					// Query operation
					store.campaignJobStore.GetNextQueuedJob(ctx, []models.CampaignTypeEnum{models.CampaignTypeDomainGeneration}, "test-worker")

				case 3:
					// Keyword operation
					rules := []*models.KeywordRule{
						{
							ID:        uuid.New(),
							Pattern:   "test",
							CreatedAt: time.Now(),
						},
					}
					store.keywordStore.CreateKeywordRules(ctx, store.db, rules)
				}

				cancel()
			}
		}(i)
	}

	// Wait for all workers to complete
	wg.Wait()

	// Allow time for all cleanup to complete
	time.Sleep(3 * time.Second)

	// Verify clean state
	activeTransactions := store.txManager.GetActiveTransactionCount()

	assert.Equal(t, int64(0), activeTransactions,
		"All transactions should be cleaned up")

	// Check for any leaks
	leaks := store.txManager.DetectLeaks(1 * time.Second)
	assert.Empty(t, leaks, "Should have no transaction leaks in concurrent test")

	// Verify connection pool health
	stats := store.db.Stats()
	assert.LessOrEqual(t, stats.InUse, int32(2),
		"Connection pool should be healthy")
}

// TestResourceLeakDetection tests that the leak detection system works correctly
func TestResourceLeakDetection(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	store := setupTestStore(t)
	defer cleanupTestStore(t, store)

	// Get initial metrics
	initialTxCount := store.txManager.GetActiveTransactionCount()

	// Perform some operations
	ctx := context.Background()
	campaign := &models.Campaign{
		ID:        uuid.New(),
		Name:      "Leak Detection Test",
		UserID:    &uuid.UUID{},
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := store.campaignStore.CreateCampaign(ctx, store.db, campaign)
	require.NoError(t, err)

	// Create some jobs to exercise the transaction system
	for i := 0; i < 10; i++ {
		job := &models.CampaignJob{
			ID:         uuid.New(),
			CampaignID: campaign.ID,
			Status:     "queued",
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		err := store.campaignJobStore.CreateJob(ctx, store.db, job)
		require.NoError(t, err)
	}

	// Wait for cleanup
	time.Sleep(1 * time.Second)

	// Get final metrics
	finalTxCount := store.txManager.GetActiveTransactionCount()

	// Verify metrics show no leaks
	assert.Equal(t, int64(0), finalTxCount,
		"Should have no active transactions")

	// Check for any leaks
	leaks := store.txManager.DetectLeaks(500 * time.Millisecond)
	assert.Empty(t, leaks, "Should have detected no transaction leaks")

	// Verify we had activity (initial count should have been 0)
	assert.Equal(t, int64(0), initialTxCount,
		"Should have started with no active transactions")
}
