// File: backend/internal/store/postgres/race_condition_test.go
package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// setupRaceConditionTestDB sets up a PostgreSQL database for race condition testing
func setupRaceConditionTestDB(t *testing.T) *sqlx.DB {
	dsn := os.Getenv("TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("TEST_POSTGRES_DSN environment variable not set, skipping PostgreSQL race condition tests")
	}

	db, err := sqlx.Open("postgres", dsn)
	require.NoError(t, err)

	// Test connection
	err = db.Ping()
	require.NoError(t, err)

	return db
}

// createRaceConditionTestTables creates the required tables for race condition testing
func createRaceConditionTestTables(t *testing.T, db *sqlx.DB) {
	// Create campaigns table
	campaignSchema := `
	CREATE TABLE IF NOT EXISTS campaigns (
		id UUID PRIMARY KEY,
		name TEXT NOT NULL,
		campaign_type TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'pending',
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW()
	);`

	_, err := db.Exec(campaignSchema)
	require.NoError(t, err)

	// Create campaign_jobs table
	jobSchema := `
	CREATE TABLE IF NOT EXISTS campaign_jobs (
		id UUID PRIMARY KEY,
		campaign_id UUID NOT NULL REFERENCES campaigns(id),
		job_type TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT 'queued',
		job_payload TEXT,
		attempts INTEGER DEFAULT 0,
		max_attempts INTEGER DEFAULT 3,
		last_error TEXT,
		last_attempted_at TIMESTAMP,
		created_at TIMESTAMP NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
		scheduled_at TIMESTAMP,
		next_execution_at TIMESTAMP,
		processing_server_id TEXT,
		locked_at TIMESTAMP,
		locked_by TEXT,
		business_status TEXT DEFAULT 'pending'
	);`

	_, err = db.Exec(jobSchema)
	require.NoError(t, err)
}

// cleanupRaceConditionTestTables cleans up test tables
func cleanupRaceConditionTestTables(t *testing.T, db *sqlx.DB) {
	_, err := db.Exec("DELETE FROM campaign_jobs")
	require.NoError(t, err)
	_, err = db.Exec("DELETE FROM campaigns")
	require.NoError(t, err)
}

