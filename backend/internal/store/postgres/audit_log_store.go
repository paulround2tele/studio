package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

// auditLogStorePostgres implements the store.AuditLogStore interface
type auditLogStorePostgres struct {
	db *sqlx.DB // Retains DB for Transactor part if it were needed, and for direct execution if no tx
}

// NewAuditLogStorePostgres creates a new AuditLogStore for PostgreSQL
func NewAuditLogStorePostgres(db *sqlx.DB) store.AuditLogStore {
	return &auditLogStorePostgres{db: db}
}

// BeginTxx starts a new transaction - added for interface completeness, though audit logs might not always need explicit tx from store.
func (s *auditLogStorePostgres) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return s.db.BeginTxx(ctx, opts)
}

func (s *auditLogStorePostgres) CreateAuditLog(ctx context.Context, exec store.Querier, logEntry *models.AuditLog) error {
	// BL-006 COMPLIANCE: Validate user context before creating audit log
	if err := s.validateAuditLogUserContext(logEntry); err != nil {
		return fmt.Errorf("audit log validation failed (BL-006 compliance): %w", err)
	}

	if logEntry.ID == uuid.Nil {
		logEntry.ID = uuid.New()
	}
	if logEntry.Timestamp.IsZero() {
		logEntry.Timestamp = time.Now().UTC()
	}

	query := `INSERT INTO audit_logs (id, timestamp, user_id, action, entity_type, entity_id, details, client_ip, user_agent)
	             VALUES (:id, :timestamp, :user_id, :action, :entity_type, :entity_id, :details, :client_ip, :user_agent)`

	// If exec is nil, use the internal db connection
	if exec == nil {
		if s.db == nil {
			return fmt.Errorf("both exec and internal db connection are nil")
		}
		_, err := s.db.NamedExecContext(ctx, query, logEntry)
		return err
	}

	// Otherwise use the provided exec
	_, err := exec.NamedExecContext(ctx, query, logEntry)
	return err
}

