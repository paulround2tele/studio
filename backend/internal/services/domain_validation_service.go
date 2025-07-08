// File: backend/internal/services/domain_validation_service.go
package services

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// DomainValidationService handles DNS and HTTP validation by updating domain statuses in-place
// instead of creating separate validation campaigns
type DomainValidationService interface {
	StartDNSValidation(ctx context.Context, campaignID uuid.UUID, personaIDs []uuid.UUID) error
	StartHTTPValidation(ctx context.Context, campaignID uuid.UUID, personaIDs []uuid.UUID, keywordSetIDs []uuid.UUID) error
	UpdateDomainDNSStatus(ctx context.Context, domainID uuid.UUID, status models.DomainDNSStatusEnum, ip *string) error
	UpdateDomainHTTPStatus(ctx context.Context, domainID uuid.UUID, status models.DomainHTTPStatusEnum, statusCode *int32, leadScore *float64) error
	GetDomainValidationStatus(ctx context.Context, campaignID uuid.UUID, limit int, offset int64) (*DomainValidationStatusResponse, error)
}

type DomainValidationStatusResponse struct {
	Data        []models.GeneratedDomain `json:"data"`
	NextOffset  int64                    `json:"nextOffset"`
	TotalCount  int64                    `json:"totalCount"`
	DNSStats    ValidationStats          `json:"dnsStats"`
	HTTPStats   ValidationStats          `json:"httpStats"`
}

type ValidationStats struct {
	Pending int64 `json:"pending"`
	OK      int64 `json:"ok"`
	Error   int64 `json:"error"`
	Timeout int64 `json:"timeout"`
}

type domainValidationServiceImpl struct {
	db            *sqlx.DB
	campaignStore store.CampaignStore
	personaStore  store.PersonaStore
}

func NewDomainValidationService(
	db *sqlx.DB,
	campaignStore store.CampaignStore,
	personaStore store.PersonaStore,
) DomainValidationService {
	return &domainValidationServiceImpl{
		db:            db,
		campaignStore: campaignStore,
		personaStore:  personaStore,
	}
}

// StartDNSValidation initiates DNS validation for all domains in a campaign
// by updating their dns_status to 'pending' and triggering validation jobs
func (s *domainValidationServiceImpl) StartDNSValidation(ctx context.Context, campaignID uuid.UUID, personaIDs []uuid.UUID) error {
	log.Printf("[INFO] Starting DNS validation for campaign %s with personas %v", campaignID, personaIDs)
	
	var querier store.Querier = s.db
	
	// Verify campaign exists and is a domain generation campaign
	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
	}
	
	if campaign.CampaignType != models.CampaignTypeDomainGeneration {
		return fmt.Errorf("campaign %s is not a domain generation campaign, got %s", campaignID, campaign.CampaignType)
	}
	
	if campaign.Status != models.CampaignStatusCompleted {
		return fmt.Errorf("campaign %s must be completed before starting DNS validation, current status: %s", campaignID, campaign.Status)
	}
	
	// Verify personas exist and are DNS personas
	for _, personaID := range personaIDs {
		persona, err := s.personaStore.GetPersonaByID(ctx, querier, personaID)
		if err != nil {
			return fmt.Errorf("failed to get persona %s: %w", personaID, err)
		}
		if persona.PersonaType != models.PersonaTypeDNS {
			return fmt.Errorf("persona %s is not a DNS persona, got %s", personaID, persona.PersonaType)
		}
	}
	
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		} else {
			tx.Commit()
		}
	}()
	
	// Update all domains in the campaign to have DNS status 'pending'
	updateQuery := `
		UPDATE generated_domains 
		SET dns_status = $1, last_validated_at = $2
		WHERE domain_generation_campaign_id = $3 
		AND (dns_status IS NULL OR dns_status != $1)
	`
	
	result, err := tx.ExecContext(ctx, updateQuery, 
		models.DomainDNSStatusPending, 
		time.Now().UTC(), 
		campaignID)
	if err != nil {
		return fmt.Errorf("failed to update domain DNS status to pending: %w", err)
	}
	
	rowsAffected, _ := result.RowsAffected()
	log.Printf("[INFO] Updated %d domains to DNS status 'pending' for campaign %s", rowsAffected, campaignID)
	
	// TODO: Queue DNS validation jobs for the domains
	// This would typically involve:
	// 1. Querying domains with dns_status = 'pending' 
	// 2. Creating validation jobs for DNS resolution
	// 3. The jobs would update dns_status and dns_ip when complete
	
	log.Printf("[SUCCESS] DNS validation started for campaign %s", campaignID)
	return nil
}

