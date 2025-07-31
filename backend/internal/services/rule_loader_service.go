// File: backend/internal/services/rule_loader_service.go
package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// RuleLoaderService provides high-performance rule loading for Phase 3 HTTP scanning
// and traditional rule management operations using the hybrid storage approach.
type RuleLoaderService struct {
	db *sqlx.DB
}

// NewRuleLoaderService creates a new rule loader service
func NewRuleLoaderService(db *sqlx.DB) *RuleLoaderService {
	return &RuleLoaderService{db: db}
}

// LoadRulesForScanning loads keyword rules using JSONB for high-performance Phase 3 HTTP scanning.
// This method leverages the hybrid storage: JSONB for atomic fast loading.
func (s *RuleLoaderService) LoadRulesForScanning(ctx context.Context, keywordSetID uuid.UUID) ([]models.KeywordRule, error) {
	var rules []models.KeywordRule

	// Use JSONB for atomic fast loading - optimized for Phase 3 HTTP scanning
	query := `SELECT rules FROM keyword_sets WHERE id = $1 AND is_enabled = true`
	var rulesJSON *json.RawMessage

	err := s.db.GetContext(ctx, &rulesJSON, query, keywordSetID)
	if err != nil {
		if err == sql.ErrNoRows {
			return []models.KeywordRule{}, fmt.Errorf("keyword set not found or disabled: %s", keywordSetID)
		}
		return nil, fmt.Errorf("failed to load keyword rules: %w", err)
	}

	if rulesJSON == nil {
		return []models.KeywordRule{}, nil
	}

	err = json.Unmarshal(*rulesJSON, &rules)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal keyword rules: %w", err)
	}

	return rules, nil
}

// LoadRulesForManagement loads keyword rules using the relational table for management operations.
// This method uses the keyword_rules table for complex queries and rule administration.
func (s *RuleLoaderService) LoadRulesForManagement(ctx context.Context, keywordSetID uuid.UUID) ([]models.KeywordRule, error) {
	var rules []models.KeywordRule

	// Use relational table for management operations - allows complex filtering
	query := `
		SELECT id, keyword_set_id, pattern, rule_type, is_case_sensitive, 
		       category, context_chars, created_at, updated_at
		FROM keyword_rules 
		WHERE keyword_set_id = $1
		ORDER BY created_at ASC
	`

	err := s.db.SelectContext(ctx, &rules, query, keywordSetID)
	if err != nil {
		return nil, fmt.Errorf("failed to load keyword rules for management: %w", err)
	}

	return rules, nil
}

// LoadEnabledKeywordSetsForScanning loads all enabled keyword sets with their rules using JSONB.
// Optimized for bulk Phase 3 HTTP scanning operations.
func (s *RuleLoaderService) LoadEnabledKeywordSetsForScanning(ctx context.Context) ([]models.KeywordSet, error) {
	var keywordSets []models.KeywordSet

	query := `
		SELECT id, name, description, is_enabled, created_at, updated_at, rules
		FROM keyword_sets 
		WHERE is_enabled = true 
		AND rules IS NOT NULL 
		AND jsonb_array_length(rules) > 0
		ORDER BY created_at ASC
	`

	err := s.db.SelectContext(ctx, &keywordSets, query)
	if err != nil {
		return nil, fmt.Errorf("failed to load enabled keyword sets for scanning: %w", err)
	}

	return keywordSets, nil
}

// QueryRulesWithFilters performs advanced rule queries using the relational table.
// Supports complex filtering for rule management interfaces.
func (s *RuleLoaderService) QueryRulesWithFilters(ctx context.Context, filter RuleQueryFilter) ([]models.KeywordRule, error) {
	var rules []models.KeywordRule

	query := "SELECT id, keyword_set_id, pattern, rule_type, is_case_sensitive, category, context_chars, created_at, updated_at FROM keyword_rules WHERE 1=1"
	args := []interface{}{}
	argIndex := 1

	// Build dynamic query based on filters
	if filter.KeywordSetID != nil {
		query += fmt.Sprintf(" AND keyword_set_id = $%d", argIndex)
		args = append(args, *filter.KeywordSetID)
		argIndex++
	}

	if filter.RuleType != nil {
		query += fmt.Sprintf(" AND rule_type = $%d", argIndex)
		args = append(args, *filter.RuleType)
		argIndex++
	}

	if filter.Category != nil {
		query += fmt.Sprintf(" AND category = $%d", argIndex)
		args = append(args, *filter.Category)
		argIndex++
	}

	if filter.IsCaseSensitive != nil {
		query += fmt.Sprintf(" AND is_case_sensitive = $%d", argIndex)
		args = append(args, *filter.IsCaseSensitive)
		argIndex++
	}

	if filter.PatternSearch != nil {
		query += fmt.Sprintf(" AND pattern ILIKE $%d", argIndex)
		args = append(args, "%"+*filter.PatternSearch+"%")
		argIndex++
	}

	// Add ordering and pagination
	query += " ORDER BY created_at DESC"

	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}

	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
	}

	err := s.db.SelectContext(ctx, &rules, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query keyword rules with filters: %w", err)
	}

	return rules, nil
}

