# BL-005: AUTHORIZATION GAPS IN API ENDPOINTS - TACTICAL PLAN

**Finding ID**: BL-005  
**Priority**: HIGH  
**Phase**: 2B Security  
**Estimated Effort**: 4-5 days  
**Dependencies**: ✅ Phase 2A Foundation, ✅ BL-006 Authorization Context Logging

---

## FINDING OVERVIEW

**Problem Statement**: Missing or inconsistent authorization checks across API endpoints, creating security vulnerabilities and potential privilege escalation paths.

**Root Cause**: Incomplete authorization middleware coverage, inconsistent permission checking patterns, and missing resource-level access controls across different API endpoints.

**Impact**: 
- Unauthorized access to sensitive campaign data
- Potential privilege escalation attacks
- Inconsistent security posture across API surface
- Compliance violations for data access controls

**Integration Points**: 
- Builds on BL-006 authorization context logging
- Enhances existing [`auth_middleware.go`](../../../backend/internal/middleware/auth_middleware.go:1) and current service patterns
- Integrates with BL-008 multi-layer access control
- Connects to campaign and persona API handlers

---

## POSTGRESQL MIGRATION

**File**: `backend/database/migrations/010_bl005_api_authorization_controls.sql`

```sql
BEGIN;

-- API endpoint permissions mapping
CREATE TABLE IF NOT EXISTS api_endpoint_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_pattern VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    required_permissions TEXT[] NOT NULL DEFAULT '{}',
    resource_type VARCHAR(100),
    minimum_role VARCHAR(50) DEFAULT 'user',
    requires_ownership BOOLEAN DEFAULT false,
    requires_campaign_access BOOLEAN DEFAULT false,
    bypass_conditions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(endpoint_pattern, http_method)
);

CREATE INDEX idx_api_endpoint_permissions_pattern ON api_endpoint_permissions(endpoint_pattern);
CREATE INDEX idx_api_endpoint_permissions_method ON api_endpoint_permissions(http_method);
CREATE INDEX idx_api_endpoint_permissions_resource ON api_endpoint_permissions(resource_type);

-- Insert comprehensive API endpoint permissions
INSERT INTO api_endpoint_permissions 
    (endpoint_pattern, http_method, required_permissions, resource_type, minimum_role, requires_ownership, requires_campaign_access) 
VALUES
    -- Campaign endpoints
    ('/api/campaigns', 'GET', ARRAY['campaign:list'], 'campaign', 'user', false, false),
    ('/api/campaigns', 'POST', ARRAY['campaign:create'], 'campaign', 'user', false, false),
    ('/api/campaigns/:id', 'GET', ARRAY['campaign:read'], 'campaign', 'user', false, true),
    ('/api/campaigns/:id', 'PUT', ARRAY['campaign:update'], 'campaign', 'user', true, true),
    ('/api/campaigns/:id', 'DELETE', ARRAY['campaign:delete'], 'campaign', 'user', true, true),
    ('/api/campaigns/:id/start', 'POST', ARRAY['campaign:execute'], 'campaign', 'user', true, true),
    ('/api/campaigns/:id/stop', 'POST', ARRAY['campaign:execute'], 'campaign', 'user', true, true),
    
    -- Persona endpoints
    ('/api/personas', 'GET', ARRAY['persona:list'], 'persona', 'user', false, false),
    ('/api/personas', 'POST', ARRAY['persona:create'], 'persona', 'user', false, false),
    ('/api/personas/:id', 'GET', ARRAY['persona:read'], 'persona', 'user', false, false),
    ('/api/personas/:id', 'PUT', ARRAY['persona:update'], 'persona', 'user', true, false),
    ('/api/personas/:id', 'DELETE', ARRAY['persona:delete'], 'persona', 'user', true, false),
    
    -- Admin endpoints
    ('/api/admin/users', 'GET', ARRAY['admin:user_management'], 'user', 'admin', false, false),
    ('/api/admin/users/:id', 'PUT', ARRAY['admin:user_management'], 'user', 'admin', false, false),
    ('/api/admin/system/stats', 'GET', ARRAY['admin:system_access'], 'system', 'admin', false, false),
    
    -- Proxy endpoints
    ('/api/proxies', 'GET', ARRAY['proxy:list'], 'proxy', 'user', false, false),
    ('/api/proxies', 'POST', ARRAY['proxy:create'], 'proxy', 'user', false, false),
    ('/api/proxies/:id', 'PUT', ARRAY['proxy:update'], 'proxy', 'user', true, false);

-- API access violations tracking
CREATE TABLE IF NOT EXISTS api_access_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id VARCHAR(255),
    endpoint_pattern VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    required_permissions TEXT[] DEFAULT '{}',
    user_permissions TEXT[] DEFAULT '{}',
    resource_id VARCHAR(255),
    violation_details JSONB DEFAULT '{}',
    source_ip INET,
    user_agent TEXT,
    request_headers JSONB DEFAULT '{}',
    response_status INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_violations_user ON api_access_violations(user_id);
CREATE INDEX idx_access_violations_endpoint ON api_access_violations(endpoint_pattern);
CREATE INDEX idx_access_violations_type ON api_access_violations(violation_type);
CREATE INDEX idx_access_violations_created ON api_access_violations(created_at);

-- Function to check endpoint authorization
CREATE OR REPLACE FUNCTION check_endpoint_authorization(
    p_endpoint_pattern VARCHAR(255),
    p_http_method VARCHAR(10),
    p_user_permissions TEXT[],
    p_user_role VARCHAR(50),
    p_is_resource_owner BOOLEAN DEFAULT false,
    p_has_campaign_access BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
    endpoint_config RECORD;
    authorization_result JSONB;
    missing_permissions TEXT[] := '{}';
    has_required_permissions BOOLEAN := true;
    perm TEXT;
BEGIN
    -- Get endpoint configuration
    SELECT * INTO endpoint_config
    FROM api_endpoint_permissions
    WHERE endpoint_pattern = p_endpoint_pattern 
      AND http_method = p_http_method;
    
    IF NOT FOUND THEN
        -- Default deny for unknown endpoints
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'unknown_endpoint',
            'endpoint_pattern', p_endpoint_pattern,
            'http_method', p_http_method
        );
    END IF;
    
    -- Check role requirement
    IF endpoint_config.minimum_role = 'admin' AND p_user_role != 'admin' THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'insufficient_role',
            'required_role', endpoint_config.minimum_role,
            'user_role', p_user_role
        );
    END IF;
    
    -- Check ownership requirement
    IF endpoint_config.requires_ownership AND NOT p_is_resource_owner THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'ownership_required',
            'resource_type', endpoint_config.resource_type
        );
    END IF;
    
    -- Check campaign access requirement
    IF endpoint_config.requires_campaign_access AND NOT p_has_campaign_access THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'campaign_access_required',
            'resource_type', endpoint_config.resource_type
        );
    END IF;
    
    -- Check required permissions
    FOREACH perm IN ARRAY endpoint_config.required_permissions
    LOOP
        IF NOT (perm = ANY(p_user_permissions)) THEN
            missing_permissions := array_append(missing_permissions, perm);
            has_required_permissions := false;
        END IF;
    END LOOP;
    
    IF NOT has_required_permissions THEN
        RETURN jsonb_build_object(
            'authorized', false,
            'reason', 'missing_permissions',
            'required_permissions', endpoint_config.required_permissions,
            'missing_permissions', missing_permissions,
            'user_permissions', p_user_permissions
        );
    END IF;
    
    -- Authorization successful
    RETURN jsonb_build_object(
        'authorized', true,
        'required_permissions', endpoint_config.required_permissions,
        'resource_type', endpoint_config.resource_type
    );
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

---

## IMPLEMENTATION GUIDANCE

### Step 1: Enhance Authorization Middleware

**File**: `backend/internal/middleware/auth_middleware.go`

**Add comprehensive endpoint authorization checking**:
```go
// EndpointAuthorizationMiddleware provides comprehensive API endpoint authorization
func (am *AuthMiddleware) EndpointAuthorizationMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        startTime := time.Now()
        
        // Extract user context
        userContext, exists := am.getUserContext(c)
        if !exists {
            am.handleAuthorizationFailure(c, "missing_user_context", "User context not found")
            return
        }
        
        // Get endpoint pattern and method
        endpointPattern := am.getEndpointPattern(c)
        httpMethod := c.Request.Method
        
        // Check endpoint authorization
        authResult, err := am.checkEndpointAuthorization(c, userContext, endpointPattern, httpMethod)
        if err != nil {
            am.handleAuthorizationError(c, err)
            return
        }
        
        if !authResult.Authorized {
            am.handleAuthorizationDenial(c, userContext, authResult)
            return
        }
        
        // Store authorization context for downstream handlers
        c.Set("authorization_result", authResult)
        c.Set("authorization_time", time.Since(startTime))
        
        c.Next()
    }
}