// StartHTTPValidation initiates HTTP validation for domains that have successful DNS validation
func (s *domainValidationServiceImpl) StartHTTPValidation(ctx context.Context, campaignID uuid.UUID, personaIDs []uuid.UUID, keywordSetIDs []uuid.UUID) error {
	log.Printf("[INFO] Starting HTTP validation for campaign %s with personas %v", campaignID, personaIDs)
	
	var querier store.Querier = s.db
	
	// Verify campaign exists and is a domain generation campaign
	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
	}
	
	if campaign.CampaignType != models.CampaignTypeDomainGeneration {
		return fmt.Errorf("campaign %s is not a domain generation campaign, got %s", campaignID, campaign.CampaignType)
	}
	
	// Verify personas exist and are HTTP personas
	for _, personaID := range personaIDs {
		persona, err := s.personaStore.GetPersonaByID(ctx, querier, personaID)
		if err != nil {
			return fmt.Errorf("failed to get persona %s: %w", personaID, err)
		}
		if persona.PersonaType != models.PersonaTypeHTTP {
			return fmt.Errorf("persona %s is not an HTTP persona, got %s", personaID, persona.PersonaType)
		}
	}
	
	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		} else {
			tx.Commit()
		}
	}()
	
	// Update domains that have successful DNS validation to HTTP status 'pending'
	updateQuery := `
		UPDATE generated_domains 
		SET http_status = $1, last_validated_at = $2
		WHERE domain_generation_campaign_id = $3 
		AND dns_status = $4
		AND (http_status IS NULL OR http_status != $1)
	`
	
	result, err := tx.ExecContext(ctx, updateQuery, 
		models.DomainHTTPStatusPending, 
		time.Now().UTC(), 
		campaignID,
		models.DomainDNSStatusOK)
	if err != nil {
		return fmt.Errorf("failed to update domain HTTP status to pending: %w", err)
	}
	
	rowsAffected, _ := result.RowsAffected()
	log.Printf("[INFO] Updated %d domains to HTTP status 'pending' for campaign %s", rowsAffected, campaignID)
	
	// TODO: Queue HTTP validation jobs for the domains
	// This would typically involve:
	// 1. Querying domains with http_status = 'pending' and dns_status = 'ok'
	// 2. Creating validation jobs for HTTP requests and keyword analysis
	// 3. The jobs would update http_status, http_status_code, and lead_score when complete
	
	log.Printf("[SUCCESS] HTTP validation started for campaign %s", campaignID)
	return nil
}

// UpdateDomainDNSStatus updates the DNS validation status for a specific domain
func (s *domainValidationServiceImpl) UpdateDomainDNSStatus(ctx context.Context, domainID uuid.UUID, status models.DomainDNSStatusEnum, ip *string) error {
	var querier store.Querier = s.db
	
	updateQuery := `
		UPDATE generated_domains 
		SET dns_status = $1, dns_ip = $2, last_validated_at = $3
		WHERE id = $4
	`
	
	var ipValue sql.NullString
	if ip != nil {
		ipValue = sql.NullString{String: *ip, Valid: true}
	}
	
	_, err := querier.ExecContext(ctx, updateQuery, status, ipValue, time.Now().UTC(), domainID)
	if err != nil {
		return fmt.Errorf("failed to update DNS status for domain %s: %w", domainID, err)
	}
	
	log.Printf("[INFO] Updated domain %s DNS status to %s", domainID, status)
	return nil
}

// UpdateDomainHTTPStatus updates the HTTP validation status for a specific domain
func (s *domainValidationServiceImpl) UpdateDomainHTTPStatus(ctx context.Context, domainID uuid.UUID, status models.DomainHTTPStatusEnum, statusCode *int32, leadScore *float64) error {
	var querier store.Querier = s.db
	
	updateQuery := `
		UPDATE generated_domains 
		SET http_status = $1, http_status_code = $2, lead_score = $3, last_validated_at = $4
		WHERE id = $5
	`
	
	var statusCodeValue sql.NullInt32
	if statusCode != nil {
		statusCodeValue = sql.NullInt32{Int32: *statusCode, Valid: true}
	}
	
	var leadScoreValue sql.NullFloat64
	if leadScore != nil {
		leadScoreValue = sql.NullFloat64{Float64: *leadScore, Valid: true}
	}
	
	_, err := querier.ExecContext(ctx, updateQuery, status, statusCodeValue, leadScoreValue, time.Now().UTC(), domainID)
	if err != nil {
		return fmt.Errorf("failed to update HTTP status for domain %s: %w", domainID, err)
	}
	
	log.Printf("[INFO] Updated domain %s HTTP status to %s", domainID, status)
	return nil
}

