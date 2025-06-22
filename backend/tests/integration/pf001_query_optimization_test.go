package services_test

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/suite"
)

// PF001IntegrationTestSuite tests the PF-001 Query Optimization implementation
type PF001IntegrationTestSuite struct {
	suite.Suite
	db                      *sqlx.DB
	queryPerformanceMonitor *services.QueryPerformanceMonitor
	queryOptimizer          *services.QueryOptimizer
	ctx                     context.Context
	cancel                  context.CancelFunc
}

func TestPF001Integration(t *testing.T) {
	suite.Run(t, new(PF001IntegrationTestSuite))
}

func (suite *PF001IntegrationTestSuite) SetupSuite() {
	// Connect to test database (domainflow_production for real testing)
	var err error
	suite.db, err = sqlx.Connect("postgres", "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable")
	suite.Require().NoError(err)

	suite.ctx, suite.cancel = context.WithCancel(context.Background())

	// Initialize query performance monitoring and optimization services
	config := services.DefaultQueryPerformanceConfig()
	config.BufferSize = 10 // Smaller buffer for testing
	config.FlushInterval = 1 * time.Second

	suite.queryPerformanceMonitor = services.NewQueryPerformanceMonitor(suite.db, config)
	suite.queryOptimizer = services.NewQueryOptimizer(suite.db, suite.queryPerformanceMonitor)

	// Start the monitor for testing
	err = suite.queryPerformanceMonitor.Start()
	suite.Require().NoError(err)
}

func (suite *PF001IntegrationTestSuite) TearDownSuite() {
	if suite.queryPerformanceMonitor != nil {
		suite.queryPerformanceMonitor.Stop()
	}
	if suite.cancel != nil {
		suite.cancel()
	}
	if suite.db != nil {
		suite.db.Close()
	}
}

func (suite *PF001IntegrationTestSuite) TearDownTest() {
	// Clean up test data after each test
	suite.db.Exec("DELETE FROM query_performance_metrics WHERE query_sql LIKE '%TEST_%'")
	suite.db.Exec("DELETE FROM query_optimization_recommendations WHERE query_hash IN (SELECT query_hash FROM query_performance_metrics WHERE query_sql LIKE '%TEST_%')")
	suite.db.Exec("DELETE FROM slow_query_log WHERE query_sql LIKE '%TEST_%'")
}

// TestPF001_DatabaseIntegration tests that all PF-001 tables exist and functions work
func (suite *PF001IntegrationTestSuite) TestPF001_DatabaseIntegration() {
	// Verify all tables exist with correct structure
	tables := []string{
		"query_performance_metrics",
		"query_optimization_recommendations",
		"index_usage_analytics",
		"slow_query_log",
	}

	for _, table := range tables {
		var exists bool
		err := suite.db.QueryRow(`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' AND table_name = $1
			)`, table).Scan(&exists)
		suite.Require().NoError(err)
		suite.Assert().True(exists, "Table %s should exist", table)
	}

	// Test record_query_performance function
	var metricID uuid.UUID
	err := suite.db.QueryRow(`
		SELECT record_query_performance($1, $2, $3, $4, $5, $6)`,
		"SELECT * FROM TEST_TABLE WHERE id = 1",
		"select",
		150.5,
		int64(1000),
		int64(1),
		json.RawMessage(`{"tables": ["TEST_TABLE"]}`),
	).Scan(&metricID)
	suite.Require().NoError(err)
	suite.Assert().NotEqual(uuid.Nil, metricID)

	// Verify the metric was recorded with correct schema
	var metric models.QueryPerformanceMetric
	err = suite.db.Get(&metric, `
		SELECT id, query_hash, query_sql, query_type, execution_time_ms, 
		       rows_examined, rows_returned, optimization_score
		FROM query_performance_metrics 
		WHERE id = $1`, metricID)
	suite.Require().NoError(err)
	suite.Assert().Equal("SELECT * FROM TEST_TABLE WHERE id = 1", metric.QuerySQL)
	suite.Assert().Equal("select", metric.QueryType)
	suite.Assert().Equal(150.5, metric.ExecutionTimeMs)
	suite.Assert().Equal(int64(1000), metric.RowsExamined)
	suite.Assert().Equal(int64(1), metric.RowsReturned)
	suite.Assert().Greater(metric.OptimizationScore, 0.0)
}