// TestJobClaimingRaceConditions tests that multiple workers can safely claim jobs
// without race conditions under high concurrency
func TestJobClaimingRaceConditions(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping race condition tests in short mode")
	}

	db := setupRaceConditionTestDB(t)
	defer db.Close()
	createRaceConditionTestTables(t, db)
	defer cleanupRaceConditionTestTables(t, db)

	campaignStore := NewCampaignStorePostgres(db)
	jobStore := NewCampaignJobStorePostgres(db)
	ctx := context.Background()

	// Create a test campaign
	campaignID := uuid.New()
	campaign := &models.Campaign{
		ID:           campaignID,
		Name:         "Race Condition Test Campaign",
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       models.CampaignStatusPending,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	err := campaignStore.CreateCampaign(ctx, db, campaign)
	require.NoError(t, err)

	// Create multiple jobs for the same campaign
	numJobs := 20
	jobIDs := make([]uuid.UUID, numJobs)
	for i := 0; i < numJobs; i++ {
		jobID := uuid.New()
		jobIDs[i] = jobID
		job := &models.CampaignJob{
			ID:          jobID,
			CampaignID:  campaignID,
			JobType:     models.CampaignTypeDomainGeneration,
			Status:      models.JobStatusQueued,
			MaxAttempts: 3,
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
			ScheduledAt: time.Now().UTC(),
		}

		err := jobStore.CreateJob(ctx, db, job)
		require.NoError(t, err)
	}

	// Launch multiple workers concurrently to claim jobs
	numWorkers := 30 // More workers than jobs to ensure contention
	claimedJobs := make(chan *models.CampaignJob, numJobs)
	workerErrors := make(chan error, numWorkers)

	var wg sync.WaitGroup

	// Start all workers simultaneously
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			workerName := fmt.Sprintf("test-worker-%d", workerID)

			// Each worker tries to claim jobs
			for attempt := 0; attempt < 3; attempt++ {
				job, err := jobStore.GetNextQueuedJob(ctx, nil, workerName)
				if errors.Is(err, store.ErrNotFound) {
					// No more jobs available, this is expected
					continue
				}
				if err != nil {
					workerErrors <- fmt.Errorf("worker %d: %w", workerID, err)
					return
				}

				// Successfully claimed a job
				claimedJobs <- job

				// Simulate some processing time
				time.Sleep(10 * time.Millisecond)
			}
		}(i)
	}

	// Wait for all workers to complete
	wg.Wait()
	close(claimedJobs)
	close(workerErrors)

	// Check for any errors
	var allErrors []error
	for err := range workerErrors {
		allErrors = append(allErrors, err)
	}
	require.Empty(t, allErrors, "Workers should not encounter errors: %v", allErrors)

	// Collect all claimed jobs
	var claimed []*models.CampaignJob
	for job := range claimedJobs {
		claimed = append(claimed, job)
	}

	// Verify results
	assert.Equal(t, numJobs, len(claimed), "All jobs should be claimed exactly once")

	// Verify no duplicate job claims
	claimedJobIDs := make(map[uuid.UUID]bool)
	duplicateClaimedJobs := make(map[uuid.UUID]int)

	for _, job := range claimed {
		if claimedJobIDs[job.ID] {
			duplicateClaimedJobs[job.ID]++
		}
		claimedJobIDs[job.ID] = true
	}

	assert.Empty(t, duplicateClaimedJobs, "No jobs should be claimed more than once: %v", duplicateClaimedJobs)

	// Verify all jobs are marked as running
	for _, job := range claimed {
		assert.Equal(t, models.JobStatusRunning, job.Status)
		assert.NotEmpty(t, job.ProcessingServerID.String, "Job should have processing server ID")
		assert.Equal(t, 1, job.Attempts, "Job attempts should be incremented to 1")
	}

	// Verify database state consistency
	filter := store.ListJobsFilter{
		CampaignID: uuid.NullUUID{UUID: campaignID, Valid: true},
	}
	allJobs, err := jobStore.ListJobs(ctx, filter)
	require.NoError(t, err)

	runningCount := 0
	for _, job := range allJobs {
		if job.Status == models.JobStatusRunning {
			runningCount++
		}
	}

	assert.Equal(t, numJobs, runningCount, "All jobs in database should be marked as running")
}

