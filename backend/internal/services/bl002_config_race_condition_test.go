// File: backend/internal/services/bl002_config_race_condition_test.go
package services_test

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
)

// BL002RaceConditionTestSuite tests the BL-002 remediation implementation
type BL002RaceConditionTestSuite struct {
	suite.Suite
	db               *sqlx.DB
	campaignStore    store.CampaignStore
	campaignJobStore store.CampaignJobStore
	auditLogStore    store.AuditLogStore
	configManager    services.ConfigManagerInterface
	stateCoordinator services.StateCoordinator
	dgService        services.DomainGenerationService
}

func (s *BL002RaceConditionTestSuite) SetupSuite() {
	// Get database connection
	dsn := os.Getenv("TEST_POSTGRES_DSN")
	if dsn == "" {
		dsn = "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable"
	}

	db, err := sqlx.Open("postgres", dsn)
	require.NoError(s.T(), err)

	err = db.Ping()
	require.NoError(s.T(), err)

	s.db = db
	s.campaignStore = postgres.NewCampaignStorePostgres(db)
	s.campaignJobStore = postgres.NewCampaignJobStorePostgres(db)
	s.auditLogStore = postgres.NewAuditLogStorePostgres(db)

	// Create StateCoordinator for centralized state management
	stateCoordinatorConfig := services.StateCoordinatorConfig{
		EnableValidation:     true,
		EnableReconciliation: false,
		ValidationInterval:   30 * time.Second,
	}
	s.stateCoordinator = services.NewStateCoordinator(s.db, s.campaignStore, s.auditLogStore, stateCoordinatorConfig)

	// Create ConfigManager for thread-safe configuration management
	configManagerConfig := services.ConfigManagerConfig{
		EnableCaching:       true,
		CacheEvictionTime:   time.Hour,
		MaxCacheEntries:     1000,
		EnableStateTracking: true,
	}
	s.configManager = services.NewConfigManager(s.db, s.campaignStore, s.stateCoordinator, configManagerConfig)
	s.dgService = services.NewDomainGenerationService(s.db, s.campaignStore, s.campaignJobStore, s.auditLogStore, s.configManager)
}

func (s *BL002RaceConditionTestSuite) TearDownSuite() {
	if s.db != nil {
		s.db.Close()
	}
}

func (s *BL002RaceConditionTestSuite) SetupTest() {
	// Clean up test data before each test
	_, err := s.db.Exec("DELETE FROM domain_generation_config_states WHERE config_hash LIKE 'test_%'")
	require.NoError(s.T(), err)
}

func TestBL002RaceConditionRemediation(t *testing.T) {
	suite.Run(t, new(BL002RaceConditionTestSuite))
}

// TestAtomicConfigUpdate tests basic atomic configuration updates
func (s *BL002RaceConditionTestSuite) TestAtomicConfigUpdate() {
	ctx := context.Background()
	configHash := "test_atomic_config_" + uuid.NewString()

	configDetails := json.RawMessage(`{"pattern": "test", "length": 3}`)

	// Test creating new config
	request := models.NewAtomicConfigUpdateRequest(configHash, 0, 100, configDetails)
	result, err := s.campaignStore.AtomicUpdateDomainGenerationConfigState(ctx, s.db, request)

	require.NoError(s.T(), err)
	require.NotNil(s.T(), result)
	assert.True(s.T(), result.Success)
	assert.Equal(s.T(), int64(1), result.NewVersion)
	assert.Equal(s.T(), int64(0), result.ConflictVersion)
	assert.False(s.T(), result.ErrorMessage.Valid)

	// Test updating existing config with correct version
	request2 := models.NewAtomicConfigUpdateRequest(configHash, 1, 200, configDetails)
	result2, err := s.campaignStore.AtomicUpdateDomainGenerationConfigState(ctx, s.db, request2)

	require.NoError(s.T(), err)
	require.NotNil(s.T(), result2)
	assert.True(s.T(), result2.Success)
	assert.Equal(s.T(), int64(2), result2.NewVersion)

	// Test version conflict (optimistic locking)
	request3 := models.NewAtomicConfigUpdateRequest(configHash, 1, 300, configDetails) // Wrong expected version
	result3, err := s.campaignStore.AtomicUpdateDomainGenerationConfigState(ctx, s.db, request3)

	require.NoError(s.T(), err)
	require.NotNil(s.T(), result3)
	assert.False(s.T(), result3.Success)
	assert.Equal(s.T(), int64(2), result3.ConflictVersion)
	assert.True(s.T(), result3.ErrorMessage.Valid)
	assert.Contains(s.T(), result3.ErrorMessage.String, "Version conflict")

	// Test offset regression protection
	request4 := models.NewAtomicConfigUpdateRequest(configHash, 2, 150, configDetails) // Moving backward
	result4, err := s.campaignStore.AtomicUpdateDomainGenerationConfigState(ctx, s.db, request4)

	require.NoError(s.T(), err)
	require.NotNil(s.T(), result4)
	assert.False(s.T(), result4.Success)
	assert.True(s.T(), result4.ErrorMessage.Valid)
	assert.Contains(s.T(), result4.ErrorMessage.String, "moving backward")
}