// TestPF001_QueryPerformanceMonitoring tests real-time query performance monitoring
func (suite *PF001IntegrationTestSuite) TestPF001_QueryPerformanceMonitoring() {
	// Test recording query performance via the service
	testQuery := "SELECT COUNT(*) FROM TEST_CAMPAIGNS WHERE status = 'running'"
	queryPlan := json.RawMessage(`{"tables": ["TEST_CAMPAIGNS"], "type": "count"}`)

	metricID, err := suite.queryPerformanceMonitor.RecordQueryPerformanceDB(
		testQuery,
		"aggregate",
		250.0,
		500,
		1,
		queryPlan,
	)
	suite.Require().NoError(err)
	suite.Assert().NotEqual(uuid.Nil, metricID)

	// Test buffered recording
	err = suite.queryPerformanceMonitor.RecordQueryPerformance(
		"SELECT id FROM TEST_DOMAINS LIMIT 10",
		"select",
		75.0,
		10,
		10,
		json.RawMessage(`{"tables": ["TEST_DOMAINS"]}`),
	)
	suite.Require().NoError(err)

	// Wait for buffer flush
	time.Sleep(2 * time.Second)

	// Verify metrics were recorded
	var count int
	err = suite.db.Get(&count, `
		SELECT COUNT(*) FROM query_performance_metrics 
		WHERE query_sql LIKE '%TEST_%'`)
	suite.Require().NoError(err)
	suite.Assert().GreaterOrEqual(count, 2)
}

// TestPF001_QueryAnalysis tests query performance analysis
func (suite *PF001IntegrationTestSuite) TestPF001_QueryAnalysis() {
	// Insert test performance data
	testQuerySQL := "SELECT * FROM TEST_TABLE WHERE created_at > NOW() - INTERVAL '1 hour'"

	// Record multiple executions to build analysis data
	for i := 0; i < 5; i++ {
		_, err := suite.queryPerformanceMonitor.RecordQueryPerformanceDB(
			testQuerySQL,
			"select",
			float64(200+i*50), // Increasing execution time
			int64(100+i*10),
			int64(10),
			json.RawMessage(`{"tables": ["TEST_TABLE"]}`),
		)
		suite.Require().NoError(err)
	}

	// Generate query hash for analysis
	queryHash := suite.queryPerformanceMonitor.GenerateQueryHash(testQuerySQL)

	// Test query analysis
	analysis, err := suite.queryPerformanceMonitor.GetQueryAnalysis(queryHash)
	suite.Require().NoError(err)
	suite.Assert().NotNil(analysis)
	suite.Assert().Equal(queryHash, analysis.QueryHash)
	suite.Assert().Greater(analysis.AverageExecutionTimeMs, 0.0)
	suite.Assert().Equal(int64(5), analysis.ExecutionCount)
	suite.Assert().Contains([]string{"stable", "degrading", "improving", "insufficient_data"}, analysis.RecentPerformanceTrend)
}

// TestPF001_SlowQueryDetection tests slow query detection and logging
func (suite *PF001IntegrationTestSuite) TestPF001_SlowQueryDetection() {
	// Record a slow query (> 1000ms threshold)
	slowQuery := "SELECT COUNT(*) FROM TEST_BIG_TABLE WHERE complex_calculation = true"

	metricID, err := suite.queryPerformanceMonitor.RecordQueryPerformanceDB(
		slowQuery,
		"aggregate",
		2500.0, // 2.5 seconds - should trigger slow query log
		10000,
		1,
		json.RawMessage(`{"tables": ["TEST_BIG_TABLE"]}`),
	)
	suite.Require().NoError(err)
	suite.Assert().NotEqual(uuid.Nil, metricID)

	// Check that slow query was logged
	var slowQueryEntry models.SlowQueryLog
	err = suite.db.Get(&slowQueryEntry, `
		SELECT id, query_sql, execution_time_ms, severity
		FROM slow_query_log 
		WHERE query_sql = $1`, slowQuery)
	suite.Require().NoError(err)
	suite.Assert().Equal(slowQuery, slowQueryEntry.QuerySQL)
	suite.Assert().Equal(2500.0, slowQueryEntry.ExecutionTimeMs)
	suite.Assert().Equal("high", slowQueryEntry.Severity) // 2500ms should be "high"

	// Test getting slow queries
	slowQueries, err := suite.queryPerformanceMonitor.GetSlowQueries(10)
	suite.Require().NoError(err)
	suite.Assert().GreaterOrEqual(len(slowQueries), 1)
}

