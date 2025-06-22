// File: backend/internal/config/config_locking_service.go
package config

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ConfigLockingService provides distributed locking for configuration updates
// Implements BF-005 remediation with copy-on-write semantics and distributed locking
type ConfigLockingService interface {
	// Acquire distributed lock for configuration
	AcquireConfigLock(ctx context.Context, configHash string, lockType models.ConfigLockType, owner string, timeout time.Duration) (*models.ConfigLockInfo, error)

	// Release distributed lock
	ReleaseConfigLock(ctx context.Context, lockID uuid.UUID, owner string) error

	// Refresh lock to extend timeout
	RefreshConfigLock(ctx context.Context, lockID uuid.UUID, owner string, newTimeout time.Duration) error

	// Check if configuration is locked
	IsConfigLocked(ctx context.Context, configHash string) (bool, *models.ConfigLockInfo, error)

	// Cleanup expired locks
	CleanupExpiredLocks(ctx context.Context) (int, error)

	// Execute operation with distributed lock
	WithConfigLock(ctx context.Context, configHash string, lockType models.ConfigLockType, owner string, timeout time.Duration, operation func() error) error

	// Get locking service metrics
	GetMetrics() map[string]int64
}

// ConfigLockingServiceImpl implements distributed configuration locking
type ConfigLockingServiceImpl struct {
	db            *sqlx.DB
	campaignStore store.CampaignStore

	// Local lock coordination to prevent race conditions in lock acquisition
	localLocks map[string]*sync.Mutex
	locksMutex sync.RWMutex

	// Metrics
	locksAcquired int64
	locksReleased int64
	lockTimeouts  int64
	lockConflicts int64
}

// NewConfigLockingService creates a new distributed configuration locking service
func NewConfigLockingService(db *sqlx.DB, campaignStore store.CampaignStore) ConfigLockingService {
	service := &ConfigLockingServiceImpl{
		db:            db,
		campaignStore: campaignStore,
		localLocks:    make(map[string]*sync.Mutex),
	}

	log.Printf("ConfigLockingService: Initialized distributed locking service")
	return service
}

// AcquireConfigLock acquires a distributed lock for configuration updates
func (cls *ConfigLockingServiceImpl) AcquireConfigLock(ctx context.Context, configHash string, lockType models.ConfigLockType, owner string, timeout time.Duration) (*models.ConfigLockInfo, error) {
	log.Printf("ConfigLockingService: Acquiring %s lock for config %s, owner %s, timeout %v", lockType, configHash, owner, timeout)

	// Get local lock for this config hash to prevent local race conditions
	localLock := cls.getLocalLock(configHash)
	localLock.Lock()
	defer localLock.Unlock()

	// Check for existing locks
	existingLock, err := cls.getActiveLock(ctx, configHash)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing locks: %w", err)
	}

	// Handle lock conflicts
	if existingLock != nil {
		// Check if same owner (lock refresh scenario)
		if existingLock.Owner == owner {
			log.Printf("ConfigLockingService: Refreshing existing lock for owner %s", owner)
			return cls.refreshLockInternal(ctx, existingLock, timeout)
		}

		// Check if lock is expired
		if existingLock.ExpiresAt != nil && time.Now().UTC().After(*existingLock.ExpiresAt) {
			log.Printf("ConfigLockingService: Cleaning up expired lock %s", existingLock.ID)
			if err := cls.cleanupExpiredLock(ctx, existingLock.ID); err != nil {
				log.Printf("ConfigLockingService: Warning - failed to cleanup expired lock: %v", err)
			}
		} else {
			cls.lockConflicts++
			expiresMsg := "indefinitely"
			if existingLock.ExpiresAt != nil {
				expiresMsg = "until " + existingLock.ExpiresAt.String()
			}
			return nil, fmt.Errorf("configuration %s is locked by %s %s", configHash, existingLock.Owner, expiresMsg)
		}
	}

	// Create new lock
	now := time.Now().UTC()
	expiresAt := now.Add(timeout)
	lockInfo := &models.ConfigLockInfo{
		ID:         uuid.New(),
		ConfigHash: configHash,
		LockType:   lockType,
		Owner:      owner,
		AcquiredAt: now,
		ExpiresAt:  &expiresAt,
		IsActive:   true,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	// Store lock in database
	if err := cls.storeLock(ctx, lockInfo); err != nil {
		return nil, fmt.Errorf("failed to store lock: %w", err)
	}

	cls.locksAcquired++
	log.Printf("ConfigLockingService: Successfully acquired %s lock %s for config %s", lockType, lockInfo.ID, configHash)

	return lockInfo, nil
}