func (s *auditLogStorePostgres) ListAuditLogs(ctx context.Context, exec store.Querier, filter store.ListAuditLogsFilter) ([]*models.AuditLog, error) {
	baseQuery := `SELECT id, timestamp, user_id, action, entity_type, entity_id, details, client_ip, user_agent FROM audit_logs`
	args := []interface{}{}
	conditions := []string{}

	if filter.UserID != "" {
		conditions = append(conditions, "user_id = ?")
		args = append(args, filter.UserID)
	}
	if filter.EntityType != "" {
		conditions = append(conditions, "entity_type = ?")
		args = append(args, filter.EntityType)
	}
	// Check for uuid.NullUUID specifically for EntityID
	if filter.EntityID.Valid { // Only add condition if EntityID in filter is valid (not nil UUID)
		conditions = append(conditions, "entity_id = ?")
		args = append(args, filter.EntityID.UUID)
	}
	if filter.Action != "" {
		conditions = append(conditions, "action = ?")
		args = append(args, filter.Action)
	}
	if !filter.StartDate.IsZero() {
		conditions = append(conditions, "timestamp >= ?")
		args = append(args, filter.StartDate)
	}
	if !filter.EndDate.IsZero() {
		conditions = append(conditions, "timestamp <= ?")
		args = append(args, filter.EndDate)
	}

	finalQuery := baseQuery
	if len(conditions) > 0 {
		finalQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	finalQuery += " ORDER BY timestamp DESC"

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

	logs := []*models.AuditLog{}
	err := exec.SelectContext(ctx, &logs, reboundQuery, args...)
	return logs, err
}

// validateAuditLogUserContext ensures audit logs include valid user context (BL-006 compliance)
func (s *auditLogStorePostgres) validateAuditLogUserContext(logEntry *models.AuditLog) error {
	// BL-006 CRITICAL: Ensure user context is always present for security-critical operations
	if logEntry == nil {
		return fmt.Errorf("audit log entry cannot be nil")
	}

	// Validate action is present
	if strings.TrimSpace(logEntry.Action) == "" {
		return fmt.Errorf("audit log action cannot be empty")
	}

	// BL-006 COMPLIANCE: Ensure UserID is present for all audit entries
	// This addresses the core finding: missing authorization context in audit logs
	if !logEntry.UserID.Valid || logEntry.UserID.UUID == uuid.Nil {
		return fmt.Errorf("audit log missing user context: UserID must be valid and non-nil (action: %s)", logEntry.Action)
	}

	// Validate security-critical operations have additional context
	securityCriticalActions := map[string]bool{
		"campaign_create":          true,
		"campaign_update":          true,
		"campaign_delete":          true,
		"campaign_start":           true,
		"campaign_stop":            true,
		"campaign_pause":           true,
		"campaign_access_granted":  true,
		"campaign_access_denied":   true,
		"user_login":               true,
		"user_logout":              true,
		"api_key_create":           true,
		"api_key_delete":           true,
		"permission_change":        true,
		"role_assignment":          true,
		"security_breach_detected": true,
		"unauthorized_access":      true,
		"sensitive_data_access":    true,
		"configuration_change":     true,
	}

	if securityCriticalActions[logEntry.Action] {
		// Security-critical operations require client IP
		if !logEntry.ClientIP.Valid || strings.TrimSpace(logEntry.ClientIP.String) == "" {
			return fmt.Errorf("security-critical action '%s' missing client IP context", logEntry.Action)
		}

		// Security-critical operations should have user agent for session correlation
		if !logEntry.UserAgent.Valid || strings.TrimSpace(logEntry.UserAgent.String) == "" {
			return fmt.Errorf("security-critical action '%s' missing user agent context", logEntry.Action)
		}
	}

	// Validate entity references
	if logEntry.EntityType.Valid && strings.TrimSpace(logEntry.EntityType.String) != "" {
		if !logEntry.EntityID.Valid || logEntry.EntityID.UUID == uuid.Nil {
			return fmt.Errorf("audit log with entity type '%s' missing entity ID", logEntry.EntityType.String)
		}
	}

	return nil
}

// CreateAuditLogWithValidation creates an audit log with comprehensive user context validation
func (s *auditLogStorePostgres) CreateAuditLogWithValidation(ctx context.Context, exec store.Querier, logEntry *models.AuditLog) error {
	// Enhanced validation for BL-006 compliance
	if err := s.validateAuditLogUserContext(logEntry); err != nil {
		return fmt.Errorf("BL-006 audit validation failed: %w", err)
	}

	// Ensure timestamp consistency
	if logEntry.Timestamp.IsZero() {
		logEntry.Timestamp = time.Now().UTC()
	}

	// Create the audit log
	return s.CreateAuditLog(ctx, exec, logEntry)
}

// GetAuditLogsWithUserFilter retrieves audit logs filtered by user context for compliance reporting
func (s *auditLogStorePostgres) GetAuditLogsWithUserFilter(ctx context.Context, exec store.Querier, userID uuid.UUID, filter store.ListAuditLogsFilter) ([]*models.AuditLog, error) {
	// Override filter with user ID for user-specific audit trails
	filter.UserID = userID.String()
	return s.ListAuditLogs(ctx, exec, filter)
}

// IncompleteAuditEntry represents an audit log entry with missing user context
type IncompleteAuditEntry struct {
	ID        uuid.UUID      `db:"id"`
	Action    string         `db:"action"`
	UserID    uuid.NullUUID  `db:"user_id"`
	ClientIP  sql.NullString `db:"client_ip"`
	UserAgent sql.NullString `db:"user_agent"`
	Timestamp time.Time      `db:"timestamp"`
}

// ValidateAuditLogCompleteness checks if audit logs have complete user context (BL-006 compliance check)
func (s *auditLogStorePostgres) ValidateAuditLogCompleteness(ctx context.Context, exec store.Querier, startTime, endTime time.Time) ([]string, error) {
	if exec == nil {
		exec = s.db
	}

	query := `
		SELECT id, action, user_id, client_ip, user_agent, timestamp
		FROM audit_logs
		WHERE timestamp BETWEEN ? AND ?
		  AND (user_id IS NULL OR user_id = '00000000-0000-0000-0000-000000000000')
		ORDER BY timestamp DESC
	`

	var incompleteAuditEntries []IncompleteAuditEntry

	// Handle different exec types for proper rebinding
	var reboundQuery string
	switch q := exec.(type) {
	case *sqlx.DB:
		reboundQuery = q.Rebind(query)
	case *sqlx.Tx:
		reboundQuery = q.Rebind(query)
	default:
		return nil, fmt.Errorf("unexpected Querier type for audit validation: %T", exec)
	}

	err := exec.SelectContext(ctx, &incompleteAuditEntries, reboundQuery, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("failed to query incomplete audit logs: %w", err)
	}

	var incompleteEntries []string
	for _, entry := range incompleteAuditEntries {
		issue := fmt.Sprintf("Audit Log ID %s: Action '%s' at %s missing user context",
			entry.ID.String(), entry.Action, entry.Timestamp.Format(time.RFC3339))
		incompleteEntries = append(incompleteEntries, issue)
	}

	return incompleteEntries, nil
}

// Ensure auditLogStorePostgres implements store.AuditLogStore
var _ store.AuditLogStore = (*auditLogStorePostgres)(nil)
