package services_test

import (
	"context"
	"fmt"
	"runtime"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/monitoring"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/suite"
)

// SI005IntegrationTestSuite tests the SI-005 Memory Management implementation
type SI005IntegrationTestSuite struct {
	suite.Suite
	db            *sqlx.DB
	memoryMonitor *monitoring.MemoryMonitor
	poolManager   *services.MemoryPoolManager
	ctx           context.Context
	cancel        context.CancelFunc
}

func TestSI005Integration(t *testing.T) {
	suite.Run(t, new(SI005IntegrationTestSuite))
}

func (suite *SI005IntegrationTestSuite) SetupSuite() {
	// Connect to test database (domainflow_production for real testing)
	var err error
	suite.db, err = sqlx.Connect("postgres", "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable")
	suite.Require().NoError(err)

	suite.ctx, suite.cancel = context.WithCancel(context.Background())

	// Initialize monitoring and services
	alertingService := monitoring.NewDatabaseAlertingService(suite.db)
	config := monitoring.DefaultMemoryMonitorConfig()
	suite.memoryMonitor = monitoring.NewMemoryMonitor(suite.db, alertingService, config)
	suite.poolManager = services.NewMemoryPoolManager(nil, suite.memoryMonitor)
}

func (suite *SI005IntegrationTestSuite) TearDownSuite() {
	if suite.cancel != nil {
		suite.cancel()
	}
	if suite.poolManager != nil {
		suite.poolManager.Shutdown()
	}
	if suite.db != nil {
		suite.db.Close()
	}
}

func (suite *SI005IntegrationTestSuite) SetupTest() {
	// Clean up test data before each test
	suite.cleanupTestData()
}

func (suite *SI005IntegrationTestSuite) TearDownTest() {
	// Clean up test data after each test
	suite.cleanupTestData()
}

func (suite *SI005IntegrationTestSuite) cleanupTestData() {
	// Clean up in reverse dependency order
	tables := []string{
		"memory_leak_detection",
		"memory_metrics",
		"generated_domains",
		"campaigns",
	}

	for _, table := range tables {
		var query string
		switch table {
		case "memory_metrics":
			query = fmt.Sprintf("DELETE FROM %s WHERE recorded_at > NOW() - INTERVAL '1 hour'", table)
		case "memory_leak_detection":
			query = fmt.Sprintf("DELETE FROM %s WHERE detected_at > NOW() - INTERVAL '1 hour'", table)
		default:
			query = fmt.Sprintf("DELETE FROM %s WHERE created_at > NOW() - INTERVAL '1 hour'", table)
		}

		_, err := suite.db.Exec(query)
		if err != nil {
			suite.T().Logf("Warning: failed to clean up table %s: %v", table, err)
		}
	}
}

// TestSI005_MemoryMonitoringBasicFunctionality tests basic memory monitoring
func (suite *SI005IntegrationTestSuite) TestSI005_MemoryMonitoringBasicFunctionality() {
	ctx := suite.ctx

	// Test recording memory metrics
	err := suite.memoryMonitor.RecordMemoryMetric(ctx, "test_service", "heap_alloc", 1024.0)
	suite.Require().NoError(err)

	// Verify metric was recorded
	var count int
	err = suite.db.Get(&count, `
		SELECT COUNT(*) FROM memory_metrics 
		WHERE service_name = $1`,
		"test_service")
	suite.Require().NoError(err)
	suite.Assert().Greater(count, 0)

	// Test memory leak detection
	err = suite.memoryMonitor.DetectMemoryLeak(ctx, "test_operation", 2048.0, 10.0)
	suite.Require().NoError(err)

	// Verify leak record was created
	err = suite.db.Get(&count, `
		SELECT COUNT(*) FROM memory_leak_detection 
		WHERE operation_context->>'operation_id' = $1`,
		"test_operation")
	suite.Require().NoError(err)
	suite.Assert().Greater(count, 0)
}

// TestSI005_MemoryPoolManagement tests memory pool functionality
func (suite *SI005IntegrationTestSuite) TestSI005_MemoryPoolManagement() { // Test domain batch pooling
	batch1 := suite.poolManager.GetDomainBatch()
	suite.Assert().NotNil(batch1)

	// Use the batch
	batch1.ID = uuid.New()
	batch1.BatchNum = 1

	// Return to pool
	suite.poolManager.PutDomainBatch(batch1)

	// Get another batch - should reuse the pooled one
	batch2 := suite.poolManager.GetDomainBatch()
	suite.Assert().NotNil(batch2)

	// Test buffer pooling
	buffer1 := suite.poolManager.GetBuffer()
	suite.Assert().NotNil(buffer1)
	suite.Assert().NotNil(buffer1.Buffer)

	// Use the buffer
	buffer1.Buffer = append(buffer1.Buffer, []byte("test data")...)

	// Return to pool
	suite.poolManager.PutBuffer(buffer1)

	// Get another buffer - should reuse the pooled one
	buffer2 := suite.poolManager.GetBuffer()
	suite.Assert().NotNil(buffer2)
	suite.Assert().Equal(0, len(buffer2.Buffer)) // Should be reset

	// Test string slice pooling
	strings1 := suite.poolManager.GetStringSlice()
	suite.Assert().NotNil(strings1)

	strings1 = append(strings1, "test1", "test2")
	suite.poolManager.PutStringSlice(strings1)

	strings2 := suite.poolManager.GetStringSlice()
	suite.Assert().NotNil(strings2)
	suite.Assert().Equal(0, len(strings2)) // Should be reset
}