// checkEndpointAuthorization performs comprehensive authorization check
func (am *AuthMiddleware) checkEndpointAuthorization(
    c *gin.Context,
    userContext *UserContext,
    endpointPattern, httpMethod string,
) (*AuthorizationResult, error) {
    // Get resource ownership and campaign access status
    isResourceOwner, err := am.checkResourceOwnership(c, userContext)
    if err != nil {
        return nil, fmt.Errorf("failed to check resource ownership: %w", err)
    }
    
    hasCampaignAccess, err := am.checkCampaignAccess(c, userContext)
    if err != nil {
        return nil, fmt.Errorf("failed to check campaign access: %w", err)
    }
    
    // Call PostgreSQL authorization function
    var authResultJSON []byte
    query := `SELECT check_endpoint_authorization($1, $2, $3, $4, $5, $6)`
    
    err = am.db.QueryRowContext(
        c.Request.Context(), query,
        endpointPattern, httpMethod,
        pq.Array(userContext.Permissions),
        userContext.Role,
        isResourceOwner,
        hasCampaignAccess,
    ).Scan(&authResultJSON)
    
    if err != nil {
        return nil, fmt.Errorf("authorization check failed: %w", err)
    }
    
    // Parse authorization result
    var authResult AuthorizationResult
    if err := json.Unmarshal(authResultJSON, &authResult); err != nil {
        return nil, fmt.Errorf("failed to parse authorization result: %w", err)
    }
    
    return &authResult, nil
}

