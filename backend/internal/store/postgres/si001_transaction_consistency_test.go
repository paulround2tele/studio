//go:build integration

package postgres

import (
	"context"
	"database/sql"
	"sync"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
)

// SI001TransactionConsistencyTestSuite validates the Enhanced Transaction Management Anti-patterns
type SI001TransactionConsistencyTestSuite struct {
	suite.Suite
	db               *sqlx.DB
	txManager        *TransactionManager
	metricsCollector *PostgreSQLMetricsCollector
}

func (suite *SI001TransactionConsistencyTestSuite) SetupSuite() {
	// Connect to test database
	db, err := sqlx.Connect("postgres", "postgres://user:password@localhost/domainflow_production?sslmode=disable")
	require.NoError(suite.T(), err)

	suite.db = db
	campaignID := uuid.New()
	suite.metricsCollector = NewPostgreSQLMetricsCollector(db, &campaignID)
	suite.txManager = NewTransactionManager(db)
}

func (suite *SI001TransactionConsistencyTestSuite) TearDownSuite() {
	if suite.db != nil {
		suite.db.Close()
	}
}

func (suite *SI001TransactionConsistencyTestSuite) SetupTest() {
	// Clear transaction metrics before each test
	_, err := suite.db.Exec("DELETE FROM transaction_metrics WHERE operation_type LIKE 'test_%'")
	require.NoError(suite.T(), err)
}

// TestConcurrentCampaignCreation validates transaction consistency under concurrent load
func (suite *SI001TransactionConsistencyTestSuite) TestConcurrentCampaignCreation() {
	const numGoroutines = 10
	const campaignsPerGoroutine = 5

	ctx := context.Background()
	var wg sync.WaitGroup
	var mu sync.Mutex
	createdCampaigns := make([]string, 0, numGoroutines*campaignsPerGoroutine)
	errors := make([]error, 0)

	// Create campaigns concurrently
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			for j := 0; j < campaignsPerGoroutine; j++ {
				campaignID := uuid.New().String()
				campaignUUID := uuid.MustParse(campaignID)

				txOptions := &CampaignTransactionOptions{
					Operation:      "test_campaign_creation",
					CampaignID:     campaignID,
					MaxRetries:     3,
					RetryDelay:     100 * time.Millisecond,
					Timeout:        5 * time.Second,
					IsolationLevel: func() *sql.IsolationLevel { level := sql.LevelReadCommitted; return &level }(),
				}

				err := suite.txManager.SafeCampaignTransaction(ctx, txOptions, func(tx *sqlx.Tx) error {
					campaign := &models.Campaign{
						ID:        campaignUUID,
						Name:      "Test Campaign " + campaignID[:8],
						Status:    "active",
						CreatedAt: time.Now(),
						UpdatedAt: time.Now(),
					}

					query := `
						INSERT INTO campaigns (id, name, status, created_at, updated_at)
						VALUES ($1, $2, $3, $4, $5)`

					_, err := tx.Exec(query, campaign.ID, campaign.Name, campaign.Status,
						campaign.CreatedAt, campaign.UpdatedAt)
					if err != nil {
						return err
					}

					// Record metric
					_, err = tx.Exec(`
						SELECT record_transaction_metric(
							$1, $2, $3, $4, $5, $6, $7
						)`,
						"test_campaign_creation",
						campaignID,
						"completed",
						0,
						1,
						"{}",
						time.Now(),
					)
					return err
				})

				mu.Lock()
				if err != nil {
					errors = append(errors, err)
				} else {
					createdCampaigns = append(createdCampaigns, campaignID)
				}
				mu.Unlock()
			}
		}(i)
	}

	wg.Wait()

	// Validate results
	suite.Len(errors, 0, "No errors should occur during concurrent campaign creation")
	suite.Len(createdCampaigns, numGoroutines*campaignsPerGoroutine, "All campaigns should be created")

	// Verify database consistency
	var count int
	err := suite.db.Get(&count, "SELECT COUNT(*) FROM campaigns WHERE name LIKE 'Test Campaign %'")
	require.NoError(suite.T(), err)
	suite.Equal(numGoroutines*campaignsPerGoroutine, count, "Database should contain all created campaigns")

	// Verify transaction metrics
	var metricCount int
	err = suite.db.Get(&metricCount, "SELECT COUNT(*) FROM transaction_metrics WHERE operation_type = 'test_campaign_creation'")
	require.NoError(suite.T(), err)
	suite.Equal(numGoroutines*campaignsPerGoroutine, metricCount, "All transactions should be recorded in metrics")
}

