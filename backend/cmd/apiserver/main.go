package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"

	"github.com/fntelecomllc/studio/backend/internal/api"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/middleware"
)

func main() {
	log.Println("Starting DomainFlow API Server...")

	// Load configuration with environment overrides
	appConfig, err := config.LoadWithEnv("config.json")
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Build database connection string
	var dbConnectionString string
	if appConfig.Server.DatabaseConfig != nil {
		db := appConfig.Server.DatabaseConfig
		dbConnectionString = fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
			db.User, db.Password, db.Host, db.Port, db.Name, db.SSLMode)
	} else {
		// Fallback to .db_connection file
		if data, err := os.ReadFile(".db_connection"); err == nil {
			dbConnectionString = string(data)
		} else {
			log.Fatalf("No database configuration found")
		}
	}

	log.Printf("Connecting to database...")

	// Connect to database
	database, err := sqlx.Connect("postgres", dbConnectionString)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Test database connection
	if err := database.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Successfully connected to PostgreSQL database.")

	// Set Gin mode
	gin.SetMode(appConfig.Server.GinMode)
	router := gin.Default()

	// Basic security middleware
	securityMiddleware := middleware.NewSecurityMiddleware()
	router.Use(securityMiddleware.SecurityHeaders())
	router.Use(securityMiddleware.EnhancedCORS())

	// Public routes
	router.GET("/ping", api.PingHandlerGin)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		// Test database connection for health check
		if err := database.Ping(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "unhealthy",
				"message": "Database connection failed",
				"error":   err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"message":   "API server is running with database",
		})
	})

	// OpenAPI specification
	router.StaticFile("/api/openapi.yaml", "docs/openapi.yaml")

	log.Println("API routes registered successfully.")

	// Start server
	port := appConfig.Server.Port
	if envPort := os.Getenv("PORT"); envPort != "" {
		port = envPort
	}

	server := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Server starting on port %s", port)
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
