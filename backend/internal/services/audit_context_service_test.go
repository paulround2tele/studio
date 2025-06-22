// File: backend/internal/services/audit_context_service_test.go
package services

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

// MockAuditContextStore implements store.AuditLogStore for testing
type MockAuditContextStore struct {
	mock.Mock
}

func (m *MockAuditContextStore) CreateAuditLog(ctx context.Context, exec store.Querier, logEntry *models.AuditLog) error {
	args := m.Called(ctx, exec, logEntry)
	return args.Error(0)
}

func (m *MockAuditContextStore) ListAuditLogs(ctx context.Context, exec store.Querier, filter store.ListAuditLogsFilter) ([]*models.AuditLog, error) {
	args := m.Called(ctx, exec, filter)
	return args.Get(0).([]*models.AuditLog), args.Error(1)
}

func (m *MockAuditContextStore) CreateAuditLogWithValidation(ctx context.Context, exec store.Querier, logEntry *models.AuditLog) error {
	args := m.Called(ctx, exec, logEntry)
	return args.Error(0)
}

func (m *MockAuditContextStore) GetAuditLogsWithUserFilter(ctx context.Context, exec store.Querier, userID uuid.UUID, filter store.ListAuditLogsFilter) ([]*models.AuditLog, error) {
	args := m.Called(ctx, exec, userID, filter)
	return args.Get(0).([]*models.AuditLog), args.Error(1)
}

func (m *MockAuditContextStore) ValidateAuditLogCompleteness(ctx context.Context, exec store.Querier, startTime, endTime time.Time) ([]string, error) {
	args := m.Called(ctx, exec, startTime, endTime)
	return args.Get(0).([]string), args.Error(1)
}

// Test setup helpers
func setupTestAuditService() (*auditContextServiceImpl, *MockAuditContextStore) {
	mockAuditStore := &MockAuditContextStore{}

	service := &auditContextServiceImpl{
		auditLogStore: mockAuditStore,
	}

	return service, mockAuditStore
}

func setupTestGinContext() (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	// Set up request
	req := httptest.NewRequest("POST", "/api/campaigns", nil)
	req.Header.Set("User-Agent", "DomainFlow-Client/1.0")
	req.Header.Set("X-Forwarded-For", "192.168.1.100")
	c.Request = req

	return c, recorder
}

// BL-006 COMPLIANCE TESTS

func TestExtractUserContext_SessionAuthentication_Success(t *testing.T) {
	service, _ := setupTestAuditService()
	c, _ := setupTestGinContext()

	// Set up session authentication context
	userID := uuid.New()
	sessionID := "test-session-123"
	c.Set("auth_type", "session")
	c.Set("request_id", "req-123")

	securityContext := &models.SecurityContext{
		UserID:                 userID,
		SessionID:              sessionID,
		Permissions:            []string{"campaign_create", "campaign_read"},
		Roles:                  []string{"operator"},
		SessionExpiry:          time.Now().Add(24 * time.Hour),
		RequiresPasswordChange: false,
		RiskScore:              3,
	}
	c.Set("security_context", securityContext)

	// Test extraction
	userCtx, err := service.ExtractUserContext(c)

	// Assertions
	require.NoError(t, err)
	assert.Equal(t, userID, userCtx.UserID)
	assert.Equal(t, sessionID, userCtx.SessionID)
	assert.Equal(t, "session", userCtx.AuthenticationType)
	assert.Equal(t, "192.168.1.100", userCtx.ClientIP)
	assert.Equal(t, "DomainFlow-Client/1.0", userCtx.UserAgent)
	assert.Contains(t, userCtx.Permissions, "campaign_create")
	assert.Contains(t, userCtx.Roles, "operator")
	assert.Equal(t, "req-123", userCtx.RequestID)
	assert.Equal(t, securityContext.SessionExpiry, userCtx.SessionExpiry)
	assert.Equal(t, securityContext.RequiresPasswordChange, userCtx.RequiresPasswordChange)
	assert.Equal(t, securityContext.RiskScore, userCtx.RiskScore)
}

