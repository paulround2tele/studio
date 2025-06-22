package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// SecurityEventMonitor monitors and responds to security events (BL-006)
type SecurityEventMonitor struct {
	db                  *sqlx.DB
	highRiskThreshold   int
	alertingService     AlertingService
	auditContextService AuditContextService
}

// AlertingService defines interface for alerting integration
type AlertingService interface {
	SendSecurityAlert(ctx context.Context, alertType string, details map[string]interface{}) error
}

// NewSecurityEventMonitor creates a new security event monitor
func NewSecurityEventMonitor(db *sqlx.DB, alertingService AlertingService, auditContextService AuditContextService) *SecurityEventMonitor {
	return &SecurityEventMonitor{
		db:                  db,
		highRiskThreshold:   70,
		alertingService:     alertingService,
		auditContextService: auditContextService,
	}
}

// MonitorAuthorizationPatterns detects suspicious authorization patterns
func (sem *SecurityEventMonitor) MonitorAuthorizationPatterns(ctx context.Context) error {
	// Detect repeated authorization failures
	suspiciousUsers, err := sem.detectRepeatedFailures(ctx)
	if err != nil {
		return fmt.Errorf("failed to detect repeated failures: %w", err)
	}

	for _, user := range suspiciousUsers {
		sem.handleSuspiciousUser(ctx, user)
	}

	// Detect privilege escalation attempts
	escalationAttempts, err := sem.detectPrivilegeEscalation(ctx)
	if err != nil {
		return fmt.Errorf("failed to detect privilege escalation: %w", err)
	}

	for _, attempt := range escalationAttempts {
		sem.handlePrivilegeEscalation(ctx, attempt)
	}

	// Detect unusual access patterns
	unusualPatterns, err := sem.detectUnusualAccessPatterns(ctx)
	if err != nil {
		return fmt.Errorf("failed to detect unusual access patterns: %w", err)
	}

	for _, pattern := range unusualPatterns {
		sem.handleUnusualAccessPattern(ctx, pattern)
	}

	return nil
}

// SuspiciousUser represents a user with suspicious activity
type SuspiciousUser struct {
	UserID       uuid.UUID `db:"user_id"`
	FailureCount int       `db:"failure_count"`
	LastFailure  time.Time `db:"last_failure"`
}

func (sem *SecurityEventMonitor) detectRepeatedFailures(ctx context.Context) ([]SuspiciousUser, error) {
	var suspiciousUsers []SuspiciousUser

	query := `
		SELECT user_id, COUNT(*) as failure_count, MAX(created_at) as last_failure
		FROM security_events 
		WHERE authorization_result = 'deny' 
		  AND created_at > NOW() - INTERVAL '1 hour'
		  AND user_id IS NOT NULL
		GROUP BY user_id 
		HAVING COUNT(*) >= 5
		ORDER BY failure_count DESC`

	err := sem.db.SelectContext(ctx, &suspiciousUsers, query)
	if err != nil {
		return nil, err
	}

	return suspiciousUsers, nil
}

// PrivilegeEscalationAttempt represents a potential privilege escalation
type PrivilegeEscalationAttempt struct {
	UserID       uuid.UUID `db:"user_id"`
	ResourceType string    `db:"resource_type"`
	ActionCount  int       `db:"action_count"`
	FirstAttempt time.Time `db:"first_attempt"`
}

func (sem *SecurityEventMonitor) detectPrivilegeEscalation(ctx context.Context) ([]PrivilegeEscalationAttempt, error) {
	var attempts []PrivilegeEscalationAttempt

	query := `
		SELECT user_id, resource_type, COUNT(*) as action_count, MIN(created_at) as first_attempt
		FROM security_events 
		WHERE authorization_result = 'deny'
		  AND created_at > NOW() - INTERVAL '30 minutes'
		  AND user_id IS NOT NULL
		  AND (resource_type = 'admin_panel' OR action_attempted LIKE '%admin%')
		GROUP BY user_id, resource_type
		HAVING COUNT(*) >= 3
		ORDER BY action_count DESC`

	err := sem.db.SelectContext(ctx, &attempts, query)
	if err != nil {
		return nil, err
	}

	return attempts, nil
}

