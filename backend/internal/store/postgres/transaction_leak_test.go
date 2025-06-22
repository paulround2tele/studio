// File: backend/internal/store/postgres/transaction_leak_test.go
package postgres

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // PostgreSQL driver
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestTransactionLeakDetection tests the transaction leak detection infrastructure
func TestTransactionLeakDetection(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	t.Run("TransactionManager_BasicLifecycle", func(t *testing.T) {
		tm := NewTransactionManager(db)

		// Test normal transaction lifecycle
		err := tm.SafeTransaction(context.Background(), nil, "test_operation", func(tx *sqlx.Tx) error {
			// Simulate work
			time.Sleep(10 * time.Millisecond)
			return nil
		})

		assert.NoError(t, err)
		assert.Equal(t, int64(0), tm.GetActiveTransactionCount())
	})

	t.Run("TransactionManager_ErrorHandling", func(t *testing.T) {
		tm := NewTransactionManager(db)

		// Test transaction rollback on error
		err := tm.SafeTransaction(context.Background(), nil, "test_error", func(tx *sqlx.Tx) error {
			return assert.AnError
		})

		assert.Error(t, err)
		assert.Equal(t, int64(0), tm.GetActiveTransactionCount())
	})

	t.Run("TransactionManager_LeakDetection", func(t *testing.T) {
		tm := NewTransactionManager(db)

		// Start a long-running transaction to simulate a leak
		done := make(chan bool)
		go func() {
			defer close(done)
			err := tm.SafeTransaction(context.Background(), nil, "long_running", func(tx *sqlx.Tx) error {
				time.Sleep(100 * time.Millisecond)
				return nil
			})
			assert.NoError(t, err)
		}()

		// Check for active transactions during execution
		time.Sleep(20 * time.Millisecond)
		assert.Equal(t, int64(1), tm.GetActiveTransactionCount())

		// Wait for completion
		<-done
		assert.Equal(t, int64(0), tm.GetActiveTransactionCount())
	})

	t.Run("TransactionManager_ConcurrentTransactions", func(t *testing.T) {
		tm := NewTransactionManager(db)
		var wg sync.WaitGroup
		numGoroutines := 10

		for i := 0; i < numGoroutines; i++ {
			wg.Add(1)
			go func(id int) {
				defer wg.Done()
				err := tm.SafeTransaction(context.Background(), nil, "concurrent_test", func(tx *sqlx.Tx) error {
					time.Sleep(50 * time.Millisecond)
					return nil
				})
				assert.NoError(t, err)
			}(i)
		}

		// Check concurrent count
		time.Sleep(10 * time.Millisecond)
		activeCount := tm.GetActiveTransactionCount()
		assert.True(t, activeCount > 0 && activeCount <= int64(numGoroutines))

		wg.Wait()
		assert.Equal(t, int64(0), tm.GetActiveTransactionCount())
	})
}

// TestPreparedStatementLeakDetection tests prepared statement leak detection
func TestPreparedStatementLeakDetection(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	t.Run("PreparedStatementManager_BasicLifecycle", func(t *testing.T) {
		psm := NewPreparedStatementManager()

		query := "SELECT 1"
		err := psm.SafePreparedStatement(context.Background(), db, query, "test_stmt", func(stmt *sqlx.NamedStmt) error {
			// Simulate work
			time.Sleep(10 * time.Millisecond)
			return nil
		})

		assert.NoError(t, err)
	})

	t.Run("PreparedStatementManager_ErrorHandling", func(t *testing.T) {
		psm := NewPreparedStatementManager()

		query := "SELECT 1"
		err := psm.SafePreparedStatement(context.Background(), db, query, "test_error", func(stmt *sqlx.NamedStmt) error {
			return assert.AnError
		})

		assert.Error(t, err)
	})
}

// TestConnectionPoolStability tests connection pool behavior under stress
func TestConnectionPoolStability(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Set conservative connection limits for testing
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(time.Minute)

	t.Run("ConnectionPool_StressTest", func(t *testing.T) {
		tm := NewTransactionManager(db)
		var wg sync.WaitGroup
		numWorkers := 20
		operationsPerWorker := 5

		for worker := 0; worker < numWorkers; worker++ {
			wg.Add(1)
			go func(workerID int) {
				defer wg.Done()

				for op := 0; op < operationsPerWorker; op++ {
					err := tm.SafeTransaction(context.Background(), nil, "stress_test", func(tx *sqlx.Tx) error {
						// Simulate database work
						var result int
						err := tx.GetContext(context.Background(), &result, "SELECT 1")
						return err
					})

					if err != nil {
						t.Errorf("Worker %d operation %d failed: %v", workerID, op, err)
					}

					// Small delay to allow connection reuse
					time.Sleep(time.Millisecond)
				}
			}(worker)
		}

		wg.Wait()

		// Verify no transactions are left active
		assert.Equal(t, int64(0), tm.GetActiveTransactionCount())

		// Verify connection pool is stable
		stats := db.Stats()
		assert.True(t, stats.OpenConnections <= 5, "Connection pool exceeded max connections")
	})
}

