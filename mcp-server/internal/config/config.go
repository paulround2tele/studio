package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Config represents the MCP server configuration
type Config struct {
	// Server configuration
	Port       int    `json:"port"`
	LogLevel   string `json:"log_level"`
	EnableCORS bool   `json:"enable_cors"`

	// Backend analysis configuration
	BackendPath string `json:"backend_path"`
	DatabaseURL string `json:"database_url"`

	// Analysis settings
	Analysis AnalysisConfig `json:"analysis"`

	// Tool configuration
	Tools ToolsConfig `json:"tools"`

	// Security settings
	Security SecurityConfig `json:"security"`
}

// AnalysisConfig contains settings for code analysis
type AnalysisConfig struct {
	// Enable various analysis types
	EnableASTAnalysis       bool `json:"enable_ast_analysis"`
	EnableDatabaseAnalysis  bool `json:"enable_database_analysis"`
	EnableMiddlewareTracing bool `json:"enable_middleware_tracing"`
	EnableDependencyGraph   bool `json:"enable_dependency_graph"`

	// Performance settings
	MaxConcurrentAnalysis int `json:"max_concurrent_analysis"`
	CacheTimeout          int `json:"cache_timeout_seconds"`
	MaxFileSize           int `json:"max_file_size_mb"`

	// Paths to analyze
	IncludePaths []string `json:"include_paths"`
	ExcludePaths []string `json:"exclude_paths"`
}

// ToolsConfig contains settings for MCP tools
type ToolsConfig struct {
	// Schema tools
	EnableSchemaTools bool `json:"enable_schema_tools"`
	
	// API tools
	EnableAPITools bool `json:"enable_api_tools"`
	
	// Service tools
	EnableServiceTools bool `json:"enable_service_tools"`
	
	// Business logic tools
	EnableBusinessLogicTools bool `json:"enable_business_logic_tools"`
	
	// Configuration tools
	EnableConfigurationTools bool `json:"enable_configuration_tools"`
	
	// Navigation tools
	EnableNavigationTools bool `json:"enable_navigation_tools"`
}

// SecurityConfig contains security-related settings
type SecurityConfig struct {
	// Rate limiting
	EnableRateLimit   bool `json:"enable_rate_limit"`
	RequestsPerMinute int  `json:"requests_per_minute"`

	// Request size limits
	MaxRequestSize int `json:"max_request_size_mb"`

	// Allowed origins for CORS
	AllowedOrigins []string `json:"allowed_origins"`
}

// Options for loading configuration
type Options struct {
	ConfigFile  string
	BackendPath string
	DatabaseURL string
	Port        int
	LogLevel    string
	EnableCORS  bool
}

// LoadConfig loads configuration from file and CLI options
func LoadConfig(opts *Options) (*Config, error) {
	// Start with defaults
	cfg := DefaultConfig()

	// Load from config file if specified
	if opts.ConfigFile != "" {
		if err := cfg.LoadFromFile(opts.ConfigFile); err != nil {
			return nil, fmt.Errorf("failed to load config file: %w", err)
		}
	}

	// Load from .copilot/config.json if it exists
	copilotConfigPath := filepath.Join(".", ".copilot", "config.json")
	if _, err := os.Stat(copilotConfigPath); err == nil {
		if err := cfg.LoadCopilotConfig(copilotConfigPath); err != nil {
			return nil, fmt.Errorf("failed to load .copilot/config.json: %w", err)
		}
	}

	// Override with CLI options
	cfg.ApplyOptions(opts)

	// Override with environment variables
	cfg.ApplyEnvironmentVariables()

	return cfg, nil
}

// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	return &Config{
		Port:       8081,
		LogLevel:   "info",
		EnableCORS: false,
		
		BackendPath: "./backend",
		DatabaseURL: "",

		Analysis: AnalysisConfig{
			EnableASTAnalysis:       true,
			EnableDatabaseAnalysis:  true,
			EnableMiddlewareTracing: true,
			EnableDependencyGraph:   true,
			MaxConcurrentAnalysis:   4,
			CacheTimeout:            300, // 5 minutes
			MaxFileSize:             10,  // 10MB
			IncludePaths:            []string{"cmd", "internal", "pkg"},
			ExcludePaths:            []string{"vendor", ".git", "node_modules", "dist", "bin"},
		},

		Tools: ToolsConfig{
			EnableSchemaTools:        true,
			EnableAPITools:          true,
			EnableServiceTools:      true,
			EnableBusinessLogicTools: true,
			EnableConfigurationTools: true,
			EnableNavigationTools:   true,
		},

		Security: SecurityConfig{
			EnableRateLimit:   true,
			RequestsPerMinute: 60,
			MaxRequestSize:    10, // 10MB
			AllowedOrigins:    []string{"*"},
		},
	}
}

// LoadFromFile loads configuration from a JSON file
func (c *Config) LoadFromFile(filename string) error {
	data, err := os.ReadFile(filename)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, c)
}

// LoadCopilotConfig loads MCP-specific configuration from .copilot/config.json
func (c *Config) LoadCopilotConfig(filename string) error {
	data, err := os.ReadFile(filename)
	if err != nil {
		return err
	}

	var copilotConfig map[string]interface{}
	if err := json.Unmarshal(data, &copilotConfig); err != nil {
		return err
	}

	// Look for MCP server configuration
	if mcpConfig, exists := copilotConfig["mcp_server"]; exists {
		if mcpData, ok := mcpConfig.(map[string]interface{}); ok {
			mcpJSON, _ := json.Marshal(mcpData)
			return json.Unmarshal(mcpJSON, c)
		}
	}

	return nil
}

// ApplyOptions applies CLI options to configuration
func (c *Config) ApplyOptions(opts *Options) {
	if opts.Port > 0 {
		c.Port = opts.Port
	}
	if opts.LogLevel != "" {
		c.LogLevel = opts.LogLevel
	}
	if opts.BackendPath != "" {
		c.BackendPath = opts.BackendPath
	}
	if opts.DatabaseURL != "" {
		c.DatabaseURL = opts.DatabaseURL
	}
	c.EnableCORS = opts.EnableCORS
}

// ApplyEnvironmentVariables applies environment variable overrides
func (c *Config) ApplyEnvironmentVariables() {
	if port := os.Getenv("MCP_SERVER_PORT"); port != "" {
		if p, err := strconv.Atoi(port); err == nil {
			c.Port = p
		}
	}
	
	if logLevel := os.Getenv("MCP_SERVER_LOG_LEVEL"); logLevel != "" {
		c.LogLevel = logLevel
	}
	
	if backendPath := os.Getenv("MCP_SERVER_BACKEND_PATH"); backendPath != "" {
		c.BackendPath = backendPath
	}
	
	if dbURL := os.Getenv("MCP_SERVER_DATABASE_URL"); dbURL != "" {
		c.DatabaseURL = dbURL
	}
	
	if cors := os.Getenv("MCP_SERVER_ENABLE_CORS"); cors != "" {
		c.EnableCORS = strings.ToLower(cors) == "true"
	}
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if c.Port <= 0 || c.Port > 65535 {
		return fmt.Errorf("invalid port: %d", c.Port)
	}

	if c.BackendPath == "" {
		return fmt.Errorf("backend path is required")
	}

	if _, err := os.Stat(c.BackendPath); os.IsNotExist(err) {
		return fmt.Errorf("backend path does not exist: %s", c.BackendPath)
	}

	validLogLevels := map[string]bool{
		"debug": true, "info": true, "warn": true, "error": true,
	}
	if !validLogLevels[c.LogLevel] {
		return fmt.Errorf("invalid log level: %s", c.LogLevel)
	}

	if c.Analysis.MaxConcurrentAnalysis <= 0 {
		return fmt.Errorf("max concurrent analysis must be positive")
	}

	if c.Security.MaxRequestSize <= 0 {
		return fmt.Errorf("max request size must be positive")
	}

	return nil
}

// SaveToFile saves the configuration to a JSON file
func (c *Config) SaveToFile(filename string) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filename, data, 0644)
}