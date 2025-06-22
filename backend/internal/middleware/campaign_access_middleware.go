// File: backend/internal/middleware/campaign_access_middleware.go
package middleware

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/fntelecomllc/studio/backend/internal/logging"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
)

// CampaignAccessMiddleware provides campaign-level access control with user ownership validation
type CampaignAccessMiddleware struct {
	accessControlService services.AccessControlService
}

// NewCampaignAccessMiddleware creates a new campaign access control middleware
func NewCampaignAccessMiddleware(accessControlService services.AccessControlService) *CampaignAccessMiddleware {
	return &CampaignAccessMiddleware{
		accessControlService: accessControlService,
	}
}

// RequireCampaignOwnership validates that the user owns the campaign or has admin access
func (m *CampaignAccessMiddleware) RequireCampaignOwnership(action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get security context from auth middleware
		securityContext, exists := c.Get("security_context")
		if !exists {
			logging.LogSecurityEvent(
				"campaign_access_no_security_context",
				nil,
				nil,
				getClientIP(c),
				c.GetHeader("User-Agent"),
				&logging.SecurityMetrics{
					RiskScore:          8,
					ThreatLevel:        "high",
					FailedAttempts:     0,
					AccountLocked:      false,
					SuspiciousActivity: true,
				},
				map[string]interface{}{
					"path":   c.Request.URL.Path,
					"method": c.Request.Method,
					"action": action,
				},
			)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"code":  "AUTH_REQUIRED",
			})
			return
		}

		ctx := securityContext.(*models.SecurityContext)

		// Extract campaign ID from URL path
		campaignID, err := m.extractCampaignID(c)
		if err != nil {
			logging.LogSecurityEvent(
				"campaign_access_invalid_campaign_id",
				&ctx.UserID,
				&ctx.SessionID,
				getClientIP(c),
				c.GetHeader("User-Agent"),
				&logging.SecurityMetrics{
					RiskScore:          5,
					ThreatLevel:        "medium",
					FailedAttempts:     0,
					AccountLocked:      false,
					SuspiciousActivity: false,
				},
				map[string]interface{}{
					"path":        c.Request.URL.Path,
					"method":      c.Request.Method,
					"action":      action,
					"campaign_id": c.Param("campaignId"),
					"error":       err.Error(),
				},
			)
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"error": "Invalid campaign ID format",
				"code":  "INVALID_CAMPAIGN_ID",
			})
			return
		}

		// Check campaign access with ownership validation and RBAC
		hasAccess, accessResult, err := m.accessControlService.CheckCampaignAccess(
			c.Request.Context(),
			ctx.UserID,
			campaignID,
			action,
			ctx.Roles,
		)

		if err != nil {
			logging.LogSecurityEvent(
				"campaign_access_check_error",
				&ctx.UserID,
				&ctx.SessionID,
				getClientIP(c),
				c.GetHeader("User-Agent"),
				&logging.SecurityMetrics{
					RiskScore:          6,
					ThreatLevel:        "medium",
					FailedAttempts:     0,
					AccountLocked:      false,
					SuspiciousActivity: true,
				},
				map[string]interface{}{
					"path":        c.Request.URL.Path,
					"method":      c.Request.Method,
					"action":      action,
					"campaign_id": campaignID.String(),
					"error":       err.Error(),
				},
			)
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "Access control check failed",
				"code":  "ACCESS_CHECK_ERROR",
			})
			return
		}

		if !hasAccess {
			// Determine appropriate error response based on access result
			var statusCode int
			var errorMessage string
			var errorCode string
			var riskScore int

			switch accessResult.DenialReason {
			case "campaign_not_found":
				statusCode = http.StatusNotFound
				errorMessage = "Campaign not found"
				errorCode = "CAMPAIGN_NOT_FOUND"
				riskScore = 4
			case "ownership_denied":
				statusCode = http.StatusForbidden
				errorMessage = "Access denied - insufficient ownership"
				errorCode = "OWNERSHIP_DENIED"
				riskScore = 7
			case "permission_denied":
				statusCode = http.StatusForbidden
				errorMessage = "Access denied - insufficient permissions"
				errorCode = "PERMISSION_DENIED"
				riskScore = 6
			default:
				statusCode = http.StatusForbidden
				errorMessage = "Access denied"
				errorCode = "ACCESS_DENIED"
				riskScore = 6
			}

			logging.LogSecurityEvent(
				"campaign_access_denied",
				&ctx.UserID,
				&ctx.SessionID,
				getClientIP(c),
				c.GetHeader("User-Agent"),
				&logging.SecurityMetrics{
					RiskScore:          riskScore,
					ThreatLevel:        "medium",
					FailedAttempts:     0,
					AccountLocked:      false,
					SuspiciousActivity: riskScore > 6,
				},
				map[string]interface{}{
					"path":          c.Request.URL.Path,
					"method":        c.Request.Method,
					"action":        action,
					"campaign_id":   campaignID.String(),
					"denial_reason": accessResult.DenialReason,
					"is_owner":      accessResult.IsOwner,
					"has_admin":     accessResult.HasAdminAccess,
				},
			)

			c.AbortWithStatusJSON(statusCode, gin.H{
				"error": errorMessage,
				"code":  errorCode,
			})
			return
		}

		// Log successful access
		logging.LogSecurityEvent(
			"campaign_access_granted",
			&ctx.UserID,
			&ctx.SessionID,
			getClientIP(c),
			c.GetHeader("User-Agent"),
			&logging.SecurityMetrics{
				RiskScore:          1,
				ThreatLevel:        "low",
				FailedAttempts:     0,
				AccountLocked:      false,
				SuspiciousActivity: false,
			},
			map[string]interface{}{
				"path":        c.Request.URL.Path,
				"method":      c.Request.Method,
				"action":      action,
				"campaign_id": campaignID.String(),
				"access_type": accessResult.AccessType,
				"is_owner":    accessResult.IsOwner,
				"has_admin":   accessResult.HasAdminAccess,
			},
		)

		// Store access context for use in handlers
		c.Set("campaign_access_result", accessResult)
		c.Set("campaign_id", campaignID)

		c.Next()
	}
}

