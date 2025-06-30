package postgres

import (
	"context"
	"database/sql"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// securityStorePostgres provides CRUD access for security tables
type securityStorePostgres struct{ db *sqlx.DB }

// NewSecurityStorePostgres creates a new store instance
func NewSecurityStorePostgres(db *sqlx.DB) store.SecurityStore {
	return &securityStorePostgres{db: db}
}

func (s *securityStorePostgres) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return s.db.BeginTxx(ctx, opts)
}

func (s *securityStorePostgres) CreateSecurityEvent(ctx context.Context, exec store.Querier, ev *models.SecurityEvent) error {
	query := `INSERT INTO security_events (id, event_type, user_id, session_id, campaign_id, resource_type, resource_id, action_attempted, authorization_result, denial_reason, risk_score, source_ip, user_agent, request_context, audit_log_id, created_at)
              VALUES (:id, :event_type, :user_id, :session_id, :campaign_id, :resource_type, :resource_id, :action_attempted, :authorization_result, :denial_reason, :risk_score, :source_ip, :user_agent, :request_context, :audit_log_id, :created_at)`
	_, err := exec.NamedExecContext(ctx, query, ev)
	return err
}

func (s *securityStorePostgres) GetSecurityEventByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.SecurityEvent, error) {
	var ev models.SecurityEvent
	err := exec.GetContext(ctx, &ev, `SELECT * FROM security_events WHERE id = $1`, id)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return &ev, err
}

func (s *securityStorePostgres) DeleteSecurityEvent(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	res, err := exec.ExecContext(ctx, `DELETE FROM security_events WHERE id=$1`, id)
	if err != nil {
		return err
	}
	cnt, _ := res.RowsAffected()
	if cnt == 0 {
		return store.ErrNotFound
	}
	return nil
}

func (s *securityStorePostgres) CreateAuthorizationDecision(ctx context.Context, exec store.Querier, d *models.AuthorizationDecision) error {
	query := `INSERT INTO authorization_decisions (id, decision_id, user_id, resource_type, resource_id, action, decision, policy_version, evaluated_policies, conditions_met, decision_time_ms, context, security_event_id, created_at)
              VALUES (:id, :decision_id, :user_id, :resource_type, :resource_id, :action, :decision, :policy_version, :evaluated_policies, :conditions_met, :decision_time_ms, :context, :security_event_id, :created_at)`
	_, err := exec.NamedExecContext(ctx, query, d)
	return err
}

func (s *securityStorePostgres) GetAuthorizationDecisionByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.AuthorizationDecision, error) {
	var d models.AuthorizationDecision
	err := exec.GetContext(ctx, &d, `SELECT * FROM authorization_decisions WHERE id = $1`, id)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return &d, err
}

func (s *securityStorePostgres) DeleteAuthorizationDecision(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	res, err := exec.ExecContext(ctx, `DELETE FROM authorization_decisions WHERE id=$1`, id)
	if err != nil {
		return err
	}
	cnt, _ := res.RowsAffected()
	if cnt == 0 {
		return store.ErrNotFound
	}
	return nil
}

var _ store.SecurityStore = (*securityStorePostgres)(nil)