// UnusualAccessPattern represents unusual access behavior
type UnusualAccessPattern struct {
	UserID        uuid.UUID `db:"user_id"`
	ResourceCount int       `db:"resource_count"`
	TimeWindow    string    `db:"time_window"`
}

func (sem *SecurityEventMonitor) detectUnusualAccessPatterns(ctx context.Context) ([]UnusualAccessPattern, error) {
	var patterns []UnusualAccessPattern

	query := `
		SELECT user_id, COUNT(DISTINCT resource_id) as resource_count, 'high_volume' as time_window
		FROM security_events 
		WHERE created_at > NOW() - INTERVAL '15 minutes'
		  AND user_id IS NOT NULL
		  AND authorization_result = 'allow'
		GROUP BY user_id
		HAVING COUNT(DISTINCT resource_id) > 20
		ORDER BY resource_count DESC`

	err := sem.db.SelectContext(ctx, &patterns, query)
	if err != nil {
		return nil, err
	}

	return patterns, nil
}

func (sem *SecurityEventMonitor) handleSuspiciousUser(ctx context.Context, user SuspiciousUser) {
	// Log security alert
	authCtx := &EnhancedAuthorizationContext{
		UserID:       user.UserID,
		ResourceID:   uuid.New().String(),
		Action:       "security_alert",
		Decision:     "deny",
		RiskScore:    90,
		ResourceType: "user_behavior",
		Timestamp:    time.Now(),
		RequestContext: map[string]interface{}{
			"alert_type":     "repeated_authorization_failures",
			"user_id":        user.UserID.String(),
			"failure_count":  user.FailureCount,
			"detection_time": time.Now().Format(time.RFC3339),
		},
	}

	if err := sem.auditContextService.LogAuthorizationDecision(ctx, authCtx); err != nil {
		log.Printf("Failed to log security alert for user %s: %v", user.UserID, err)
	}

	// Send alert to monitoring system
	if sem.alertingService != nil {
		alertDetails := map[string]interface{}{
			"alert_type":    "repeated_authorization_failures",
			"user_id":       user.UserID.String(),
			"failure_count": user.FailureCount,
			"last_failure":  user.LastFailure.Format(time.RFC3339),
			"risk_level":    "high",
		}

		if err := sem.alertingService.SendSecurityAlert(ctx, "repeated_failures", alertDetails); err != nil {
			log.Printf("Failed to send security alert: %v", err)
		}
	}
}
func (sem *SecurityEventMonitor) handlePrivilegeEscalation(ctx context.Context, attempt PrivilegeEscalationAttempt) {
	// Log privilege escalation alert
	authCtx := &EnhancedAuthorizationContext{
		UserID:       attempt.UserID,
		ResourceID:   uuid.New().String(),
		Action:       "privilege_escalation_alert",
		Decision:     "deny",
		RiskScore:    95,
		ResourceType: attempt.ResourceType,
		Timestamp:    time.Now(),
		RequestContext: map[string]interface{}{
			"alert_type":     "privilege_escalation_attempt",
			"user_id":        attempt.UserID.String(),
			"resource_type":  attempt.ResourceType,
			"attempt_count":  attempt.ActionCount,
			"first_attempt":  attempt.FirstAttempt.Format(time.RFC3339),
			"detection_time": time.Now().Format(time.RFC3339),
		},
	}

	if err := sem.auditContextService.LogAuthorizationDecision(ctx, authCtx); err != nil {
		log.Printf("Failed to log privilege escalation alert for user %s: %v", attempt.UserID, err)
	}

	// Send critical alert
	if sem.alertingService != nil {
		alertDetails := map[string]interface{}{
			"alert_type":    "privilege_escalation_attempt",
			"user_id":       attempt.UserID.String(),
			"resource_type": attempt.ResourceType,
			"attempt_count": attempt.ActionCount,
			"first_attempt": attempt.FirstAttempt.Format(time.RFC3339),
			"risk_level":    "critical",
		}

		if err := sem.alertingService.SendSecurityAlert(ctx, "privilege_escalation", alertDetails); err != nil {
			log.Printf("Failed to send privilege escalation alert: %v", err)
		}
	}
}

