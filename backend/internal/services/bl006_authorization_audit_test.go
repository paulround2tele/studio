package services

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
)

// TestAuthorizationContextLogging tests comprehensive authorization context logging (BL-006)
func TestAuthorizationContextLogging(t *testing.T) {
	ctx := context.Background()

	// Setup test database
	db := setupBL006TestDB(t)
	defer cleanupBL006TestDB(t, db)

	// Create audit context service with database support
	auditStore := postgres.NewAuditLogStorePostgres(db)
	auditService := NewAuditContextServiceWithDB(auditStore, db)

	// Test cases for different authorization scenarios
	testCases := []struct {
		name           string
		authCtx        *EnhancedAuthorizationContext
		expectedResult bool
		expectedRisk   int
	}{
		{
			name: "successful_campaign_creation",
			authCtx: &EnhancedAuthorizationContext{
				UserID:        uuid.New(),
				SessionID:     "test-session-123",
				RequestID:     "test-request-456",
				ResourceType:  "campaign",
				ResourceID:    uuid.New().String(),
				Action:        "create",
				Decision:      "allow",
				PolicyVersion: "v1.0",
				EvaluatedPolicies: []string{
					"campaign:create",
					"resource:ownership",
					"user:authenticated",
				},
				PermissionsRequired: []string{"campaign:create", "campaign:manage"},
				PermissionsGranted:  []string{"campaign:create", "campaign:manage", "user:read"},
				RiskScore:           25,
				RequestContext: map[string]interface{}{
					"campaign_type":       "domain_generation",
					"campaign_name":       "Test Campaign",
					"client_ip":           "192.168.1.100",
					"user_agent":          "DomainFlow-Test/1.0",
					"authentication_type": "session",
					"request_path":        "/api/campaigns",
					"http_method":         "POST",
				},
				Timestamp: time.Now(),
			},
			expectedResult: true,
			expectedRisk:   25,
		},
		{
			name: "denied_insufficient_permissions",
			authCtx: &EnhancedAuthorizationContext{
				UserID:              uuid.New(),
				SessionID:           "test-session-789",
				RequestID:           "test-request-101112",
				ResourceType:        "admin_panel",
				ResourceID:          uuid.New().String(),
				Action:              "access",
				Decision:            "deny",
				PolicyVersion:       "v1.0",
				EvaluatedPolicies:   []string{"admin:access", "user:authenticated"},
				PermissionsRequired: []string{"admin:access", "admin:manage"},
				PermissionsGranted:  []string{"user:read", "campaign:create"},
				DenialReason:        "insufficient_permissions",
				RiskScore:           75,
				RequestContext: map[string]interface{}{
					"resource_type":       "admin_panel",
					"client_ip":           "10.0.0.50",
					"user_agent":          "Mozilla/5.0",
					"authentication_type": "session",
					"request_path":        "/api/admin",
					"http_method":         "GET",
					"risk_factors":        []string{"privilege_escalation_attempt"},
				},
				Timestamp: time.Now(),
			},
			expectedResult: true,
			expectedRisk:   75,
		},
		{
			name: "high_risk_api_key_access",
			authCtx: &EnhancedAuthorizationContext{
				UserID:        uuid.New(),
				RequestID:     "api-request-131415",
				ResourceType:  "campaign",
				ResourceID:    uuid.New().String(),
				Action:        "bulk_delete",
				Decision:      "allow",
				PolicyVersion: "v1.0",
				EvaluatedPolicies: []string{
					"campaign:delete",
					"api_key:authenticated",
					"bulk_operations:allowed",
				},
				PermissionsRequired: []string{"campaign:delete", "bulk:operations"},
				PermissionsGranted:  []string{"campaign:delete", "bulk:operations", "api:access"},
				RiskScore:           85,
				RequestContext: map[string]interface{}{
					"operation_type":      "bulk_delete",
					"resource_count":      50,
					"authentication_type": "api_key",
					"client_ip":           "203.0.113.42",
					"user_agent":          "API-Client/2.1",
					"request_path":        "/api/campaigns/bulk",
					"http_method":         "DELETE",
					"risk_factors":        []string{"bulk_operation", "api_key_auth", "destructive_action"},
				},
				Timestamp: time.Now(),
			},
			expectedResult: true,
			expectedRisk:   85,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Log authorization decision
			err := auditService.LogAuthorizationDecision(ctx, tc.authCtx)

			if tc.expectedResult {
				assert.NoError(t, err, "Authorization logging should succeed")

				// Verify security event was created in database
				var securityEventCount int
				err = db.QueryRowContext(ctx,
					"SELECT COUNT(*) FROM security_events WHERE user_id = $1 AND authorization_result = $2",
					tc.authCtx.UserID, tc.authCtx.Decision).Scan(&securityEventCount)
				require.NoError(t, err)
				assert.Equal(t, 1, securityEventCount, "Security event should be created")

				// Verify authorization decision was logged
				var authDecisionCount int
				err = db.QueryRowContext(ctx,
					"SELECT COUNT(*) FROM authorization_decisions WHERE user_id = $1 AND decision = $2",
					tc.authCtx.UserID, tc.authCtx.Decision).Scan(&authDecisionCount)
				require.NoError(t, err)
				assert.Equal(t, 1, authDecisionCount, "Authorization decision should be logged")

				// Verify risk score is captured correctly
				var storedRiskScore int
				err = db.QueryRowContext(ctx,
					"SELECT risk_score FROM security_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
					tc.authCtx.UserID).Scan(&storedRiskScore)
				require.NoError(t, err)
				assert.Equal(t, tc.expectedRisk, storedRiskScore, "Risk score should match")

				// Verify request context is stored (context field in authorization_decisions)
				var storedContext json.RawMessage
				err = db.QueryRowContext(ctx,
					"SELECT context FROM authorization_decisions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
					tc.authCtx.UserID).Scan(&storedContext)
				require.NoError(t, err)
				assert.NotEmpty(t, storedContext, "Request context should be stored")

				// Parse and validate context structure
				var contextMap map[string]interface{}
				err = json.Unmarshal(storedContext, &contextMap)
				require.NoError(t, err)
				assert.Contains(t, contextMap, "http_method", "Context should contain HTTP method")
				assert.Contains(t, contextMap, "authentication_type", "Context should contain auth type")

			} else {
				assert.Error(t, err, "Authorization logging should fail")
			}
		})
	}
}

