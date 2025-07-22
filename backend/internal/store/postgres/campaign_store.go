// File: backend/internal/store/postgres/campaign_store.go
package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings" // For ListCampaigns dynamic query
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/utils"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// campaignStorePostgres implements the store.CampaignStore interface for PostgreSQL
type campaignStorePostgres struct {
	db *sqlx.DB
}

// NewCampaignStorePostgres creates a new CampaignStore for PostgreSQL
func NewCampaignStorePostgres(db *sqlx.DB) store.CampaignStore {
	return &campaignStorePostgres{db: db}
}

// BeginTxx starts a new transaction.
func (s *campaignStorePostgres) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return s.db.BeginTxx(ctx, opts)
}

// --- Campaign CRUD --- //

func (s *campaignStorePostgres) CreateCampaign(ctx context.Context, exec store.Querier, campaign *models.Campaign) error {
	query := `INSERT INTO campaigns (id, name, current_phase, phase_status, user_id, created_at, updated_at,
	                                                        started_at, completed_at, progress_percentage, total_items, processed_items, successful_items, failed_items, metadata, error_message, business_status)
	                         VALUES (:id, :name, :current_phase, :phase_status, :user_id, :created_at, :updated_at,
	                                         :started_at, :completed_at, :progress_percentage, :total_items, :processed_items, :successful_items, :failed_items, :metadata, :error_message, :business_status)`
	_, err := exec.NamedExecContext(ctx, query, campaign)
	return err
}

func (s *campaignStorePostgres) GetCampaignByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.Campaign, error) {
	campaign := &models.Campaign{}
	query := `SELECT id, name, current_phase, phase_status, user_id, created_at, updated_at,
	                                        started_at, completed_at, progress_percentage, total_items, processed_items, successful_items, failed_items, metadata, error_message, business_status
	                             FROM campaigns WHERE id = $1`
	err := exec.GetContext(ctx, campaign, query, id)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return campaign, err
}

