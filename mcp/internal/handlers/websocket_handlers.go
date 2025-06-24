package handlers

import (
	"mcp/internal/analyzer"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetWebSocketEndpoints handles the request for listing WebSocket endpoints.
func GetWebSocketEndpoints(c *gin.Context) {
	endpoints, err := analyzer.ParseWebSocketEndpoints("backend/internal/api")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, endpoints)
}

// GetWebSocketHandlers handles the request for listing WebSocket handlers.
func GetWebSocketHandlers(c *gin.Context) {
	handlers, err := analyzer.ParseWebSocketHandlers("backend/internal/websocket")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, handlers)
}

// GetWebSocketMessages handles the request for listing WebSocket messages.
func GetWebSocketMessages(c *gin.Context) {
	messages, err := analyzer.ParseWebSocketMessages("backend/internal/websocket")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, messages)
}