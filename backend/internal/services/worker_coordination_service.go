package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// WorkerCoordinationService manages distributed worker coordination
type WorkerCoordinationService struct {
	db              *sqlx.DB
	workerID        string
	heartbeatTicker *time.Ticker
	resourceLocks   map[string]uuid.UUID
	mu              sync.RWMutex
	txManager       *postgres.TransactionManager
}

// WorkerCoordination represents a worker in the coordination system
type WorkerCoordination struct {
	WorkerID      string          `json:"worker_id" db:"worker_id"`
	CampaignID    *uuid.UUID      `json:"campaign_id" db:"campaign_id"`
	WorkerType    string          `json:"worker_type" db:"worker_type"`
	Status        string          `json:"status" db:"status"`
	LastHeartbeat time.Time       `json:"last_heartbeat" db:"last_heartbeat"`
	AssignedTasks json.RawMessage `json:"assigned_tasks" db:"assigned_tasks"`
	ResourceLocks json.RawMessage `json:"resource_locks" db:"resource_locks"`
	Metadata      json.RawMessage `json:"metadata" db:"metadata"`
	CreatedAt     time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at" db:"updated_at"`
}

// DomainGenerationBatch represents a batch of domain generation work
type DomainGenerationBatch struct {
	BatchID          uuid.UUID       `json:"batch_id" db:"batch_id"`
	CampaignID       uuid.UUID       `json:"campaign_id" db:"campaign_id"`
	BatchNumber      int             `json:"batch_number" db:"batch_number"`
	TotalDomains     int             `json:"total_domains" db:"total_domains"`
	ProcessedDomains int             `json:"processed_domains" db:"processed_domains"`
	FailedDomains    int             `json:"failed_domains" db:"failed_domains"`
	Status           string          `json:"status" db:"status"`
	AssignedWorker   *string         `json:"assigned_worker" db:"assigned_worker"`
	StartedAt        *time.Time      `json:"started_at" db:"started_at"`
	CompletedAt      *time.Time      `json:"completed_at" db:"completed_at"`
	ErrorDetails     json.RawMessage `json:"error_details" db:"error_details"`
	CreatedAt        time.Time       `json:"created_at" db:"created_at"`
}

func NewWorkerCoordinationService(db *sqlx.DB, workerID string) *WorkerCoordinationService {
	return &WorkerCoordinationService{
		db:            db,
		workerID:      workerID,
		resourceLocks: make(map[string]uuid.UUID),
		txManager:     postgres.NewTransactionManager(db),
	}
}

// RegisterWorker registers worker with coordination system
func (wcs *WorkerCoordinationService) RegisterWorker(
	ctx context.Context,
	campaignID uuid.UUID,
	workerType string,
) error {
	opts := &postgres.CampaignTransactionOptions{
		Operation:  "register_worker",
		CampaignID: campaignID.String(),
		Timeout:    30 * time.Second,
		MaxRetries: 3,
		RetryDelay: 100 * time.Millisecond,
	}

	return wcs.txManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		query := `
			INSERT INTO worker_coordination 
				(worker_id, campaign_id, worker_type, status, last_heartbeat)
			VALUES ($1, $2, $3, 'idle', NOW())
			ON CONFLICT (worker_id) DO UPDATE SET
				campaign_id = EXCLUDED.campaign_id,
				worker_type = EXCLUDED.worker_type,
				status = 'idle',
				last_heartbeat = NOW(),
				updated_at = NOW()`

		_, err := tx.ExecContext(ctx, query, wcs.workerID, campaignID, workerType)
		if err != nil {
			return fmt.Errorf("failed to register worker: %w", err)
		}

		log.Printf("Worker %s registered successfully for campaign %s", wcs.workerID, campaignID)
		return nil
	})
}

// startHeartbeat maintains worker liveness
func (wcs *WorkerCoordinationService) startHeartbeat(ctx context.Context) {
	if wcs.heartbeatTicker != nil {
		wcs.heartbeatTicker.Stop()
	}

	wcs.heartbeatTicker = time.NewTicker(10 * time.Second)
	go func() {
		for {
			select {
			case <-ctx.Done():
				if wcs.heartbeatTicker != nil {
					wcs.heartbeatTicker.Stop()
				}
				return
			case <-wcs.heartbeatTicker.C:
				wcs.sendHeartbeat(ctx)
			}
		}
	}()
}

func (wcs *WorkerCoordinationService) sendHeartbeat(ctx context.Context) {
	query := `
		UPDATE worker_coordination 
		SET last_heartbeat = NOW(), updated_at = NOW()
		WHERE worker_id = $1`

	_, err := wcs.db.ExecContext(ctx, query, wcs.workerID)
	if err != nil {
		log.Printf("WARNING: Failed to send heartbeat for worker %s: %v", wcs.workerID, err)
	}
}

