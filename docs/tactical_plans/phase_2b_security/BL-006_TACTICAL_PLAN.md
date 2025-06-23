# BL-006: MISSING AUTHORIZATION CONTEXT IN AUDIT LOGS - TACTICAL PLAN

**Finding ID**: BL-006  
**Priority**: HIGH  
**Phase**: 2B Security  
**Estimated Effort**: 2-3 days  
**Dependencies**: ✅ Phase 2A Foundation (SI-001, SI-002, BF-002) complete

---

## FINDING OVERVIEW

**Problem Statement**: Audit logs lack comprehensive authorization context, making security investigations and compliance reporting difficult.

**Root Cause**: Incomplete capture of authorization decisions, missing user context propagation, and insufficient security event correlation in audit trail.

**Impact**: 
- Limited security incident investigation capabilities
- Compliance reporting gaps for authorization decisions
- Inability to track privilege escalation attempts
- Insufficient audit trail for access control violations

**Integration Points**: 
- Builds on existing [`audit_context_service.go`](../../../backend/internal/services/audit_context_service.go:1) patterns
- Integrates with [`audit_log_store.go`](../../../backend/internal/store/postgres/audit_log_store.go:1) implementations
- Enhances middleware authorization logging
- Connects to BL-008 multi-layer access control

---

## POSTGRESQL MIGRATION

**File**: `backend/database/migrations/009_bl006_enhanced_audit_context.sql`

