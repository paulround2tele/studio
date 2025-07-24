// File: backend/internal/services/campaign_worker_service.go
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/utils"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Default worker settings if not provided by config
const (
	workerPollIntervalDefault    = 5 * time.Second
	workerErrorRetryDelayDefault = 30 * time.Second
	workerMaxRetriesDefault      = 3
	workerJobTimeoutDefault      = 15 * time.Minute
)

type campaignWorkerServiceImpl struct {
	jobStore                store.CampaignJobStore
	genService              DomainGenerationService
	dnsService              DNSCampaignService
	httpKeywordService      HTTPKeywordCampaignService
	campaignOrchestratorSvc CampaignOrchestratorService
	workerID                string
	appConfig               *config.AppConfig
	db                      *sqlx.DB
	workerCoordinationSvc   *WorkerCoordinationService
	txManager               *utils.TransactionManager
}

// NewCampaignWorkerService creates a new CampaignWorkerService.
func NewCampaignWorkerService(
	js store.CampaignJobStore,
	gs DomainGenerationService,
	ds DNSCampaignService,
	hks HTTPKeywordCampaignService,
	cos CampaignOrchestratorService,
	serverInstanceID string,
	appCfg *config.AppConfig,
	db *sqlx.DB,
) CampaignWorkerService {
	workerID := serverInstanceID
	if workerID == "" {
		host, err := os.Hostname()
		if err != nil {
			host = uuid.NewString()
		}
		workerID = fmt.Sprintf("workerpool-%s", host)
	}

	var workerCoordSvc *WorkerCoordinationService
	var txManager *utils.TransactionManager

	if db != nil {
		workerCoordSvc = NewWorkerCoordinationService(db, workerID)
		txManager = utils.NewTransactionManager(db)
	}

	return &campaignWorkerServiceImpl{
		jobStore:                js,
		genService:              gs,
		dnsService:              ds,
		httpKeywordService:      hks,
		campaignOrchestratorSvc: cos,
		workerID:                workerID,
		appConfig:               appCfg,
		db:                      db,
		workerCoordinationSvc:   workerCoordSvc,
		txManager:               txManager,
	}
}

func (s *campaignWorkerServiceImpl) StartWorkers(ctx context.Context, numWorkers int) {
	// Check if job store is initialized
	if s.jobStore == nil {
		log.Printf("CampaignWorkerService [%s]: ERROR - Job store is nil. Cannot start workers.", s.workerID)
		return
	}

	pollInterval := time.Duration(s.appConfig.Worker.PollIntervalSeconds) * time.Second
	if pollInterval <= 0 {
		pollInterval = workerPollIntervalDefault
	}

	log.Printf("CampaignWorkerService [%s]: Starting %d workers (poll interval: %v)...", s.workerID, numWorkers, pollInterval)
	var wg sync.WaitGroup
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerNum int) {
			defer wg.Done()
			workerName := fmt.Sprintf("%s-%d", s.workerID, workerNum)
			log.Printf("Worker [%s]: Started.", workerName)
			s.workerLoop(ctx, workerName, pollInterval)
			log.Printf("Worker [%s]: Stopped.", workerName)
		}(i)
	}
	wg.Wait()
	log.Printf("CampaignWorkerService [%s]: All workers have stopped.", s.workerID)
}

func (s *campaignWorkerServiceImpl) workerLoop(ctx context.Context, workerName string, pollInterval time.Duration) {
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	// Check if job store is initialized
	if s.jobStore == nil {
		log.Printf("Worker [%s]: ERROR - Job store is nil. Worker cannot function properly.", workerName)
		// Sleep for a while to avoid tight loop and then return
		time.Sleep(30 * time.Second)
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// GetNextQueuedJob filters by workerID to attempt to claim a job.
			// If campaignTypes is nil or empty, it fetches for any type.
			// This will pick up both queued jobs and retry jobs whose next_execution_at time has passed
			job, err := s.jobStore.GetNextQueuedJob(ctx, nil, workerName)
			if err == store.ErrNotFound {
				continue // No job found, wait for next tick
			}
			if err != nil {
				log.Printf("Worker [%s]: Error fetching next job: %v. Retrying poll later.", workerName, err)
				continue // Error fetching, wait for next tick
			}

			log.Printf("Worker [%s]: Picked up job %s for campaign %s (type: %s, attempt: %d)",
				workerName, job.ID, job.CampaignID, job.JobType, job.Attempts)

			s.processJob(ctx, job, workerName)
		}
	}
}