// TestCampaignJobStoreLeakPrevention tests the fixed GetNextQueuedJob method
func TestCampaignJobStoreLeakPrevention(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	// Create test tables
	createTestTables(t, db)

	store := NewCampaignJobStorePostgres(db)
	campaignStore := NewCampaignStorePostgres(db)

	t.Run("GetNextQueuedJob_NoLeaksOnSuccess", func(t *testing.T) {
		// First create a test campaign (required for foreign key constraint)
		campaignID := uuid.New()
		campaign := &models.Campaign{
			ID:           campaignID,
			Name:         "Test Campaign for Job",
			CampaignType: models.CampaignTypeDomainGeneration,
			Status:       models.CampaignStatusPending,
			CreatedAt:    time.Now().UTC(),
			UpdatedAt:    time.Now().UTC(),
		}

		err := campaignStore.CreateCampaign(context.Background(), db, campaign)
		require.NoError(t, err)

		// Now create a test job with valid campaign ID
		job := &models.CampaignJob{
			ID:          uuid.New(),
			CampaignID:  campaignID, // Use the actual campaign ID
			JobType:     models.CampaignTypeDomainGeneration,
			Status:      models.JobStatusQueued,
			MaxAttempts: 3, // Required: must be > 0 per database constraint
		}

		err = store.CreateJob(context.Background(), nil, job)
		require.NoError(t, err)

		// Get initial connection count
		initialStats := db.Stats()

		// Retrieve the job
		retrievedJob, err := store.GetNextQueuedJob(context.Background(), []models.CampaignTypeEnum{models.CampaignTypeDomainGeneration}, "test-worker")
		assert.NoError(t, err)
		assert.NotNil(t, retrievedJob)

		// Verify no connection leaks
		finalStats := db.Stats()
		assert.Equal(t, initialStats.OpenConnections, finalStats.OpenConnections)
	})

	t.Run("GetNextQueuedJob_NoLeaksOnNoJobs", func(t *testing.T) {
		// Get initial connection count
		initialStats := db.Stats()

		// Try to get a job when none exist
		_, err := store.GetNextQueuedJob(context.Background(), []models.CampaignTypeEnum{models.CampaignTypeDNSValidation}, "test-worker")
		assert.Error(t, err)

		// Verify no connection leaks
		finalStats := db.Stats()
		assert.Equal(t, initialStats.OpenConnections, finalStats.OpenConnections)
	})
}

// TestTimeout verifies timeout handling
func TestTimeout(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	t.Run("WithTimeout_ShortTimeout", func(t *testing.T) {
		tm := NewTransactionManager(db)

		ctx, cancel := WithTimeout(context.Background(), 10*time.Millisecond)
		defer cancel()

		err := tm.SafeTransaction(ctx, nil, "timeout_test", func(tx *sqlx.Tx) error {
			// This should timeout
			time.Sleep(50 * time.Millisecond)
			return nil
		})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "context deadline exceeded")

		// Verify transaction is cleaned up despite timeout
		time.Sleep(10 * time.Millisecond)
		assert.Equal(t, int64(0), tm.GetActiveTransactionCount())
	})
}

// Benchmark tests for performance impact
func BenchmarkTransactionManager(b *testing.B) {
	db := setupTestDB(b)
	defer db.Close()

	tm := NewTransactionManager(db)

	b.Run("SafeTransaction", func(b *testing.B) {
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			err := tm.SafeTransaction(context.Background(), nil, "benchmark", func(tx *sqlx.Tx) error {
				var result int
				return tx.GetContext(context.Background(), &result, "SELECT 1")
			})
			if err != nil {
				b.Fatal(err)
			}
		}
	})

	b.Run("DirectTransaction", func(b *testing.B) {
		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			tx, err := db.BeginTxx(context.Background(), nil)
			if err != nil {
				b.Fatal(err)
			}

			var result int
			err = tx.GetContext(context.Background(), &result, "SELECT 1")
			if err != nil {
				tx.Rollback()
				b.Fatal(err)
			}

			err = tx.Commit()
			if err != nil {
				b.Fatal(err)
			}
		}
	})
}

// Helper functions for test setup
func setupTestDB(t testing.TB) *sqlx.DB {
	// Use PostgreSQL test database
	dsn := os.Getenv("TEST_POSTGRES_DSN")
	if dsn == "" {
		dsn = "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable"
	}

	db, err := sqlx.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}

	return db
}

func createTestTables(t *testing.T, db *sqlx.DB) {
	// Tables should already exist in the PostgreSQL test database
	// This function is kept for compatibility but no longer creates tables
	// since we're using the actual production database schema
}