// TestTransactionRollbackConsistency validates rollback behavior
func (suite *SI001TransactionConsistencyTestSuite) TestTransactionRollbackConsistency() {
	ctx := context.Background()
	campaignID := uuid.New().String()
	campaignUUID := uuid.MustParse(campaignID)

	txOptions := &CampaignTransactionOptions{
		Operation:      "test_rollback",
		CampaignID:     campaignID,
		MaxRetries:     1,
		RetryDelay:     100 * time.Millisecond,
		Timeout:        5 * time.Second,
		IsolationLevel: func() *sql.IsolationLevel { level := sql.LevelReadCommitted; return &level }(),
	}

	err := suite.txManager.SafeCampaignTransaction(ctx, txOptions, func(tx *sqlx.Tx) error {
		campaign := &models.Campaign{
			ID:        campaignUUID,
			Name:      "Rollback Test Campaign",
			Status:    "active",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		query := `
			INSERT INTO campaigns (id, name, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5)`

		_, err := tx.Exec(query, campaign.ID, campaign.Name, campaign.Status,
			campaign.CreatedAt, campaign.UpdatedAt)
		if err != nil {
			return err
		}

		// Force an error to trigger rollback
		return assert.AnError
	})

	suite.Error(err, "Transaction should fail and rollback")

	// Verify rollback - campaign should not exist
	var count int
	err = suite.db.Get(&count, "SELECT COUNT(*) FROM campaigns WHERE id = $1", campaignUUID)
	require.NoError(suite.T(), err)
	suite.Equal(0, count, "Campaign should not exist after rollback")
}

// TestBatchTransactionOperations validates batch processing
func (suite *SI001TransactionConsistencyTestSuite) TestBatchTransactionOperations() {
	ctx := context.Background()

	operations := make([]TransactionOperation, 5)
	campaignIDs := make([]uuid.UUID, 5)

	for i := 0; i < 5; i++ {
		campaignUUID := uuid.New()
		campaignIDs[i] = campaignUUID
		campaignID := campaignUUID.String()

		operations[i] = TransactionOperation{
			Name:        "batch_campaign_" + campaignID[:8],
			Description: "Create batch campaign",
			Required:    true,
			Execute: func(ctx context.Context, tx *sqlx.Tx) error {
				campaign := &models.Campaign{
					ID:        campaignUUID,
					Name:      "Batch Campaign " + campaignID[:8],
					Status:    "active",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}

				query := `
					INSERT INTO campaigns (id, name, status, created_at, updated_at)
					VALUES ($1, $2, $3, $4, $5)`

				_, err := tx.Exec(query, campaign.ID, campaign.Name, campaign.Status,
					campaign.CreatedAt, campaign.UpdatedAt)
				return err
			},
		}
	}

	batchCampaignID := uuid.New()
	err := suite.txManager.SafeTransactionBatch(ctx, operations, &batchCampaignID)
	require.NoError(suite.T(), err)

	// Verify all campaigns were created
	for _, campaignUUID := range campaignIDs {
		var exists bool
		err := suite.db.Get(&exists, "SELECT EXISTS(SELECT 1 FROM campaigns WHERE id = $1)", campaignUUID)
		require.NoError(suite.T(), err)
		suite.True(exists, "Campaign %s should exist", campaignUUID)
	}
}

// BenchmarkConcurrentTransactions measures performance under load
func (suite *SI001TransactionConsistencyTestSuite) BenchmarkConcurrentTransactions() {
	ctx := context.Background()

	suite.T().Run("Benchmark", func(t *testing.T) {
		for i := 0; i < 100; i++ {
			campaignUUID := uuid.New()
			campaignID := campaignUUID.String()

			txOptions := &CampaignTransactionOptions{
				Operation:      "benchmark_campaign",
				CampaignID:     campaignID,
				MaxRetries:     3,
				RetryDelay:     50 * time.Millisecond,
				Timeout:        2 * time.Second,
				IsolationLevel: func() *sql.IsolationLevel { level := sql.LevelReadCommitted; return &level }(),
			}

			err := suite.txManager.SafeCampaignTransaction(ctx, txOptions, func(tx *sqlx.Tx) error {
				campaign := &models.Campaign{
					ID:        campaignUUID,
					Name:      "Benchmark Campaign " + campaignID[:8],
					Status:    "active",
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}

				query := `
					INSERT INTO campaigns (id, name, status, created_at, updated_at)
					VALUES ($1, $2, $3, $4, $5)`

				_, err := tx.Exec(query, campaign.ID, campaign.Name, campaign.Status,
					campaign.CreatedAt, campaign.UpdatedAt)
				return err
			})

			require.NoError(t, err)
		}
	})
}

// TestTransactionMetricsCollection validates metrics collection accuracy
func (suite *SI001TransactionConsistencyTestSuite) TestTransactionMetricsCollection() {
	ctx := context.Background()
	campaignUUID := uuid.New()
	campaignID := campaignUUID.String()

	startTime := time.Now()

	err := suite.txManager.SafeTransactionWithMetrics(ctx, nil, "metrics_test_campaign", &campaignUUID,
		func(tx *sqlx.Tx) error {
			campaign := &models.Campaign{
				ID:        campaignUUID,
				Name:      "Metrics Test Campaign",
				Status:    "active",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			query := `
				INSERT INTO campaigns (id, name, status, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5)`

			_, err := tx.Exec(query, campaign.ID, campaign.Name, campaign.Status,
				campaign.CreatedAt, campaign.UpdatedAt)
			return err
		})

	require.NoError(suite.T(), err)

	// Verify metrics were recorded
	var metric struct {
		OperationType   string    `db:"operation_type"`
		TransactionID   string    `db:"transaction_id"`
		Status          string    `db:"status"`
		DurationMs      int64     `db:"duration_ms"`
		RecordsAffected int       `db:"records_affected"`
		RecordedAt      time.Time `db:"recorded_at"`
	}

	err = suite.db.Get(&metric, `
		SELECT operation_type, transaction_id, status, duration_ms, records_affected, recorded_at
		FROM transaction_metrics
		WHERE transaction_id = $1
		ORDER BY recorded_at DESC
		LIMIT 1`, campaignID)

	require.NoError(suite.T(), err)
	suite.Equal("metrics_test_campaign", metric.OperationType)
	suite.Equal(campaignID, metric.TransactionID)
	suite.Equal("completed", metric.Status)
	suite.Greater(metric.DurationMs, int64(0), "Duration should be positive")
	suite.Equal(1, metric.RecordsAffected, "Should affect one record")
	suite.True(metric.RecordedAt.After(startTime), "Recorded time should be after start time")
}

func TestSI001TransactionConsistency(t *testing.T) {
	suite.Run(t, new(SI001TransactionConsistencyTestSuite))
}