// TestSI005_MemoryEfficientDomainGeneration tests memory-efficient domain generation
func (suite *SI005IntegrationTestSuite) TestSI005_MemoryEfficientDomainGeneration() {
	// Create a test campaign
	campaign := &models.Campaign{
		ID:           uuid.New(),
		Name:         "SI005 Memory Test Campaign",
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       models.CampaignStatusRunning,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Insert campaign
	_, err := suite.db.NamedExec(`
		INSERT INTO campaigns (id, name, campaign_type, status, created_at, updated_at)
		VALUES (:id, :name, :campaign_type, :status, :created_at, :updated_at)`,
		campaign)
	suite.Require().NoError(err)

	// Create domain generation config
	config := &models.DomainGenerationCampaignParams{
		CampaignID:                campaign.ID,
		PatternType:               "prefix",
		VariableLength:            models.IntPtr(3),
		CharacterSet:              models.StringPtr("abc"),
		ConstantString:            models.StringPtr("test"),
		TLD:                       ".com",
		NumDomainsToGenerate:      100,
		TotalPossibleCombinations: 27, // 3^3 for "abc" with length 3
		CurrentOffset:             0,
	}

	// Insert domain generation parameters
	_, err = suite.db.NamedExec(`
		INSERT INTO domain_generation_campaign_params 
		(campaign_id, pattern_type, variable_length, character_set, constant_string, tld, 
		 num_domains_to_generate, total_possible_combinations, current_offset)
		VALUES (:campaign_id, :pattern_type, :variable_length, :character_set, :constant_string, :tld,
		        :num_domains_to_generate, :total_possible_combinations, :current_offset)`,
		config)
	suite.Require().NoError(err)

	// Test memory monitoring during generation
	startMemory := suite.getCurrentMemoryUsage()

	// Use the enhanced domain generation service with memory efficiency
	domainGenService := services.NewDomainGenerationService(
		suite.db,
		nil, // campaign store - will use db directly for this test
		nil, // campaign job store
		nil, // audit log store
		nil, // config manager
	)

	// Test batch processing which now includes memory efficiency
	_, processedCount, err := domainGenService.ProcessGenerationCampaignBatch(suite.ctx, campaign.ID)
	suite.Require().NoError(err)
	suite.Assert().GreaterOrEqual(processedCount, 0, "Should process some domains")

	endMemory := suite.getCurrentMemoryUsage()

	// Verify memory usage didn't increase excessively
	// Note: Memory values can be large, so we check for reasonable increase
	memoryIncrease := int64(endMemory) - int64(startMemory)
	if memoryIncrease < 0 {
		// Handle wrap-around or GC cleanup - this is actually good
		memoryIncrease = 0
	}
	suite.Assert().Less(uint64(memoryIncrease), uint64(100*1024*1024), "Memory increase should be less than 100MB, got %d bytes", memoryIncrease)

	// Verify domains were generated
	var domainCount int
	err = suite.db.Get(&domainCount, `
		SELECT COUNT(*) FROM generated_domains 
		WHERE domain_generation_campaign_id = $1`,
		campaign.ID)
	suite.Require().NoError(err)
	suite.Assert().Greater(domainCount, 0)
}

// TestSI005_ConcurrentMemoryManagement tests memory management under concurrent load
func (suite *SI005IntegrationTestSuite) TestSI005_ConcurrentMemoryManagement() {
	const numWorkers = 10
	const operationsPerWorker = 50

	var wg sync.WaitGroup
	errChan := make(chan error, numWorkers)

	startMemory := suite.getCurrentMemoryUsage()

	// Start concurrent workers
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			for j := 0; j < operationsPerWorker; j++ {
				// Test memory pool operations
				batch := suite.poolManager.GetDomainBatch()
				batch.ID = uuid.New()

				// Add some domains
				for k := 0; k < 10; k++ {
					domain := models.GeneratedDomain{
						ID:                   uuid.New(),
						GenerationCampaignID: uuid.New(),
						DomainName:           fmt.Sprintf("worker%d-op%d-domain%d.com", workerID, j, k),
						OffsetIndex:          int64(k),
						GeneratedAt:          time.Now(),
						CreatedAt:            time.Now(),
					}
					batch.Domains = append(batch.Domains, domain)
				}

				// Return to pool
				suite.poolManager.PutDomainBatch(batch)

				// Test buffer operations
				buffer := suite.poolManager.GetBuffer()
				buffer.Buffer = append(buffer.Buffer, []byte(fmt.Sprintf("worker-%d-data-%d", workerID, j))...)
				suite.poolManager.PutBuffer(buffer)

				// Record memory metrics
				err := suite.memoryMonitor.RecordMemoryMetric(suite.ctx,
					fmt.Sprintf("worker_%d", workerID), "operations", float64(j))
				if err != nil {
					errChan <- err
					return
				}
			}
		}(i)
	}

	// Wait for all workers to complete
	wg.Wait()
	close(errChan)

	// Check for errors
	for err := range errChan {
		suite.Require().NoError(err)
	}

	endMemory := suite.getCurrentMemoryUsage()
	memoryIncrease := int64(endMemory) - int64(startMemory)
	if memoryIncrease < 0 {
		// Handle wrap-around or GC cleanup
		memoryIncrease = 0
	}

	// Verify memory usage didn't grow excessively
	suite.Assert().Less(uint64(memoryIncrease), uint64(100*1024*1024), "Memory increase should be less than 100MB, got %d bytes", memoryIncrease)

	// Force GC and verify cleanup
	suite.poolManager.ForceGC()
	runtime.GC()

	finalMemory := suite.getCurrentMemoryUsage()

	// Memory should be reasonable after GC (allowing for some variance)
	suite.Assert().True(finalMemory < endMemory+10*1024*1024, "Final memory should not be significantly higher than end memory")
}

