//go:build cgo
// +build cgo

package services

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/infra/config"
	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

func TestStaleScoreDetector_DetectStaleScores(t *testing.T) {
	// Create in-memory SQLite database for testing
	db, err := sqlx.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	defer db.Close()

	// Create test table schema
	_, err = db.Exec(`
		CREATE TABLE analysis_scores (
			id INTEGER PRIMARY KEY,
			campaign_id TEXT NOT NULL,
			domain_name TEXT NOT NULL,
			relevance_score REAL,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		t.Fatalf("Failed to create analysis_scores table: %v", err)
	}

	_, err = db.Exec(`
		CREATE TABLE domain_extraction_features (
			id INTEGER PRIMARY KEY,
			campaign_id TEXT NOT NULL,
			domain_name TEXT NOT NULL,
			processing_state TEXT NOT NULL,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		t.Fatalf("Failed to create domain_extraction_features table: %v", err)
	}

	tests := []struct {
		name          string
		setupData     func(*sqlx.DB, time.Time)
		expectedStale int
		description   string
	}{
		{
			name: "stale_score_detected",
			setupData: func(db *sqlx.DB, now time.Time) {
				oldScoreTime := now.Add(-2 * time.Hour)      // Score is 2 hours old
				newFeatureTime := now.Add(-30 * time.Minute) // Feature updated 30 min ago

				// Insert old score
				db.Exec(`INSERT INTO analysis_scores (campaign_id, domain_name, relevance_score, updated_at) 
					VALUES ('camp1', 'stale.com', 0.8, ?)`, oldScoreTime)

				// Insert newer feature
				db.Exec(`INSERT INTO domain_extraction_features (campaign_id, domain_name, processing_state, updated_at) 
					VALUES ('camp1', 'stale.com', 'ready', ?)`, newFeatureTime)
			},
			expectedStale: 1,
			description:   "should detect stale score when feature is newer",
		},
		{
			name: "up_to_date_score",
			setupData: func(db *sqlx.DB, now time.Time) {
				recentTime := now.Add(-30 * time.Minute) // Both updated recently

				// Insert recent score
				db.Exec(`INSERT INTO analysis_scores (campaign_id, domain_name, relevance_score, updated_at) 
					VALUES ('camp2', 'recent.com', 0.9, ?)`, recentTime)

				// Insert feature at same time
				db.Exec(`INSERT INTO domain_extraction_features (campaign_id, domain_name, processing_state, updated_at) 
					VALUES ('camp2', 'recent.com', 'ready', ?)`, recentTime)
			},
			expectedStale: 0,
			description:   "should not detect stale score when both are recent",
		},
		{
			name: "score_newer_than_feature",
			setupData: func(db *sqlx.DB, now time.Time) {
				oldFeatureTime := now.Add(-2 * time.Hour)  // Feature is old
				newScoreTime := now.Add(-30 * time.Minute) // Score is newer

				// Insert newer score
				db.Exec(`INSERT INTO analysis_scores (campaign_id, domain_name, relevance_score, updated_at) 
					VALUES ('camp3', 'newer.com', 0.7, ?)`, newScoreTime)

				// Insert older feature
				db.Exec(`INSERT INTO domain_extraction_features (campaign_id, domain_name, processing_state, updated_at) 
					VALUES ('camp3', 'newer.com', 'ready', ?)`, oldFeatureTime)
			},
			expectedStale: 0,
			description:   "should not detect stale score when score is newer than feature",
		},
		{
			name: "boundary_condition_exact_threshold",
			setupData: func(db *sqlx.DB, now time.Time) {
				thresholdTime := now.Add(-1*time.Hour - 1*time.Minute) // Slightly older than threshold
				featureTime := now.Add(-30 * time.Minute)              // Feature updated after

				// Insert score just past threshold
				db.Exec(`INSERT INTO analysis_scores (campaign_id, domain_name, relevance_score, updated_at) 
					VALUES ('camp4', 'boundary.com', 0.5, ?)`, thresholdTime)

				// Insert newer feature
				db.Exec(`INSERT INTO domain_extraction_features (campaign_id, domain_name, processing_state, updated_at) 
					VALUES ('camp4', 'boundary.com', 'ready', ?)`, featureTime)
			},
			expectedStale: 1,
			description:   "should detect stale score just past threshold boundary",
		},
		{
			name: "feature_not_ready",
			setupData: func(db *sqlx.DB, now time.Time) {
				oldScoreTime := now.Add(-2 * time.Hour)
				newFeatureTime := now.Add(-30 * time.Minute)

				// Insert old score
				db.Exec(`INSERT INTO analysis_scores (campaign_id, domain_name, relevance_score, updated_at) 
					VALUES ('camp5', 'notready.com', 0.6, ?)`, oldScoreTime)

				// Insert newer feature but not ready
				db.Exec(`INSERT INTO domain_extraction_features (campaign_id, domain_name, processing_state, updated_at) 
					VALUES ('camp5', 'notready.com', 'processing', ?)`, newFeatureTime)
			},
			expectedStale: 0,
			description:   "should not detect stale score when feature is not ready",
		},
		{
			name: "multiple_stale_scores",
			setupData: func(db *sqlx.DB, now time.Time) {
				oldScoreTime := now.Add(-2 * time.Hour)
				newFeatureTime := now.Add(-30 * time.Minute)

				// Insert multiple stale scores
				for i := 0; i < 5; i++ {
					domain := fmt.Sprintf("stale%d.com", i)
					db.Exec(`INSERT INTO analysis_scores (campaign_id, domain_name, relevance_score, updated_at) 
						VALUES ('camp6', ?, 0.8, ?)`, domain, oldScoreTime)
					db.Exec(`INSERT INTO domain_extraction_features (campaign_id, domain_name, processing_state, updated_at) 
						VALUES ('camp6', ?, 'ready', ?)`, domain, newFeatureTime)
				}
			},
			expectedStale: 5,
			description:   "should detect multiple stale scores",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Clean up database
			db.Exec("DELETE FROM analysis_scores")
			db.Exec("DELETE FROM domain_extraction_features")

			// Create mock clock
			mockTime := time.Date(2024, 1, 15, 12, 0, 0, 0, time.UTC)
			mockClock := config.NewMockClock(mockTime)

			// Setup test data
			tt.setupData(db, mockTime)

			// Create test config
			cfg := &config.PipelineConfig{
				StaleScoreDetectionEnabled: true,
				StaleScoreMaxAge:           1 * time.Hour, // 1 hour threshold
			}

			// Create detector
			detector := NewStaleScoreDetector(db, cfg, mockClock, nil)

			// Run detection
			result, err := detector.DetectStaleScores(context.Background())
			if err != nil {
				t.Errorf("DetectStaleScores() error = %v", err)
				return
			}

			// Verify results
			if result.StaleCount != tt.expectedStale {
				t.Errorf("Expected %d stale scores, got %d", tt.expectedStale, result.StaleCount)
			}

			// Verify sample domains are included when stale scores are found
			if tt.expectedStale > 0 && len(result.Domains) == 0 {
				t.Error("Expected sample domains when stale scores detected, got none")
			}

			// Verify we don't exceed the sample limit (max 10)
			if len(result.Domains) > 10 {
				t.Errorf("Sample domains should be limited to 10, got %d", len(result.Domains))
			}
		})
	}
}

