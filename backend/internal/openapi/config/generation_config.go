package config

// GenerationConfig holds configuration for OpenAPI generation
type GenerationConfig struct {
	// PackagePaths are the Go package paths to scan for handlers
	PackagePaths []string `json:"package_paths"`
	
	// OutputFormat specifies the output format: "yaml", "json", or "both"
	OutputFormat string `json:"output_format"`
	
	// OutputPath is the base path for output files
	OutputPath string `json:"output_path"`
	
	// IncludeInternal determines whether to include internal endpoints
	IncludeInternal bool `json:"include_internal"`
	
	// StrictValidation enables strict OpenAPI validation
	StrictValidation bool `json:"strict_validation"`
	
	// VerboseLogging enables detailed logging during generation
	VerboseLogging bool `json:"verbose_logging"`
	
	// APIInfo contains basic API information
	APIInfo APIInfo `json:"api_info"`
	
	// SecuritySchemes defines authentication schemes
	SecuritySchemes map[string]SecurityScheme `json:"security_schemes"`
	
	// ServerConfig defines server URL configuration
	ServerConfig ServerConfig `json:"server_config"`
}

// ServerConfig holds server URL configuration for OpenAPI spec
type ServerConfig struct {
	// BaseURL is the primary server URL (can be environment variable name or actual URL)
	BaseURL string `json:"base_url"`
	
	// FallbackURLs are additional server URLs for different environments
	FallbackURLs []ServerURL `json:"fallback_urls"`
	
	// EnableEnvironmentDetection enables automatic detection of NEXT_PUBLIC_API_URL
	EnableEnvironmentDetection bool `json:"enable_environment_detection"`
}

// ServerURL represents an OpenAPI server URL configuration
type ServerURL struct {
	URL         string `json:"url"`
	Description string `json:"description"`
}

// APIInfo contains basic API metadata
type APIInfo struct {
	Title       string `json:"title"`
	Version     string `json:"version"`
	Description string `json:"description"`
	Contact     ContactInfo `json:"contact,omitempty"`
	License     LicenseInfo `json:"license,omitempty"`
}

// ContactInfo contains API contact information
type ContactInfo struct {
	Name  string `json:"name,omitempty"`
	URL   string `json:"url,omitempty"`
	Email string `json:"email,omitempty"`
}

// LicenseInfo contains API license information
type LicenseInfo struct {
	Name string `json:"name"`
	URL  string `json:"url,omitempty"`
}

// SecurityScheme defines an authentication scheme
type SecurityScheme struct {
	Type         string `json:"type"`
	Scheme       string `json:"scheme,omitempty"`
	BearerFormat string `json:"bearer_format,omitempty"`
	Description  string `json:"description,omitempty"`
	In           string `json:"in,omitempty"`           // For apiKey type: query, header, or cookie
	Name         string `json:"name,omitempty"`         // For apiKey type: name of the parameter
}

// RouteDiscoveryConfig controls route discovery behavior
type RouteDiscoveryConfig struct {
	// IncludePatterns are regex patterns for routes to include
	IncludePatterns []string `json:"include_patterns"`
	
	// ExcludePatterns are regex patterns for routes to exclude
	ExcludePatterns []string `json:"exclude_patterns"`
	
	// HandlerFunctionPatterns are patterns to identify handler functions
	HandlerFunctionPatterns []string `json:"handler_function_patterns"`
}

// SchemaGenerationConfig controls schema generation behavior
type SchemaGenerationConfig struct {
	// MaxDepth limits recursion depth for nested types
	MaxDepth int `json:"max_depth"`
	
	// IgnoreUnexportedFields determines whether to skip unexported struct fields
	IgnoreUnexportedFields bool `json:"ignore_unexported_fields"`
	
	// UseJSONTags determines whether to use JSON tags for field names
	UseJSONTags bool `json:"use_json_tags"`
	
	// GenerateExamples determines whether to generate example values
	GenerateExamples bool `json:"generate_examples"`
}