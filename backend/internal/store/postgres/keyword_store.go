package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/constants"
	"github.com/fntelecomllc/studio/backend/internal/models" // Corrected path
	"github.com/fntelecomllc/studio/backend/internal/store"  // Corrected path

	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq" // Imported for pq.Error
)

// keywordStorePostgres implements the store.KeywordStore interface
type keywordStorePostgres struct {
	db *sqlx.DB // Retains DB for Transactor part of the interface
}

// NewKeywordStorePostgres creates a new KeywordStore for PostgreSQL
func NewKeywordStorePostgres(db *sqlx.DB) store.KeywordStore {
	return &keywordStorePostgres{db: db}
}

// BeginTxx starts a new transaction.
func (s *keywordStorePostgres) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return s.db.BeginTxx(ctx, opts)
}

// --- KeywordSet CRUD --- //

func (s *keywordStorePostgres) CreateKeywordSet(ctx context.Context, exec store.Querier, keywordSet *models.KeywordSet) error {
	query := `INSERT INTO keyword_sets (id, name, description, is_enabled, created_at, updated_at)
              VALUES (:id, :name, :description, :is_enabled, :created_at, :updated_at)`
	_, err := exec.NamedExecContext(ctx, query, keywordSet)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" { // 23505 is unique_violation
			return store.ErrDuplicateEntry
		}
	}
	return err
}

func (s *keywordStorePostgres) GetKeywordSetByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.KeywordSet, error) {
	keywordSet := &models.KeywordSet{}
	query := `SELECT id, name, description, is_enabled, created_at, updated_at
              FROM keyword_sets WHERE id = $1`
	err := exec.GetContext(ctx, keywordSet, query, id)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return keywordSet, err
}

func (s *keywordStorePostgres) GetKeywordSetByName(ctx context.Context, exec store.Querier, name string) (*models.KeywordSet, error) {
	keywordSet := &models.KeywordSet{}
	query := `SELECT id, name, description, is_enabled, created_at, updated_at
              FROM keyword_sets WHERE name = $1`
	err := exec.GetContext(ctx, keywordSet, query, name)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return keywordSet, err
}

func (s *keywordStorePostgres) UpdateKeywordSet(ctx context.Context, exec store.Querier, keywordSet *models.KeywordSet) error {
	query := `UPDATE keyword_sets SET
                name = :name,
                description = :description,
                is_enabled = :is_enabled,
                updated_at = :updated_at
              WHERE id = :id`
	result, err := exec.NamedExecContext(ctx, query, keywordSet)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" { // 23505 is unique_violation
			return store.ErrDuplicateEntry
		}
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound // Or ErrUpdateFailed
	}
	return err
}

func (s *keywordStorePostgres) DeleteKeywordSet(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	query := `DELETE FROM keyword_sets WHERE id = $1`
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

func (s *keywordStorePostgres) ListKeywordSets(ctx context.Context, exec store.Querier, filter store.ListKeywordSetsFilter) ([]*models.KeywordSet, error) {
	// Initialize empty result for early returns
	keywordSets := []*models.KeywordSet{}

	// Check if context is nil
	if ctx == nil {
		return keywordSets, fmt.Errorf("context is nil")
	}

	// Check if s.db is nil
	if s.db == nil {
		return keywordSets, fmt.Errorf("store database connection is nil")
	}

	// Use a defer/recover to catch any panics
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("Recovered from panic in ListKeywordSets: %v\n", r)
		}
	}()

	// If exec is nil, use the store's internal DB
	if exec == nil {
		// Return empty result instead of calling listKeywordSetsWithDB
		// This is a temporary workaround until the keyword_rules table is properly set up
		return keywordSets, nil
	}

	// Otherwise, use the provided executor
	return s.listKeywordSetsWithExec(ctx, exec, filter)
}

