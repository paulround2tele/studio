// File: backend/internal/store/postgres/campaign_store.go
package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings" // For ListCampaigns dynamic query
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/monitoring"
	"github.com/fntelecomllc/studio/backend/internal/store"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq" // For pq.Array if needed for array types, and for error checking
)

// campaignStorePostgres implements the store.CampaignStore interface for PostgreSQL
type campaignStorePostgres struct {
	db          *sqlx.DB
	stmtManager *PreparedStatementManager
}

// NewCampaignStorePostgres creates a new CampaignStore for PostgreSQL
func NewCampaignStorePostgres(db *sqlx.DB) store.CampaignStore {
	return &campaignStorePostgres{
		db:          db,
		stmtManager: NewPreparedStatementManager(),
	}
}

// BeginTxx starts a new transaction.
func (s *campaignStorePostgres) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return s.db.BeginTxx(ctx, opts)
}

// --- Campaign CRUD --- //

func (s *campaignStorePostgres) CreateCampaign(ctx context.Context, exec store.Querier, campaign *models.Campaign) error {
	query := `INSERT INTO campaigns (id, name, campaign_type, status, user_id, created_at, updated_at,
							 started_at, completed_at, progress_percentage, total_items, processed_items, successful_items, failed_items, metadata, error_message)
			  VALUES (:id, :name, :campaign_type, :status, :user_id, :created_at, :updated_at,
					  :started_at, :completed_at, :progress_percentage, :total_items, :processed_items, :successful_items, :failed_items, :metadata, :error_message)`
	_, err := exec.NamedExecContext(ctx, query, campaign)
	return err
}

func (s *campaignStorePostgres) GetCampaignByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.Campaign, error) {
	campaign := &models.Campaign{}
	query := `SELECT id, name, campaign_type, status, user_id, created_at, updated_at,
					 started_at, completed_at, progress_percentage, total_items, processed_items, successful_items, failed_items, metadata, error_message
			  FROM campaigns WHERE id = $1`
	err := exec.GetContext(ctx, campaign, query, id)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return campaign, err
}

// GetCampaignByIDWithUserFilter retrieves a campaign by ID with mandatory user ownership validation
// This method provides tenant isolation at the database query level
func (s *campaignStorePostgres) GetCampaignByIDWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, userID uuid.UUID) (*models.Campaign, error) {
	campaign := &models.Campaign{}
	query := `SELECT id, name, campaign_type, status, user_id, created_at, updated_at,
					 started_at, completed_at, progress_percentage, total_items, processed_items, successful_items, failed_items, metadata, error_message
			  FROM campaigns WHERE id = $1 AND user_id = $2`
	err := exec.GetContext(ctx, campaign, query, id, userID)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return campaign, err
}

func (s *campaignStorePostgres) UpdateCampaign(ctx context.Context, exec store.Querier, campaign *models.Campaign) error {
	query := `UPDATE campaigns SET
				name = :name, campaign_type = :campaign_type, status = :status, user_id = :user_id,
				updated_at = :updated_at, started_at = :started_at, completed_at = :completed_at,
				progress_percentage = :progress_percentage, total_items = :total_items,
				processed_items = :processed_items, successful_items = :successful_items, failed_items = :failed_items, metadata = :metadata, error_message = :error_message
			  WHERE id = :id`
	result, err := exec.NamedExecContext(ctx, query, campaign)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}
	return err
}

// UpdateCampaignWithUserFilter updates a campaign with mandatory user ownership validation
// This method provides tenant isolation at the database query level
func (s *campaignStorePostgres) UpdateCampaignWithUserFilter(ctx context.Context, exec store.Querier, campaign *models.Campaign, userID uuid.UUID) error {
	// SECURITY: user_id field is NOT included in update to prevent ownership changes
	query := `UPDATE campaigns SET
				name = $2, campaign_type = $3, status = $4,
				updated_at = $5, started_at = $6, completed_at = $7,
				progress_percentage = $8, total_items = $9,
				processed_items = $10, successful_items = $11, failed_items = $12,
				metadata = $13, error_message = $14
			  WHERE id = $1 AND user_id = $15`

	result, err := exec.ExecContext(ctx, query,
		campaign.ID, campaign.Name, campaign.CampaignType, campaign.Status,
		campaign.UpdatedAt, campaign.StartedAt, campaign.CompletedAt,
		campaign.ProgressPercentage, campaign.TotalItems,
		campaign.ProcessedItems, campaign.SuccessfulItems, campaign.FailedItems,
		campaign.Metadata, campaign.ErrorMessage, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}
	return err
}

func (s *campaignStorePostgres) DeleteCampaign(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	query := `DELETE FROM campaigns WHERE id = $1`
	result, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}
	return err
}

// DeleteCampaignWithUserFilter deletes a campaign with mandatory user ownership validation
// This method provides tenant isolation at the database query level
func (s *campaignStorePostgres) DeleteCampaignWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, userID uuid.UUID) error {
	query := `DELETE FROM campaigns WHERE id = $1 AND user_id = $2`
	result, err := exec.ExecContext(ctx, query, id, userID)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}
	return err
}

func (s *campaignStorePostgres) ListCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) ([]*models.Campaign, error) {
	baseQuery := `SELECT id, name, campaign_type, status, user_id, created_at, updated_at,
					 started_at, completed_at, progress_percentage, total_items, processed_items, successful_items, failed_items, metadata, error_message
			      FROM campaigns`
	args := []interface{}{}
	conditions := []string{}

	if filter.Type != "" {
		conditions = append(conditions, "campaign_type = ?")
		args = append(args, filter.Type)
	}
	if filter.Status != "" {
		conditions = append(conditions, "status = ?")
		args = append(args, filter.Status)
	}
	if filter.UserID != "" {
		conditions = append(conditions, "user_id = ?")
		args = append(args, filter.UserID)
	}

	finalQuery := baseQuery
	if len(conditions) > 0 {
		finalQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	if filter.SortBy != "" {
		validSortCols := map[string]string{"created_at": "created_at", "name": "name", "status": "status", "updated_at": "updated_at"}
		if col, ok := validSortCols[filter.SortBy]; ok {
			finalQuery += " ORDER BY " + col
			if strings.ToUpper(filter.SortOrder) == "DESC" {
				finalQuery += " DESC"
			} else {
				finalQuery += " ASC"
			}
		} else {
			finalQuery += " ORDER BY created_at DESC" // Default sort if SortBy is invalid
		}
	} else {
		finalQuery += " ORDER BY created_at DESC" // Default sort
	}

	if filter.Limit > 0 {
		finalQuery += " LIMIT ?"
		args = append(args, filter.Limit)
	}
	if filter.Offset > 0 {
		finalQuery += " OFFSET ?"
		args = append(args, filter.Offset)
	}

	var reboundQuery string
	switch q := exec.(type) {
	case *sqlx.DB:
		reboundQuery = q.Rebind(finalQuery)
	case *sqlx.Tx:
		reboundQuery = q.Rebind(finalQuery)
	default:
		return nil, fmt.Errorf("unexpected Querier type: %T", exec)
	}

	campaigns := []*models.Campaign{}
	err := exec.SelectContext(ctx, &campaigns, reboundQuery, args...)
	return campaigns, err
}

func (s *campaignStorePostgres) CountCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) (int64, error) {
	baseQuery := `SELECT COUNT(*) FROM campaigns`
	args := []interface{}{}
	conditions := []string{}

	if filter.Type != "" {
		conditions = append(conditions, "campaign_type = ?")
		args = append(args, filter.Type)
	}
	if filter.Status != "" {
		conditions = append(conditions, "status = ?")
		args = append(args, filter.Status)
	}
	if filter.UserID != "" {
		conditions = append(conditions, "user_id = ?")
		args = append(args, filter.UserID)
	}

	finalQuery := baseQuery
	if len(conditions) > 0 {
		finalQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	var reboundQuery string
	switch q := exec.(type) {
	case *sqlx.DB:
		reboundQuery = q.Rebind(finalQuery)
	case *sqlx.Tx:
		reboundQuery = q.Rebind(finalQuery)
	default:
		return 0, fmt.Errorf("unexpected Querier type: %T", exec)
	}

	var count int64
	err := exec.GetContext(ctx, &count, reboundQuery, args...)
	return count, err
}

func (s *campaignStorePostgres) UpdateCampaignStatus(ctx context.Context, exec store.Querier, id uuid.UUID, status models.CampaignStatusEnum, errorMessage sql.NullString) error {
	query := `UPDATE campaigns SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`
	result, err := exec.ExecContext(ctx, query, status, errorMessage, id)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}
	return err
}

