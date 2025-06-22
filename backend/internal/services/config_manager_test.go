// File: backend/internal/services/config_manager_test.go
package services

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ConfigManagerMockCampaignStore for config manager testing
type ConfigManagerMockCampaignStore struct {
	configs map[string]*models.DomainGenerationConfigState
	mutex   sync.RWMutex
}

// BeginTxx implements the Transactor interface
func (m *ConfigManagerMockCampaignStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	// For testing purposes, return nil (no transaction needed in mock)
	return nil, nil
}

func (m *ConfigManagerMockCampaignStore) GetDomainGenerationConfigStateByHash(ctx context.Context, exec store.Querier, configHash string) (*models.DomainGenerationConfigState, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if config, exists := m.configs[configHash]; exists {
		// Return a copy to simulate database behavior
		return &models.DomainGenerationConfigState{
			ConfigHash:    config.ConfigHash,
			LastOffset:    config.LastOffset,
			ConfigDetails: append([]byte(nil), config.ConfigDetails...),
			UpdatedAt:     config.UpdatedAt,
		}, nil
	}
	return nil, store.ErrNotFound
}

func (m *ConfigManagerMockCampaignStore) CreateOrUpdateDomainGenerationConfigState(ctx context.Context, exec store.Querier, state *models.DomainGenerationConfigState) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if m.configs == nil {
		m.configs = make(map[string]*models.DomainGenerationConfigState)
	}

	// Simulate atomic database update
	m.configs[state.ConfigHash] = &models.DomainGenerationConfigState{
		ConfigHash:    state.ConfigHash,
		LastOffset:    state.LastOffset,
		ConfigDetails: append([]byte(nil), state.ConfigDetails...),
		UpdatedAt:     state.UpdatedAt,
	}

	return nil
}

// BL-002: Atomic configuration methods for race condition remediation
func (m *ConfigManagerMockCampaignStore) AtomicUpdateDomainGenerationConfigState(ctx context.Context, exec store.Querier, request *models.ConfigUpdateRequest) (*models.AtomicConfigUpdateResult, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if m.configs == nil {
		m.configs = make(map[string]*models.DomainGenerationConfigState)
	}

	current := m.configs[request.ConfigHash]
	if current == nil {
		// Config doesn't exist, create new one
		newState := &models.DomainGenerationConfigState{
			ConfigHash:    request.ConfigHash,
			LastOffset:    request.NewLastOffset,
			ConfigDetails: request.ConfigDetails,
			UpdatedAt:     time.Now().UTC(),
		}
		m.configs[request.ConfigHash] = newState

		return &models.AtomicConfigUpdateResult{
			Success:    true,
			NewVersion: 1,
		}, nil
	}

	// Simulate version checking
	if request.ExpectedVersion > 0 && current.LastOffset != request.ExpectedVersion {
		return &models.AtomicConfigUpdateResult{
			Success:         false,
			ConflictVersion: current.LastOffset,
			ErrorMessage:    sql.NullString{String: "Version mismatch", Valid: true},
		}, nil
	}

	// Check for offset regression
	if request.NewLastOffset < current.LastOffset {
		return &models.AtomicConfigUpdateResult{
			Success:         false,
			ConflictVersion: current.LastOffset,
			ErrorMessage:    sql.NullString{String: "Offset regression detected", Valid: true},
		}, nil
	}

	// Update state
	updatedState := &models.DomainGenerationConfigState{
		ConfigHash:    request.ConfigHash,
		LastOffset:    request.NewLastOffset,
		ConfigDetails: request.ConfigDetails,
		UpdatedAt:     time.Now().UTC(),
	}
	m.configs[request.ConfigHash] = updatedState

	return &models.AtomicConfigUpdateResult{
		Success:    true,
		NewVersion: current.LastOffset + 1,
	}, nil
}

func (m *ConfigManagerMockCampaignStore) GetVersionedDomainGenerationConfigState(ctx context.Context, exec store.Querier, configHash string, lockType models.ConfigLockType) (*models.VersionedDomainGenerationConfigState, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	if config, exists := m.configs[configHash]; exists {
		return &models.VersionedDomainGenerationConfigState{
			ConfigHash:    config.ConfigHash,
			LastOffset:    config.LastOffset,
			ConfigDetails: append([]byte(nil), config.ConfigDetails...),
			UpdatedAt:     config.UpdatedAt,
			CreatedAt:     config.UpdatedAt,  // Mock created time
			Version:       config.LastOffset, // Mock version as offset for testing
		}, nil
	}
	return nil, store.ErrNotFound
}

