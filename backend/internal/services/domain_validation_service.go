// File: backend/internal/services/domain_validation_service.go
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// DomainValidationService provides domain-specific business logic validation
type DomainValidationService struct {
	db *sqlx.DB
}

// NewDomainValidationService creates a new domain validation service
func NewDomainValidationService(db *sqlx.DB) *DomainValidationService {
	return &DomainValidationService{
		db: db,
	}
}

// ValidationResult represents the result of domain validation
type ValidationResult struct {
	IsValid      bool                   `json:"isValid"`
	Violations   []ValidationViolation  `json:"violations,omitempty"`
	Warnings     []ValidationWarning    `json:"warnings,omitempty"`
	Context      map[string]interface{} `json:"context,omitempty"`
	RequestID    string                 `json:"requestId,omitempty"`
	ValidatedAt  time.Time              `json:"validatedAt"`
}

// ValidationViolation represents a business logic validation violation
type ValidationViolation struct {
	Field       string                 `json:"field"`
	Code        string                 `json:"code"`
	Message     string                 `json:"message"`
	Severity    string                 `json:"severity"`
	Context     map[string]interface{} `json:"context,omitempty"`
}

// ValidationWarning represents a business logic validation warning
type ValidationWarning struct {
	Field       string                 `json:"field"`
	Code        string                 `json:"code"`
	Message     string                 `json:"message"`
	Context     map[string]interface{} `json:"context,omitempty"`
}

// ValidateCampaignCreation validates campaign creation with business logic
func (s *DomainValidationService) ValidateCampaignCreation(ctx context.Context, req CreateCampaignRequest, userID uuid.UUID) (*ValidationResult, error) {
	result := &ValidationResult{
		IsValid:     true,
		Violations:  []ValidationViolation{},
		Warnings:    []ValidationWarning{},
		Context:     make(map[string]interface{}),
		RequestID:   uuid.New().String(),
		ValidatedAt: time.Now(),
	}

	// Use PostgreSQL validation function for atomic validation
	if err := s.validateWithPostgreSQL(ctx, "campaign", "name", req.Name, result); err != nil {
		return nil, fmt.Errorf("failed to validate campaign name: %w", err)
	}

	if err := s.validateWithPostgreSQL(ctx, "campaign", "campaignType", req.CampaignType, result); err != nil {
		return nil, fmt.Errorf("failed to validate campaign type: %w", err)
	}

	// Validate user permissions for campaign creation
	if err := s.validateUserCampaignLimits(ctx, userID, result); err != nil {
		return nil, fmt.Errorf("failed to validate user campaign limits: %w", err)
	}

	// Campaign type-specific validation
	switch req.CampaignType {
	case "domain_generation":
		s.validateDomainGenerationParams(ctx, req.DomainGenerationParams, result)
		// Validate nested parameters with PostgreSQL rules
		if req.DomainGenerationParams != nil {
			if err := s.validateWithPostgreSQL(ctx, "campaign", "variableLength", req.DomainGenerationParams.VariableLength, result); err != nil {
				return nil, fmt.Errorf("failed to validate variable length: %w", err)
			}
			if err := s.validateWithPostgreSQL(ctx, "campaign", "numDomainsToGenerate", req.DomainGenerationParams.NumDomainsToGenerate, result); err != nil {
				return nil, fmt.Errorf("failed to validate domain count: %w", err)
			}
			if err := s.validateWithPostgreSQL(ctx, "campaign", "characterSet", req.DomainGenerationParams.CharacterSet, result); err != nil {
				return nil, fmt.Errorf("failed to validate character set: %w", err)
			}
			if err := s.validateWithPostgreSQL(ctx, "campaign", "tld", req.DomainGenerationParams.TLD, result); err != nil {
				return nil, fmt.Errorf("failed to validate TLD: %w", err)
			}
		}
	case "dns_validation":
		s.validateDNSValidationParams(ctx, req.DnsValidationParams, result)
	case "http_keyword_validation":
		s.validateHTTPKeywordParams(ctx, req.HttpKeywordParams, result)
	}

	// Check if any violations make the request invalid
	for _, violation := range result.Violations {
		if violation.Severity == "error" || violation.Severity == "critical" {
			result.IsValid = false
			break
		}
	}

	return result, nil
}