// UpdateCampaignStatusWithUserFilter updates campaign status with mandatory user ownership validation
// This method provides tenant isolation at the database query level
func (s *campaignStorePostgres) UpdateCampaignStatusWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, status models.CampaignStatusEnum, errorMessage sql.NullString, userID uuid.UUID) error {
	query := `UPDATE campaigns SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4`
	result, err := exec.ExecContext(ctx, query, status, errorMessage, id, userID)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}
	return err
}

func (s *campaignStorePostgres) UpdateCampaignProgress(ctx context.Context, exec store.Querier, id uuid.UUID, processedItems, totalItems int64, progressPercentage float64) error {
	// First, update the progress and set status to 'running' if it's not already completed or failed
	query := `UPDATE campaigns
		SET processed_items = $1,
			total_items = $2,
			progress_percentage = $3,
			status = CASE
				WHEN status NOT IN ('completed', 'failed') THEN 'running'
				ELSE status
			END,
			updated_at = NOW()
		WHERE id = $4`

	result, err := exec.ExecContext(ctx, query, processedItems, totalItems, progressPercentage, id)
	if err != nil {
		return fmt.Errorf("error updating campaign progress: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return store.ErrNotFound
	}

	return nil
}

// UpdateCampaignProgressWithUserFilter updates campaign progress with mandatory user ownership validation
// This method provides tenant isolation at the database query level
func (s *campaignStorePostgres) UpdateCampaignProgressWithUserFilter(ctx context.Context, exec store.Querier, id uuid.UUID, processedItems, totalItems int64, progressPercentage float64, userID uuid.UUID) error {
	query := `UPDATE campaigns
		SET processed_items = $1,
			total_items = $2,
			progress_percentage = $3,
			status = CASE
				WHEN status NOT IN ('completed', 'failed') THEN 'running'
				ELSE status
			END,
			updated_at = NOW()
		WHERE id = $4 AND user_id = $5`

	result, err := exec.ExecContext(ctx, query, processedItems, totalItems, progressPercentage, id, userID)
	if err != nil {
		return fmt.Errorf("error updating campaign progress: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("error getting rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return store.ErrNotFound
	}

	return nil
}

// --- Domain Generation Campaign Params --- //

func (s *campaignStorePostgres) CreateDomainGenerationParams(ctx context.Context, exec store.Querier, params *models.DomainGenerationCampaignParams) error {
	query := `INSERT INTO domain_generation_campaign_params 
				(campaign_id, pattern_type, variable_length, character_set, constant_string, tld, num_domains_to_generate, total_possible_combinations, current_offset) 
			  VALUES (:campaign_id, :pattern_type, :variable_length, :character_set, :constant_string, :tld, :num_domains_to_generate, :total_possible_combinations, :current_offset)`
	_, err := exec.NamedExecContext(ctx, query, params)
	return err
}

func (s *campaignStorePostgres) GetDomainGenerationParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.DomainGenerationCampaignParams, error) {
	params := &models.DomainGenerationCampaignParams{}
	query := `SELECT campaign_id, pattern_type, variable_length, character_set, constant_string, tld, num_domains_to_generate, total_possible_combinations, current_offset 
			  FROM domain_generation_campaign_params WHERE campaign_id = $1`
	err := exec.GetContext(ctx, params, query, campaignID)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return params, err
}

func (s *campaignStorePostgres) UpdateDomainGenerationParamsOffset(ctx context.Context, exec store.Querier, campaignID uuid.UUID, newOffset int64) error {
	query := `UPDATE domain_generation_campaign_params SET current_offset = $1 WHERE campaign_id = $2`
	result, err := exec.ExecContext(ctx, query, newOffset, campaignID)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}
	return err
}

// --- DomainGenerationConfigState Store Methods ---

func (s *campaignStorePostgres) GetDomainGenerationConfigStateByHash(ctx context.Context, exec store.Querier, configHash string) (*models.DomainGenerationConfigState, error) {
	state := &models.DomainGenerationConfigState{}
	query := `SELECT config_hash, last_offset, config_details, updated_at
			  FROM domain_generation_config_states WHERE config_hash = $1`
	err := exec.GetContext(ctx, state, query, configHash)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return state, err
}

func (s *campaignStorePostgres) CreateOrUpdateDomainGenerationConfigState(ctx context.Context, exec store.Querier, state *models.DomainGenerationConfigState) error {
	query := `INSERT INTO domain_generation_config_states (config_hash, last_offset, config_details, updated_at)
			  VALUES (:config_hash, :last_offset, :config_details, :updated_at)
			  ON CONFLICT (config_hash) DO UPDATE SET
				last_offset = EXCLUDED.last_offset,
				config_details = EXCLUDED.config_details,
				updated_at = EXCLUDED.updated_at,
				version = COALESCE(domain_generation_config_states.version, 0) + 1`
	_, err := exec.NamedExecContext(ctx, query, state)
	return err
}

// AtomicUpdateDomainGenerationConfigState performs atomic configuration update with optimistic locking
func (s *campaignStorePostgres) AtomicUpdateDomainGenerationConfigState(ctx context.Context, exec store.Querier, request *models.ConfigUpdateRequest) (*models.AtomicConfigUpdateResult, error) {
	query := `SELECT * FROM atomic_update_domain_config_state($1, $2, $3, $4)`

	var result models.AtomicConfigUpdateResult
	err := exec.GetContext(ctx, &result, query,
		request.ConfigHash,
		request.ExpectedVersion,
		request.NewLastOffset,
		request.ConfigDetails,
	)

	if err != nil {
		return nil, fmt.Errorf("atomic config update failed: %w", err)
	}

	return &result, nil
}

// GetVersionedDomainGenerationConfigState retrieves versioned configuration with optional locking
func (s *campaignStorePostgres) GetVersionedDomainGenerationConfigState(ctx context.Context, exec store.Querier, configHash string, lockType models.ConfigLockType) (*models.VersionedDomainGenerationConfigState, error) {
	query := `SELECT * FROM get_domain_config_state_with_lock($1, $2)`

	var state models.VersionedDomainGenerationConfigState
	err := exec.GetContext(ctx, &state, query, configHash, string(lockType))

	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get versioned config state: %w", err)
	}

	return &state, nil
}