func (m *ConfigManagerMockCampaignStore) ValidateConfigConsistency(ctx context.Context, exec store.Querier, configHash string) (*models.ConfigValidationResult, error) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	result := &models.ConfigValidationResult{
		ConfigHash:       configHash,
		IsValid:          true,
		ValidationChecks: make([]models.ConfigValidationCheck, 0),
		ValidatedAt:      time.Now().UTC(),
	}

	if config, exists := m.configs[configHash]; !exists {
		result.IsValid = false
		result.ValidationErrors = []string{"Configuration not found"}
		result.ValidationChecks = append(result.ValidationChecks, models.ConfigValidationCheck{
			CheckType:    "config_exists",
			CheckPassed:  false,
			ErrorMessage: "Configuration not found",
			CheckedAt:    time.Now().UTC(),
		})
	} else {
		result.CurrentVersion = config.LastOffset
		result.CurrentOffset = config.LastOffset
		result.ValidationChecks = append(result.ValidationChecks, models.ConfigValidationCheck{
			CheckType:   "config_exists",
			CheckPassed: true,
			CheckedAt:   time.Now().UTC(),
		})
	}

	return result, nil
}

// Mock required methods for store.CampaignStore interface
func (m *ConfigManagerMockCampaignStore) CreateCampaign(ctx context.Context, exec store.Querier, campaign *models.Campaign) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) GetCampaignByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.Campaign, error) {
	return nil, nil
}

func (m *ConfigManagerMockCampaignStore) UpdateCampaign(ctx context.Context, exec store.Querier, campaign *models.Campaign) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) DeleteCampaign(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) ListCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) ([]*models.Campaign, error) {
	return nil, nil
}

func (m *ConfigManagerMockCampaignStore) CountCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) (int64, error) {
	return 0, nil
}

func (m *ConfigManagerMockCampaignStore) UpdateCampaignStatus(ctx context.Context, exec store.Querier, id uuid.UUID, status models.CampaignStatusEnum, errorMessage sql.NullString) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) UpdateCampaignProgress(ctx context.Context, exec store.Querier, id uuid.UUID, processedItems, totalItems int64, progressPercentage float64) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) CreateDomainGenerationParams(ctx context.Context, exec store.Querier, params *models.DomainGenerationCampaignParams) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) GetDomainGenerationParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.DomainGenerationCampaignParams, error) {
	return nil, nil
}

func (m *ConfigManagerMockCampaignStore) UpdateDomainGenerationParamsOffset(ctx context.Context, exec store.Querier, campaignID uuid.UUID, newOffset int64) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) CreateGeneratedDomains(ctx context.Context, exec store.Querier, domains []*models.GeneratedDomain) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) GetGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit int, lastOffsetIndex int64) ([]*models.GeneratedDomain, error) {
	return nil, nil
}

func (m *ConfigManagerMockCampaignStore) CountGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int64, error) {
	return 0, nil
}

func (m *ConfigManagerMockCampaignStore) CreateDNSValidationParams(ctx context.Context, exec store.Querier, params *models.DNSValidationCampaignParams) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) GetDNSValidationParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.DNSValidationCampaignParams, error) {
	return nil, nil
}

func (m *ConfigManagerMockCampaignStore) CreateDNSValidationResults(ctx context.Context, exec store.Querier, results []*models.DNSValidationResult) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) GetDNSValidationResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.DNSValidationResult, error) {
	return nil, nil
}

func (m *ConfigManagerMockCampaignStore) CountDNSValidationResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, onlyValid bool) (int64, error) {
	return 0, nil
}

func (m *ConfigManagerMockCampaignStore) GetDomainsForDNSValidation(ctx context.Context, exec store.Querier, dnsCampaignID uuid.UUID, sourceGenerationCampaignID uuid.UUID, limit int, lastOffsetIndex int64) ([]*models.GeneratedDomain, error) {
	return nil, nil
}

func (m *ConfigManagerMockCampaignStore) CreateHTTPKeywordParams(ctx context.Context, exec store.Querier, params *models.HTTPKeywordCampaignParams) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) GetHTTPKeywordParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.HTTPKeywordCampaignParams, error) {
	return nil, nil
}