func (s *campaignStorePostgres) UpdateCampaign(ctx context.Context, exec store.Querier, campaign *models.Campaign) error {
	query := `UPDATE campaigns SET
	                               name = :name, current_phase = :current_phase, phase_status = :phase_status, user_id = :user_id,
	                               updated_at = :updated_at, started_at = :started_at, completed_at = :completed_at,
	                               progress_percentage = :progress_percentage, total_items = :total_items,
	                               processed_items = :processed_items, successful_items = :successful_items, failed_items = :failed_items, metadata = :metadata, error_message = :error_message,
	                               business_status = :business_status
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

func (s *campaignStorePostgres) DeleteCampaign(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	// First check if campaign exists
	var exists bool
	checkQuery := `SELECT EXISTS(SELECT 1 FROM campaigns WHERE id = $1)`
	err := exec.GetContext(ctx, &exists, checkQuery, id)
	if err != nil {
		return err
	}
	if !exists {
		return store.ErrNotFound
	}

	// Delete related records first to avoid foreign key constraint violations
	// Order matters: delete leaf nodes first, then parent nodes

	// 1. Delete HTTP keyword validation results (no foreign dependencies)
	_, err = exec.ExecContext(ctx, `DELETE FROM http_keyword_results WHERE http_keyword_campaign_id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete HTTP keyword results: %w", err)
	}

	// 2. Delete DNS validation results (no foreign dependencies)
	_, err = exec.ExecContext(ctx, `DELETE FROM dns_validation_results WHERE dns_campaign_id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete DNS validation results: %w", err)
	}

	// 3. Delete generated domains (no foreign dependencies)
	_, err = exec.ExecContext(ctx, `DELETE FROM generated_domains WHERE domain_generation_campaign_id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete generated domains: %w", err)
	}

	// 4. Delete campaign jobs
	_, err = exec.ExecContext(ctx, `DELETE FROM campaign_jobs WHERE campaign_id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete campaign jobs: %w", err)
	}

	// 5. Delete campaign parameter tables
	_, err = exec.ExecContext(ctx, `DELETE FROM http_keyword_campaign_params WHERE campaign_id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete HTTP keyword campaign params: %w", err)
	}

	_, err = exec.ExecContext(ctx, `DELETE FROM dns_validation_params WHERE campaign_id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete DNS validation params: %w", err)
	}

	// Get domain generation params before deletion to calculate pattern hash for cleanup
	var patternHash string
	domainGenParams, getParamsErr := s.GetDomainGenerationParams(ctx, exec, id)
	if getParamsErr == nil && domainGenParams != nil {
		// Calculate pattern hash for cleanup
		tempParams := models.DomainGenerationCampaignParams{
			PatternType:    domainGenParams.PatternType,
			VariableLength: domainGenParams.VariableLength,
			CharacterSet:   domainGenParams.CharacterSet,
			ConstantString: domainGenParams.ConstantString,
			TLD:            domainGenParams.TLD,
		}
		// Simple hash calculation (matches domain generation service approach)
		patternHash = fmt.Sprintf("%x",
			fmt.Sprintf("%s|%d|%s|%s|%s",
				tempParams.PatternType,
				tempParams.VariableLength,
				tempParams.CharacterSet,
				func() string {
					if tempParams.ConstantString != nil {
						return *tempParams.ConstantString
					} else {
						return ""
					}
				}(),
				tempParams.TLD))
	}

	_, err = exec.ExecContext(ctx, `DELETE FROM domain_generation_campaign_params WHERE campaign_id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete domain generation params: %w", err)
	}

	// 6. Finally, delete the campaign itself
	result, err := exec.ExecContext(ctx, `DELETE FROM campaigns WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete campaign: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}

	// 7. Clean up unused pattern config state if this was the last campaign using this pattern
	if patternHash != "" {
		if cleanupErr := s.CleanupUnusedPatternConfigState(ctx, exec, patternHash); cleanupErr != nil {
			log.Printf("Warning: failed to cleanup pattern config state %s: %v", patternHash, cleanupErr)
			// Don't fail the deletion for cleanup errors, just log
		}
	}

	return err
}

func (s *campaignStorePostgres) ListCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) ([]*models.Campaign, error) {
	baseQuery := `SELECT id, name, current_phase, phase_status, user_id, created_at, updated_at,
	                                        started_at, completed_at, progress_percentage, total_items, processed_items, successful_items, failed_items, metadata, error_message, business_status
	                             FROM campaigns`
	args := []interface{}{}
	conditions := []string{}

	// Type and Status fields removed - using phase-based filtering instead
	if filter.UserID != "" {
		conditions = append(conditions, "user_id = ?")
		args = append(args, filter.UserID)
	}

	finalQuery := baseQuery
	if len(conditions) > 0 {
		finalQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	if filter.SortBy != "" {
		validSortCols := map[string]string{"created_at": "created_at", "name": "name", "phase_status": "phase_status", "updated_at": "updated_at"}
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

	if filter.CurrentPhase != nil {
		conditions = append(conditions, "current_phase = ?")
		args = append(args, *filter.CurrentPhase)
	}
	if filter.PhaseStatus != nil {
		conditions = append(conditions, "phase_status = ?")
		args = append(args, *filter.PhaseStatus)
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

func (s *campaignStorePostgres) UpdateCampaignStatus(ctx context.Context, exec store.Querier, id uuid.UUID, status models.CampaignPhaseStatusEnum, errorMessage sql.NullString) error {
	// Use the store's database connection if no executor is provided
	if exec == nil {
		exec = s.db
	}

	query := `UPDATE campaigns SET phase_status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`
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

func (s *campaignStorePostgres) UpdateCampaignProgress(ctx context.Context, exec store.Querier, id uuid.UUID, processedItems, totalItems int64, progressPercentage float64) error {
	// First, update the progress and set status to 'running' if it's not already completed or failed
	query := `UPDATE campaigns 
		SET processed_items = $1, 
			total_items = $2, 
			progress_percentage = $3,
			phase_status = CASE
				WHEN phase_status NOT IN ('completed', 'failed') THEN 'in_progress'
				ELSE phase_status
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
	query := `SELECT campaign_id, pattern_type, variable_length, character_set, constant_string, tld, num_domains_to_generate, total_possible_combinations, current_offset, created_at, updated_at
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

	// Use the store's database connection if no executor is provided
	if exec == nil {
		exec = s.db
	}

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
				updated_at = EXCLUDED.updated_at`
	_, err := exec.NamedExecContext(ctx, query, state)
	return err
}