// ValidateConfigConsistency validates configuration state consistency
func (s *campaignStorePostgres) ValidateConfigConsistency(ctx context.Context, exec store.Querier, configHash string) (*models.ConfigValidationResult, error) {
	state, err := s.GetVersionedDomainGenerationConfigState(ctx, exec, configHash, models.ConfigLockTypeShared)
	if err != nil {
		return &models.ConfigValidationResult{
			IsValid:          false,
			ConfigHash:       configHash,
			ValidationErrors: []string{fmt.Sprintf("Failed to retrieve config: %v", err)},
			ValidatedAt:      time.Now().UTC(),
		}, nil
	}

	var validationErrors []string
	var validationChecks []models.ConfigValidationCheck

	// Check version consistency
	if state.Version <= 0 {
		validationErrors = append(validationErrors, "Invalid version: must be positive")
		validationChecks = append(validationChecks, models.ConfigValidationCheck{
			CheckType:    "version_validation",
			CheckPassed:  false,
			ErrorMessage: "Version must be positive",
			CheckedAt:    time.Now().UTC(),
		})
	} else {
		validationChecks = append(validationChecks, models.ConfigValidationCheck{
			CheckType:   "version_validation",
			CheckPassed: true,
			CheckedAt:   time.Now().UTC(),
		})
	}

	// Check offset consistency
	if state.LastOffset < 0 {
		validationErrors = append(validationErrors, "Invalid offset: must be non-negative")
		validationChecks = append(validationChecks, models.ConfigValidationCheck{
			CheckType:    "offset_validation",
			CheckPassed:  false,
			ErrorMessage: "Offset must be non-negative",
			CheckedAt:    time.Now().UTC(),
		})
	} else {
		validationChecks = append(validationChecks, models.ConfigValidationCheck{
			CheckType:   "offset_validation",
			CheckPassed: true,
			CheckedAt:   time.Now().UTC(),
		})
	}

	// Check config details
	if len(state.ConfigDetails) == 0 {
		validationErrors = append(validationErrors, "Invalid config details: cannot be empty")
		validationChecks = append(validationChecks, models.ConfigValidationCheck{
			CheckType:    "config_details_validation",
			CheckPassed:  false,
			ErrorMessage: "Config details cannot be empty",
			CheckedAt:    time.Now().UTC(),
		})
	} else {
		validationChecks = append(validationChecks, models.ConfigValidationCheck{
			CheckType:   "config_details_validation",
			CheckPassed: true,
			CheckedAt:   time.Now().UTC(),
		})
	}

	return &models.ConfigValidationResult{
		IsValid:          len(validationErrors) == 0,
		ConfigHash:       configHash,
		CurrentVersion:   state.Version,
		CurrentOffset:    state.LastOffset,
		ValidationErrors: validationErrors,
		ValidationChecks: validationChecks,
		ValidatedAt:      time.Now().UTC(),
	}, nil
}

// --- Generated Domains --- //

func (s *campaignStorePostgres) CreateGeneratedDomains(ctx context.Context, exec store.Querier, domains []*models.GeneratedDomain) error {
	if len(domains) == 0 {
		return nil
	}

	// Add timeout to context if not present
	timeoutCtx, cancel := WithTimeout(ctx, DefaultTimeout)
	defer cancel()

	// Extract campaign ID for logging
	var campaignID string
	if len(domains) > 0 && domains[0] != nil {
		campaignID = domains[0].GenerationCampaignID.String()
	}

	// Log database metrics before operation
	if db, ok := exec.(*sqlx.DB); ok {
		metrics := monitoring.NewDatabaseMetrics(db)
		metrics.LogConnectionPoolStats("CreateGeneratedDomains_start", campaignID)
	}

	query := `INSERT INTO generated_domains
		(id, domain_generation_campaign_id, domain_name, source_keyword, source_pattern, tld, offset_index, generated_at, created_at)
		VALUES (:id, :domain_generation_campaign_id, :domain_name, :source_keyword, :source_pattern, :tld, :offset_index, :generated_at, :created_at)`

	monitoring.LogPreparedStatementLifecycle("CreateGeneratedDomains", campaignID, query, "prepare_start", nil)

	// Use SafePreparedStatement to ensure proper cleanup
	err := s.stmtManager.SafePreparedStatement(timeoutCtx, exec, query, "CreateGeneratedDomains", func(stmt *sqlx.NamedStmt) error {
		monitoring.LogPreparedStatementLifecycle("CreateGeneratedDomains", campaignID, query, "prepare_success", nil)

		for _, domain := range domains {
			if domain.ID == uuid.Nil {
				domain.ID = uuid.New()
			}
			if domain.GeneratedAt.IsZero() {
				domain.GeneratedAt = time.Now().UTC()
			}
			if domain.CreatedAt.IsZero() {
				domain.CreatedAt = time.Now().UTC()
			}
			_, err := stmt.ExecContext(timeoutCtx, domain)
			if err != nil {
				monitoring.LogPreparedStatementLifecycle("CreateGeneratedDomains", campaignID, query, "exec_failed", err)
				return fmt.Errorf("failed to insert domain %s: %w", domain.DomainName, err)
			}
		}

		monitoring.LogPreparedStatementLifecycle("CreateGeneratedDomains", campaignID, query, "complete", nil)
		return nil
	})

	if err != nil {
		monitoring.LogPreparedStatementLifecycle("CreateGeneratedDomains", campaignID, query, "prepare_failed", err)
		return err
	}

	// Log final database metrics
	if db, ok := exec.(*sqlx.DB); ok {
		metrics := monitoring.NewDatabaseMetrics(db)
		metrics.LogConnectionPoolStats("CreateGeneratedDomains_end", campaignID)
	}

	return nil
}

func (s *campaignStorePostgres) GetGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit int, lastOffsetIndex int64) ([]*models.GeneratedDomain, error) {
	domains := []*models.GeneratedDomain{}
	// lastOffsetIndex = -1 can indicate to fetch the first page
	query := `SELECT id, domain_generation_campaign_id, domain_name, source_keyword, source_pattern, tld, offset_index, generated_at, created_at
			  FROM generated_domains
			  WHERE domain_generation_campaign_id = $1 AND offset_index >= $2
			  ORDER BY offset_index ASC
			  LIMIT $3`
	err := exec.SelectContext(ctx, &domains, query, campaignID, lastOffsetIndex, limit)
	return domains, err
}

func (s *campaignStorePostgres) CountGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int64, error) {
	var count int64
	query := `SELECT COUNT(*) FROM generated_domains WHERE domain_generation_campaign_id = $1`
	err := exec.GetContext(ctx, &count, query, campaignID)
	return count, err
}

// --- DNS Validation Campaign Params --- //

func (s *campaignStorePostgres) CreateDNSValidationParams(ctx context.Context, exec store.Querier, params *models.DNSValidationCampaignParams) error {
	query := `INSERT INTO dns_validation_params
	               (campaign_id, source_generation_campaign_id, persona_ids, rotation_interval_seconds, processing_speed_per_minute, batch_size, retry_attempts, metadata)
	             VALUES (:campaign_id, :source_generation_campaign_id, :persona_ids, :rotation_interval_seconds, :processing_speed_per_minute, :batch_size, :retry_attempts, :metadata)`

	personaIDStrings := make([]string, len(params.PersonaIDs))
	for i, pid := range params.PersonaIDs {
		personaIDStrings[i] = pid.String()
	}

	arg := struct {
		*models.DNSValidationCampaignParams
		PersonaIDs pq.StringArray `db:"persona_ids"`
	}{
		DNSValidationCampaignParams: params,
		PersonaIDs:                  pq.StringArray(personaIDStrings),
	}

	_, err := exec.NamedExecContext(ctx, query, &arg)
	return err
}

