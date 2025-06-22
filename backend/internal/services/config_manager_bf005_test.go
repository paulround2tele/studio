// File: backend/internal/services/config_manager_bf005_test.go
package services

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// BF-005 Test Suite: Concurrent Config State Corruption Prevention
// Tests copy-on-write configuration management with distributed locking

// setupPostgresTestDB creates a test database connection
func setupPostgresTestDB(t *testing.T) *sqlx.DB {
	t.Helper()

	dsn := os.Getenv("TEST_POSTGRES_DSN")
	if dsn == "" {
		dbConnBytes, err := os.ReadFile("../../.db_connection")
		if err == nil && len(dbConnBytes) > 0 {
			dsn = strings.TrimSpace(string(dbConnBytes))
		} else {
			dsn = "postgres://studio:studio@localhost:5432/domainflow_production?sslmode=disable"
		}
	}

	db, err := sqlx.Connect("postgres", dsn)
	require.NoError(t, err, "Failed to connect to test database")

	return db
}

// cleanupPostgresTestDB closes the database connection
func cleanupPostgresTestDB(t *testing.T, db *sqlx.DB) {
	t.Helper()
	if db != nil {
		db.Close()
	}
}

// runMigrations runs actual migration files for BF-005 testing
func runMigrations(t *testing.T, db *sqlx.DB, dsn string) {
	t.Helper()

	// Create UUID extension if needed
	_, err := db.Exec(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
	if err != nil {
		t.Logf("Warning: Could not create uuid-ossp extension: %v", err)
	}

	migrationsURL := "file://../../database/migrations"

	m, err := migrate.New(migrationsURL, dsn)
	if err != nil {
		t.Fatalf("Failed to create migrator: %v", err)
	}

	t.Logf("Running migrations from: %s", migrationsURL)
	err = m.Up()
	if err != nil && err != migrate.ErrNoChange {
		t.Fatalf("Failed to run migrations: %v", err)
	}

	// Close the migrator
	m.Close()
}

func TestBF005ConcurrentConfigStateCorruption(t *testing.T) {
	// Setup test database
	db := setupPostgresTestDB(t)
	defer cleanupPostgresTestDB(t, db)

	// Verify required tables exist (migrations already run manually)
	var tableExists bool
	err := db.Get(&tableExists, "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'versioned_configs')")
	require.NoError(t, err)
	if !tableExists {
		t.Skip("Required tables not found - please run migrations manually first")
	}

	// Setup test dependencies
	campaignStore := postgres.NewCampaignStorePostgres(db)
	auditLogStore := postgres.NewAuditLogStorePostgres(db)

	// Create BF-005 services
	lockingService := config.NewConfigLockingService(db, campaignStore)
	consistencyValidator := config.NewConfigConsistencyValidator(db, campaignStore, lockingService)

	// Create StateCoordinator for config manager
	stateCoordinator := NewStateCoordinator(db, campaignStore, auditLogStore, StateCoordinatorConfig{
		EnableValidation:     true,
		EnableReconciliation: true,
		ValidationInterval:   100 * time.Millisecond,
	})

	// Create ConfigManager with BF-005 enhancements
	configManager := NewConfigManagerWithServices(
		db, campaignStore, stateCoordinator,
		lockingService, consistencyValidator,
		ConfigManagerConfig{
			EnableCaching:       true,
			EnableStateTracking: true,
		},
	)

	t.Run("Concurrent Read Access", func(t *testing.T) {
		testConcurrentReadAccess(t, configManager, db)
	})

	t.Run("Concurrent Write Operations", func(t *testing.T) {
		testConcurrentWriteOperations(t, configManager, db)
	})

	t.Run("Copy-on-Write Semantics", func(t *testing.T) {
		testCopyOnWriteSemantics(t, configManager, db)
	})

	t.Run("Distributed Locking Prevention", func(t *testing.T) {
		testDistributedLockingPrevention(t, configManager, db, lockingService)
	})

	t.Run("Configuration Consistency Validation", func(t *testing.T) {
		testConfigurationConsistencyValidation(t, configManager, db, consistencyValidator)
	})

	t.Run("Race Condition Prevention", func(t *testing.T) {
		testRaceConditionPrevention(t, configManager, db)
	})

	t.Run("Configuration Corruption Detection", func(t *testing.T) {
		testConfigurationCorruptionDetection(t, configManager, db, consistencyValidator)
	})

	t.Run("Multi-Worker Concurrent Access", func(t *testing.T) {
		testMultiWorkerConcurrentAccess(t, configManager, db)
	})
}

// testConcurrentReadAccess tests concurrent read operations don't interfere
func testConcurrentReadAccess(t *testing.T, configManager ConfigManagerInterface, db *sqlx.DB) {
	ctx := context.Background()
	configHash := "test-concurrent-read-" + uuid.New().String()

	// Create initial configuration
	_, err := configManager.UpdateDomainGenerationConfig(ctx, configHash, func(state *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
		return &models.DomainGenerationConfigState{
			ConfigHash:    configHash,
			LastOffset:    1000,
			ConfigDetails: []byte(`{"test": "concurrent_read", "worker": "initial"}`),
			UpdatedAt:     time.Now().UTC(),
		}, nil
	})
	require.NoError(t, err)

	// Launch 10 concurrent readers
	const numReaders = 10
	var wg sync.WaitGroup
	results := make([]*models.ConfigVersion, numReaders)
	errors := make([]error, numReaders)

	for i := 0; i < numReaders; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			config, err := configManager.GetDomainGenerationConfig(ctx, configHash)
			results[workerID] = config
			errors[workerID] = err
		}(i)
	}

	wg.Wait()

	// Verify all reads succeeded
	for i := 0; i < numReaders; i++ {
		assert.NoError(t, errors[i], "Reader %d should not fail", i)
		assert.NotNil(t, results[i], "Reader %d should get config", i)
		assert.Equal(t, configHash, results[i].ConfigHash, "Reader %d should get correct config", i)
		assert.Equal(t, int64(1000), results[i].ConfigState.LastOffset, "Reader %d should get correct offset", i)
	}

	// Verify metrics
	metrics := configManager.GetConfigMetrics()
	assert.Greater(t, metrics["cache_hits"], int64(0), "Should have cache hits from concurrent reads")
}