// --- Generated Domains --- //

func (s *campaignStorePostgres) CreateGeneratedDomains(ctx context.Context, exec store.Querier, domains []*models.GeneratedDomain) error {
	if len(domains) == 0 {
		return nil
	}
	stmt, err := exec.PrepareNamedContext(ctx, `INSERT INTO generated_domains
		(id, domain_generation_campaign_id, domain_name, source_keyword, source_pattern, tld, offset_index, generated_at, created_at, dns_status, http_status, http_title, http_keywords, lead_score)
		VALUES (:id, :domain_generation_campaign_id, :domain_name, :source_keyword, :source_pattern, :tld, :offset_index, :generated_at, :created_at, :dns_status, :http_status, :http_title, :http_keywords, :lead_score)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

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
		// ROBUST STATUS INITIALIZATION: Ensure all domains have proper initial status values
		if domain.DNSStatus == nil {
			pending := models.DomainDNSStatusPending
			domain.DNSStatus = &pending
			log.Printf("DEBUG [CreateGeneratedDomains]: Initialized DNS status to 'pending' for domain %s", domain.DomainName)
		}
		if domain.HTTPStatus == nil {
			pending := models.DomainHTTPStatusPending
			domain.HTTPStatus = &pending
			log.Printf("DEBUG [CreateGeneratedDomains]: Initialized HTTP status to 'pending' for domain %s", domain.DomainName)
		}
		if !domain.LeadScore.Valid {
			domain.LeadScore = sql.NullFloat64{Float64: 0.0, Valid: true}
			log.Printf("DEBUG [CreateGeneratedDomains]: Initialized lead score to 0.0 for domain %s", domain.DomainName)
		}
		_, err := stmt.ExecContext(ctx, domain)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *campaignStorePostgres) GetGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit int, lastOffsetIndex int64) ([]*models.GeneratedDomain, error) {
	domains := []*models.GeneratedDomain{}
	// lastOffsetIndex = -1 can indicate to fetch the first page
	query := `SELECT id, domain_generation_campaign_id, domain_name, source_keyword, source_pattern, tld, offset_index, generated_at, created_at, dns_status, dns_ip, http_status, http_status_code, http_title, http_keywords, lead_score, last_validated_at
			  FROM generated_domains
			  WHERE domain_generation_campaign_id = $1 AND offset_index >= $2
			  ORDER BY offset_index ASC
			  LIMIT $3`

	log.Printf("DEBUG [GetGeneratedDomainsByCampaign]: Query for campaign %s, limit %d, lastOffset %d", campaignID, limit, lastOffsetIndex)

	err := exec.SelectContext(ctx, &domains, query, campaignID, lastOffsetIndex, limit)

	log.Printf("DEBUG [GetGeneratedDomainsByCampaign]: Found %d domains for campaign %s", len(domains), campaignID)
	if len(domains) > 0 {
		log.Printf("DEBUG [GetGeneratedDomainsByCampaign]: First domain: %s (DNS: %v, HTTP: %v)",
			domains[0].DomainName, domains[0].DNSStatus, domains[0].HTTPStatus)
	}

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
	// Use the store's database connection if no executor is provided
	if exec == nil {
		exec = s.db
	}

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
	stmt, err := exec.PrepareNamedContext(ctx, `INSERT INTO dns_validation_results
	       (id, dns_campaign_id, generated_domain_id, domain_name, validation_status, business_status, dns_records, validated_by_persona_id, attempts, last_checked_at, created_at)
	       VALUES (:id, :dns_campaign_id, :generated_domain_id, :domain_name, :validation_status, :business_status, :dns_records, :validated_by_persona_id, :attempts, :last_checked_at, :created_at)
	       ON CONFLICT (dns_campaign_id, domain_name) DO UPDATE SET
	           validation_status = EXCLUDED.validation_status, business_status = EXCLUDED.business_status, dns_records = EXCLUDED.dns_records,
	           validated_by_persona_id = EXCLUDED.validated_by_persona_id, attempts = dns_validation_results.attempts + 1,
	           last_checked_at = EXCLUDED.last_checked_at, created_at = EXCLUDED.created_at`)
	if err != nil {
		return err
	}
	defer stmt.Close()

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

		log.Printf("DEBUG [CreateDNSValidationResults]: Saving DNS result - Domain: %s, Status: %s, Business Status: %s",
			result.DomainName, result.ValidationStatus, func() string {
				if result.BusinessStatus != nil {
					return *result.BusinessStatus
				}
				return "nil"
			}())

		_, err := stmt.ExecContext(ctx, result)
		if err != nil {
			log.Printf("ERROR [CreateDNSValidationResults]: Failed to save DNS result for domain %s: %v", result.DomainName, err)
			return err
		}

		// UPDATE DOMAIN STATUS: Also update the generated_domains table with DNS status
		if result.GeneratedDomainID.Valid {
			updateDomainQuery := `UPDATE generated_domains SET
				dns_status = $1,
				last_validated_at = $2
				WHERE id = $3`

			var dnsStatus models.DomainDNSStatusEnum
			switch result.ValidationStatus {
			case "resolved":
				dnsStatus = models.DomainDNSStatusOK
			case "unresolved", "timeout":
				dnsStatus = models.DomainDNSStatusError
			default:
				dnsStatus = models.DomainDNSStatusPending
			}

			_, updateErr := exec.ExecContext(ctx, updateDomainQuery, dnsStatus, result.LastCheckedAt, result.GeneratedDomainID.UUID)
			if updateErr != nil {
				log.Printf("WARNING [CreateDNSValidationResults]: Failed to update domain DNS status for %s: %v", result.DomainName, updateErr)
			} else {
				log.Printf("DEBUG [CreateDNSValidationResults]: Updated domain DNS status to '%s' for %s", dnsStatus, result.DomainName)
			}
		}
	}
	return nil
}

func (s *campaignStorePostgres) DeleteDNSValidationResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int64, error) {
	query := `DELETE FROM dns_validation_results WHERE dns_campaign_id = $1`
	result, err := exec.ExecContext(ctx, query, campaignID)
	if err != nil {
		return 0, err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, err
	}
	return rowsAffected, nil
}

func (s *campaignStorePostgres) GetDNSValidationResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.DNSValidationResult, error) {
	results := []*models.DNSValidationResult{}
	baseQuery := `SELECT id, dns_campaign_id, generated_domain_id, domain_name, validation_status, dns_records, validated_by_persona_id, attempts, last_checked_at, created_at
		                FROM dns_validation_results WHERE dns_campaign_id = ?`

	qb := utils.NewQueryBuilder(baseQuery, campaignID).
		AddFilter("validation_status = ?", filter.ValidationStatus).
		AddOrdering("ORDER BY domain_name ASC").
		AddPagination(filter.Limit, filter.Offset)

	err := qb.ExecuteQuery(ctx, exec, &results)
	return results, err
}

func (s *campaignStorePostgres) CountDNSValidationResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, onlyValid bool) (int64, error) {
	query := `SELECT COUNT(*) FROM dns_validation_results WHERE dns_campaign_id = $1`
	args := []interface{}{campaignID}
	if onlyValid {
		query += " AND validation_status = $2 AND business_status = $3"
		args = append(args, "resolved", "valid_dns")
	}
	var count int64
	err := exec.GetContext(ctx, &count, query, args...)
	return count, err
}

func (s *campaignStorePostgres) GetDomainsForDNSValidation(ctx context.Context, exec store.Querier, dnsCampaignID uuid.UUID, sourceGenerationCampaignID uuid.UUID, limit int, lastOffsetIndex int64) ([]*models.GeneratedDomain, error) {
	domains := []*models.GeneratedDomain{}
	// Fetches generated domains that either don't have a DNS result for this campaign OR their result is not 'resolved' with 'valid_dns' business status
	// and their offset_index is greater than the last one processed.
	query := `
	       SELECT gd.id, gd.domain_generation_campaign_id, gd.domain_name, gd.source_keyword, gd.source_pattern, gd.tld, gd.offset_index, gd.generated_at, gd.created_at
	       FROM generated_domains gd
	       LEFT JOIN dns_validation_results dvr ON gd.id = dvr.generated_domain_id AND dvr.dns_campaign_id = $1
	       WHERE gd.domain_generation_campaign_id = $2
	         AND gd.offset_index > $3
	         AND (dvr.id IS NULL OR NOT (dvr.validation_status = 'resolved' AND dvr.business_status = 'valid_dns'))
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
	stmt, err := exec.PrepareNamedContext(ctx, `INSERT INTO http_keyword_results
		      (id, http_keyword_campaign_id, dns_result_id, domain_name, validation_status, http_status_code, response_headers, page_title, extracted_content_snippet, found_keywords_from_sets, found_ad_hoc_keywords, content_hash, validated_by_persona_id, used_proxy_id, attempts, last_checked_at, created_at)
		      VALUES (:id, :http_keyword_campaign_id, :dns_result_id, :domain_name, :validation_status, :http_status_code, :response_headers, :page_title, :extracted_content_snippet, :found_keywords_from_sets, :found_ad_hoc_keywords, :content_hash, :validated_by_persona_id, :used_proxy_id, :attempts, :last_checked_at, :created_at)
		      ON CONFLICT (http_keyword_campaign_id, domain_name) DO UPDATE SET
		          validation_status = EXCLUDED.validation_status, http_status_code = EXCLUDED.http_status_code,
		          response_headers = EXCLUDED.response_headers, page_title = EXCLUDED.page_title,
		          extracted_content_snippet = EXCLUDED.extracted_content_snippet, found_keywords_from_sets = EXCLUDED.found_keywords_from_sets,
		          found_ad_hoc_keywords = EXCLUDED.found_ad_hoc_keywords, content_hash = EXCLUDED.content_hash,
		          validated_by_persona_id = EXCLUDED.validated_by_persona_id, used_proxy_id = EXCLUDED.used_proxy_id,
		          attempts = http_keyword_results.attempts + 1, last_checked_at = EXCLUDED.last_checked_at, created_at = EXCLUDED.created_at`)
	if err != nil {
		return err
	}
	defer stmt.Close()

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
		_, err := stmt.ExecContext(ctx, &dbRes)
		if err != nil {
			return err
		}

		// UPDATE DOMAIN STATUS: Also update the generated_domains table with HTTP status
		// This mirrors the DNS validation pattern to ensure domain status consistency
		if result.DNSResultID.Valid {
			// First get the generated_domain_id from the DNS result
			var generatedDomainID uuid.UUID
			getDomainQuery := `SELECT generated_domain_id FROM dns_validation_results WHERE id = $1`
			err := exec.GetContext(ctx, &generatedDomainID, getDomainQuery, result.DNSResultID.UUID)
			if err != nil {
				log.Printf("WARNING [CreateHTTPKeywordResults]: Failed to get generated_domain_id for DNS result %s: %v", result.DNSResultID.UUID, err)
				continue
			}

			updateDomainQuery := `UPDATE generated_domains SET
				http_status = $1,
				last_validated_at = $2
				WHERE id = $3`

			var httpStatus models.DomainHTTPStatusEnum
			switch result.ValidationStatus {
			case "valid_http_response":
				httpStatus = models.DomainHTTPStatusOK
			case "invalid_http_response_error", "timeout", "cancelled_during_processing":
				httpStatus = models.DomainHTTPStatusError
			default:
				httpStatus = models.DomainHTTPStatusPending
			}

			_, updateErr := exec.ExecContext(ctx, updateDomainQuery, httpStatus, result.LastCheckedAt, generatedDomainID)
			if updateErr != nil {
				log.Printf("WARNING [CreateHTTPKeywordResults]: Failed to update domain HTTP status for %s: %v", result.DomainName, updateErr)
			} else {
				log.Printf("DEBUG [CreateHTTPKeywordResults]: Updated domain HTTP status to '%s' for %s", httpStatus, result.DomainName)
			}
		}
	}
	return nil
}