// TestVersionedConfigRetrieval tests versioned configuration retrieval with locking
func (s *BL002RaceConditionTestSuite) TestVersionedConfigRetrieval() {
	ctx := context.Background()
	configHash := "test_versioned_retrieval_" + uuid.NewString()

	configDetails := json.RawMessage(`{"pattern": "test", "length": 5}`)

	// Create config
	request := models.NewAtomicConfigUpdateRequest(configHash, 0, 500, configDetails)
	_, err := s.campaignStore.AtomicUpdateDomainGenerationConfigState(ctx, s.db, request)
	require.NoError(s.T(), err)

	// Test retrieval without lock
	state, err := s.campaignStore.GetVersionedDomainGenerationConfigState(ctx, s.db, configHash, models.ConfigLockTypeNone)
	require.NoError(s.T(), err)
	require.NotNil(s.T(), state)
	assert.Equal(s.T(), configHash, state.ConfigHash)
	assert.Equal(s.T(), int64(1), state.Version)
	assert.Equal(s.T(), int64(500), state.LastOffset)

	// Compare JSON semantically instead of byte-for-byte
	var expectedConfig, actualConfig map[string]interface{}
	err = json.Unmarshal(configDetails, &expectedConfig)
	require.NoError(s.T(), err)
	err = json.Unmarshal(state.ConfigDetails, &actualConfig)
	require.NoError(s.T(), err)
	assert.Equal(s.T(), expectedConfig, actualConfig, "Config details should match semantically")

	// Test retrieval with shared lock
	state2, err := s.campaignStore.GetVersionedDomainGenerationConfigState(ctx, s.db, configHash, models.ConfigLockTypeShared)
	require.NoError(s.T(), err)
	require.NotNil(s.T(), state2)
	assert.Equal(s.T(), state.Version, state2.Version)

	// Test retrieval with exclusive lock
	state3, err := s.campaignStore.GetVersionedDomainGenerationConfigState(ctx, s.db, configHash, models.ConfigLockTypeExclusive)
	require.NoError(s.T(), err)
	require.NotNil(s.T(), state3)
	assert.Equal(s.T(), state.Version, state3.Version)

	// Test retrieval of non-existent config
	_, err = s.campaignStore.GetVersionedDomainGenerationConfigState(ctx, s.db, "nonexistent", models.ConfigLockTypeNone)
	assert.Error(s.T(), err)
	assert.Equal(s.T(), store.ErrNotFound, err)
}

// TestConfigConsistencyValidation tests configuration consistency validation
func (s *BL002RaceConditionTestSuite) TestConfigConsistencyValidation() {
	ctx := context.Background()
	configHash := "test_consistency_" + uuid.NewString()

	configDetails := json.RawMessage(`{"pattern": "consistency", "length": 4}`)

	// Create valid config
	request := models.NewAtomicConfigUpdateRequest(configHash, 0, 1000, configDetails)
	_, err := s.campaignStore.AtomicUpdateDomainGenerationConfigState(ctx, s.db, request)
	require.NoError(s.T(), err)

	// Test validation of valid config
	result, err := s.campaignStore.ValidateConfigConsistency(ctx, s.db, configHash)
	require.NoError(s.T(), err)
	require.NotNil(s.T(), result)
	assert.True(s.T(), result.IsValid)
	assert.Equal(s.T(), configHash, result.ConfigHash)
	assert.Equal(s.T(), int64(1), result.CurrentVersion)
	assert.Equal(s.T(), int64(1000), result.CurrentOffset)
	assert.Empty(s.T(), result.ValidationErrors)
	assert.Len(s.T(), result.ValidationChecks, 3) // version, offset, config_details

	// Test validation of non-existent config
	result2, err := s.campaignStore.ValidateConfigConsistency(ctx, s.db, "nonexistent")
	require.NoError(s.T(), err)
	require.NotNil(s.T(), result2)
	assert.False(s.T(), result2.IsValid)
	assert.Contains(s.T(), result2.ValidationErrors[0], "Failed to retrieve config")
}