// testConcurrentWriteOperations tests concurrent write operations with proper coordination
func testConcurrentWriteOperations(t *testing.T, configManager ConfigManagerInterface, db *sqlx.DB) {
	ctx := context.Background()
	configHash := "test-concurrent-write-" + uuid.New().String()

	// Launch 5 concurrent writers
	const numWriters = 5
	var wg sync.WaitGroup
	results := make([]*models.ConfigVersion, numWriters)
	errors := make([]error, numWriters)

	for i := 0; i < numWriters; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			config, err := configManager.UpdateDomainGenerationConfig(ctx, configHash, func(state *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
				currentOffset := int64(0)
				if state != nil {
					currentOffset = state.LastOffset
				}

				return &models.DomainGenerationConfigState{
					ConfigHash:    configHash,
					LastOffset:    currentOffset + int64(workerID*100),
					ConfigDetails: []byte(fmt.Sprintf(`{"test": "concurrent_write", "worker": %d}`, workerID)),
					UpdatedAt:     time.Now().UTC(),
				}, nil
			})
			results[workerID] = config
			errors[workerID] = err
		}(i)
	}

	wg.Wait()

	// Verify at least one write succeeded (others may fail due to coordination)
	successCount := 0
	for i := 0; i < numWriters; i++ {
		if errors[i] == nil {
			successCount++
			assert.NotNil(t, results[i], "Successful writer %d should get config", i)
			assert.Equal(t, configHash, results[i].ConfigHash, "Successful writer %d should get correct config", i)
		}
	}
	assert.Greater(t, successCount, 0, "At least one write should succeed")

	// Verify final state consistency
	finalConfig, err := configManager.GetDomainGenerationConfig(ctx, configHash)
	require.NoError(t, err)
	require.NotNil(t, finalConfig)
	assert.Equal(t, configHash, finalConfig.ConfigHash)

	// Verify metrics include distributed locking
	metrics := configManager.GetConfigMetrics()
	assert.Greater(t, metrics["updates"], int64(0), "Should have update operations")
	assert.Greater(t, metrics["distributed_locks"], int64(0), "Should have distributed lock operations")
}

