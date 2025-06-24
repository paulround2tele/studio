package handlers

import (
	"mcp/internal/analyzer"
	"mcp/internal/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

// SearchCode handles the request to search for a pattern in the codebase.
func SearchCode(c *gin.Context) {
	pattern := c.Query("pattern")
	if pattern == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "pattern query parameter is required"})
		return
	}

	results, err := utils.SearchFiles("backend", pattern)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, results)
}

func GetPackageStructure(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		path = "backend" // Default to backend directory
	}

	structure, err := analyzer.GetPackageStructure(path)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, structure)
}

func GetDependencies(c *gin.Context) {
	dependencies, err := analyzer.ParseGoModDependencies("backend/go.mod")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dependencies)
}

func GetEnvVars(c *gin.Context) {
	// This is a simple implementation that searches for `os.Getenv`.
	// A more robust solution would involve static analysis to trace the usage of environment variables.
	results, err := utils.SearchFiles("backend/internal/config", `os\.Getenv|godotenv\.`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, results)
}