// GetDomainValidationStatus retrieves domains with their validation statuses for a campaign
func (s *domainValidationServiceImpl) GetDomainValidationStatus(ctx context.Context, campaignID uuid.UUID, limit int, offset int64) (*DomainValidationStatusResponse, error) {
	// Get domains with pagination using SelectContext
	domainsQuery := `
		SELECT id, domain_generation_campaign_id, domain_name, offset_index, generated_at,
		       source_keyword, source_pattern, tld, created_at,
		       dns_status, dns_ip, http_status, http_status_code, lead_score, last_validated_at
		FROM generated_domains
		WHERE domain_generation_campaign_id = $1
		ORDER BY offset_index
		LIMIT $2 OFFSET $3
	`
	
	var domainsRows []struct {
		ID                   uuid.UUID       `db:"id"`
		GenerationCampaignID uuid.UUID       `db:"domain_generation_campaign_id"`
		DomainName           string          `db:"domain_name"`
		OffsetIndex          int64           `db:"offset_index"`
		GeneratedAt          time.Time       `db:"generated_at"`
		SourceKeyword        sql.NullString  `db:"source_keyword"`
		SourcePattern        sql.NullString  `db:"source_pattern"`
		TLD                  sql.NullString  `db:"tld"`
		CreatedAt            time.Time       `db:"created_at"`
		DNSStatus            sql.NullString  `db:"dns_status"`
		DNSIP                sql.NullString  `db:"dns_ip"`
		HTTPStatus           sql.NullString  `db:"http_status"`
		HTTPStatusCode       sql.NullInt32   `db:"http_status_code"`
		LeadScore            sql.NullFloat64 `db:"lead_score"`
		LastValidatedAt      sql.NullTime    `db:"last_validated_at"`
	}
	
	err := s.db.SelectContext(ctx, &domainsRows, domainsQuery, campaignID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query domains: %w", err)
	}
	
	var domains []models.GeneratedDomain
	for _, row := range domainsRows {
		domain := models.GeneratedDomain{
			ID:                   row.ID,
			GenerationCampaignID: row.GenerationCampaignID,
			DomainName:           row.DomainName,
			OffsetIndex:          row.OffsetIndex,
			GeneratedAt:          row.GeneratedAt,
			SourceKeyword:        row.SourceKeyword,
			SourcePattern:        row.SourcePattern,
			TLD:                  row.TLD,
			CreatedAt:            row.CreatedAt,
			DNSIP:                row.DNSIP,
			HTTPStatusCode:       row.HTTPStatusCode,
			LeadScore:            row.LeadScore,
			LastValidatedAt:      row.LastValidatedAt,
		}
		
		// Convert nullable strings to enum pointers
		if row.DNSStatus.Valid {
			status := models.DomainDNSStatusEnum(row.DNSStatus.String)
			domain.DNSStatus = &status
		}
		if row.HTTPStatus.Valid {
			status := models.DomainHTTPStatusEnum(row.HTTPStatus.String)
			domain.HTTPStatus = &status
		}
		
		domains = append(domains, domain)
	}
	
	// Get total count using GetContext
	countQuery := `SELECT COUNT(*) FROM generated_domains WHERE domain_generation_campaign_id = $1`
	var totalCount int64
	err = s.db.GetContext(ctx, &totalCount, countQuery, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to count domains: %w", err)
	}
	
	// Get DNS status statistics using SelectContext
	dnsStatsQuery := `
		SELECT
			COALESCE(dns_status, 'pending') as status,
			COUNT(*) as count
		FROM generated_domains
		WHERE domain_generation_campaign_id = $1
		GROUP BY dns_status
	`
	
	var dnsStatsRows []struct {
		Status string `db:"status"`
		Count  int64  `db:"count"`
	}
	
	err = s.db.SelectContext(ctx, &dnsStatsRows, dnsStatsQuery, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to query DNS stats: %w", err)
	}
	
	dnsStats := ValidationStats{}
	for _, row := range dnsStatsRows {
		switch row.Status {
		case "pending":
			dnsStats.Pending = row.Count
		case "ok":
			dnsStats.OK = row.Count
		case "error":
			dnsStats.Error = row.Count
		case "timeout":
			dnsStats.Timeout = row.Count
		}
	}
	
	// Get HTTP status statistics using SelectContext
	httpStatsQuery := `
		SELECT
			COALESCE(http_status, 'pending') as status,
			COUNT(*) as count
		FROM generated_domains
		WHERE domain_generation_campaign_id = $1
		GROUP BY http_status
	`
	
	var httpStatsRows []struct {
		Status string `db:"status"`
		Count  int64  `db:"count"`
	}
	
	err = s.db.SelectContext(ctx, &httpStatsRows, httpStatsQuery, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to query HTTP stats: %w", err)
	}
	
	httpStats := ValidationStats{}
	for _, row := range httpStatsRows {
		switch row.Status {
		case "pending":
			httpStats.Pending = row.Count
		case "ok":
			httpStats.OK = row.Count
		case "error":
			httpStats.Error = row.Count
		case "timeout":
			httpStats.Timeout = row.Count
		}
	}
	
	nextOffset := int64(0)
	if len(domains) == limit {
		nextOffset = offset + int64(limit)
	}
	
	return &DomainValidationStatusResponse{
		Data:       domains,
		NextOffset: nextOffset,
		TotalCount: totalCount,
		DNSStats:   dnsStats,
		HTTPStats:  httpStats,
	}, nil
}