func (s *campaignStorePostgres) GetHTTPKeywordResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.HTTPKeywordResult, error) {
	results := []*models.HTTPKeywordResult{}
	baseQuery := `SELECT id, http_keyword_campaign_id, dns_result_id, domain_name, validation_status, http_status_code, response_headers, page_title, extracted_content_snippet, found_keywords_from_sets, found_ad_hoc_keywords, content_hash, validated_by_persona_id, used_proxy_id, attempts, last_checked_at, created_at
		                FROM http_keyword_results WHERE http_keyword_campaign_id = ?`

	qb := utils.NewQueryBuilder(baseQuery, campaignID).
		AddFilter("validation_status = ?", filter.ValidationStatus).
		AddOrdering("ORDER BY domain_name ASC").
		AddPagination(filter.Limit, filter.Offset)

	err := qb.ExecuteQuery(ctx, exec, &results)
	return results, err
}

func (s *campaignStorePostgres) GetDomainsForHTTPValidation(ctx context.Context, exec store.Querier, httpKeywordCampaignID uuid.UUID, sourceCampaignID uuid.UUID, limit int, lastDomainName string) ([]*models.DNSValidationResult, error) {
	dnsResults := []*models.DNSValidationResult{}
	query := `
	       SELECT dvr.id, dvr.dns_campaign_id, dvr.generated_domain_id, dvr.domain_name, dvr.validation_status,
	              dvr.dns_records, dvr.validated_by_persona_id, dvr.attempts, dvr.last_checked_at, dvr.created_at
	       FROM dns_validation_results dvr
	       LEFT JOIN http_keyword_results hkr ON dvr.domain_name = hkr.domain_name AND hkr.http_keyword_campaign_id = $1
	       WHERE dvr.dns_campaign_id = $2 AND dvr.validation_status = 'valid_dns'
	         AND dvr.domain_name > $3
	         AND (hkr.id IS NULL OR hkr.validation_status NOT IN ('lead_valid', 'http_valid_no_keywords'))
	       ORDER BY dvr.domain_name ASC LIMIT $4`
	err := exec.SelectContext(ctx, &dnsResults, query, httpKeywordCampaignID, sourceCampaignID, lastDomainName, limit)
	return dnsResults, err
}

