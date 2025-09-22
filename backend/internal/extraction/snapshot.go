package extraction

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ScoringProfileSnapshot represents a point-in-time snapshot of scoring configuration
type ScoringProfileSnapshot struct {
	ID                    string                 `json:"id"`
	CampaignID            string                 `json:"campaign_id"`
	ProfileVersion        int                    `json:"profile_version"`
	CreatedAt             time.Time              `json:"created_at"`
	ScoringConfiguration  map[string]interface{} `json:"scoring_configuration"`
	FeatureWeights        map[string]float64     `json:"feature_weights"`
	AlgorithmVersion      string                 `json:"algorithm_version"`
	Parameters            map[string]interface{} `json:"parameters"`
	IsActive              bool                   `json:"is_active"`
	ReplacedAt            *time.Time             `json:"replaced_at,omitempty"`
	ReplacedBySnapshotID  *string                `json:"replaced_by_snapshot_id,omitempty"`
	DomainCount           int                    `json:"domain_count"` // Number of domains using this snapshot
}

// SnapshotService handles scoring profile snapshot operations
type SnapshotService struct {
	db *sql.DB
}

// NewSnapshotService creates a new snapshot service
func NewSnapshotService(db *sql.DB) *SnapshotService {
	return &SnapshotService{db: db}
}

// CreateSnapshot creates a new scoring profile snapshot for a campaign
func (s *SnapshotService) CreateSnapshot(ctx context.Context, campaignID string, config map[string]interface{}) (*ScoringProfileSnapshot, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// Generate new snapshot ID
	snapshotID := uuid.New().String()
	
	// Get current profile version
	version, err := s.getNextProfileVersion(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get next profile version: %w", err)
	}

	// Extract feature weights and algorithm parameters from config
	featureWeights := extractFeatureWeights(config)
	algorithmVersion := extractAlgorithmVersion(config)
	parameters := extractParameters(config)

	// Begin transaction
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Mark previous snapshot as inactive
	_, err = tx.ExecContext(ctx, `
		UPDATE scoring_profile_snapshots 
		SET is_active = false, replaced_at = NOW(), replaced_by_snapshot_id = $1
		WHERE campaign_id = $2 AND is_active = true`,
		snapshotID, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to deactivate previous snapshot: %w", err)
	}

	// Insert new snapshot
	configJSON, _ := json.Marshal(config)
	weightsJSON, _ := json.Marshal(featureWeights)
	paramsJSON, _ := json.Marshal(parameters)

	_, err = tx.ExecContext(ctx, `
		INSERT INTO scoring_profile_snapshots 
		(id, campaign_id, profile_version, scoring_configuration, feature_weights, 
		 algorithm_version, parameters, is_active, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())`,
		snapshotID, campaignID, version, configJSON, weightsJSON, algorithmVersion, paramsJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to insert new snapshot: %w", err)
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	snapshot := &ScoringProfileSnapshot{
		ID:                   snapshotID,
		CampaignID:           campaignID,
		ProfileVersion:       version,
		CreatedAt:            time.Now(),
		ScoringConfiguration: config,
		FeatureWeights:       featureWeights,
		AlgorithmVersion:     algorithmVersion,
		Parameters:           parameters,
		IsActive:             true,
	}

	return snapshot, nil
}

// GetActiveSnapshot retrieves the currently active scoring profile snapshot for a campaign
func (s *SnapshotService) GetActiveSnapshot(ctx context.Context, campaignID string) (*ScoringProfileSnapshot, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	var snapshot ScoringProfileSnapshot
	var configJSON, weightsJSON, paramsJSON []byte
	var replacedAt sql.NullTime
	var replacedByID sql.NullString

	err := s.db.QueryRowContext(ctx, `
		SELECT id, campaign_id, profile_version, created_at, scoring_configuration,
		       feature_weights, algorithm_version, parameters, is_active, 
		       replaced_at, replaced_by_snapshot_id
		FROM scoring_profile_snapshots 
		WHERE campaign_id = $1 AND is_active = true`,
		campaignID).Scan(
		&snapshot.ID, &snapshot.CampaignID, &snapshot.ProfileVersion, &snapshot.CreatedAt,
		&configJSON, &weightsJSON, &snapshot.AlgorithmVersion, &paramsJSON,
		&snapshot.IsActive, &replacedAt, &replacedByID)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No active snapshot found
		}
		return nil, fmt.Errorf("failed to query active snapshot: %w", err)
	}

	// Unmarshal JSON fields
	if err = json.Unmarshal(configJSON, &snapshot.ScoringConfiguration); err != nil {
		return nil, fmt.Errorf("failed to unmarshal scoring configuration: %w", err)
	}
	if err = json.Unmarshal(weightsJSON, &snapshot.FeatureWeights); err != nil {
		return nil, fmt.Errorf("failed to unmarshal feature weights: %w", err)
	}
	if err = json.Unmarshal(paramsJSON, &snapshot.Parameters); err != nil {
		return nil, fmt.Errorf("failed to unmarshal parameters: %w", err)
	}

	if replacedAt.Valid {
		snapshot.ReplacedAt = &replacedAt.Time
	}
	if replacedByID.Valid {
		snapshot.ReplacedBySnapshotID = &replacedByID.String
	}

	return &snapshot, nil
}