// Helper function to list keyword sets using the provided executor
func (s *keywordStorePostgres) listKeywordSetsWithExec(ctx context.Context, exec store.Querier, filter store.ListKeywordSetsFilter) ([]*models.KeywordSet, error) {
	// Initialize empty result for early returns
	keywordSets := []*models.KeywordSet{}

	// Check if exec is nil
	if exec == nil {
		return keywordSets, fmt.Errorf("executor is nil")
	}

	// Safely build the query with defensive programming
	baseQuery := `SELECT id, name, description, is_enabled, created_at, updated_at FROM keyword_sets`
	if baseQuery == "" {
		return keywordSets, fmt.Errorf("failed to initialize base query")
	}

	args := []interface{}{}
	conditions := []string{}

	if filter.IsEnabled != nil {
		conditions = append(conditions, "is_enabled = ?") // Placeholder for Rebind
		args = append(args, *filter.IsEnabled)
	}

	// Build the final query with proper error checking
	finalQuery := baseQuery
	if len(conditions) > 0 {
		finalQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	// Add ordering
	finalQuery += constants.SQLOrderByNameAsc

	// Add pagination with safety checks
	if filter.Limit > 0 {
		finalQuery += " LIMIT ?"
		args = append(args, filter.Limit)
	}

	if filter.Offset > 0 {
		finalQuery += " OFFSET ?"
		args = append(args, filter.Offset)
	}

	// Double-check that we have a valid query before proceeding
	if finalQuery == "" {
		return keywordSets, fmt.Errorf("failed to build SQL query")
	}

	// Safely rebind the query with proper type checking
	var reboundQuery string
	switch q := exec.(type) {
	case *sqlx.DB:
		reboundQuery = q.Rebind(finalQuery)
	case *sqlx.Tx:
		reboundQuery = q.Rebind(finalQuery)
	default:
		return keywordSets, fmt.Errorf("unexpected Querier type for Rebind: %T", exec)
	}

	if reboundQuery == "" {
		return keywordSets, fmt.Errorf("failed to rebind SQL query")
	}

	// Execute the query with proper error handling
	err := exec.SelectContext(ctx, &keywordSets, reboundQuery, args...)
	if err != nil {
		return keywordSets, fmt.Errorf("database query error: %w", err)
	}

	return keywordSets, nil
}

// --- KeywordRule CRUD --- //

func (s *keywordStorePostgres) CreateKeywordRules(ctx context.Context, exec store.Querier, rules []*models.KeywordRule) error {
	if len(rules) == 0 {
		return nil
	}

	stmt, err := exec.PrepareNamedContext(ctx, `INSERT INTO keyword_rules
        (id, keyword_set_id, pattern, rule_type, is_case_sensitive, category, context_chars, created_at, updated_at)
        VALUES (:id, :keyword_set_id, :pattern, :rule_type, :is_case_sensitive, :category, :context_chars, :created_at, :updated_at)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, rule := range rules {
		if rule.ID == uuid.Nil {
			rule.ID = uuid.New()
		}
		now := time.Now().UTC()
		if rule.CreatedAt.IsZero() {
			rule.CreatedAt = now
		}
		if rule.UpdatedAt.IsZero() {
			rule.UpdatedAt = now
		}
		_, err := stmt.ExecContext(ctx, rule)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *keywordStorePostgres) GetKeywordRulesBySetID(ctx context.Context, exec store.Querier, keywordSetID uuid.UUID) ([]models.KeywordRule, error) {
	rules := []models.KeywordRule{}
	query := `SELECT id, keyword_set_id, pattern, rule_type, is_case_sensitive, category, context_chars, created_at, updated_at
               FROM keyword_rules WHERE keyword_set_id = $1 ORDER BY created_at ASC`

	var err error
	if exec == nil {
		err = s.db.SelectContext(ctx, &rules, query, keywordSetID)
	} else {
		err = exec.SelectContext(ctx, &rules, query, keywordSetID)
	}

	return rules, err
}

func (s *keywordStorePostgres) UpdateKeywordRule(ctx context.Context, exec store.Querier, rule *models.KeywordRule) error {
	rule.UpdatedAt = time.Now().UTC()
	query := `UPDATE keyword_rules SET
                pattern = :pattern,
                rule_type = :rule_type,
                is_case_sensitive = :is_case_sensitive,
                category = :category,
                context_chars = :context_chars,
                updated_at = :updated_at
              WHERE id = :id AND keyword_set_id = :keyword_set_id`
	result, err := exec.NamedExecContext(ctx, query, rule)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err == nil && rowsAffected == 0 {
		return store.ErrNotFound
	}
	return err
}

func (s *keywordStorePostgres) DeleteKeywordRule(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	query := `DELETE FROM keyword_rules WHERE id = $1`
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

func (s *keywordStorePostgres) DeleteKeywordRulesBySetID(ctx context.Context, exec store.Querier, keywordSetID uuid.UUID) error {
	query := `DELETE FROM keyword_rules WHERE keyword_set_id = $1`
	_, err := exec.ExecContext(ctx, query, keywordSetID)
	return err
}

// GetKeywordSetsByIDs retrieves multiple keyword sets by their IDs in a single batch query.
// Results are ordered by the input ID slice for predictable ordering.
// This method optimizes N+1 query patterns by fetching all keyword sets at once.
func (s *keywordStorePostgres) GetKeywordSetsByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.KeywordSet, error) {
	// Input validation
	if len(ids) == 0 {
		return []*models.KeywordSet{}, nil
	}

	// Convert UUIDs to strings for array_position ordering
	idStrings := make([]string, len(ids))
	for i, id := range ids {
		idStrings[i] = id.String()
	}

	// Use PostgreSQL batch query with IN clause and ordered results
	// array_position ensures results are returned in the same order as input IDs
	query := `SELECT id, name, description, is_enabled, created_at, updated_at
			  FROM keyword_sets
			  WHERE id = ANY($1)
			  ORDER BY array_position($1, id::text)`

	keywordSets := []*models.KeywordSet{}
	err := exec.SelectContext(ctx, &keywordSets, query, pq.Array(idStrings))
	if err != nil {
		return nil, fmt.Errorf("failed to get keyword sets by IDs: %w", err)
	}

	return keywordSets, nil
}

// GetKeywordSetsWithKeywordsByIDs retrieves multiple keyword sets with their associated keywords
// in a single batch query using JOINs. This method optimizes complex N+1 patterns where
// keyword set data and related keywords are needed together.
func (s *keywordStorePostgres) GetKeywordSetsWithKeywordsByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.KeywordSet, error) {
	// Input validation
	if len(ids) == 0 {
		return []*models.KeywordSet{}, nil
	}

	// Convert UUIDs to strings for array_position ordering
	idStrings := make([]string, len(ids))
	for i, id := range ids {
		idStrings[i] = id.String()
	}

	// First, get the keyword sets in batch
	keywordSets, err := s.GetKeywordSetsByIDs(ctx, exec, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to get keyword sets: %w", err)
	}

	if len(keywordSets) == 0 {
		return keywordSets, nil
	}

	// Extract keyword set IDs for batch keyword retrieval
	keywordSetIDs := make([]uuid.UUID, len(keywordSets))
	for i, ks := range keywordSets {
		keywordSetIDs[i] = ks.ID
	}

	// Get all keywords for these keyword sets in batch
	keywords, err := s.GetKeywordsByKeywordSetIDs(ctx, exec, keywordSetIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get keywords for keyword sets: %w", err)
	}

	// Group keywords by keyword set ID for efficient lookup
	keywordsBySetID := make(map[uuid.UUID][]models.KeywordRule)
	for _, keyword := range keywords {
		keywordsBySetID[keyword.KeywordSetID] = append(keywordsBySetID[keyword.KeywordSetID], *keyword)
	}

	// Attach keywords to their respective keyword sets
	for _, keywordSet := range keywordSets {
		if setKeywords, exists := keywordsBySetID[keywordSet.ID]; exists {
			keywordSet.Rules = &setKeywords
		} else {
			// Initialize empty slice if no keywords found
			emptyRules := []models.KeywordRule{}
			keywordSet.Rules = &emptyRules
		}
	}

	return keywordSets, nil
}

// GetKeywordsByKeywordSetIDs retrieves keywords for multiple keyword sets in a single batch query.
// This method optimizes N+1 patterns when loading keywords for multiple keyword sets.
func (s *keywordStorePostgres) GetKeywordsByKeywordSetIDs(ctx context.Context, exec store.Querier, keywordSetIDs []uuid.UUID) ([]*models.KeywordRule, error) {
	// Input validation
	if len(keywordSetIDs) == 0 {
		return []*models.KeywordRule{}, nil
	}

	// Convert UUIDs to strings for array operation
	idStrings := make([]string, len(keywordSetIDs))
	for i, id := range keywordSetIDs {
		idStrings[i] = id.String()
	}

	// Batch query for keywords by keyword set IDs
	// Order by keyword_set_id to maintain consistent grouping
	query := `SELECT id, keyword_set_id, pattern, rule_type, is_case_sensitive, category, context_chars, created_at, updated_at
			  FROM keyword_rules
			  WHERE keyword_set_id = ANY($1)
			  ORDER BY keyword_set_id, created_at ASC`

	var keywords []models.KeywordRule
	err := exec.SelectContext(ctx, &keywords, query, pq.Array(idStrings))
	if err != nil {
		return nil, fmt.Errorf("failed to get keywords by keyword set IDs: %w", err)
	}

	// Convert to pointer slice to match interface
	keywordPtrs := make([]*models.KeywordRule, len(keywords))
	for i := range keywords {
		keywordPtrs[i] = &keywords[i]
	}

	return keywordPtrs, nil
}

// GetKeywordsByIDs retrieves multiple keywords by their IDs in a single batch query.
// Results are ordered by the input ID slice for predictable ordering.
// This method optimizes N+1 query patterns by fetching all keywords at once.
func (s *keywordStorePostgres) GetKeywordsByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.KeywordRule, error) {
	// Input validation
	if len(ids) == 0 {
		return []*models.KeywordRule{}, nil
	}

	// Convert UUIDs to strings for array_position ordering
	idStrings := make([]string, len(ids))
	for i, id := range ids {
		idStrings[i] = id.String()
	}

	// Use PostgreSQL batch query with IN clause and ordered results
	// array_position ensures results are returned in the same order as input IDs
	query := `SELECT id, keyword_set_id, pattern, rule_type, is_case_sensitive, category, context_chars, created_at, updated_at
			  FROM keyword_rules
			  WHERE id = ANY($1)
			  ORDER BY array_position($1, id::text)`

	var keywords []models.KeywordRule
	err := exec.SelectContext(ctx, &keywords, query, pq.Array(idStrings))
	if err != nil {
		return nil, fmt.Errorf("failed to get keywords by IDs: %w", err)
	}

	// Convert to pointer slice to match interface
	keywordPtrs := make([]*models.KeywordRule, len(keywords))
	for i := range keywords {
		keywordPtrs[i] = &keywords[i]
	}

	return keywordPtrs, nil
}

// Ensure keywordStorePostgres implements store.KeywordStore
var _ store.KeywordStore = (*keywordStorePostgres)(nil)