func TestExtractUserContext_APIKeyAuthentication_Success(t *testing.T) {
	service, _ := setupTestAuditService()
	c, _ := setupTestGinContext()

	// Set up API key authentication
	c.Set("auth_type", "api_key")

	// Test extraction
	userCtx, err := service.ExtractUserContext(c)

	// Assertions
	require.NoError(t, err)
	assert.Equal(t, "api_key", userCtx.AuthenticationType)
	assert.Equal(t, "192.168.1.100", userCtx.ClientIP)
	assert.Equal(t, "api_key", userCtx.APIKeyIdentifier)
	assert.Contains(t, userCtx.Permissions, "api:access")
	assert.Contains(t, userCtx.Roles, "api_user")
	assert.NotEmpty(t, userCtx.RequestID)
}

func TestExtractUserContext_MissingAuthentication_Failure(t *testing.T) {
	service, _ := setupTestAuditService()
	c, _ := setupTestGinContext()

	// No authentication context set

	// Test extraction
	userCtx, err := service.ExtractUserContext(c)

	// Assertions
	assert.Error(t, err)
	assert.Nil(t, userCtx)
	assert.Contains(t, err.Error(), "no authentication type found in context")
}

func TestValidateAuditContext_SessionContext_Success(t *testing.T) {
	service, _ := setupTestAuditService()

	userCtx := &AuditUserContext{
		UserID:             uuid.New(),
		SessionID:          "valid-session",
		AuthenticationType: "session",
		ClientIP:           "192.168.1.100",
		UserAgent:          "Test-Agent/1.0",
		RequestID:          uuid.New().String(),
		Permissions:        []string{"campaign_create"},
		Roles:              []string{"operator"},
	}

	err := service.ValidateAuditContext(userCtx)
	assert.NoError(t, err)
}

func TestValidateAuditContext_APIKeyContext_Success(t *testing.T) {
	service, _ := setupTestAuditService()

	userCtx := &AuditUserContext{
		APIKeyIdentifier:   "test-api-key",
		AuthenticationType: "api_key",
		ClientIP:           "192.168.1.100",
		UserAgent:          "Test-Agent/1.0",
		RequestID:          uuid.New().String(),
		Permissions:        []string{"api:access"},
		Roles:              []string{"api_user"},
	}

	err := service.ValidateAuditContext(userCtx)
	assert.NoError(t, err)
}

func TestValidateAuditContext_SystemContext_Success(t *testing.T) {
	service, _ := setupTestAuditService()

	userCtx := &AuditUserContext{
		SystemIdentifier:   "test-system",
		AuthenticationType: "system",
		ClientIP:           "system",
		UserAgent:          "System-Agent/1.0",
		RequestID:          uuid.New().String(),
		Permissions:        []string{"system:operation"},
		Roles:              []string{"system"},
	}

	err := service.ValidateAuditContext(userCtx)
	assert.NoError(t, err)
}

func TestValidateAuditContext_InvalidContext_Failures(t *testing.T) {
	service, _ := setupTestAuditService()

	testCases := []struct {
		name     string
		userCtx  *AuditUserContext
		errorMsg string
	}{
		{
			name: "session without user ID",
			userCtx: &AuditUserContext{
				AuthenticationType: "session",
				RequestID:          "test-req",
			},
			errorMsg: "user ID is required for session-based authentication",
		},
		{
			name: "session without session ID",
			userCtx: &AuditUserContext{
				UserID:             uuid.New(),
				AuthenticationType: "session",
				RequestID:          "test-req",
			},
			errorMsg: "session ID is required for session-based authentication",
		},
		{
			name: "api_key without identifier",
			userCtx: &AuditUserContext{
				AuthenticationType: "api_key",
				RequestID:          "test-req",
			},
			errorMsg: "API key identifier is required for API key authentication",
		},
		{
			name: "system without identifier",
			userCtx: &AuditUserContext{
				AuthenticationType: "system",
				RequestID:          "test-req",
			},
			errorMsg: "system identifier is required for system authentication",
		},
		{
			name: "missing request ID",
			userCtx: &AuditUserContext{
				UserID:             uuid.New(),
				SessionID:          "test-session",
				AuthenticationType: "session",
			},
			errorMsg: "request ID is required for audit traceability",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := service.ValidateAuditContext(tc.userCtx)
			assert.Error(t, err)
			assert.Contains(t, err.Error(), tc.errorMsg)
		})
	}
}