func (s *campaignStorePostgres) GetDNSValidationParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.DNSValidationCampaignParams, error) {
	// Temporary struct for scanning persona_ids as string array
	type dnsParamsScan struct {
		CampaignID                 uuid.UUID        `db:"campaign_id"`
		SourceGenerationCampaignID uuid.NullUUID    `db:"source_generation_campaign_id"`
		ScannedPersonaIDs          pq.StringArray   `db:"persona_ids"`
		RotationIntervalSeconds    int              `db:"rotation_interval_seconds"`
		ProcessingSpeedPerMinute   int              `db:"processing_speed_per_minute"`
		BatchSize                  int              `db:"batch_size"`
		RetryAttempts              int              `db:"retry_attempts"`
		Metadata                   *json.RawMessage `db:"metadata"`
	}

	scanTarget := &dnsParamsScan{}
	query := `SELECT campaign_id, source_generation_campaign_id, persona_ids, rotation_interval_seconds, processing_speed_per_minute, batch_size, retry_attempts, metadata
		         FROM dns_validation_params WHERE campaign_id = $1`
	err := exec.GetContext(ctx, scanTarget, query, campaignID)
	if err != nil {
		if err == sql.ErrNoRows { // Specific check for ErrNoRows
			return nil, store.ErrNotFound
		}
		return nil, fmt.Errorf("GetDNSValidationParams: db query error: %w", err) // General DB error
	}

	// Convert scanned data
	params := &models.DNSValidationCampaignParams{
		CampaignID:                 scanTarget.CampaignID,
		SourceGenerationCampaignID: &scanTarget.SourceGenerationCampaignID.UUID, // Handles NULL correctly (becomes uuid.Nil)
		RotationIntervalSeconds:    models.IntPtr(scanTarget.RotationIntervalSeconds),
		ProcessingSpeedPerMinute:   models.IntPtr(scanTarget.ProcessingSpeedPerMinute),
		BatchSize:                  models.IntPtr(scanTarget.BatchSize),
		RetryAttempts:              models.IntPtr(scanTarget.RetryAttempts),
		Metadata:                   scanTarget.Metadata,
		PersonaIDs:                 make([]uuid.UUID, 0, len(scanTarget.ScannedPersonaIDs)),
	}

	for _, idStr := range scanTarget.ScannedPersonaIDs {
		id, parseErr := uuid.Parse(idStr)
		if parseErr != nil {
			return nil, fmt.Errorf("GetDNSValidationParams: persona ID parse error '%s': %w", idStr, parseErr)
		}
		params.PersonaIDs = append(params.PersonaIDs, id)
	}

	return params, nil
}

// --- DNS Validation Results --- //

func (s *campaignStorePostgres) CreateDNSValidationResults(ctx context.Context, exec store.Querier, results []*models.DNSValidationResult) error {
	if len(results) == 0 {
		return nil
	}

	// Add timeout to context if not present
	timeoutCtx, cancel := WithTimeout(ctx, DefaultTimeout)
	defer cancel()

	// Extract campaign ID for logging
	var campaignID string
	if len(results) > 0 && results[0] != nil {
		campaignID = results[0].DNSCampaignID.String()
	}

	// Log database metrics before operation
	if db, ok := exec.(*sqlx.DB); ok {
		metrics := monitoring.NewDatabaseMetrics(db)
		metrics.LogConnectionPoolStats("CreateDNSValidationResults_start", campaignID)
	}

	query := `INSERT INTO dns_validation_results
	       (id, dns_campaign_id, generated_domain_id, domain_name, validation_status, business_status, dns_records, validated_by_persona_id, attempts, last_checked_at, created_at)
	       VALUES (:id, :dns_campaign_id, :generated_domain_id, :domain_name, :validation_status, :business_status, :dns_records, :validated_by_persona_id, :attempts, :last_checked_at, :created_at)
	       ON CONFLICT (dns_campaign_id, domain_name) DO UPDATE SET
	           validation_status = EXCLUDED.validation_status, business_status = EXCLUDED.business_status, dns_records = EXCLUDED.dns_records,
	           validated_by_persona_id = EXCLUDED.validated_by_persona_id, attempts = dns_validation_results.attempts + 1,
	           last_checked_at = EXCLUDED.last_checked_at, created_at = EXCLUDED.created_at`

	monitoring.LogPreparedStatementLifecycle("CreateDNSValidationResults", campaignID, query, "prepare_start", nil)

	// Use SafePreparedStatement to ensure proper cleanup
	err := s.stmtManager.SafePreparedStatement(timeoutCtx, exec, query, "CreateDNSValidationResults", func(stmt *sqlx.NamedStmt) error {
		monitoring.LogPreparedStatementLifecycle("CreateDNSValidationResults", campaignID, query, "prepare_success", nil)

		for _, result := range results {
			if result.ID == uuid.Nil {
				result.ID = uuid.New()
			}
			if result.LastCheckedAt == nil || result.LastCheckedAt.IsZero() {
				now := time.Now().UTC()
				result.LastCheckedAt = &now
			}
			if result.CreatedAt.IsZero() {
				result.CreatedAt = time.Now().UTC()
			}
			_, err := stmt.ExecContext(timeoutCtx, result)
			if err != nil {
				monitoring.LogPreparedStatementLifecycle("CreateDNSValidationResults", campaignID, query, "exec_failed", err)
				return fmt.Errorf("failed to insert DNS validation result for domain %s: %w", result.DomainName, err)
			}
		}

		monitoring.LogPreparedStatementLifecycle("CreateDNSValidationResults", campaignID, query, "complete", nil)
		return nil
	})

	if err != nil {
		monitoring.LogPreparedStatementLifecycle("CreateDNSValidationResults", campaignID, query, "prepare_failed", err)
		return err
	}

	// Log final database metrics
	if db, ok := exec.(*sqlx.DB); ok {
		metrics := monitoring.NewDatabaseMetrics(db)
		metrics.LogConnectionPoolStats("CreateDNSValidationResults_end", campaignID)
	}

	return nil
}

func (s *campaignStorePostgres) GetDNSValidationResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.DNSValidationResult, error) {
	results := []*models.DNSValidationResult{}
	baseQuery := `SELECT id, dns_campaign_id, generated_domain_id, domain_name, validation_status, dns_records, validated_by_persona_id, attempts, last_checked_at, created_at
		                FROM dns_validation_results WHERE dns_campaign_id = ?`
	args := []interface{}{campaignID}
	finalQuery := baseQuery

	if filter.ValidationStatus != "" {
		finalQuery += " AND validation_status = ?"
		args = append(args, filter.ValidationStatus)
	}
	finalQuery += " ORDER BY domain_name ASC"
	if filter.Limit > 0 {
		finalQuery += " LIMIT ?"
		args = append(args, filter.Limit)
	}
	if filter.Offset > 0 {
		finalQuery += " OFFSET ?"
		args = append(args, filter.Offset)
	}

	var reboundQuery string
	switch q := exec.(type) {
	case *sqlx.DB:
		reboundQuery = q.Rebind(finalQuery)
	case *sqlx.Tx:
		reboundQuery = q.Rebind(finalQuery)
	default:
		return nil, fmt.Errorf("unexpected Querier type: %T", exec)
	}

	err := exec.SelectContext(ctx, &results, reboundQuery, args...)
	return results, err
}

func (s *campaignStorePostgres) CountDNSValidationResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, onlyValid bool) (int64, error) {
	query := `SELECT COUNT(*) FROM dns_validation_results WHERE dns_campaign_id = $1`
	args := []interface{}{campaignID}
	if onlyValid {
		// Use business_status field for business-level filtering
		query += " AND business_status = $2"
		args = append(args, "valid_dns")
	}
	var count int64
	err := exec.GetContext(ctx, &count, query, args...)
	return count, err
}