// TestSecurityEventGeneration tests security event generation and monitoring (BL-006)
func TestSecurityEventGeneration(t *testing.T) {
	ctx := context.Background()

	// Setup test database
	db := setupBL006TestDB(t)
	defer cleanupBL006TestDB(t, db)

	// Create services
	auditStore := postgres.NewAuditLogStorePostgres(db)
	auditService := NewAuditContextServiceWithDB(auditStore, db)
	securityMonitor := NewSecurityEventMonitor(db, nil, auditService)

	userID := uuid.New()

	// Generate multiple failed authorization attempts to trigger security alerts
	t.Run("repeated_authorization_failures", func(t *testing.T) {
		// Create 6 failed authorization attempts within 1 hour to trigger alert
		for i := 0; i < 6; i++ {
			authCtx := &EnhancedAuthorizationContext{
				UserID:       userID,
				SessionID:    "session-failure-test",
				RequestID:    uuid.New().String(),
				ResourceType: "admin_panel",
				ResourceID:   uuid.New().String(),
				Action:       "access",
				Decision:     "deny",
				DenialReason: "insufficient_permissions",
				RiskScore:    60,
				RequestContext: map[string]interface{}{
					"attempt_number":      i + 1,
					"client_ip":           "192.168.1.100",
					"authentication_type": "session",
					"failure_reason":      "missing_admin_role",
				},
				Timestamp: time.Now(),
			}

			err := auditService.LogAuthorizationDecision(ctx, authCtx)
			require.NoError(t, err)
		}

		// Run security monitoring to detect suspicious patterns
		err := securityMonitor.MonitorAuthorizationPatterns(ctx)
		assert.NoError(t, err, "Security monitoring should complete successfully")

		// Verify suspicious user detection
		var suspiciousEventCount int
		err = db.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM security_events WHERE user_id = $1 AND action_attempted LIKE '%security_alert%'",
			userID).Scan(&suspiciousEventCount)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, suspiciousEventCount, 1, "Security alert should be generated for repeated failures")
	})

	t.Run("privilege_escalation_detection", func(t *testing.T) {
		escalationUserID := uuid.New()

		// Create multiple admin access attempts to trigger privilege escalation detection
		for i := 0; i < 4; i++ {
			authCtx := &EnhancedAuthorizationContext{
				UserID:       escalationUserID,
				SessionID:    "session-escalation-test",
				RequestID:    uuid.New().String(),
				ResourceType: "admin_panel",
				ResourceID:   uuid.New().String(),
				Action:       "admin_access",
				Decision:     "deny",
				DenialReason: "privilege_escalation_attempt",
				RiskScore:    85,
				RequestContext: map[string]interface{}{
					"escalation_attempt":  i + 1,
					"target_resource":     "admin_panel",
					"client_ip":           "10.0.0.25",
					"authentication_type": "session",
					"risk_factors":        []string{"privilege_escalation", "rapid_attempts"},
				},
				Timestamp: time.Now(),
			}

			err := auditService.LogAuthorizationDecision(ctx, authCtx)
			require.NoError(t, err)
		}

		// Run privilege escalation detection
		err := securityMonitor.MonitorAuthorizationPatterns(ctx)
		assert.NoError(t, err)

		// Verify privilege escalation alert
		var escalationEventCount int
		err = db.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM security_events WHERE user_id = $1 AND action_attempted LIKE '%privilege_escalation%'",
			escalationUserID).Scan(&escalationEventCount)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, escalationEventCount, 1, "Privilege escalation alert should be generated")
	})

	t.Run("unusual_access_pattern_detection", func(t *testing.T) {
		highVolumeUserID := uuid.New()

		// Create high volume of successful requests to trigger unusual access pattern detection
		for i := 0; i < 25; i++ {
			authCtx := &EnhancedAuthorizationContext{
				UserID:       highVolumeUserID,
				SessionID:    "session-volume-test",
				RequestID:    uuid.New().String(),
				ResourceType: "campaign",
				ResourceID:   uuid.New().String(), // Different resource each time
				Action:       "read",
				Decision:     "allow",
				RiskScore:    30,
				RequestContext: map[string]interface{}{
					"resource_access":     i + 1,
					"client_ip":           "172.16.0.10",
					"authentication_type": "session",
					"access_pattern":      "rapid_resource_enumeration",
				},
				Timestamp: time.Now(),
			}

			err := auditService.LogAuthorizationDecision(ctx, authCtx)
			require.NoError(t, err)
		}

		// Run unusual access pattern detection
		err := securityMonitor.MonitorAuthorizationPatterns(ctx)
		assert.NoError(t, err)

		// Verify unusual access pattern alert
		var accessPatternEventCount int
		err = db.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM security_events WHERE user_id = $1 AND action_attempted LIKE '%unusual_access%'",
			highVolumeUserID).Scan(&accessPatternEventCount)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, accessPatternEventCount, 1, "Unusual access pattern alert should be generated")
	})

	t.Run("security_metrics_generation", func(t *testing.T) {
		// Get security metrics for the last hour
		metrics, err := securityMonitor.GetSecurityMetrics(ctx, time.Hour)
		require.NoError(t, err)
		assert.NotNil(t, metrics, "Security metrics should be generated")

		// Verify metrics contain expected data
		assert.Greater(t, metrics.TotalEvents, 0, "Total events should be greater than 0")
		assert.Greater(t, metrics.AuthorizationFailures, 0, "Authorization failures should be detected")
		assert.Greater(t, metrics.HighRiskEvents, 0, "High risk events should be detected")
		assert.Greater(t, metrics.ActiveUsers, 0, "Active users should be tracked")
		assert.Equal(t, time.Hour, metrics.TimeWindow, "Time window should match request")
		assert.WithinDuration(t, time.Now(), metrics.GeneratedAt, time.Minute, "Generation time should be recent")
	})
}