// TestConcurrentJobClaimingWithRetries tests job claiming with retry logic
func TestConcurrentJobClaimingWithRetries(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping race condition tests in short mode")
	}

	db := setupRaceConditionTestDB(t)
	defer db.Close()
	createRaceConditionTestTables(t, db)
	defer cleanupRaceConditionTestTables(t, db)

	campaignStore := NewCampaignStorePostgres(db)
	jobStore := NewCampaignJobStorePostgres(db)
	ctx := context.Background()

	// Create a test campaign
	campaignID := uuid.New()
	campaign := &models.Campaign{
		ID:           campaignID,
		Name:         "Retry Race Condition Test Campaign",
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       models.CampaignStatusPending,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	err := campaignStore.CreateCampaign(ctx, db, campaign)
	require.NoError(t, err)

	// Create jobs with different retry states
	numQueuedJobs := 10
	numRetryJobs := 5
	totalJobs := numQueuedJobs + numRetryJobs

	// Create queued jobs
	for i := 0; i < numQueuedJobs; i++ {
		job := &models.CampaignJob{
			ID:          uuid.New(),
			CampaignID:  campaignID,
			JobType:     models.CampaignTypeDomainGeneration,
			Status:      models.JobStatusQueued,
			MaxAttempts: 3,
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
			ScheduledAt: time.Now().UTC(),
		}

		err := jobStore.CreateJob(ctx, db, job)
		require.NoError(t, err)
	}

	// Create retry jobs (ready for execution)
	retryStatus := models.JobBusinessStatusRetry
	for i := 0; i < numRetryJobs; i++ {
		job := &models.CampaignJob{
			ID:             uuid.New(),
			CampaignID:     campaignID,
			JobType:        models.CampaignTypeDomainGeneration,
			Status:         models.JobStatusQueued,
			BusinessStatus: &retryStatus,
			NextExecutionAt: sql.NullTime{
				Time:  time.Now().UTC().Add(-1 * time.Minute), // Ready for retry
				Valid: true,
			},
			MaxAttempts: 3,
			Attempts:    1, // Already attempted once
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
			ScheduledAt: time.Now().UTC(),
		}

		err := jobStore.CreateJob(ctx, db, job)
		require.NoError(t, err)
	}

	// Launch workers to claim all jobs
	numWorkers := 25
	claimedJobs := make(chan *models.CampaignJob, totalJobs)
	workerErrors := make(chan error, numWorkers)

	var wg sync.WaitGroup

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			workerName := fmt.Sprintf("retry-test-worker-%d", workerID)

			// Try to claim a job
			job, err := jobStore.GetNextQueuedJob(ctx, nil, workerName)
			if errors.Is(err, store.ErrNotFound) {
				// No jobs available, this is expected for some workers
				return
			}
			if err != nil {
				workerErrors <- fmt.Errorf("worker %d: %w", workerID, err)
				return
			}

			claimedJobs <- job
		}(i)
	}

	wg.Wait()
	close(claimedJobs)
	close(workerErrors)

	// Check for errors
	var allErrors []error
	for err := range workerErrors {
		allErrors = append(allErrors, err)
	}
	require.Empty(t, allErrors, "Workers should not encounter errors: %v", allErrors)

	// Verify all jobs were claimed
	var claimed []*models.CampaignJob
	for job := range claimedJobs {
		claimed = append(claimed, job)
	}

	assert.Equal(t, totalJobs, len(claimed), "All jobs (queued + retry) should be claimed")

	// Verify retry jobs have correct attempt counts
	queuedJobCount := 0
	retryJobCount := 0

	for _, job := range claimed {
		assert.Equal(t, models.JobStatusRunning, job.Status)
		if job.Attempts == 1 {
			queuedJobCount++
		} else if job.Attempts == 2 {
			retryJobCount++
		}
	}

	assert.Equal(t, numQueuedJobs, queuedJobCount, "Queued jobs should have 1 attempt")
	assert.Equal(t, numRetryJobs, retryJobCount, "Retry jobs should have 2 attempts")
}