// getEndpointPattern converts Gin route to authorization pattern
func (am *AuthMiddleware) getEndpointPattern(c *gin.Context) string {
    // Convert Gin route parameters to authorization pattern
    fullPath := c.FullPath()
    
    // Replace Gin parameter syntax with our pattern syntax
    pattern := strings.ReplaceAll(fullPath, ":id", ":id")
    pattern = strings.ReplaceAll(pattern, ":campaignId", ":id")
    pattern = strings.ReplaceAll(pattern, ":personaId", ":id")
    
    return pattern
}

func (am *AuthMiddleware) checkResourceOwnership(c *gin.Context, userContext *UserContext) (bool, error) {
    // Extract resource ID from route parameters
    resourceID := c.Param("id")
    if resourceID == "" {
        return false, nil // No ownership check needed
    }
    
    // Determine resource type from route
    resourceType := am.getResourceTypeFromRoute(c.FullPath())
    if resourceType == "" {
        return false, nil
    }
    
    // Check ownership based on resource type
    switch resourceType {
    case "campaign":
        return am.checkCampaignOwnership(c.Request.Context(), userContext.UserID, resourceID)
    case "persona":
        return am.checkPersonaOwnership(c.Request.Context(), userContext.UserID, resourceID)
    case "proxy":
        return am.checkProxyOwnership(c.Request.Context(), userContext.UserID, resourceID)
    default:
        return false, nil
    }
}
```

### Step 2: Implement Resource Ownership Checks

**Add to**: `backend/internal/middleware/auth_middleware.go`

```go
func (am *AuthMiddleware) checkCampaignOwnership(ctx context.Context, userID uuid.UUID, campaignID string) (bool, error) {
    var count int
    query := `SELECT COUNT(*) FROM campaigns WHERE id = $1 AND user_id = $2`
    
    err := am.db.GetContext(ctx, &count, query, campaignID, userID)
    if err != nil {
        return false, fmt.Errorf("failed to check campaign ownership: %w", err)
    }
    
    return count > 0, nil
}

