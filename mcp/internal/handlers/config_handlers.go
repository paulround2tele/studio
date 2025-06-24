package handlers

import (
	"mcp/internal/analyzer"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetConfig returns the application's configuration structure.
func GetConfig(c *gin.Context) {
	configPath := "backend/internal/config"
	config, err := analyzer.ParseConfig(configPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse config: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, config)
}

// GetMiddleware returns a list of all identified middleware functions.
func GetMiddleware(c *gin.Context) {
	middlewarePath := "backend/internal/middleware"
	middleware, err := analyzer.ParseMiddleware(middlewarePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse middleware: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, middleware)
}