func (s *campaignStorePostgres) GetDomainsForDNSValidation(ctx context.Context, exec store.Querier, dnsCampaignID uuid.UUID, sourceGenerationCampaignID uuid.UUID, limit int, lastOffsetIndex int64) ([]*models.GeneratedDomain, error) {
	domains := []*models.GeneratedDomain{}
	// Fetches generated domains that either don't have a DNS result for this campaign OR their result is not 'valid_dns'
	// and their offset_index is greater than the last one processed.
	query := `
	       SELECT gd.id, gd.domain_generation_campaign_id, gd.domain_name, gd.source_keyword, gd.source_pattern, gd.tld, gd.offset_index, gd.generated_at, gd.created_at
	       FROM generated_domains gd
	       LEFT JOIN dns_validation_results dvr ON gd.id = dvr.generated_domain_id AND dvr.dns_campaign_id = $1
	       WHERE gd.domain_generation_campaign_id = $2
	         AND gd.offset_index > $3
	         AND (dvr.id IS NULL OR dvr.business_status NOT IN ('valid_dns'))
	       ORDER BY gd.offset_index ASC
	       LIMIT $4`
	err := exec.SelectContext(ctx, &domains, query, dnsCampaignID, sourceGenerationCampaignID, lastOffsetIndex, limit)
	return domains, err
}

// --- HTTP Keyword Campaign Params --- //

func (s *campaignStorePostgres) CreateHTTPKeywordParams(ctx context.Context, exec store.Querier, params *models.HTTPKeywordCampaignParams) error {
	query := `INSERT INTO http_keyword_campaign_params
	               (campaign_id, source_campaign_id, source_type, keyword_set_ids, ad_hoc_keywords, persona_ids, proxy_ids, proxy_pool_id, proxy_selection_strategy, rotation_interval_seconds, processing_speed_per_minute, batch_size, retry_attempts, target_http_ports, last_processed_domain_name, metadata)
	             VALUES (:campaign_id, :source_campaign_id, :source_type, :keyword_set_ids, :ad_hoc_keywords, :persona_ids, :proxy_ids, :proxy_pool_id, :proxy_selection_strategy, :rotation_interval_seconds, :processing_speed_per_minute, :batch_size, :retry_attempts, :target_http_ports, :last_processed_domain_name, :metadata)
	             ON CONFLICT (campaign_id) DO UPDATE SET
	               source_campaign_id = EXCLUDED.source_campaign_id,
	               source_type = EXCLUDED.source_type,
	               keyword_set_ids = EXCLUDED.keyword_set_ids,
	               ad_hoc_keywords = EXCLUDED.ad_hoc_keywords,
	               persona_ids = EXCLUDED.persona_ids,
	               proxy_ids = EXCLUDED.proxy_ids,
	               proxy_pool_id = EXCLUDED.proxy_pool_id,
	               proxy_selection_strategy = EXCLUDED.proxy_selection_strategy,
	               rotation_interval_seconds = EXCLUDED.rotation_interval_seconds,
	               processing_speed_per_minute = EXCLUDED.processing_speed_per_minute,
	               batch_size = EXCLUDED.batch_size,
	               retry_attempts = EXCLUDED.retry_attempts,
	               target_http_ports = EXCLUDED.target_http_ports,
	               last_processed_domain_name = EXCLUDED.last_processed_domain_name,
	               metadata = EXCLUDED.metadata`

	arg := struct {
		*models.HTTPKeywordCampaignParams
		KeywordSetIDs   pq.StringArray `db:"keyword_set_ids"`
		AdHocKeywords   pq.StringArray `db:"ad_hoc_keywords"`
		PersonaIDs      pq.StringArray `db:"persona_ids"`
		ProxyIDs        pq.StringArray `db:"proxy_ids"`
		TargetHTTPPorts pq.Int64Array  `db:"target_http_ports"`
	}{
		HTTPKeywordCampaignParams: params,
		KeywordSetIDs: func() pq.StringArray {
			ids := make([]string, len(params.KeywordSetIDs))
			for i, u := range params.KeywordSetIDs {
				ids[i] = u.String()
			}
			return pq.StringArray(ids)
		}(),
		AdHocKeywords: func() pq.StringArray {
			if params.AdHocKeywords == nil {
				return pq.StringArray{}
			}
			return pq.StringArray(*params.AdHocKeywords)
		}(),
		PersonaIDs: func() pq.StringArray {
			ids := make([]string, len(params.PersonaIDs))
			for i, u := range params.PersonaIDs {
				ids[i] = u.String()
			}
			return pq.StringArray(ids)
		}(),
		ProxyIDs: func() pq.StringArray {
			ids := []string{}
			if params.ProxyIDs != nil {
				ids = make([]string, len(*params.ProxyIDs))
				for i, u := range *params.ProxyIDs {
					ids[i] = u.String()
				}
			}
			return pq.StringArray(ids)
		}(),
		TargetHTTPPorts: func() pq.Int64Array {
			ports := []int64{}
			if params.TargetHTTPPorts != nil {
				ports = make([]int64, len(*params.TargetHTTPPorts))
				for i, p := range *params.TargetHTTPPorts {
					ports[i] = int64(p)
				}
			}
			return pq.Int64Array(ports)
		}(),
	}

	_, err := exec.NamedExecContext(ctx, query, &arg)
	return err
}

func (s *campaignStorePostgres) GetHTTPKeywordParams(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.HTTPKeywordCampaignParams, error) {
	// Temporary struct for scanning array types
	type httpParamsScan struct {
		models.HTTPKeywordCampaignParams
		ScannedKeywordSetIDs   pq.StringArray `db:"keyword_set_ids"`
		ScannedAdHocKeywords   pq.StringArray `db:"ad_hoc_keywords"`
		ScannedPersonaIDs      pq.StringArray `db:"persona_ids"`
		ScannedProxyIDs        pq.StringArray `db:"proxy_ids"`
		ScannedTargetHTTPPorts pq.Int64Array  `db:"target_http_ports"`
	}
	scanTarget := &httpParamsScan{}

	query := `SELECT campaign_id, source_campaign_id, source_type, keyword_set_ids, ad_hoc_keywords, persona_ids, proxy_ids, proxy_pool_id, proxy_selection_strategy, rotation_interval_seconds, processing_speed_per_minute, batch_size, retry_attempts, target_http_ports, last_processed_domain_name, metadata
	             FROM http_keyword_campaign_params WHERE campaign_id = $1`
	err := exec.GetContext(ctx, scanTarget, query, campaignID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, store.ErrNotFound
		}
		return nil, fmt.Errorf("GetHTTPKeywordParams: db query error: %w", err)
	}

	// Create a new result object
	result := &models.HTTPKeywordCampaignParams{
		CampaignID:               scanTarget.CampaignID,
		SourceCampaignID:         scanTarget.SourceCampaignID,
		SourceType:               scanTarget.SourceType,
		ProxyPoolID:              scanTarget.ProxyPoolID,
		ProxySelectionStrategy:   scanTarget.ProxySelectionStrategy,
		RotationIntervalSeconds:  scanTarget.RotationIntervalSeconds,
		ProcessingSpeedPerMinute: scanTarget.ProcessingSpeedPerMinute,
		BatchSize:                scanTarget.BatchSize,
		RetryAttempts:            scanTarget.RetryAttempts,
		LastProcessedDomainName:  scanTarget.LastProcessedDomainName,
		Metadata:                 scanTarget.Metadata,
	}

	// Convert KeywordSetIDs
	result.KeywordSetIDs = make([]uuid.UUID, 0, len(scanTarget.ScannedKeywordSetIDs))
	for _, idStr := range scanTarget.ScannedKeywordSetIDs {
		if id, err := uuid.Parse(idStr); err == nil {
			result.KeywordSetIDs = append(result.KeywordSetIDs, id)
		}
	}

	// Convert AdHocKeywords
	if len(scanTarget.ScannedAdHocKeywords) > 0 {
		adHocKeywords := make([]string, len(scanTarget.ScannedAdHocKeywords))
		copy(adHocKeywords, scanTarget.ScannedAdHocKeywords)
		result.AdHocKeywords = &adHocKeywords
	}

	// Convert PersonaIDs
	result.PersonaIDs = make([]uuid.UUID, 0, len(scanTarget.ScannedPersonaIDs))
	for _, idStr := range scanTarget.ScannedPersonaIDs {
		if id, err := uuid.Parse(idStr); err == nil {
			result.PersonaIDs = append(result.PersonaIDs, id)
		}
	}

	// Convert ProxyIDs
	if len(scanTarget.ScannedProxyIDs) > 0 {
		proxyIDs := make([]uuid.UUID, 0, len(scanTarget.ScannedProxyIDs))
		for _, idStr := range scanTarget.ScannedProxyIDs {
			if id, err := uuid.Parse(idStr); err == nil {
				proxyIDs = append(proxyIDs, id)
			}
		}
		result.ProxyIDs = &proxyIDs
	}

	// Convert TargetHTTPPorts
	if len(scanTarget.ScannedTargetHTTPPorts) > 0 {
		targetPorts := make([]int, len(scanTarget.ScannedTargetHTTPPorts))
		for i, p := range scanTarget.ScannedTargetHTTPPorts {
			targetPorts[i] = int(p)
		}
		result.TargetHTTPPorts = &targetPorts
	}

	return result, nil
}