// StartHeartbeat starts the heartbeat mechanism for this worker
func (wcs *WorkerCoordinationService) StartHeartbeat(ctx context.Context) {
	wcs.startHeartbeat(ctx)
}

// StopHeartbeat stops the heartbeat mechanism
func (wcs *WorkerCoordinationService) StopHeartbeat() {
	if wcs.heartbeatTicker != nil {
		wcs.heartbeatTicker.Stop()
		wcs.heartbeatTicker = nil
	}
}

// ResourceLockManager provides fine-grained resource locking
type ResourceLockManager struct {
	db          *sqlx.DB
	workerID    string
	activeLocks map[string]uuid.UUID
	mu          sync.RWMutex
	txManager   *postgres.TransactionManager
}

func NewResourceLockManager(db *sqlx.DB, workerID string) *ResourceLockManager {
	return &ResourceLockManager{
		db:          db,
		workerID:    workerID,
		activeLocks: make(map[string]uuid.UUID),
		txManager:   postgres.NewTransactionManager(db),
	}
}

// AcquireResourceLock acquires a lock on a specific resource
func (rlm *ResourceLockManager) AcquireResourceLock(
	ctx context.Context,
	resourceType, resourceID string,
	lockMode string,
	timeout time.Duration,
) (uuid.UUID, error) {
	lockKey := fmt.Sprintf("%s:%s:%s", resourceType, resourceID, lockMode)

	rlm.mu.Lock()
	defer rlm.mu.Unlock()

	// Check if we already hold this lock
	if existingLockID, exists := rlm.activeLocks[lockKey]; exists {
		return existingLockID, nil
	}

	opts := &postgres.CampaignTransactionOptions{
		Operation:  "acquire_resource_lock",
		CampaignID: resourceID,
		Timeout:    timeout + 5*time.Second, // Add buffer for transaction timeout
		MaxRetries: 3,
		RetryDelay: 50 * time.Millisecond,
	}

	var lockID uuid.UUID
	err := rlm.txManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		query := `SELECT acquire_resource_lock($1, $2, $3, $4, $5)`

		err := tx.QueryRowContext(
			ctx, query,
			resourceType, resourceID, rlm.workerID,
			lockMode, int(timeout.Seconds()),
		).Scan(&lockID)

		if err != nil {
			return fmt.Errorf("failed to acquire resource lock: %w", err)
		}

		if lockID == uuid.Nil {
			return fmt.Errorf("resource lock not available: %s", lockKey)
		}

		return nil
	})

	if err != nil {
		return uuid.Nil, err
	}

	rlm.activeLocks[lockKey] = lockID
	log.Printf("Successfully acquired resource lock %s for worker %s", lockKey, rlm.workerID)
	return lockID, nil
}

// ReleaseResourceLock releases a previously acquired lock
func (rlm *ResourceLockManager) ReleaseResourceLock(
	ctx context.Context,
	resourceType, resourceID, lockMode string,
) error {
	lockKey := fmt.Sprintf("%s:%s:%s", resourceType, resourceID, lockMode)

	rlm.mu.Lock()
	defer rlm.mu.Unlock()

	lockID, exists := rlm.activeLocks[lockKey]
	if !exists {
		return nil // Lock not held
	}

	opts := &postgres.CampaignTransactionOptions{
		Operation:  "release_resource_lock",
		CampaignID: resourceID,
		Timeout:    10 * time.Second,
		MaxRetries: 3,
		RetryDelay: 50 * time.Millisecond,
	}

	err := rlm.txManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		query := `DELETE FROM resource_locks WHERE lock_id = $1 AND lock_holder = $2`
		_, err := tx.ExecContext(ctx, query, lockID, rlm.workerID)
		return err
	})

	if err != nil {
		return fmt.Errorf("failed to release resource lock: %w", err)
	}

	delete(rlm.activeLocks, lockKey)
	log.Printf("Successfully released resource lock %s for worker %s", lockKey, rlm.workerID)
	return nil
}

