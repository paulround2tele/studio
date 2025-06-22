// File: backend/tests/bl007_input_validation_test.go
package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/middleware"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// BL007InputValidationTestSuite provides comprehensive testing for BL-007 Tactical Plan
type BL007InputValidationTestSuite struct {
	db                      *sqlx.DB
	validationMiddleware    *middleware.BL007InputValidationMiddleware
	domainValidationService *services.DomainValidationService
	testUserID              uuid.UUID
	testSessionID           string
}

// SetupBL007Tests initializes the test suite with database connection
func SetupBL007Tests(t *testing.T) *BL007InputValidationTestSuite {
	db := setupTestDatabase(t)
	
	// BL-007 migration has already been applied to domainflow_production
	// No need to rerun it
	
	validationMiddleware := middleware.NewBL007InputValidationMiddleware(db)
	domainValidationService := services.NewDomainValidationService(db)
	
	return &BL007InputValidationTestSuite{
		db:                      db,
		validationMiddleware:    validationMiddleware,
		domainValidationService: domainValidationService,
		testUserID:              uuid.New(),
		testSessionID:           uuid.New().String(),
	}
}

// TeardownBL007Tests cleans up test resources
func (suite *BL007InputValidationTestSuite) TeardownBL007Tests(t *testing.T) {
	// Clean up test data
	suite.db.Exec("DELETE FROM suspicious_input_alerts WHERE user_id = $1", suite.testUserID)
	suite.db.Exec("DELETE FROM input_validation_violations WHERE user_id = $1", suite.testUserID)
	suite.db.Close()
}

// Helper functions are now in common_test_utils.go

// TestBL007_InputValidationRules tests the PostgreSQL validation rules
func TestBL007_InputValidationRules(t *testing.T) {
	suite := SetupBL007Tests(t)
	defer suite.TeardownBL007Tests(t)

	t.Run("Campaign Validation Rules", func(t *testing.T) {
		// Test campaign creation validation rules
		var rules []struct {
			EndpointPattern string `db:"endpoint_pattern"`
			HTTPMethod      string `db:"http_method"`
			FieldName       string `db:"field_name"`
			ValidationType  string `db:"validation_type"`
			IsRequired      bool   `db:"is_required"`
		}

		query := `
			SELECT endpoint_pattern, http_method, field_name, validation_type, is_required
			FROM input_validation_rules 
			WHERE endpoint_pattern = '/api/campaigns' AND http_method = 'POST'
			ORDER BY field_name
		`
		
		err := suite.db.Select(&rules, query)
		require.NoError(t, err)
		assert.NotEmpty(t, rules, "Campaign validation rules should be present")

		// Verify specific rules exist
		expectedFields := []string{"campaignType", "name", "description", "domainGenerationParams", "dnsValidationParams", "httpKeywordParams"}
		actualFields := make([]string, len(rules))
		for i, rule := range rules {
			actualFields[i] = rule.FieldName
		}

		for _, expectedField := range expectedFields {
			assert.Contains(t, actualFields, expectedField, fmt.Sprintf("Field %s should have validation rule", expectedField))
		}
	})

	t.Run("Suspicious Pattern Detection", func(t *testing.T) {
		// Test suspicious pattern rules
		var patterns []struct {
			PatternName string `db:"pattern_name"`
			Category    string `db:"category"`
			Severity    string `db:"severity"`
			IsEnabled   bool   `db:"is_enabled"`
		}

		query := `
			SELECT pattern_name, category, severity, is_enabled
			FROM suspicious_input_patterns 
			WHERE is_enabled = true
			ORDER BY severity DESC
		`
		
		err := suite.db.Select(&patterns, query)
		require.NoError(t, err)
		assert.NotEmpty(t, patterns, "Suspicious patterns should be configured")

		// Verify security patterns are present
		expectedPatterns := []string{"sql_injection", "xss_script", "command_injection", "path_traversal"}
		actualPatterns := make([]string, len(patterns))
		for i, pattern := range patterns {
			actualPatterns[i] = pattern.PatternName
		}

		for _, expectedPattern := range expectedPatterns {
			assert.Contains(t, actualPatterns, expectedPattern, fmt.Sprintf("Pattern %s should be configured", expectedPattern))
		}
	})
}