// Helper method to count campaigns using the same pattern configuration
func (s *campaignStorePostgres) CountCampaignsWithPatternHash(ctx context.Context, exec store.Querier, patternHash string) (int, error) {
	// Use the store's database connection if no executor is provided
	if exec == nil {
		exec = s.db
	}

	query := `
		SELECT COUNT(DISTINCT dgcp.campaign_id)
		FROM domain_generation_campaign_params dgcp
		INNER JOIN campaigns c ON c.id = dgcp.campaign_id
		WHERE c.current_phase = 'generation'
		AND (
			-- Calculate hash from pattern params and compare
			md5(
				CONCAT(
					COALESCE(dgcp.pattern_type, ''), '|',
					COALESCE(dgcp.variable_length::text, ''), '|',
					COALESCE(dgcp.character_set, ''), '|',
					COALESCE(dgcp.constant_string, ''), '|',
					COALESCE(dgcp.tld, '')
				)
			) = $1
		)
	`

	var count int
	err := exec.GetContext(ctx, &count, query, patternHash)
	return count, err
}

// Helper method to clean up unused pattern config states
func (s *campaignStorePostgres) CleanupUnusedPatternConfigState(ctx context.Context, exec store.Querier, patternHash string) error {
	// Use the store's database connection if no executor is provided
	if exec == nil {
		exec = s.db
	}

	// Check if any campaigns are still using this pattern
	count, err := s.CountCampaignsWithPatternHash(ctx, exec, patternHash)
	if err != nil {
		return fmt.Errorf("failed to count campaigns with pattern hash %s: %w", patternHash, err)
	}

	// If no campaigns are using this pattern, delete the config state
	if count == 0 {
		query := `DELETE FROM domain_generation_config_states WHERE config_hash = $1`
		result, err := exec.ExecContext(ctx, query, patternHash)
		if err != nil {
			return fmt.Errorf("failed to delete unused pattern config state %s: %w", patternHash, err)
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected > 0 {
			log.Printf("Cleaned up unused pattern config state: %s", patternHash)
		}
	}

	return nil
}

var _ store.CampaignStore = (*campaignStorePostgres)(nil)