// testCopyOnWriteSemantics verifies copy-on-write behavior prevents data corruption
func testCopyOnWriteSemantics(t *testing.T, configManager ConfigManagerInterface, db *sqlx.DB) {
	ctx := context.Background()
	configHash := "test-cow-semantics-" + uuid.New().String()

	// Create initial configuration
	_, err := configManager.UpdateDomainGenerationConfig(ctx, configHash, func(state *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
		return &models.DomainGenerationConfigState{
			ConfigHash:    configHash,
			LastOffset:    2000,
			ConfigDetails: []byte(`{"test": "cow_semantics", "value": "original"}`),
			UpdatedAt:     time.Now().UTC(),
		}, nil
	})
	require.NoError(t, err)

	// Get config reference
	config1, err := configManager.GetDomainGenerationConfig(ctx, configHash)
	require.NoError(t, err)
	require.NotNil(t, config1)

	// Modify the configuration
	config2, err := configManager.UpdateDomainGenerationConfig(ctx, configHash, func(state *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
		return &models.DomainGenerationConfigState{
			ConfigHash:    configHash,
			LastOffset:    3000,
			ConfigDetails: []byte(`{"test": "cow_semantics", "value": "modified"}`),
			UpdatedAt:     time.Now().UTC(),
		}, nil
	})
	require.NoError(t, err)

	// Verify copy-on-write: original reference should remain unchanged
	assert.Equal(t, int64(2000), config1.ConfigState.LastOffset, "Original config should not be modified")
	assert.Contains(t, string(config1.ConfigState.ConfigDetails), "original", "Original config should have original value")

	// Verify new reference has updated values
	assert.Equal(t, int64(3000), config2.ConfigState.LastOffset, "New config should have updated offset")
	assert.Contains(t, string(config2.ConfigState.ConfigDetails), "modified", "New config should have modified value")

	// Verify they are different objects
	assert.NotEqual(t, config1.Version, config2.Version, "Should have different versions")
	assert.True(t, config2.CreatedAt.After(config1.CreatedAt), "New config should be created later")
}

// testDistributedLockingPrevention tests distributed locking prevents race conditions
func testDistributedLockingPrevention(t *testing.T, configManager ConfigManagerInterface, db *sqlx.DB, lockingService config.ConfigLockingService) {
	ctx := context.Background()
	configHash := "test-distributed-locking-" + uuid.New().String()

	// Test manual lock acquisition
	owner1 := "test-owner-1"
	owner2 := "test-owner-2"
	timeout := 10 * time.Second

	// Acquire lock with first owner
	lock1, err := lockingService.AcquireConfigLock(ctx, configHash, models.ConfigLockTypeExclusive, owner1, timeout)
	require.NoError(t, err)
	require.NotNil(t, lock1)
	assert.Equal(t, owner1, lock1.Owner)
	assert.True(t, lock1.IsActive)

	// Verify second owner cannot acquire lock
	_, err = lockingService.AcquireConfigLock(ctx, configHash, models.ConfigLockTypeExclusive, owner2, timeout)
	assert.Error(t, err, "Second owner should not be able to acquire exclusive lock")
	assert.Contains(t, err.Error(), "is locked by", "Error should indicate lock conflict")

	// Check lock status
	isLocked, lockInfo, err := lockingService.IsConfigLocked(ctx, configHash)
	require.NoError(t, err)
	assert.True(t, isLocked, "Config should be locked")
	assert.Equal(t, owner1, lockInfo.Owner, "Lock should be owned by first owner")

	// Release lock
	err = lockingService.ReleaseConfigLock(ctx, lock1.ID, owner1)
	require.NoError(t, err)

	// Verify lock is released
	isLocked, _, err = lockingService.IsConfigLocked(ctx, configHash)
	require.NoError(t, err)
	assert.False(t, isLocked, "Config should not be locked after release")

	// Now second owner should be able to acquire lock
	lock2, err := lockingService.AcquireConfigLock(ctx, configHash, models.ConfigLockTypeExclusive, owner2, timeout)
	require.NoError(t, err)
	require.NotNil(t, lock2)
	assert.Equal(t, owner2, lock2.Owner)

	// Cleanup
	err = lockingService.ReleaseConfigLock(ctx, lock2.ID, owner2)
	require.NoError(t, err)

	// Verify metrics
	metrics := lockingService.GetMetrics()
	assert.Greater(t, metrics["locks_acquired"], int64(0), "Should have acquired locks")
	assert.Greater(t, metrics["locks_released"], int64(0), "Should have released locks")
	assert.Greater(t, metrics["lock_conflicts"], int64(0), "Should have lock conflicts")
}