// TestAuthorizationAuditIntegration tests end-to-end authorization audit integration
func TestAuthorizationAuditIntegration(t *testing.T) {
	ctx := context.Background()

	// Setup test database and services
	db := setupBL006TestDB(t)
	defer cleanupBL006TestDB(t, db)

	// Create full service stack
	auditStore := postgres.NewAuditLogStorePostgres(db)
	auditService := NewAuditContextServiceWithDB(auditStore, db)
	securityMonitor := NewSecurityEventMonitor(db, nil, auditService)

	// Create minimal orchestrator for testing
	orchestrator := &testCampaignOrchestrator{
		auditService: auditService,
	}

	t.Run("campaign_creation_with_authorization_audit", func(t *testing.T) {
		userID := uuid.New()

		// Create user context for campaign creation
		userCtx := &AuditUserContext{
			UserID:             userID,
			SessionID:          "integration-test-session",
			RequestID:          "integration-test-request",
			ClientIP:           "192.168.1.200",
			UserAgent:          "DomainFlow-Integration-Test/1.0",
			Roles:              []string{"campaign_manager"},
			Permissions:        []string{"campaign:create", "campaign:manage"},
			AuthenticationType: "session",
			HTTPMethod:         "POST",
			RequestPath:        "/api/campaigns",
			RequestTimestamp:   time.Now(),
		}

		// Create campaign request
		req := CreateCampaignRequest{
			Name:         "Integration Test Campaign",
			CampaignType: "domain_generation",
			UserID:       userID,
			DomainGenerationParams: &DomainGenerationParams{
				PatternType:          "variable_length",
				VariableLength:       8,
				CharacterSet:         "alphanumeric",
				TLD:                  "com",
				NumDomainsToGenerate: 100,
			},
		}

		// Create campaign with authorization context
		campaign, err := orchestrator.CreateCampaignWithAuthorizationContext(ctx, req, userCtx)
		require.NoError(t, err, "Campaign creation should succeed")
		assert.NotNil(t, campaign, "Campaign should be created")
		assert.Equal(t, req.Name, campaign.Name, "Campaign name should match")

		// Verify authorization decision was logged
		var authDecisionCount int
		err = db.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM authorization_decisions WHERE user_id = $1 AND resource_type = 'campaign' AND decision = 'allow'",
			userID).Scan(&authDecisionCount)
		require.NoError(t, err)
		assert.Equal(t, 1, authDecisionCount, "Authorization decision should be logged")

		// Verify security event was created
		var securityEventCount int
		err = db.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM security_events WHERE user_id = $1 AND resource_type = 'campaign'",
			userID).Scan(&securityEventCount)
		require.NoError(t, err)
		assert.Equal(t, 1, securityEventCount, "Security event should be created")

		// Verify audit trail completeness
		var auditLogCount int
		err = db.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM audit_logs WHERE user_id = $1 AND action = 'create'",
			userID).Scan(&auditLogCount)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, auditLogCount, 1, "Audit log should be created")
	})

	t.Run("unauthorized_access_attempt", func(t *testing.T) {
		unauthorizedUserID := uuid.New()

		// Create user context with insufficient permissions
		userCtx := &AuditUserContext{
			UserID:             unauthorizedUserID,
			SessionID:          "unauthorized-session",
			RequestID:          "unauthorized-request",
			ClientIP:           "10.0.0.100",
			UserAgent:          "Suspicious-Client/1.0",
			Roles:              []string{"user"},      // Limited role
			Permissions:        []string{"user:read"}, // No campaign creation permission
			AuthenticationType: "session",
			HTTPMethod:         "POST",
			RequestPath:        "/api/campaigns",
			RequestTimestamp:   time.Now(),
		}

		req := CreateCampaignRequest{
			Name:         "Unauthorized Campaign",
			CampaignType: "domain_generation",
			UserID:       unauthorizedUserID,
			DomainGenerationParams: &DomainGenerationParams{
				PatternType:          "variable_length",
				VariableLength:       5,
				CharacterSet:         "alphabetic",
				TLD:                  "org",
				NumDomainsToGenerate: 50,
			},
		}

		// Attempt to create campaign (should fail)
		campaign, err := orchestrator.CreateCampaignWithAuthorizationContext(ctx, req, userCtx)
		assert.Error(t, err, "Campaign creation should fail for unauthorized user")
		assert.Nil(t, campaign, "No campaign should be created")
		assert.Contains(t, err.Error(), "insufficient permissions", "Error should indicate permission issue")

		// Verify denial was logged
		var denialCount int
		err = db.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM authorization_decisions WHERE user_id = $1 AND decision = 'deny'",
			unauthorizedUserID).Scan(&denialCount)
		require.NoError(t, err)
		assert.Equal(t, 1, denialCount, "Authorization denial should be logged")

		// Run security monitoring to check for alerts
		err = securityMonitor.MonitorAuthorizationPatterns(ctx)
		assert.NoError(t, err, "Security monitoring should complete")
	})
}