// RequireCampaignOwnershipForListing validates ownership for campaign listing operations
// This handles the case where campaign ID is in query params or request body
func (m *CampaignAccessMiddleware) RequireCampaignOwnershipForListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get security context from auth middleware
		securityContext, exists := c.Get("security_context")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"code":  "AUTH_REQUIRED",
			})
			return
		}

		ctx := securityContext.(*models.SecurityContext)

		// For listing operations, we'll enforce tenant isolation at the service layer
		// but we can store user context here for filtering
		c.Set("user_id_for_filtering", ctx.UserID)
		c.Set("user_roles_for_filtering", ctx.Roles)

		c.Next()
	}
}

// extractCampaignID extracts campaign ID from various URL patterns
func (m *CampaignAccessMiddleware) extractCampaignID(c *gin.Context) (uuid.UUID, error) {
	// Try to get campaign ID from URL parameter
	campaignIDStr := c.Param("campaignId")
	if campaignIDStr == "" {
		// Try alternative parameter names
		campaignIDStr = c.Param("id")
	}

	if campaignIDStr == "" {
		// Check if it's in query parameters
		campaignIDStr = c.Query("campaignId")
	}

	if campaignIDStr == "" {
		return uuid.Nil, fmt.Errorf("campaign ID not found in request")
	}

	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid campaign ID format: %w", err)
	}

	return campaignID, nil
}

// RequireCampaignCreationAccess validates user can create campaigns
func (m *CampaignAccessMiddleware) RequireCampaignCreationAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get security context from auth middleware
		securityContext, exists := c.Get("security_context")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"code":  "AUTH_REQUIRED",
			})
			return
		}

		ctx := securityContext.(*models.SecurityContext)

		// Check if user has campaign creation permissions
		if !ctx.HasPermission("campaigns:create") {
			logging.LogSecurityEvent(
				"campaign_creation_access_denied",
				&ctx.UserID,
				&ctx.SessionID,
				getClientIP(c),
				c.GetHeader("User-Agent"),
				&logging.SecurityMetrics{
					RiskScore:          5,
					ThreatLevel:        "medium",
					FailedAttempts:     0,
					AccountLocked:      false,
					SuspiciousActivity: false,
				},
				map[string]interface{}{
					"path":   c.Request.URL.Path,
					"method": c.Request.Method,
				},
			)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "Insufficient permissions to create campaigns",
				"code":  "CREATION_PERMISSION_DENIED",
			})
			return
		}

		// Log successful creation access
		logging.LogSecurityEvent(
			"campaign_creation_access_granted",
			&ctx.UserID,
			&ctx.SessionID,
			getClientIP(c),
			c.GetHeader("User-Agent"),
			&logging.SecurityMetrics{
				RiskScore:          1,
				ThreatLevel:        "low",
				FailedAttempts:     0,
				AccountLocked:      false,
				SuspiciousActivity: false,
			},
			map[string]interface{}{
				"path":   c.Request.URL.Path,
				"method": c.Request.Method,
			},
		)

		// Store user ID for campaign creation (auto-assign ownership)
		c.Set("campaign_creator_user_id", ctx.UserID)

		c.Next()
	}
}