func TestCreateAuditEvent_SecurityCriticalAction_Success(t *testing.T) {
	service, mockAuditStore := setupTestAuditService()

	userCtx := &AuditUserContext{
		UserID:             uuid.New(),
		SessionID:          "test-session",
		AuthenticationType: "session",
		ClientIP:           "192.168.1.100",
		UserAgent:          "Test-Agent/1.0",
		RequestID:          uuid.New().String(),
		Permissions:        []string{"campaign_create"},
		Roles:              []string{"operator"},
	}

	entityID := uuid.New()
	details := map[string]interface{}{
		"campaign_type": "domain_generation",
		"parameters": map[string]interface{}{
			"tld":     ".com",
			"pattern": "prefix",
		},
	}

	// Mock audit log creation
	mockAuditStore.On("CreateAuditLog", mock.Anything, mock.Anything, mock.MatchedBy(func(log *models.AuditLog) bool {
		return log.Action == "campaign_create" &&
			log.EntityType.String == "campaign" &&
			log.EntityID.UUID == entityID &&
			log.UserID.UUID == userCtx.UserID &&
			log.ClientIP.String == userCtx.ClientIP
	})).Return(nil)

	// Test audit event creation
	err := service.CreateAuditEvent(context.Background(), userCtx, "campaign_create", "campaign", &entityID, details)

	// Assertions
	assert.NoError(t, err)
	mockAuditStore.AssertExpectations(t)
}

func TestCreateAuditEvent_WithEnhancedDetails_Success(t *testing.T) {
	service, mockAuditStore := setupTestAuditService()

	userCtx := &AuditUserContext{
		UserID:             uuid.New(),
		SessionID:          "test-session",
		AuthenticationType: "session",
		ClientIP:           "192.168.1.100",
		UserAgent:          "Test-Agent/1.0",
		RequestID:          uuid.New().String(),
		Permissions:        []string{"campaign_update"},
		Roles:              []string{"admin"},
		RiskScore:          2,
	}

	entityID := uuid.New()

	// Mock audit log creation and validate enhanced details
	mockAuditStore.On("CreateAuditLog", mock.Anything, mock.Anything, mock.MatchedBy(func(log *models.AuditLog) bool {
		// Verify enhanced details structure
		var details AuditEventDetails
		err := json.Unmarshal(*log.Details, &details)
		if err != nil {
			return false
		}

		return details.UserContext.UserID == userCtx.UserID &&
			details.UserContext.AuthenticationType == userCtx.AuthenticationType &&
			details.UserContext.SessionID == userCtx.SessionID &&
			details.RequestCorrelationID == userCtx.RequestID &&
			len(details.SecurityFlags) >= 0 &&
			len(details.ComplianceFlags) >= 0 &&
			details.BusinessContext != nil
	})).Return(nil)

	// Test audit event creation
	err := service.CreateAuditEvent(context.Background(), userCtx, "campaign_update", "campaign", &entityID, nil)

	// Assertions
	assert.NoError(t, err)
	mockAuditStore.AssertExpectations(t)
}

func TestCreateSystemAuditEvent_Success(t *testing.T) {
	service, mockAuditStore := setupTestAuditService()

	// Mock audit log creation for system event
	mockAuditStore.On("CreateAuditLog", mock.Anything, mock.Anything, mock.MatchedBy(func(log *models.AuditLog) bool {
		var details AuditEventDetails
		err := json.Unmarshal(*log.Details, &details)
		if err != nil {
			return false
		}

		return details.UserContext.SystemIdentifier == "background-processor" &&
			details.UserContext.AuthenticationType == "system" &&
			details.UserContext.ClientIP == "system" &&
			contains(details.UserContext.Permissions, "system:operation") &&
			contains(details.UserContext.Roles, "system")
	})).Return(nil)

	// Test system audit event creation
	err := service.CreateSystemAuditEvent(context.Background(), "background-processor", "system_operation", "campaign", nil, map[string]interface{}{
		"operation": "automated_cleanup",
	})

	// Assertions
	assert.NoError(t, err)
	mockAuditStore.AssertExpectations(t)
}

