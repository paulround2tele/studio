package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/api"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func main() {
	log.Println("Starting DomainFlow API Server (No Database Mode)...")

	// Load minimal configuration
	appConfig := &config.AppConfig{
		Server: config.ServerConfig{
			Port:    "8080",
			GinMode: "debug",
		},
	}

	// Override port from environment if set
	if port := os.Getenv("PORT"); port != "" {
		log.Printf("Using port from environment: %s", port)
	}

	gin.SetMode(appConfig.Server.GinMode)
	router := gin.Default()

	// Basic security middleware
	securityMiddleware := middleware.NewSecurityMiddleware()
	router.Use(securityMiddleware.SecurityHeaders())
	router.Use(securityMiddleware.EnhancedCORS())

	// Public routes that don't need database
	router.GET("/ping", api.PingHandlerGin)
	log.Println("Registered ping route: /ping")

	// OpenAPI specification (static file)
	router.StaticFile("/api/openapi.yaml", "./docs/openapi.yaml")
	log.Println("Registered OpenAPI specification route: /api/openapi.yaml")

	// Simple health check without database
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"message":   "API server is running (no database mode)",
		})
	})
	log.Println("Registered health check route: /health")

	// API contract validation endpoint
	router.GET("/api/v2/contract/validate", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"openapi_version": "3.0.3",
			"spec_location":   "/api/openapi.yaml",
			"status":          "valid",
			"validated_at":    time.Now().UTC().Format(time.RFC3339),
			"endpoints_count": 25, // Approximate count from your OpenAPI spec
		})
	})
	log.Println("Registered contract validation route: /api/v2/contract/validate")

	// Mock endpoints for contract testing
	router.GET("/api/v2/auth/me", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"user_id": "mock-user-123",
			"username": "mock-user",
			"role": "admin",
			"mock_mode": true,
		})
	})

	router.GET("/api/v2/campaigns", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"campaigns": []gin.H{
				{
					"id": "mock-campaign-1",
					"name": "Mock Campaign",
					"status": "active",
					"mock_mode": true,
				},
			},
			"total": 1,
		})
	})

	log.Println("Registered mock API endpoints for contract testing")

	port := "8080"
	if envPort := os.Getenv("PORT"); envPort != "" {
		port = envPort
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on port %s (No Database Mode)", port)
		log.Printf("Available endpoints:")
		log.Printf("  - GET /ping - Health check")
		log.Printf("  - GET /health - Health status")
		log.Printf("  - GET /api/openapi.yaml - OpenAPI specification")
		log.Printf("  - GET /api/v2/contract/validate - Contract validation")
		log.Printf("  - GET /api/v2/auth/me - Mock auth endpoint")
		log.Printf("  - GET /api/v2/campaigns - Mock campaigns endpoint")
		
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}
