package api

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHealthCheckHandler_HandleHealthCheck(t *testing.T) {
	// Test cases
	tests := []struct {
		name           string
		simulateDown   bool
		expectedStatus string
		expectedCode   int
	}{
		{
			name:           "healthy service",
			simulateDown:   false,
			expectedStatus: "ok",
			expectedCode:   http.StatusOK,
		},
		{
			name:           "database unavailable",
			simulateDown:   true,
			expectedStatus: "degraded",
			expectedCode:   http.StatusOK, // Still return 200 but with degraded status
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			dsn := os.Getenv("TEST_POSTGRES_DSN")
			require.NotEmpty(t, dsn)
			db, err := sql.Open("postgres", dsn)
			require.NoError(t, err)
			if tc.simulateDown {
				db.Close()
			}

			// Set up router
			gin.SetMode(gin.TestMode)
			router := gin.New()
			handler := NewHealthCheckHandler(db)
			RegisterHealthCheckRoutes(router, handler)

			// Create request
			req, err := http.NewRequest(http.MethodGet, "/health", nil)
			require.NoError(t, err)

			// Record response
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Assert response
			assert.Equal(t, tc.expectedCode, w.Code)

			// Parse response body
			var apiResp APIResponse
			err = json.Unmarshal(w.Body.Bytes(), &apiResp)
			require.NoError(t, err)
			var response HealthStatus
			jsonData, _ := json.Marshal(apiResp.Data)
			_ = json.Unmarshal(jsonData, &response)

			// Assert status
			assert.Equal(t, tc.expectedStatus, response.Status)
			assert.NotEmpty(t, response.Version)
			assert.NotEmpty(t, response.BuildTime)
			assert.NotEmpty(t, response.Environment)
			assert.Contains(t, response.Components, "database")

			// No mock expectations
		})
	}
}

func TestHealthCheckHandler_HandleReadinessCheck(t *testing.T) {
	// Test cases
	tests := []struct {
		name         string
		simulateDown bool
		expectedCode int
	}{
		{
			name:         "service ready",
			simulateDown: false,
			expectedCode: http.StatusOK,
		},
		{
			name:         "service not ready",
			simulateDown: true,
			expectedCode: http.StatusServiceUnavailable,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			dsn := os.Getenv("TEST_POSTGRES_DSN")
			require.NotEmpty(t, dsn)
			db, err := sql.Open("postgres", dsn)
			require.NoError(t, err)
			if tc.simulateDown {
				db.Close()
			}

			// Set up router
			gin.SetMode(gin.TestMode)
			router := gin.New()
			handler := NewHealthCheckHandler(db)
			RegisterHealthCheckRoutes(router, handler)

			// Create request
			req, err := http.NewRequest(http.MethodGet, "/health/ready", nil)
			require.NoError(t, err)

			// Record response
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Assert response
			assert.Equal(t, tc.expectedCode, w.Code)

			// No mock expectations
		})
	}
}

func TestHealthCheckHandler_HandleLivenessCheck(t *testing.T) {
	dsn := os.Getenv("TEST_POSTGRES_DSN")
	require.NotEmpty(t, dsn)
	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	defer db.Close()

	// Set up router
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := NewHealthCheckHandler(db)
	RegisterHealthCheckRoutes(router, handler)

	// Create request
	req, err := http.NewRequest(http.MethodGet, "/health/live", nil)
	require.NoError(t, err)

	// Record response
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert response
	assert.Equal(t, http.StatusOK, w.Code)

	// Parse response body
	var apiResp APIResponse
	err = json.Unmarshal(w.Body.Bytes(), &apiResp)
	require.NoError(t, err)
	respMap, _ := apiResp.Data.(map[string]interface{})
	statusVal, _ := respMap["status"].(string)

	// Assert status
	assert.Equal(t, "alive", statusVal)

	// No mock expectations
}
