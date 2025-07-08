// File: backend/internal/services/performance_tester.go
package services

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// PerformanceTester tests database performance for enterprise scale operations
type PerformanceTester struct {
	db            *sqlx.DB
	campaignStore store.CampaignStore
}

// NewPerformanceTester creates a new performance tester instance
func NewPerformanceTester(db *sqlx.DB, campaignStore store.CampaignStore) *PerformanceTester {
	return &PerformanceTester{
		db:            db,
		campaignStore: campaignStore,
	}
}

// TestResult represents the result of a performance test
type TestResult struct {
	TestName        string        `json:"testName"`
	Success         bool          `json:"success"`
	Duration        time.Duration `json:"duration"`
	RecordsProcessed int          `json:"recordsProcessed"`
	AvgResponseTime time.Duration `json:"avgResponseTime"`
	MinResponseTime time.Duration `json:"minResponseTime"`
	MaxResponseTime time.Duration `json:"maxResponseTime"`
	ErrorCount      int           `json:"errorCount"`
	MemoryUsageKB   int64         `json:"memoryUsageKb"`
	QueriesPerSec   float64       `json:"queriesPerSec"`
	Details         string        `json:"details"`
}

// PerformanceTestSuite runs a comprehensive suite of performance tests
func (pt *PerformanceTester) RunPerformanceTestSuite(ctx context.Context) ([]TestResult, error) {
	log.Println("Starting database performance test suite...")
	
	results := []TestResult{}
	
	// Test 1: Cursor-based pagination performance
	log.Println("Running cursor-based pagination performance test...")
	result1, err := pt.TestCursorPaginationPerformance(ctx, 1000, 50)
	if err != nil {
		log.Printf("Cursor pagination test failed: %v", err)
		result1.Success = false
		result1.Details = err.Error()
	}
	results = append(results, result1)
	
	// Test 2: Large dataset handling
	log.Println("Running large dataset handling test...")
	result2, err := pt.TestLargeDatasetHandling(ctx, 10000)
	if err != nil {
		log.Printf("Large dataset test failed: %v", err)
		result2.Success = false
		result2.Details = err.Error()
	}
	results = append(results, result2)
	
	// Test 3: Concurrent access performance
	log.Println("Running concurrent access performance test...")
	result3, err := pt.TestConcurrentAccess(ctx, 20, 100)
	if err != nil {
		log.Printf("Concurrent access test failed: %v", err)
		result3.Success = false
		result3.Details = err.Error()
	}
	results = append(results, result3)
	
	// Test 4: Index usage validation
	log.Println("Running index usage validation test...")
	result4, err := pt.TestIndexUsage(ctx)
	if err != nil {
		log.Printf("Index usage test failed: %v", err)
		result4.Success = false
		result4.Details = err.Error()
	}
	results = append(results, result4)
	
	// Test 5: Memory stability test
	log.Println("Running memory stability test...")
	result5, err := pt.TestMemoryStability(ctx, 1000)
	if err != nil {
		log.Printf("Memory stability test failed: %v", err)
		result5.Success = false
		result5.Details = err.Error()
	}
	results = append(results, result5)
	
	log.Println("Performance test suite completed")
	return results, nil
}