// validateWithPostgreSQL uses the PostgreSQL validation function for atomic validation
func (s *DomainValidationService) validateWithPostgreSQL(ctx context.Context, entityType, fieldName string, fieldValue interface{}, result *ValidationResult) error {
	query := `SELECT validate_input_field($1, $2, $3, $4)`
	
	// Convert field value to string
	valueStr := fmt.Sprintf("%v", fieldValue)

	var validationResultJSON json.RawMessage
	err := s.db.QueryRowContext(ctx, query, "/api/campaigns", "POST", fieldName, valueStr).
		Scan(&validationResultJSON)
	
	if err != nil {
		return fmt.Errorf("failed to execute validation function: %w", err)
	}

	// Parse the JSONB result
	var validationData struct {
		Valid       bool   `json:"valid"`
		ErrorType   string `json:"error_type"`
		ErrorMessage string `json:"error_message"`
		Severity    string `json:"severity"`
		Message     string `json:"message"`
	}

	if err := json.Unmarshal(validationResultJSON, &validationData); err != nil {
		return fmt.Errorf("failed to parse validation result: %w", err)
	}

	if !validationData.Valid {
		severity := "error"
		if validationData.Severity != "" {
			severity = validationData.Severity
		}
		
		errorMessage := validationData.ErrorMessage
		if errorMessage == "" {
			errorMessage = "Validation failed"
		}

		result.Violations = append(result.Violations, ValidationViolation{
			Field:    fieldName,
			Code:     validationData.ErrorType,
			Message:  errorMessage,
			Severity: severity,
		})
	}

	return nil
}

// validateUserCampaignLimits validates user-specific campaign creation limits
func (s *DomainValidationService) validateUserCampaignLimits(ctx context.Context, userID uuid.UUID, result *ValidationResult) error {
	// Check if campaigns table exists
	var tableExists bool
	tableCheckQuery := `
		SELECT EXISTS (
			SELECT FROM information_schema.tables
			WHERE table_name = 'campaigns'
		)
	`
	
	if err := s.db.GetContext(ctx, &tableExists, tableCheckQuery); err != nil {
		return fmt.Errorf("failed to check if campaigns table exists: %w", err)
	}
	
	// If campaigns table doesn't exist, skip validation (early development phase)
	if !tableExists {
		result.Context["user_active_campaigns"] = 0
		result.Context["user_daily_campaigns"] = 0
		return nil
	}
	
	// Check active campaign count
	var activeCampaignCount int
	query := `
		SELECT COUNT(*)
		FROM campaigns
		WHERE user_id = $1
		AND status IN ('pending', 'queued', 'running', 'paused')
	`
	
	if err := s.db.GetContext(ctx, &activeCampaignCount, query, userID); err != nil {
		return fmt.Errorf("failed to check active campaign count: %w", err)
	}

	// Business rule: Max 10 active campaigns per user
	maxActiveCampaigns := 10
	if activeCampaignCount >= maxActiveCampaigns {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "user_id",
			Code:     "max_active_campaigns_exceeded",
			Message:  fmt.Sprintf("Maximum active campaigns exceeded (%d/%d)", activeCampaignCount, maxActiveCampaigns),
			Severity: "error",
			Context: map[string]interface{}{
				"current_count": activeCampaignCount,
				"limit":         maxActiveCampaigns,
			},
		})
	}

	// Check campaign creation rate limit (last 24 hours)
	var recentCampaignCount int
	rateQuery := `
		SELECT COUNT(*) 
		FROM campaigns 
		WHERE user_id = $1 
		AND created_at >= NOW() - INTERVAL '24 hours'
	`
	
	if err := s.db.GetContext(ctx, &recentCampaignCount, rateQuery, userID); err != nil {
		return fmt.Errorf("failed to check recent campaign count: %w", err)
	}

	// Business rule: Max 50 campaigns per day per user
	maxDailyCampaigns := 50
	if recentCampaignCount >= maxDailyCampaigns {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "user_id",
			Code:     "daily_campaign_limit_exceeded",
			Message:  fmt.Sprintf("Daily campaign creation limit exceeded (%d/%d)", recentCampaignCount, maxDailyCampaigns),
			Severity: "error",
			Context: map[string]interface{}{
				"current_count": recentCampaignCount,
				"limit":         maxDailyCampaigns,
			},
		})
	}

	result.Context["user_active_campaigns"] = activeCampaignCount
	result.Context["user_daily_campaigns"] = recentCampaignCount

	return nil
}