func (am *AuthMiddleware) checkCampaignAccess(c *gin.Context, userContext *UserContext) (bool, error) {
    // Check if user has access to campaign (either owner or has been granted access)
    campaignID := c.Param("id")
    if campaignID == "" {
        return false, nil // No campaign context
    }
    
    // Check direct ownership
    isOwner, err := am.checkCampaignOwnership(c.Request.Context(), userContext.UserID, campaignID)
    if err != nil {
        return false, err
    }
    
    if isOwner {
        return true, nil
    }
    
    // Check if user has been granted access to campaign
    var accessCount int
    query := `
        SELECT COUNT(*) 
        FROM campaign_access_grants 
        WHERE campaign_id = $1 AND user_id = $2 AND is_active = true`
    
    err = am.db.GetContext(c.Request.Context(), &accessCount, query, campaignID, userContext.UserID)
    if err != nil {
        return false, fmt.Errorf("failed to check campaign access grants: %w", err)
    }
    
    return accessCount > 0, nil
}

func (am *AuthMiddleware) getResourceTypeFromRoute(fullPath string) string {
    switch {
    case strings.Contains(fullPath, "/campaigns"):
        return "campaign"
    case strings.Contains(fullPath, "/personas"):
        return "persona"
    case strings.Contains(fullPath, "/proxies"):
        return "proxy"
    case strings.Contains(fullPath, "/users"):
        return "user"
    default:
        return ""
    }
}

func (am *AuthMiddleware) handleAuthorizationDenial(c *gin.Context, userContext *UserContext, authResult *AuthorizationResult) {
    // Log access violation
    violation := &APIAccessViolation{
        UserID:              userContext.UserID,
        SessionID:           userContext.SessionID,
        EndpointPattern:     c.FullPath(),
        HTTPMethod:          c.Request.Method,
        ViolationType:       authResult.Reason,
        RequiredPermissions: authResult.RequiredPermissions,
        UserPermissions:     userContext.Permissions,
        ResourceID:          c.Param("id"),
        SourceIP:            c.ClientIP(),
        UserAgent:           c.Request.UserAgent(),
        ResponseStatus:      403,
    }
    
    if err := am.logAccessViolation(c.Request.Context(), violation); err != nil {
        log.Printf("WARNING: Failed to log access violation: %v", err)
    }
    
    // Return appropriate error response
    c.JSON(403, gin.H{
        "error":   "access_denied",
        "message": am.getAuthorizationErrorMessage(authResult.Reason),
        "details": authResult,
    })
    c.Abort()
}
```

### Step 3: Create API Authorization Service

**File**: `backend/internal/services/api_authorization_service.go`

```go
package services

import (
    "context"
    "encoding/json"
    "fmt"
    "time"
    
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
    "github.com/lib/pq"
)

// APIAuthorizationService manages API endpoint authorization
type APIAuthorizationService struct {
    db                  *sqlx.DB
    auditContextService *AuditContextService
}

func NewAPIAuthorizationService(db *sqlx.DB, auditService *AuditContextService) *APIAuthorizationService {
    return &APIAuthorizationService{
        db:                  db,
        auditContextService: auditService,
    }
}