// AssignDomainBatch assigns the next available domain generation batch to a worker
func (wcs *WorkerCoordinationService) AssignDomainBatch(
	ctx context.Context,
	campaignID uuid.UUID,
) (*uuid.UUID, error) {
	opts := &postgres.CampaignTransactionOptions{
		Operation:  "assign_domain_batch",
		CampaignID: campaignID.String(),
		Timeout:    30 * time.Second,
		MaxRetries: 3,
		RetryDelay: 100 * time.Millisecond,
	}

	var batchID *uuid.UUID
	err := wcs.txManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		query := `SELECT assign_domain_batch($1, $2, $3)`

		var result sql.NullString
		err := tx.QueryRowContext(ctx, query, campaignID, wcs.workerID, 1000).Scan(&result)
		if err != nil {
			return fmt.Errorf("failed to assign domain batch: %w", err)
		}

		if result.Valid {
			parsedUUID, parseErr := uuid.Parse(result.String)
			if parseErr != nil {
				return fmt.Errorf("failed to parse batch ID: %w", parseErr)
			}
			batchID = &parsedUUID
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	if batchID != nil {
		log.Printf("Worker %s assigned domain batch %s for campaign %s", wcs.workerID, *batchID, campaignID)
	}

	return batchID, nil
}

// GetActiveWorkers returns all active workers for a campaign
func (wcs *WorkerCoordinationService) GetActiveWorkers(
	ctx context.Context,
	campaignID uuid.UUID,
) ([]*WorkerCoordination, error) {
	query := `
		SELECT worker_id, campaign_id, worker_type, status, last_heartbeat,
			   assigned_tasks, resource_locks, metadata, created_at, updated_at
		FROM worker_coordination 
		WHERE campaign_id = $1 
		  AND last_heartbeat > NOW() - INTERVAL '30 seconds'
		ORDER BY last_heartbeat DESC`

	var workers []*WorkerCoordination
	err := wcs.db.SelectContext(ctx, &workers, query, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get active workers: %w", err)
	}

	return workers, nil
}

// CleanupStaleWorkers removes workers that haven't sent heartbeat in reasonable time
func (wcs *WorkerCoordinationService) CleanupStaleWorkers(ctx context.Context) error {
	opts := &postgres.CampaignTransactionOptions{
		Operation:  "cleanup_stale_workers",
		CampaignID: "system",
		Timeout:    30 * time.Second,
		MaxRetries: 3,
		RetryDelay: 100 * time.Millisecond,
	}

	return wcs.txManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		// Clean up workers that haven't sent heartbeat in 2 minutes
		query := `
			DELETE FROM worker_coordination 
			WHERE last_heartbeat < NOW() - INTERVAL '2 minutes'`

		result, err := tx.ExecContext(ctx, query)
		if err != nil {
			return fmt.Errorf("failed to cleanup stale workers: %w", err)
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected > 0 {
			log.Printf("Cleaned up %d stale workers", rowsAffected)
		}

		// Also clean up expired resource locks
		lockQuery := `DELETE FROM resource_locks WHERE expires_at < NOW()`
		lockResult, err := tx.ExecContext(ctx, lockQuery)
		if err != nil {
			return fmt.Errorf("failed to cleanup expired locks: %w", err)
		}

		lockRowsAffected, _ := lockResult.RowsAffected()
		if lockRowsAffected > 0 {
			log.Printf("Cleaned up %d expired resource locks", lockRowsAffected)
		}

		return nil
	})
}

// UpdateWorkerStatus updates the status and metadata for a worker
func (wcs *WorkerCoordinationService) UpdateWorkerStatus(
	ctx context.Context,
	campaignID uuid.UUID,
	status, operation string,
) error {
	metadata := map[string]interface{}{
		"last_operation": operation,
		"timestamp":      time.Now().Unix(),
	}

	metadataJSON, _ := json.Marshal(metadata)

	opts := &postgres.CampaignTransactionOptions{
		Operation:  "update_worker_status",
		CampaignID: campaignID.String(),
		Timeout:    15 * time.Second,
		MaxRetries: 3,
		RetryDelay: 50 * time.Millisecond,
	}

	return wcs.txManager.SafeCampaignTransaction(ctx, opts, func(tx *sqlx.Tx) error {
		query := `
			UPDATE worker_coordination 
			SET status = $1, metadata = $2, last_heartbeat = NOW(), updated_at = NOW()
			WHERE worker_id = $3 AND campaign_id = $4`

		_, err := tx.ExecContext(ctx, query, status, metadataJSON, wcs.workerID, campaignID)
		if err != nil {
			return fmt.Errorf("failed to update worker status: %w", err)
		}

		return nil
	})
}

// GetWorkerStats returns statistics about worker coordination
func (wcs *WorkerCoordinationService) GetWorkerStats(ctx context.Context) (map[string]interface{}, error) {
	query := `
		SELECT 
			COUNT(*) as total_workers,
			COUNT(CASE WHEN status = 'working' THEN 1 END) as working_workers,
			COUNT(CASE WHEN status = 'idle' THEN 1 END) as idle_workers,
			COUNT(CASE WHEN last_heartbeat > NOW() - INTERVAL '30 seconds' THEN 1 END) as active_workers
		FROM worker_coordination`

	var stats struct {
		TotalWorkers   int `db:"total_workers"`
		WorkingWorkers int `db:"working_workers"`
		IdleWorkers    int `db:"idle_workers"`
		ActiveWorkers  int `db:"active_workers"`
	}

	err := wcs.db.GetContext(ctx, &stats, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get worker stats: %w", err)
	}

	result := map[string]interface{}{
		"total_workers":   stats.TotalWorkers,
		"working_workers": stats.WorkingWorkers,
		"idle_workers":    stats.IdleWorkers,
		"active_workers":  stats.ActiveWorkers,
	}

	return result, nil
}