// validateDomainGenerationParams validates domain generation specific parameters
func (s *DomainValidationService) validateDomainGenerationParams(ctx context.Context, params *DomainGenerationParams, result *ValidationResult) {
	if params == nil {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "domainGenerationParams",
			Code:     "missing_required_params",
			Message:  "Domain generation parameters are required",
			Severity: "error",
		})
		return
	}

	// Validate character set
	s.validateCharacterSet(params.CharacterSet, result)
	
	// Validate domain generation limits
	s.validateDomainGenerationLimits(ctx, params, result)
	
	// Validate TLD format
	s.validateTLD(params.TLD, result)
	
	// Validate constant string for potential conflicts
	s.validateConstantString(params.ConstantString, result)
}

// validateCharacterSet validates the character set for domain generation
func (s *DomainValidationService) validateCharacterSet(characterSet string, result *ValidationResult) {
	// Business rule: Character set must contain only valid domain characters
	validChars := regexp.MustCompile(`^[a-zA-Z0-9-]+$`)
	if !validChars.MatchString(characterSet) {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "characterSet",
			Code:     "invalid_character_set",
			Message:  "Character set contains invalid domain characters",
			Severity: "error",
			Context: map[string]interface{}{
				"provided_set": characterSet,
				"valid_pattern": "a-zA-Z0-9-",
			},
		})
	}

	// Business rule: Avoid consecutive hyphens
	if strings.Contains(characterSet, "--") {
		result.Warnings = append(result.Warnings, ValidationWarning{
			Field:   "characterSet",
			Code:    "consecutive_hyphens",
			Message: "Character set contains consecutive hyphens which may create invalid domains",
			Context: map[string]interface{}{
				"character_set": characterSet,
			},
		})
	}
}

// validateDomainGenerationLimits validates domain generation quantity limits
func (s *DomainValidationService) validateDomainGenerationLimits(ctx context.Context, params *DomainGenerationParams, result *ValidationResult) {
	// Calculate theoretical maximum domains
	charSetLength := len(params.CharacterSet)
	if charSetLength == 0 {
		return
	}

	var theoreticalMax int64 = 1
	for i := 0; i < params.VariableLength; i++ {
		if theoreticalMax > (1<<63-1)/int64(charSetLength) { // Prevent overflow
			theoreticalMax = 1<<63 - 1
			break
		}
		theoreticalMax *= int64(charSetLength)
	}

	// Business rule: Don't generate more domains than theoretically possible
	if params.NumDomainsToGenerate > theoreticalMax {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "numDomainsToGenerate",
			Code:     "exceeds_theoretical_maximum",
			Message:  fmt.Sprintf("Requested domains (%d) exceeds theoretical maximum (%d)", params.NumDomainsToGenerate, theoreticalMax),
			Severity: "error",
			Context: map[string]interface{}{
				"requested":         params.NumDomainsToGenerate,
				"theoretical_max":   theoreticalMax,
				"character_set_len": charSetLength,
				"variable_length":   params.VariableLength,
			},
		})
	}

	// Business rule: Warn for very large generation requests
	if params.NumDomainsToGenerate > 10000 {
		result.Warnings = append(result.Warnings, ValidationWarning{
			Field:   "numDomainsToGenerate",
			Code:    "large_generation_request",
			Message: fmt.Sprintf("Large domain generation request (%d domains) may impact performance", params.NumDomainsToGenerate),
			Context: map[string]interface{}{
				"requested_count": params.NumDomainsToGenerate,
			},
		})
	}

	result.Context["theoretical_max_domains"] = theoreticalMax
}