func (sem *SecurityEventMonitor) handleUnusualAccessPattern(ctx context.Context, pattern UnusualAccessPattern) {
	// Log unusual access pattern alert
	authCtx := &EnhancedAuthorizationContext{
		UserID:       pattern.UserID,
		ResourceID:   uuid.New().String(),
		Action:       "unusual_access_pattern_alert",
		Decision:     "deny",
		RiskScore:    60,
		ResourceType: "access_pattern",
		Timestamp:    time.Now(),
		RequestContext: map[string]interface{}{
			"alert_type":     "unusual_access_pattern",
			"user_id":        pattern.UserID.String(),
			"resource_count": pattern.ResourceCount,
			"time_window":    pattern.TimeWindow,
			"detection_time": time.Now().Format(time.RFC3339),
		},
	}

	if err := sem.auditContextService.LogAuthorizationDecision(ctx, authCtx); err != nil {
		log.Printf("Failed to log unusual access pattern alert for user %s: %v", pattern.UserID, err)
	}

	// Send monitoring alert
	if sem.alertingService != nil {
		alertDetails := map[string]interface{}{
			"alert_type":     "unusual_access_pattern",
			"user_id":        pattern.UserID.String(),
			"resource_count": pattern.ResourceCount,
			"time_window":    pattern.TimeWindow,
			"risk_level":     "medium",
		}

		if err := sem.alertingService.SendSecurityAlert(ctx, "unusual_access", alertDetails); err != nil {
			log.Printf("Failed to send unusual access alert: %v", err)
		}
	}
}

// GetSecurityMetrics returns security metrics for monitoring dashboards
func (sem *SecurityEventMonitor) GetSecurityMetrics(ctx context.Context, timeWindow time.Duration) (*SecurityMetrics, error) {
	var metrics SecurityMetrics

	// Get total security events in time window
	err := sem.db.GetContext(ctx, &metrics.TotalEvents,
		fmt.Sprintf("SELECT COUNT(*) FROM security_events WHERE created_at > NOW() - INTERVAL '%d minutes'", int(timeWindow.Minutes())))
	if err != nil {
		return nil, fmt.Errorf("failed to get total events: %w", err)
	}

	// Get authorization failures
	err = sem.db.GetContext(ctx, &metrics.AuthorizationFailures,
		fmt.Sprintf("SELECT COUNT(*) FROM security_events WHERE authorization_result = 'deny' AND created_at > NOW() - INTERVAL '%d minutes'", int(timeWindow.Minutes())))
	if err != nil {
		return nil, fmt.Errorf("failed to get authorization failures: %w", err)
	}

	// Get high risk events
	err = sem.db.GetContext(ctx, &metrics.HighRiskEvents,
		fmt.Sprintf("SELECT COUNT(*) FROM security_events WHERE risk_score > %d AND created_at > NOW() - INTERVAL '%d minutes'", sem.highRiskThreshold, int(timeWindow.Minutes())))
	if err != nil {
		return nil, fmt.Errorf("failed to get high risk events: %w", err)
	}

	// Get unique users with activity
	err = sem.db.GetContext(ctx, &metrics.ActiveUsers,
		fmt.Sprintf("SELECT COUNT(DISTINCT user_id) FROM security_events WHERE user_id IS NOT NULL AND created_at > NOW() - INTERVAL '%d minutes'", int(timeWindow.Minutes())))
	if err != nil {
		return nil, fmt.Errorf("failed to get active users: %w", err)
	}

	metrics.TimeWindow = timeWindow
	metrics.GeneratedAt = time.Now()

	return &metrics, nil
}

// SecurityMetrics represents security monitoring metrics
type SecurityMetrics struct {
	TotalEvents           int           `json:"total_events"`
	AuthorizationFailures int           `json:"authorization_failures"`
	HighRiskEvents        int           `json:"high_risk_events"`
	ActiveUsers           int           `json:"active_users"`
	TimeWindow            time.Duration `json:"time_window"`
	GeneratedAt           time.Time     `json:"generated_at"`
}
