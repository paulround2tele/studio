// File: backend/internal/api/ping_handler.go
package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// PingHandlerGin responds to ping requests to check server health using Gin.
// @Summary Ping server
// @Description Simple ping endpoint to verify server is responding
// @Tags health
// @Produce json
// @Success 200 {object} PingResponse "Pong response with timestamp"
// @Router /ping [get]
func PingHandlerGin(c *gin.Context) {
	pingResponse := PingResponse{
		Message:   "pong",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	respondWithJSONGin(c, http.StatusOK, pingResponse)
}