// validateTLD validates top-level domain format
func (s *DomainValidationService) validateTLD(tld string, result *ValidationResult) {
	// Strip leading dot if present
	cleanTLD := strings.TrimPrefix(tld, ".")
	
	// Business rule: TLD must be valid format
	tldPattern := regexp.MustCompile(`^[a-zA-Z]{2,}$`)
	if !tldPattern.MatchString(cleanTLD) {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "tld",
			Code:     "invalid_tld_format",
			Message:  "TLD must contain only letters and be at least 2 characters",
			Severity: "error",
			Context: map[string]interface{}{
				"provided_tld": tld,
			},
		})
	}

	// Business rule: Warn about uncommon TLDs
	commonTLDs := []string{"com", "org", "net", "edu", "gov", "mil", "int"}
	isCommon := false
	for _, common := range commonTLDs {
		if strings.EqualFold(cleanTLD, common) {
			isCommon = true
			break
		}
	}

	if !isCommon {
		result.Warnings = append(result.Warnings, ValidationWarning{
			Field:   "tld",
			Code:    "uncommon_tld",
			Message: fmt.Sprintf("TLD '%s' is not commonly used", cleanTLD),
			Context: map[string]interface{}{
				"provided_tld": tld,
				"common_tlds":  commonTLDs,
			},
		})
	}
}

