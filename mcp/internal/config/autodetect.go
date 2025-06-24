package config

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
)

// DatabaseConfig represents database configuration
type DatabaseConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	Name     string `json:"name"`   // backend config uses "name" not "dbname"
	DBName   string `json:"dbname"` // fallback for other configs
	SSLMode  string `json:"sslmode"`
}

// BackendConfig represents the backend configuration structure
type BackendConfig struct {
	Database DatabaseConfig `json:"database"`
}

// AutoDetectDatabaseConfig automatically detects database configuration from config files
func AutoDetectDatabaseConfig(projectRoot string) (string, error) {
	log.Printf("[INFO] Auto-detecting database configuration from project root: %s", projectRoot)

	// Try different config file locations and formats
	configFiles := []string{
		filepath.Join(projectRoot, "backend", "config.json"),
		filepath.Join(projectRoot, "backend", "config.template.json"),
		filepath.Join(projectRoot, "config.json"),
		filepath.Join(projectRoot, "config", "database.json"),
	}

	for _, configFile := range configFiles {
		if dbURL, err := tryConfigFile(configFile); err == nil && dbURL != "" {
			log.Printf("[INFO] Found database config in: %s", configFile)
			return dbURL, nil
		}
	}

	// If no config found, return empty string (will use default)
	log.Printf("[WARN] No database configuration found in config files")
	return "", fmt.Errorf("no database configuration found")
}

// tryConfigFile attempts to read database config from a specific file
func tryConfigFile(configFile string) (string, error) {
	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		return "", err
	}

	data, err := os.ReadFile(configFile)
	if err != nil {
		return "", err
	}

	var config BackendConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return "", err
	}

	// Build PostgreSQL connection string
	dbURL := buildDatabaseURL(config.Database)
	if dbURL == "" {
		return "", fmt.Errorf("incomplete database configuration")
	}

	return dbURL, nil
}

// buildDatabaseURL constructs a PostgreSQL connection string from config
func buildDatabaseURL(db DatabaseConfig) string {
	// Determine the database name (prefer "name" over "dbname")
	dbName := db.Name
	if dbName == "" {
		dbName = db.DBName
	}

	if db.Host == "" || db.User == "" || dbName == "" {
		return ""
	}

	// Set defaults
	port := db.Port
	if port == 0 {
		port = 5432
	}

	sslMode := db.SSLMode
	if sslMode == "" {
		sslMode = "disable"
	}

	// Build connection string
	dbURL := fmt.Sprintf("postgres://%s", db.User)
	if db.Password != "" {
		dbURL += ":" + db.Password
	}
	dbURL += fmt.Sprintf("@%s:%d/%s?sslmode=%s", db.Host, port, dbName, sslMode)

	return dbURL
}

// FindProjectRoot finds the project root directory by looking for markers
func FindProjectRoot(startDir string) string {
	dir := startDir
	for {
		// Look for project markers
		markers := []string{"go.mod", ".git", "backend", "package.json"}
		for _, marker := range markers {
			if _, err := os.Stat(filepath.Join(dir, marker)); err == nil {
				return dir
			}
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			// Reached root directory
			break
		}
		dir = parent
	}

	// Default to current directory if no markers found
	return startDir
}