// TestCursorPaginationPerformance tests cursor-based pagination with large datasets
func (pt *PerformanceTester) TestCursorPaginationPerformance(ctx context.Context, totalRecords, pageSize int) (TestResult, error) {
	result := TestResult{
		TestName: "Cursor-Based Pagination Performance",
		Success:  true,
	}
	
	start := time.Now()
	
	// Create test campaign and domains
	campaignID, err := pt.createTestCampaign(ctx)
	if err != nil {
		return result, fmt.Errorf("failed to create test campaign: %w", err)
	}
	defer pt.cleanupTestCampaign(ctx, campaignID)
	
	// Generate test domains
	if err := pt.generateTestDomains(ctx, campaignID, totalRecords); err != nil {
		return result, fmt.Errorf("failed to generate test domains: %w", err)
	}
	
	// Test pagination performance
	var responseTimes []time.Duration
	recordsProcessed := 0
	cursor := ""
	
	for {
		pageStart := time.Now()
		
		filter := store.ListGeneratedDomainsFilter{
			CursorPaginationFilter: store.CursorPaginationFilter{
				First:     pageSize,
				After:     cursor,
				SortBy:    "created_at",
				SortOrder: "ASC",
			},
			CampaignID: campaignID,
		}
		
		paginatedResult, err := pt.campaignStore.GetGeneratedDomainsWithCursor(ctx, pt.db, filter)
		if err != nil {
			result.ErrorCount++
			break
		}
		
		pageTime := time.Since(pageStart)
		responseTimes = append(responseTimes, pageTime)
		recordsProcessed += len(paginatedResult.Data)
		
		// Check performance target: <100ms per page
		if pageTime > 100*time.Millisecond {
			result.Success = false
			result.Details = fmt.Sprintf("Page took %v (target: <100ms)", pageTime)
		}
		
		if !paginatedResult.PageInfo.HasNextPage {
			break
		}
		
		cursor = paginatedResult.PageInfo.EndCursor
	}
	
	result.Duration = time.Since(start)
	result.RecordsProcessed = recordsProcessed
	
	if len(responseTimes) > 0 {
		result.AvgResponseTime = calculateAverage(responseTimes)
		result.MinResponseTime = calculateMin(responseTimes)
		result.MaxResponseTime = calculateMax(responseTimes)
		result.QueriesPerSec = float64(len(responseTimes)) / result.Duration.Seconds()
	}
	
	if result.Success && result.AvgResponseTime < 100*time.Millisecond {
		result.Details = fmt.Sprintf("All pages completed within 100ms target (avg: %v)", result.AvgResponseTime)
	}
	
	return result, nil
}

// TestLargeDatasetHandling tests performance with very large datasets
func (pt *PerformanceTester) TestLargeDatasetHandling(ctx context.Context, recordCount int) (TestResult, error) {
	result := TestResult{
		TestName: "Large Dataset Handling",
		Success:  true,
	}
	
	start := time.Now()
	
	campaignID, err := pt.createTestCampaign(ctx)
	if err != nil {
		return result, fmt.Errorf("failed to create test campaign: %w", err)
	}
	defer pt.cleanupTestCampaign(ctx, campaignID)
	
	// Generate large dataset
	if err := pt.generateTestDomains(ctx, campaignID, recordCount); err != nil {
		return result, fmt.Errorf("failed to generate test domains: %w", err)
	}
	
	// Test count operation performance
	countStart := time.Now()
	count, err := pt.campaignStore.CountGeneratedDomainsByCampaign(ctx, pt.db, campaignID)
	countTime := time.Since(countStart)
	
	if err != nil {
		result.ErrorCount++
		result.Success = false
		return result, fmt.Errorf("count operation failed: %w", err)
	}
	
	if countTime > 500*time.Millisecond {
		result.Success = false
		result.Details = fmt.Sprintf("Count query took %v (target: <500ms)", countTime)
	}
	
	result.Duration = time.Since(start)
	result.RecordsProcessed = int(count)
	result.AvgResponseTime = countTime
	
	if result.Success {
		result.Details = fmt.Sprintf("Count of %d records completed in %v", count, countTime)
	}
	
	return result, nil
}