// Mock services for testing
type mockDomainGenerationService struct{}

func (m *mockDomainGenerationService) CreateCampaign(ctx context.Context, req CreateDomainGenerationCampaignRequest) (*models.Campaign, error) {
	return &models.Campaign{
		ID:           uuid.New(),
		Name:         req.Name,
		CampaignType: models.CampaignTypeDomainGeneration,
		Status:       models.CampaignStatusPending,
		UserID:       &req.UserID,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}, nil
}
func (m *mockDomainGenerationService) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.DomainGenerationCampaignParams, error) {
	return nil, nil, nil
}

type mockDNSCampaignService struct{}

func (m *mockDNSCampaignService) CreateCampaign(ctx context.Context, req CreateDNSValidationCampaignRequest) (*models.Campaign, error) {
	return nil, nil
}
func (m *mockDNSCampaignService) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.DNSValidationCampaignParams, error) {
	return nil, nil, nil
}

type mockHTTPKeywordCampaignService struct{}

func (m *mockHTTPKeywordCampaignService) CreateCampaign(ctx context.Context, req CreateHTTPKeywordCampaignRequest) (*models.Campaign, error) {
	return nil, nil
}
func (m *mockHTTPKeywordCampaignService) ProcessHTTPKeywordCampaignBatch(ctx context.Context, campaignID uuid.UUID, batchSize int) error {
	return nil
}
func (m *mockHTTPKeywordCampaignService) GetCampaignDetails(ctx context.Context, campaignID uuid.UUID) (*models.Campaign, *models.HTTPKeywordCampaignParams, error) {
	return nil, nil, nil
}

