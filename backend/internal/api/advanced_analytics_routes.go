// File: backend/internal/api/advanced_analytics_routes.go
package api

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// ===============================================================================
// WEEK 2 DAY 1: ADVANCED ANALYTICS ROUTING
// Proper API routing for analytics that doesn't make me want to cry
// ===============================================================================

// SetupAdvancedAnalyticsRoutes - Set up advanced analytics routes
// Streamlined analytics routing - no micro-service explosion
func SetupAdvancedAnalyticsRoutes(router *gin.RouterGroup, handler *AdvancedBulkAnalyticsAPIHandler) {
	analyticsGroup := router.Group("/bulk/analytics")
	{
		// Advanced bulk analytics endpoint (consolidated functionality)
		analyticsGroup.POST("/advanced", handler.AdvancedBulkAnalyze)

		// Export and visualization endpoints (essential data access)
		analyticsGroup.POST("/export", handler.ExportAnalytics)
		analyticsGroup.GET("/visualization/:campaignId", handler.GetVisualizationData)

		// Alert management endpoints
		analyticsGroup.GET("/alerts", handler.GetAnalyticsAlerts)
	}
}

// ===============================================================================
// WEEK 2 DAY 1: ADVANCED ANALYTICS MIDDLEWARE
// Middleware for request validation and rate limiting
// ===============================================================================

// AdvancedAnalyticsMiddleware - Middleware for advanced analytics endpoints
func AdvancedAnalyticsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Add request ID for tracking
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Set("RequestID", requestID)
		c.Header("X-Request-ID", requestID)

		// Add analytics-specific headers
		c.Header("X-Analytics-Version", "2.0")
		c.Header("X-Analytics-Engine", "AdvancedAnalyticsEngine")

		c.Next()
	}
}

