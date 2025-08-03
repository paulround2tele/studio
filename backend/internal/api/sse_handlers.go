// File: backend/internal/api/sse_handlers.go
package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/middleware"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SSEHandler handles Server-Sent Events endpoints
type SSEHandler struct {
	sseService *services.SSEService
}

// NewSSEHandler creates a new SSE handler
func NewSSEHandler(sseService *services.SSEService) *SSEHandler {
	return &SSEHandler{
		sseService: sseService,
	}
}

// RegisterSSERoutes registers SSE endpoints
func (h *SSEHandler) RegisterSSERoutes(group *gin.RouterGroup, authMiddleware *middleware.CachedAuthMiddleware) {
	// SSE endpoint for general campaign events
	group.GET("/events", h.streamEvents)

	// SSE endpoint for specific campaign events
	group.GET("/campaigns/:campaignId/events", h.streamCampaignEvents)

	// Debug endpoints for monitoring
	group.GET("/events/stats", h.getSSEStats)
}

// streamEvents establishes SSE connection for general events
// @Summary Stream campaign events via SSE
// @Description Establish Server-Sent Events connection for real-time campaign updates
// @Tags sse
// @ID streamEvents
// @Produce text/event-stream
// @Success 200 {string} string "SSE event stream"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /sse/events [get]
func (h *SSEHandler) streamEvents(c *gin.Context) {
	// Get user ID from auth middleware
	userID, exists := c.Get("user_id")
	if !exists {
		respondWithDetailedErrorGin(c, http.StatusUnauthorized, ErrorCodeUnauthorized,
			"User authentication required", nil)
		return
	}

	// Register SSE client for general events (no specific campaign)
	client, err := h.sseService.RegisterClient(c.Request.Context(), c.Writer, userID.(uuid.UUID), nil)
	if err != nil {
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
			"Failed to establish SSE connection", []ErrorDetail{
				{
					Code:    ErrorCodeInternalServer,
					Message: err.Error(),
				},
			})
		return
	}

	// Block until client disconnects
	<-client.Context.Done()
}

// streamCampaignEvents establishes SSE connection for specific campaign events
// @Summary Stream specific campaign events via SSE
// @Description Establish Server-Sent Events connection for real-time updates on a specific campaign
// @Tags sse
// @ID streamCampaignEvents
// @Produce text/event-stream
// @Param campaignId path string true "Campaign ID (UUID)"
// @Success 200 {string} string "SSE event stream"
// @Failure 400 {object} ErrorResponse "Bad Request"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Failure 500 {object} ErrorResponse "Internal Server Error"
// @Router /sse/campaigns/{campaignId}/events [get]
func (h *SSEHandler) streamCampaignEvents(c *gin.Context) {
	// Get user ID from auth middleware
	userID, exists := c.Get("user_id")
	if !exists {
		respondWithDetailedErrorGin(c, http.StatusUnauthorized, ErrorCodeUnauthorized,
			"User authentication required", nil)
		return
	}

	// Parse campaign ID
	campaignIDStr := c.Param("campaignId")
	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		respondWithDetailedErrorGin(c, http.StatusBadRequest, ErrorCodeValidation,
			"Invalid campaign ID format", []ErrorDetail{
				{
					Field:   "campaignId",
					Code:    ErrorCodeValidation,
					Message: "Campaign ID must be a valid UUID",
				},
			})
		return
	}

	// Register SSE client for specific campaign events
	client, err := h.sseService.RegisterClient(c.Request.Context(), c.Writer, userID.(uuid.UUID), &campaignID)
	if err != nil {
		respondWithDetailedErrorGin(c, http.StatusInternalServerError, ErrorCodeInternalServer,
			"Failed to establish SSE connection", []ErrorDetail{
				{
					Code:    ErrorCodeInternalServer,
					Message: err.Error(),
				},
			})
		return
	}

	// Block until client disconnects
	<-client.Context.Done()
}

// getSSEStats returns SSE connection statistics
// @Summary Get SSE connection statistics
// @Description Get statistics about active SSE connections
// @Tags sse
// @ID getSSEStats
// @Produce json
// @Success 200 {object} APIResponse "SSE statistics"
// @Failure 401 {object} ErrorResponse "Unauthorized"
// @Router /sse/events/stats [get]
func (h *SSEHandler) getSSEStats(c *gin.Context) {
	// Get user ID from auth middleware
	userID, exists := c.Get("user_id")
	if !exists {
		respondWithDetailedErrorGin(c, http.StatusUnauthorized, ErrorCodeUnauthorized,
			"User authentication required", nil)
		return
	}

	stats := map[string]interface{}{
		"total_clients": h.sseService.GetClientCount(),
		"user_clients":  h.sseService.GetClientsForUser(userID.(uuid.UUID)),
		"server_time":   strconv.FormatInt(time.Now().Unix(), 10),
	}

	response := NewSuccessResponse(stats, getRequestID(c))
	respondWithJSONGin(c, http.StatusOK, response)
}
