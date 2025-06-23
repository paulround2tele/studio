package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/fntelecomllc/studio/mcp-server/internal/config"
	"github.com/fntelecomllc/studio/mcp-server/internal/server"
	"github.com/fntelecomllc/studio/mcp-server/pkg/bridge"
)

func main() {
	// Parse command line flags
	var (
		configFile  = flag.String("config", "", "Path to configuration file")
		backendPath = flag.String("backend-path", "", "Path to backend codebase for analysis")
		dbURL       = flag.String("db-url", "", "Database connection URL")
		port        = flag.Int("port", 8081, "Port to listen on")
		logLevel    = flag.String("log-level", "info", "Log level (debug, info, warn, error)")
		enableCORS  = flag.Bool("enable-cors", false, "Enable CORS headers")
		version     = flag.Bool("version", false, "Show version information")
	)
	flag.Parse()

	if *version {
		fmt.Println("MCP Server v1.0.0")
		fmt.Println("Model Context Protocol server for GitHub Copilot integration")
		os.Exit(0)
	}

	// Initialize configuration
	cfg, err := config.LoadConfig(&config.Options{
		ConfigFile:  *configFile,
		BackendPath: *backendPath,
		DatabaseURL: *dbURL,
		Port:        *port,
		LogLevel:    *logLevel,
		EnableCORS:  *enableCORS,
	})
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		log.Fatalf("Configuration validation failed: %v", err)
	}

	log.Printf("MCP Server starting with backend path: %s", cfg.BackendPath)
	log.Printf("Database URL: %s", maskDatabaseURL(cfg.DatabaseURL))
	log.Printf("Listening on port: %d", cfg.Port)

	// Create bridge for safe public API access
	mcpBridge, err := bridge.NewMCPBridge(cfg)
	if err != nil {
		log.Fatalf("Failed to create MCP bridge: %v", err)
	}

	// Initialize MCP server
	mcpServer, err := server.NewMCPServer(cfg, mcpBridge)
	if err != nil {
		log.Fatalf("Failed to create MCP server: %v", err)
	}

	// Setup HTTP server with proper timeouts
	mux := http.NewServeMux()
	
	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{
			"status":    "ok",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"version":   "1.0.0",
		})
	})

	// MCP JSON-RPC endpoint
	mux.HandleFunc("/mcp", func(w http.ResponseWriter, r *http.Request) {
		if cfg.EnableCORS {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		mcpServer.HandleRequest(w, r)
	})

	// Create HTTP server with appropriate timeouts
	httpServer := &http.Server{
		Addr:           fmt.Sprintf(":%d", cfg.Port),
		Handler:        mux,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   60 * time.Second,
		IdleTimeout:    120 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1MB
	}

	// Setup graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start server in goroutine
	go func() {
		log.Printf("MCP Server listening on :%d", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down MCP Server...")

	// Graceful shutdown with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(ctx, 30*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP server shutdown error: %v", err)
	}

	// Cleanup bridge resources
	if err := mcpBridge.Close(); err != nil {
		log.Printf("Bridge cleanup error: %v", err)
	}

	log.Println("MCP Server stopped")
}

// maskDatabaseURL masks sensitive information in database URL for logging
func maskDatabaseURL(dbURL string) string {
	if dbURL == "" {
		return "<not set>"
	}
	
	// Simple masking - hide password if present
	if strings.Contains(dbURL, "@") {
		parts := strings.Split(dbURL, "@")
		if len(parts) >= 2 {
			// Find the part with credentials
			beforeAt := parts[0]
			afterAt := strings.Join(parts[1:], "@")
			
			if strings.Contains(beforeAt, "://") {
				schemeParts := strings.Split(beforeAt, "://")
				if len(schemeParts) == 2 && strings.Contains(schemeParts[1], ":") {
					return schemeParts[0] + "://***:***@" + afterAt
				}
			}
		}
	}
	
	return dbURL
}