// GetRuleStatistics provides statistics about rule usage across keyword sets.
func (s *RuleLoaderService) GetRuleStatistics(ctx context.Context) (*RuleStatistics, error) {
	stats := &RuleStatistics{}

	query := `
		SELECT 
			COUNT(DISTINCT ks.id) as total_keyword_sets,
			COUNT(DISTINCT ks.id) FILTER (WHERE ks.is_enabled = true) as enabled_keyword_sets,
			COUNT(kr.id) as total_rules,
			COUNT(kr.id) FILTER (WHERE kr.rule_type = 'string') as string_rules,
			COUNT(kr.id) FILTER (WHERE kr.rule_type = 'regex') as regex_rules,
			COUNT(kr.id) FILTER (WHERE kr.is_case_sensitive = true) as case_sensitive_rules,
			COUNT(DISTINCT kr.category) FILTER (WHERE kr.category IS NOT NULL) as distinct_categories
		FROM keyword_sets ks
		LEFT JOIN keyword_rules kr ON ks.id = kr.keyword_set_id
	`

	err := s.db.GetContext(ctx, stats, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get rule statistics: %w", err)
	}

	return stats, nil
}

// RuleQueryFilter defines filters for advanced rule querying
type RuleQueryFilter struct {
	KeywordSetID    *uuid.UUID                  `json:"keywordSetId,omitempty"`
	RuleType        *models.KeywordRuleTypeEnum `json:"ruleType,omitempty"`
	Category        *string                     `json:"category,omitempty"`
	IsCaseSensitive *bool                       `json:"isCaseSensitive,omitempty"`
	PatternSearch   *string                     `json:"patternSearch,omitempty"`
	Limit           int                         `json:"limit,omitempty"`
	Offset          int                         `json:"offset,omitempty"`
}

// RuleStatistics provides aggregated statistics about keyword rules
type RuleStatistics struct {
	TotalKeywordSets   int `db:"total_keyword_sets" json:"totalKeywordSets"`
	EnabledKeywordSets int `db:"enabled_keyword_sets" json:"enabledKeywordSets"`
	TotalRules         int `db:"total_rules" json:"totalRules"`
	StringRules        int `db:"string_rules" json:"stringRules"`
	RegexRules         int `db:"regex_rules" json:"regexRules"`
	CaseSensitiveRules int `db:"case_sensitive_rules" json:"caseSensitiveRules"`
	DistinctCategories int `db:"distinct_categories" json:"distinctCategories"`
}

// ValidateHybridStorageConsistency checks if JSONB and relational data are in sync
func (s *RuleLoaderService) ValidateHybridStorageConsistency(ctx context.Context, keywordSetID uuid.UUID) (*ConsistencyReport, error) {
	report := &ConsistencyReport{KeywordSetID: keywordSetID}

	// Load rules from both storage methods
	jsonbRules, err := s.LoadRulesForScanning(ctx, keywordSetID)
	if err != nil {
		return nil, fmt.Errorf("failed to load JSONB rules: %w", err)
	}

	relationalRules, err := s.LoadRulesForManagement(ctx, keywordSetID)
	if err != nil {
		return nil, fmt.Errorf("failed to load relational rules: %w", err)
	}

	report.JSONBRuleCount = len(jsonbRules)
	report.RelationalRuleCount = len(relationalRules)
	report.IsConsistent = report.JSONBRuleCount == report.RelationalRuleCount

	// Create rule ID maps for detailed comparison
	jsonbRuleIDs := make(map[uuid.UUID]bool)
	for _, rule := range jsonbRules {
		jsonbRuleIDs[rule.ID] = true
	}

	relationalRuleIDs := make(map[uuid.UUID]bool)
	for _, rule := range relationalRules {
		relationalRuleIDs[rule.ID] = true

		// Check if this relational rule exists in JSONB
		if !jsonbRuleIDs[rule.ID] {
			report.MissingFromJSONB = append(report.MissingFromJSONB, rule.ID)
		}
	}

	// Check for rules in JSONB that are missing from relational
	for _, rule := range jsonbRules {
		if !relationalRuleIDs[rule.ID] {
			report.MissingFromRelational = append(report.MissingFromRelational, rule.ID)
		}
	}

	report.IsConsistent = len(report.MissingFromJSONB) == 0 && len(report.MissingFromRelational) == 0

	return report, nil
}

// ConsistencyReport provides details about hybrid storage consistency
type ConsistencyReport struct {
	KeywordSetID          uuid.UUID   `json:"keywordSetId"`
	JSONBRuleCount        int         `json:"jsonbRuleCount"`
	RelationalRuleCount   int         `json:"relationalRuleCount"`
	IsConsistent          bool        `json:"isConsistent"`
	MissingFromJSONB      []uuid.UUID `json:"missingFromJsonb,omitempty"`
	MissingFromRelational []uuid.UUID `json:"missingFromRelational,omitempty"`
}
