// File: backend/internal/services/config_manager.go
package services

import (
	"context"
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ConfigManagerInterface defines the interface for thread-safe configuration management
type ConfigManagerInterface interface {
	// Configuration retrieval with copy-on-read semantics
	GetDomainGenerationConfig(ctx context.Context, configHash string) (*models.ConfigVersion, error)

	// Atomic configuration updates with versioning
	UpdateDomainGenerationConfig(ctx context.Context, configHash string, updateFn func(*models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error)) (*models.ConfigVersion, error)

	// Atomic configuration updates with automatic retry on version conflicts
	UpdateDomainGenerationConfigWithRetry(ctx context.Context, configHash string, updateFn func(*models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error), maxRetries int) (*models.ConfigVersion, error)

	// Configuration state coordination
	CoordinateConfigAccess(ctx context.Context, configHash string, operation string, actor string, fn func(config *models.DomainGenerationConfigState) error) error

	// Version management
	GetConfigVersion(ctx context.Context, configHash string) (*models.ConfigVersion, error)
	InvalidateConfigCache(ctx context.Context, configHash string) error

	// Metrics and monitoring
	GetConfigMetrics() map[string]int64
}

// ConfigManagerImpl provides thread-safe configuration management with copy-on-write semantics
// Enhanced with BF-005 distributed locking and consistency validation
type ConfigManagerImpl struct {
	db               *sqlx.DB
	campaignStore    store.CampaignStore
	stateCoordinator StateCoordinator

	// BF-005: Distributed locking and consistency validation
	lockingService       config.ConfigLockingService
	consistencyValidator config.ConfigConsistencyValidator

	// Configuration cache with copy-on-write semantics
	configCache map[string]*atomicConfigEntry
	cacheMutex  sync.RWMutex

	// Configuration access coordination
	configLocks map[string]*sync.RWMutex
	locksMutex  sync.RWMutex

	// Version management
	versionCounter int64

	// Metrics
	cacheHits         int64
	cacheMisses       int64
	updateCount       int64
	coordinationCount int64
	distributedLocks  int64
	validationChecks  int64
	metricsLock       sync.RWMutex
}

// atomicConfigEntry provides atomic access to configuration with versioning
type atomicConfigEntry struct {
	config      atomic.Value // holds *models.ConfigVersion
	lastAccess  int64        // unix timestamp
	accessCount int64
}

// ConfigManagerConfig holds configuration for the config manager
type ConfigManagerConfig struct {
	EnableCaching       bool
	CacheEvictionTime   time.Duration
	MaxCacheEntries     int
	EnableStateTracking bool
}

// NewConfigManager creates a new thread-safe configuration manager
func NewConfigManager(
	db *sqlx.DB,
	campaignStore store.CampaignStore,
	stateCoordinator StateCoordinator,
	config ConfigManagerConfig,
) ConfigManagerInterface {
	return NewConfigManagerWithServices(db, campaignStore, stateCoordinator, nil, nil, config)
}

// NewConfigManagerWithServices creates a new configuration manager with BF-005 enhancements
func NewConfigManagerWithServices(
	db *sqlx.DB,
	campaignStore store.CampaignStore,
	stateCoordinator StateCoordinator,
	lockingService config.ConfigLockingService,
	consistencyValidator config.ConfigConsistencyValidator,
	config ConfigManagerConfig,
) ConfigManagerInterface {
	cm := &ConfigManagerImpl{
		db:                   db,
		campaignStore:        campaignStore,
		stateCoordinator:     stateCoordinator,
		lockingService:       lockingService,
		consistencyValidator: consistencyValidator,
		configCache:          make(map[string]*atomicConfigEntry),
		configLocks:          make(map[string]*sync.RWMutex),
	}

	log.Printf("ConfigManager: Initialized with caching=%v, state_tracking=%v, distributed_locking=%v, consistency_validation=%v",
		config.EnableCaching, config.EnableStateTracking,
		lockingService != nil, consistencyValidator != nil)

	return cm
}

// GetDomainGenerationConfig retrieves configuration with copy-on-read semantics
func (cm *ConfigManagerImpl) GetDomainGenerationConfig(ctx context.Context, configHash string) (*models.ConfigVersion, error) {
	log.Printf("ConfigManager: Getting domain generation config for hash %s", configHash)

	// Try cache first (read-only access)
	if cachedConfig := cm.getCachedConfig(configHash); cachedConfig != nil {
		atomic.AddInt64(&cm.cacheHits, 1)
		log.Printf("ConfigManager: Cache hit for config hash %s", configHash)

		// Return a deep copy to ensure copy-on-read semantics
		return cm.deepCopyConfigVersion(cachedConfig), nil
	}

	atomic.AddInt64(&cm.cacheMisses, 1)

	// Get configuration lock for this hash
	lock := cm.getConfigLock(configHash)
	lock.RLock()
	defer lock.RUnlock()

	// Double-check cache after acquiring lock
	if cachedConfig := cm.getCachedConfig(configHash); cachedConfig != nil {
		log.Printf("ConfigManager: Cache hit after lock for config hash %s", configHash)
		return cm.deepCopyConfigVersion(cachedConfig), nil
	}

	// Load from database
	configState, err := cm.campaignStore.GetDomainGenerationConfigStateByHash(ctx, cm.db, configHash)
	if err != nil {
		if err == store.ErrNotFound {
			log.Printf("ConfigManager: Configuration not found for hash %s", configHash)
			return nil, nil
		}
		return nil, fmt.Errorf("failed to load config from database: %w", err)
	}

	if configState == nil {
		log.Printf("ConfigManager: No configuration found for hash %s", configHash)
		return nil, nil
	}

	// Create versioned configuration
	configVersion := &models.ConfigVersion{
		ID:           uuid.New(),
		ConfigHash:   configHash,
		Version:      cm.getNextVersion(),
		ConfigState:  configState,
		CreatedAt:    time.Now().UTC(),
		LastAccessed: time.Now().UTC(),
	}

	// Cache the configuration
	cm.setCachedConfig(configHash, configVersion)

	log.Printf("ConfigManager: Loaded and cached config for hash %s, version %d", configHash, configVersion.Version)

	// Return a deep copy
	return cm.deepCopyConfigVersion(configVersion), nil
}

// UpdateDomainGenerationConfig performs atomic configuration updates with versioning
// Enhanced with BF-005 distributed locking and consistency validation
func (cm *ConfigManagerImpl) UpdateDomainGenerationConfig(ctx context.Context, configHash string, updateFn func(*models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error)) (*models.ConfigVersion, error) {
	log.Printf("ConfigManager: Updating domain generation config for hash %s with BF-005 enhancements", configHash)

	atomic.AddInt64(&cm.updateCount, 1)

	// BF-005 Enhancement: Use distributed locking if available
	if cm.lockingService != nil {
		return cm.updateWithDistributedLocking(ctx, configHash, updateFn)
	}

	// Fallback to local locking for backward compatibility
	return cm.updateWithLocalLocking(ctx, configHash, updateFn)
}

// updateWithDistributedLocking performs update with BF-005 distributed locking
func (cm *ConfigManagerImpl) updateWithDistributedLocking(ctx context.Context, configHash string, updateFn func(*models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error)) (*models.ConfigVersion, error) {
	owner := fmt.Sprintf("config_manager_%d", time.Now().UnixNano())
	timeout := 30 * time.Second

	atomic.AddInt64(&cm.distributedLocks, 1)

	var result *models.ConfigVersion
	var updateErr error

	// Use distributed locking service for COW configuration updates
	lockErr := cm.lockingService.WithConfigLock(ctx, configHash, models.ConfigLockTypeExclusive, owner, timeout, func() error {
		// Pre-update consistency validation
		if cm.consistencyValidator != nil {
			atomic.AddInt64(&cm.validationChecks, 1)
			log.Printf("ConfigManager: Validating config consistency before update for hash %s", configHash)

			// Get current state for validation
			currentConfig, err := cm.getDomainGenerationConfigInternal(ctx, configHash)
			if err != nil {
				return fmt.Errorf("failed to get config for validation: %w", err)
			}

			var currentState *models.DomainGenerationConfigState
			if currentConfig != nil {
				currentState = currentConfig.ConfigState
			}

			validationResult, err := cm.consistencyValidator.ValidateConfigConsistency(ctx, configHash, currentState)
			if err != nil {
				log.Printf("ConfigManager: Consistency validation failed for hash %s: %v", configHash, err)
				return fmt.Errorf("consistency validation failed: %w", err)
			}

			if !validationResult.IsValid {
				log.Printf("ConfigManager: Configuration invalid for hash %s: %v", configHash, validationResult.ValidationErrors)
				return fmt.Errorf("configuration validation failed: %v", validationResult.ValidationErrors)
			}

			log.Printf("ConfigManager: Configuration validation passed for hash %s", configHash)
		}

		// Perform the actual update within the distributed lock
		result, updateErr = cm.updateWithLocalLocking(ctx, configHash, updateFn)
		if updateErr != nil {
			return updateErr
		}

		// Post-update integrity verification
		if cm.consistencyValidator != nil {
			log.Printf("ConfigManager: Verifying config integrity after update for hash %s", configHash)

			integrityResult, err := cm.consistencyValidator.VerifyConfigIntegrity(ctx, configHash, result.ConfigState)
			if err != nil {
				log.Printf("ConfigManager: Integrity verification failed for hash %s: %v", configHash, err)
				return fmt.Errorf("integrity verification failed: %w", err)
			}

			if !integrityResult.IntegrityValid {
				log.Printf("ConfigManager: Configuration integrity invalid for hash %s: %v", configHash, integrityResult.IntegrityErrors)
				return fmt.Errorf("configuration integrity verification failed: %v", integrityResult.IntegrityErrors)
			}

			log.Printf("ConfigManager: Configuration integrity verified for hash %s", configHash)
		}

		return nil
	})

	if lockErr != nil {
		return nil, fmt.Errorf("distributed lock operation failed: %w", lockErr)
	}

	if updateErr != nil {
		return nil, updateErr
	}

	return result, nil
}

// updateWithLocalLocking performs update with local locking (original implementation)
func (cm *ConfigManagerImpl) updateWithLocalLocking(ctx context.Context, configHash string, updateFn func(*models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error)) (*models.ConfigVersion, error) {
	// Get exclusive lock for this configuration
	lock := cm.getConfigLock(configHash)
	lock.Lock()
	defer lock.Unlock()

	// Get current configuration without acquiring additional locks (we already have exclusive lock)
	currentConfig, err := cm.getDomainGenerationConfigInternal(ctx, configHash)
	if err != nil {
		return nil, fmt.Errorf("failed to get current config for update: %w", err)
	}

	var currentState *models.DomainGenerationConfigState
	if currentConfig != nil {
		currentState = currentConfig.ConfigState
	}

	// Apply update function with copy-on-write semantics
	updatedState, err := updateFn(cm.deepCopyConfigState(currentState))
	if err != nil {
		return nil, fmt.Errorf("update function failed: %w", err)
	}

	if updatedState == nil {
		return nil, fmt.Errorf("update function returned nil state")
	}

	// Create new version
	newVersion := &models.ConfigVersion{
		ID:           uuid.New(),
		ConfigHash:   configHash,
		Version:      cm.getNextVersion(),
		ConfigState:  updatedState,
		CreatedAt:    time.Now().UTC(),
		LastAccessed: time.Now().UTC(),
	}

	// Persist to database within transaction
	err = cm.executeInTransaction(ctx, func(tx *sqlx.Tx) error {
		// Update the configuration state
		if err := cm.campaignStore.CreateOrUpdateDomainGenerationConfigState(ctx, tx, updatedState); err != nil {
			return fmt.Errorf("failed to persist config state: %w", err)
		}

		// Track configuration change event through StateCoordinator
		if cm.stateCoordinator != nil {
			eventContext := models.NewStateEventContext("config_manager", "config_update")
			eventContext.BusinessContext["config_hash"] = configHash
			if currentConfig != nil {
				eventContext.BusinessContext["previous_version"] = currentConfig.Version
			}
			eventContext.BusinessContext["new_version"] = newVersion.Version
			eventContext.BusinessContext["last_offset"] = updatedState.LastOffset

			// Note: This is a configuration change, not a campaign state change
			// We could extend StateCoordinator to handle config events or log directly
			if currentConfig != nil {
				log.Printf("ConfigManager: Config state updated - hash: %s, version: %d -> %d, offset: %d",
					configHash, currentConfig.Version, newVersion.Version, updatedState.LastOffset)
			} else {
				log.Printf("ConfigManager: Config state created - hash: %s, version: %d, offset: %d",
					configHash, newVersion.Version, updatedState.LastOffset)
			}
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to persist configuration update: %w", err)
	}

	// Update cache atomically
	cm.setCachedConfig(configHash, newVersion)

	log.Printf("ConfigManager: Successfully updated config for hash %s to version %d", configHash, newVersion.Version)

	// Return a deep copy
	return cm.deepCopyConfigVersion(newVersion), nil
}

// UpdateDomainGenerationConfigWithRetry performs atomic update with automatic retry on version conflicts
func (cm *ConfigManagerImpl) UpdateDomainGenerationConfigWithRetry(ctx context.Context, configHash string, updateFn func(*models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error), maxRetries int) (*models.ConfigVersion, error) {
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		result, err := cm.UpdateDomainGenerationConfig(ctx, configHash, updateFn)
		if err == nil {
			return result, nil
		}

		// Check if this is a version mismatch error (retryable)
		if versionErr, ok := err.(*models.ConfigVersionMismatchError); ok {
			log.Printf("ConfigManager: Version conflict on attempt %d/%d for config %s: %v",
				attempt+1, maxRetries, configHash, versionErr)
			lastErr = err

			// Exponential backoff with jitter
			backoffMs := (attempt + 1) * 50
			time.Sleep(time.Duration(backoffMs) * time.Millisecond)
			continue
		}

		// Non-retryable error
		return nil, err
	}

	return nil, fmt.Errorf("failed to update config after %d retries, last error: %w", maxRetries, lastErr)
}

// CoordinateConfigAccess coordinates configuration access across concurrent operations
func (cm *ConfigManagerImpl) CoordinateConfigAccess(ctx context.Context, configHash string, operation string, actor string, fn func(config *models.DomainGenerationConfigState) error) error {
	log.Printf("ConfigManager: Coordinating config access for hash %s, operation %s, actor %s", configHash, operation, actor)

	atomic.AddInt64(&cm.coordinationCount, 1)

	// Get shared lock for read operations, exclusive for write operations
	lock := cm.getConfigLock(configHash)

	isWriteOperation := operation == "update" || operation == "create" || operation == "delete"

	if isWriteOperation {
		lock.Lock()
		defer lock.Unlock()
	} else {
		lock.RLock()
		defer lock.RUnlock()
	}

	// Get current configuration
	currentConfig, err := cm.GetDomainGenerationConfig(ctx, configHash)
	if err != nil {
		return fmt.Errorf("failed to get config for coordination: %w", err)
	}

	var configState *models.DomainGenerationConfigState
	if currentConfig != nil {
		configState = currentConfig.ConfigState
	}

	// Execute coordinated operation
	if err := fn(configState); err != nil {
		log.Printf("ConfigManager: Coordinated operation failed for hash %s: %v", configHash, err)
		return fmt.Errorf("coordinated operation failed: %w", err)
	}

	log.Printf("ConfigManager: Successfully coordinated config access for hash %s", configHash)
	return nil
}

// GetConfigVersion retrieves the current version of a configuration
func (cm *ConfigManagerImpl) GetConfigVersion(ctx context.Context, configHash string) (*models.ConfigVersion, error) {
	return cm.GetDomainGenerationConfig(ctx, configHash)
}

// InvalidateConfigCache invalidates the cache for a specific configuration
func (cm *ConfigManagerImpl) InvalidateConfigCache(ctx context.Context, configHash string) error {
	cm.cacheMutex.Lock()
	defer cm.cacheMutex.Unlock()

	delete(cm.configCache, configHash)
	log.Printf("ConfigManager: Invalidated cache for config hash %s", configHash)
	return nil
}

// GetConfigMetrics returns configuration manager metrics
func (cm *ConfigManagerImpl) GetConfigMetrics() map[string]int64 {
	cm.metricsLock.RLock()
	defer cm.metricsLock.RUnlock()

	cm.cacheMutex.RLock()
	cacheSize := int64(len(cm.configCache))
	cm.cacheMutex.RUnlock()

	cm.locksMutex.RLock()
	activeLocks := int64(len(cm.configLocks))
	cm.locksMutex.RUnlock()

	metrics := map[string]int64{
		"cache_hits":      atomic.LoadInt64(&cm.cacheHits),
		"cache_misses":    atomic.LoadInt64(&cm.cacheMisses),
		"updates":         atomic.LoadInt64(&cm.updateCount),
		"coordinations":   atomic.LoadInt64(&cm.coordinationCount),
		"cache_size":      cacheSize,
		"active_locks":    activeLocks,
		"version_counter": atomic.LoadInt64(&cm.versionCounter),
		// BF-005 enhancement metrics
		"distributed_locks": atomic.LoadInt64(&cm.distributedLocks),
		"validation_checks": atomic.LoadInt64(&cm.validationChecks),
	}

	// Include metrics from BF-005 services if available
	if cm.lockingService != nil {
		lockingMetrics := cm.lockingService.GetMetrics()
		for key, value := range lockingMetrics {
			metrics["locking_"+key] = value
		}
	}

	if cm.consistencyValidator != nil {
		validationMetrics := cm.consistencyValidator.GetValidationMetrics()
		for key, value := range validationMetrics {
			metrics["validation_"+key] = value
		}
	}

	return metrics
}

// Internal helper methods

func (cm *ConfigManagerImpl) getCachedConfig(configHash string) *models.ConfigVersion {
	cm.cacheMutex.RLock()
	defer cm.cacheMutex.RUnlock()

	entry, exists := cm.configCache[configHash]
	if !exists {
		return nil
	}

	// Update access tracking
	atomic.StoreInt64(&entry.lastAccess, time.Now().Unix())
	atomic.AddInt64(&entry.accessCount, 1)

	if configValue := entry.config.Load(); configValue != nil {
		if config, ok := configValue.(*models.ConfigVersion); ok {
			return config
		}
	}

	return nil
}

func (cm *ConfigManagerImpl) setCachedConfig(configHash string, config *models.ConfigVersion) {
	cm.cacheMutex.Lock()
	defer cm.cacheMutex.Unlock()

	entry, exists := cm.configCache[configHash]
	if !exists {
		entry = &atomicConfigEntry{}
		cm.configCache[configHash] = entry
	}

	entry.config.Store(config)
	atomic.StoreInt64(&entry.lastAccess, time.Now().Unix())
	atomic.AddInt64(&entry.accessCount, 1)
}

func (cm *ConfigManagerImpl) getConfigLock(configHash string) *sync.RWMutex {
	cm.locksMutex.Lock()
	defer cm.locksMutex.Unlock()

	if lock, exists := cm.configLocks[configHash]; exists {
		return lock
	}

	lock := &sync.RWMutex{}
	cm.configLocks[configHash] = lock
	return lock
}

func (cm *ConfigManagerImpl) getNextVersion() int64 {
	return atomic.AddInt64(&cm.versionCounter, 1)
}

func (cm *ConfigManagerImpl) deepCopyConfigVersion(config *models.ConfigVersion) *models.ConfigVersion {
	if config == nil {
		return nil
	}

	return &models.ConfigVersion{
		ID:           config.ID,
		ConfigHash:   config.ConfigHash,
		Version:      config.Version,
		ConfigState:  cm.deepCopyConfigState(config.ConfigState),
		CreatedAt:    config.CreatedAt,
		LastAccessed: time.Now().UTC(), // Update access time on copy
	}
}

func (cm *ConfigManagerImpl) deepCopyConfigState(state *models.DomainGenerationConfigState) *models.DomainGenerationConfigState {
	if state == nil {
		return nil
	}

	// Create a deep copy of the configuration state
	configDetailsCopy := make([]byte, len(state.ConfigDetails))
	copy(configDetailsCopy, state.ConfigDetails)

	return &models.DomainGenerationConfigState{
		ConfigHash:    state.ConfigHash,
		LastOffset:    state.LastOffset,
		ConfigDetails: configDetailsCopy,
		UpdatedAt:     state.UpdatedAt,
	}
}

// getDomainGenerationConfigInternal retrieves configuration without acquiring config locks
// Used internally when config locks are already held to prevent deadlocks
func (cm *ConfigManagerImpl) getDomainGenerationConfigInternal(ctx context.Context, configHash string) (*models.ConfigVersion, error) {
	// Try cache first (still need cache mutex since we're not holding it)
	if cachedConfig := cm.getCachedConfig(configHash); cachedConfig != nil {
		atomic.AddInt64(&cm.cacheHits, 1)
		log.Printf("ConfigManager: Internal cache hit for config hash %s", configHash)
		return cm.deepCopyConfigVersion(cachedConfig), nil
	}

	atomic.AddInt64(&cm.cacheMisses, 1)

	// Load from database (no config locking - caller already has lock)
	configState, err := cm.campaignStore.GetDomainGenerationConfigStateByHash(ctx, cm.db, configHash)
	if err != nil {
		if err == store.ErrNotFound {
			log.Printf("ConfigManager: Configuration not found for hash %s", configHash)
			return nil, nil
		}
		return nil, fmt.Errorf("failed to load config from database: %w", err)
	}

	if configState == nil {
		log.Printf("ConfigManager: No configuration found for hash %s", configHash)
		return nil, nil
	}

	// Create versioned configuration
	configVersion := &models.ConfigVersion{
		ID:           uuid.New(),
		ConfigHash:   configHash,
		Version:      cm.getNextVersion(),
		ConfigState:  configState,
		CreatedAt:    time.Now().UTC(),
		LastAccessed: time.Now().UTC(),
	}

	// Cache the configuration (still need cache mutex)
	cm.setCachedConfig(configHash, configVersion)

	log.Printf("ConfigManager: Loaded and cached config for hash %s, version %d", configHash, configVersion.Version)

	return cm.deepCopyConfigVersion(configVersion), nil
}

// executeInTransaction executes a function within a database transaction
// Handles both real StateCoordinator and mock scenarios
func (cm *ConfigManagerImpl) executeInTransaction(ctx context.Context, fn func(*sqlx.Tx) error) error {
	// Check if we have a real StateCoordinator with transaction manager
	if stateCoordImpl, ok := cm.stateCoordinator.(*StateCoordinatorImpl); ok {
		return stateCoordImpl.transactionMgr.SafeTransaction(ctx, nil, "config_update", fn)
	}

	// For mocks or other implementations, execute directly with DB
	if cm.db != nil {
		tx, err := cm.db.BeginTxx(ctx, nil)
		if err != nil {
			return fmt.Errorf("failed to begin transaction: %w", err)
		}

		defer func() {
			if r := recover(); r != nil {
				_ = tx.Rollback()
				panic(r)
			}
		}()

		if err := fn(tx); err != nil {
			_ = tx.Rollback()
			return err
		}

		return tx.Commit()
	}

	// For testing scenarios without DB, just call the function with nil tx
	return fn(nil)
}