// AuthorizeAPIAccess performs comprehensive API endpoint authorization
func (aas *APIAuthorizationService) AuthorizeAPIAccess(
    ctx context.Context,
    request *APIAuthorizationRequest,
) (*APIAuthorizationResult, error) {
    startTime := time.Now()
    
    // Get user permissions
    userPermissions, err := aas.getUserPermissions(ctx, request.UserID)
    if err != nil {
        return nil, fmt.Errorf("failed to get user permissions: %w", err)
    }
    
    // Check resource ownership if required
    isResourceOwner := false
    if request.ResourceID != "" {
        isResourceOwner, err = aas.checkResourceOwnership(ctx, request.UserID, request.ResourceType, request.ResourceID)
        if err != nil {
            return nil, fmt.Errorf("failed to check resource ownership: %w", err)
        }
    }
    
    // Check campaign access if required
    hasCampaignAccess := false
    if request.CampaignID != "" {
        hasCampaignAccess, err = aas.checkCampaignAccess(ctx, request.UserID, request.CampaignID)
        if err != nil {
            return nil, fmt.Errorf("failed to check campaign access: %w", err)
        }
    }
    
    // Perform authorization check
    var authResultJSON []byte
    query := `SELECT check_endpoint_authorization($1, $2, $3, $4, $5, $6)`
    
    err = aas.db.QueryRowContext(
        ctx, query,
        request.EndpointPattern, request.HTTPMethod,
        pq.Array(userPermissions), request.UserRole,
        isResourceOwner, hasCampaignAccess,
    ).Scan(&authResultJSON)
    
    if err != nil {
        return nil, fmt.Errorf("authorization check failed: %w", err)
    }
    
    // Parse result
    var authResult APIAuthorizationResult
    if err := json.Unmarshal(authResultJSON, &authResult); err != nil {
        return nil, fmt.Errorf("failed to parse authorization result: %w", err)
    }
    
    // Log authorization decision
    authCtx := &EnhancedAuthorizationContext{
        UserID:              request.UserID,
        SessionID:           request.SessionID,
        RequestID:           request.RequestID,
        ResourceType:        request.ResourceType,
        ResourceID:          request.ResourceID,
        Action:              fmt.Sprintf("%s %s", request.HTTPMethod, request.EndpointPattern),
        Decision:            map[bool]string{true: "allow", false: "deny"}[authResult.Authorized],
        PermissionsRequired: authResult.RequiredPermissions,
        PermissionsGranted:  userPermissions,
        DenialReason:        authResult.Reason,
        RiskScore:           aas.calculateRiskScore(&authResult, request),
        RequestContext:      request.RequestContext,
        Timestamp:           startTime,
    }
    
    if err := aas.auditContextService.LogAuthorizationDecision(ctx, authCtx); err != nil {
        // Log but don't fail authorization
        log.Printf("WARNING: Failed to log authorization decision: %v", err)
    }
    
    authResult.AuthorizationDuration = time.Since(startTime)
    return &authResult, nil
}

