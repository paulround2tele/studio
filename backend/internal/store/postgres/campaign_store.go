// File: backend/internal/store/postgres/campaign_store.go
package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings" // For ListCampaigns dynamic query
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"

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

// --- Scoring Profile CRUD (lightweight) --- //
// CANONICAL PATH (SCORING-PROFILES): All scoring profile persistence & association
// MUST flow through these methods. Do NOT create duplicate profile tables or
// alternative stores. Future enhancements (version diffs, soft delete, history
// snapshots) should extend these functions in-place to preserve a single
// authoritative persistence surface.

// CreateScoringProfile inserts a new scoring profile row.
func (s *campaignStorePostgres) CreateScoringProfile(ctx context.Context, exec store.Querier, sp *models.ScoringProfile) error {
	if sp.ID == uuid.Nil {
		sp.ID = uuid.New()
	}
	if sp.CreatedAt.IsZero() {
		sp.CreatedAt = time.Now().UTC()
	}
	if sp.UpdatedAt.IsZero() {
		sp.UpdatedAt = sp.CreatedAt
	}
	if sp.Version == 0 {
		sp.Version = 1
	}
	_, err := s.db.ExecContext(ctx, `INSERT INTO scoring_profiles (id,name,description,weights,version,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`, sp.ID, sp.Name, sp.Description, sp.Weights, sp.Version, sp.CreatedAt, sp.UpdatedAt)
	return err
}

// GetScoringProfile retrieves a scoring profile by id.
func (s *campaignStorePostgres) GetScoringProfile(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.ScoringProfile, error) {
	var row models.ScoringProfile
	if err := s.db.QueryRowContext(ctx, `SELECT id,name,description,weights,version,created_at,updated_at FROM scoring_profiles WHERE id=$1`, id).Scan(&row.ID, &row.Name, &row.Description, &row.Weights, &row.Version, &row.CreatedAt, &row.UpdatedAt); err != nil {
		return nil, err
	}
	return &row, nil
}

// ListScoringProfiles returns all profiles (bounded simple list).
func (s *campaignStorePostgres) ListScoringProfiles(ctx context.Context, exec store.Querier, limit int) ([]*models.ScoringProfile, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := s.db.QueryContext(ctx, `SELECT id,name,description,weights,version,created_at,updated_at FROM scoring_profiles ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]*models.ScoringProfile, 0, limit)
	for rows.Next() {
		var sp models.ScoringProfile
		if err := rows.Scan(&sp.ID, &sp.Name, &sp.Description, &sp.Weights, &sp.Version, &sp.CreatedAt, &sp.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, &sp)
	}
	return out, nil
}

// UpdateScoringProfile updates mutable fields.
func (s *campaignStorePostgres) UpdateScoringProfile(ctx context.Context, exec store.Querier, sp *models.ScoringProfile) error {
	sp.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx, `UPDATE scoring_profiles SET name=$2, description=$3, weights=$4, version=$5, updated_at=$6 WHERE id=$1`, sp.ID, sp.Name, sp.Description, sp.Weights, sp.Version, sp.UpdatedAt)
	return err
}

// DeleteScoringProfile deletes a profile (will cascade association rows due to FK ON DELETE CASCADE in migration if set).
func (s *campaignStorePostgres) DeleteScoringProfile(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM scoring_profiles WHERE id=$1`, id)
	return err
}

// AssociateCampaignScoringProfile links a campaign to a scoring profile (upsert semantics).
func (s *campaignStorePostgres) AssociateCampaignScoringProfile(ctx context.Context, exec store.Querier, campaignID, profileID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx, `INSERT INTO campaign_scoring_profile (campaign_id, scoring_profile_id) VALUES ($1,$2) ON CONFLICT (campaign_id) DO UPDATE SET scoring_profile_id=EXCLUDED.scoring_profile_id`, campaignID, profileID)
	return err
}

// BeginTxx starts a new transaction.
func (s *campaignStorePostgres) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return s.db.BeginTxx(ctx, opts)
}

// --- Campaign CRUD --- //

func (s *campaignStorePostgres) CreateCampaign(ctx context.Context, exec store.Querier, campaign *models.LeadGenerationCampaign) error {
	// Allow nil exec (common in tests) by defaulting to store DB
	if exec == nil {
		exec = s.db
	}
	// DEBUG: Log what we're about to store
	metadataStr := "NULL"
	if campaign.Metadata != nil {
		metadataStr = string(*campaign.Metadata)
	}
	log.Printf("DEBUG CreateCampaign: About to INSERT campaign %s with metadata: %s", campaign.ID, metadataStr)

	// ------------------------------------------------------------------
	// Defensive initialization of core identity & timestamp fields
	// If the handler didn't populate these, we must do it here so that:
	//   * We don't attempt to insert a zero UUID (causes duplicate key on retries)
	//   * We leverage sane CreatedAt/UpdatedAt values instead of 0001-01-01
	// ------------------------------------------------------------------
	if campaign.ID == uuid.Nil {
		campaign.ID = uuid.New()
		log.Printf("DEBUG CreateCampaign: Generated new campaign ID %s", campaign.ID)
	}
	// Normalize timestamps (let DB defaults apply only if we omit columns, but we currently include them)
	if campaign.CreatedAt.IsZero() {
		campaign.CreatedAt = time.Now().UTC()
	}
	if campaign.UpdatedAt.IsZero() {
		campaign.UpdatedAt = campaign.CreatedAt
	}

	// Ensure all required phase-centric fields are set
	if campaign.CampaignType == "" {
		campaign.CampaignType = "lead_generation"
	}
	if campaign.TotalPhases == 0 {
		campaign.TotalPhases = 4
	}
	if campaign.CompletedPhases == 0 {
		campaign.CompletedPhases = 0
	}
	if campaign.CurrentPhase == nil {
		currentPhase := models.PhaseTypeDomainGeneration
		campaign.CurrentPhase = &currentPhase
	}
	if campaign.PhaseStatus == nil {
		phaseStatus := models.PhaseStatusNotStarted
		campaign.PhaseStatus = &phaseStatus
	}
	if campaign.OverallProgress == nil {
		progress := float64(0.0)
		campaign.OverallProgress = &progress
	}

	query := `INSERT INTO lead_generation_campaigns (
		id, name, current_phase, phase_status, user_id, created_at, updated_at, metadata,
		campaign_type, total_phases, completed_phases, overall_progress,
		progress_percentage, total_items, processed_items, successful_items, failed_items
	) VALUES (
		:id, :name, :current_phase, :phase_status, :user_id, :created_at, :updated_at, :metadata,
		:campaign_type, :total_phases, :completed_phases, :overall_progress,
		:progress_percentage, :total_items, :processed_items, :successful_items, :failed_items
	)`
	_, err := exec.NamedExecContext(ctx, query, campaign)

	if err != nil {
		log.Printf("DEBUG CreateCampaign: INSERT FAILED for campaign %s: %v", campaign.ID, err)
	} else {
		log.Printf("DEBUG CreateCampaign: INSERT SUCCEEDED for campaign %s", campaign.ID)
	}

	return err
}

func (s *campaignStorePostgres) GetCampaignByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.LeadGenerationCampaign, error) {
	if exec == nil {
		exec = s.db
	}
	log.Printf("DEBUG GetCampaignByID: About to SELECT campaign %s", id)

	campaign := &models.LeadGenerationCampaign{}
	query := `SELECT id, name, current_phase, phase_status, user_id, created_at, updated_at,
	                 started_at, completed_at, progress_percentage, total_items, processed_items,
	                 successful_items, failed_items, metadata, error_message, business_status,
	                 campaign_type, total_phases, completed_phases, overall_progress,
	                 dns_results, http_results, analysis_results
	             FROM lead_generation_campaigns WHERE id = $1`
	err := exec.GetContext(ctx, campaign, query, id)

	if err == sql.ErrNoRows {
		log.Printf("DEBUG GetCampaignByID: Campaign %s NOT FOUND", id)
		return nil, store.ErrNotFound
	}

	if err != nil {
		log.Printf("DEBUG GetCampaignByID: SELECT FAILED for campaign %s: %v", id, err)
		return campaign, err
	}

	// Set default values for required fields that may be missing in older records
	if campaign.CampaignType == "" {
		campaign.CampaignType = "lead_generation"
	}
	if campaign.TotalPhases == 0 {
		campaign.TotalPhases = 4
	}

	// DEBUG: Log what we actually retrieved
	metadataStr := "NULL"
	if campaign.Metadata != nil {
		metadataStr = string(*campaign.Metadata)
	}
	log.Printf("DEBUG GetCampaignByID: SELECT SUCCEEDED for campaign %s, retrieved metadata: %s", id, metadataStr)

	return campaign, err
}