// testConfigurationConsistencyValidation tests consistency validation features
func testConfigurationConsistencyValidation(t *testing.T, configManager ConfigManagerInterface, db *sqlx.DB, validator config.ConfigConsistencyValidator) {
	ctx := context.Background()
	configHash := "test-consistency-validation-" + uuid.New().String()

	testData := &models.DomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    4000,
		ConfigDetails: []byte(`{"test": "consistency_validation", "valid": true}`),
		UpdatedAt:     time.Now().UTC(),
	}

	// Test configuration consistency validation
	validationResult, err := validator.ValidateConfigConsistency(ctx, configHash, testData)
	require.NoError(t, err)
	require.NotNil(t, validationResult)
	assert.Equal(t, configHash, validationResult.ConfigHash)
	assert.True(t, validationResult.StructureValid, "Configuration structure should be valid")

	// Test corruption detection
	corruptionResult, err := validator.DetectConfigCorruption(ctx, configHash)
	require.NoError(t, err)
	require.NotNil(t, corruptionResult)
	assert.Equal(t, configHash, corruptionResult.ConfigHash)
	assert.False(t, corruptionResult.IsCorrupted, "New configuration should not be corrupted")

	// Test transaction atomicity validation
	configHashes := []string{configHash}
	transactionID := "test-transaction-" + uuid.New().String()
	atomicityResult, err := validator.ValidateTransactionAtomicity(ctx, transactionID, configHashes)
	require.NoError(t, err)
	require.NotNil(t, atomicityResult)
	assert.Equal(t, transactionID, atomicityResult.TransactionID)

	// Verify validation metrics
	metrics := validator.GetValidationMetrics()
	assert.Greater(t, metrics["validations_performed"], int64(0), "Should have performed validations")
	assert.Greater(t, metrics["integrity_checks"], int64(0), "Should have integrity checks")
}

// testRaceConditionPrevention tests prevention of race conditions in concurrent scenarios
func testRaceConditionPrevention(t *testing.T, configManager ConfigManagerInterface, db *sqlx.DB) {
	ctx := context.Background()
	configHash := "test-race-prevention-" + uuid.New().String()

	// Create initial configuration
	_, err := configManager.UpdateDomainGenerationConfig(ctx, configHash, func(state *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
		return &models.DomainGenerationConfigState{
			ConfigHash:    configHash,
			LastOffset:    5000,
			ConfigDetails: []byte(`{"test": "race_prevention", "counter": 0}`),
			UpdatedAt:     time.Now().UTC(),
		}, nil
	})
	require.NoError(t, err)

	// Launch 8 concurrent workers that increment a counter
	const numWorkers = 8
	var wg sync.WaitGroup
	successCount := int64(0)
	var successMutex sync.Mutex

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			// Use retry mechanism to handle race conditions
			_, err := configManager.UpdateDomainGenerationConfigWithRetry(ctx, configHash, func(state *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
				if state == nil {
					return nil, fmt.Errorf("state is nil")
				}

				// Simulate processing time to increase race condition likelihood
				time.Sleep(time.Millisecond * 10)

				return &models.DomainGenerationConfigState{
					ConfigHash:    configHash,
					LastOffset:    state.LastOffset + 1, // Increment counter
					ConfigDetails: []byte(fmt.Sprintf(`{"test": "race_prevention", "counter": %d, "worker": %d}`, state.LastOffset+1, workerID)),
					UpdatedAt:     time.Now().UTC(),
				}, nil
			}, 3) // Max 3 retries

			if err == nil {
				successMutex.Lock()
				successCount++
				successMutex.Unlock()
			}
		}(i)
	}

	wg.Wait()

	// At least some operations should succeed
	assert.Greater(t, successCount, int64(0), "At least some workers should succeed")

	// Get final configuration
	finalConfig, err := configManager.GetDomainGenerationConfig(ctx, configHash)
	require.NoError(t, err)
	require.NotNil(t, finalConfig)

	// Final offset should be consistent (initial + successful increments)
	expectedMinOffset := int64(5000) + 1                 // At least one increment
	expectedMaxOffset := int64(5000) + int64(numWorkers) // At most all increments
	assert.GreaterOrEqual(t, finalConfig.ConfigState.LastOffset, expectedMinOffset, "Final offset should be at least initial + 1")
	assert.LessOrEqual(t, finalConfig.ConfigState.LastOffset, expectedMaxOffset, "Final offset should not exceed initial + workers")

	t.Logf("Race condition test: %d/%d workers succeeded, final offset: %d", successCount, numWorkers, finalConfig.ConfigState.LastOffset)
}