func (m *ConfigManagerMockCampaignStore) CreateHTTPKeywordResults(ctx context.Context, exec store.Querier, results []*models.HTTPKeywordResult) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) GetHTTPKeywordResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.HTTPKeywordResult, error) {
	return nil, nil
}

func (m *ConfigManagerMockCampaignStore) GetDomainsForHTTPValidation(ctx context.Context, exec store.Querier, httpKeywordCampaignID uuid.UUID, sourceCampaignID uuid.UUID, limit int, lastDomainName string) ([]*models.DNSValidationResult, error) {
	return nil, nil
}

// User-filtered methods for security
func (m *ConfigManagerMockCampaignStore) GetCampaignByIDWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, userID uuid.UUID) (*models.Campaign, error) {
	return nil, nil
}

func (m *ConfigManagerMockCampaignStore) UpdateCampaignWithUserFilter(ctx context.Context, exec store.Querier, campaign *models.Campaign, userID uuid.UUID) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) DeleteCampaignWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, userID uuid.UUID) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) UpdateCampaignStatusWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, status models.CampaignStatusEnum, errorMessage sql.NullString, userID uuid.UUID) error {
	return nil
}

func (m *ConfigManagerMockCampaignStore) UpdateCampaignProgressWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, processedItems, totalItems int64, progressPercentage float64, userID uuid.UUID) error {
	return nil
}

// ConfigManagerMockStateCoordinator for testing
type ConfigManagerMockStateCoordinator struct {
	transactionMgr *ConfigManagerMockTransactionManager
}

func (m *ConfigManagerMockStateCoordinator) TransitionState(ctx context.Context, campaignID uuid.UUID, toState models.CampaignStatusEnum, source models.StateEventSourceEnum, actor, reason string, context *models.StateEventContext) error {
	return nil
}

func (m *ConfigManagerMockStateCoordinator) ValidateStateConsistency(ctx context.Context, campaignID uuid.UUID) error {
	return nil
}

func (m *ConfigManagerMockStateCoordinator) ReconcileState(ctx context.Context, campaignID uuid.UUID) error {
	return nil
}

func (m *ConfigManagerMockStateCoordinator) GetStateHistory(ctx context.Context, campaignID uuid.UUID, limit, offset int) ([]*models.StateChangeEvent, error) {
	return nil, nil
}

func (m *ConfigManagerMockStateCoordinator) AddEventHandler(eventType models.StateEventTypeEnum, handler StateEventHandler) {
}

func (m *ConfigManagerMockStateCoordinator) AddStateValidator(validator StateValidator) {}

func (m *ConfigManagerMockStateCoordinator) GetMetrics() map[string]int64 {
	return make(map[string]int64)
}

// ConfigManagerMockTransactionManager for testing
type ConfigManagerMockTransactionManager struct {
}

func (m *ConfigManagerMockTransactionManager) SafeTransaction(ctx context.Context, opts *sql.TxOptions, operation string, fn func(*sqlx.Tx) error) error {
	// For testing, just call the function with a nil transaction
	return fn(nil)
}

// Helper function to create test configuration manager
func createTestConfigManager() (ConfigManagerInterface, *ConfigManagerMockCampaignStore, *ConfigManagerMockStateCoordinator) {
	mockStore := &ConfigManagerMockCampaignStore{
		configs: make(map[string]*models.DomainGenerationConfigState),
	}

	mockTransactionMgr := &ConfigManagerMockTransactionManager{}
	mockStateCoordinator := &ConfigManagerMockStateCoordinator{
		transactionMgr: mockTransactionMgr,
	}

	cm := &ConfigManagerImpl{
		db:               nil, // Using mocks, no actual DB needed
		campaignStore:    mockStore,
		stateCoordinator: mockStateCoordinator,
		configCache:      make(map[string]*atomicConfigEntry),
		configLocks:      make(map[string]*sync.RWMutex),
	}

	// Mock the transaction manager
	cm.stateCoordinator.(*ConfigManagerMockStateCoordinator).transactionMgr = mockTransactionMgr

	return cm, mockStore, mockStateCoordinator
}