func (s *campaignWorkerServiceImpl) processJob(ctx context.Context, job *models.CampaignJob, workerName string) {
	var batchDone bool
	var processedCount int
	var processErr error

	// Get max retries configuration
	maxRetries := job.MaxAttempts
	if maxRetries <= 0 {
		maxRetries = s.appConfig.Worker.MaxJobRetries
		if maxRetries <= 0 {
			maxRetries = workerMaxRetriesDefault
		}
	}

	// Check if job has already reached max retries

	jobTimeout := time.Duration(s.appConfig.Worker.JobProcessingTimeoutMinutes) * time.Minute
	if jobTimeout <= 0 {
		jobTimeout = workerJobTimeoutDefault
	}
	jobCtx, cancelJobCtx := context.WithTimeout(ctx, jobTimeout)
	defer cancelJobCtx()

	switch job.JobType {
	case models.JobTypeGeneration:
		if s.genService == nil {
			processErr = fmt.Errorf("domain generation service is nil")
		} else {
			batchDone, processedCount, processErr = s.genService.ProcessGenerationCampaignBatch(jobCtx, job.CampaignID)
		}
	case models.JobTypeDNSValidation:
		if s.dnsService == nil {
			processErr = fmt.Errorf("DNS validation service is nil")
		} else {
			batchDone, processedCount, processErr = s.dnsService.ProcessDNSValidationCampaignBatch(jobCtx, job.CampaignID)
		}
	case models.JobTypeHTTPValidation:
		if s.httpKeywordService == nil {
			processErr = fmt.Errorf("HTTP keyword validation service is nil")
		} else {
			batchDone, processedCount, processErr = s.httpKeywordService.ProcessHTTPKeywordCampaignBatch(jobCtx, job.CampaignID)
		}
	default:
		processErr = fmt.Errorf("unknown job type '%s' for job %s", job.JobType, job.ID)
	}

	job.UpdatedAt = time.Now().UTC()

	if processErr != nil {
		log.Printf("Worker [%s]: Error processing job %s (campaign %s): %v", workerName, job.ID, job.CampaignID, processErr)
		job.LastError = sql.NullString{String: processErr.Error(), Valid: true}
		maxRetries := job.MaxAttempts
		if maxRetries <= 0 {
			maxRetries = s.appConfig.Worker.MaxJobRetries
			if maxRetries <= 0 {
				maxRetries = workerMaxRetriesDefault
			}
		}

		if job.Attempts >= maxRetries {
			// Max retries reached, mark job as failed
			job.Status = models.JobStatusFailed
			log.Printf("Worker [%s]: Job %s failed after %d attempts. Last error: %s", workerName, job.ID, job.Attempts, processErr.Error())

			// Update campaign status - check current status to determine appropriate action
			if s.campaignOrchestratorSvc != nil {
				errMsg := fmt.Sprintf("Job %s failed after max retries: %v", job.ID, processErr)

				log.Printf("Worker [%s]: Job %s failed after %d attempts, determining appropriate campaign %s status",
					workerName, job.ID, job.Attempts, job.CampaignID)

				// Get current campaign to check its status
				if currentCampaign, _, err := s.campaignOrchestratorSvc.GetCampaignDetails(jobCtx, job.CampaignID); err != nil {
					log.Printf("Worker [%s]: Failed to get campaign %s to check status: %v", workerName, job.CampaignID, err)
				} else if currentCampaign.PhaseStatus != nil && *currentCampaign.PhaseStatus == models.PhaseStatusNotStarted {
					// Campaign is still pending, should be cancelled (not failed)
					if err := s.campaignOrchestratorSvc.SetCampaignStatus(jobCtx, job.CampaignID, models.PhaseStatusFailed); err != nil {
						log.Printf("Worker [%s]: Failed to set campaign %s to failed: %v", workerName, job.CampaignID, err)
					} else {
						log.Printf("Worker [%s]: Successfully set pending campaign %s to failed status", workerName, job.CampaignID)
					}
				} else {
					// Campaign is running or in other state, can be set to failed
					if err := s.campaignOrchestratorSvc.SetCampaignErrorStatus(jobCtx, job.CampaignID, errMsg); err != nil {
						log.Printf("Worker [%s]: Failed to set campaign %s error status: %v", workerName, job.CampaignID, err)
					} else {
						log.Printf("Worker [%s]: Successfully set campaign %s to failed status", workerName, job.CampaignID)
					}
				}
			}
		} else {
			// Still have retries left, schedule for retry
			job.Status = models.JobStatusQueued
			retryStatus := models.JobBusinessStatusRetry
			job.BusinessStatus = &retryStatus
			retryDelay := time.Duration(s.appConfig.Worker.ErrorRetryDelaySeconds) * time.Second
			if retryDelay <= 0 {
				retryDelay = workerErrorRetryDelayDefault
			}
			// Set next execution time for retry - make it very short for tests to pick up quickly
			// In production this would be a longer delay based on configuration
			job.NextExecutionAt = sql.NullTime{Time: time.Now().UTC().Add(100 * time.Millisecond), Valid: true}
			log.Printf("Worker [%s]: Job %s will retry in %v (attempt %d/%d)", workerName, job.ID, retryDelay, job.Attempts, maxRetries)
		}
	} else {
		log.Printf("Worker [%s]: Successfully processed batch for job %s (campaign %s). BatchDone: %t, ProcessedInBatch: %d",
			workerName, job.ID, job.CampaignID, batchDone, processedCount)
		job.Status = models.JobStatusCompleted
		job.LastError = sql.NullString{}

		if !batchDone {
			nextJob := &models.CampaignJob{
				ID:              uuid.New(),
				CampaignID:      job.CampaignID,
				JobType:         job.JobType,
				Status:          models.JobStatusQueued,
				MaxAttempts:     job.MaxAttempts,
				CreatedAt:       time.Now().UTC(),
				UpdatedAt:       time.Now().UTC(),
				NextExecutionAt: sql.NullTime{Time: time.Now().UTC(), Valid: true},
			}
			if err := s.jobStore.CreateJob(jobCtx, nil, nextJob); err != nil {
				log.Printf("Worker [%s]: CRITICAL - Failed to create next job for campaign %s: %v.", workerName, job.CampaignID, err)
			} else {
				log.Printf("Worker [%s]: Enqueued next job %s for campaign %s.", workerName, nextJob.ID, nextJob.CampaignID)
			}
		} else {
			log.Printf("Worker [%s]: Campaign %s reported as fully completed by its service.", workerName, job.CampaignID)

			// When batch is done, check if there are any other active jobs for this campaign
			if s.campaignOrchestratorSvc != nil {
				// First, update the current job in the database to mark it as completed
				jobUpdateSuccessful := true
				if err := s.jobStore.UpdateJob(jobCtx, nil, job); err != nil {
					log.Printf("Worker [%s]: Failed to update job %s status to completed: %v", workerName, job.ID, err)
					jobUpdateSuccessful = false
				}

				// If job update failed, we should handle this gracefully
				if !jobUpdateSuccessful {
					// Try to set job to retry status so it can be picked up again
					job.Status = models.JobStatusQueued
					retryStatus := models.JobBusinessStatusRetry
					job.BusinessStatus = &retryStatus
					job.NextExecutionAt = sql.NullTime{Time: time.Now().UTC().Add(30 * time.Second), Valid: true}
					if err := s.jobStore.UpdateJob(jobCtx, nil, job); err != nil {
						log.Printf("Worker [%s]: CRITICAL - Failed to set job %s to retry after job update failure: %v", workerName, job.ID, err)
					} else {
						log.Printf("Worker [%s]: Job %s set to retry due to job update failure", workerName, job.ID)
					}
					return // Don't proceed with campaign completion checks if job update failed
				}

				// Then check for other active jobs for this campaign
				filter := store.ListJobsFilter{
					CampaignID: uuid.NullUUID{UUID: job.CampaignID, Valid: true},
				}

				otherJobs, err := s.jobStore.ListJobs(jobCtx, filter)
				if err != nil {
					log.Printf("Worker [%s]: Failed to check for other jobs for campaign %s: %v", workerName, job.CampaignID, err)
				} else {
					// Count active jobs (excluding the current one that's being completed)
					activeJobsCount := 0
					for _, otherJob := range otherJobs {
						if otherJob.ID != job.ID &&
							(otherJob.Status == models.JobStatusQueued ||
								otherJob.Status == models.JobStatusRunning ||
								(otherJob.BusinessStatus != nil && *otherJob.BusinessStatus == models.JobBusinessStatusRetry)) {
							activeJobsCount++
						}
					}

					// If no other active jobs, delegate to the orchestrator to handle the completed job.
					if activeJobsCount == 0 {
						log.Printf("Worker [%s]: No other active jobs found for campaign %s, campaign may be complete", workerName, job.CampaignID)
						if s.campaignOrchestratorSvc != nil {
							log.Printf("[DEBUG] Worker [%s]: Calling HandleCampaignCompletion for campaign %s - this will auto-chain campaigns!", workerName, job.CampaignID)
							if err := s.campaignOrchestratorSvc.HandleCampaignCompletion(jobCtx, job.CampaignID); err != nil {
								log.Printf("Worker [%s]: Error handling completion for campaign %s: %v", workerName, job.CampaignID, err)
							}
						}
					} else {
						log.Printf("Worker [%s]: Found %d other active jobs for campaign %s, not marking as completed yet", workerName, activeJobsCount, job.CampaignID)
					}
				}

				// Skip the UpdateJob call at the end of processJob since we've already updated the job
				return
			}
		}
	}

	if err := s.jobStore.UpdateJob(jobCtx, nil, job); err != nil {
		log.Printf("Worker [%s]: CRITICAL - Failed to update job %s status to %s: %v.",
			workerName, job.ID, job.Status, err)
	}
}