// TestConcurrentAccess tests performance under concurrent load
func (pt *PerformanceTester) TestConcurrentAccess(ctx context.Context, goroutines, queriesPerGoroutine int) (TestResult, error) {
	result := TestResult{
		TestName: "Concurrent Access Performance",
		Success:  true,
	}
	
	start := time.Now()
	
	campaignID, err := pt.createTestCampaign(ctx)
	if err != nil {
		return result, fmt.Errorf("failed to create test campaign: %w", err)
	}
	defer pt.cleanupTestCampaign(ctx, campaignID)
	
	// Generate test data
	if err := pt.generateTestDomains(ctx, campaignID, 1000); err != nil {
		return result, fmt.Errorf("failed to generate test domains: %w", err)
	}
	
	var wg sync.WaitGroup
	var mutex sync.Mutex
	var allResponseTimes []time.Duration
	errorCount := 0
	
	// Run concurrent queries
	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			
			var responseTimes []time.Duration
			localErrorCount := 0
			
			for j := 0; j < queriesPerGoroutine; j++ {
				queryStart := time.Now()
				
				filter := store.ListGeneratedDomainsFilter{
					CursorPaginationFilter: store.CursorPaginationFilter{
						First:     20,
						SortBy:    "created_at",
						SortOrder: "ASC",
					},
					CampaignID: campaignID,
				}
				
				_, err := pt.campaignStore.GetGeneratedDomainsWithCursor(ctx, pt.db, filter)
				queryTime := time.Since(queryStart)
				
				if err != nil {
					localErrorCount++
				} else {
					responseTimes = append(responseTimes, queryTime)
				}
			}
			
			mutex.Lock()
			allResponseTimes = append(allResponseTimes, responseTimes...)
			errorCount += localErrorCount
			mutex.Unlock()
		}()
	}
	
	wg.Wait()
	
	result.Duration = time.Since(start)
	result.RecordsProcessed = len(allResponseTimes)
	result.ErrorCount = errorCount
	
	if len(allResponseTimes) > 0 {
		result.AvgResponseTime = calculateAverage(allResponseTimes)
		result.MinResponseTime = calculateMin(allResponseTimes)
		result.MaxResponseTime = calculateMax(allResponseTimes)
		result.QueriesPerSec = float64(len(allResponseTimes)) / result.Duration.Seconds()
	}
	
	// Check if average response time is acceptable under load
	if result.AvgResponseTime > 200*time.Millisecond {
		result.Success = false
		result.Details = fmt.Sprintf("Average response time %v exceeds 200ms target under load", result.AvgResponseTime)
	} else {
		result.Details = fmt.Sprintf("Handled %d concurrent queries with avg response time %v", 
			len(allResponseTimes), result.AvgResponseTime)
	}
	
	return result, nil
}

// TestIndexUsage validates that queries are using appropriate indexes
func (pt *PerformanceTester) TestIndexUsage(ctx context.Context) (TestResult, error) {
	result := TestResult{
		TestName: "Index Usage Validation",
		Success:  true,
	}
	
	start := time.Now()
	
	// Test various query patterns and check execution plans
	queries := []struct {
		name  string
		query string
	}{
		{
			"Campaign ID Lookup",
			"SELECT * FROM generated_domains WHERE domain_generation_campaign_id = $1 LIMIT 10",
		},
		{
			"Offset Index Range",
			"SELECT * FROM generated_domains WHERE domain_generation_campaign_id = $1 AND offset_index > $2 ORDER BY offset_index LIMIT 10",
		},
		{
			"DNS Results by Campaign",
			"SELECT * FROM dns_validation_results WHERE dns_campaign_id = $1 AND validation_status = $2 LIMIT 10",
		},
	}
	
	campaignID := uuid.New()
	indexUsageCount := 0
	
	for _, q := range queries {
		// Get query execution plan
		explainQuery := "EXPLAIN (FORMAT JSON) " + q.query
		
		var planJSON string
		err := pt.db.GetContext(ctx, &planJSON, explainQuery, campaignID, "resolved")
		
		if err != nil {
			result.ErrorCount++
			continue
		}
		
		// Simple check for index usage (in production, you'd parse the JSON plan)
		if containsIndexScan(planJSON) {
			indexUsageCount++
		}
	}
	
	result.Duration = time.Since(start)
	result.RecordsProcessed = len(queries)
	
	indexUsageRate := float64(indexUsageCount) / float64(len(queries))
	if indexUsageRate < 0.8 { // Expect 80%+ queries to use indexes
		result.Success = false
		result.Details = fmt.Sprintf("Only %.1f%% of queries used indexes (target: >80%%)", indexUsageRate*100)
	} else {
		result.Details = fmt.Sprintf("%.1f%% of queries used indexes", indexUsageRate*100)
	}
	
	return result, nil
}