```sql
BEGIN;

-- Enhanced audit logs with authorization context
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS authorization_context JSONB DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS security_level VARCHAR(50) DEFAULT 'standard';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS access_decision VARCHAR(50) DEFAULT 'unknown';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS permission_checked TEXT[];
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_sensitivity VARCHAR(50) DEFAULT 'normal';

-- Create indexes for security queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_authorization ON audit_logs USING gin(authorization_context);
CREATE INDEX IF NOT EXISTS idx_audit_logs_security_level ON audit_logs(security_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_access_decision ON audit_logs(access_decision);
CREATE INDEX IF NOT EXISTS idx_audit_logs_permissions ON audit_logs USING gin(permission_checked);

-- Security events table for detailed authorization tracking
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID,
    session_id VARCHAR(255),
    campaign_id UUID,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action_attempted VARCHAR(100) NOT NULL,
    authorization_result VARCHAR(50) NOT NULL,
    permissions_required TEXT[] DEFAULT '{}',
    permissions_granted TEXT[] DEFAULT '{}',
    denial_reason TEXT,
    risk_score INTEGER DEFAULT 0,
    source_ip INET,
    user_agent TEXT,
    request_context JSONB DEFAULT '{}',
    audit_log_id UUID REFERENCES audit_logs(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_result ON security_events(authorization_result);
CREATE INDEX idx_security_events_risk ON security_events(risk_score DESC);
CREATE INDEX idx_security_events_created ON security_events(created_at);

-- Authorization decision tracking
CREATE TABLE IF NOT EXISTS authorization_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('allow', 'deny', 'conditional')),
    policy_version VARCHAR(50),
    evaluated_policies TEXT[] DEFAULT '{}',
    conditions_met JSONB DEFAULT '{}',
    decision_time_ms INTEGER DEFAULT 0,
    context JSONB DEFAULT '{}',
    security_event_id UUID REFERENCES security_events(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_decisions_user ON authorization_decisions(user_id);
CREATE INDEX idx_auth_decisions_resource ON authorization_decisions(resource_type, resource_id);
CREATE INDEX idx_auth_decisions_decision ON authorization_decisions(decision);
CREATE INDEX idx_auth_decisions_created ON authorization_decisions(created_at);

-- Function to log authorization decision with context
CREATE OR REPLACE FUNCTION log_authorization_decision(
    p_user_id UUID,
    p_resource_type VARCHAR(100),
    p_resource_id VARCHAR(255),
    p_action VARCHAR(100),
    p_decision VARCHAR(20),
    p_policies TEXT[] DEFAULT '{}',
    p_context JSONB DEFAULT '{}',
    p_request_context JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    decision_id VARCHAR(255);
    security_event_id UUID;
    audit_log_id UUID;
    risk_score INTEGER := 0;
BEGIN
    -- Generate unique decision ID
    decision_id := 'auth_' || extract(epoch from now())::bigint || '_' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Calculate risk score based on decision and context
    IF p_decision = 'deny' THEN
        risk_score := 75;
    ELSIF p_decision = 'conditional' THEN
        risk_score := 25;
    END IF;
    
    -- Create audit log entry
    INSERT INTO audit_logs 
        (user_id, action, resource_type, resource_id, authorization_context, 
         access_decision, permission_checked, security_level)
    VALUES 
        (p_user_id, p_action, p_resource_type, p_resource_id, p_context,
         p_decision, p_policies, CASE WHEN risk_score > 50 THEN 'high' ELSE 'standard' END)
    RETURNING id INTO audit_log_id;
    
    -- Create security event
    INSERT INTO security_events 
        (event_type, user_id, resource_type, resource_id, action_attempted,
         authorization_result, permissions_required, risk_score, request_context, audit_log_id)
    VALUES 
        ('authorization_decision', p_user_id, p_resource_type, p_resource_id, p_action,
         p_decision, p_policies, risk_score, p_request_context, audit_log_id)
    RETURNING id INTO security_event_id;
    
    -- Record authorization decision
    INSERT INTO authorization_decisions 
        (decision_id, user_id, resource_type, resource_id, action, decision,
         evaluated_policies, conditions_met, context, security_event_id)
    VALUES 
        (decision_id, p_user_id, p_resource_type, p_resource_id, p_action, p_decision,
         p_policies, p_context, p_context, security_event_id);
    
    RETURN security_event_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

---

## IMPLEMENTATION GUIDANCE

### Step 1: Enhance Audit Context Service

**File**: `backend/internal/services/audit_context_service.go`

**Add comprehensive authorization context capture**:
```go
// EnhancedAuthorizationContext captures complete authorization decision context
type EnhancedAuthorizationContext struct {
    UserID              uuid.UUID                 `json:"user_id"`
    SessionID           string                    `json:"session_id"`
    RequestID           string                    `json:"request_id"`
    ResourceType        string                    `json:"resource_type"`
    ResourceID          string                    `json:"resource_id"`
    Action              string                    `json:"action"`
    Decision            string                    `json:"decision"`
    PolicyVersion       string                    `json:"policy_version"`
    EvaluatedPolicies   []string                  `json:"evaluated_policies"`
    PermissionsRequired []string                  `json:"permissions_required"`
    PermissionsGranted  []string                  `json:"permissions_granted"`
    DenialReason        string                    `json:"denial_reason,omitempty"`
    RiskScore           int                       `json:"risk_score"`
    RequestContext      map[string]interface{}    `json:"request_context"`
    Timestamp           time.Time                 `json:"timestamp"`
}

