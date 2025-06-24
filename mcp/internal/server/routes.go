package server

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"mcp/internal/config"
	"mcp/internal/models"
)

func (s *Server) routes() {
	s.Router.GET("/tools/get_database_schema", func(c *gin.Context) {
		tables, err := s.Bridge.GetDatabaseSchema()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, tables)
	})
	// TODO: All other handlers need to be refactored to use the Bridge as well.
	// For now, keeping them as is to avoid introducing more errors.
	// s.Router.GET("/tools/get_models", handlers.GetModels)
	// s.Router.GET("/tools/get_routes", handlers.GetRoutes)
	// s.Router.GET("/tools/get_endpoints", handlers.GetRoutes) // Alias for get_routes
	// s.Router.GET("/tools/get_dependencies", handlers.GetDependencies)
	// s.Router.GET("/tools/get_handlers", handlers.GetHandlers)
	// s.Router.GET("/tools/get_services", handlers.GetServices)
	// s.Router.GET("/tools/get_config", handlers.GetConfig)
	// s.Router.GET("/tools/get_middleware", handlers.GetMiddleware)
	// s.Router.GET("/tools/get_websocket_endpoints", handlers.GetWebSocketEndpoints)
	// s.Router.GET("/tools/get_websocket_handlers", handlers.GetWebSocketHandlers)
	// s.Router.GET("/tools/get_websocket_messages", handlers.GetWebSocketMessages)
	// s.Router.GET("/tools/get_interfaces", handlers.GetInterfaces)
	// s.Router.GET("/tools/find_implementations", handlers.FindImplementations)
	// s.Router.GET("/tools/get_call_graph", handlers.GetCallGraph)
	// s.Router.GET("/tools/search_code", handlers.SearchCode)
	// s.Router.GET("/tools/get_package_structure", handlers.GetPackageStructure)
	// s.Router.GET("/tools/get_env_vars", handlers.GetEnvVars)
	// s.Router.GET("/tools/get_middleware_usage", handlers.GetMiddlewareUsage)
	// s.Router.GET("/tools/get_workflows", handlers.GetWorkflows)
	// s.Router.GET("/tools/get_business_rules", handlers.GetBusinessRules)
	// s.Router.GET("/tools/get_feature_flags", handlers.GetFeatureFlags)
	// s.Router.GET("/tools/find_by_type", handlers.FindByType)

	// Advanced & Interactive Tools
	// s.Router.POST("/tools/get_references", handlers.GetReferencesHandler)
	// s.Router.GET("/tools/get_change_impact", handlers.GetChangeImpactHandler)
	// s.Router.POST("/tools/snapshot", handlers.SnapshotHandler)
	// s.Router.GET("/tools/contract_drift_check", handlers.ContractDriftCheckHandler)
	// s.Router.POST("/tools/run_terminal_command", handlers.RunTerminalCommandHandler)

	s.Router.POST("/tools/apply_code_change", func(c *gin.Context) {
		if !config.Flags.AllowMutation {
			c.JSON(http.StatusForbidden, gin.H{"error": "Code mutation is disabled."})
			return
		}

		var req models.ApplyCodeChangeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		stdout, stderr, err := s.Bridge.ApplyCodeChange(req.Diff)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":  err.Error(),
				"stdout": stdout,
				"stderr": stderr,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Patch applied successfully",
			"stdout":  stdout,
		})
	})

	// Add an initialization endpoint for VS Code extensions
	s.Router.POST("/initialize", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "MCP server initialized successfully"})
	})
}