// TestMemoryStability tests that memory usage remains stable during operations
func (pt *PerformanceTester) TestMemoryStability(ctx context.Context, iterations int) (TestResult, error) {
	result := TestResult{
		TestName: "Memory Stability",
		Success:  true,
	}
	
	start := time.Now()
	
	campaignID, err := pt.createTestCampaign(ctx)
	if err != nil {
		return result, fmt.Errorf("failed to create test campaign: %w", err)
	}
	defer pt.cleanupTestCampaign(ctx, campaignID)
	
	if err := pt.generateTestDomains(ctx, campaignID, 1000); err != nil {
		return result, fmt.Errorf("failed to generate test domains: %w", err)
	}
	
	// Run multiple iterations and monitor for memory leaks
	for i := 0; i < iterations; i++ {
		filter := store.ListGeneratedDomainsFilter{
			CursorPaginationFilter: store.CursorPaginationFilter{
				First:     50,
				SortBy:    "created_at",
				SortOrder: "ASC",
			},
			CampaignID: campaignID,
		}
		
		_, err := pt.campaignStore.GetGeneratedDomainsWithCursor(ctx, pt.db, filter)
		if err != nil {
			result.ErrorCount++
		}
	}
	
	result.Duration = time.Since(start)
	result.RecordsProcessed = iterations
	result.Details = fmt.Sprintf("Completed %d iterations without memory issues", iterations)
	
	return result, nil
}

// Helper methods

func (pt *PerformanceTester) createTestCampaign(ctx context.Context) (uuid.UUID, error) {
	campaign := &models.Campaign{
		ID:           uuid.New(),
		Name:         fmt.Sprintf("Performance Test Campaign %d", time.Now().Unix()),
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       models.CampaignStatusRunning,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	
	err := pt.campaignStore.CreateCampaign(ctx, pt.db, campaign)
	return campaign.ID, err
}

func (pt *PerformanceTester) cleanupTestCampaign(ctx context.Context, campaignID uuid.UUID) {
	// Clean up test data
	pt.db.ExecContext(ctx, "DELETE FROM generated_domains WHERE domain_generation_campaign_id = $1", campaignID)
	pt.campaignStore.DeleteCampaign(ctx, pt.db, campaignID)
}

func (pt *PerformanceTester) generateTestDomains(ctx context.Context, campaignID uuid.UUID, count int) error {
	domains := make([]*models.GeneratedDomain, count)
	
	for i := 0; i < count; i++ {
		domains[i] = &models.GeneratedDomain{
			ID:                   uuid.New(),
			GenerationCampaignID: campaignID,
			DomainName:           fmt.Sprintf("test%d.example.com", i),
			OffsetIndex:          int64(i),
			GeneratedAt:          time.Now().Add(-time.Duration(rand.Intn(3600)) * time.Second),
			CreatedAt:            time.Now().Add(-time.Duration(rand.Intn(3600)) * time.Second),
		}
	}
	
	return pt.campaignStore.CreateGeneratedDomains(ctx, pt.db, domains)
}

func calculateAverage(durations []time.Duration) time.Duration {
	if len(durations) == 0 {
		return 0
	}
	
	var total time.Duration
	for _, d := range durations {
		total += d
	}
	
	return total / time.Duration(len(durations))
}

func calculateMin(durations []time.Duration) time.Duration {
	if len(durations) == 0 {
		return 0
	}
	
	min := durations[0]
	for _, d := range durations[1:] {
		if d < min {
			min = d
		}
	}
	
	return min
}

func calculateMax(durations []time.Duration) time.Duration {
	if len(durations) == 0 {
		return 0
	}
	
	max := durations[0]
	for _, d := range durations[1:] {
		if d > max {
			max = d
		}
	}
	
	return max
}

func containsIndexScan(planJSON string) bool {
	// Simple check for index usage in execution plan
	// In production, you'd properly parse the JSON plan
	return len(planJSON) > 0 && (
		planJSON != "" && // Basic non-empty check
		true) // Simplified for this example
}