// MarkDomainsStale marks all domains in a campaign as having stale scores if they use an outdated snapshot
func (s *SnapshotService) MarkDomainsStale(ctx context.Context, campaignID string, currentSnapshotID string) (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("database connection is nil")
	}

	// Update domains that don't have the current snapshot ID
	result, err := s.db.ExecContext(ctx, `
		UPDATE domain_extraction_features 
		SET is_stale_score = true, updated_at = NOW()
		WHERE campaign_id = $1 
		  AND processing_state = 'ready'
		  AND (scoring_profile_snapshot_id IS NULL OR scoring_profile_snapshot_id != $2)
		  AND is_stale_score = false`,
		campaignID, currentSnapshotID)

	if err != nil {
		return 0, fmt.Errorf("failed to mark domains stale: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	return int(rowsAffected), nil
}

// UpdateDomainSnapshotID updates the snapshot ID for a domain after re-scoring
func (s *SnapshotService) UpdateDomainSnapshotID(ctx context.Context, domainID, snapshotID string) error {
	if s.db == nil {
		return fmt.Errorf("database connection is nil")
	}

	_, err := s.db.ExecContext(ctx, `
		UPDATE domain_extraction_features 
		SET scoring_profile_snapshot_id = $1, is_stale_score = false, updated_at = NOW()
		WHERE domain_id = $2`,
		snapshotID, domainID)

	return err
}

// GetSnapshotHistory retrieves the history of snapshots for a campaign
func (s *SnapshotService) GetSnapshotHistory(ctx context.Context, campaignID string, limit int) ([]*ScoringProfileSnapshot, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	if limit <= 0 {
		limit = 10
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, campaign_id, profile_version, created_at, scoring_configuration,
		       feature_weights, algorithm_version, parameters, is_active, 
		       replaced_at, replaced_by_snapshot_id
		FROM scoring_profile_snapshots 
		WHERE campaign_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2`,
		campaignID, limit)

	if err != nil {
		return nil, fmt.Errorf("failed to query snapshot history: %w", err)
	}
	defer rows.Close()

	var snapshots []*ScoringProfileSnapshot
	for rows.Next() {
		var snapshot ScoringProfileSnapshot
		var configJSON, weightsJSON, paramsJSON []byte
		var replacedAt sql.NullTime
		var replacedByID sql.NullString

		err = rows.Scan(
			&snapshot.ID, &snapshot.CampaignID, &snapshot.ProfileVersion, &snapshot.CreatedAt,
			&configJSON, &weightsJSON, &snapshot.AlgorithmVersion, &paramsJSON,
			&snapshot.IsActive, &replacedAt, &replacedByID)
		if err != nil {
			return nil, fmt.Errorf("failed to scan snapshot row: %w", err)
		}

		// Unmarshal JSON fields
		json.Unmarshal(configJSON, &snapshot.ScoringConfiguration)
		json.Unmarshal(weightsJSON, &snapshot.FeatureWeights)
		json.Unmarshal(paramsJSON, &snapshot.Parameters)

		if replacedAt.Valid {
			snapshot.ReplacedAt = &replacedAt.Time
		}
		if replacedByID.Valid {
			snapshot.ReplacedBySnapshotID = &replacedByID.String
		}

		snapshots = append(snapshots, &snapshot)
	}

	return snapshots, nil
}

// CountStaleDomainsForCampaign returns the number of domains with stale scores
func (s *SnapshotService) CountStaleDomainsForCampaign(ctx context.Context, campaignID string) (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("database connection is nil")
	}

	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) 
		FROM domain_extraction_features 
		WHERE campaign_id = $1 AND is_stale_score = true AND processing_state = 'ready'`,
		campaignID).Scan(&count)

	return count, err
}

// getNextProfileVersion gets the next version number for a campaign's scoring profile
func (s *SnapshotService) getNextProfileVersion(ctx context.Context, campaignID string) (int, error) {
	var maxVersion sql.NullInt32
	err := s.db.QueryRowContext(ctx, `
		SELECT MAX(profile_version) 
		FROM scoring_profile_snapshots 
		WHERE campaign_id = $1`,
		campaignID).Scan(&maxVersion)

	if err != nil && err != sql.ErrNoRows {
		return 0, err
	}

	if maxVersion.Valid {
		return int(maxVersion.Int32) + 1, nil
	}
	return 1, nil
}

// Helper functions to extract configuration components
func extractFeatureWeights(config map[string]interface{}) map[string]float64 {
	weights := make(map[string]float64)
	if weightsSection, ok := config["feature_weights"].(map[string]interface{}); ok {
		for key, val := range weightsSection {
			if weight, ok := val.(float64); ok {
				weights[key] = weight
			}
		}
	}
	return weights
}

func extractAlgorithmVersion(config map[string]interface{}) string {
	if version, ok := config["algorithm_version"].(string); ok {
		return version
	}
	return "1.0"
}

func extractParameters(config map[string]interface{}) map[string]interface{} {
	if params, ok := config["parameters"].(map[string]interface{}); ok {
		return params
	}
	return make(map[string]interface{})
}