func (s *campaignStorePostgres) CreateHTTPKeywordResults(ctx context.Context, exec store.Querier, results []*models.HTTPKeywordResult) error {
	if len(results) == 0 {
		return nil
	}

	// Add timeout to context if not present
	timeoutCtx, cancel := WithTimeout(ctx, DefaultTimeout)
	defer cancel()

	// Extract campaign ID for logging
	var campaignID string
	if len(results) > 0 && results[0] != nil {
		campaignID = results[0].HTTPKeywordCampaignID.String()
	}

	// Log database metrics before operation
	if db, ok := exec.(*sqlx.DB); ok {
		metrics := monitoring.NewDatabaseMetrics(db)
		metrics.LogConnectionPoolStats("CreateHTTPKeywordResults_start", campaignID)
	}

	query := `INSERT INTO http_keyword_results
		      (id, http_keyword_campaign_id, dns_result_id, domain_name, validation_status, business_status, http_status_code, response_headers, page_title, extracted_content_snippet, found_keywords_from_sets, found_ad_hoc_keywords, content_hash, validated_by_persona_id, used_proxy_id, attempts, last_checked_at, created_at)
		      VALUES (:id, :http_keyword_campaign_id, :dns_result_id, :domain_name, :validation_status, :business_status, :http_status_code, :response_headers, :page_title, :extracted_content_snippet, :found_keywords_from_sets, :found_ad_hoc_keywords, :content_hash, :validated_by_persona_id, :used_proxy_id, :attempts, :last_checked_at, :created_at)
		      ON CONFLICT (http_keyword_campaign_id, domain_name) DO UPDATE SET
		          validation_status = EXCLUDED.validation_status, business_status = EXCLUDED.business_status, http_status_code = EXCLUDED.http_status_code,
		          response_headers = EXCLUDED.response_headers, page_title = EXCLUDED.page_title,
		          extracted_content_snippet = EXCLUDED.extracted_content_snippet, found_keywords_from_sets = EXCLUDED.found_keywords_from_sets,
		          found_ad_hoc_keywords = EXCLUDED.found_ad_hoc_keywords, content_hash = EXCLUDED.content_hash,
		          validated_by_persona_id = EXCLUDED.validated_by_persona_id, used_proxy_id = EXCLUDED.used_proxy_id,
		          attempts = http_keyword_results.attempts + 1, last_checked_at = EXCLUDED.last_checked_at, created_at = EXCLUDED.created_at`

	monitoring.LogPreparedStatementLifecycle("CreateHTTPKeywordResults", campaignID, query, "prepare_start", nil)

	// Use SafePreparedStatement to ensure proper cleanup
	err := s.stmtManager.SafePreparedStatement(timeoutCtx, exec, query, "CreateHTTPKeywordResults", func(stmt *sqlx.NamedStmt) error {
		monitoring.LogPreparedStatementLifecycle("CreateHTTPKeywordResults", campaignID, query, "prepare_success", nil)

		for _, result := range results {
			if result.ID == uuid.Nil {
				result.ID = uuid.New()
			}
			if result.LastCheckedAt == nil || result.LastCheckedAt.IsZero() {
				now := time.Now().UTC()
				result.LastCheckedAt = &now
			}

			dbRes := *result
			if dbRes.CreatedAt.IsZero() {
				dbRes.CreatedAt = time.Now().UTC()
			}
			_, err := stmt.ExecContext(timeoutCtx, &dbRes)
			if err != nil {
				monitoring.LogPreparedStatementLifecycle("CreateHTTPKeywordResults", campaignID, query, "exec_failed", err)
				return fmt.Errorf("failed to insert HTTP keyword result for domain %s: %w", result.DomainName, err)
			}
		}

		monitoring.LogPreparedStatementLifecycle("CreateHTTPKeywordResults", campaignID, query, "complete", nil)
		return nil
	})

	if err != nil {
		monitoring.LogPreparedStatementLifecycle("CreateHTTPKeywordResults", campaignID, query, "prepare_failed", err)
		return err
	}

	// Log final database metrics
	if db, ok := exec.(*sqlx.DB); ok {
		metrics := monitoring.NewDatabaseMetrics(db)
		metrics.LogConnectionPoolStats("CreateHTTPKeywordResults_end", campaignID)
	}

	return nil
}

func (s *campaignStorePostgres) GetHTTPKeywordResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.HTTPKeywordResult, error) {
	results := []*models.HTTPKeywordResult{}
	baseQuery := `SELECT id, http_keyword_campaign_id, dns_result_id, domain_name, validation_status, http_status_code, response_headers, page_title, extracted_content_snippet, found_keywords_from_sets, found_ad_hoc_keywords, content_hash, validated_by_persona_id, used_proxy_id, attempts, last_checked_at, created_at
		                FROM http_keyword_results WHERE http_keyword_campaign_id = ?`
	args := []interface{}{campaignID}
	finalQuery := baseQuery

	if filter.ValidationStatus != "" {
		finalQuery += " AND validation_status = ?"
		args = append(args, filter.ValidationStatus)
	}
	finalQuery += " ORDER BY domain_name ASC"
	if filter.Limit > 0 {
		finalQuery += " LIMIT ?"
		args = append(args, filter.Limit)
	}
	if filter.Offset > 0 {
		finalQuery += " OFFSET ?"
		args = append(args, filter.Offset)
	}

	var reboundQuery string
	switch q := exec.(type) {
	case *sqlx.DB:
		reboundQuery = q.Rebind(finalQuery)
	case *sqlx.Tx:
		reboundQuery = q.Rebind(finalQuery)
	default:
		return nil, fmt.Errorf("unexpected Querier type: %T", exec)
	}

	err := exec.SelectContext(ctx, &results, reboundQuery, args...)
	return results, err
}