// TestBL007_MiddlewareValidation tests the validation middleware functionality
func TestBL007_MiddlewareValidation(t *testing.T) {
	suite := SetupBL007Tests(t)
	defer suite.TeardownBL007Tests(t)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	
	// Set user context BEFORE validation middleware (simulating auth middleware)
	router.Use(func(c *gin.Context) {
		c.Set("user_id", suite.testUserID)
		c.Set("session_id", suite.testSessionID)
		c.Next()
	})
	
	router.Use(suite.validationMiddleware.ValidateRequest())
	
	// Add test endpoint
	router.POST("/api/campaigns", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	t.Run("Valid Campaign Request", func(t *testing.T) {
		validRequest := map[string]interface{}{
			"campaignType": "domain_generation",
			"name":         "Test Campaign",
			"description":  "A test campaign for validation",
			"domainGenerationParams": map[string]interface{}{
				"patternType":          "prefix",
				"variableLength":       8,
				"characterSet":         "abcdefghijklmnopqrstuvwxyz",
				"constantString":       "test",
				"tld":                  ".com",
				"numDomainsToGenerate": 1000,
			},
		}

		body, _ := json.Marshal(validRequest)
		req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code, "Valid request should pass validation")
	})

	t.Run("Invalid Field Length", func(t *testing.T) {
		invalidRequest := map[string]interface{}{
			"campaignType": "domain_generation",
			"name":         "", // Empty name should fail validation
			"description":  "A test campaign",
		}

		body, _ := json.Marshal(invalidRequest)
		req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code, "Invalid request should fail validation")
		
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response, "code")
		assert.Contains(t, response["code"], "BL007")
	})

	t.Run("Suspicious Pattern Detection", func(t *testing.T) {
		suspiciousRequest := map[string]interface{}{
			"campaignType": "domain_generation",
			"name":         "Test Campaign",
			"description":  "'; DROP TABLE campaigns; --", // SQL injection attempt
			"domainGenerationParams": map[string]interface{}{
				"patternType":    "prefix",
				"variableLength": 8,
				"characterSet":   "abcdefghijklmnopqrstuvwxyz",
				"constantString": "test",
				"tld":            ".com",
			},
		}

		body, _ := json.Marshal(suspiciousRequest)
		req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// The request should be processed (suspicious patterns are logged but don't block)
		// but we should verify that the suspicious pattern was logged
		time.Sleep(100 * time.Millisecond) // Allow async logging to complete

		var alertCount int
		err := suite.db.Get(&alertCount, "SELECT COUNT(*) FROM suspicious_input_alerts WHERE user_id = $1", suite.testUserID)
		require.NoError(t, err)
		assert.Greater(t, alertCount, 0, "Suspicious pattern should be logged")
	})
}

// TestBL007_DomainValidationService tests the domain-specific business logic validation
func TestBL007_DomainValidationService(t *testing.T) {
	suite := SetupBL007Tests(t)
	defer suite.TeardownBL007Tests(t)

	ctx := context.Background()

	t.Run("Valid Campaign Creation", func(t *testing.T) {
		request := services.CreateCampaignRequest{
			CampaignType: "domain_generation",
			Name:         "Test Campaign",
			Description:  "A valid test campaign",
			UserID:       suite.testUserID,
			DomainGenerationParams: &services.DomainGenerationParams{
				PatternType:          "prefix",
				VariableLength:       8,
				CharacterSet:         "abcdefghijklmnopqrstuvwxyz",
				ConstantString:       "test",
				TLD:                  ".com",
				NumDomainsToGenerate: 1000,
			},
		}

		result, err := suite.domainValidationService.ValidateCampaignCreation(ctx, request, suite.testUserID)
		require.NoError(t, err)
		assert.True(t, result.IsValid, "Valid campaign should pass validation")
		assert.Empty(t, result.Violations, "Valid campaign should have no violations")
	})

	t.Run("Invalid Variable Length", func(t *testing.T) {
		request := services.CreateCampaignRequest{
			CampaignType: "domain_generation",
			Name:         "Test Campaign",
			Description:  "A test campaign with invalid variable length",
			UserID:       suite.testUserID,
			DomainGenerationParams: &services.DomainGenerationParams{
				PatternType:          "prefix",
				VariableLength:       50, // Too high
				CharacterSet:         "abcdefghijklmnopqrstuvwxyz",
				ConstantString:       "test",
				TLD:                  ".com",
				NumDomainsToGenerate: 1000000, // Excessive amount
			},
		}

		result, err := suite.domainValidationService.ValidateCampaignCreation(ctx, request, suite.testUserID)
		require.NoError(t, err)
		assert.False(t, result.IsValid, "Invalid variable length should fail validation")
		assert.NotEmpty(t, result.Violations, "Should have variable length violations")

		// Check specific violation
		found := false
		for _, violation := range result.Violations {
			if violation.Field == "variableLength" || violation.Field == "numDomainsToGenerate" {
				found = true
				break
			}
		}
		assert.True(t, found, "Should have variableLength or numDomainsToGenerate violation")
	})

	t.Run("Invalid Character Set", func(t *testing.T) {
		// Create a request with invalid character set
		request := services.CreateCampaignRequest{
			CampaignType: "domain_generation",
			Name:         "Test Campaign",
			Description:  "A test campaign with invalid character set",
			UserID:       suite.testUserID,
			DomainGenerationParams: &services.DomainGenerationParams{
				PatternType:          "prefix",
				VariableLength:       8,
				CharacterSet:         "", // Empty character set
				ConstantString:       "test",
				TLD:                  ".com",
				NumDomainsToGenerate: 1000,
			},
		}

		result, err := suite.domainValidationService.ValidateCampaignCreation(ctx, request, suite.testUserID)
		require.NoError(t, err)
		assert.False(t, result.IsValid, "Empty character set should fail validation")
		assert.NotEmpty(t, result.Violations, "Should have character set violations")
	})

	t.Run("User Campaign Limits", func(t *testing.T) {
		// This test would check if the user has exceeded their campaign limits
		// For now, we'll test the validation logic with a mock scenario
		request := services.CreateCampaignRequest{
			CampaignType: "domain_generation",
			Name:         "Test Campaign",
			Description:  "A test campaign for limit checking",
			UserID:       suite.testUserID,
			DomainGenerationParams: &services.DomainGenerationParams{
				PatternType:          "prefix",
				VariableLength:       8,
				CharacterSet:         "abcdefghijklmnopqrstuvwxyz",
				ConstantString:       "test",
				TLD:                  ".com",
				NumDomainsToGenerate: 1000,
			},
		}

		result, err := suite.domainValidationService.ValidateCampaignCreation(ctx, request, suite.testUserID)
		require.NoError(t, err)
		// The result should be valid for a new user with no existing campaigns
		assert.True(t, result.IsValid, "New user should be within campaign limits")
	})
}

