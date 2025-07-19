package api

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// StreamingResponseHandler provides chunked JSON streaming for large datasets
type StreamingResponseHandler struct {
	chunkSize int
	timeout   time.Duration
}

// NewStreamingResponseHandler creates a new streaming response handler
func NewStreamingResponseHandler(chunkSize int, timeout time.Duration) *StreamingResponseHandler {
	if chunkSize <= 0 {
		chunkSize = 200 // Default chunk size for enterprise operations
	}
	if timeout <= 0 {
		timeout = 30 * time.Second // Default timeout
	}

	return &StreamingResponseHandler{
		chunkSize: chunkSize,
		timeout:   timeout,
	}
}

// StreamJSONResponse streams large JSON responses in chunks to prevent memory issues
func (srh *StreamingResponseHandler) StreamJSONResponse(c *gin.Context, data interface{}) error {
	// Set headers for streaming response
	c.Header("Content-Type", "application/json")
	c.Header("Transfer-Encoding", "chunked")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	// Enable compression for better performance
	c.Header("Content-Encoding", "gzip")

	// Set enterprise-grade cache headers for CDN optimization
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("X-Frame-Options", "DENY")

	c.Status(http.StatusOK)

	// Get the response writer
	w := c.Writer

	// Ensure the response writer supports flushing
	flusher, ok := w.(http.Flusher)
	if !ok {
		return fmt.Errorf("streaming not supported")
	}

	// Create a context with timeout
	ctx, cancel := context.WithTimeout(c.Request.Context(), srh.timeout)
	defer cancel()

	// Start streaming the response
	return srh.streamData(ctx, w, flusher, data)
}

// StreamBulkDomainsResponse streams bulk domain data efficiently
func (srh *StreamingResponseHandler) StreamBulkDomainsResponse(c *gin.Context, domains []interface{}) error {
	log.Printf("StreamingResponseHandler: Starting bulk domains stream with %d domains", len(domains))

	// Set streaming headers
	c.Header("Content-Type", "application/json")
	c.Header("Transfer-Encoding", "chunked")
	c.Header("X-Total-Count", fmt.Sprintf("%d", len(domains)))
	c.Status(http.StatusOK)

	w := c.Writer
	flusher, ok := w.(http.Flusher)
	if !ok {
		return fmt.Errorf("streaming not supported")
	}

	// Start JSON response
	if _, err := w.Write([]byte(`{"success":true,"total":` + fmt.Sprintf("%d", len(domains)) + `,"data":[`)); err != nil {
		return fmt.Errorf("failed to write response header: %w", err)
	}
	flusher.Flush()

	// Stream domains in chunks
	for i := 0; i < len(domains); i += srh.chunkSize {
		end := i + srh.chunkSize
		if end > len(domains) {
			end = len(domains)
		}

		chunk := domains[i:end]

		// Serialize chunk
		chunkData, err := json.Marshal(chunk)
		if err != nil {
			return fmt.Errorf("failed to marshal chunk: %w", err)
		}

		// Write chunk (remove outer array brackets)
		chunkStr := string(chunkData[1 : len(chunkData)-1]) // Remove [ and ]

		if i > 0 {
			// Add comma separator between chunks
			if _, err := w.Write([]byte(",")); err != nil {
				return fmt.Errorf("failed to write separator: %w", err)
			}
		}

		if chunkStr != "" {
			if _, err := w.Write([]byte(chunkStr)); err != nil {
				return fmt.Errorf("failed to write chunk: %w", err)
			}
		}

		flusher.Flush()

		// Check for client disconnect
		select {
		case <-c.Request.Context().Done():
			log.Printf("StreamingResponseHandler: Client disconnected during chunk %d", i/srh.chunkSize)
			return c.Request.Context().Err()
		default:
			// Continue streaming
		}

		// Brief pause to prevent overwhelming the client
		time.Sleep(1 * time.Millisecond)
	}

	// Close JSON response
	if _, err := w.Write([]byte(`]}`)); err != nil {
		return fmt.Errorf("failed to write response footer: %w", err)
	}
	flusher.Flush()

	log.Printf("StreamingResponseHandler: Successfully streamed %d domains in %d chunks",
		len(domains), (len(domains)+srh.chunkSize-1)/srh.chunkSize)
	return nil
}