func (s *campaignStorePostgres) GetDomainsForHTTPValidation(ctx context.Context, exec store.Querier, httpKeywordCampaignID uuid.UUID, sourceCampaignID uuid.UUID, limit int, lastDomainName string) ([]*models.DNSValidationResult, error) {
	dnsResults := []*models.DNSValidationResult{}
	query := `
	       SELECT dvr.id, dvr.dns_campaign_id, dvr.generated_domain_id, dvr.domain_name, dvr.validation_status,
	              dvr.dns_records, dvr.validated_by_persona_id, dvr.attempts, dvr.last_checked_at, dvr.created_at
	       FROM dns_validation_results dvr
	       LEFT JOIN http_keyword_results hkr ON dvr.domain_name = hkr.domain_name AND hkr.http_keyword_campaign_id = $1
	       WHERE dvr.dns_campaign_id = $2 AND dvr.business_status = 'valid_dns'
	         AND dvr.domain_name > $3
	         AND (hkr.id IS NULL OR hkr.business_status NOT IN ('lead_valid', 'http_valid_no_keywords'))
	       ORDER BY dvr.domain_name ASC LIMIT $4`
	err := exec.SelectContext(ctx, &dnsResults, query, httpKeywordCampaignID, sourceCampaignID, lastDomainName, limit)
	return dnsResults, err
}

// --- SI-002 State Event Store Implementation --- //

// CreateStateEvent creates a new state event with automatic sequence numbering
func (s *campaignStorePostgres) CreateStateEvent(ctx context.Context, exec store.Querier, event *models.StateChangeEvent) (*models.StateEventResult, error) {
	// Use the database function for atomic sequence numbering
	query := `SELECT * FROM create_campaign_state_event($1, $2, $3, $4, $5, $6, $7, $8, $9)`
	
	var result struct {
		EventID        uuid.UUID `db:"event_id"`
		SequenceNumber int64     `db:"sequence_number"`
		Success        bool      `db:"success"`
		ErrorMessage   sql.NullString `db:"error_message"`
	}
	
	// Convert event context to JSONB
	var eventData *json.RawMessage
	if event.Context != nil {
		eventData = event.Context
	} else {
		emptyJSON := json.RawMessage("{}")
		eventData = &emptyJSON
	}
	
	// Convert actor and reason to proper strings
	var actor, reason string
	if event.Actor.Valid {
		actor = event.Actor.String
	} else {
		actor = "system"
	}
	if event.Reason.Valid {
		reason = event.Reason.String
	}
	
	err := exec.GetContext(ctx, &result, query,
		event.CampaignID,
		string(event.EventType),
		string(event.PreviousState), // source_state
		string(event.NewState),      // target_state
		reason,
		actor,
		eventData,
		json.RawMessage("{}"), // operation_context
		nil,                   // correlation_id
	)
	
	if err != nil {
		return nil, fmt.Errorf("failed to create state event: %w", err)
	}
	
	stateResult := &models.StateEventResult{
		EventID:        result.EventID,
		SequenceNumber: result.SequenceNumber,
		Success:        result.Success,
		CreatedAt:      time.Now().UTC(),
	}
	
	if result.ErrorMessage.Valid {
		stateResult.ErrorMessage = result.ErrorMessage.String
		stateResult.Success = false
	}
	
	return stateResult, nil
}

// GetStateEventsByCampaign retrieves state events for a campaign with pagination
func (s *campaignStorePostgres) GetStateEventsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, fromSequence int64, limit int) ([]*models.StateChangeEvent, error) {
	query := `SELECT * FROM get_campaign_state_events_for_replay($1, $2, $3, $4)`
	
	type eventRow struct {
		ID               uuid.UUID        `db:"id"`
		EventType        string           `db:"event_type"`
		SourceState      sql.NullString   `db:"source_state"`
		TargetState      sql.NullString   `db:"target_state"`
		Reason           sql.NullString   `db:"reason"`
		TriggeredBy      string           `db:"triggered_by"`
		EventData        *json.RawMessage `db:"event_data"`
		OperationContext *json.RawMessage `db:"operation_context"`
		SequenceNumber   int64            `db:"sequence_number"`
		OccurredAt       time.Time        `db:"occurred_at"`
		CorrelationID    uuid.NullUUID    `db:"correlation_id"`
	}
	
	var rows []eventRow
	err := exec.SelectContext(ctx, &rows, query, campaignID, fromSequence, nil, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get state events: %w", err)
	}
	
	events := make([]*models.StateChangeEvent, 0, len(rows))
	for _, row := range rows {
		event := &models.StateChangeEvent{
			ID:               row.ID,
			CampaignID:       campaignID,
			EventType:        models.StateEventTypeEnum(row.EventType),
			EventSource:      models.StateEventSourceStateCoordinator, // Default source
			Reason:           row.Reason,
			Actor:            sql.NullString{String: row.TriggeredBy, Valid: true},
			Context:          row.EventData,
			ValidationPassed: true, // Events from database are considered validated
			Timestamp:        row.OccurredAt,
			SequenceNumber:   row.SequenceNumber,
			CreatedAt:        row.OccurredAt,
		}
		
		// Set states based on what's available
		if row.SourceState.Valid {
			event.PreviousState = models.CampaignStatusEnum(row.SourceState.String)
		}
		if row.TargetState.Valid {
			event.NewState = models.CampaignStatusEnum(row.TargetState.String)
		}
		
		events = append(events, event)
	}
	
	return events, nil
}

// CreateStateTransition creates a state transition record
func (s *campaignStorePostgres) CreateStateTransition(ctx context.Context, exec store.Querier, transition *models.StateTransitionEvent) error {
	query := `INSERT INTO campaign_state_transitions
		(id, state_event_id, campaign_id, from_state, to_state, is_valid_transition,
		 validation_errors, transition_metadata, triggered_by, initiated_at, completed_at, duration_ms)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`
	
	// Use the correct state event ID to satisfy the foreign key constraint
	stateEventID := transition.StateEventID
	
	// Calculate completed time and duration
	var completedAt sql.NullTime
	var durationMs sql.NullInt32
	
	if transition.ProcessingTime > 0 {
		completedAt = sql.NullTime{Time: transition.Timestamp.Add(time.Duration(transition.ProcessingTime) * time.Millisecond), Valid: true}
		durationMs = sql.NullInt32{Int32: int32(transition.ProcessingTime), Valid: true}
	}
	
	// Convert validation errors to JSONB
	validationErrors := json.RawMessage("[]")
	if transition.Metadata != nil {
		validationErrors = *transition.Metadata
	}
	
	_, err := exec.ExecContext(ctx, query,
		transition.ID,
		stateEventID,
		transition.CampaignID,
		string(transition.FromState),
		string(transition.ToState),
		transition.ValidationResult,
		validationErrors,
		transition.Metadata,
		transition.TriggerActor.String,
		transition.Timestamp,
		completedAt,
		durationMs,
	)
	
	return err
}