// testConfigurationCorruptionDetection tests detection of various corruption scenarios
func testConfigurationCorruptionDetection(t *testing.T, configManager ConfigManagerInterface, db *sqlx.DB, validator config.ConfigConsistencyValidator) {
	ctx := context.Background()
	configHash := "test-corruption-detection-" + uuid.New().String()

	// Create configuration
	_, err := configManager.UpdateDomainGenerationConfig(ctx, configHash, func(state *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
		return &models.DomainGenerationConfigState{
			ConfigHash:    configHash,
			LastOffset:    6000,
			ConfigDetails: []byte(`{"test": "corruption_detection", "integrity": true}`),
			UpdatedAt:     time.Now().UTC(),
		}, nil
	})
	require.NoError(t, err)

	// Test corruption detection on clean configuration
	corruptionResult, err := validator.DetectConfigCorruption(ctx, configHash)
	require.NoError(t, err)
	require.NotNil(t, corruptionResult)
	assert.False(t, corruptionResult.IsCorrupted, "Clean configuration should not be corrupted")
	assert.Empty(t, corruptionResult.CorruptionDetails, "Clean configuration should have no corruption details")

	// Test integrity verification
	testData := &models.DomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    6000,
		ConfigDetails: []byte(`{"test": "corruption_detection", "integrity": true}`),
		UpdatedAt:     time.Now().UTC(),
	}

	integrityResult, err := validator.VerifyConfigIntegrity(ctx, configHash, testData)
	require.NoError(t, err)
	require.NotNil(t, integrityResult)
	assert.Equal(t, configHash, integrityResult.ConfigHash)
	assert.NotEmpty(t, integrityResult.ExpectedChecksum, "Should have expected checksum")
}