// TestPF001_QueryOptimization tests query optimization recommendations
func (suite *PF001IntegrationTestSuite) TestPF001_QueryOptimization() {
	// Test query with obvious optimization issues
	problematicQuery := "SELECT * FROM TEST_CAMPAIGNS WHERE user_id = 123"

	// Analyze the query
	result, err := suite.queryOptimizer.AnalyzeQuery(problematicQuery)
	suite.Require().NoError(err)
	suite.Assert().NotNil(result)
	suite.Assert().Equal(problematicQuery, result.OriginalQuery)
	suite.Assert().NotEmpty(result.QueryHash)

	// Should detect SELECT * issue
	hasSelectStarIssue := false
	for _, issue := range result.Issues {
		if issue.Type == "select_star" {
			hasSelectStarIssue = true
			break
		}
	}
	suite.Assert().True(hasSelectStarIssue, "Should detect SELECT * issue")

	// Should suggest indexes
	suite.Assert().NotEmpty(result.SuggestedIndexes)

	// Test creating optimization recommendation
	strategy := json.RawMessage(`{"type": "index_optimization", "reason": "missing_index_on_user_id"}`)
	suggestionID, err := suite.queryOptimizer.CreateOptimizationRecommendation(
		result.QueryHash,
		"index_optimization",
		300.0,
		strategy,
		[]string{"CREATE INDEX idx_test_campaigns_user_id ON test_campaigns (user_id)"},
		"medium",
	)
	suite.Require().NoError(err)
	suite.Assert().NotEqual(uuid.Nil, suggestionID)

	// Verify recommendation was created with correct schema
	var recommendation models.QueryOptimizationRecommendation
	err = suite.db.Get(&recommendation, `
		SELECT id, query_hash, recommendation_type, current_performance_ms,
		       estimated_improvement_pct, implementation_priority, implemented
		FROM query_optimization_recommendations 
		WHERE id = $1`, suggestionID)
	suite.Require().NoError(err)
	suite.Assert().Equal(result.QueryHash, recommendation.QueryHash)
	suite.Assert().Equal("index_optimization", recommendation.RecommendationType)
	suite.Assert().Equal(300.0, recommendation.CurrentPerformanceMs)
	suite.Assert().Equal("medium", recommendation.ImplementationPriority)
	suite.Assert().False(recommendation.Implemented)
}

// TestPF001_IndexUsageAnalytics tests index usage analysis
func (suite *PF001IntegrationTestSuite) TestPF001_IndexUsageAnalytics() {
	// Test the analyze_index_usage function
	err := suite.queryOptimizer.AnalyzeIndexUsage()
	suite.Require().NoError(err)

	// Get index analytics
	analytics, err := suite.queryOptimizer.GetIndexAnalytics()
	suite.Require().NoError(err)
	suite.Assert().NotEmpty(analytics, "Should have index analytics data")

	// Verify analytics structure
	for _, analytic := range analytics {
		suite.Assert().NotEmpty(analytic.SchemaName)
		suite.Assert().NotEmpty(analytic.TableName)
		suite.Assert().NotEmpty(analytic.IndexName)
		suite.Assert().Contains([]string{"unused", "low", "medium", "high", "unknown"}, analytic.UsageFrequency)
	}
}

// TestPF001_OptimizationWorkflow tests the complete optimization workflow
func (suite *PF001IntegrationTestSuite) TestPF001_OptimizationWorkflow() {
	// Step 1: Record slow performance for a query
	testQuery := "SELECT g.domain_name, c.name FROM TEST_GENERATED_DOMAINS g JOIN TEST_CAMPAIGNS c ON g.domain_generation_campaign_id = c.id WHERE c.status = 'running'"

	for i := 0; i < 3; i++ {
		_, err := suite.queryPerformanceMonitor.RecordQueryPerformanceDB(
			testQuery,
			"join",
			float64(1500+i*200), // Slow query times
			5000,
			100,
			json.RawMessage(`{"tables": ["TEST_GENERATED_DOMAINS", "TEST_CAMPAIGNS"]}`),
		)
		suite.Require().NoError(err)
	}

	// Step 2: Analyze the query for optimization opportunities
	result, err := suite.queryOptimizer.AnalyzeQuery(testQuery)
	suite.Require().NoError(err)

	// Step 3: Should identify issues and suggest optimizations
	suite.Assert().NotEmpty(result.Issues)
	suite.Assert().NotEmpty(result.SuggestedIndexes)
	suite.Assert().Greater(result.EstimatedImprovement, 0.0)

	// Step 4: Optimize slow queries
	slowOptimizations, err := suite.queryOptimizer.OptimizeSlowQueries(5)
	suite.Require().NoError(err)
	suite.Assert().NotEmpty(slowOptimizations)

	// Step 5: Implement a recommendation
	if len(result.Recommendations) > 0 {
		recommendation := result.Recommendations[0]
		validationResults := json.RawMessage(`{"status": "implemented", "performance_improvement": "25%"}`)

		err = suite.queryOptimizer.ImplementRecommendation(recommendation.ID, validationResults)
		suite.Require().NoError(err)

		// Verify implementation was recorded
		var implemented bool
		err = suite.db.QueryRow(`
			SELECT implemented FROM query_optimization_recommendations 
			WHERE id = $1`, recommendation.ID).Scan(&implemented)
		suite.Require().NoError(err)
		suite.Assert().True(implemented)
	}
}

