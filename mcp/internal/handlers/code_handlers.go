package handlers

import (
	"mcp/internal/analyzer"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetModels handles the request to get the Go models.
func GetModels(c *gin.Context) {
	// In a real application, the path to the models would be configurable.
	models, err := analyzer.ParseGoFiles("backend/internal/models")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, models)
}

// GetRoutes handles the request to get the API routes.
func GetRoutes(c *gin.Context) {
	routes, err := analyzer.ParseGinRoutes("backend/cmd/apiserver/main.go")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, routes)
}

// GetHandlers handles the request to get the API handlers.
func GetHandlers(c *gin.Context) {
	handlers, err := analyzer.ParseHandlers("backend/internal/api")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, handlers)
}

// GetServices handles the request to get the service definitions.
func GetServices(c *gin.Context) {
	services, err := analyzer.ParseServices("backend/internal/services")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, services)
}

// GetInterfaces handles the request to get the Go interfaces.
func GetInterfaces(c *gin.Context) {
	interfaces, err := analyzer.GetInterfaces("backend")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, interfaces)
}

// FindImplementations handles the request to find implementations of an interface.
func FindImplementations(c *gin.Context) {
	interfaceName := c.Query("interface")
	if interfaceName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "interface query parameter is required"})
		return
	}

	implementations, err := analyzer.FindImplementations("backend", interfaceName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, implementations)
}

// GetCallGraph handles the request to get the call graph of a function.
func GetCallGraph(c *gin.Context) {
	functionName := c.Query("function")
	if functionName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "function query parameter is required"})
		return
	}

	callGraph, err := analyzer.GetCallGraph("backend", functionName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, callGraph)
}