func (aas *APIAuthorizationService) getUserPermissions(ctx context.Context, userID uuid.UUID) ([]string, error) {
    var permissions []string
    query := `
        SELECT DISTINCT p.permission_name
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = $1 AND up.is_active = true`
    
    rows, err := aas.db.QueryContext(ctx, query, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    for rows.Next() {
        var permission string
        if err := rows.Scan(&permission); err != nil {
            continue
        }
        permissions = append(permissions, permission)
    }
    
    return permissions, nil
}

func (aas *APIAuthorizationService) calculateRiskScore(result *APIAuthorizationResult, request *APIAuthorizationRequest) int {
    score := 0
    
    if !result.Authorized {
        score += 50
        
        // Higher risk for admin endpoints
        if request.ResourceType == "admin" {
            score += 30
        }
        
        // Higher risk for sensitive operations
        if request.HTTPMethod == "DELETE" {
            score += 20
        }
    } else {
        score = 10 // Base score for authorized access
    }
    
    return min(score, 100)
}
```

### Step 4: Update API Handlers with Authorization

**File**: `backend/internal/api/campaign_orchestrator_handlers.go`

**Add explicit authorization checks to handlers**:
```go
func (h *CampaignOrchestratorHandlers) CreateCampaign(c *gin.Context) {
    // Authorization is handled by middleware, but validate result
    authResult, exists := c.Get("authorization_result")
    if !exists {
        c.JSON(500, gin.H{"error": "authorization_check_missing"})
        return
    }
    
    authResponse := authResult.(*AuthorizationResult)
    if !authResponse.Authorized {
        c.JSON(403, gin.H{
            "error":   "access_denied",
            "message": "Insufficient permissions to create campaign",
            "details": authResponse,
        })
        return
    }
    
    // Extract user context
    userContext, _ := c.Get("user_context")
    user := userContext.(*UserContext)
    
    // Parse request
    var request models.CreateCampaignRequest
    if err := c.ShouldBindJSON(&request); err != nil {
        c.JSON(400, gin.H{"error": "invalid_request", "details": err.Error()})
        return
    }
    
    // Create campaign with authorization context
    campaign, err := h.campaignService.CreateCampaignWithAuthorizationContext(
        c.Request.Context(),
        &request,
        user.UserID,
        map[string]interface{}{
            "endpoint":       c.FullPath(),
            "method":         c.Request.Method,
            "source_ip":      c.ClientIP(),
            "user_agent":     c.Request.UserAgent(),
            "authorization":  authResponse,
        },
    )
    
    if err != nil {
        h.handleCampaignError(c, err)
        return
    }
    
    c.JSON(201, campaign)
}

func (h *CampaignOrchestratorHandlers) UpdateCampaign(c *gin.Context) {
    campaignID := c.Param("id")
    
    // Verify campaign ownership through authorization result
    authResult, _ := c.Get("authorization_result")
    authResponse := authResult.(*AuthorizationResult)
    
    if !authResponse.Authorized {
        c.JSON(403, gin.H{
            "error":   "access_denied",
            "message": "You don't have permission to update this campaign",
        })
        return
    }
    
    // Additional ownership verification for sensitive operations
    userContext, _ := c.Get("user_context")
    user := userContext.(*UserContext)
    
    isOwner, err := h.verifyResourceOwnership(c.Request.Context(), user.UserID, "campaign", campaignID)
    if err != nil {
        c.JSON(500, gin.H{"error": "ownership_check_failed"})
        return
    }
    
    if !isOwner && user.Role != "admin" {
        c.JSON(403, gin.H{
            "error":   "access_denied",
            "message": "Only campaign owners or administrators can update campaigns",
        })
        return
    }
    
    // Proceed with update
    var updateRequest models.UpdateCampaignRequest
    if err := c.ShouldBindJSON(&updateRequest); err != nil {
        c.JSON(400, gin.H{"error": "invalid_request", "details": err.Error()})
        return
    }
    
    campaign, err := h.campaignService.UpdateCampaign(c.Request.Context(), campaignID, &updateRequest)
    if err != nil {
        h.handleCampaignError(c, err)
        return
    }
    
    c.JSON(200, campaign)
}
```

### Step 5: Create Integration Tests

**File**: `backend/internal/middleware/bl005_api_authorization_test.go`

```go
package middleware

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/suite"
    "github.com/google/uuid"
    "your-project/internal/testutil"
)

type BL005APIAuthorizationTestSuite struct {
    testutil.ServiceTestSuite
    authMiddleware *AuthMiddleware
    router         *gin.Engine
}

func TestBL005APIAuthorization(t *testing.T) {
    suite.Run(t, &BL005APIAuthorizationTestSuite{
        ServiceTestSuite: testutil.ServiceTestSuite{
            UseDatabaseFromEnv: true, // MANDATORY: Use domainflow_production database
        },
    })
}