func TestStaleScoreDetector_DisabledDetection(t *testing.T) {
	db, err := sqlx.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	defer db.Close()

	cfg := &config.PipelineConfig{
		StaleScoreDetectionEnabled: false, // Disabled
		StaleScoreMaxAge:           1 * time.Hour,
	}

	detector := NewStaleScoreDetector(db, cfg, config.RealClock{}, nil)

	result, err := detector.DetectStaleScores(context.Background())
	if err != nil {
		t.Errorf("DetectStaleScores() error = %v", err)
	}

	if result.StaleCount != 0 {
		t.Errorf("Expected 0 stale scores when detection disabled, got %d", result.StaleCount)
	}
}

func TestStaleScoreDetector_RunDetection(t *testing.T) {
	// Create in-memory SQLite database for testing
	db, err := sqlx.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	defer db.Close()

	// Create test table schema
	_, err = db.Exec(`
		CREATE TABLE analysis_scores (
			id INTEGER PRIMARY KEY,
			campaign_id TEXT NOT NULL,
			domain_name TEXT NOT NULL,
			relevance_score REAL,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		t.Fatalf("Failed to create analysis_scores table: %v", err)
	}

	_, err = db.Exec(`
		CREATE TABLE domain_extraction_features (
			id INTEGER PRIMARY KEY,
			campaign_id TEXT NOT NULL,
			domain_name TEXT NOT NULL,
			processing_state TEXT NOT NULL,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		t.Fatalf("Failed to create domain_extraction_features table: %v", err)
	}

	// Setup test data
	now := time.Now()
	oldScoreTime := now.Add(-2 * time.Hour)
	newFeatureTime := now.Add(-30 * time.Minute)

	db.Exec(`INSERT INTO analysis_scores (campaign_id, domain_name, relevance_score, updated_at) 
		VALUES ('camp1', 'test.com', 0.8, ?)`, oldScoreTime)
	db.Exec(`INSERT INTO domain_extraction_features (campaign_id, domain_name, processing_state, updated_at) 
		VALUES ('camp1', 'test.com', 'ready', ?)`, newFeatureTime)

	cfg := &config.PipelineConfig{
		StaleScoreDetectionEnabled: true,
		StaleScoreMaxAge:           1 * time.Hour,
	}

	detector := NewStaleScoreDetector(db, cfg, config.RealClock{}, nil)

	// Test RunDetection which combines detection and enqueueing
	result, err := detector.RunDetection(context.Background())
	if err != nil {
		t.Errorf("RunDetection() error = %v", err)
	}

	if result.StaleCount != 1 {
		t.Errorf("Expected 1 stale score, got %d", result.StaleCount)
	}
}