// RateLimitingMiddleware - Rate limiting for analytics endpoints
func RateLimitingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Simple rate limiting implementation
		// In production, would use Redis or similar
		clientIP := c.ClientIP()

		// Check rate limit (placeholder)
		if isRateLimited(clientIP) {
			c.JSON(429, gin.H{
				"error":       "Rate limit exceeded - slow down there, speed racer",
				"retry_after": "60s",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AuthenticationMiddleware - Ensure requests are authenticated
func AuthenticationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-API-Key")
		if apiKey == "" {
			c.JSON(401, gin.H{
				"error": "API key required - authentication is not optional",
			})
			c.Abort()
			return
		}

		// Validate API key (placeholder)
		if !isValidAPIKey(apiKey) {
			c.JSON(401, gin.H{
				"error": "Invalid API key - try one that actually exists",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ValidationMiddleware - Request validation middleware
func ValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Add request size limits
		if c.Request.ContentLength > 10*1024*1024 { // 10MB limit
			c.JSON(413, gin.H{
				"error": "Request too large - this isn't a file upload service",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ===============================================================================
// WEEK 2 DAY 1: ANALYTICS RESPONSE HELPERS
// Helper functions for consistent API responses
// ===============================================================================

// AnalyticsResponse - Standardized analytics response wrapper
type AnalyticsResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Error     string      `json:"error,omitempty"`
	RequestID string      `json:"requestId"`
	Timestamp string      `json:"timestamp"`
	Version   string      `json:"version"`
}

// ===============================================================================
// HELPER FUNCTIONS
// ===============================================================================

func generateRequestID() string {
	// Generate a unique request ID
	return "req_" + randomString(16)
}

func getCurrentTimestamp() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func isRateLimited(clientIP string) bool {
	// Placeholder rate limiting logic
	return false
}

func isValidAPIKey(apiKey string) bool {
	// Placeholder API key validation
	return len(apiKey) >= 32
}

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[rand.Intn(len(charset))]
	}
	return string(b)
}

// ===============================================================================
// WEEK 2 DAY 1: ANALYTICS DOCUMENTATION HELPERS
// Auto-generate API documentation for analytics endpoints
// ===============================================================================

// AnalyticsAPISpec - API specification for analytics endpoints
type AnalyticsAPISpec struct {
	Version     string                  `json:"version"`
	Title       string                  `json:"title"`
	Description string                  `json:"description"`
	Endpoints   []AnalyticsEndpointSpec `json:"endpoints"`
}

// AnalyticsEndpointSpec - Specification for individual endpoint
type AnalyticsEndpointSpec struct {
	Path        string                  `json:"path"`
	Method      string                  `json:"method"`
	Summary     string                  `json:"summary"`
	Description string                  `json:"description"`
	Parameters  []ParameterSpec         `json:"parameters,omitempty"`
	RequestBody *RequestBodySpec        `json:"requestBody,omitempty"`
	Responses   map[string]ResponseSpec `json:"responses"`
	Examples    []ExampleSpec           `json:"examples,omitempty"`
}

// ParameterSpec - Parameter specification
type ParameterSpec struct {
	Name        string `json:"name"`
	In          string `json:"in"` // "query", "path", "header"
	Required    bool   `json:"required"`
	Type        string `json:"type"`
	Description string `json:"description"`
}

// RequestBodySpec - Request body specification
type RequestBodySpec struct {
	Required    bool   `json:"required"`
	ContentType string `json:"contentType"`
	Schema      string `json:"schema"`
	Description string `json:"description"`
}

// ResponseSpec - Response specification
type ResponseSpec struct {
	Description string `json:"description"`
	ContentType string `json:"contentType"`
	Schema      string `json:"schema"`
}

// ExampleSpec - Example request/response
type ExampleSpec struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Request     interface{} `json:"request,omitempty"`
	Response    interface{} `json:"response,omitempty"`
}

// GetAnalyticsAPISpec - Generate API specification for analytics endpoints
func GetAnalyticsAPISpec() AnalyticsAPISpec {
	return AnalyticsAPISpec{
		Version:     "2.0",
		Title:       "Advanced Bulk Analytics API",
		Description: "Enterprise-grade analytics API for domain validation campaigns with advanced intelligence capabilities",
		Endpoints: []AnalyticsEndpointSpec{
			{
				Path:        "/api/v1/bulk/analytics/advanced",
				Method:      "POST",
				Summary:     "Advanced Bulk Analytics",
				Description: "Generate comprehensive analytics with enterprise intelligence capabilities including performance KPIs, stealth analytics, resource analysis, and predictive insights",
				RequestBody: &RequestBodySpec{
					Required:    true,
					ContentType: "application/json",
					Schema:      "AdvancedBulkAnalyticsRequest",
					Description: "Advanced analytics request with campaign IDs, metrics, and analysis configuration",
				},
				Responses: map[string]ResponseSpec{
					"200": {
						Description: "Advanced analytics generated successfully",
						ContentType: "application/json",
						Schema:      "AdvancedBulkAnalyticsResponse",
					},
					"400": {
						Description: "Invalid request parameters",
						ContentType: "application/json",
						Schema:      "ErrorResponse",
					},
					"500": {
						Description: "Analytics generation failed",
						ContentType: "application/json",
						Schema:      "ErrorResponse",
					},
				},
			},
			{
				Path:        "/api/v1/bulk/analytics/kpi",
				Method:      "POST",
				Summary:     "Performance KPI Analysis",
				Description: "Generate detailed performance KPIs including operational, business, technical, and user experience metrics",
				RequestBody: &RequestBodySpec{
					Required:    true,
					ContentType: "application/json",
					Schema:      "AdvancedBulkAnalyticsRequest",
					Description: "KPI analysis request",
				},
				Responses: map[string]ResponseSpec{
					"200": {
						Description: "KPI analysis completed successfully",
						ContentType: "application/json",
						Schema:      "PerformanceKPIResponse",
					},
				},
			},
			{
				Path:        "/api/v1/bulk/analytics/stealth",
				Method:      "POST",
				Summary:     "Stealth Analytics",
				Description: "Analyze stealth operation effectiveness, detection risks, and anonymity metrics",
				RequestBody: &RequestBodySpec{
					Required:    true,
					ContentType: "application/json",
					Schema:      "AdvancedBulkAnalyticsRequest",
					Description: "Stealth analysis request",
				},
				Responses: map[string]ResponseSpec{
					"200": {
						Description: "Stealth analysis completed successfully",
						ContentType: "application/json",
						Schema:      "StealthAnalyticsResponse",
					},
					"206": {
						Description: "Analysis completed with high detection risk warnings",
						ContentType: "application/json",
						Schema:      "StealthAnalyticsResponse",
					},
				},
			},
			{
				Path:        "/api/v1/bulk/analytics/resources",
				Method:      "POST",
				Summary:     "Resource Analytics",
				Description: "Analyze resource utilization, capacity planning, and optimization opportunities",
				RequestBody: &RequestBodySpec{
					Required:    true,
					ContentType: "application/json",
					Schema:      "AdvancedBulkAnalyticsRequest",
					Description: "Resource analysis request",
				},
				Responses: map[string]ResponseSpec{
					"200": {
						Description: "Resource analysis completed successfully",
						ContentType: "application/json",
						Schema:      "ResourceAnalyticsResponse",
					},
				},
			},
			{
				Path:        "/api/v1/bulk/analytics/comparative",
				Method:      "POST",
				Summary:     "Comparative Analytics",
				Description: "Compare current performance against baselines, benchmarks, and historical data",
				RequestBody: &RequestBodySpec{
					Required:    true,
					ContentType: "application/json",
					Schema:      "AdvancedBulkAnalyticsRequest",
					Description: "Comparative analysis request with baseline configuration",
				},
				Responses: map[string]ResponseSpec{
					"200": {
						Description: "Comparative analysis completed successfully",
						ContentType: "application/json",
						Schema:      "ComparativeAnalyticsResponse",
					},
				},
			},
			{
				Path:        "/api/v1/bulk/analytics/predictive",
				Method:      "POST",
				Summary:     "Predictive Analytics",
				Description: "Generate predictive insights, forecasts, and scenario analysis",
				RequestBody: &RequestBodySpec{
					Required:    true,
					ContentType: "application/json",
					Schema:      "AdvancedBulkAnalyticsRequest",
					Description: "Predictive analysis request with prediction horizon",
				},
				Responses: map[string]ResponseSpec{
					"200": {
						Description: "Predictive analysis completed successfully",
						ContentType: "application/json",
						Schema:      "PredictiveAnalyticsResponse",
					},
				},
			},
			{
				Path:        "/api/v1/bulk/analytics/export",
				Method:      "POST",
				Summary:     "Export Analytics",
				Description: "Export analytics data in various formats (JSON, CSV, Excel, PDF)",
				RequestBody: &RequestBodySpec{
					Required:    true,
					ContentType: "application/json",
					Schema:      "AdvancedBulkAnalyticsRequest",
					Description: "Export request with format specification",
				},
				Responses: map[string]ResponseSpec{
					"200": {
						Description: "Export generated successfully",
						ContentType: "application/json",
						Schema:      "ExportResponse",
					},
				},
			},
			{
				Path:        "/api/v1/bulk/analytics/visualization/{campaignId}",
				Method:      "GET",
				Summary:     "Visualization Data",
				Description: "Get data prepared for visualization components",
				Parameters: []ParameterSpec{
					{
						Name:        "campaignId",
						In:          "path",
						Required:    true,
						Type:        "string",
						Description: "Campaign UUID",
					},
					{
						Name:        "chartType",
						In:          "query",
						Required:    false,
						Type:        "string",
						Description: "Chart type (line, bar, pie, scatter, heatmap, radar)",
					},
					{
						Name:        "timeRange",
						In:          "query",
						Required:    false,
						Type:        "string",
						Description: "Time range (1h, 24h, 7d, 30d)",
					},
					{
						Name:        "granularity",
						In:          "query",
						Required:    false,
						Type:        "string",
						Description: "Data granularity (minute, hour, day)",
					},
				},
				Responses: map[string]ResponseSpec{
					"200": {
						Description: "Visualization data generated successfully",
						ContentType: "application/json",
						Schema:      "VisualizationResponse",
					},
				},
			},
			{
				Path:        "/api/v1/bulk/analytics/alerts",
				Method:      "GET",
				Summary:     "Analytics Alerts",
				Description: "Get active analytics alerts with optional filtering",
				Parameters: []ParameterSpec{
					{
						Name:        "severity",
						In:          "query",
						Required:    false,
						Type:        "string",
						Description: "Alert severity filter (low, medium, high, critical)",
					},
					{
						Name:        "limit",
						In:          "query",
						Required:    false,
						Type:        "integer",
						Description: "Maximum number of alerts to return (default: 100)",
					},
				},
				Responses: map[string]ResponseSpec{
					"200": {
						Description: "Alerts retrieved successfully",
						ContentType: "application/json",
						Schema:      "AlertsResponse",
					},
				},
			},
		},
	}
}

// GetAnalyticsDocumentation - Generate HTML documentation for analytics API
func GetAnalyticsDocumentation() string {
	spec := GetAnalyticsAPISpec()

	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <title>%s</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .endpoint { border: 1px solid #ddd; margin: 20px 0; padding: 20px; }
        .method { padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; }
        .post { background-color: #49cc90; }
        .get { background-color: #61affe; }
        pre { background-color: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>%s</h1>
    <p>%s</p>
    <p><strong>Version:</strong> %s</p>
`, spec.Title, spec.Title, spec.Description, spec.Version)

	for _, endpoint := range spec.Endpoints {
		methodClass := strings.ToLower(endpoint.Method)
		html += fmt.Sprintf(`
    <div class="endpoint">
        <h2><span class="method %s">%s</span> %s</h2>
        <p><strong>Summary:</strong> %s</p>
        <p>%s</p>
`, methodClass, endpoint.Method, endpoint.Path, endpoint.Summary, endpoint.Description)

		if len(endpoint.Parameters) > 0 {
			html += "<h3>Parameters</h3><ul>"
			for _, param := range endpoint.Parameters {
				html += fmt.Sprintf("<li><strong>%s</strong> (%s, %s): %s</li>",
					param.Name, param.In, param.Type, param.Description)
			}
			html += "</ul>"
		}

		if endpoint.RequestBody != nil {
			html += fmt.Sprintf(`
        <h3>Request Body</h3>
        <p>%s</p>
        <p><strong>Content-Type:</strong> %s</p>
        <p><strong>Schema:</strong> %s</p>
`, endpoint.RequestBody.Description, endpoint.RequestBody.ContentType, endpoint.RequestBody.Schema)
		}

		html += "<h3>Responses</h3><ul>"
		for code, response := range endpoint.Responses {
			html += fmt.Sprintf("<li><strong>%s:</strong> %s</li>", code, response.Description)
		}
		html += "</ul></div>"
	}

	html += "</body></html>"
	return html
}