func (suite *BL005APIAuthorizationTestSuite) SetupTest() {
    suite.ServiceTestSuite.SetupTest()
    
    gin.SetMode(gin.TestMode)
    suite.router = gin.New()
    suite.authMiddleware = NewAuthMiddleware(suite.db)
    
    // Setup test routes with authorization middleware
    api := suite.router.Group("/api")
    api.Use(suite.authMiddleware.EndpointAuthorizationMiddleware())
    
    api.GET("/campaigns", suite.mockHandler)
    api.POST("/campaigns", suite.mockHandler)
    api.GET("/campaigns/:id", suite.mockHandler)
    api.PUT("/campaigns/:id", suite.mockHandler)
    api.DELETE("/campaigns/:id", suite.mockHandler)
    
    api.GET("/admin/users", suite.mockHandler)
}

func (suite *BL005APIAuthorizationTestSuite) TestCampaignListAuthorization() {
    // Test user with campaign:list permission
    userID := suite.createTestUserWithPermissions([]string{"campaign:list"})
    token := suite.createTestJWT(userID, "user")
    
    req := httptest.NewRequest("GET", "/api/campaigns", nil)
    req.Header.Set("Authorization", "Bearer "+token)
    
    recorder := httptest.NewRecorder()
    suite.router.ServeHTTP(recorder, req)
    
    suite.Equal(200, recorder.Code, "User with campaign:list should access campaign list")
}

func (suite *BL005APIAuthorizationTestSuite) TestCampaignCreateAuthorization() {
    // Test user without campaign:create permission
    userID := suite.createTestUserWithPermissions([]string{"campaign:list"})
    token := suite.createTestJWT(userID, "user")
    
    campaignData := map[string]interface{}{
        "name": "Test Campaign",
        "type": "dns_validation",
    }
    
    jsonData, _ := json.Marshal(campaignData)
    req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(jsonData))
    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("Content-Type", "application/json")
    
    recorder := httptest.NewRecorder()
    suite.router.ServeHTTP(recorder, req)
    
    suite.Equal(403, recorder.Code, "User without campaign:create should be denied")
    
    // Verify access violation was logged
    suite.ValidateAccessViolationLogged(userID, "/api/campaigns", "POST", "missing_permissions")
}

func (suite *BL005APIAuthorizationTestSuite) TestCampaignOwnershipRequirement() {
    userID := suite.createTestUserWithPermissions([]string{"campaign:update"})
    otherUserID := uuid.New()
    
    // Create campaign owned by different user
    campaignID := suite.createTestCampaign(otherUserID)
    token := suite.createTestJWT(userID, "user")
    
    updateData := map[string]interface{}{
        "name": "Updated Campaign Name",
    }
    
    jsonData, _ := json.Marshal(updateData)
    req := httptest.NewRequest("PUT", "/api/campaigns/"+campaignID.String(), bytes.NewBuffer(jsonData))
    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("Content-Type", "application/json")
    
    recorder := httptest.NewRecorder()
    suite.router.ServeHTTP(recorder, req)
    
    suite.Equal(403, recorder.Code, "User should not be able to update campaign they don't own")
    
    // Verify ownership violation was logged
    suite.ValidateAccessViolationLogged(userID, "/api/campaigns/:id", "PUT", "ownership_required")
}

func (suite *BL005APIAuthorizationTestSuite) TestAdminEndpointAccess() {
    // Test regular user accessing admin endpoint
    userID := suite.createTestUserWithPermissions([]string{"campaign:list"})
    token := suite.createTestJWT(userID, "user")
    
    req := httptest.NewRequest("GET", "/api/admin/users", nil)
    req.Header.Set("Authorization", "Bearer "+token)
    
    recorder := httptest.NewRecorder()
    suite.router.ServeHTTP(recorder, req)
    
    suite.Equal(403, recorder.Code, "Regular user should not access admin endpoints")
    
    // Test admin user accessing admin endpoint
    adminID := suite.createTestUserWithPermissions([]string{"admin:user_management"})
    adminToken := suite.createTestJWT(adminID, "admin")
    
    req = httptest.NewRequest("GET", "/api/admin/users", nil)
    req.Header.Set("Authorization", "Bearer "+adminToken)
    
    recorder = httptest.NewRecorder()
    suite.router.ServeHTTP(recorder, req)
    
    suite.Equal(200, recorder.Code, "Admin user should access admin endpoints")
}