// validateConstantString validates constant string for domain generation
func (s *DomainValidationService) validateConstantString(constantString string, result *ValidationResult) {
	// Business rule: Constant string must be valid domain component
	domainPattern := regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$`)
	if !domainPattern.MatchString(constantString) {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "constantString",
			Code:     "invalid_domain_component",
			Message:  "Constant string is not a valid domain component",
			Severity: "error",
			Context: map[string]interface{}{
				"provided_string": constantString,
			},
		})
	}

	// Business rule: Warn about potential trademark issues
	reservedWords := []string{"google", "facebook", "microsoft", "amazon", "apple"}
	for _, reserved := range reservedWords {
		if strings.Contains(strings.ToLower(constantString), reserved) {
			result.Warnings = append(result.Warnings, ValidationWarning{
				Field:   "constantString",
				Code:    "potential_trademark_issue",
				Message: fmt.Sprintf("Constant string contains potentially trademarked term: %s", reserved),
				Context: map[string]interface{}{
					"constant_string": constantString,
					"detected_term":   reserved,
				},
			})
		}
	}
}

// validateDNSValidationParams validates DNS validation specific parameters
func (s *DomainValidationService) validateDNSValidationParams(ctx context.Context, params *DnsValidationParams, result *ValidationResult) {
	if params == nil {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "dnsValidationParams",
			Code:     "missing_required_params",
			Message:  "DNS validation parameters are required",
			Severity: "error",
		})
		return
	}

	// Validate source campaign exists and is complete
	s.validateSourceCampaign(ctx, params.SourceGenerationCampaignID, "domain_generation", result)
	
	// Validate personas exist and are DNS type
	s.validatePersonas(ctx, params.PersonaIDs, "dns", result)
	
	// Validate processing parameters
	s.validateProcessingParams(params.ProcessingSpeedPerMinute, params.BatchSize, params.RetryAttempts, result)
}

// validateHTTPKeywordParams validates HTTP keyword validation specific parameters
func (s *DomainValidationService) validateHTTPKeywordParams(ctx context.Context, params *HttpKeywordParams, result *ValidationResult) {
	if params == nil {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "httpKeywordParams",
			Code:     "missing_required_params",
			Message:  "HTTP keyword validation parameters are required",
			Severity: "error",
		})
		return
	}

	// Validate source campaign exists
	s.validateSourceCampaign(ctx, params.SourceCampaignID, "", result)
	
	// Validate personas exist and are HTTP type
	s.validatePersonas(ctx, params.PersonaIDs, "http", result)
	
	// Validate keyword sets if provided
	if len(params.KeywordSetIDs) > 0 {
		s.validateKeywordSets(ctx, params.KeywordSetIDs, result)
	}
	
	// Validate processing parameters
	s.validateProcessingParams(params.ProcessingSpeedPerMinute, params.BatchSize, params.RetryAttempts, result)
}

// validateSourceCampaign validates that the source campaign exists and is appropriate
func (s *DomainValidationService) validateSourceCampaign(ctx context.Context, campaignID uuid.UUID, expectedType string, result *ValidationResult) {
	var campaign models.Campaign
	query := `SELECT id, campaign_type, status FROM campaigns WHERE id = $1`
	
	err := s.db.GetContext(ctx, &campaign, query, campaignID)
	if err != nil {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "sourceCampaignId",
			Code:     "source_campaign_not_found",
			Message:  "Source campaign not found",
			Severity: "error",
			Context: map[string]interface{}{
				"campaign_id": campaignID.String(),
			},
		})
		return
	}

	// Validate campaign type if specified
	if expectedType != "" && string(campaign.CampaignType) != expectedType {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "sourceCampaignId",
			Code:     "invalid_source_campaign_type",
			Message:  fmt.Sprintf("Source campaign must be of type %s, got %s", expectedType, campaign.CampaignType),
			Severity: "error",
			Context: map[string]interface{}{
				"campaign_id":   campaignID.String(),
				"expected_type": expectedType,
				"actual_type":   campaign.CampaignType,
			},
		})
	}

	// Business rule: Source campaign should be completed for optimal results
	if campaign.Status != models.CampaignStatusCompleted {
		result.Warnings = append(result.Warnings, ValidationWarning{
			Field:   "sourceCampaignId",
			Code:    "source_campaign_not_completed",
			Message: fmt.Sprintf("Source campaign is not completed (status: %s), validation may be incomplete", campaign.Status),
			Context: map[string]interface{}{
				"campaign_id":     campaignID.String(),
				"current_status":  campaign.Status,
				"expected_status": models.CampaignStatusCompleted,
			},
		})
	}
}

// validatePersonas validates that personas exist and are of the correct type
func (s *DomainValidationService) validatePersonas(ctx context.Context, personaIDs []uuid.UUID, expectedType string, result *ValidationResult) {
	if len(personaIDs) == 0 {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "personaIds",
			Code:     "no_personas_specified",
			Message:  "At least one persona must be specified",
			Severity: "error",
		})
		return
	}

	// Convert UUIDs to string slice for IN query
	personaIDStrs := make([]string, len(personaIDs))
	for i, id := range personaIDs {
		personaIDStrs[i] = id.String()
	}

	query := `
		SELECT id, name, persona_type, is_enabled 
		FROM personas 
		WHERE id = ANY($1)
	`
	
	var personas []struct {
		ID          uuid.UUID           `db:"id"`
		Name        string              `db:"name"`
		PersonaType models.PersonaTypeEnum `db:"persona_type"`
		IsEnabled   bool                `db:"is_enabled"`
	}

	err := s.db.SelectContext(ctx, &personas, query, pq.Array(personaIDStrs))
	if err != nil {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "personaIds",
			Code:     "persona_validation_failed",
			Message:  "Failed to validate personas",
			Severity: "error",
		})
		return
	}

	// Check that all requested personas were found
	if len(personas) != len(personaIDs) {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "personaIds",
			Code:     "personas_not_found",
			Message:  fmt.Sprintf("Some personas not found (requested: %d, found: %d)", len(personaIDs), len(personas)),
			Severity: "error",
		})
	}

	// Validate persona types and status
	for _, persona := range personas {
		if expectedType != "" && string(persona.PersonaType) != expectedType {
			result.Violations = append(result.Violations, ValidationViolation{
				Field:    "personaIds",
				Code:     "invalid_persona_type",
				Message:  fmt.Sprintf("Persona '%s' is type %s, expected %s", persona.Name, persona.PersonaType, expectedType),
				Severity: "error",
				Context: map[string]interface{}{
					"persona_id":    persona.ID.String(),
					"persona_name":  persona.Name,
					"expected_type": expectedType,
					"actual_type":   persona.PersonaType,
				},
			})
		}

		if !persona.IsEnabled {
			result.Warnings = append(result.Warnings, ValidationWarning{
				Field:   "personaIds",
				Code:    "disabled_persona",
				Message: fmt.Sprintf("Persona '%s' is disabled", persona.Name),
				Context: map[string]interface{}{
					"persona_id":   persona.ID.String(),
					"persona_name": persona.Name,
				},
			})
		}
	}
}

// validateKeywordSets validates that keyword sets exist and are enabled
func (s *DomainValidationService) validateKeywordSets(ctx context.Context, keywordSetIDs []uuid.UUID, result *ValidationResult) {
	// Convert UUIDs to string slice for IN query
	keywordSetIDStrs := make([]string, len(keywordSetIDs))
	for i, id := range keywordSetIDs {
		keywordSetIDStrs[i] = id.String()
	}

	query := `
		SELECT id, name, is_enabled 
		FROM keyword_sets 
		WHERE id = ANY($1)
	`
	
	var keywordSets []struct {
		ID        uuid.UUID `db:"id"`
		Name      string    `db:"name"`
		IsEnabled bool      `db:"is_enabled"`
	}

	err := s.db.SelectContext(ctx, &keywordSets, query, pq.Array(keywordSetIDStrs))
	if err != nil {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "keywordSetIds",
			Code:     "keyword_set_validation_failed",
			Message:  "Failed to validate keyword sets",
			Severity: "error",
		})
		return
	}

	// Check that all requested keyword sets were found
	if len(keywordSets) != len(keywordSetIDs) {
		result.Violations = append(result.Violations, ValidationViolation{
			Field:    "keywordSetIds",
			Code:     "keyword_sets_not_found",
			Message:  fmt.Sprintf("Some keyword sets not found (requested: %d, found: %d)", len(keywordSetIDs), len(keywordSets)),
			Severity: "error",
		})
	}

	// Validate keyword set status
	for _, keywordSet := range keywordSets {
		if !keywordSet.IsEnabled {
			result.Warnings = append(result.Warnings, ValidationWarning{
				Field:   "keywordSetIds",
				Code:    "disabled_keyword_set",
				Message: fmt.Sprintf("Keyword set '%s' is disabled", keywordSet.Name),
				Context: map[string]interface{}{
					"keyword_set_id":   keywordSet.ID.String(),
					"keyword_set_name": keywordSet.Name,
				},
			})
		}
	}
}

// validateProcessingParams validates processing speed, batch size, and retry parameters
func (s *DomainValidationService) validateProcessingParams(speedPerMinute, batchSize, retryAttempts int, result *ValidationResult) {
	// Business rule: Reasonable processing speed limits
	if speedPerMinute > 10000 {
		result.Warnings = append(result.Warnings, ValidationWarning{
			Field:   "processingSpeedPerMinute",
			Code:    "high_processing_speed",
			Message: fmt.Sprintf("High processing speed (%d/min) may impact system performance", speedPerMinute),
			Context: map[string]interface{}{
				"requested_speed": speedPerMinute,
			},
		})
	}

	// Business rule: Optimal batch size ranges
	if batchSize > 1000 {
		result.Warnings = append(result.Warnings, ValidationWarning{
			Field:   "batchSize",
			Code:    "large_batch_size",
			Message: fmt.Sprintf("Large batch size (%d) may impact memory usage", batchSize),
			Context: map[string]interface{}{
				"requested_batch_size": batchSize,
			},
		})
	}

	// Business rule: Reasonable retry limits
	if retryAttempts > 10 {
		result.Warnings = append(result.Warnings, ValidationWarning{
			Field:   "retryAttempts",
			Code:    "high_retry_attempts",
			Message: fmt.Sprintf("High retry attempts (%d) may cause excessive delays", retryAttempts),
			Context: map[string]interface{}{
				"requested_retries": retryAttempts,
			},
		})
	}
}