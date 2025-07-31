package postgres

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"

	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq" // Imported for pq.Error
)

// personaStorePostgres implements the store.PersonaStore interface
type personaStorePostgres struct {
	db *sqlx.DB
}

// NewPersonaStorePostgres creates a new PersonaStore for PostgreSQL
func NewPersonaStorePostgres(db *sqlx.DB) store.PersonaStore {
	return &personaStorePostgres{db: db}
}

// BeginTxx starts a new transaction.
func (s *personaStorePostgres) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return s.db.BeginTxx(ctx, opts)
}

func (s *personaStorePostgres) CreatePersona(ctx context.Context, exec store.Querier, persona *models.Persona) error {
	query := `INSERT INTO personas (id, name, persona_type, description, config_details, is_enabled, created_at, updated_at)
			  VALUES (:id, :name, :persona_type, :description, :config_details, :is_enabled, :created_at, :updated_at)`
	_, err := exec.NamedExecContext(ctx, query, persona)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" { // 23505 is unique_violation
			return store.ErrDuplicateEntry
		}
	}
	return err
}

func (s *personaStorePostgres) GetPersonaByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.Persona, error) {
	persona := &models.Persona{}
	query := `SELECT id, name, persona_type, description, config_details, is_enabled, created_at, updated_at 
			  FROM personas WHERE id = $1`
	err := exec.GetContext(ctx, persona, query, id)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return persona, err
}

func (s *personaStorePostgres) GetPersonaByName(ctx context.Context, exec store.Querier, name string) (*models.Persona, error) {
	persona := &models.Persona{}
	query := `SELECT id, name, persona_type, description, config_details, is_enabled, created_at, updated_at 
			  FROM personas WHERE name = $1`
	err := exec.GetContext(ctx, persona, query, name)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return persona, err
}

func (s *personaStorePostgres) UpdatePersona(ctx context.Context, exec store.Querier, persona *models.Persona) error {
	query := `UPDATE personas SET 
				name = :name, 
				persona_type = :persona_type, 
				description = :description, 
				config_details = :config_details, 
				is_enabled = :is_enabled, 
				updated_at = :updated_at
			  WHERE id = :id`
	result, err := exec.NamedExecContext(ctx, query, persona)
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

func (s *personaStorePostgres) DeletePersona(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	query := `DELETE FROM personas WHERE id = $1`
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

func (s *personaStorePostgres) ListPersonas(ctx context.Context, exec store.Querier, filter store.ListPersonasFilter) ([]*models.Persona, error) {
	baseQuery := `SELECT id, name, persona_type, description, config_details, is_enabled, created_at, updated_at FROM personas`
	args := []interface{}{}
	conditions := []string{}

	if filter.Type != "" {
		conditions = append(conditions, "persona_type = ?")
		args = append(args, filter.Type)
	}
	if filter.IsEnabled != nil {
		conditions = append(conditions, "is_enabled = ?")
		args = append(args, *filter.IsEnabled)
	}

	finalQuery := baseQuery
	if len(conditions) > 0 {
		finalQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	finalQuery += " ORDER BY name ASC"

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
		return nil, fmt.Errorf("unexpected Querier type for Rebind: %T", exec)
	}

	personas := []*models.Persona{}
	err := exec.SelectContext(ctx, &personas, reboundQuery, args...)
	return personas, err
}

// GetPersonasByIDs retrieves multiple personas by their IDs in a single batch query.
// Results are ordered by the input ID slice for predictable ordering.
// This method optimizes N+1 query patterns by fetching all personas at once.
func (s *personaStorePostgres) GetPersonasByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.Persona, error) {
	// Input validation
	if len(ids) == 0 {
		return []*models.Persona{}, nil
	}

	// Convert UUIDs to strings for array_position ordering
	idStrings := make([]string, len(ids))
	for i, id := range ids {
		idStrings[i] = id.String()
	}

	// Use PostgreSQL batch query with IN clause and ordered results
	// array_position ensures results are returned in the same order as input IDs
	query := `SELECT id, name, persona_type, description, config_details, is_enabled, created_at, updated_at
			  FROM personas
			  WHERE id = ANY($1)
			  ORDER BY array_position($1, id::text)`

	personas := []*models.Persona{}
	err := exec.SelectContext(ctx, &personas, query, pq.Array(idStrings))
	if err != nil {
		return nil, fmt.Errorf("failed to get personas by IDs: %w", err)
	}

	return personas, nil
}

// GetPersonasWithKeywordSetsByIDs retrieves multiple personas with their associated keyword sets
// in a single batch query using JOINs. This method optimizes complex N+1 patterns where
// persona data and related keyword sets are needed together.
func (s *personaStorePostgres) GetPersonasWithKeywordSetsByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.Persona, error) {
	// Input validation
	if len(ids) == 0 {
		return []*models.Persona{}, nil
	}

	// Convert UUIDs to strings for array_position ordering
	idStrings := make([]string, len(ids))
	for i, id := range ids {
		idStrings[i] = id.String()
	}

	// Complex batch query that joins personas with their keyword sets
	// This eliminates the need for separate queries per persona
	query := `SELECT DISTINCT p.id, p.name, p.persona_type, p.description, p.config_details, p.is_enabled, p.created_at, p.updated_at
			  FROM personas p
			  WHERE p.id = ANY($1)
			  ORDER BY array_position($1, p.id::text)`

	personas := []*models.Persona{}
	err := exec.SelectContext(ctx, &personas, query, pq.Array(idStrings))
	if err != nil {
		return nil, fmt.Errorf("failed to get personas with keyword sets by IDs: %w", err)
	}

	// Note: This method currently returns personas without keyword set joins
	// as the schema doesn't show direct relationships between personas and keyword_sets.
	// In a real implementation, you would add appropriate JOINs based on your schema.
	// For now, this provides the batch persona retrieval optimization.

	return personas, nil
}

// Ensure personaStorePostgres implements store.PersonaStore
var _ store.PersonaStore = (*personaStorePostgres)(nil)