func (s *campaignStorePostgres) UpdateCampaign(ctx context.Context, exec store.Querier, campaign *models.LeadGenerationCampaign) error {
	query := `UPDATE lead_generation_campaigns SET
	                               name = :name, current_phase = :current_phase, phase_status = :phase_status, user_id = :user_id,
	                               updated_at = :updated_at, metadata = :metadata
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
	checkQuery := `SELECT EXISTS(SELECT 1 FROM lead_generation_campaigns WHERE id = $1)`
	err := exec.GetContext(ctx, &exists, checkQuery, id)
	if err != nil {
		return err
	}
	if !exists {
		return store.ErrNotFound
	}

	// Delete related records first to avoid foreign key constraint violations
	// Order matters: delete leaf nodes first, then parent nodes

	// 3. Delete generated domains (no foreign dependencies)
	_, err = exec.ExecContext(ctx, `DELETE FROM generated_domains WHERE campaign_id = $1`, id)
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

	// DNS validation params are now stored as JSON in campaigns table, so no separate deletion needed

	// Legacy domain generation params cleanup removed - using JSONB approach now

	// Delete domain generation params (legacy table cleanup)
	_, err = exec.ExecContext(ctx, `DELETE FROM domain_generation_campaign_params WHERE campaign_id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete domain generation params: %w", err)
	}

	// 6. Finally, delete the campaign itself
	result, err := exec.ExecContext(ctx, `DELETE FROM lead_generation_campaigns WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete campaign: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}

	// 7. Pattern config cleanup removed - using JSONB approach now

	return err
}

func (s *campaignStorePostgres) ListCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) ([]*models.LeadGenerationCampaign, error) {
	baseQuery := `SELECT id, name, current_phase, phase_status, user_id, created_at, updated_at,
	                     started_at, completed_at, progress_percentage, total_items, processed_items,
	                     successful_items, failed_items, metadata, error_message, business_status,
	                     campaign_type, total_phases, completed_phases, overall_progress,
	                     dns_results, http_results, analysis_results
	             FROM lead_generation_campaigns`
	args := []interface{}{}
	conditions := []string{}

	// Phase-based filtering
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

	if filter.SortBy != "" {
		validSortCols := map[string]string{
			"created_at":       "created_at",
			"name":             "name",
			"phase_status":     "phase_status",
			"updated_at":       "updated_at",
			"overall_progress": "overall_progress",
			"current_phase":    "current_phase",
		}
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

	campaigns := []*models.LeadGenerationCampaign{}
	err := exec.SelectContext(ctx, &campaigns, reboundQuery, args...)

	// Set defaults for any campaigns missing phase-centric fields
	for _, campaign := range campaigns {
		if campaign.CampaignType == "" {
			campaign.CampaignType = "lead_generation"
		}
		if campaign.TotalPhases == 0 {
			campaign.TotalPhases = 4
		}
	}

	return campaigns, err
}

func (s *campaignStorePostgres) CountCampaigns(ctx context.Context, exec store.Querier, filter store.ListCampaignsFilter) (int64, error) {
	baseQuery := `SELECT COUNT(*) FROM lead_generation_campaigns`
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

func (s *campaignStorePostgres) UpdateCampaignStatus(ctx context.Context, exec store.Querier, id uuid.UUID, status models.PhaseStatusEnum, errorMessage sql.NullString) error {
	// Use the store's database connection if no executor is provided
	if exec == nil {
		exec = s.db
	}

	query := `UPDATE lead_generation_campaigns SET phase_status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`
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
	// First, update the progress and set status to 'in_progress' if it's not already completed or failed
	query := `UPDATE lead_generation_campaigns
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

func (s *campaignStorePostgres) UpdateCampaignPhaseFields(ctx context.Context, exec store.Querier, id uuid.UUID, currentPhase *models.PhaseTypeEnum, phaseStatus *models.PhaseStatusEnum) error {
	// Use the store's database connection if no executor is provided
	if exec == nil {
		exec = s.db
	}

	query := `UPDATE lead_generation_campaigns SET current_phase = $1, phase_status = $2, updated_at = NOW() WHERE id = $3`
	result, err := exec.ExecContext(ctx, query, currentPhase, phaseStatus, id)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}
	return err
}

// --- Domain Generation Campaign Params --- //
// REMOVED: Legacy cross-campaign methods - CreateDomainGenerationParams, GetDomainGenerationParams, UpdateDomainGenerationParamsOffset
// These methods have been replaced with phase-centric JSONB approach

// --- DomainGenerationPhaseConfigState Store Methods ---

