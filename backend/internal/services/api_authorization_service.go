package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

// APIAuthorizationService manages API endpoint authorization
type APIAuthorizationService struct {
	db                  *sqlx.DB
	auditContextService AuditContextService
}

// NewAPIAuthorizationService creates a new API authorization service
func NewAPIAuthorizationService(db *sqlx.DB, auditService AuditContextService) *APIAuthorizationService {
	return &APIAuthorizationService{
		db:                  db,
		auditContextService: auditService,
	}
}

// AuthorizeAPIAccess performs comprehensive API endpoint authorization
func (aas *APIAuthorizationService) AuthorizeAPIAccess(
	ctx context.Context,
	request *models.APIAuthorizationRequest,
) (*models.APIAuthorizationResult, error) {
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

	// Perform authorization check using PostgreSQL function
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
	var authResult models.APIAuthorizationResult
	if err := json.Unmarshal(authResultJSON, &authResult); err != nil {
		return nil, fmt.Errorf("failed to parse authorization result: %w", err)
	}

	// Log authorization decision using BL-006 audit infrastructure
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

	// If access is denied, also log as an access violation
	if !authResult.Authorized {
		sourceIP := getStringFromMap(request.RequestContext, "source_ip")
		if sourceIP == "" {
			sourceIP = "127.0.0.1" // Default for test environments
		}

		violation := &models.APIAccessViolation{
			UserID:              request.UserID,
			SessionID:           request.SessionID,
			EndpointPattern:     request.EndpointPattern,
			HTTPMethod:          request.HTTPMethod,
			ViolationType:       "unauthorized_access",
			RequiredPermissions: authResult.RequiredPermissions,
			UserPermissions:     userPermissions,
			ResourceID:          request.ResourceID,
			ViolationDetails: map[string]interface{}{
				"reason":        authResult.Reason,
				"risk_score":    aas.calculateRiskScore(&authResult, request),
				"request_id":    request.RequestID,
				"resource_type": request.ResourceType,
				"campaign_id":   request.CampaignID,
			},
			SourceIP:       sourceIP,
			UserAgent:      getStringFromMap(request.RequestContext, "user_agent"),
			RequestHeaders: request.RequestContext,
			ResponseStatus: 403,
		}

		if err := aas.LogAccessViolation(ctx, violation); err != nil {
			// Log but don't fail authorization
			log.Printf("WARNING: Failed to log access violation: %v", err)
		}
	}

	authResult.AuthorizationDuration = time.Since(startTime)
	authResult.RequestContext = request.RequestContext
	authResult.RiskScore = aas.calculateRiskScore(&authResult, request)
	return &authResult, nil
}

// getUserPermissions retrieves user permissions from the database
func (aas *APIAuthorizationService) getUserPermissions(ctx context.Context, userID uuid.UUID) ([]string, error) {
	var permissions []string
	query := `
		SELECT DISTINCT p.name
		FROM user_roles ur
		JOIN role_permissions rp ON ur.role_id = rp.role_id
		JOIN permissions p ON rp.permission_id = p.id
		WHERE ur.user_id = $1 
		  AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`

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

// checkResourceOwnership checks if user owns the specified resource
func (aas *APIAuthorizationService) checkResourceOwnership(
	ctx context.Context,
	userID uuid.UUID,
	resourceType, resourceID string,
) (bool, error) {
	switch resourceType {
	case "campaign":
		return aas.checkCampaignOwnership(ctx, userID, resourceID)
	case "persona":
		return aas.checkPersonaOwnership(ctx, userID, resourceID)
	case "proxy":
		return aas.checkProxyOwnership(ctx, userID, resourceID)
	default:
		return false, nil
	}
}

// checkCampaignOwnership checks campaign ownership
func (aas *APIAuthorizationService) checkCampaignOwnership(ctx context.Context, userID uuid.UUID, campaignID string) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM campaigns WHERE id = $1 AND user_id = $2`

	err := aas.db.QueryRowContext(ctx, query, campaignID, userID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check campaign ownership: %w", err)
	}

	return count > 0, nil
}

// checkPersonaOwnership checks persona ownership
func (aas *APIAuthorizationService) checkPersonaOwnership(ctx context.Context, userID uuid.UUID, personaID string) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM dns_personas WHERE id = $1 AND user_id = $2
			  UNION ALL
			  SELECT COUNT(*) FROM http_personas WHERE id = $1 AND user_id = $2`

	err := aas.db.QueryRowContext(ctx, query, personaID, userID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check persona ownership: %w", err)
	}

	return count > 0, nil
}

// checkProxyOwnership checks proxy ownership
func (aas *APIAuthorizationService) checkProxyOwnership(ctx context.Context, userID uuid.UUID, proxyID string) (bool, error) {
	var count int
	query := `SELECT COUNT(*) FROM proxies WHERE id = $1 AND user_id = $2`

	err := aas.db.QueryRowContext(ctx, query, proxyID, userID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("failed to check proxy ownership: %w", err)
	}

	return count > 0, nil
}

