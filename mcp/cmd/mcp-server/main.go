package main

import (
	"database/sql"
	"log"
	"mcp/internal/config"
	"mcp/internal/jsonrpc"
	"mcp/internal/server"
	"os"
	"path/filepath"

	_ "github.com/lib/pq"
)

func main() {
	// Initialize configuration from environment
	config.Flags.AllowTerminal = true
	config.Flags.AllowMutation = true

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		log.Fatalf("Failed to get current directory: %v", err)
	}

	// Find project root and auto-detect database configuration
	// Since this MCP server is in the /mcp subdirectory, we need to go up one level
	projectRoot := filepath.Dir(cwd)
	log.Printf("Looking for database config in project root: %s", projectRoot)

	dbURL, err := config.AutoDetectDatabaseConfig(projectRoot)
	if err != nil {
		log.Printf("Warning: Could not auto-detect database config: %v", err)
		// Try environment variable as fallback
		dbURL = os.Getenv("DB_CONNECTION")
		if dbURL == "" {
			log.Fatalf("No database configuration found. Please ensure backend/config.json exists or set DB_CONNECTION environment variable.")
		}
	}

	log.Printf("Using database URL from auto-detection: %s", maskPassword(dbURL))

	// Create database connection
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	// Create just the Bridge without the HTTP server
	bridge := server.NewBridge(db, cwd)

	// Create JSON-RPC server
	jsonrpcServer := jsonrpc.NewJSONRPCServer(bridge, os.Stdin, os.Stdout)

	// Start the JSON-RPC server
	if err := jsonrpcServer.Run(); err != nil {
		log.Fatalf("JSON-RPC server error: %v", err)
	}
}

// maskPassword masks the password in a database URL for logging
func maskPassword(dbURL string) string {
	// Simple password masking for logging
	if len(dbURL) == 0 {
		return ""
	}
	// For postgres://user:password@host:port/db, mask the password part
	return "postgres://[user]:[password]@[host]/[database]"
}