func (suite *BL005APIAuthorizationTestSuite) mockHandler(c *gin.Context) {
    c.JSON(200, gin.H{"status": "authorized"})
}

func (suite *BL005APIAuthorizationTestSuite) ValidateAccessViolationLogged(userID uuid.UUID, endpoint, method, violationType string) {
    var count int
    query := `
        SELECT COUNT(*) 
        FROM api_access_violations 
        WHERE user_id = $1 
          AND endpoint_pattern = $2 
          AND http_method = $3 
          AND violation_type = $4`
    
    err := suite.db.Get(&count, query, userID, endpoint, method, violationType)
    suite.NoError(err)
    suite.Equal(1, count, "Access violation should be logged")
}
```

---

## TESTING REQUIREMENTS

### Environment Setup
```bash
export TEST_POSTGRES_DSN="postgresql://username:password@localhost/domainflow_production"
export USE_REAL_DATABASE=true
export TEST_TIMEOUT=30s
export POSTGRES_DATABASE=domainflow_production
```

### Test Execution
```bash
# Run BL-005 specific tests against domainflow_production
go test ./internal/middleware -run TestBL005 -race -v -tags=integration

# Test API authorization patterns
go test ./internal/services -run TestAPIAuthorization -race -v -tags=integration
```

---

## CI/CD VALIDATION CHECKLIST

### Mandatory Checks
- [ ] `go test ./... -race` passes with zero data races
- [ ] `golangci-lint run` clean with zero critical issues
- [ ] BL-005 API authorization tests pass
- [ ] Endpoint permission mapping complete and accurate
- [ ] Resource ownership checks work correctly
- [ ] Access violation logging captures all denial cases

### Database Validation
- [ ] Migration applies cleanly to `domainflow_production`
- [ ] API endpoint permissions table populated correctly
- [ ] Access violation tracking performs well under load
- [ ] Authorization functions return correct results

### Security Validation
- [ ] All API endpoints have explicit permission requirements
- [ ] No endpoints bypass authorization middleware
- [ ] Resource ownership enforced for sensitive operations
- [ ] Admin endpoints properly restricted to admin role

---

## SUCCESS CRITERIA

### Functional Requirements
1. **Complete API Coverage**: All API endpoints have explicit authorization requirements
2. **Permission Enforcement**: Required permissions enforced consistently across endpoints
3. **Resource Ownership**: Ownership requirements enforced for sensitive operations
4. **Access Violation Tracking**: All authorization failures logged with context

### Security Requirements
1. **Default Deny**: Unknown endpoints denied by default
2. **Role-Based Restrictions**: Admin endpoints restricted to admin users
3. **Campaign Access Control**: Campaign-specific access controls enforced
4. **Audit Trail**: Complete audit trail for all authorization decisions

### Performance Requirements
1. **Authorization Overhead**: < 10ms additional latency for authorization checks
2. **Database Performance**: Authorization queries execute < 50ms
3. **Scalability**: Support 500+ concurrent authorization checks

---

## ROLLBACK PROCEDURES

### Database Rollback
```sql
-- File: backend/database/migrations/010_rollback_bl005.sql
BEGIN;
DROP FUNCTION IF EXISTS check_endpoint_authorization(VARCHAR, VARCHAR, TEXT[], VARCHAR, BOOLEAN, BOOLEAN);
DROP TABLE IF EXISTS api_access_violations;
DROP TABLE IF EXISTS api_endpoint_permissions;
COMMIT;
```

---

**Implementation Priority**: HIGH - Critical for API security  
**Next Step**: Begin with PostgreSQL migration, then enhance authorization middleware  
**Security Integration**: Integrates with BL-006 audit logging and prepares for BL-007 input validation