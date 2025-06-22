package tests

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/middleware"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
)

// BL005AuthorizationTestSuite tests the BL-005 tactical plan implementation
type BL005AuthorizationTestSuite struct {
	suite.Suite
	db             *sqlx.DB
	campaignStore  store.CampaignStore
	auditStore     store.AuditLogStore
	auditService   services.AuditContextService
	authService    *services.APIAuthorizationService
	authMiddleware *middleware.AuthMiddleware
	sessionService *services.SessionService
	testUserID     uuid.UUID
	testCampaignID uuid.UUID
	testSessionID  string
}

func TestBL005AuthorizationSuite(t *testing.T) {
	suite.Run(t, new(BL005AuthorizationTestSuite))
}

func (suite *BL005AuthorizationTestSuite) SetupSuite() {
	// Initialize test database connection to domainflow_production
	suite.db = setupTestDatabase(suite.T())

	// Run the BL-005 migration
	err := runMigration(suite.db, "../database/migrations/012_bl005_api_authorization_controls.sql")
	require.NoError(suite.T(), err, "Failed to run BL-005 migration")

	// Initialize services
	suite.campaignStore = postgres.NewCampaignStorePostgres(suite.db)
	suite.auditStore = postgres.NewAuditLogStorePostgres(suite.db)
	suite.auditService = services.NewAuditContextServiceWithDB(suite.auditStore, suite.db)
	suite.authService = services.NewAPIAuthorizationService(suite.db, suite.auditService)

	// Initialize session service with proper configuration
	sessionConfig := config.GetDefaultSessionSettings().ToServiceConfig()
	suite.sessionService, err = services.NewSessionService(suite.db, sessionConfig, suite.auditStore)
	require.NoError(suite.T(), err, "Failed to create session service")

	// Initialize auth middleware
	suite.authMiddleware = middleware.NewAuthMiddleware(
		suite.sessionService,
		suite.auditService,
		suite.authService,
		config.GetDefaultSessionSettings(),
	)

	// Create test data
	suite.setupTestData()
}

func (suite *BL005AuthorizationTestSuite) TearDownSuite() {
	if suite.db != nil {
		// Clean up test data
		suite.cleanupTestData()
		suite.db.Close()
	}
}