// Test basic configuration retrieval
func TestConfigManager_GetDomainGenerationConfig_Basic(t *testing.T) {
	cm, mockStore, _ := createTestConfigManager()
	ctx := context.Background()
	configHash := "test-hash-123"

	// Test case 1: Config doesn't exist
	config, err := cm.GetDomainGenerationConfig(ctx, configHash)
	assert.NoError(t, err)
	assert.Nil(t, config)

	// Test case 2: Config exists
	expectedState := &models.DomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    42,
		ConfigDetails: []byte(`{"test": "data"}`),
		UpdatedAt:     time.Now().UTC(),
	}

	mockStore.configs[configHash] = expectedState

	config, err = cm.GetDomainGenerationConfig(ctx, configHash)
	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.Equal(t, configHash, config.ConfigHash)
	assert.Equal(t, int64(42), config.ConfigState.LastOffset)

	// Verify it's a copy (copy-on-read semantics)
	config.ConfigState.LastOffset = 999

	config2, err := cm.GetDomainGenerationConfig(ctx, configHash)
	assert.NoError(t, err)
	assert.Equal(t, int64(42), config2.ConfigState.LastOffset) // Should still be 42
}

// Test configuration updates with copy-on-write semantics
func TestConfigManager_UpdateDomainGenerationConfig_CopyOnWrite(t *testing.T) {
	cm, mockStore, _ := createTestConfigManager()
	ctx := context.Background()
	configHash := "test-hash-update"

	// Initial state
	initialState := &models.DomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    100,
		ConfigDetails: []byte(`{"initial": "data"}`),
		UpdatedAt:     time.Now().UTC(),
	}
	mockStore.configs[configHash] = initialState

	// Test update
	newVersion, err := cm.UpdateDomainGenerationConfig(ctx, configHash, func(current *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
		assert.NotNil(t, current)
		assert.Equal(t, int64(100), current.LastOffset)

		// Return updated state
		updated := &models.DomainGenerationConfigState{
			ConfigHash:    configHash,
			LastOffset:    200,
			ConfigDetails: []byte(`{"updated": "data"}`),
			UpdatedAt:     time.Now().UTC(),
		}
		return updated, nil
	})

	assert.NoError(t, err)
	assert.NotNil(t, newVersion)
	assert.Equal(t, int64(200), newVersion.ConfigState.LastOffset)

	// Verify persistence
	stored := mockStore.configs[configHash]
	assert.Equal(t, int64(200), stored.LastOffset)
	assert.Equal(t, `{"updated": "data"}`, string(stored.ConfigDetails))
}

// Test concurrent configuration access with 100+ goroutines
func TestConfigManager_ConcurrentAccess_HighLoad(t *testing.T) {
	cm, mockStore, _ := createTestConfigManager()
	ctx := context.Background()
	configHash := "concurrent-test-hash"

	// Initialize configuration
	initialState := &models.DomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    0,
		ConfigDetails: []byte(`{"test": "concurrent"}`),
		UpdatedAt:     time.Now().UTC(),
	}
	mockStore.configs[configHash] = initialState

	const numGoroutines = 150
	const operationsPerGoroutine = 10

	var wg sync.WaitGroup
	var readCount, updateCount int64
	var errors int64

	// Start concurrent readers
	wg.Add(numGoroutines)
	for i := 0; i < numGoroutines; i++ {
		go func(id int) {
			defer wg.Done()

			for j := 0; j < operationsPerGoroutine; j++ {
				if id%3 == 0 {
					// Reader
					config, err := cm.GetDomainGenerationConfig(ctx, configHash)
					if err != nil {
						atomic.AddInt64(&errors, 1)
					} else if config != nil {
						atomic.AddInt64(&readCount, 1)
					}
				} else {
					// Updater
					_, err := cm.UpdateDomainGenerationConfig(ctx, configHash, func(current *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
						if current == nil {
							return nil, fmt.Errorf("unexpected nil current state")
						}

						updated := &models.DomainGenerationConfigState{
							ConfigHash:    configHash,
							LastOffset:    current.LastOffset + 1,
							ConfigDetails: current.ConfigDetails,
							UpdatedAt:     time.Now().UTC(),
						}
						return updated, nil
					})

					if err != nil {
						atomic.AddInt64(&errors, 1)
					} else {
						atomic.AddInt64(&updateCount, 1)
					}
				}

				// Small delay to increase concurrency pressure
				time.Sleep(time.Microsecond)
			}
		}(i)
	}

	wg.Wait()

	// Validate results
	assert.Equal(t, int64(0), errors, "No errors should occur during concurrent access")
	assert.True(t, readCount > 0, "Should have successful reads")
	assert.True(t, updateCount > 0, "Should have successful updates")

	// Verify final state consistency
	finalConfig, err := cm.GetDomainGenerationConfig(ctx, configHash)
	assert.NoError(t, err)
	assert.NotNil(t, finalConfig)

	// The final offset should be the number of successful updates
	expectedOffset := updateCount
	assert.Equal(t, expectedOffset, finalConfig.ConfigState.LastOffset)

	t.Logf("Concurrent test completed: %d reads, %d updates, %d errors", readCount, updateCount, errors)
}