// testMultiWorkerConcurrentAccess tests comprehensive multi-worker concurrent access scenarios
func testMultiWorkerConcurrentAccess(t *testing.T, configManager ConfigManagerInterface, db *sqlx.DB) {
	ctx := context.Background()
	configHash := "test-multi-worker-" + uuid.New().String()

	// Test scenario 1: Mixed read/write operations
	t.Run("Mixed Read/Write Operations", func(t *testing.T) {
		// Create initial configuration
		_, err := configManager.UpdateDomainGenerationConfig(ctx, configHash+"-mixed", func(state *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
			return &models.DomainGenerationConfigState{
				ConfigHash:    configHash + "-mixed",
				LastOffset:    7000,
				ConfigDetails: []byte(`{"test": "multi_worker_mixed", "phase": "initial"}`),
				UpdatedAt:     time.Now().UTC(),
			}, nil
		})
		require.NoError(t, err)

		const numReaders = 15
		const numWriters = 5
		var wg sync.WaitGroup

		// Launch readers
		for i := 0; i < numReaders; i++ {
			wg.Add(1)
			go func(readerID int) {
				defer wg.Done()
				for j := 0; j < 3; j++ {
					config, err := configManager.GetDomainGenerationConfig(ctx, configHash+"-mixed")
					if err == nil && config != nil {
						assert.Equal(t, configHash+"-mixed", config.ConfigHash)
					}
					time.Sleep(time.Millisecond * 5)
				}
			}(i)
		}

		// Launch writers
		for i := 0; i < numWriters; i++ {
			wg.Add(1)
			go func(writerID int) {
				defer wg.Done()
				_, err := configManager.UpdateDomainGenerationConfigWithRetry(ctx, configHash+"-mixed", func(state *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
					if state == nil {
						return nil, fmt.Errorf("state is nil")
					}
					return &models.DomainGenerationConfigState{
						ConfigHash:    configHash + "-mixed",
						LastOffset:    state.LastOffset + int64(writerID),
						ConfigDetails: []byte(fmt.Sprintf(`{"test": "multi_worker_mixed", "phase": "writer_%d"}`, writerID)),
						UpdatedAt:     time.Now().UTC(),
					}, nil
				}, 3)
				if err != nil {
					t.Logf("Writer %d failed: %v", writerID, err)
				}
			}(i)
		}

		wg.Wait()

		// Verify final state
		finalConfig, err := configManager.GetDomainGenerationConfig(ctx, configHash+"-mixed")
		require.NoError(t, err)
		require.NotNil(t, finalConfig)
		assert.GreaterOrEqual(t, finalConfig.ConfigState.LastOffset, int64(7000), "Final offset should be at least initial")
	})

	// Test scenario 2: High-frequency updates
	t.Run("High-Frequency Updates", func(t *testing.T) {
		testHash := configHash + "-highfreq"
		const numWorkers = 20
		const updatesPerWorker = 2
		var wg sync.WaitGroup
		successCount := int64(0)
		var successMutex sync.Mutex

		for i := 0; i < numWorkers; i++ {
			wg.Add(1)
			go func(workerID int) {
				defer wg.Done()

				for update := 0; update < updatesPerWorker; update++ {
					_, err := configManager.UpdateDomainGenerationConfigWithRetry(ctx, testHash, func(state *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
						currentOffset := int64(8000)
						if state != nil {
							currentOffset = state.LastOffset
						}

						return &models.DomainGenerationConfigState{
							ConfigHash:    testHash,
							LastOffset:    currentOffset + 1,
							ConfigDetails: []byte(fmt.Sprintf(`{"test": "high_frequency", "worker": %d, "update": %d}`, workerID, update)),
							UpdatedAt:     time.Now().UTC(),
						}, nil
					}, 5) // Higher retry limit for high-frequency scenario

					if err == nil {
						successMutex.Lock()
						successCount++
						successMutex.Unlock()
					}

					// Small delay to prevent overwhelming the system
					time.Sleep(time.Millisecond * 2)
				}
			}(i)
		}

		wg.Wait()

		// Verify some operations succeeded
		assert.Greater(t, successCount, int64(0), "Some high-frequency updates should succeed")
		t.Logf("High-frequency test: %d/%d operations succeeded", successCount, numWorkers*updatesPerWorker)
	})

	// Test scenario 3: Coordinated access patterns
	t.Run("Coordinated Access Patterns", func(t *testing.T) {
		testHash := configHash + "-coordinated"
		const numWorkers = 12
		var wg sync.WaitGroup

		// Create initial configuration
		_, err := configManager.UpdateDomainGenerationConfig(ctx, testHash, func(state *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
			return &models.DomainGenerationConfigState{
				ConfigHash:    testHash,
				LastOffset:    9000,
				ConfigDetails: []byte(`{"test": "coordinated_access", "phase": "initial"}`),
				UpdatedAt:     time.Now().UTC(),
			}, nil
		})
		require.NoError(t, err)

		// Launch coordinated workers
		for i := 0; i < numWorkers; i++ {
			wg.Add(1)
			go func(workerID int) {
				defer wg.Done()

				// Coordinate config access
				err := configManager.CoordinateConfigAccess(ctx, testHash, "read", fmt.Sprintf("worker-%d", workerID), func(config *models.DomainGenerationConfigState) error {
					if config != nil {
						assert.Equal(t, testHash, config.ConfigHash)
						assert.GreaterOrEqual(t, config.LastOffset, int64(9000))
					}

					// Simulate processing
					time.Sleep(time.Millisecond * 5)
					return nil
				})

				if err != nil {
					t.Logf("Coordinated access failed for worker %d: %v", workerID, err)
				}
			}(i)
		}

		wg.Wait()
	})

	// Verify final metrics
	metrics := configManager.GetConfigMetrics()
	assert.Greater(t, metrics["cache_hits"]+metrics["cache_misses"], int64(0), "Should have cache activity")
	assert.Greater(t, metrics["updates"], int64(0), "Should have update operations")
	assert.Greater(t, metrics["coordinations"], int64(0), "Should have coordination operations")
	assert.Greater(t, metrics["distributed_locks"], int64(0), "Should have distributed lock operations")
	assert.Greater(t, metrics["validation_checks"], int64(0), "Should have validation checks")

	t.Logf("Final metrics: cache_hits=%d, cache_misses=%d, updates=%d, coordinations=%d, distributed_locks=%d, validation_checks=%d",
		metrics["cache_hits"], metrics["cache_misses"], metrics["updates"],
		metrics["coordinations"], metrics["distributed_locks"], metrics["validation_checks"])
}