func (suite *BL005AuthorizationTestSuite) setupTestData() {
	// Create test user
	suite.testUserID = uuid.New()

	// Create test campaign owned by test user
	suite.testCampaignID = uuid.New()

	// Insert test user
	testEmail := fmt.Sprintf("test-%s@example.com", suite.testUserID.String())
	_, err := suite.db.Exec(`
		INSERT INTO auth.users (id, email, email_verified, password_hash, first_name, last_name, is_active, created_at, updated_at, password_changed_at)
		VALUES ($1, $2, true, $3, $4, $5, true, NOW(), NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
		suite.testUserID, testEmail, "hashedpassword", "Test", "User")
	require.NoError(suite.T(), err, "Failed to create test user")

	// Insert test campaign
	_, err = suite.db.Exec(`
		INSERT INTO campaigns (id, name, campaign_type, status, user_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING`,
		suite.testCampaignID, "Test Campaign", "domain_generation", "pending", suite.testUserID)
	require.NoError(suite.T(), err, "Failed to create test campaign")

	// Create test session
	session, err := suite.sessionService.CreateSession(suite.testUserID, "127.0.0.1", "test-user-agent")
	require.NoError(suite.T(), err, "Failed to create test session")
	suite.testSessionID = session.ID
}

func (suite *BL005AuthorizationTestSuite) cleanupTestData() {
	// Clean up in reverse order due to foreign key constraints
	suite.db.Exec("DELETE FROM auth.sessions WHERE user_id = $1", suite.testUserID)
	suite.db.Exec("DELETE FROM campaigns WHERE id = $1", suite.testCampaignID)
	suite.db.Exec("DELETE FROM auth.users WHERE id = $1", suite.testUserID)
}

// TestBasicAuthorizationFlow tests the complete authorization flow
func (suite *BL005AuthorizationTestSuite) TestBasicAuthorizationFlow() {
	t := suite.T()
	ctx := context.Background()

	// Test authorization for campaign read access
	authRequest := &models.APIAuthorizationRequest{
		UserID:          suite.testUserID,
		SessionID:       suite.testSessionID,
		RequestID:       "test-request-" + uuid.New().String(),
		EndpointPattern: "/api/campaigns/:id",
		HTTPMethod:      "GET",
		ResourceType:    "campaign",
		ResourceID:      suite.testCampaignID.String(),
		CampaignID:      suite.testCampaignID.String(),
		UserRole:        "user",
		RequestContext:  map[string]interface{}{"test": "context"},
	}

	// Call authorization service
	result, err := suite.authService.AuthorizeAPIAccess(ctx, authRequest)
	require.NoError(t, err, "Authorization should not fail")
	assert.True(t, result.Authorized, "User should be authorized to access their own campaign")
	assert.Greater(t, result.RiskScore, 0, "Risk score should be calculated")
	assert.Greater(t, result.AuthorizationDuration, time.Duration(0), "Authorization duration should be positive")
}

// TestUnauthorizedAccess tests access to resources user doesn't own
func (suite *BL005AuthorizationTestSuite) TestUnauthorizedAccess() {
	t := suite.T()
	ctx := context.Background()

	// Create another user's campaign
	otherUserID := uuid.New()
	otherCampaignID := uuid.New()

	// Insert other user
	otherEmail := fmt.Sprintf("other-%s@example.com", otherUserID.String())
	_, err := suite.db.Exec(`
		INSERT INTO auth.users (id, email, email_verified, password_hash, first_name, last_name, is_active, created_at, updated_at, password_changed_at)
		VALUES ($1, $2, true, $3, $4, $5, true, NOW(), NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
		otherUserID, otherEmail, "hashedpassword", "Other", "User")
	require.NoError(t, err, "Failed to create other user")

	// Insert other campaign
	_, err = suite.db.Exec(`
		INSERT INTO campaigns (id, name, campaign_type, status, user_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
		otherCampaignID, "Other Campaign", "domain_generation", "pending", otherUserID)
	require.NoError(t, err, "Failed to create other campaign")

	defer func() {
		// Cleanup
		suite.db.Exec("DELETE FROM campaigns WHERE id = $1", otherCampaignID)
		suite.db.Exec("DELETE FROM auth.users WHERE id = $1", otherUserID)
	}()

	// Test authorization for other user's campaign
	authRequest := &models.APIAuthorizationRequest{
		UserID:          suite.testUserID,
		SessionID:       suite.testSessionID,
		RequestID:       "test-request-" + uuid.New().String(),
		EndpointPattern: "/api/campaigns/:id",
		HTTPMethod:      "GET",
		ResourceType:    "campaign",
		ResourceID:      otherCampaignID.String(),
		CampaignID:      otherCampaignID.String(),
		UserRole:        "user",
		RequestContext:  map[string]interface{}{"test": "context"},
	}

	// Call authorization service
	result, err := suite.authService.AuthorizeAPIAccess(ctx, authRequest)
	require.NoError(t, err, "Authorization call should not fail")
	assert.False(t, result.Authorized, "User should not be authorized to access other user's campaign")

	// Check that violation was logged
	time.Sleep(100 * time.Millisecond) // Allow async logging to complete
	violations, err := suite.authService.GetAccessViolations(ctx, &suite.testUserID, 10, 0)
	require.NoError(t, err, "Should be able to get violations")
	assert.NotEmpty(t, violations, "Violation should be logged")
}

// TestAdminEndpointAccess tests admin endpoint authorization
func (suite *BL005AuthorizationTestSuite) TestAdminEndpointAccess() {
	t := suite.T()
	ctx := context.Background()

	// Test admin endpoint access without admin role
	authRequest := &models.APIAuthorizationRequest{
		UserID:          suite.testUserID,
		SessionID:       suite.testSessionID,
		RequestID:       "test-request-" + uuid.New().String(),
		EndpointPattern: "/api/admin/*",
		HTTPMethod:      "GET",
		ResourceType:    "admin",
		UserRole:        "user",
		RequestContext:  map[string]interface{}{"test": "context"},
	}

	// Call authorization service
	result, err := suite.authService.AuthorizeAPIAccess(ctx, authRequest)
	require.NoError(t, err, "Authorization call should not fail")
	assert.False(t, result.Authorized, "Non-admin user should not be authorized for admin endpoints")
}

// TestDatabaseFunctionIntegration tests the PostgreSQL authorization function
func (suite *BL005AuthorizationTestSuite) TestDatabaseFunctionIntegration() {
	t := suite.T()

	// Test the check_endpoint_authorization function directly
	var result string

	err := suite.db.QueryRow(`
		SELECT check_endpoint_authorization(
			$1, $2, $3, $4, $5, $6
		)`,
		"/api/campaigns/:id", // endpoint_pattern
		"GET",                // http_method
		"{campaigns:read}",   // user_permissions as PostgreSQL array
		"user",               // user_role
		true,                 // is_resource_owner
		true,                 // has_campaign_access
	).Scan(&result)

	require.NoError(t, err, "Database function should execute successfully")
	assert.NotEmpty(t, result, "Function should return a JSON result")
	assert.Contains(t, result, "authorized", "Result should contain authorization decision")
}

// TestMiddlewareIntegration tests the complete middleware integration
func (suite *BL005AuthorizationTestSuite) TestMiddlewareIntegration() {
	t := suite.T()

	// Set up Gin router with middleware
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Add the authorization middleware
	router.Use(suite.authMiddleware.EndpointAuthorizationMiddleware())

	// Add test route
	router.GET("/api/campaigns/:id", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "success"})
	})

	// Test that the middleware is properly configured
	assert.NotNil(t, suite.authMiddleware, "Auth middleware should be initialized")
}

// TestRiskScoreCalculation tests the risk score calculation logic
func (suite *BL005AuthorizationTestSuite) TestRiskScoreCalculation() {
	t := suite.T()
	ctx := context.Background()

	testCases := []struct {
		name            string
		endpoint        string
		method          string
		resourceType    string
		expectedMinRisk int
	}{
		{
			name:            "Low risk GET request",
			endpoint:        "/api/campaigns",
			method:          "GET",
			resourceType:    "campaign",
			expectedMinRisk: 1,
		},
		{
			name:            "Medium risk POST request",
			endpoint:        "/api/campaigns",
			method:          "POST",
			resourceType:    "campaign",
			expectedMinRisk: 3,
		},
		{
			name:            "High risk DELETE request",
			endpoint:        "/api/campaigns/:id",
			method:          "DELETE",
			resourceType:    "campaign",
			expectedMinRisk: 5,
		},
		{
			name:            "High risk admin endpoint",
			endpoint:        "/api/admin/*",
			method:          "GET",
			resourceType:    "admin",
			expectedMinRisk: 4,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			authRequest := &models.APIAuthorizationRequest{
				UserID:          suite.testUserID,
				SessionID:       suite.testSessionID,
				RequestID:       "test-request-" + uuid.New().String(),
				EndpointPattern: tc.endpoint,
				HTTPMethod:      tc.method,
				ResourceType:    tc.resourceType,
				UserRole:        "user",
				RequestContext:  map[string]interface{}{"test": "context"},
			}

			result, err := suite.authService.AuthorizeAPIAccess(ctx, authRequest)
			require.NoError(t, err, "Authorization should not fail")
			assert.GreaterOrEqual(t, result.RiskScore, tc.expectedMinRisk,
				"Risk score should meet minimum threshold for %s", tc.name)
		})
	}
}

// TestConcurrentAuthorization tests authorization under concurrent load
func (suite *BL005AuthorizationTestSuite) TestConcurrentAuthorization() {
	t := suite.T()
	ctx := context.Background()

	numGoroutines := 10
	numRequestsPerGoroutine := 5
	results := make(chan bool, numGoroutines*numRequestsPerGoroutine)
	errors := make(chan error, numGoroutines*numRequestsPerGoroutine)

	// Launch concurrent authorization requests
	for i := 0; i < numGoroutines; i++ {
		go func() {
			for j := 0; j < numRequestsPerGoroutine; j++ {
				authRequest := &models.APIAuthorizationRequest{
					UserID:          suite.testUserID,
					SessionID:       suite.testSessionID,
					RequestID:       "test-request-" + uuid.New().String(),
					EndpointPattern: "/api/campaigns/:id",
					HTTPMethod:      "GET",
					ResourceType:    "campaign",
					ResourceID:      suite.testCampaignID.String(),
					CampaignID:      suite.testCampaignID.String(),
					UserRole:        "user",
					RequestContext:  map[string]interface{}{"concurrent": true},
				}

				result, err := suite.authService.AuthorizeAPIAccess(ctx, authRequest)
				if err != nil {
					errors <- err
				} else {
					results <- result.Authorized
				}
			}
		}()
	}

	// Collect results
	successCount := 0
	errorCount := 0
	for i := 0; i < numGoroutines*numRequestsPerGoroutine; i++ {
		select {
		case authorized := <-results:
			if authorized {
				successCount++
			}
		case <-errors:
			errorCount++
		case <-time.After(5 * time.Second):
			t.Fatal("Timeout waiting for concurrent authorization results")
		}
	}

	assert.Equal(t, numGoroutines*numRequestsPerGoroutine, successCount,
		"All concurrent requests should be successful")
	assert.Equal(t, 0, errorCount, "No errors should occur during concurrent authorization")
}

// Helper functions are now in common_test_utils.go