// LogAuthorizationDecision logs comprehensive authorization context
func (acs *AuditContextService) LogAuthorizationDecision(
    ctx context.Context,
    authCtx *EnhancedAuthorizationContext,
) error {
    // Validate required fields
    if authCtx.UserID == uuid.Nil || authCtx.Action == "" || authCtx.Decision == "" {
        return fmt.Errorf("invalid authorization context: missing required fields")
    }
    
    // Prepare context for database
    contextJSON, err := json.Marshal(authCtx.RequestContext)
    if err != nil {
        return fmt.Errorf("failed to marshal request context: %w", err)
    }
    
    // Log using PostgreSQL function
    var securityEventID uuid.UUID
    query := `SELECT log_authorization_decision($1, $2, $3, $4, $5, $6, $7, $8)`
    
    err = acs.db.QueryRowContext(
        ctx, query,
        authCtx.UserID,
        authCtx.ResourceType,
        authCtx.ResourceID,
        authCtx.Action,
        authCtx.Decision,
        pq.Array(authCtx.EvaluatedPolicies),
        json.RawMessage(contextJSON),
        json.RawMessage(contextJSON),
    ).Scan(&securityEventID)
    
    if err != nil {
        return fmt.Errorf("failed to log authorization decision: %w", err)
    }
    
    // Emit security event for real-time monitoring
    if authCtx.RiskScore > 50 {
        acs.emitHighRiskSecurityEvent(ctx, securityEventID, authCtx)
    }
    
    return nil
}
```

### Step 2: Enhance Authorization Middleware

**File**: `backend/internal/middleware/auth_middleware.go`

**Add comprehensive authorization context logging**:
```go
// authorizationLoggingMiddleware captures authorization decisions
func (am *AuthMiddleware) authorizationLoggingMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        startTime := time.Now()
        
        // Extract authorization context
        userID := am.getUserIDFromContext(c)
        sessionID := am.getSessionIDFromContext(c)
        requestID := am.getRequestIDFromContext(c)
        
        // Prepare authorization context
        authCtx := &EnhancedAuthorizationContext{
            UserID:     userID,
            SessionID:  sessionID,
            RequestID:  requestID,
            Action:     fmt.Sprintf("%s %s", c.Request.Method, c.FullPath()),
            Timestamp:  startTime,
            RequestContext: map[string]interface{}{
                "method":     c.Request.Method,
                "path":       c.Request.URL.Path,
                "query":      c.Request.URL.RawQuery,
                "user_agent": c.Request.UserAgent(),
                "source_ip":  c.ClientIP(),
                "headers":    am.sanitizeHeaders(c.Request.Header),
            },
        }
        
        // Extract resource context from route
        if campaignID := c.Param("campaignId"); campaignID != "" {
            authCtx.ResourceType = "campaign"
            authCtx.ResourceID = campaignID
        } else if personaID := c.Param("personaId"); personaID != "" {
            authCtx.ResourceType = "persona"
            authCtx.ResourceID = personaID
        }
        
        // Process request
        c.Next()
        
        // Capture authorization decision
        authCtx.Decision = am.determineAuthorizationDecision(c)
        authCtx.RiskScore = am.calculateRiskScore(c, authCtx)
        
        // Log authorization decision
        if err := am.auditContextService.LogAuthorizationDecision(c.Request.Context(), authCtx); err != nil {
            log.Printf("WARNING: Failed to log authorization decision: %v", err)
        }
    }
}

func (am *AuthMiddleware) determineAuthorizationDecision(c *gin.Context) string {
    status := c.Writer.Status()
    
    switch {
    case status == 200 || status == 201:
        return "allow"
    case status == 401 || status == 403:
        return "deny"
    case status >= 400 && status < 500:
        return "conditional"
    default:
        return "unknown"
    }
}

func (am *AuthMiddleware) calculateRiskScore(c *gin.Context, authCtx *EnhancedAuthorizationContext) int {
    score := 0
    
    // Base score on decision
    switch authCtx.Decision {
    case "deny":
        score += 75
    case "allow":
        score += 10
    case "conditional":
        score += 25
    }
    
    // Increase score for sensitive resources
    if authCtx.ResourceType == "campaign" && c.Request.Method != "GET" {
        score += 15
    }
    
    // Increase score for administrative actions
    if strings.Contains(c.FullPath(), "/admin/") {
        score += 20
    }
    
    // Cap at 100
    if score > 100 {
        score = 100
    }
    
    return score
}
```

### Step 3: Implement Security Event Monitoring

**File**: `backend/internal/services/security_event_monitor.go`

```go
package services

import (
    "context"
    "fmt"
    "log"
    "time"
    
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
)

// SecurityEventMonitor monitors and responds to security events
type SecurityEventMonitor struct {
    db                    *sqlx.DB
    highRiskThreshold     int
    alertingService       AlertingService
    auditContextService   *AuditContextService
}

func NewSecurityEventMonitor(db *sqlx.DB, alertingService AlertingService) *SecurityEventMonitor {
    return &SecurityEventMonitor{
        db:                  db,
        highRiskThreshold:   70,
        alertingService:     alertingService,
    }
}