// ReleaseConfigLock releases a distributed configuration lock
func (cls *ConfigLockingServiceImpl) ReleaseConfigLock(ctx context.Context, lockID uuid.UUID, owner string) error {
	log.Printf("ConfigLockingService: Releasing lock %s for owner %s", lockID, owner)

	// Get current lock
	lock, err := cls.getLockByID(ctx, lockID)
	if err != nil {
		return fmt.Errorf("failed to get lock: %w", err)
	}

	if lock == nil {
		return fmt.Errorf("lock %s not found", lockID)
	}

	// Verify ownership
	if lock.Owner != owner {
		return fmt.Errorf("lock %s is owned by %s, cannot release by %s", lockID, lock.Owner, owner)
	}

	// Release lock
	if err := cls.releaseLockInternal(ctx, lockID); err != nil {
		return fmt.Errorf("failed to release lock: %w", err)
	}

	cls.locksReleased++
	log.Printf("ConfigLockingService: Successfully released lock %s", lockID)

	return nil
}

// RefreshConfigLock extends the timeout of an existing lock
func (cls *ConfigLockingServiceImpl) RefreshConfigLock(ctx context.Context, lockID uuid.UUID, owner string, newTimeout time.Duration) error {
	log.Printf("ConfigLockingService: Refreshing lock %s for owner %s, new timeout %v", lockID, owner, newTimeout)

	lock, err := cls.getLockByID(ctx, lockID)
	if err != nil {
		return fmt.Errorf("failed to get lock: %w", err)
	}

	if lock == nil {
		return fmt.Errorf("lock %s not found", lockID)
	}

	// Verify ownership
	if lock.Owner != owner {
		return fmt.Errorf("lock %s is owned by %s, cannot refresh by %s", lockID, lock.Owner, owner)
	}

	// Update expiration
	now := time.Now().UTC()
	expiresAt := now.Add(newTimeout)
	lock.ExpiresAt = &expiresAt
	lock.UpdatedAt = now

	if err := cls.updateLock(ctx, lock); err != nil {
		return fmt.Errorf("failed to update lock: %w", err)
	}

	log.Printf("ConfigLockingService: Successfully refreshed lock %s", lockID)
	return nil
}

// IsConfigLocked checks if a configuration is currently locked
func (cls *ConfigLockingServiceImpl) IsConfigLocked(ctx context.Context, configHash string) (bool, *models.ConfigLockInfo, error) {
	lock, err := cls.getActiveLock(ctx, configHash)
	if err != nil {
		return false, nil, fmt.Errorf("failed to check lock status: %w", err)
	}

	if lock == nil {
		return false, nil, nil
	}

	// Check if lock is expired
	if lock.ExpiresAt != nil && time.Now().UTC().After(*lock.ExpiresAt) {
		log.Printf("ConfigLockingService: Lock %s is expired, cleaning up", lock.ID)
		if err := cls.cleanupExpiredLock(ctx, lock.ID); err != nil {
			log.Printf("ConfigLockingService: Warning - failed to cleanup expired lock: %v", err)
		}
		return false, nil, nil
	}

	return true, lock, nil
}

// CleanupExpiredLocks removes all expired locks from the system
func (cls *ConfigLockingServiceImpl) CleanupExpiredLocks(ctx context.Context) (int, error) {
	log.Printf("ConfigLockingService: Cleaning up expired locks")

	query := `
		UPDATE config_locks 
		SET is_active = false, updated_at = NOW()
		WHERE is_active = true AND expires_at < NOW()
		RETURNING id
	`

	var cleanedLocks []uuid.UUID
	if err := cls.db.SelectContext(ctx, &cleanedLocks, query); err != nil {
		return 0, fmt.Errorf("failed to cleanup expired locks: %w", err)
	}

	count := len(cleanedLocks)
	if count > 0 {
		log.Printf("ConfigLockingService: Cleaned up %d expired locks", count)
	}

	return count, nil
}

