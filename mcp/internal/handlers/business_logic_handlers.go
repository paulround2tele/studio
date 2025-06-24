package handlers

import (
	"mcp/internal/analyzer"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetMiddlewareUsage finds all routes that use a given middleware.
func GetMiddlewareUsage(c *gin.Context) {
	middlewareName := c.Query("name")
	if middlewareName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "middleware name is required"})
		return
	}
	// This is a placeholder. A real implementation would require parsing route definitions
	// and associating them with middleware.
	c.JSON(http.StatusOK, gin.H{"message": "not implemented yet"})
}

// GetWorkflows identifies and lists potential business workflows.
func GetWorkflows(c *gin.Context) {
	dirPath := c.DefaultQuery("path", "/home/vboxuser/studio/backend")
	workflows, err := analyzer.AnalyzeWorkflows(dirPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, workflows)
}

// GetBusinessRules lists functions that appear to contain business rules.
func GetBusinessRules(c *gin.Context) {
	dirPath := c.DefaultQuery("path", "/home/vboxuser/studio/backend")
	rules, err := analyzer.AnalyzeBusinessRules(dirPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rules)
}

// GetFeatureFlags lists all identified feature flags.
func GetFeatureFlags(c *gin.Context) {
	dirPath := c.DefaultQuery("path", "/home/vboxuser/studio/backend")
	flags, err := analyzer.AnalyzeFeatureFlags(dirPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, flags)
}

// FindByType finds all variables or instances of a specific Go type.
func FindByType(c *gin.Context) {
	typeName := c.Query("type")
	if typeName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type name is required"})
		return
	}
	dirPath := c.DefaultQuery("path", "/home/vboxuser/studio/backend")
	instances, err := analyzer.FindByType(dirPath, typeName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, instances)
}