// TestBL007_IntegrationWithBL005BL006 tests integration with existing security infrastructure
func TestBL007_IntegrationWithBL005BL006(t *testing.T) {
	suite := SetupBL007Tests(t)
	defer suite.TeardownBL007Tests(t)

	t.Run("Audit Context Integration", func(t *testing.T) {
		// Test that BL-007 violations are properly logged with audit context from BL-006
		gin.SetMode(gin.TestMode)
		router := gin.New()
		
		// Simulate BL-006 audit context middleware
		router.Use(func(c *gin.Context) {
			c.Set("user_id", suite.testUserID)
			c.Set("session_id", suite.testSessionID)
			c.Set("request_id", uuid.New().String())
			c.Next()
		})
		
		router.Use(suite.validationMiddleware.ValidateRequest())
		router.POST("/api/campaigns", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "success"})
		})

		invalidRequest := map[string]interface{}{
			"campaignType": "invalid_type", // Should trigger enum validation
			"name":         "Test Campaign",
		}

		body, _ := json.Marshal(invalidRequest)
		req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", "Test-Agent/1.0")
		
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		// Verify violation was logged with proper context
		time.Sleep(100 * time.Millisecond) // Allow async logging
		
		var violation struct {
			UserID    uuid.UUID `db:"user_id"`
			SessionID string    `db:"session_id"`
			UserAgent string    `db:"user_agent"`
		}
		
		err := suite.db.Get(&violation, 
			"SELECT user_id, session_id, user_agent FROM input_validation_violations WHERE user_id = $1 LIMIT 1", 
			suite.testUserID)
		require.NoError(t, err)
		
		assert.Equal(t, suite.testUserID, violation.UserID)
		assert.Equal(t, suite.testSessionID, violation.SessionID)
		assert.Equal(t, "Test-Agent/1.0", violation.UserAgent)
	})
}

// TestBL007_SecurityPatterns tests specific security pattern detection
func TestBL007_SecurityPatterns(t *testing.T) {
	suite := SetupBL007Tests(t)
	defer suite.TeardownBL007Tests(t)

	testCases := []struct {
		name            string
		input           string
		expectedPattern string
		shouldDetect    bool
	}{
		{
			name:            "SQL Injection - Union",
			input:           "test' UNION SELECT * FROM users --",
			expectedPattern: "sql_injection",
			shouldDetect:    true,
		},
		{
			name:            "XSS Script Tag",
			input:           "<script>alert('xss')</script>",
			expectedPattern: "xss_script",
			shouldDetect:    true,
		},
		{
			name:            "Command Injection",
			input:           "test; rm -rf /",
			expectedPattern: "command_injection",
			shouldDetect:    true,
		},
		{
			name:            "Path Traversal",
			input:           "../../../etc/passwd",
			expectedPattern: "path_traversal",
			shouldDetect:    true,
		},
		{
			name:            "Normal Input",
			input:           "Normal campaign description",
			expectedPattern: "",
			shouldDetect:    false,
		},
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("user_id", suite.testUserID)
		c.Set("session_id", suite.testSessionID)
		c.Next()
	})
	router.Use(suite.validationMiddleware.ValidateRequest())
	router.POST("/api/campaigns", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Clear previous alerts
			suite.db.Exec("DELETE FROM suspicious_input_alerts WHERE user_id = $1", suite.testUserID)

			request := map[string]interface{}{
				"campaignType": "domain_generation",
				"name":         "Test Campaign",
				"description":  tc.input,
				"domainGenerationParams": map[string]interface{}{
					"patternType":    "prefix",
					"variableLength": 8,
					"characterSet":   "abcdefghijklmnopqrstuvwxyz",
					"constantString": "test",
					"tld":            ".com",
				},
			}

			body, _ := json.Marshal(request)
			req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			time.Sleep(100 * time.Millisecond) // Allow async logging

			var alertCount int
			err := suite.db.Get(&alertCount, "SELECT COUNT(*) FROM suspicious_input_alerts WHERE user_id = $1", suite.testUserID)
			require.NoError(t, err)

			if tc.shouldDetect {
				assert.Greater(t, alertCount, 0, fmt.Sprintf("Should detect suspicious pattern in: %s", tc.input))
				
				if tc.expectedPattern != "" {
					var patternName string
					err := suite.db.Get(&patternName, 
						"SELECT pattern_name FROM suspicious_input_alerts WHERE user_id = $1 LIMIT 1", 
						suite.testUserID)
					require.NoError(t, err)
					assert.Equal(t, tc.expectedPattern, patternName)
				}
			} else {
				assert.Equal(t, 0, alertCount, fmt.Sprintf("Should not detect pattern in normal input: %s", tc.input))
			}
		})
	}
}