// Test configuration coordination across operations
func TestConfigManager_CoordinateConfigAccess(t *testing.T) {
	cm, mockStore, _ := createTestConfigManager()
	ctx := context.Background()
	configHash := "coordination-test"

	// Setup initial config
	initialState := &models.DomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    500,
		ConfigDetails: []byte(`{"coordination": "test"}`),
		UpdatedAt:     time.Now().UTC(),
	}
	mockStore.configs[configHash] = initialState

	// Test read coordination
	err := cm.CoordinateConfigAccess(ctx, configHash, "read", "test-actor", func(config *models.DomainGenerationConfigState) error {
		assert.NotNil(t, config)
		assert.Equal(t, int64(500), config.LastOffset)
		return nil
	})
	assert.NoError(t, err)

	// Test write coordination
	err = cm.CoordinateConfigAccess(ctx, configHash, "update", "test-actor", func(config *models.DomainGenerationConfigState) error {
		assert.NotNil(t, config)
		assert.Equal(t, int64(500), config.LastOffset)
		// Modify some field (this doesn't persist since we're not calling update)
		config.LastOffset = 600
		return nil
	})
	assert.NoError(t, err)
}

// Test race condition detection in offset updates
func TestConfigManager_RaceConditionDetection(t *testing.T) {
	cm, mockStore, _ := createTestConfigManager()
	ctx := context.Background()
	configHash := "race-test-hash"

	// Initialize with specific offset
	initialState := &models.DomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    1000,
		ConfigDetails: []byte(`{"race": "test"}`),
		UpdatedAt:     time.Now().UTC(),
	}
	mockStore.configs[configHash] = initialState

	// Simulate race condition: trying to update to a lower offset
	_, err := cm.UpdateDomainGenerationConfig(ctx, configHash, func(current *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
		// This simulates what would happen in ProcessGenerationCampaignBatch
		// if there was a race condition
		if current.LastOffset > 900 {
			return nil, fmt.Errorf("detected race condition: trying to update offset to %d but current offset is %d", 900, current.LastOffset)
		}

		// This shouldn't be reached
		updated := &models.DomainGenerationConfigState{
			ConfigHash:    configHash,
			LastOffset:    900, // Lower than current
			ConfigDetails: current.ConfigDetails,
			UpdatedAt:     time.Now().UTC(),
		}
		return updated, nil
	})

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "detected race condition")

	// Verify original state is preserved
	config, err := cm.GetDomainGenerationConfig(ctx, configHash)
	assert.NoError(t, err)
	assert.Equal(t, int64(1000), config.ConfigState.LastOffset)
}

// Test cache functionality and metrics
func TestConfigManager_CacheAndMetrics(t *testing.T) {
	cm, mockStore, _ := createTestConfigManager()
	ctx := context.Background()
	configHash := "cache-test"

	// Setup config
	state := &models.DomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    123,
		ConfigDetails: []byte(`{"cache": "test"}`),
		UpdatedAt:     time.Now().UTC(),
	}
	mockStore.configs[configHash] = state

	// First access should be cache miss
	config1, err := cm.GetDomainGenerationConfig(ctx, configHash)
	assert.NoError(t, err)
	assert.NotNil(t, config1)

	// Second access should be cache hit
	config2, err := cm.GetDomainGenerationConfig(ctx, configHash)
	assert.NoError(t, err)
	assert.NotNil(t, config2)

	// Get metrics
	metrics := cm.GetConfigMetrics()
	assert.True(t, metrics["cache_hits"] >= 1)
	assert.True(t, metrics["cache_misses"] >= 1)
	assert.True(t, metrics["cache_size"] >= 1)

	t.Logf("Cache metrics: %+v", metrics)
}