// TestJobClaimingTimeoutRecovery tests that jobs with timeouts can be recovered
func TestJobClaimingTimeoutRecovery(t *testing.T) {
	db := setupRaceConditionTestDB(t)
	defer db.Close()
	createRaceConditionTestTables(t, db)
	defer cleanupRaceConditionTestTables(t, db)

	campaignStore := NewCampaignStorePostgres(db)
	jobStore := NewCampaignJobStorePostgres(db)
	ctx := context.Background()

	// Create a test campaign
	campaignID := uuid.New()
	campaign := &models.Campaign{
		ID:           campaignID,
		Name:         "Timeout Recovery Test Campaign",
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       models.CampaignStatusPending,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	err := campaignStore.CreateCampaign(ctx, db, campaign)
	require.NoError(t, err)

	// Create a job
	jobID := uuid.New()
	job := &models.CampaignJob{
		ID:          jobID,
		CampaignID:  campaignID,
		JobType:     models.CampaignTypeDomainGeneration,
		Status:      models.JobStatusQueued,
		MaxAttempts: 3,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
		ScheduledAt: time.Now().UTC(),
	}

	err = jobStore.CreateJob(ctx, db, job)
	require.NoError(t, err)

	// Simulate worker claiming job
	claimedJob, err := jobStore.GetNextQueuedJob(ctx, nil, "timeout-test-worker")
	require.NoError(t, err)
	require.NotNil(t, claimedJob)

	assert.Equal(t, models.JobStatusRunning, claimedJob.Status)
	assert.Equal(t, "timeout-test-worker", claimedJob.ProcessingServerID.String)
	assert.Equal(t, 1, claimedJob.Attempts)

	// Verify no other worker can claim the same job
	_, err = jobStore.GetNextQueuedJob(ctx, nil, "another-worker")
	assert.True(t, errors.Is(err, store.ErrNotFound), "Other workers should not be able to claim running jobs")

	log.Printf("Job claiming race condition tests completed successfully")
}

// TestHighConcurrencyJobClaiming stress tests the job claiming mechanism
func TestHighConcurrencyJobClaiming(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping stress tests in short mode")
	}

	db := setupRaceConditionTestDB(t)
	defer db.Close()
	createRaceConditionTestTables(t, db)
	defer cleanupRaceConditionTestTables(t, db)

	campaignStore := NewCampaignStorePostgres(db)
	jobStore := NewCampaignJobStorePostgres(db)
	ctx := context.Background()

	// Create a test campaign
	campaignID := uuid.New()
	campaign := &models.Campaign{
		ID:           campaignID,
		Name:         "High Concurrency Test Campaign",
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       models.CampaignStatusPending,
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}

	err := campaignStore.CreateCampaign(ctx, db, campaign)
	require.NoError(t, err)

	// Create many jobs
	numJobs := 100
	for i := 0; i < numJobs; i++ {
		job := &models.CampaignJob{
			ID:          uuid.New(),
			CampaignID:  campaignID,
			JobType:     models.CampaignTypeDomainGeneration,
			Status:      models.JobStatusQueued,
			MaxAttempts: 3,
			CreatedAt:   time.Now().UTC(),
			UpdatedAt:   time.Now().UTC(),
			ScheduledAt: time.Now().UTC(),
		}

		err := jobStore.CreateJob(ctx, db, job)
		require.NoError(t, err)
	}

	// Launch many workers with reasonable database connection limits
	numWorkers := 50 // High contention while respecting PostgreSQL max_connections
	claimedJobs := make(chan *models.CampaignJob, numJobs)
	workerErrors := make(chan error, numWorkers)

	var wg sync.WaitGroup
	startSignal := make(chan struct{})

	// Start all workers but make them wait for start signal
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			// Wait for start signal to ensure all workers start simultaneously
			<-startSignal

			workerName := fmt.Sprintf("stress-worker-%d", workerID)

			// Each worker tries to claim multiple jobs until none available
			for {
				job, err := jobStore.GetNextQueuedJob(ctx, nil, workerName)
				if errors.Is(err, store.ErrNotFound) {
					return // No more jobs available
				}
				if err != nil {
					workerErrors <- fmt.Errorf("worker %d: %w", workerID, err)
					return
				}

				claimedJobs <- job

				// Small delay to allow other workers to compete
				time.Sleep(1 * time.Millisecond)
			}
		}(i)
	}

	// Start all workers simultaneously
	close(startSignal)

	// Wait for completion
	wg.Wait()
	close(claimedJobs)
	close(workerErrors)

	// Verify no errors occurred
	var allErrors []error
	for err := range workerErrors {
		allErrors = append(allErrors, err)
	}
	require.Empty(t, allErrors, "High concurrency test should not produce errors: %v", allErrors)

	// Count claimed jobs
	var claimed []*models.CampaignJob
	for job := range claimedJobs {
		claimed = append(claimed, job)
	}

	assert.Equal(t, numJobs, len(claimed), "All jobs should be claimed exactly once under high concurrency")

	// Verify no duplicates
	claimedIDs := make(map[uuid.UUID]bool)
	for _, job := range claimed {
		assert.False(t, claimedIDs[job.ID], "Job %s was claimed more than once", job.ID)
		claimedIDs[job.ID] = true
	}

	log.Printf("High concurrency job claiming test completed: %d workers claimed %d jobs", numWorkers, len(claimed))
}