// TestBL007_PerformanceImpact tests that validation doesn't significantly impact performance
func TestBL007_PerformanceImpact(t *testing.T) {
	suite := SetupBL007Tests(t)
	defer suite.TeardownBL007Tests(t)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(suite.validationMiddleware.ValidateRequest())
	router.POST("/api/campaigns", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	validRequest := map[string]interface{}{
		"campaignType": "domain_generation",
		"name":         "Performance Test Campaign",
		"description":  "Testing validation performance impact",
		"domainGenerationParams": map[string]interface{}{
			"patternType":          "prefix",
			"variableLength":       8,
			"characterSet":         "abcdefghijklmnopqrstuvwxyz",
			"constantString":       "test",
			"tld":                  ".com",
			"numDomainsToGenerate": 1000,
		},
	}

	body, _ := json.Marshal(validRequest)

	// Warm up
	for i := 0; i < 10; i++ {
		req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
	}

	// Performance test
	start := time.Now()
	iterations := 100

	for i := 0; i < iterations; i++ {
		req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	}

	duration := time.Since(start)
	avgDuration := duration / time.Duration(iterations)

	t.Logf("Validation performance: %v average per request (%d iterations)", avgDuration, iterations)
	
	// Validation should not add more than 10ms overhead per request
	assert.Less(t, avgDuration, 10*time.Millisecond, "Validation should not significantly impact performance")
}

// TestBL007_ComplianceValidation ensures BL-007 meets all tactical plan requirements
func TestBL007_ComplianceValidation(t *testing.T) {
	suite := SetupBL007Tests(t)
	defer suite.TeardownBL007Tests(t)

	t.Run("Database Schema Compliance", func(t *testing.T) {
		// Verify all required tables exist
		requiredTables := []string{
			"input_validation_rules",
			"suspicious_input_patterns", 
			"input_validation_violations",
			"suspicious_input_alerts",
		}

		for _, tableName := range requiredTables {
			var exists bool
			err := suite.db.Get(&exists, 
				"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)", 
				tableName)
			require.NoError(t, err)
			assert.True(t, exists, fmt.Sprintf("Table %s should exist", tableName))
		}
	})

	t.Run("Validation Rule Coverage", func(t *testing.T) {
		// Verify validation rules cover all required endpoints
		requiredEndpoints := []string{
			"/api/campaigns",
			"/api/personas",
			"/api/admin/users",
			"/api/admin/roles",
		}

		for _, endpoint := range requiredEndpoints {
			var ruleCount int
			err := suite.db.Get(&ruleCount, 
				"SELECT COUNT(*) FROM input_validation_rules WHERE endpoint_pattern = $1", 
				endpoint)
			require.NoError(t, err)
			assert.Greater(t, ruleCount, 0, fmt.Sprintf("Endpoint %s should have validation rules", endpoint))
		}
	})

	t.Run("Security Pattern Coverage", func(t *testing.T) {
		// Verify all required security patterns are configured
		requiredPatterns := []string{"sql_injection", "xss_script", "command_injection", "path_traversal"}
		
		var patternCount int
		err := suite.db.Get(&patternCount,
			"SELECT COUNT(*) FROM suspicious_input_patterns WHERE pattern_name = ANY($1) AND is_enabled = true",
			pq.Array(requiredPatterns))
		require.NoError(t, err)
		assert.Equal(t, len(requiredPatterns), patternCount, "All required security patterns should be enabled")
	})
}