// checkCampaignAccess checks if user has access to campaign (owner or granted access)
func (aas *APIAuthorizationService) checkCampaignAccess(ctx context.Context, userID uuid.UUID, campaignID string) (bool, error) {
	// Check direct ownership
	isOwner, err := aas.checkCampaignOwnership(ctx, userID, campaignID)
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

	err = aas.db.QueryRowContext(ctx, query, campaignID, userID).Scan(&accessCount)
	if err != nil && err != sql.ErrNoRows {
		return false, fmt.Errorf("failed to check campaign access grants: %w", err)
	}

	return accessCount > 0, nil
}

// calculateRiskScore calculates risk score for authorization decision
func (aas *APIAuthorizationService) calculateRiskScore(result *models.APIAuthorizationResult, request *models.APIAuthorizationRequest) int {
	score := 0

	if !result.Authorized {
		score += 50

		// Higher risk for admin endpoints
		if request.ResourceType == "admin" || strings.Contains(request.EndpointPattern, "/admin/") {
			score += 30
		}

		// Higher risk for sensitive operations
		if request.HTTPMethod == "DELETE" {
			score += 20
		} else if request.HTTPMethod == "PUT" || request.HTTPMethod == "POST" {
			score += 10
		}

		// Higher risk for campaign operations
		if request.ResourceType == "campaign" {
			score += 15
		}
	} else {
		score = 10 // Base score for authorized access

		// Slight increase for admin operations
		if request.ResourceType == "admin" {
			score += 5
		}
	}

	return min(score, 100)
}

// LogAccessViolation logs an API access violation
func (aas *APIAuthorizationService) LogAccessViolation(ctx context.Context, violation *models.APIAccessViolation) error {
	query := `
		INSERT INTO api_access_violations (
			id, user_id, session_id, endpoint_pattern, http_method, violation_type,
			required_permissions, user_permissions, resource_id, violation_details,
			source_ip, user_agent, request_headers, response_status, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`

	violation.ID = uuid.New()
	violation.CreatedAt = time.Now()

	violationDetailsJSON, _ := json.Marshal(violation.ViolationDetails)
	requestHeadersJSON, _ := json.Marshal(violation.RequestHeaders)

	_, err := aas.db.ExecContext(
		ctx, query,
		violation.ID, violation.UserID, violation.SessionID,
		violation.EndpointPattern, violation.HTTPMethod, violation.ViolationType,
		pq.Array(violation.RequiredPermissions), pq.Array(violation.UserPermissions),
		violation.ResourceID, violationDetailsJSON,
		violation.SourceIP, violation.UserAgent, requestHeadersJSON,
		violation.ResponseStatus, violation.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to log access violation: %w", err)
	}

	return nil
}

// GetAccessViolations retrieves access violations for monitoring
func (aas *APIAuthorizationService) GetAccessViolations(
	ctx context.Context,
	userID *uuid.UUID,
	limit int,
	offset int,
) ([]models.APIAccessViolation, error) {
	var violations []models.APIAccessViolation
	var query string
	var args []interface{}

	if userID != nil {
		query = `
			SELECT id, user_id, session_id, endpoint_pattern, http_method, violation_type,
				   required_permissions, user_permissions, resource_id, violation_details,
				   source_ip, user_agent, request_headers, response_status, created_at
			FROM api_access_violations 
			WHERE user_id = $1 
			ORDER BY created_at DESC 
			LIMIT $2 OFFSET $3`
		args = []interface{}{*userID, limit, offset}
	} else {
		query = `
			SELECT id, user_id, session_id, endpoint_pattern, http_method, violation_type,
				   required_permissions, user_permissions, resource_id, violation_details,
				   source_ip, user_agent, request_headers, response_status, created_at
			FROM api_access_violations 
			ORDER BY created_at DESC 
			LIMIT $1 OFFSET $2`
		args = []interface{}{limit, offset}
	}

	rows, err := aas.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var violation models.APIAccessViolation
		var violationDetailsJSON, requestHeadersJSON []byte

		err := rows.Scan(
			&violation.ID, &violation.UserID, &violation.SessionID,
			&violation.EndpointPattern, &violation.HTTPMethod, &violation.ViolationType,
			pq.Array(&violation.RequiredPermissions), pq.Array(&violation.UserPermissions),
			&violation.ResourceID, &violationDetailsJSON,
			&violation.SourceIP, &violation.UserAgent, &requestHeadersJSON,
			&violation.ResponseStatus, &violation.CreatedAt,
		)

		if err != nil {
			continue
		}

		// Parse JSON fields
		if len(violationDetailsJSON) > 0 {
			json.Unmarshal(violationDetailsJSON, &violation.ViolationDetails)
		}
		if len(requestHeadersJSON) > 0 {
			json.Unmarshal(requestHeadersJSON, &violation.RequestHeaders)
		}

		violations = append(violations, violation)
	}

	return violations, nil
}

// min returns the minimum of two integers
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// getStringFromMap safely extracts a string value from a map[string]interface{}
func getStringFromMap(m map[string]interface{}, key string) string {
	if m == nil {
		return ""
	}
	if value, ok := m[key]; ok {
		if str, ok := value.(string); ok {
			return str
		}
	}
	return ""
}