// TestHighConcurrencyAtomicUpdates tests atomic updates under high concurrency
func (s *BL002RaceConditionTestSuite) TestHighConcurrencyAtomicUpdates() {
	if testing.Short() {
		s.T().Skip("Skipping high concurrency test in short mode")
	}

	ctx := context.Background()
	configHash := "test_high_concurrency_" + uuid.NewString()

	configDetails := json.RawMessage(`{"pattern": "concurrent", "length": 6}`)

	// Create initial config
	request := models.NewAtomicConfigUpdateRequest(configHash, 0, 0, configDetails)
	_, err := s.campaignStore.AtomicUpdateDomainGenerationConfigState(ctx, s.db, request)
	require.NoError(s.T(), err)

	// Launch multiple concurrent workers to update the same config
	numWorkers := 50
	offsetIncrement := int64(10)

	var wg sync.WaitGroup
	successCount := int64(0)
	conflictCount := int64(0)
	var successMutex sync.Mutex
	var conflictMutex sync.Mutex

	startSignal := make(chan struct{})

	// Start all workers
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			// Wait for start signal
			<-startSignal

			// Try to update config using ConfigManager with retry
			_, updateErr := s.configManager.UpdateDomainGenerationConfigWithRetry(ctx, configHash, func(currentState *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
				if currentState == nil {
					return nil, fmt.Errorf("config state is nil")
				}

				return &models.DomainGenerationConfigState{
					ConfigHash:    configHash,
					LastOffset:    currentState.LastOffset + offsetIncrement,
					ConfigDetails: configDetails,
					UpdatedAt:     time.Now().UTC(),
				}, nil
			}, 5)

			if updateErr == nil {
				successMutex.Lock()
				successCount++
				successMutex.Unlock()
			} else {
				conflictMutex.Lock()
				conflictCount++
				conflictMutex.Unlock()
			}
		}(i)
	}

	// Start all workers simultaneously
	close(startSignal)

	// Wait for all workers to complete
	wg.Wait()

	// Verify results
	s.T().Logf("High concurrency test results: %d successful updates, %d conflicts out of %d workers",
		successCount, conflictCount, numWorkers)

	// All workers should either succeed or encounter version conflicts
	assert.Equal(s.T(), int64(numWorkers), successCount+conflictCount)

	// At least some operations should succeed
	assert.Greater(s.T(), successCount, int64(0))

	// Get final config state
	finalState, err := s.campaignStore.GetVersionedDomainGenerationConfigState(ctx, s.db, configHash, models.ConfigLockTypeNone)
	require.NoError(s.T(), err)
	require.NotNil(s.T(), finalState)

	// Final version should equal number of successful updates + 1 (initial)
	assert.Equal(s.T(), successCount+1, finalState.Version)

	// Final offset should be initial (0) + (successful updates * increment)
	expectedOffset := successCount * offsetIncrement
	assert.Equal(s.T(), expectedOffset, finalState.LastOffset)

	s.T().Logf("Final config state: version=%d, offset=%d", finalState.Version, finalState.LastOffset)
}