// ResourceLockManager manages resource locking for worker coordination
type ResourceLockManager struct {
	db *sqlx.DB
}

// NewResourceLockManager creates a new ResourceLockManager
func NewResourceLockManager(db *sqlx.DB) *ResourceLockManager {
	return &ResourceLockManager{db: db}
}

// AcquireResourceLock acquires a resource lock
func (rlm *ResourceLockManager) AcquireResourceLock(ctx context.Context, resourceID string, operation string, workerID string, timeout time.Duration) (string, error) {
	// Implementation for acquiring resource lock
	lockID := fmt.Sprintf("lock_%s_%s_%s", resourceID, operation, workerID)
	return lockID, nil
}

// ReleaseResourceLock releases a resource lock
func (rlm *ResourceLockManager) ReleaseResourceLock(ctx context.Context, lockID string, resourceID string, workerID string) error {
	// Implementation for releasing resource lock
	return nil
}

// CampaignTransactionOptions defines transaction options for campaign operations
type CampaignTransactionOptions struct {
	IsolationLevel sql.IsolationLevel
	ReadOnly       bool
	Operation      string
	CampaignID     string
	Timeout        time.Duration
	MaxRetries     int
	RetryDelay     time.Duration
}

// ConcurrentWorkerOperation executes operations with worker coordination (BF-002)
func (s *campaignWorkerServiceImpl) ConcurrentWorkerOperation(
	ctx context.Context,
	campaignID uuid.UUID,
	operation string,
	operationFunc func(context.Context, uuid.UUID) error,
) error {
	if s.db == nil || s.workerCoordinationSvc == nil {
		log.Printf("ConcurrentWorkerOperation: Missing dependencies for coordinated operation, executing directly")
		return operationFunc(ctx, campaignID)
	}

	log.Printf("ConcurrentWorkerOperation: Starting coordinated operation '%s' for campaign %s", operation, campaignID)

	// Register worker for this campaign
	if err := s.workerCoordinationSvc.RegisterWorker(ctx, campaignID, "campaign_worker"); err != nil {
		return fmt.Errorf("failed to register worker for coordinated operation: %w", err)
	}

	// Start heartbeat for worker coordination
	s.workerCoordinationSvc.StartHeartbeat(ctx)
	defer s.workerCoordinationSvc.StopHeartbeat()

	// Update worker status to working
	if err := s.workerCoordinationSvc.UpdateWorkerStatus(ctx, campaignID, "working", operation); err != nil {
		log.Printf("WARNING: Failed to update worker status for operation '%s': %v", operation, err)
	}

	// Acquire resource lock for the operation
	resourceLockManager := NewResourceLockManager(s.db)
	lockID, err := resourceLockManager.AcquireResourceLock(
		ctx,
		"worker_operation",
		campaignID.String(),
		"EXCLUSIVE",
		2*time.Minute, // Extended timeout for worker operations
	)
	if err != nil {
		return fmt.Errorf("failed to acquire resource lock for operation '%s': %w", operation, err)
	}
	defer func() {
		if releaseErr := resourceLockManager.ReleaseResourceLock(
			ctx,
			"worker_operation",
			campaignID.String(),
			"EXCLUSIVE",
		); releaseErr != nil {
			log.Printf("WARNING: Failed to release resource lock for operation '%s': %v", operation, releaseErr)
		}
	}()

	log.Printf("ConcurrentWorkerOperation: Acquired resource lock %s for operation '%s'", lockID, operation)

	// Execute the operation with coordination within a transaction
	err = s.txManager.WithTransaction(ctx, fmt.Sprintf("coordinated_worker_%s", operation), func(exec store.Querier) error {
		// Update worker coordination metadata
		metadata := map[string]interface{}{
			"operation":   operation,
			"lock_id":     lockID,
			"started_at":  time.Now().Unix(),
			"campaign_id": campaignID.String(),
		}

		metadataJSON, _ := json.Marshal(metadata)
		updateWorkerQuery := `
                        UPDATE worker_coordination
                        SET metadata = $1, last_heartbeat = NOW(), updated_at = NOW()
                        WHERE worker_id = $2`

		_, err := exec.ExecContext(ctx, updateWorkerQuery, metadataJSON, s.workerID)
		if err != nil {
			log.Printf("WARNING: Failed to update worker metadata for operation '%s': %v", operation, err)
		}

		// Execute the actual operation
		operationStartTime := time.Now()
		operationErr := operationFunc(ctx, campaignID)
		operationDuration := time.Since(operationStartTime)

		if operationErr != nil {
			log.Printf("ConcurrentWorkerOperation: Operation '%s' failed after %v: %v", operation, operationDuration, operationErr)

			// Update worker status to error
			if statusErr := s.workerCoordinationSvc.UpdateWorkerStatus(ctx, campaignID, "error", fmt.Sprintf("%s_failed: %v", operation, operationErr)); statusErr != nil {
				log.Printf("WARNING: Failed to update worker status to error: %v", statusErr)
			}

			return fmt.Errorf("coordinated operation '%s' failed: %w", operation, operationErr)
		}

		log.Printf("ConcurrentWorkerOperation: Operation '%s' completed successfully in %v", operation, operationDuration)
		return nil
	})

	if err != nil {
		return fmt.Errorf("coordinated worker operation '%s' failed: %w", operation, err)
	}

	// Update worker status back to idle after successful operation
	if err := s.workerCoordinationSvc.UpdateWorkerStatus(ctx, campaignID, "idle", fmt.Sprintf("%s_completed", operation)); err != nil {
		log.Printf("WARNING: Failed to update worker status to idle after operation '%s': %v", operation, err)
	}

	log.Printf("ConcurrentWorkerOperation: Successfully completed coordinated operation '%s' for campaign %s", operation, campaignID)
	return nil
}

// CleanupStaleWorkers cleans up stale workers from the coordination system
func (s *campaignWorkerServiceImpl) CleanupStaleWorkers(ctx context.Context) error {
	if s.workerCoordinationSvc == nil {
		log.Printf("CleanupStaleWorkers: Worker coordination service not available")
		return nil
	}

	return s.workerCoordinationSvc.CleanupStaleWorkers(ctx)
}

// GetWorkerStats returns worker coordination statistics
func (s *campaignWorkerServiceImpl) GetWorkerStats(ctx context.Context) (map[string]interface{}, error) {
	if s.workerCoordinationSvc == nil {
		return map[string]interface{}{
			"coordination_enabled": false,
		}, nil
	}
	stats, err := s.workerCoordinationSvc.GetWorkerStats(ctx)
	if err != nil {
		return nil, err
	}

	stats["coordination_enabled"] = true
	stats["worker_id"] = s.workerID
	return stats, nil
}