// MonitorAuthorizationPatterns detects suspicious authorization patterns
func (sem *SecurityEventMonitor) MonitorAuthorizationPatterns(ctx context.Context) error {
    // Detect repeated authorization failures
    suspiciousUsers, err := sem.detectRepeatedFailures(ctx)
    if err != nil {
        return fmt.Errorf("failed to detect repeated failures: %w", err)
    }
    
    for _, userID := range suspiciousUsers {
        if err := sem.handleSuspiciousUser(ctx, userID); err != nil {
            log.Printf("WARNING: Failed to handle suspicious user %s: %v", userID, err)
        }
    }
    
    // Detect privilege escalation attempts
    escalationAttempts, err := sem.detectPrivilegeEscalation(ctx)
    if err != nil {
        return fmt.Errorf("failed to detect privilege escalation: %w", err)
    }
    
    for _, attempt := range escalationAttempts {
        if err := sem.handlePrivilegeEscalation(ctx, attempt); err != nil {
            log.Printf("WARNING: Failed to handle privilege escalation: %v", err)
        }
    }
    
    return nil
}

func (sem *SecurityEventMonitor) detectRepeatedFailures(ctx context.Context) ([]uuid.UUID, error) {
    var suspiciousUsers []uuid.UUID
    
    query := `
        SELECT user_id, COUNT(*) as failure_count
        FROM security_events 
        WHERE authorization_result = 'deny' 
          AND created_at > NOW() - INTERVAL '1 hour'
          AND user_id IS NOT NULL
        GROUP BY user_id 
        HAVING COUNT(*) >= 5
        ORDER BY failure_count DESC`
    
    rows, err := sem.db.QueryContext(ctx, query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    for rows.Next() {
        var userID uuid.UUID
        var count int
        
        if err := rows.Scan(&userID, &count); err != nil {
            continue
        }
        
        suspiciousUsers = append(suspiciousUsers, userID)
    }
    
    return suspiciousUsers, nil
}

func (sem *SecurityEventMonitor) handleSuspiciousUser(ctx context.Context, userID uuid.UUID) error {
    // Log security alert
    alertCtx := &EnhancedAuthorizationContext{
        UserID:       userID,
        Action:       "security_alert",
        Decision:     "alert",
        RiskScore:    90,
        ResourceType: "user_behavior",
        Timestamp:    time.Now(),
        RequestContext: map[string]interface{}{
            "alert_type": "repeated_authorization_failures",
            "user_id":    userID.String(),
        },
    }
    
    return sem.auditContextService.LogAuthorizationDecision(ctx, alertCtx)
}
```

### Step 4: Add Authorization Context to Campaign Operations

**File**: `backend/internal/services/campaign_orchestrator_service.go`

**Add authorization context to campaign operations**:
```go
func (c *CampaignOrchestratorService) CreateCampaignWithAuthorizationContext(
    ctx context.Context,
    campaign *models.Campaign,
    userID uuid.UUID,
    requestContext map[string]interface{},
) error {
    // Check authorization and log decision
    authCtx := &EnhancedAuthorizationContext{
        UserID:              userID,
        ResourceType:        "campaign",
        ResourceID:          campaign.ID.String(),
        Action:              "create_campaign",
        PermissionsRequired: []string{"campaign:create"},
        RequestContext:      requestContext,
        Timestamp:           time.Now(),
    }
    
    // Verify user has required permissions
    hasPermission, err := c.accessControlService.CheckUserPermission(
        ctx, userID, "campaign:create", campaign.ID.String(),
    )
    if err != nil {
        authCtx.Decision = "error"
        authCtx.DenialReason = fmt.Sprintf("Permission check failed: %v", err)
        authCtx.RiskScore = 50
        
        c.auditContextService.LogAuthorizationDecision(ctx, authCtx)
        return fmt.Errorf("authorization check failed: %w", err)
    }
    
    if !hasPermission {
        authCtx.Decision = "deny"
        authCtx.DenialReason = "Insufficient permissions for campaign creation"
        authCtx.RiskScore = 75
        
        c.auditContextService.LogAuthorizationDecision(ctx, authCtx)
        return fmt.Errorf("access denied: insufficient permissions")
    }
    
    // Authorization successful
    authCtx.Decision = "allow"
    authCtx.PermissionsGranted = []string{"campaign:create"}
    authCtx.RiskScore = 10
    
    // Log successful authorization
    if err := c.auditContextService.LogAuthorizationDecision(ctx, authCtx); err != nil {
        log.Printf("WARNING: Failed to log authorization decision: %v", err)
    }
    
    // Proceed with campaign creation
    return c.CreateCampaignWithAtomicOperations(ctx, campaign)
}
```

### Step 5: Create Integration Tests

**File**: `backend/internal/services/bl006_authorization_audit_test.go`

```go
package services

import (
    "context"
    "testing"
    "time"
    
    "github.com/stretchr/testify/suite"
    "github.com/google/uuid"
    "your-project/internal/testutil"
    "your-project/internal/models"
)

type BL006AuthorizationAuditTestSuite struct {
    testutil.ServiceTestSuite
    auditContextService  *AuditContextService
    securityMonitor      *SecurityEventMonitor
}

func TestBL006AuthorizationAudit(t *testing.T) {
    suite.Run(t, &BL006AuthorizationAuditTestSuite{
        ServiceTestSuite: testutil.ServiceTestSuite{
            UseDatabaseFromEnv: true, // MANDATORY: Real database testing
        },
    })
}

func (suite *BL006AuthorizationAuditTestSuite) TestAuthorizationContextLogging() {
    userID := uuid.New()
    campaignID := uuid.New()
    
    authCtx := &EnhancedAuthorizationContext{
        UserID:              userID,
        SessionID:           "test-session-123",
        RequestID:           "req-" + uuid.New().String(),
        ResourceType:        "campaign",
        ResourceID:          campaignID.String(),
        Action:              "create_campaign",
        Decision:            "allow",
        PolicyVersion:       "v1.0",
        EvaluatedPolicies:   []string{"campaign_create_policy", "user_permissions_policy"},
        PermissionsRequired: []string{"campaign:create"},
        PermissionsGranted:  []string{"campaign:create"},
        RiskScore:           10,
        RequestContext: map[string]interface{}{
            "method":     "POST",
            "path":       "/api/campaigns",
            "source_ip":  "192.168.1.100",
            "user_agent": "DomainFlow-Client/1.0",
        },
        Timestamp: time.Now(),
    }
    
    // Log authorization decision
    err := suite.auditContextService.LogAuthorizationDecision(context.Background(), authCtx)
    suite.NoError(err)
    
    // Verify audit log was created with context
    suite.ValidateAuditLogContext(userID, campaignID, "allow")
}

func (suite *BL006AuthorizationAuditTestSuite) TestSecurityEventGeneration() {
    userID := uuid.New()
    
    // Simulate repeated authorization failures
    for i := 0; i < 6; i++ {
        authCtx := &EnhancedAuthorizationContext{
            UserID:       userID,
            Action:       "access_admin_panel",
            Decision:     "deny",
            DenialReason: "Insufficient privileges",
            RiskScore:    75,
            ResourceType: "admin_panel",
            Timestamp:    time.Now(),
        }
        
        err := suite.auditContextService.LogAuthorizationDecision(context.Background(), authCtx)
        suite.NoError(err)
    }
    
    // Run security monitoring
    err := suite.securityMonitor.MonitorAuthorizationPatterns(context.Background())
    suite.NoError(err)
    
    // Verify security alert was generated
    suite.ValidateSecurityAlert(userID, "repeated_authorization_failures")
}

func (suite *BL006AuthorizationAuditTestSuite) ValidateAuditLogContext(userID, campaignID uuid.UUID, decision string) {
    var count int
    query := `
        SELECT COUNT(*) 
        FROM audit_logs 
        WHERE user_id = $1 
          AND resource_id = $2 
          AND access_decision = $3
          AND authorization_context IS NOT NULL`
    
    err := suite.db.Get(&count, query, userID, campaignID.String(), decision)
    suite.NoError(err)
    suite.Equal(1, count, "Should have audit log with authorization context")
    
    // Verify security event was created
    var securityEventCount int
    err = suite.db.Get(&securityEventCount, 
        "SELECT COUNT(*) FROM security_events WHERE user_id = $1 AND authorization_result = $2", 
        userID, decision)
    suite.NoError(err)
    suite.Equal(1, securityEventCount, "Should have corresponding security event")
}

func (suite *BL006AuthorizationAuditTestSuite) ValidateSecurityAlert(userID uuid.UUID, alertType string) {
    var alertCount int
    query := `
        SELECT COUNT(*) 
        FROM security_events 
        WHERE user_id = $1 
          AND event_type = 'security_alert'
          AND request_context->>'alert_type' = $2`
    
    err := suite.db.Get(&alertCount, query, userID, alertType)
    suite.NoError(err)
    suite.True(alertCount > 0, "Should have generated security alert")
}
```

---

## TESTING REQUIREMENTS

### Environment Setup
```bash
export TEST_POSTGRES_DSN="postgresql://username:password@localhost/domainflow_production"
export USE_REAL_DATABASE=true
export TEST_TIMEOUT=30s
```

### Test Execution
```bash
# Run BL-006 specific tests
go test ./internal/services -run TestBL006 -race -v

# Test authorization audit logging
go test ./internal/middleware -run TestAuthorizationLogging -race -v
```

---

## CI/CD VALIDATION CHECKLIST

### Mandatory Checks
- [ ] `go test ./... -race` passes with zero data races
- [ ] `golangci-lint run` clean with zero critical issues
- [ ] BL-006 authorization audit tests pass
- [ ] Security event monitoring tests validate pattern detection
- [ ] Authorization context logging works in middleware
- [ ] Database performance impact < 5% for audit logging

### Database Validation
- [ ] Migration applies cleanly to `domainflow_production`
- [ ] Authorization context indexes improve query performance
- [ ] Security events table handles high-volume logging
- [ ] audit_logs table extended fields work correctly

### Integration Validation
- [ ] Integration with existing audit logging verified
- [ ] Middleware authorization context capture working
- [ ] Campaign operations include authorization logging
- [ ] Security monitoring patterns detect threats correctly

---

## SUCCESS CRITERIA

### Functional Requirements
1. **Complete Authorization Context**: All authorization decisions captured with full context
2. **Security Event Generation**: High-risk authorization events trigger monitoring alerts
3. **Audit Trail Completeness**: Comprehensive audit trail for compliance reporting
4. **Real-time Monitoring**: Security events monitored for suspicious patterns

### Performance Requirements
1. **Logging Overhead**: < 5ms additional latency for authorization logging
2. **Query Performance**: Authorization audit queries execute < 100ms
3. **Storage Efficiency**: Audit context storage optimized for searchability

### Integration Requirements
1. **Middleware Integration**: Authorization logging seamlessly integrated in request pipeline
2. **Service Integration**: Campaign and resource operations include authorization context
3. **Monitoring Integration**: Security events integrate with alerting systems

---

## ROLLBACK PROCEDURES

### Database Rollback
```sql
-- File: backend/database/migrations/009_rollback_bl006.sql
BEGIN;
DROP FUNCTION IF EXISTS log_authorization_decision(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT[], JSONB, JSONB);
DROP TABLE IF EXISTS authorization_decisions;
DROP TABLE IF EXISTS security_events;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS resource_sensitivity;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS permission_checked;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS access_decision;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS security_level;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS authorization_context;
COMMIT;
```

---

**Implementation Priority**: HIGH - Enables security compliance and monitoring  
**Next Step**: Begin with PostgreSQL migration, then enhance audit context service  
**Security Foundation**: Essential for BL-005 and BL-007 security implementations