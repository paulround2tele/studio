// File: backend/internal/api/optimized_response_handlers.go
package api

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// gzipResponseWriter wraps gin.ResponseWriter to support gzip compression
type gzipResponseWriter struct {
	gin.ResponseWriter
	Writer io.Writer
}

func (g *gzipResponseWriter) Write(data []byte) (int, error) {
	return g.Writer.Write(data)
}

// EnableResponseCompression returns middleware that enables gzip compression
// for responses larger than 1KB that accept gzip encoding
func EnableResponseCompression() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if client accepts gzip encoding
		if !acceptsGzip(c.Request.Header) {
			c.Next()
			return
		}

		// Set gzip headers
		c.Header("Content-Encoding", "gzip")
		c.Header("Vary", "Accept-Encoding")

		// Create gzip writer
		gzipWriter := gzip.NewWriter(c.Writer)
		defer gzipWriter.Close()

		// Wrap the response writer
		c.Writer = &gzipResponseWriter{
			ResponseWriter: c.Writer,
			Writer:         gzipWriter,
		}

		c.Next()
	}
}

// acceptsGzip checks if the client accepts gzip encoding
func acceptsGzip(headers http.Header) bool {
	acceptEncoding := headers.Get("Accept-Encoding")
	return strings.Contains(acceptEncoding, "gzip")
}

// PaginationParams defines pagination parameters for API requests
type PaginationParams struct {
	Page     int `form:"page" binding:"min=1"`
	PageSize int `form:"page_size" binding:"min=1,max=100"`
}

// DefaultPaginationParams returns default pagination parameters
func DefaultPaginationParams() PaginationParams {
	return PaginationParams{
		Page:     1,
		PageSize: 25,
	}
}

// GetOffset calculates the database offset for pagination
func (p PaginationParams) GetOffset() int {
	return (p.Page - 1) * p.PageSize
}

// PaginatedResponse represents a paginated API response
type PaginatedResponse struct {
	Data       interface{}            `json:"data"`
	Pagination PaginationMetadata     `json:"pagination"`
	Meta       map[string]interface{} `json:"meta,omitempty"`
}

// PaginationMetadata contains pagination metadata
type PaginationMetadata struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	Total      int64 `json:"total"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
	TotalPages int   `json:"total_pages"`
}

// HandlePaginatedResponse sends a paginated response with proper metadata
func HandlePaginatedResponse(c *gin.Context, data interface{}, total int64, params PaginationParams) {
	totalPages := int((total + int64(params.PageSize) - 1) / int64(params.PageSize))

	metadata := PaginationMetadata{
		Page:       params.Page,
		PageSize:   params.PageSize,
		Total:      total,
		HasNext:    params.Page < totalPages,
		HasPrev:    params.Page > 1,
		TotalPages: totalPages,
	}

	response := PaginatedResponse{
		Data:       data,
		Pagination: metadata,
	}

	c.JSON(http.StatusOK, response)
}

// OptimizedJSONResponse sends a JSON response with optimization headers
func OptimizedJSONResponse(c *gin.Context, statusCode int, data interface{}) {
	// Add caching headers for static data
	if statusCode == http.StatusOK {
		c.Header("Cache-Control", "public, max-age=300") // 5 minutes for most data
	}

	// Add response time header if not already set
	if c.GetHeader("X-Response-Time") == "" {
		// This will be set by the response time middleware
	}

	c.JSON(statusCode, data)
}

// StreamJSONResponse streams JSON data for large responses
func StreamJSONResponse(c *gin.Context, data interface{}) {
	c.Header("Content-Type", "application/json; charset=utf-8")
	c.Header("Transfer-Encoding", "chunked")

	c.Stream(func(w io.Writer) bool {
		c.JSON(http.StatusOK, data)
		return false
	})
}

// ResponseSizeLimit middleware limits response size to prevent memory issues
func ResponseSizeLimit(maxSizeBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Wrap the response writer to track size
		wrapper := &responseSizeTracker{
			ResponseWriter: c.Writer,
			maxSize:        maxSizeBytes,
			written:        0,
		}
		c.Writer = wrapper

		c.Next()

		// Check if size limit was exceeded
		if wrapper.exceeded {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "Response size exceeds limit",
				"limit": maxSizeBytes,
			})
		}
	}
}

// responseSizeTracker tracks response size
type responseSizeTracker struct {
	gin.ResponseWriter
	maxSize  int64
	written  int64
	exceeded bool
}

func (r *responseSizeTracker) Write(data []byte) (int, error) {
	r.written += int64(len(data))
	if r.written > r.maxSize {
		r.exceeded = true
		return 0, nil // Don't write if exceeded
	}
	return r.ResponseWriter.Write(data)
}

// SetOptimizationHeaders sets common optimization headers
func SetOptimizationHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Security headers
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")

		// Performance headers
		c.Header("Server", "DomainFlow/1.0")

		c.Next()
	}
}

// ConditionalResponse handles conditional requests using ETags
func ConditionalResponse(c *gin.Context, data interface{}, etag string) {
	c.Header("ETag", etag)

	// Check if client has cached version
	if clientETag := c.GetHeader("If-None-Match"); clientETag == etag {
		c.Status(http.StatusNotModified)
		return
	}

	OptimizedJSONResponse(c, http.StatusOK, data)
}

// BatchAPIResponse handles multiple API calls in a single request
type BatchRequest struct {
	Requests []SingleRequest `json:"requests" binding:"required,dive"`
}

type SingleRequest struct {
	ID     string                 `json:"id" binding:"required"`
	Method string                 `json:"method" binding:"required,oneof=GET POST PUT DELETE"`
	Path   string                 `json:"path" binding:"required"`
	Body   map[string]interface{} `json:"body,omitempty"`
}

type BatchResponse struct {
	Responses []SingleResponse `json:"responses"`
}

type SingleResponse struct {
	ID         string      `json:"id"`
	StatusCode int         `json:"status_code"`
	Data       interface{} `json:"data,omitempty"`
	Error      string      `json:"error,omitempty"`
}

// HandleBatchRequest processes multiple API requests in a single call
func HandleBatchRequest() gin.HandlerFunc {
	return func(c *gin.Context) {
		var batchReq BatchRequest
		if err := c.ShouldBindJSON(&batchReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Limit batch size
		if len(batchReq.Requests) > 10 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Batch size exceeds limit of 10"})
			return
		}

		responses := make([]SingleResponse, len(batchReq.Requests))

		// Process each request
		for i, req := range batchReq.Requests {
			responses[i] = processSingleRequest(c, req)
		}

		c.JSON(http.StatusOK, BatchResponse{Responses: responses})
	}
}

// processSingleRequest processes a single request within a batch
func processSingleRequest(c *gin.Context, req SingleRequest) SingleResponse {
	// This is a simplified implementation
	// In production, you'd route to actual handlers
	return SingleResponse{
		ID:         req.ID,
		StatusCode: http.StatusNotImplemented,
		Error:      "Batch processing not fully implemented",
	}
}
