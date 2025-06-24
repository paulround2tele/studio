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
	// The MCP server should look for the studio project root
	projectRoot := findStudioProjectRoot(cwd)
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

	// Create just the Bridge with the correct backend path
	backendPath := filepath.Join(projectRoot, "backend")
	bridge := server.NewBridge(db, backendPath)

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

// findStudioProjectRoot finds the studio project root directory
func findStudioProjectRoot(startDir string) string {
	// Look for markers that indicate the studio project root
	markers := []string{"backend/config.json", "package.json", "README.md", "go.mod"}

	// Start from current directory and walk up
	dir := startDir
	for {
		// Check if this directory contains studio project markers
		for _, marker := range markers {
			if _, err := os.Stat(filepath.Join(dir, marker)); err == nil {
				// Found a marker, check if this looks like the studio root
				if _, err := os.Stat(filepath.Join(dir, "backend")); err == nil {
					return dir
				}
			}
		}

		// Go up one directory
		parent := filepath.Dir(dir)
		if parent == dir {
			// Reached filesystem root
			break
		}
		dir = parent
	}

	// If no studio root found, try some common paths
	commonPaths := []string{
		"/home/vboxuser/studio",
		filepath.Join(startDir, "studio"),
		filepath.Join(filepath.Dir(startDir), "studio"),
	}

	for _, path := range commonPaths {
		if _, err := os.Stat(filepath.Join(path, "backend/config.json")); err == nil {
			return path
		}
	}

	// Default fallback
	return startDir
}
