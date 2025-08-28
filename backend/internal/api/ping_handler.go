//go:build legacy_gin
// +build legacy_gin

// File: backend/internal/api/ping_handler.go
package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// PingHandlerGin responds to ping requests to check server health using Gin.
func PingHandlerGin(c *gin.Context) {
	pingResponse := PingResponse{
		Message:   "pong",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	respondWithJSONGin(c, http.StatusOK, pingResponse)
}