// GetStateTransitionsByCampaign retrieves state transitions for a campaign
func (s *campaignStorePostgres) GetStateTransitionsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit int) ([]*models.StateTransitionEvent, error) {
	query := `SELECT id, state_event_id, campaign_id, from_state, to_state, is_valid_transition,
		             validation_errors, transition_metadata, triggered_by, initiated_at, completed_at, duration_ms
		      FROM campaign_state_transitions
		      WHERE campaign_id = $1
		      ORDER BY initiated_at DESC
		      LIMIT $2`
	
	type transitionRow struct {
		ID                 uuid.UUID        `db:"id"`
		StateEventID       uuid.UUID        `db:"state_event_id"`
		CampaignID         uuid.UUID        `db:"campaign_id"`
		FromState          string           `db:"from_state"`
		ToState            string           `db:"to_state"`
		IsValidTransition  bool             `db:"is_valid_transition"`
		ValidationErrors   *json.RawMessage `db:"validation_errors"`
		TransitionMetadata *json.RawMessage `db:"transition_metadata"`
		TriggeredBy        string           `db:"triggered_by"`
		InitiatedAt        time.Time        `db:"initiated_at"`
		CompletedAt        sql.NullTime     `db:"completed_at"`
		DurationMs         sql.NullInt32    `db:"duration_ms"`
	}
	
	var rows []transitionRow
	err := exec.SelectContext(ctx, &rows, query, campaignID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get state transitions: %w", err)
	}
	
	transitions := make([]*models.StateTransitionEvent, 0, len(rows))
	for _, row := range rows {
		transition := &models.StateTransitionEvent{
			ID:               row.ID,
			CampaignID:       row.CampaignID,
			TransitionID:     row.StateEventID,
			FromState:        models.CampaignStatusEnum(row.FromState),
			ToState:          models.CampaignStatusEnum(row.ToState),
			TriggerSource:    models.StateEventSourceStateCoordinator,
			TriggerActor:     sql.NullString{String: row.TriggeredBy, Valid: true},
			ValidationResult: row.IsValidTransition,
			RetryCount:       0,
			Metadata:         row.TransitionMetadata,
			Timestamp:        row.InitiatedAt,
			CreatedAt:        row.InitiatedAt,
		}
		
		if row.DurationMs.Valid {
			transition.ProcessingTime = int64(row.DurationMs.Int32)
		}
		
		transitions = append(transitions, transition)
	}
	
	return transitions, nil
}

// CreateStateSnapshot creates a state snapshot
func (s *campaignStorePostgres) CreateStateSnapshot(ctx context.Context, exec store.Querier, snapshot *models.StateSnapshotEvent) error {
	query := `SELECT * FROM create_campaign_state_snapshot($1, $2, $3, $4, $5)`
	
	var result struct {
		SnapshotID   uuid.UUID      `db:"snapshot_id"`
		Success      bool           `db:"success"`
		ErrorMessage sql.NullString `db:"error_message"`
	}
	
	err := exec.GetContext(ctx, &result, query,
		snapshot.CampaignID,
		string(snapshot.CurrentState),
		snapshot.StateData,
		snapshot.LastEventSequence,
		snapshot.SnapshotMetadata,
	)
	
	if err != nil {
		return fmt.Errorf("failed to create state snapshot: %w", err)
	}
	
	if !result.Success && result.ErrorMessage.Valid {
		return fmt.Errorf("snapshot creation failed: %s", result.ErrorMessage.String)
	}
	
	// Update the snapshot ID with the returned value
	snapshot.ID = result.SnapshotID
	
	return nil
}

// GetLatestStateSnapshot retrieves the latest valid snapshot for a campaign
func (s *campaignStorePostgres) GetLatestStateSnapshot(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.StateSnapshotEvent, error) {
	query := `SELECT * FROM get_latest_campaign_state_snapshot($1)`
	
	type snapshotRow struct {
		ID                uuid.UUID        `db:"id"`
		CurrentState      string           `db:"current_state"`
		StateData         *json.RawMessage `db:"state_data"`
		LastEventSequence int64            `db:"last_event_sequence"`
		SnapshotMetadata  *json.RawMessage `db:"snapshot_metadata"`
		CreatedAt         time.Time        `db:"created_at"`
		Checksum          string           `db:"checksum"`
	}
	
	var row snapshotRow
	err := exec.GetContext(ctx, &row, query, campaignID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, store.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get latest state snapshot: %w", err)
	}
	
	snapshot := &models.StateSnapshotEvent{
		ID:                row.ID,
		CampaignID:        campaignID,
		CurrentState:      models.CampaignStatusEnum(row.CurrentState),
		StateData:         row.StateData,
		LastEventSequence: row.LastEventSequence,
		SnapshotMetadata:  row.SnapshotMetadata,
		Checksum:          row.Checksum,
		IsValid:           true,
		CreatedAt:         row.CreatedAt,
	}
	
	return snapshot, nil
}

// ReplayStateEvents retrieves state events for replay from a specific sequence (exclusive)
func (s *campaignStorePostgres) ReplayStateEvents(ctx context.Context, exec store.Querier, campaignID uuid.UUID, fromSequence int64) ([]*models.StateChangeEvent, error) {
	// Replay should be exclusive - get events AFTER the specified sequence
	// Use fromSequence+1 to make it exclusive while reusing GetStateEventsByCampaign
	return s.GetStateEventsByCampaign(ctx, exec, campaignID, fromSequence+1, 10000) // Large limit for replay
}

// ValidateStateEventIntegrity validates the integrity of state events for a campaign
func (s *campaignStorePostgres) ValidateStateEventIntegrity(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.StateIntegrityResult, error) {
	integrityResult := models.NewStateIntegrityResult(campaignID, true)
	
	// Check total events and sequence continuity
	query := `SELECT COUNT(*) as count, COALESCE(MAX(sequence_number), 0) as max_sequence, COALESCE(MIN(sequence_number), 0) as min_sequence
		      FROM campaign_state_events
		      WHERE campaign_id = $1`
	
	var statsResult struct {
		Count       int64 `db:"count"`
		MaxSequence int64 `db:"max_sequence"`
		MinSequence int64 `db:"min_sequence"`
	}
	
	err := exec.GetContext(ctx, &statsResult, query, campaignID)
	
	if err != nil {
		integrityResult.IsValid = false
		integrityResult.ValidationErrors = append(integrityResult.ValidationErrors, fmt.Sprintf("Failed to query event statistics: %v", err))
		return integrityResult, nil
	}
	
	integrityResult.TotalEvents = statsResult.Count
	integrityResult.LastSequence = statsResult.MaxSequence
	
	// Check for sequence gaps
	if statsResult.Count > 0 && statsResult.MaxSequence-statsResult.MinSequence+1 != statsResult.Count {
		integrityResult.IsValid = false
		integrityResult.ValidationErrors = append(integrityResult.ValidationErrors, "Sequence gaps detected")
		
		// Find missing sequences
		gapQuery := `SELECT generate_series($1, $2) AS expected_seq
		             EXCEPT
		             SELECT sequence_number FROM campaign_state_events WHERE campaign_id = $3
		             ORDER BY expected_seq`
		
		var missingSeqs []int64
		err = exec.SelectContext(ctx, &missingSeqs, gapQuery, statsResult.MinSequence, statsResult.MaxSequence, campaignID)
		if err == nil {
			integrityResult.MissingSequences = missingSeqs
		}
	}
	
	// Add validation checks
	integrityResult.ValidationChecks = append(integrityResult.ValidationChecks, models.StateIntegrityCheck{
		CheckType:   "sequence_continuity",
		CheckPassed: len(integrityResult.MissingSequences) == 0,
		CheckedAt:   time.Now().UTC(),
	})
	
	integrityResult.ValidationChecks = append(integrityResult.ValidationChecks, models.StateIntegrityCheck{
		CheckType:   "total_events",
		CheckPassed: statsResult.Count >= 0,
		CheckedAt:   time.Now().UTC(),
	})
	
	return integrityResult, nil
}

var _ store.CampaignStore = (*campaignStorePostgres)(nil)