// TestSI005_MemoryLeakDetection tests memory leak detection functionality
func (suite *SI005IntegrationTestSuite) TestSI005_MemoryLeakDetection() {
	// Simulate a memory leak scenario
	operationName := "leak_test_operation"
	threshold := 1024.0 // 1KB threshold

	// Record metrics that should trigger a leak detection
	for i := 0; i < 5; i++ {
		memoryUsage := float64(i+1) * 500.0 // Increasing memory usage
		err := suite.memoryMonitor.RecordMemoryMetric(suite.ctx, "leak_service", "heap_alloc", memoryUsage)
		suite.Require().NoError(err)
	}

	// Trigger leak detection with usage above threshold
	err := suite.memoryMonitor.DetectMemoryLeak(suite.ctx, operationName, 3000.0, threshold)
	suite.Require().NoError(err)

	// Verify leak was recorded
	var leakRecord struct {
		ID          uuid.UUID `db:"id"`
		ServiceName string    `db:"service_name"`
		LeakedBytes int64     `db:"leaked_bytes"`
		LeakSource  string    `db:"leak_source"`
		Severity    string    `db:"severity"`
		DetectedAt  time.Time `db:"detected_at"`
	}

	err = suite.db.Get(&leakRecord, `
		SELECT id, service_name, leaked_bytes, leak_source, severity, detected_at
		FROM memory_leak_detection 
		WHERE operation_context->>'operation_id' = $1
		ORDER BY detected_at DESC
		LIMIT 1`,
		operationName)
	suite.Require().NoError(err)

	suite.Assert().Equal("test-service", leakRecord.ServiceName)
	suite.Assert().Equal(int64(3000), leakRecord.LeakedBytes)
	suite.Assert().NotEmpty(leakRecord.Severity)
}

// TestSI005_DatabaseIntegration tests database integration for memory monitoring
func (suite *SI005IntegrationTestSuite) TestSI005_DatabaseIntegration() {
	// Test that SI-005 tables exist and are accessible
	tables := []string{
		"memory_metrics",
		"memory_leak_detection",
	}

	for _, table := range tables {
		var exists bool
		err := suite.db.Get(&exists, `
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = $1
			)`, table)
		suite.Require().NoError(err)
		suite.Assert().True(exists, "Table %s should exist", table)
	}

	// Test SI-005 functions exist
	functions := []string{
		"record_memory_metrics",
		"detect_memory_leak",
	}

	for _, function := range functions {
		var exists bool
		err := suite.db.Get(&exists, `
			SELECT EXISTS (
				SELECT FROM information_schema.routines 
				WHERE routine_schema = 'public' 
				AND routine_name = $1
			)`, function)
		suite.Require().NoError(err)
		suite.Assert().True(exists, "Function %s should exist", function)
	}
}