// TestPF001_PerformanceUnderLoad tests performance monitoring under concurrent load
func (suite *PF001IntegrationTestSuite) TestPF001_PerformanceUnderLoad() {
	const numGoroutines = 10
	const queriesPerGoroutine = 20

	doneCh := make(chan bool, numGoroutines)

	// Simulate concurrent query monitoring
	for i := 0; i < numGoroutines; i++ {
		go func(workerID int) {
			defer func() { doneCh <- true }()

			for j := 0; j < queriesPerGoroutine; j++ {
				testQuery := fmt.Sprintf("SELECT id FROM TEST_WORKER_%d WHERE batch_id = %d", workerID, j)

				err := suite.queryPerformanceMonitor.RecordQueryPerformance(
					testQuery,
					"select",
					float64(50+j*5),
					int64(10+j),
					int64(1),
					json.RawMessage(`{"worker_id": `+fmt.Sprintf("%d", workerID)+`}`),
				)
				suite.Assert().NoError(err)
			}
		}(i)
	}

	// Wait for all goroutines to complete
	for i := 0; i < numGoroutines; i++ {
		<-doneCh
	}

	// Allow time for buffer flush
	time.Sleep(3 * time.Second)

	// Verify metrics were recorded
	var count int
	err := suite.db.Get(&count, `
		SELECT COUNT(*) FROM query_performance_metrics 
		WHERE query_sql LIKE '%TEST_WORKER_%'`)
	suite.Require().NoError(err)
	suite.Assert().GreaterOrEqual(count, numGoroutines*queriesPerGoroutine)
}

// TestPF001_MetricsRetention tests metrics cleanup and retention
func (suite *PF001IntegrationTestSuite) TestPF001_MetricsRetention() {
	// Insert old test metrics by manually updating timestamps
	oldQuery := "SELECT * FROM TEST_OLD_TABLE"
	metricID, err := suite.queryPerformanceMonitor.RecordQueryPerformanceDB(
		oldQuery,
		"select",
		100.0,
		10,
		5,
		json.RawMessage(`{"test": "old_data"}`),
	)
	suite.Require().NoError(err)

	// Manually update the timestamp to be old
	oldTime := time.Now().AddDate(0, 0, -35) // 35 days ago
	_, err = suite.db.Exec(`
		UPDATE query_performance_metrics 
		SET executed_at = $1 
		WHERE id = $2`, oldTime, metricID)
	suite.Require().NoError(err)

	// Insert recent metrics
	recentQuery := "SELECT * FROM TEST_RECENT_TABLE"
	recentMetricID, err := suite.queryPerformanceMonitor.RecordQueryPerformanceDB(
		recentQuery,
		"select",
		100.0,
		10,
		5,
		json.RawMessage(`{"test": "recent_data"}`),
	)
	suite.Require().NoError(err)

	// Test cleanup (simulate retention policy)
	cutoffDate := time.Now().AddDate(0, 0, -30) // 30 days retention
	_, err = suite.db.Exec(`
		DELETE FROM query_performance_metrics 
		WHERE executed_at < $1 AND query_sql LIKE '%TEST_%'`, cutoffDate)
	suite.Require().NoError(err)

	// Verify old metrics were cleaned up
	var oldExists bool
	err = suite.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM query_performance_metrics WHERE id = $1)`,
		metricID).Scan(&oldExists)
	suite.Require().NoError(err)
	suite.Assert().False(oldExists)

	// Verify recent metrics remain
	var recentExists bool
	err = suite.db.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM query_performance_metrics WHERE id = $1)`,
		recentMetricID).Scan(&recentExists)
	suite.Require().NoError(err)
	suite.Assert().True(recentExists)
}

// TestPF001_ErrorHandling tests error handling scenarios
func (suite *PF001IntegrationTestSuite) TestPF001_ErrorHandling() {
	// Test invalid query analysis
	result, err := suite.queryOptimizer.AnalyzeQuery("")
	suite.Assert().Error(err)
	suite.Assert().Nil(result)

	// Test invalid recommendation creation
	invalidID, err := suite.queryOptimizer.CreateOptimizationRecommendation(
		"", // empty query hash
		"invalid_type",
		-1.0, // negative performance
		json.RawMessage(`{}`),
		[]string{},
		"invalid_priority",
	)
	suite.Assert().Error(err)
	suite.Assert().Equal(uuid.Nil, invalidID)

	// Test implementing non-existent recommendation
	err = suite.queryOptimizer.ImplementRecommendation(
		uuid.New(), // random ID that doesn't exist
		json.RawMessage(`{}`),
	)
	suite.Assert().NoError(err) // UPDATE with no matches doesn't error in PostgreSQL
}

// Helper function to generate query hash
func generateQueryHash(querySQL string) string {
	hash := sha256.Sum256([]byte(querySQL))
	return hex.EncodeToString(hash[:])
}