// WithConfigLock executes an operation while holding a distributed configuration lock
func (cls *ConfigLockingServiceImpl) WithConfigLock(ctx context.Context, configHash string, lockType models.ConfigLockType, owner string, timeout time.Duration, operation func() error) error {
	log.Printf("ConfigLockingService: Executing operation with %s lock for config %s", lockType, configHash)

	// Acquire lock
	lock, err := cls.AcquireConfigLock(ctx, configHash, lockType, owner, timeout)
	if err != nil {
		return fmt.Errorf("failed to acquire lock: %w", err)
	}

	// Ensure lock is always released
	defer func() {
		if releaseErr := cls.ReleaseConfigLock(ctx, lock.ID, owner); releaseErr != nil {
			log.Printf("ConfigLockingService: Warning - failed to release lock %s: %v", lock.ID, releaseErr)
		}
	}()

	// Execute operation
	if err := operation(); err != nil {
		return fmt.Errorf("operation failed: %w", err)
	}

	log.Printf("ConfigLockingService: Successfully executed operation with lock %s", lock.ID)
	return nil
}

// Internal helper methods

func (cls *ConfigLockingServiceImpl) getLocalLock(configHash string) *sync.Mutex {
	cls.locksMutex.Lock()
	defer cls.locksMutex.Unlock()

	if lock, exists := cls.localLocks[configHash]; exists {
		return lock
	}

	lock := &sync.Mutex{}
	cls.localLocks[configHash] = lock
	return lock
}

func (cls *ConfigLockingServiceImpl) getActiveLock(ctx context.Context, configHash string) (*models.ConfigLockInfo, error) {
	query := `
		SELECT id, config_hash, lock_type, owner, acquired_at, expires_at, is_active, created_at, updated_at
		FROM config_locks 
		WHERE config_hash = $1 AND is_active = true
		ORDER BY acquired_at DESC
		LIMIT 1
	`

	var lock models.ConfigLockInfo
	err := cls.db.GetContext(ctx, &lock, query, configHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &lock, nil
}

func (cls *ConfigLockingServiceImpl) getLockByID(ctx context.Context, lockID uuid.UUID) (*models.ConfigLockInfo, error) {
	query := `
		SELECT id, config_hash, lock_type, owner, acquired_at, expires_at, is_active, created_at, updated_at
		FROM config_locks 
		WHERE id = $1
	`

	var lock models.ConfigLockInfo
	err := cls.db.GetContext(ctx, &lock, query, lockID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &lock, nil
}

func (cls *ConfigLockingServiceImpl) storeLock(ctx context.Context, lock *models.ConfigLockInfo) error {
	query := `
		INSERT INTO config_locks (id, config_hash, lock_type, owner, acquired_at, expires_at, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	_, err := cls.db.ExecContext(ctx, query,
		lock.ID, lock.ConfigHash, lock.LockType, lock.Owner,
		lock.AcquiredAt, lock.ExpiresAt, lock.IsActive,
		lock.CreatedAt, lock.UpdatedAt)

	return err
}

func (cls *ConfigLockingServiceImpl) updateLock(ctx context.Context, lock *models.ConfigLockInfo) error {
	query := `
		UPDATE config_locks 
		SET expires_at = $2, updated_at = $3
		WHERE id = $1
	`

	_, err := cls.db.ExecContext(ctx, query, lock.ID, lock.ExpiresAt, lock.UpdatedAt)
	return err
}

func (cls *ConfigLockingServiceImpl) refreshLockInternal(ctx context.Context, lock *models.ConfigLockInfo, timeout time.Duration) (*models.ConfigLockInfo, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(timeout)
	lock.ExpiresAt = &expiresAt
	lock.UpdatedAt = now

	if err := cls.updateLock(ctx, lock); err != nil {
		return nil, err
	}

	return lock, nil
}

func (cls *ConfigLockingServiceImpl) releaseLockInternal(ctx context.Context, lockID uuid.UUID) error {
	query := `
		UPDATE config_locks 
		SET is_active = false, updated_at = NOW()
		WHERE id = $1
	`

	_, err := cls.db.ExecContext(ctx, query, lockID)
	return err
}

func (cls *ConfigLockingServiceImpl) cleanupExpiredLock(ctx context.Context, lockID uuid.UUID) error {
	return cls.releaseLockInternal(ctx, lockID)
}

// GetMetrics returns locking service metrics
func (cls *ConfigLockingServiceImpl) GetMetrics() map[string]int64 {
	cls.locksMutex.RLock()
	defer cls.locksMutex.RUnlock()

	return map[string]int64{
		"locks_acquired": cls.locksAcquired,
		"locks_released": cls.locksReleased,
		"lock_timeouts":  cls.lockTimeouts,
		"lock_conflicts": cls.lockConflicts,
		"active_locks":   int64(len(cls.localLocks)),
	}
}