func TestCreateAPIKeyAuditEvent_Success(t *testing.T) {
	service, mockAuditStore := setupTestAuditService()

	// Mock audit log creation for API key event
	mockAuditStore.On("CreateAuditLog", mock.Anything, mock.Anything, mock.MatchedBy(func(log *models.AuditLog) bool {
		var details AuditEventDetails
		err := json.Unmarshal(*log.Details, &details)
		if err != nil {
			return false
		}

		return details.UserContext.APIKeyIdentifier == "api-key-123" &&
			details.UserContext.AuthenticationType == "api_key" &&
			details.UserContext.ClientIP == "api" &&
			contains(details.UserContext.Permissions, "api:access") &&
			contains(details.UserContext.Roles, "api_user")
	})).Return(nil)

	// Test API key audit event creation
	err := service.CreateAPIKeyAuditEvent(context.Background(), "api-key-123", "api_operation", "campaign", nil, map[string]interface{}{
		"operation": "data_export",
	})

	// Assertions
	assert.NoError(t, err)
	mockAuditStore.AssertExpectations(t)
}

// BL-006 Compliance Integration Tests

func TestAuditContextService_FullWorkflow_BL006Compliance(t *testing.T) {
	service, mockAuditStore := setupTestAuditService()
	c, _ := setupTestGinContext()

	// Set up complete authentication context
	userID := uuid.New()
	sessionID := "compliance-test-session"
	c.Set("auth_type", "session")
	c.Set("request_id", "compliance-req-123")

	securityContext := &models.SecurityContext{
		UserID:      userID,
		SessionID:   sessionID,
		Permissions: []string{"campaign_create", "sensitive_data_access"},
		Roles:       []string{"admin"},
	}
	c.Set("security_context", securityContext)

	// Mock successful audit log creation
	mockAuditStore.On("CreateAuditLog", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	// Step 1: Extract user context
	userCtx, err := service.ExtractUserContext(c)
	require.NoError(t, err)

	// Step 2: Validate context (BL-006 compliance)
	err = service.ValidateAuditContext(userCtx)
	require.NoError(t, err)

	// Step 3: Create audit event with complete context
	entityID := uuid.New()
	err = service.CreateAuditEvent(context.Background(), userCtx, "sensitive_data_access", "campaign", &entityID, map[string]interface{}{
		"data_type":     "domain_generation_results",
		"access_reason": "compliance_audit",
	})
	require.NoError(t, err)

	// Verify all user context elements are captured (BL-006 compliance)
	assert.NotEqual(t, uuid.Nil, userCtx.UserID)
	assert.NotEmpty(t, userCtx.SessionID)
	assert.NotEmpty(t, userCtx.ClientIP)
	assert.NotEmpty(t, userCtx.UserAgent)
	assert.NotEmpty(t, userCtx.RequestID)
	assert.Equal(t, "session", userCtx.AuthenticationType)

	mockAuditStore.AssertExpectations(t)
}

func TestCreateAuditEventFromGin_Success(t *testing.T) {
	service, mockAuditStore := setupTestAuditService()
	c, _ := setupTestGinContext()

	// Set up session authentication context
	userID := uuid.New()
	sessionID := "gin-test-session"
	c.Set("auth_type", "session")

	securityContext := &models.SecurityContext{
		UserID:      userID,
		SessionID:   sessionID,
		Permissions: []string{"campaign_delete"},
		Roles:       []string{"admin"},
	}
	c.Set("security_context", securityContext)

	// Mock audit log creation
	mockAuditStore.On("CreateAuditLog", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	// Test audit event creation from Gin context
	entityID := uuid.New()
	err := service.CreateAuditEventFromGin(c, "campaign_delete", "campaign", &entityID, map[string]interface{}{
		"reason": "user_requested_deletion",
	})

	// Assertions
	assert.NoError(t, err)
	mockAuditStore.AssertExpectations(t)
}

// Performance and Edge Case Tests

func TestExtractUserContext_ClientIPExtraction_EdgeCases(t *testing.T) {
	service, _ := setupTestAuditService()

	testCases := []struct {
		name       string
		headers    map[string]string
		expectedIP string
	}{
		{
			name: "X-Forwarded-For priority",
			headers: map[string]string{
				"X-Forwarded-For": "203.0.113.1",
				"X-Real-IP":       "203.0.113.2",
			},
			expectedIP: "203.0.113.1",
		},
		{
			name: "X-Real-IP fallback",
			headers: map[string]string{
				"X-Real-IP": "203.0.113.2",
			},
			expectedIP: "203.0.113.2",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			c, _ := setupTestGinContext()

			// Set API key authentication for simplicity
			c.Set("auth_type", "api_key")

			// Clear default headers first for clean test
			c.Request.Header.Del("X-Forwarded-For")
			c.Request.Header.Del("X-Real-IP")

			// Set headers
			for key, value := range tc.headers {
				c.Request.Header.Set(key, value)
			}

			userCtx, err := service.ExtractUserContext(c)
			require.NoError(t, err)

			assert.Equal(t, tc.expectedIP, userCtx.ClientIP)
		})
	}
}

// BL-006 Compliance Validation Tests

func TestAuditLogValidation_BL006_RequiredFields(t *testing.T) {
	service, _ := setupTestAuditService()

	// Test that all BL-006 required fields are validated
	userCtx := &AuditUserContext{
		UserID:             uuid.New(),
		SessionID:          "bl006-test",
		AuthenticationType: "session",
		ClientIP:           "192.168.1.100",
		UserAgent:          "BL006-Compliance/1.0",
		RequestID:          uuid.New().String(),
		Permissions:        []string{"campaign_create"},
		Roles:              []string{"operator"},
	}

	// Validate that context passes BL-006 requirements
	err := service.ValidateAuditContext(userCtx)
	assert.NoError(t, err)

	// Verify all required fields for BL-006 compliance
	assert.NotEqual(t, uuid.Nil, userCtx.UserID, "BL-006: UserID must be present")
	assert.NotEmpty(t, userCtx.ClientIP, "BL-006: ClientIP must be present")
	assert.NotEmpty(t, userCtx.RequestID, "BL-006: Request correlation ID must be present")
	assert.NotEmpty(t, userCtx.AuthenticationType, "BL-006: Authentication type must be specified")
	assert.NotEmpty(t, userCtx.SessionID, "BL-006: Session ID must be present for session auth")
}

func TestCreateAuditEvent_BL006_ComplianceMetadata(t *testing.T) {
	service, mockAuditStore := setupTestAuditService()

	userCtx := &AuditUserContext{
		UserID:             uuid.New(),
		SessionID:          "bl006-metadata-test",
		AuthenticationType: "session",
		ClientIP:           "192.168.1.100",
		UserAgent:          "BL006-Metadata/1.0",
		RequestID:          uuid.New().String(),
		Permissions:        []string{"campaign_access_granted"},
		Roles:              []string{"admin"},
	}

	// Mock audit log creation with BL-006 compliance validation
	mockAuditStore.On("CreateAuditLog", mock.Anything, mock.Anything, mock.MatchedBy(func(log *models.AuditLog) bool {
		// Verify BL-006 compliance metadata is included
		var details AuditEventDetails
		err := json.Unmarshal(*log.Details, &details)
		if err != nil {
			return false
		}

		// Check BL-006 specific compliance requirements
		return details.UserContext.UserID == userCtx.UserID &&
			details.UserContext.AuthenticationType == userCtx.AuthenticationType &&
			details.RequestCorrelationID == userCtx.RequestID &&
			details.UserContext.ClientIP == userCtx.ClientIP &&
			len(details.SecurityFlags) >= 0 &&
			len(details.ComplianceFlags) >= 0 &&
			details.BusinessContext != nil
	})).Return(nil)

	// Test security-critical audit event creation
	err := service.CreateAuditEvent(context.Background(), userCtx, "campaign_access_granted", "campaign", nil, map[string]interface{}{
		"access_level": "full",
		"reason":       "authorized_operation",
	})

	// Assertions
	assert.NoError(t, err)
	mockAuditStore.AssertExpectations(t)
}

// Helper function for contains check
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