func (s *campaignStorePostgres) GetDomainGenerationPhaseConfigStateByHash(ctx context.Context, exec store.Querier, configHash string) (*models.DomainGenerationPhaseConfigState, error) {
	state := &models.DomainGenerationPhaseConfigState{}
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

func (s *campaignStorePostgres) CreateOrUpdateDomainGenerationPhaseConfigState(ctx context.Context, exec store.Querier, state *models.DomainGenerationPhaseConfigState) error {
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
		(id, campaign_id, domain_name, source_keyword, source_pattern, tld, offset_index, generated_at, created_at, dns_status, http_status, http_title, http_keywords, lead_score)
		VALUES (:id, :campaign_id, :domain_name, :source_keyword, :source_pattern, :tld, :offset_index, :generated_at, :created_at, :dns_status, :http_status, :http_title, :http_keywords, :lead_score)`)
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
		if domain.LeadStatus == nil {
			pending := models.DomainLeadStatusPending
			domain.LeadStatus = &pending
			log.Printf("DEBUG [CreateGeneratedDomains]: Initialized LEAD status to 'pending' for domain %s", domain.DomainName)
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

func (s *campaignStorePostgres) GetGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, limit int, lastOffsetIndex int64, filter *store.ListCampaignDomainsFilter) ([]*models.GeneratedDomain, error) {
	domains := []*models.GeneratedDomain{}
	if exec == nil {
		exec = s.db
	}
	base := `SELECT id, campaign_id, domain_name, source_keyword, source_pattern, tld, offset_index, generated_at, created_at, dns_status, dns_ip, http_status, http_status_code, http_title, http_keywords, lead_score, lead_status, last_validated_at, dns_reason, http_reason FROM generated_domains`
	conditions := []string{"campaign_id = $1", "offset_index >= $2"}
	args := []interface{}{campaignID, lastOffsetIndex}
	argPos := 3
	if filter != nil {
		if filter.DNSStatus != nil {
			conditions = append(conditions, fmt.Sprintf("dns_status = $%d", argPos))
			args = append(args, *filter.DNSStatus)
			argPos++
		}
		if filter.HTTPStatus != nil {
			conditions = append(conditions, fmt.Sprintf("http_status = $%d", argPos))
			args = append(args, *filter.HTTPStatus)
			argPos++
		}
		if filter.DNSReason != nil {
			conditions = append(conditions, fmt.Sprintf("dns_reason = $%d", argPos))
			args = append(args, *filter.DNSReason)
			argPos++
		}
		if filter.HTTPReason != nil {
			conditions = append(conditions, fmt.Sprintf("http_reason = $%d", argPos))
			args = append(args, *filter.HTTPReason)
			argPos++
		}
	}
	query := base + " WHERE " + strings.Join(conditions, " AND ") + " ORDER BY offset_index ASC LIMIT $" + fmt.Sprint(argPos)
	args = append(args, limit)
	log.Printf("DEBUG [GetGeneratedDomainsByCampaign]: SQL=%s args=%v", query, args)
	if err := exec.SelectContext(ctx, &domains, query, args...); err != nil {
		return domains, err
	}
	log.Printf("DEBUG [GetGeneratedDomainsByCampaign]: Found %d domains for campaign %s", len(domains), campaignID)
	return domains, nil
}

func (s *campaignStorePostgres) CountGeneratedDomainsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int64, error) {
	var count int64
	query := `SELECT COUNT(*) FROM generated_domains WHERE campaign_id = $1`
	err := exec.GetContext(ctx, &count, query, campaignID)
	return count, err
}

// BulkDeleteCampaignsByIDs deletes multiple campaigns by ID (simple implementation)
func (s *campaignStorePostgres) BulkDeleteCampaignsByIDs(ctx context.Context, exec store.Querier, campaignIDs []uuid.UUID) error {
	if len(campaignIDs) == 0 {
		return nil
	}
	if exec == nil {
		exec = s.db
	}
	// Build parameter list
	params := make([]string, len(campaignIDs))
	args := make([]interface{}, len(campaignIDs))
	for i, id := range campaignIDs {
		params[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	q := fmt.Sprintf("DELETE FROM lead_generation_campaigns WHERE id IN (%s)", strings.Join(params, ","))
	_, err := exec.ExecContext(ctx, q, args...)
	return err
}

// GetCampaignDomainCounters returns aggregated counters for a campaign (campaign_domain_counters row)
func (s *campaignStorePostgres) GetCampaignDomainCounters(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.CampaignDomainCounters, error) {
	if exec == nil {
		exec = s.db
	}
	var row models.CampaignDomainCounters
	q := `SELECT campaign_id, total_domains, dns_pending, dns_ok, dns_error, dns_timeout,\n                 http_pending, http_ok, http_error, http_timeout,\n                 lead_pending, lead_match, lead_no_match, lead_error, lead_timeout,\n                 updated_at, created_at\n          FROM campaign_domain_counters WHERE campaign_id = $1`
	if err := exec.GetContext(ctx, &row, q, campaignID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, store.ErrNotFound
		}
		return nil, err
	}
	return &row, nil
}

// GetCampaignDomainCounters returns aggregated counters for a campaign (campaign_domain_counters row)
// (duplicate GetCampaignDomainCounters removed)

// --- DNS Validation Campaign Params --- //
// REMOVED: Legacy cross-campaign methods - CreateDNSValidationParams, GetDNSValidationParams
// These methods have been replaced with phase-centric JSONB approach

// --- DNS Validation Results --- //

func (s *campaignStorePostgres) UpdateDomainDNSStatus(ctx context.Context, exec store.Querier, domainID uuid.UUID, status models.DomainDNSStatusEnum, dnsIP *string, validatedAt *time.Time) error {
	updateQuery := `UPDATE generated_domains SET
		dns_status = $1,
		dns_ip = $2,
		last_validated_at = $3
		WHERE id = $4`

	_, err := exec.ExecContext(ctx, updateQuery, status, dnsIP, validatedAt, domainID)
	if err != nil {
		return fmt.Errorf("failed to update domain DNS status: %w", err)
	}

	log.Printf("DEBUG [UpdateDomainDNSStatus]: Updated domain DNS status to '%s' for domain ID %s", status, domainID)
	return nil
}

// REMOVED: GetDomainsForDNSValidation - legacy cross-campaign method removed from interface

func (s *campaignStorePostgres) CountValidatedDomains(ctx context.Context, exec store.Querier, campaignID uuid.UUID, statusType string) (int64, error) {
	var query string
	switch statusType {
	case "dns":
		query = `SELECT COUNT(*) FROM generated_domains WHERE campaign_id = $1 AND dns_status = 'ok'`
	case "http":
		query = `SELECT COUNT(*) FROM generated_domains WHERE campaign_id = $1 AND http_status = 'ok'`
	default:
		query = `SELECT COUNT(*) FROM generated_domains WHERE campaign_id = $1`
	}

	var count int64
	err := exec.GetContext(ctx, &count, query, campaignID)
	return count, err
}

// Legacy interface compatibility methods - now work with generated_domains table
func (s *campaignStorePostgres) CreateDNSValidationResults(ctx context.Context, exec store.Querier, results []*models.DNSValidationResult) error {
	if len(results) == 0 {
		return nil
	}

	// Update generated_domains table with DNS validation results
	for _, result := range results {
		if !result.GeneratedDomainID.Valid {
			log.Printf("WARNING [CreateDNSValidationResults]: No generated_domain_id for domain %s, skipping", result.DomainName)
			continue
		}

		var dnsStatus models.DomainDNSStatusEnum
		var dnsIP *string

		switch result.ValidationStatus {
		case "resolved":
			dnsStatus = models.DomainDNSStatusOK
			// Extract actual IP from DNS records if available
			if result.DNSRecords != nil {
				var ips []string
				if err := json.Unmarshal(*result.DNSRecords, &ips); err == nil && len(ips) > 0 {
					dnsIP = &ips[0] // Use first IP address
				}
			}
		case "unresolved":
			dnsStatus = models.DomainDNSStatusError
		case "timeout":
			dnsStatus = models.DomainDNSStatusTimeout
		case "error":
			dnsStatus = models.DomainDNSStatusError
		default:
			// Only truly unknown statuses should remain pending
			log.Printf("WARNING [CreateDNSValidationResults]: Unknown validation status '%s' for domain %s, setting to pending", result.ValidationStatus, result.DomainName)
			dnsStatus = models.DomainDNSStatusPending
		}

		err := s.UpdateDomainDNSStatus(ctx, exec, result.GeneratedDomainID.UUID, dnsStatus, dnsIP, result.LastCheckedAt)
		if err != nil {
			log.Printf("ERROR [CreateDNSValidationResults]: Failed to update domain DNS status for %s: %v", result.DomainName, err)
			return err
		}

		log.Printf("DEBUG [CreateDNSValidationResults]: Domain %s validation result: status='%s' → dns_status='%s'",
			result.DomainName, result.ValidationStatus, dnsStatus)
	}
	return nil
}

func (s *campaignStorePostgres) GetDNSValidationResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.DNSValidationResult, error) {
	// Convert generated_domains data to DNSValidationResult format
	domains := []*models.GeneratedDomain{}
	query := `SELECT id, campaign_id, domain_name, dns_status, dns_ip, last_validated_at, created_at
	          FROM generated_domains
	          WHERE campaign_id = $1`

	args := []interface{}{campaignID}
	if filter.ValidationStatus != "" {
		switch filter.ValidationStatus {
		case "resolved":
			query += " AND dns_status = $2"
			args = append(args, models.DomainDNSStatusOK)
		case "unresolved", "timeout", "error":
			query += " AND dns_status = $2"
			args = append(args, models.DomainDNSStatusError)
		case "pending":
			query += " AND dns_status = $2"
			args = append(args, models.DomainDNSStatusPending)
		}
	}

	query += " ORDER BY domain_name ASC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", filter.Limit)
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET %d", filter.Offset)
	}

	err := exec.SelectContext(ctx, &domains, query, args...)
	if err != nil {
		return nil, err
	}

	// Convert to DNSValidationResult format
	results := make([]*models.DNSValidationResult, len(domains))
	for i, domain := range domains {
		var validationStatus string
		switch {
		case domain.DNSStatus != nil && *domain.DNSStatus == models.DomainDNSStatusOK:
			validationStatus = "resolved"
		case domain.DNSStatus != nil && *domain.DNSStatus == models.DomainDNSStatusError:
			validationStatus = "unresolved"
		default:
			validationStatus = "pending"
		}

		var lastCheckedAt *time.Time
		if domain.LastValidatedAt.Valid {
			lastCheckedAt = &domain.LastValidatedAt.Time
		}

		results[i] = &models.DNSValidationResult{
			ID:                uuid.New(), // Generate new ID for compatibility
			DNSCampaignID:     campaignID,
			GeneratedDomainID: uuid.NullUUID{UUID: domain.ID, Valid: true},
			DomainName:        domain.DomainName,
			ValidationStatus:  validationStatus,
			LastCheckedAt:     lastCheckedAt,
			CreatedAt:         domain.CreatedAt,
		}
	}

	return results, nil
}

func (s *campaignStorePostgres) CountDNSValidationResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, onlyValid bool) (int64, error) {
	query := `SELECT COUNT(*) FROM generated_domains WHERE campaign_id = $1`
	args := []interface{}{campaignID}

	if onlyValid {
		query += " AND dns_status = $2"
		args = append(args, models.DomainDNSStatusOK)
	}

	var count int64
	err := exec.GetContext(ctx, &count, query, args...)
	return count, err
}

func (s *campaignStorePostgres) DeleteDNSValidationResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (int64, error) {
	// Reset DNS status in generated_domains instead of deleting from legacy table
	query := `UPDATE generated_domains SET
	          dns_status = NULL,
	          dns_ip = NULL,
	          last_validated_at = NULL
	          WHERE campaign_id = $1 AND dns_status IS NOT NULL`

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
			if params.KeywordSetIDs == nil {
				return pq.StringArray{}
			}
			ids := make([]string, len(*params.KeywordSetIDs))
			for i, u := range *params.KeywordSetIDs {
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
	keywordSetIDs := make([]uuid.UUID, 0, len(scanTarget.ScannedKeywordSetIDs))
	for _, idStr := range scanTarget.ScannedKeywordSetIDs {
		if id, err := uuid.Parse(idStr); err == nil {
			keywordSetIDs = append(keywordSetIDs, id)
		}
	}
	result.KeywordSetIDs = &keywordSetIDs

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

	// Update generated_domains table with HTTP validation results
	for _, result := range results {
		// Find the domain by name to get the generated_domain_id
		var generatedDomainID uuid.UUID
		getDomainQuery := `SELECT id FROM generated_domains WHERE domain_name = $1`
		err := exec.GetContext(ctx, &generatedDomainID, getDomainQuery, result.DomainName)
		if err != nil {
			log.Printf("WARNING [CreateHTTPKeywordResults]: Failed to find generated_domain for %s: %v", result.DomainName, err)
			continue
		}

		var httpStatus models.DomainHTTPStatusEnum
		switch result.ValidationStatus {
		case "success", "valid_http_response":
			httpStatus = models.DomainHTTPStatusOK
		case "failed", "invalid_http_response_error", "timeout", "cancelled_during_processing":
			httpStatus = models.DomainHTTPStatusError
		default:
			httpStatus = models.DomainHTTPStatusPending
		}

		var httpStatusCode *int
		if result.HTTPStatusCode != nil {
			statusCode := int(*result.HTTPStatusCode)
			httpStatusCode = &statusCode
		}

		err = s.UpdateDomainHTTPStatus(ctx, exec, generatedDomainID, httpStatus, httpStatusCode, result.PageTitle, result.LastCheckedAt)
		if err != nil {
			log.Printf("ERROR [CreateHTTPKeywordResults]: Failed to update domain HTTP status for %s: %v", result.DomainName, err)
			return err
		}

		log.Printf("DEBUG [CreateHTTPKeywordResults]: Updated domain HTTP status to '%s' for %s", httpStatus, result.DomainName)
	}
	return nil
}

func (s *campaignStorePostgres) UpdateDomainHTTPStatus(ctx context.Context, exec store.Querier, domainID uuid.UUID, status models.DomainHTTPStatusEnum, httpStatusCode *int, pageTitle *string, validatedAt *time.Time) error {
	updateQuery := `UPDATE generated_domains SET
		http_status = $1,
		http_status_code = $2,
		http_title = $3,
		last_validated_at = $4
		WHERE id = $5`

	_, err := exec.ExecContext(ctx, updateQuery, status, httpStatusCode, pageTitle, validatedAt, domainID)
	if err != nil {
		return fmt.Errorf("failed to update domain HTTP status: %w", err)
	}

	log.Printf("DEBUG [UpdateDomainHTTPStatus]: Updated domain HTTP status to '%s' for domain ID %s", status, domainID)
	return nil
}

func (s *campaignStorePostgres) GetHTTPKeywordResultsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID, filter store.ListValidationResultsFilter) ([]*models.HTTPKeywordResult, error) {
	// Convert generated_domains data to HTTPKeywordResult format
	domains := []*models.GeneratedDomain{}
	query := `SELECT id, campaign_id, domain_name, http_status, http_status_code, http_title, last_validated_at, created_at
	          FROM generated_domains
	          WHERE campaign_id = $1`

	args := []interface{}{campaignID}
	if filter.ValidationStatus != "" {
		switch filter.ValidationStatus {
		case "success", "valid_http_response":
			query += " AND http_status = $2"
			args = append(args, models.DomainHTTPStatusOK)
		case "failed", "invalid_http_response_error", "timeout", "error":
			query += " AND http_status = $2"
			args = append(args, models.DomainHTTPStatusError)
		case "pending":
			query += " AND http_status = $2"
			args = append(args, models.DomainHTTPStatusPending)
		}
	}

	query += " ORDER BY domain_name ASC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", filter.Limit)
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET %d", filter.Offset)
	}

	err := exec.SelectContext(ctx, &domains, query, args...)
	if err != nil {
		return nil, err
	}

	// Convert to HTTPKeywordResult format
	results := make([]*models.HTTPKeywordResult, len(domains))
	for i, domain := range domains {
		var validationStatus string
		switch {
		case domain.HTTPStatus != nil && *domain.HTTPStatus == models.DomainHTTPStatusOK:
			validationStatus = "success"
		case domain.HTTPStatus != nil && *domain.HTTPStatus == models.DomainHTTPStatusError:
			validationStatus = "failed"
		default:
			validationStatus = "pending"
		}

		var lastCheckedAt *time.Time
		if domain.LastValidatedAt.Valid {
			lastCheckedAt = &domain.LastValidatedAt.Time
		}

		var httpStatusCode *int32
		if domain.HTTPStatusCode.Valid {
			statusCode := int32(domain.HTTPStatusCode.Int32)
			httpStatusCode = &statusCode
		}

		var pageTitle *string
		if domain.HTTPTitle.Valid {
			pageTitle = &domain.HTTPTitle.String
		}

		results[i] = &models.HTTPKeywordResult{
			ID:                    uuid.New(), // Generate new ID for compatibility
			HTTPKeywordCampaignID: campaignID,
			DomainName:            domain.DomainName,
			ValidationStatus:      validationStatus,
			HTTPStatusCode:        httpStatusCode,
			PageTitle:             pageTitle,
			LastCheckedAt:         lastCheckedAt,
			CreatedAt:             domain.CreatedAt,
		}
	}

	return results, nil
}

func (s *campaignStorePostgres) GetDomainsForHTTPValidation(ctx context.Context, exec store.Querier, httpKeywordCampaignID uuid.UUID, sourceCampaignID uuid.UUID, limit int, lastDomainName string) ([]*models.DNSValidationResult, error) {
	// Get domains that have successful DNS validation but need HTTP validation
	domains := []*models.GeneratedDomain{}
	query := `
	       SELECT id, campaign_id, domain_name, dns_status, http_status, last_validated_at, created_at
	       FROM generated_domains
	       WHERE campaign_id = $1
	         AND dns_status = $2
	         AND domain_name > $3
	         AND (http_status IS NULL OR http_status IN ('pending', 'error'))
	       ORDER BY domain_name ASC
	       LIMIT $4`

	err := exec.SelectContext(ctx, &domains, query, sourceCampaignID, models.DomainDNSStatusOK, lastDomainName, limit)
	if err != nil {
		return nil, err
	}

	// Convert to DNSValidationResult format
	results := make([]*models.DNSValidationResult, len(domains))
	for i, domain := range domains {
		var lastCheckedAt *time.Time
		if domain.LastValidatedAt.Valid {
			lastCheckedAt = &domain.LastValidatedAt.Time
		}

		results[i] = &models.DNSValidationResult{
			ID:                uuid.New(),            // Generate new ID for compatibility
			DNSCampaignID:     httpKeywordCampaignID, // Use the HTTP campaign ID as DNS campaign for compatibility
			GeneratedDomainID: uuid.NullUUID{UUID: domain.ID, Valid: true},
			DomainName:        domain.DomainName,
			ValidationStatus:  "resolved", // These domains already passed DNS validation
			LastCheckedAt:     lastCheckedAt,
			CreatedAt:         domain.CreatedAt,
		}
	}

	return results, nil
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
		INNER JOIN lead_generation_campaigns c ON c.id = dgcp.campaign_id
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

// (Phase C) Removed legacy domains_data JSONB operations (UpdateDomainsData/GetDomainsData/AppendDomainsData)

// --- JSONB Operations for Standalone Services Architecture ---

// UpdateDNSResults updates the DNS results JSONB column for a campaign
func (s *campaignStorePostgres) UpdateDNSResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, dnsResults interface{}) error {
	if exec == nil {
		exec = s.db
	}

	dnsResultsJSON, err := json.Marshal(dnsResults)
	if err != nil {
		return fmt.Errorf("failed to marshal DNS results: %w", err)
	}

	query := `UPDATE lead_generation_campaigns SET dns_results = $1, updated_at = NOW() WHERE id = $2`
	result, err := exec.ExecContext(ctx, query, dnsResultsJSON, campaignID)
	if err != nil {
		return fmt.Errorf("failed to update DNS results: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}
	return err
}

// GetDNSResults retrieves the DNS results JSONB data for a campaign
func (s *campaignStorePostgres) GetDNSResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (interface{}, error) {
	if exec == nil {
		exec = s.db
	}

	var dnsResults sql.NullString
	query := `SELECT dns_results FROM lead_generation_campaigns WHERE id = $1`
	err := exec.GetContext(ctx, &dnsResults, query, campaignID)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get DNS results: %w", err)
	}

	if !dnsResults.Valid || dnsResults.String == "" {
		return nil, nil
	}

	var result interface{}
	if err := json.Unmarshal([]byte(dnsResults.String), &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DNS results: %w", err)
	}

	return result, nil
}

// UpdateHTTPResults updates the HTTP results JSONB column for a campaign
func (s *campaignStorePostgres) UpdateHTTPResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, httpResults interface{}) error {
	if exec == nil {
		exec = s.db
	}
	httpResultsJSON, err := json.Marshal(httpResults)
	if err != nil {
		return fmt.Errorf("failed to marshal HTTP results: %w", err)
	}
	query := `UPDATE lead_generation_campaigns SET http_results = $1, updated_at = NOW() WHERE id = $2`
	res, err := exec.ExecContext(ctx, query, httpResultsJSON, campaignID)
	if err != nil {
		return fmt.Errorf("failed to update HTTP results: %w", err)
	}
	if rows, rerr := res.RowsAffected(); rerr == nil && rows == 0 {
		return store.ErrNotFound
	}
	return nil
}

// GetHTTPResults retrieves the HTTP results JSONB data for a campaign
func (s *campaignStorePostgres) GetHTTPResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (interface{}, error) {
	if exec == nil {
		exec = s.db
	}
	var httpResults sql.NullString
	query := `SELECT http_results FROM lead_generation_campaigns WHERE id = $1`
	if err := exec.GetContext(ctx, &httpResults, query, campaignID); err != nil {
		if err == sql.ErrNoRows {
			return nil, store.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get HTTP results: %w", err)
	}
	if !httpResults.Valid || httpResults.String == "" {
		return nil, nil
	}
	var result interface{}
	if err := json.Unmarshal([]byte(httpResults.String), &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal HTTP results: %w", err)
	}
	return result, nil
}

// UpdateAnalysisResults updates the analysis_results JSONB column for a campaign
func (s *campaignStorePostgres) UpdateAnalysisResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID, analysisResults interface{}) error {
	if exec == nil {
		exec = s.db
	}
	b, err := json.Marshal(analysisResults)
	if err != nil {
		return fmt.Errorf("failed to marshal analysis results: %w", err)
	}
	q := `UPDATE lead_generation_campaigns SET analysis_results = $1, updated_at = NOW() WHERE id = $2`
	res, err := exec.ExecContext(ctx, q, b, campaignID)
	if err != nil {
		return fmt.Errorf("failed to update analysis results: %w", err)
	}
	if rows, rerr := res.RowsAffected(); rerr == nil && rows == 0 {
		return store.ErrNotFound
	}
	return nil
}

// GetCampaignsByIDs fetches multiple campaigns by their IDs in a single query
func (s *campaignStorePostgres) GetCampaignsByIDs(ctx context.Context, exec store.Querier, campaignIDs []uuid.UUID) ([]*models.LeadGenerationCampaign, error) {
	if len(campaignIDs) == 0 {
		return []*models.LeadGenerationCampaign{}, nil
	}
	if exec == nil {
		exec = s.db
	}
	query, args, err := sqlx.In(`SELECT * FROM lead_generation_campaigns WHERE id IN (?)`, campaignIDs)
	if err != nil {
		return nil, fmt.Errorf("building IN clause: %w", err)
	}
	query = s.db.Rebind(query)
	var campaigns []*models.LeadGenerationCampaign
	if err := exec.SelectContext(ctx, &campaigns, query, args...); err != nil {
		return nil, err
	}
	return campaigns, nil
}

// GetAnalysisResults retrieves the analysis_results JSONB data for a campaign
func (s *campaignStorePostgres) GetAnalysisResults(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (interface{}, error) {
	if exec == nil {
		exec = s.db
	}
	var ar sql.NullString
	q := `SELECT analysis_results FROM lead_generation_campaigns WHERE id = $1`
	if err := exec.GetContext(ctx, &ar, q, campaignID); err != nil {
		if err == sql.ErrNoRows {
			return nil, store.ErrNotFound
		}
		return nil, fmt.Errorf("failed to get analysis results: %w", err)
	}
	if !ar.Valid || ar.String == "" {
		return nil, nil
	}
	var result interface{}
	if err := json.Unmarshal([]byte(ar.String), &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal analysis results: %w", err)
	}
	return result, nil
}

// (legacy JSONB accessor methods for dns/http/analysis removed during refactor)

// CreateCampaignPhases inserts the standard set of phases for a new campaign
func (s *campaignStorePostgres) CreateCampaignPhases(ctx context.Context, exec store.Querier, campaignID uuid.UUID) error {
	if exec == nil {
		exec = s.db
	}
	type phaseDef struct {
		phaseType  models.PhaseTypeEnum
		phaseOrder int
	}
	phases := []phaseDef{
		{models.PhaseTypeEnum("domain_generation"), 1},
		{models.PhaseTypeEnum("dns_validation"), 2},
		{models.PhaseTypeEnum("http_keyword"), 3},
		{models.PhaseTypeEnum("analysis"), 4},
	}
	now := time.Now()
	insert := `INSERT INTO campaign_phases (id, campaign_id, phase_type, phase_order, status, progress_percentage, started_at, completed_at, error_message, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`
	for _, p := range phases {
		_, err := exec.ExecContext(ctx, insert,
			uuid.New(),
			campaignID,
			p.phaseType,
			p.phaseOrder,
			models.PhaseStatusEnum("pending"),
			0.0,
			nil, // started_at
			nil, // completed_at
			nil, // error_message
			now,
			now,
		)
		if err != nil {
			return fmt.Errorf("failed to create campaign phase %s: %w", p.phaseType, err)
		}
	}
	log.Printf("Created standard campaign phases for campaign %s", campaignID)
	return nil
}

// UpdateDomainsBulkDNSStatus performs bulk updates of DNS status for generated_domains using COPY-like VALUES
func (s *campaignStorePostgres) UpdateDomainsBulkDNSStatus(ctx context.Context, exec store.Querier, results []models.DNSValidationResult) error {
	if len(results) == 0 {
		return nil
	}
	if exec == nil {
		exec = s.db
	}
	// Build dynamic VALUES list
	valueStrings := make([]string, 0, len(results))
	valueArgs := make([]interface{}, 0, len(results)*4)
	for i, r := range results {
		idx := i * 4
		ts := r.LastCheckedAt
		valueStrings = append(valueStrings, fmt.Sprintf("($%d,$%d,$%d,$%d)", idx+1, idx+2, idx+3, idx+4))
		valueArgs = append(valueArgs, r.DomainName, r.ValidationStatus, ts, r.Reason)
	}
	tmp := strings.Join(valueStrings, ",")
	// NOTE: Cast validation_status (text) to domain_dns_status_enum to satisfy PostgreSQL enum type
	q := fmt.Sprintf(`UPDATE generated_domains gd
		SET dns_status = v.validation_status::domain_dns_status_enum,
		    last_validated_at = v.last_checked_at::timestamptz,
		    dns_reason = CASE WHEN v.validation_status = 'ok' THEN NULL ELSE COALESCE(v.reason, gd.dns_reason) END
		FROM (VALUES %s) AS v(domain_name,validation_status,last_checked_at,reason)
		WHERE gd.domain_name = v.domain_name`, tmp)
	if _, err := exec.ExecContext(ctx, q, valueArgs...); err != nil {
		return fmt.Errorf("bulk DNS status update failed: %w", err)
	}
	return nil
}

// UpdateDomainsBulkHTTPStatus performs bulk updates of HTTP status & keywords
func (s *campaignStorePostgres) UpdateDomainsBulkHTTPStatus(ctx context.Context, exec store.Querier, results []models.HTTPKeywordResult) error {
	// TODO(B1): Wrap in transaction with counter delta updates similar to DNS phase; currently relies on triggers per-row.
	if len(results) == 0 {
		return nil
	}
	if exec == nil {
		exec = s.db
	}
	valueStrings := make([]string, 0, len(results))
	valueArgs := make([]interface{}, 0, len(results)*6)
	for i, r := range results {
		idx := i * 5
		valueStrings = append(valueStrings, fmt.Sprintf("($%d,$%d,$%d,$%d,$%d)", idx+1, idx+2, idx+3, idx+4, idx+5))
		valueArgs = append(valueArgs, r.DomainName, r.ValidationStatus, r.HTTPStatusCode, r.LastCheckedAt, r.Reason)
	}
	tmp := strings.Join(valueStrings, ",")
	q := fmt.Sprintf(`UPDATE generated_domains gd SET http_status = v.validation_status, http_status_code = v.http_status_code, http_checked_at = v.last_checked_at, http_reason = CASE WHEN v.validation_status = 'ok' THEN NULL ELSE COALESCE(v.reason, gd.http_reason) END FROM (VALUES %s) AS v(domain_name,validation_status,http_status_code,last_checked_at,reason) WHERE gd.domain_name = v.domain_name`, tmp)
	if _, err := exec.ExecContext(ctx, q, valueArgs...); err != nil {
		return fmt.Errorf("bulk HTTP status update failed: %w", err)
	}
	return nil
}

// (Phase C) Removed legacy domains_data accessors (GetCampaignDomainsData/UpdateCampaignDomainsData)

func (s *campaignStorePostgres) GetCampaignPhases(ctx context.Context, exec store.Querier, campaignID uuid.UUID) ([]*models.CampaignPhase, error) {
	query := `
		SELECT id, campaign_id, phase_type, phase_order, status, progress_percentage,
		       started_at, completed_at, error_message, created_at, updated_at
		FROM campaign_phases
		WHERE campaign_id = $1
		ORDER BY phase_order ASC`

	var phases []*models.CampaignPhase
	err := exec.SelectContext(ctx, &phases, query, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to query campaign phases: %w", err)
	}

	return phases, nil
}

func (s *campaignStorePostgres) GetCampaignPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) (*models.CampaignPhase, error) {
	query := `
		SELECT id, campaign_id, phase_type, phase_order, status, progress_percentage,
		       started_at, completed_at, error_message, created_at, updated_at
		FROM campaign_phases
		WHERE campaign_id = $1 AND phase_type = $2`

	phase := &models.CampaignPhase{}
	err := exec.GetContext(ctx, phase, query, campaignID, phaseType)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("phase %s not found for campaign %s", phaseType, campaignID)
		}
		return nil, fmt.Errorf("failed to get campaign phase: %w", err)
	}

	return phase, nil
}

func (s *campaignStorePostgres) UpdatePhaseStatus(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, status models.PhaseStatusEnum) error {
	now := time.Now()
	query := `
		UPDATE campaign_phases 
		SET status = $1,
		    updated_at = $2
		WHERE campaign_id = $3 AND phase_type = $4`

	result, err := exec.ExecContext(ctx, query, status, now, campaignID, phaseType)
	if err != nil {
		return fmt.Errorf("failed to update status for phase %s in campaign %s: %w", phaseType, campaignID, err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("no phase %s found for campaign %s", phaseType, campaignID)
	}

	log.Printf("Updated phase %s status to %s for campaign %s", phaseType, status, campaignID)
	return nil
}

func (s *campaignStorePostgres) UpdatePhaseProgress(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, progress float64, totalItems, processedItems, successfulItems, failedItems *int64) error {
	now := time.Now()
	query := `
		UPDATE campaign_phases 
		SET progress_percentage = $1,
		    total_items = $2,
		    processed_items = $3,
		    successful_items = $4,
		    failed_items = $5,
		    updated_at = $6
		WHERE campaign_id = $7 AND phase_type = $8`

	result, err := exec.ExecContext(ctx, query, progress, totalItems, processedItems, successfulItems, failedItems, now, campaignID, phaseType)
	if err != nil {
		return fmt.Errorf("failed to update progress for phase %s in campaign %s: %w", phaseType, campaignID, err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("no phase %s found for campaign %s", phaseType, campaignID)
	}

	log.Printf("Updated phase %s progress to %.1f%% for campaign %s", phaseType, progress, campaignID)
	return nil
}

func (s *campaignStorePostgres) UpdatePhaseConfiguration(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, config json.RawMessage) error {
	now := time.Now()
	query := `
		UPDATE campaign_phases 
		SET configuration = $1,
		    updated_at = $2
		WHERE campaign_id = $3 AND phase_type = $4`

	result, err := exec.ExecContext(ctx, query, config, now, campaignID, phaseType)
	if err != nil {
		return fmt.Errorf("failed to update configuration for phase %s in campaign %s: %w", phaseType, campaignID, err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("no phase %s found for campaign %s", phaseType, campaignID)
	}

	log.Printf("Updated phase %s configuration for campaign %s", phaseType, campaignID)
	return nil
}

func (s *campaignStorePostgres) CompletePhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error {
	now := time.Now()
	query := `
		UPDATE campaign_phases 
		SET status = 'completed',
		    progress_percentage = 100.0,
		    completed_at = $1,
		    updated_at = $1
		WHERE campaign_id = $2 AND phase_type = $3 AND status != 'completed'`

	result, err := exec.ExecContext(ctx, query, now, campaignID, phaseType)
	if err != nil {
		return fmt.Errorf("failed to complete phase %s for campaign %s: %w", phaseType, campaignID, err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		// Attempt to INSERT a missing phase row then mark complete (idempotent behavior)
		if err := s.ensurePhaseRow(ctx, exec, campaignID, phaseType); err == nil {
			// retry update after insertion
			if _, err2 := exec.ExecContext(ctx, query, now, campaignID, phaseType); err2 != nil {
				log.Printf("Failed to mark newly inserted phase %s as completed for campaign %s: %v", phaseType, campaignID, err2)
			} else {
				log.Printf("Inserted & completed missing phase %s for campaign %s", phaseType, campaignID)
				return nil
			}
		} else {
			log.Printf("No phase %s found to complete for campaign %s (may already be completed) and insertion failed: %v", phaseType, campaignID, err)
		}
	} else {
		log.Printf("Completed phase %s for campaign %s", phaseType, campaignID)
	}

	return nil
}

func (s *campaignStorePostgres) StartPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error {
	// FIX (Blocker B1): allow transition from 'configured' -> 'in_progress'. Previous implementation only
	// transitioned from 'not_started', leaving phases stuck in 'configured' after Configure() step.
	now := time.Now()
	query := `
		UPDATE campaign_phases 
		SET status = 'in_progress',
		    started_at = COALESCE(started_at, $1),
		    updated_at = $1
		WHERE campaign_id = $2 AND phase_type = $3 AND status IN ('not_started','configured')`

	result, err := exec.ExecContext(ctx, query, now, campaignID, phaseType)
	if err != nil {
		return fmt.Errorf("failed to start phase %s for campaign %s: %w", phaseType, campaignID, err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		// Attempt to ensure row exists (idempotent) then retry
		if err := s.ensurePhaseRow(ctx, exec, campaignID, phaseType); err == nil {
			// Retry update after insertion (will only match not_started newly inserted row)
			if _, err2 := exec.ExecContext(ctx, query, now, campaignID, phaseType); err2 != nil {
				log.Printf("Failed to start newly inserted phase %s for campaign %s: %v", phaseType, campaignID, err2)
			} else {
				log.Printf("Inserted & started missing phase %s for campaign %s", phaseType, campaignID)
				return nil
			}
		} else {
			// Diagnostic: fetch current status for visibility into why transition failed
			if s.db != nil { // best-effort diagnostic
				statusQuery := `SELECT status FROM campaign_phases WHERE campaign_id=$1 AND phase_type=$2`
				if row := s.db.QueryRowContext(ctx, statusQuery, campaignID, phaseType); row != nil {
					var curStatus string
					if scanErr := row.Scan(&curStatus); scanErr == nil {
						log.Printf("StartPhase no-op: phase %s for campaign %s currently in status '%s' (expected one of not_started, configured)", phaseType, campaignID, curStatus)
					}
				}
			}
			log.Printf("No phase %s found to start for campaign %s (may already be in progress or completed) and insertion failed: %v", phaseType, campaignID, err)
		}
	} else {
		log.Printf("Started phase %s for campaign %s", phaseType, campaignID)
	}

	return nil
}

// ensurePhaseRow inserts a campaign_phases row if it does not already exist (best-effort, silent on unique conflict)
func (s *campaignStorePostgres) ensurePhaseRow(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error {
	if exec == nil {
		exec = s.db
	}
	// Determine phase order (default mapping). Keep in sync with setup_campaign_phases function.
	order := 0
	switch phaseType {
	case models.PhaseTypeDomainGeneration:
		order = 1
	case models.PhaseTypeDNSValidation:
		order = 2
	case models.PhaseTypeHTTPKeywordValidation:
		order = 3
	case models.PhaseTypeAnalysis:
		order = 4
	default:
		order = 4
	}
	q := `INSERT INTO campaign_phases (campaign_id, phase_type, phase_order, status, progress_percentage, created_at, updated_at)
          VALUES ($1,$2,$3,'not_started',0,NOW(),NOW())
          ON CONFLICT DO NOTHING`
	if _, err := exec.ExecContext(ctx, q, campaignID, phaseType, order); err != nil {
		return fmt.Errorf("ensurePhaseRow insert failed: %w", err)
	}
	return nil
}

func (s *campaignStorePostgres) PausePhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error {
	now := time.Now()
	query := `
		UPDATE campaign_phases 
		SET status = 'paused',
		    updated_at = $1
		WHERE campaign_id = $2 AND phase_type = $3 AND status = 'in_progress'`

	result, err := exec.ExecContext(ctx, query, now, campaignID, phaseType)
	if err != nil {
		return fmt.Errorf("failed to pause phase %s for campaign %s: %w", phaseType, campaignID, err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		log.Printf("No in_progress phase %s found to pause for campaign %s", phaseType, campaignID)
	} else {
		log.Printf("Paused phase %s for campaign %s", phaseType, campaignID)
	}

	return nil
}

func (s *campaignStorePostgres) FailPhase(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, errorMessage string) error {
	now := time.Now()
	query := `
		UPDATE campaign_phases 
		SET status = 'failed',
		    error_message = $1,
		    updated_at = $2
		WHERE campaign_id = $3 AND phase_type = $4`

	result, err := exec.ExecContext(ctx, query, errorMessage, now, campaignID, phaseType)
	if err != nil {
		return fmt.Errorf("failed to fail phase %s for campaign %s: %w", phaseType, campaignID, err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("no phase %s found for campaign %s", phaseType, campaignID)
	}

	log.Printf("Failed phase %s for campaign %s: %s", phaseType, campaignID, errorMessage)
	return nil
}

// Campaign state operations - TODO: Implement proper functionality
func (s *campaignStorePostgres) CreateCampaignState(ctx context.Context, exec store.Querier, state *models.CampaignState) error {
	if exec == nil {
		exec = s.db
	}
	if state == nil {
		return fmt.Errorf("state is nil")
	}
	query := `
		INSERT INTO campaign_states (campaign_id, current_state, mode, configuration, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		ON CONFLICT (campaign_id) DO UPDATE SET
			current_state = EXCLUDED.current_state,
			mode = EXCLUDED.mode,
			configuration = EXCLUDED.configuration,
			version = EXCLUDED.version,
			updated_at = NOW()
	`
	_, err := exec.ExecContext(ctx, query,
		state.CampaignID, state.CurrentState, state.Mode, state.Configuration, state.Version,
	)
	if err != nil {
		return fmt.Errorf("CreateCampaignState failed: %w", err)
	}
	return nil
}

func (s *campaignStorePostgres) GetCampaignState(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.CampaignState, error) {
	if exec == nil {
		exec = s.db
	}
	query := `
		SELECT campaign_id, current_state, mode, configuration, version, created_at, updated_at
		FROM campaign_states WHERE campaign_id = $1`
	var state models.CampaignState
	if err := exec.GetContext(ctx, &state, query, campaignID); err != nil {
		if err == sql.ErrNoRows {
			return nil, store.ErrNotFound
		}
		return nil, fmt.Errorf("GetCampaignState failed: %w", err)
	}
	return &state, nil
}

func (s *campaignStorePostgres) UpdateCampaignState(ctx context.Context, exec store.Querier, state *models.CampaignState) error {
	if exec == nil {
		exec = s.db
	}
	if state == nil {
		return fmt.Errorf("state is nil")
	}
	query := `
		UPDATE campaign_states
		SET current_state = $1,
			mode = $2,
			configuration = $3,
			version = $4,
			updated_at = NOW()
		WHERE campaign_id = $5`
	res, err := exec.ExecContext(ctx, query, state.CurrentState, state.Mode, state.Configuration, state.Version, state.CampaignID)
	if err != nil {
		return fmt.Errorf("UpdateCampaignState failed: %w", err)
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return store.ErrNotFound
	}
	return nil
}

func (s *campaignStorePostgres) DeleteCampaignState(ctx context.Context, exec store.Querier, campaignID uuid.UUID) error {
	if exec == nil {
		exec = s.db
	}
	query := `DELETE FROM campaign_states WHERE campaign_id = $1`
	res, err := exec.ExecContext(ctx, query, campaignID)
	if err != nil {
		return fmt.Errorf("DeleteCampaignState failed: %w", err)
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return store.ErrNotFound
	}
	return nil
}

// Phase execution operations - TODO: Implement proper functionality
func (s *campaignStorePostgres) CreatePhaseExecution(ctx context.Context, exec store.Querier, execution *models.PhaseExecution) error {
	if exec == nil {
		exec = s.db
	}
	if execution == nil {
		return fmt.Errorf("execution is nil")
	}
	// Ensure ID
	if execution.ID == uuid.Nil {
		execution.ID = uuid.New()
	}
	query := `
		INSERT INTO phase_executions (
			id, campaign_id, phase_type, status, started_at, completed_at, paused_at, failed_at,
			progress_percentage, total_items, processed_items, successful_items, failed_items,
			configuration, error_details, metrics, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13,
			$14, $15, $16, NOW(), NOW()
		) ON CONFLICT (campaign_id, phase_type) DO UPDATE SET
			status = EXCLUDED.status,
			started_at = COALESCE(EXCLUDED.started_at, phase_executions.started_at),
			completed_at = COALESCE(EXCLUDED.completed_at, phase_executions.completed_at),
			paused_at = COALESCE(EXCLUDED.paused_at, phase_executions.paused_at),
			failed_at = COALESCE(EXCLUDED.failed_at, phase_executions.failed_at),
			progress_percentage = EXCLUDED.progress_percentage,
			total_items = EXCLUDED.total_items,
			processed_items = EXCLUDED.processed_items,
			successful_items = EXCLUDED.successful_items,
			failed_items = EXCLUDED.failed_items,
			configuration = COALESCE(EXCLUDED.configuration, phase_executions.configuration),
			error_details = COALESCE(EXCLUDED.error_details, phase_executions.error_details),
			metrics = COALESCE(EXCLUDED.metrics, phase_executions.metrics),
			updated_at = NOW()`
	_, err := exec.ExecContext(ctx, query,
		execution.ID, execution.CampaignID, execution.PhaseType, execution.Status,
		execution.StartedAt, execution.CompletedAt, execution.PausedAt, execution.FailedAt,
		execution.ProgressPercentage, execution.TotalItems, execution.ProcessedItems, execution.SuccessfulItems, execution.FailedItems,
		execution.Configuration, execution.ErrorDetails, execution.Metrics,
	)
	if err != nil {
		return fmt.Errorf("CreatePhaseExecution failed: %w", err)
	}
	return nil
}

func (s *campaignStorePostgres) GetPhaseExecution(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) (*models.PhaseExecution, error) {
	if exec == nil {
		exec = s.db
	}
	query := `
		SELECT id, campaign_id, phase_type, status, started_at, completed_at, paused_at, failed_at,
			   progress_percentage, total_items, processed_items, successful_items, failed_items,
			   configuration, error_details, metrics, created_at, updated_at
		FROM phase_executions WHERE campaign_id = $1 AND phase_type = $2`
	var pe models.PhaseExecution
	if err := exec.GetContext(ctx, &pe, query, campaignID, phaseType); err != nil {
		if err == sql.ErrNoRows {
			return nil, store.ErrNotFound
		}
		return nil, fmt.Errorf("GetPhaseExecution failed: %w", err)
	}
	return &pe, nil
}

func (s *campaignStorePostgres) GetPhaseExecutionsByCampaign(ctx context.Context, exec store.Querier, campaignID uuid.UUID) ([]*models.PhaseExecution, error) {
	if exec == nil {
		exec = s.db
	}
	query := `
		SELECT id, campaign_id, phase_type, status, started_at, completed_at, paused_at, failed_at,
			   progress_percentage, total_items, processed_items, successful_items, failed_items,
			   configuration, error_details, metrics, created_at, updated_at
		FROM phase_executions WHERE campaign_id = $1 ORDER BY created_at ASC`
	var list []*models.PhaseExecution
	if err := exec.SelectContext(ctx, &list, query, campaignID); err != nil {
		return nil, fmt.Errorf("GetPhaseExecutionsByCampaign failed: %w", err)
	}
	return list, nil
}

func (s *campaignStorePostgres) UpdatePhaseExecution(ctx context.Context, exec store.Querier, execution *models.PhaseExecution) error {
	if exec == nil {
		exec = s.db
	}
	if execution == nil || execution.ID == uuid.Nil {
		return fmt.Errorf("execution or execution.ID is nil")
	}
	query := `
		UPDATE phase_executions SET
			status = $1,
			started_at = $2,
			completed_at = $3,
			paused_at = $4,
			failed_at = $5,
			progress_percentage = $6,
			total_items = $7,
			processed_items = $8,
			successful_items = $9,
			failed_items = $10,
			configuration = $11,
			error_details = $12,
			metrics = $13,
			updated_at = NOW()
		WHERE id = $14`
	res, err := exec.ExecContext(ctx, query,
		execution.Status,
		execution.StartedAt,
		execution.CompletedAt,
		execution.PausedAt,
		execution.FailedAt,
		execution.ProgressPercentage,
		execution.TotalItems,
		execution.ProcessedItems,
		execution.SuccessfulItems,
		execution.FailedItems,
		execution.Configuration,
		execution.ErrorDetails,
		execution.Metrics,
		execution.ID,
	)
	if err != nil {
		return fmt.Errorf("UpdatePhaseExecution failed: %w", err)
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return store.ErrNotFound
	}
	return nil
}

func (s *campaignStorePostgres) DeletePhaseExecution(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	if exec == nil {
		exec = s.db
	}
	query := `DELETE FROM phase_executions WHERE id = $1`
	res, err := exec.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("DeletePhaseExecution failed: %w", err)
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return store.ErrNotFound
	}
	return nil
}

func (s *campaignStorePostgres) GetCampaignStateWithExecutions(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (*models.CampaignStateWithExecution, error) {
	if exec == nil {
		exec = s.db
	}
	state, err := s.GetCampaignState(ctx, exec, campaignID)
	if err != nil {
		return nil, err
	}
	execs, err := s.GetPhaseExecutionsByCampaign(ctx, exec, campaignID)
	if err != nil {
		return nil, err
	}
	result := &models.CampaignStateWithExecution{
		CampaignState:   *state,
		PhaseExecutions: make([]models.PhaseExecution, 0, len(execs)),
	}
	for _, pe := range execs {
		if pe != nil {
			result.PhaseExecutions = append(result.PhaseExecutions, *pe)
		}
	}
	return result, nil
}

// UpsertPhaseConfig stores or updates explicit user configuration for a phase.
func (s *campaignStorePostgres) UpsertPhaseConfig(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, config json.RawMessage) error {
	if exec == nil {
		exec = s.db
	}
	query := `INSERT INTO phase_configurations (campaign_id, phase, config, updated_at)
			  VALUES ($1, $2, $3, NOW())
			  ON CONFLICT (campaign_id, phase) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`
	if _, err := exec.ExecContext(ctx, query, campaignID, string(phaseType), config); err != nil {
		return fmt.Errorf("UpsertPhaseConfig failed: %w", err)
	}
	return nil
}

// GetPhaseConfig retrieves stored configuration JSON for a phase.
func (s *campaignStorePostgres) GetPhaseConfig(ctx context.Context, exec store.Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) (*json.RawMessage, error) {
	if exec == nil {
		exec = s.db
	}
	query := `SELECT config FROM phase_configurations WHERE campaign_id = $1 AND phase = $2`
	var raw json.RawMessage
	if err := exec.GetContext(ctx, &raw, query, campaignID, string(phaseType)); err != nil {
		if err == sql.ErrNoRows {
			return nil, store.ErrNotFound
		}
		return nil, fmt.Errorf("GetPhaseConfig failed: %w", err)
	}
	return &raw, nil
}

// ListPhaseConfigs returns a map of phaseType -> config JSON for a campaign.
func (s *campaignStorePostgres) ListPhaseConfigs(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (map[models.PhaseTypeEnum]json.RawMessage, error) {
	if exec == nil {
		exec = s.db
	}
	query := `SELECT phase, config FROM phase_configurations WHERE campaign_id = $1`
	rows := []struct {
		Phase  string          `json:"phase"`
		Config json.RawMessage `json:"config"`
	}{}
	if err := exec.SelectContext(ctx, &rows, query, campaignID); err != nil {
		return nil, fmt.Errorf("ListPhaseConfigs failed: %w", err)
	}
	out := make(map[models.PhaseTypeEnum]json.RawMessage, len(rows))
	for _, r := range rows {
		out[models.PhaseTypeEnum(r.Phase)] = r.Config
	}
	return out, nil
}

// UpdateCampaignMode sets the campaign execution mode in campaign_states (creating state row if missing).
func (s *campaignStorePostgres) UpdateCampaignMode(ctx context.Context, exec store.Querier, campaignID uuid.UUID, mode string) error {
	if exec == nil {
		exec = s.db
	}
	// Upsert into campaign_states; preserve existing current_state & configuration/version if row exists
	query := `INSERT INTO campaign_states (campaign_id, current_state, mode, configuration, version, created_at, updated_at)
			  VALUES ($1, 'draft', $2, '{}'::jsonb, 1, NOW(), NOW())
			  ON CONFLICT (campaign_id) DO UPDATE SET mode = EXCLUDED.mode, updated_at = NOW()`
	if _, err := exec.ExecContext(ctx, query, campaignID, mode); err != nil {
		return fmt.Errorf("UpdateCampaignMode failed: %w", err)
	}
	return nil
}

// GetCampaignMode fetches the current execution mode from campaign_states.
func (s *campaignStorePostgres) GetCampaignMode(ctx context.Context, exec store.Querier, campaignID uuid.UUID) (string, error) {
	if exec == nil {
		exec = s.db
	}
	var mode string
	q := `SELECT mode FROM campaign_states WHERE campaign_id = $1`
	if err := exec.GetContext(ctx, &mode, q, campaignID); err != nil {
		if err == sql.ErrNoRows {
			return "step_by_step", nil // default behavior if not set
		}
		return "", fmt.Errorf("GetCampaignMode failed: %w", err)
	}
	return mode, nil
}

var _ store.CampaignStore = (*campaignStorePostgres)(nil)