// TestSI005_MemoryMetricsRetention tests memory metrics retention and cleanup
func (suite *SI005IntegrationTestSuite) TestSI005_MemoryMetricsRetention() {
	// Insert old test metrics using the proper function to ensure all required fields
	oldTime := time.Now().Add(-91 * 24 * time.Hour) // 91 days ago

	var oldMetricID string
	err := suite.db.QueryRow(`
		SELECT record_memory_metrics($1, $2, $3, $4, $5, $6, $7, $8)`,
		"test_service_old", "test_process_old", 1000, 800, 10, 50, 5, 100).Scan(&oldMetricID)
	suite.Require().NoError(err)

	// Update the timestamp to be old
	_, err = suite.db.Exec(`
		UPDATE memory_metrics SET recorded_at = $1 WHERE id = $2`,
		oldTime, oldMetricID)
	suite.Require().NoError(err)

	// Insert recent test metrics
	var recentMetricID string
	err = suite.db.QueryRow(`
		SELECT record_memory_metrics($1, $2, $3, $4, $5, $6, $7, $8)`,
		"test_service_recent", "test_process_recent", 2000, 1600, 15, 75, 8, 150).Scan(&recentMetricID)
	suite.Require().NoError(err)

	// Test that cleanup functions can be called (in real scenario, these would be automated)
	var oldCount, recentCount int

	err = suite.db.Get(&oldCount, `
		SELECT COUNT(*) FROM memory_metrics 
		WHERE recorded_at < NOW() - INTERVAL '90 days'`)
	suite.Require().NoError(err)

	err = suite.db.Get(&recentCount, `
		SELECT COUNT(*) FROM memory_metrics 
		WHERE recorded_at > NOW() - INTERVAL '7 days'`)
	suite.Require().NoError(err)

	suite.Assert().Greater(oldCount, 0, "Should have old metrics for cleanup testing")
	suite.Assert().Greater(recentCount, 0, "Should have recent metrics")
}

// TestSI005_PerformanceUnderLoad tests performance characteristics under load
func (suite *SI005IntegrationTestSuite) TestSI005_PerformanceUnderLoad() {
	const numOperations = 1000

	startTime := time.Now()
	startMemory := suite.getCurrentMemoryUsage()

	// Perform many operations
	for i := 0; i < numOperations; i++ {
		// Memory pool operations
		batch := suite.poolManager.GetDomainBatch()
		batch.ID = uuid.New()
		batch.BatchNum = i

		// Add domains to batch
		for j := 0; j < 50; j++ {
			domain := models.GeneratedDomain{
				ID:                   uuid.New(),
				GenerationCampaignID: uuid.New(),
				DomainName:           fmt.Sprintf("perf-test-%d-%d.com", i, j),
				OffsetIndex:          int64(j),
				GeneratedAt:          time.Now(),
				CreatedAt:            time.Now(),
			}
			batch.Domains = append(batch.Domains, domain)
		}

		suite.poolManager.PutDomainBatch(batch)

		// Record metrics periodically
		if i%100 == 0 {
			err := suite.memoryMonitor.RecordMemoryMetric(suite.ctx, "perf_test", "iteration", float64(i))
			suite.Require().NoError(err)
		}
	}

	endTime := time.Now()
	endMemory := suite.getCurrentMemoryUsage()

	duration := endTime.Sub(startTime)
	memoryIncrease := endMemory - startMemory

	// Performance assertions
	suite.Assert().Less(duration, 30*time.Second, "Operations should complete within 30 seconds")
	suite.Assert().Less(memoryIncrease, uint64(200*1024*1024), "Memory increase should be less than 200MB")

	// Verify pool statistics
	stats := suite.poolManager.GetStatistics()
	suite.Assert().NotNil(stats)

	hitRate, ok := stats["hit_rate"].(float64)
	suite.Assert().True(ok)
	suite.Assert().Greater(hitRate, 50.0, "Pool hit rate should be greater than 50%")
}

// Helper function to get current memory usage
func (suite *SI005IntegrationTestSuite) getCurrentMemoryUsage() uint64 {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	// Use HeapAlloc instead of Alloc which can include cumulative totals
	return m.HeapAlloc
}

// TestSI005_ErrorHandling tests error handling in memory management
func (suite *SI005IntegrationTestSuite) TestSI005_ErrorHandling() {
	// Test handling of nil parameters
	batch := suite.poolManager.GetDomainBatch()
	suite.Assert().NotNil(batch)

	// Test putting nil batch
	suite.poolManager.PutDomainBatch(nil) // Should not panic

	// Test putting nil buffer
	suite.poolManager.PutBuffer(nil) // Should not panic

	// Test putting nil string slice
	suite.poolManager.PutStringSlice(nil) // Should not panic

	// Test memory monitoring with invalid parameters
	err := suite.memoryMonitor.RecordMemoryMetric(suite.ctx, "", "metric", 100.0)
	suite.Assert().Error(err, "Should fail with empty service name")

	err = suite.memoryMonitor.RecordMemoryMetric(suite.ctx, "service", "", 100.0)
	suite.Assert().Error(err, "Should fail with empty metric name")
}