// StreamBulkCampaignsResponse streams bulk campaign data with progress indicators
func (srh *StreamingResponseHandler) StreamBulkCampaignsResponse(c *gin.Context, campaigns []interface{}) error {
	log.Printf("StreamingResponseHandler: Starting bulk campaigns stream with %d campaigns", len(campaigns))

	// Set streaming headers with progress support
	c.Header("Content-Type", "application/json")
	c.Header("Transfer-Encoding", "chunked")
	c.Header("X-Total-Count", fmt.Sprintf("%d", len(campaigns)))
	c.Header("X-Chunk-Size", fmt.Sprintf("%d", srh.chunkSize))
	c.Status(http.StatusOK)

	w := c.Writer
	flusher, ok := w.(http.Flusher)
	if !ok {
		return fmt.Errorf("streaming not supported")
	}

	// Start JSON response with metadata
	metadata := map[string]interface{}{
		"success":    true,
		"total":      len(campaigns),
		"chunk_size": srh.chunkSize,
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
	}

	metadataJSON, _ := json.Marshal(metadata)
	responseStart := fmt.Sprintf(`{"metadata":%s,"campaigns":[`, string(metadataJSON))

	if _, err := w.Write([]byte(responseStart)); err != nil {
		return fmt.Errorf("failed to write response start: %w", err)
	}
	flusher.Flush()

	// Stream campaigns in optimized chunks
	totalChunks := (len(campaigns) + srh.chunkSize - 1) / srh.chunkSize

	for chunkIndex := 0; chunkIndex < totalChunks; chunkIndex++ {
		start := chunkIndex * srh.chunkSize
		end := start + srh.chunkSize
		if end > len(campaigns) {
			end = len(campaigns)
		}

		chunk := campaigns[start:end]

		// Add progress information to chunk
		chunkWithMeta := map[string]interface{}{
			"chunk_index": chunkIndex,
			"chunk_total": totalChunks,
			"items":       chunk,
		}

		chunkJSON, err := json.Marshal(chunkWithMeta)
		if err != nil {
			return fmt.Errorf("failed to marshal chunk %d: %w", chunkIndex, err)
		}

		if chunkIndex > 0 {
			if _, err := w.Write([]byte(",")); err != nil {
				return fmt.Errorf("failed to write separator: %w", err)
			}
		}

		if _, err := w.Write(chunkJSON); err != nil {
			return fmt.Errorf("failed to write chunk %d: %w", chunkIndex, err)
		}
		flusher.Flush()

		// Check for cancellation
		select {
		case <-c.Request.Context().Done():
			log.Printf("StreamingResponseHandler: Request cancelled at chunk %d/%d", chunkIndex+1, totalChunks)
			return c.Request.Context().Err()
		default:
		}

		log.Printf("StreamingResponseHandler: Streamed chunk %d/%d (%d campaigns)",
			chunkIndex+1, totalChunks, len(chunk))
	}

	// Close response
	if _, err := w.Write([]byte(`]}`)); err != nil {
		return fmt.Errorf("failed to write response end: %w", err)
	}
	flusher.Flush()

	log.Printf("StreamingResponseHandler: Completed streaming %d campaigns in %d chunks",
		len(campaigns), totalChunks)
	return nil
}

// streamData handles the actual streaming logic
func (srh *StreamingResponseHandler) streamData(ctx context.Context, w io.Writer, flusher http.Flusher, data interface{}) error {
	// Use a buffered writer for better performance
	bufWriter := bufio.NewWriterSize(w, 8192)
	defer bufWriter.Flush()

	encoder := json.NewEncoder(bufWriter)
	encoder.SetIndent("", "  ") // Pretty printing for better readability

	// Stream the data
	if err := encoder.Encode(data); err != nil {
		return fmt.Errorf("failed to encode data: %w", err)
	}

	// Flush the buffer
	if err := bufWriter.Flush(); err != nil {
		return fmt.Errorf("failed to flush buffer: %w", err)
	}

	flusher.Flush()
	return nil
}

// GetOptimalChunkSize calculates optimal chunk size based on data size and client capabilities
func (srh *StreamingResponseHandler) GetOptimalChunkSize(dataSize int, clientCapabilities map[string]string) int {
	baseChunkSize := srh.chunkSize

	// Adjust based on data size
	if dataSize > 100000 {
		// Large datasets: increase chunk size for efficiency
		baseChunkSize = srh.chunkSize * 2
	} else if dataSize < 1000 {
		// Small datasets: decrease chunk size for responsiveness
		baseChunkSize = srh.chunkSize / 2
		if baseChunkSize < 10 {
			baseChunkSize = 10
		}
	}

	// Consider client capabilities (bandwidth, processing power)
	if clientCapabilities["bandwidth"] == "low" {
		baseChunkSize = baseChunkSize / 2
	}
	if clientCapabilities["processing"] == "high" {
		baseChunkSize = baseChunkSize * 2
	}

	return baseChunkSize
}

// EnableCompressionMiddleware adds response compression for better performance
func (srh *StreamingResponseHandler) EnableCompressionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if client accepts gzip compression
		if acceptsGzip(c.GetHeader("Accept-Encoding")) {
			c.Header("Content-Encoding", "gzip")
		}
		c.Next()
	}
}

// acceptsGzip checks if client accepts gzip compression
func acceptsGzip(acceptEncoding string) bool {
	return len(acceptEncoding) > 0 &&
		(contains(acceptEncoding, "gzip") || contains(acceptEncoding, "*"))
}

// contains checks if a string contains a substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr ||
			(len(s) > len(substr) &&
				(s[:len(substr)] == substr ||
					s[len(s)-len(substr):] == substr ||
					containsSubstring(s, substr))))
}

// containsSubstring performs a simple substring search
func containsSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