type mockStateCoordinator struct{}

func (m *mockStateCoordinator) TransitionState(ctx context.Context, entityID uuid.UUID, newState models.CampaignStatusEnum, source models.StateEventSourceEnum, description, action string, metadata map[string]interface{}) error {
	return nil
}
func (m *mockStateCoordinator) AddEventHandler(handler StateEventHandler) {
	// Mock implementation
}

// testCampaignOrchestrator provides minimal implementation for testing authorization
type testCampaignOrchestrator struct {
	auditService AuditContextService
}

func (t *testCampaignOrchestrator) CreateCampaignWithAuthorizationContext(ctx context.Context, req CreateCampaignRequest, userCtx *AuditUserContext) (*models.Campaign, error) {
	// Validate authorization
	authCtx := &EnhancedAuthorizationContext{
		UserID:              userCtx.UserID,
		SessionID:           userCtx.SessionID,
		RequestID:           userCtx.RequestID,
		ResourceType:        "campaign",
		ResourceID:          uuid.New().String(),
		Action:              "create",
		Decision:            "allow",
		PolicyVersion:       "v1.0",
		EvaluatedPolicies:   []string{"campaign:create", "user:authenticated"},
		PermissionsRequired: []string{"campaign:create"},
		PermissionsGranted:  userCtx.Permissions,
		RiskScore:           25,
		RequestContext: map[string]interface{}{
			"campaign_type":       req.CampaignType,
			"campaign_name":       req.Name,
			"client_ip":           userCtx.ClientIP,
			"user_agent":          userCtx.UserAgent,
			"authentication_type": userCtx.AuthenticationType,
			"request_path":        userCtx.RequestPath,
			"http_method":         userCtx.HTTPMethod,
		},
		Timestamp: time.Now(),
	}

	// Check permissions
	hasPermission := false
	for _, perm := range userCtx.Permissions {
		if perm == "campaign:create" {
			hasPermission = true
			break
		}
	}

	if !hasPermission {
		authCtx.Decision = "deny"
		authCtx.DenialReason = "insufficient_permissions"
		authCtx.RiskScore = 75

		// Log denial
		err := t.auditService.LogAuthorizationDecision(ctx, authCtx)
		if err != nil {
			return nil, err
		}

		return nil, fmt.Errorf("insufficient permissions: campaign:create required")
	}

	// Log authorization decision
	err := t.auditService.LogAuthorizationDecision(ctx, authCtx)
	if err != nil {
		return nil, err
	}

	// Create campaign
	campaign := &models.Campaign{
		ID:           uuid.New(),
		Name:         req.Name,
		CampaignType: models.CampaignTypeEnum(req.CampaignType),
		Status:       models.CampaignStatusPending,
		UserID:       &req.UserID,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	return campaign, nil
}

// Test database setup helpers for BL-006 (production database)
func setupBL006TestDB(t *testing.T) *sqlx.DB {
	// Connect to domainflow_production database with correct credentials
	dsn := "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable"
	db, err := sqlx.Connect("postgres", dsn)
	require.NoError(t, err, "Failed to connect to domainflow_production database")

	// Verify migration has been applied
	var migrationExists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'security_events')").Scan(&migrationExists)
	require.NoError(t, err)
	require.True(t, migrationExists, "BL-006 migration must be applied - security_events table not found")

	return db
}

func cleanupBL006TestDB(t *testing.T, db *sqlx.DB) {
	// Clean up test data from production database in correct order due to foreign key constraints
	// 1. Delete authorization_decisions first (references security_events)
	_, err := db.Exec("DELETE FROM authorization_decisions WHERE user_id IS NOT NULL")
	if err != nil {
		t.Logf("Warning: Failed to cleanup authorization_decisions: %v", err)
	}
	// 2. Delete security_events second (references audit_logs)
	_, err = db.Exec("DELETE FROM security_events WHERE user_id IS NOT NULL")
	if err != nil {
		t.Logf("Warning: Failed to cleanup security_events: %v", err)
	}
	// 3. Delete audit_logs last
	_, err = db.Exec("DELETE FROM audit_logs WHERE user_id IS NOT NULL")
	if err != nil {
		t.Logf("Warning: Failed to cleanup audit_logs: %v", err)
	}
	db.Close()
}