// TestConcurrentCampaignExecution tests concurrent campaign execution with race condition protection
func (s *BL002RaceConditionTestSuite) TestConcurrentCampaignExecution() {
	if testing.Short() {
		s.T().Skip("Skipping concurrent campaign test in short mode")
	}

	ctx := context.Background()

	// Create multiple campaigns with the same configuration to test race conditions
	numCampaigns := 10
	campaigns := make([]*models.Campaign, numCampaigns)

	baseUserID := uuid.New()
	baseName := "BL002 Concurrent Test " + uuid.NewString()
	testRunID := uuid.NewString()[:8] // Use short unique ID for this test run

	// All campaigns use the same configuration (same hash) but with more possible domains
	baseReq := services.CreateDomainGenerationCampaignRequest{
		UserID:               baseUserID,
		PatternType:          "prefix",
		VariableLength:       4,                       // Increased length
		CharacterSet:         "abcdef",                // Larger character set (6^4 = 1296 total domains)
		ConstantString:       "bl002test" + testRunID, // Unique prefix for this test run
		TLD:                  ".com",
		NumDomainsToGenerate: 50, // Reduced per campaign to ensure overlap
	}

	// Create campaigns sequentially first
	for i := 0; i < numCampaigns; i++ {
		req := baseReq
		req.Name = fmt.Sprintf("%s Campaign %d", baseName, i)

		campaign, err := s.dgService.CreateCampaign(ctx, req)
		require.NoError(s.T(), err, "Failed to create campaign %d", i)
		require.NotNil(s.T(), campaign)

		campaigns[i] = campaign
	}

	// Now process all campaigns concurrently
	var wg sync.WaitGroup
	processResults := make([]error, numCampaigns)
	totalProcessed := make([]int, numCampaigns)

	startSignal := make(chan struct{})

	for i := 0; i < numCampaigns; i++ {
		wg.Add(1)
		go func(campaignIndex int) {
			defer wg.Done()

			// Wait for start signal
			<-startSignal

			campaignID := campaigns[campaignIndex].ID
			totalProcessedForCampaign := 0

			// Process campaign in batches
			for batch := 0; batch < 5; batch++ {
				done, processedInBatch, err := s.dgService.ProcessGenerationCampaignBatch(ctx, campaignID)
				if err != nil {
					processResults[campaignIndex] = err
					return
				}

				totalProcessedForCampaign += processedInBatch

				if done {
					break
				}

				// Small delay between batches
				time.Sleep(10 * time.Millisecond)
			}

			totalProcessed[campaignIndex] = totalProcessedForCampaign
		}(i)
	}

	// Start all campaign processing simultaneously
	close(startSignal)

	// Wait for all campaigns to complete
	wg.Wait()

	// Verify results
	totalDomainsProcessed := 0
	successfulCampaigns := 0

	for i := 0; i < numCampaigns; i++ {
		if processResults[i] == nil {
			successfulCampaigns++
			totalDomainsProcessed += totalProcessed[i]
			s.T().Logf("Campaign %d successfully processed %d domains", i, totalProcessed[i])
		} else {
			s.T().Logf("Campaign %d failed with error: %v", i, processResults[i])
		}
	}

	// All campaigns should succeed (no race conditions)
	assert.Equal(s.T(), numCampaigns, successfulCampaigns, "All campaigns should succeed without race conditions")

	// Verify total domains processed is reasonable
	assert.Greater(s.T(), totalDomainsProcessed, 0, "Some domains should have been processed")

	s.T().Logf("Concurrent campaign execution results: %d/%d campaigns succeeded, %d total domains processed",
		successfulCampaigns, numCampaigns, totalDomainsProcessed)
}

// TestConfigManagerCacheConsistency tests cache consistency during concurrent operations
func (s *BL002RaceConditionTestSuite) TestConfigManagerCacheConsistency() {
	ctx := context.Background()
	configHash := "test_cache_consistency_" + uuid.NewString()

	// Initial config creation
	_, err := s.configManager.UpdateDomainGenerationConfig(ctx, configHash, func(currentState *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
		return &models.DomainGenerationConfigState{
			ConfigHash:    configHash,
			LastOffset:    0,
			ConfigDetails: json.RawMessage(`{"pattern": "cache_test"}`),
			UpdatedAt:     time.Now().UTC(),
		}, nil
	})
	require.NoError(s.T(), err)

	// Concurrent reads and writes
	numReaders := 20
	numWriters := 5

	var wg sync.WaitGroup
	readResults := make([]bool, numReaders)
	writeResults := make([]bool, numWriters)

	startSignal := make(chan struct{})

	// Start readers
	for i := 0; i < numReaders; i++ {
		wg.Add(1)
		go func(readerID int) {
			defer wg.Done()
			<-startSignal

			config, err := s.configManager.GetDomainGenerationConfig(ctx, configHash)
			readResults[readerID] = (err == nil && config != nil)
		}(i)
	}

	// Start writers
	for i := 0; i < numWriters; i++ {
		wg.Add(1)
		go func(writerID int) {
			defer wg.Done()
			<-startSignal

			_, err := s.configManager.UpdateDomainGenerationConfigWithRetry(ctx, configHash, func(currentState *models.DomainGenerationConfigState) (*models.DomainGenerationConfigState, error) {
				return &models.DomainGenerationConfigState{
					ConfigHash:    configHash,
					LastOffset:    currentState.LastOffset + 1,
					ConfigDetails: currentState.ConfigDetails,
					UpdatedAt:     time.Now().UTC(),
				}, nil
			}, 3)
			writeResults[writerID] = (err == nil)
		}(i)
	}

	// Start all operations
	close(startSignal)
	wg.Wait()

	// Verify all reads succeeded
	for i, success := range readResults {
		assert.True(s.T(), success, "Reader %d should succeed", i)
	}

	// Verify at least some writes succeeded
	successfulWrites := 0
	for _, success := range writeResults {
		if success {
			successfulWrites++
		}
	}
	assert.Greater(s.T(), successfulWrites, 0, "At least some writes should succeed")

	// Get metrics to verify caching is working
	metrics := s.configManager.GetConfigMetrics()
	assert.Greater(s.T(), metrics["cache_hits"], int64(0), "Cache should have some hits")

	s.T().Logf("Cache consistency test: %d readers succeeded, %d/%d writers succeeded, cache hits: %d",
		len(readResults), successfulWrites, numWriters, metrics["cache_hits"])
}