// Test integration with domain generation workflow
func TestConfigManager_DomainGenerationIntegration(t *testing.T) {
	cm, mockStore, _ := createTestConfigManager()
	ctx := context.Background()
	configHash := "integration-test"

	// Simulate domain generation workflow
	initialOffset := int64(0)
	batchSize := int64(100)
	numBatches := 5

	// Initialize configuration
	initialState := &models.DomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    initialOffset,
		ConfigDetails: []byte(`{"pattern": "test", "tld": ".com"}`),
		UpdatedAt:     time.Now().UTC(),
	}
	mockStore.configs[configHash] = initialState

	// Simulate multiple batch processing cycles
	for batch := 0; batch < numBatches; batch++ {
		expectedOffset := int64(batch) * batchSize

		// Get current configuration
		currentConfig, err := cm.GetDomainGenerationConfig(ctx, configHash)
		require.NoError(t, err)
		require.NotNil(t, currentConfig)
		assert.Equal(t, expectedOffset, currentConfig.ConfigState.LastOffset)

		// Process batch (simulate domain generation)
		newOffset := expectedOffset + batchSize

		// Update configuration with new offset
		updatedConfig, err := cm.UpdateDomainGenerationConfig(ctx, configHash, func(current *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
			// Validate no race condition
			if current.LastOffset != expectedOffset {
				return nil, fmt.Errorf("race condition detected: expected offset %d, got %d", expectedOffset, current.LastOffset)
			}

			// Create updated state
			updated := &models.DomainGenerationConfigState{
				ConfigHash:    configHash,
				LastOffset:    newOffset,
				ConfigDetails: current.ConfigDetails,
				UpdatedAt:     time.Now().UTC(),
			}
			return updated, nil
		})

		require.NoError(t, err)
		assert.Equal(t, newOffset, updatedConfig.ConfigState.LastOffset)

		t.Logf("Batch %d: Updated offset from %d to %d", batch, expectedOffset, newOffset)
	}

	// Verify final state
	finalConfig, err := cm.GetDomainGenerationConfig(ctx, configHash)
	require.NoError(t, err)
	expectedFinalOffset := int64(numBatches) * batchSize
	assert.Equal(t, expectedFinalOffset, finalConfig.ConfigState.LastOffset)
}

// Test configuration invalidation
func TestConfigManager_InvalidateCache(t *testing.T) {
	cm, mockStore, _ := createTestConfigManager()
	ctx := context.Background()
	configHash := "invalidation-test"

	// Setup and cache configuration
	state := &models.DomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    777,
		ConfigDetails: []byte(`{"invalidation": "test"}`),
		UpdatedAt:     time.Now().UTC(),
	}
	mockStore.configs[configHash] = state

	// Access to cache it
	config1, err := cm.GetDomainGenerationConfig(ctx, configHash)
	assert.NoError(t, err)
	assert.NotNil(t, config1)

	// Verify it's cached
	metrics1 := cm.GetConfigMetrics()
	assert.True(t, metrics1["cache_size"] > 0)

	// Invalidate cache
	err = cm.InvalidateConfigCache(ctx, configHash)
	assert.NoError(t, err)

	// Verify cache is invalidated
	metrics2 := cm.GetConfigMetrics()
	assert.Equal(t, metrics1["cache_size"]-1, metrics2["cache_size"])
}

// Benchmark concurrent access
func BenchmarkConfigManager_ConcurrentAccess(b *testing.B) {
	cm, mockStore, _ := createTestConfigManager()
	ctx := context.Background()
	configHash := "benchmark-hash"

	// Setup initial config
	state := &models.DomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    0,
		ConfigDetails: []byte(`{"benchmark": "test"}`),
		UpdatedAt:     time.Now().UTC(),
	}
	mockStore.configs[configHash] = state

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			// Mix of reads and writes
			if time.Now().UnixNano()%10 < 8 {
				// 80% reads
				_, err := cm.GetDomainGenerationConfig(ctx, configHash)
				if err != nil {
					b.Errorf("Read error: %v", err)
				}
			} else {
				// 20% writes
				_, err := cm.UpdateDomainGenerationConfig(ctx, configHash, func(current *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
					if current == nil {
						return nil, fmt.Errorf("nil current state")
					}
					updated := &models.DomainGenerationConfigState{
						ConfigHash:    configHash,
						LastOffset:    current.LastOffset + 1,
						ConfigDetails: current.ConfigDetails,
						UpdatedAt:     time.Now().UTC(),
					}
					return updated, nil
				})
				if err != nil {
					b.Errorf("Update error: %v", err)
				}
			}
		}
	})
}
