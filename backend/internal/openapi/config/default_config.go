package config

// DefaultConfig returns the default configuration for OpenAPI generation
func DefaultConfig() *GenerationConfig {
	return &GenerationConfig{
		PackagePaths: []string{
			"./internal/api",
			"./internal/models",
		},
		OutputFormat:     "both",
		OutputPath:       "docs",
		IncludeInternal:  false,
		StrictValidation: true,
		VerboseLogging:   false,
		APIInfo: APIInfo{
			Title:       "Studio API",
			Version:     "1.0.0",
			Description: "Studio API for managing campaigns, personas, proxies, and keyword sets",
			Contact: ContactInfo{
				Name: "Studio API Team",
			},
		},
		SecuritySchemes: map[string]SecurityScheme{
			"sessionAuth": {
				Type:        "apiKey",
				In:          "cookie",
				Name:        "session",
				Description: "Session-based authentication",
			},
			"bearerAuth": {
				Type:         "http",
				Scheme:       "bearer",
				BearerFormat: "JWT",
				Description:  "JWT Bearer token authentication",
			},
		},
		ServerConfig: ServerConfig{
			BaseURL: "NEXT_PUBLIC_API_URL", // Environment variable name
			FallbackURLs: []ServerURL{
				{
					URL:         "http://localhost:8080/api/v2",
					Description: "Development server",
				},
				{
					URL:         "https://api.domainflow.com/api/v2",
					Description: "Production server",
				},
			},
			EnableEnvironmentDetection: true,
		},
	}
}

// DefaultRouteDiscoveryConfig returns default route discovery configuration
func DefaultRouteDiscoveryConfig() *RouteDiscoveryConfig {
	return &RouteDiscoveryConfig{
		IncludePatterns: []string{
			`^/api/.*`,
			`^/auth/.*`,
		},
		ExcludePatterns: []string{
			`.*/middleware/.*`,
			`.*/internal/store/.*`,
			`.*/internal/utils/.*`,
			`.*/internal/config/.*`,
			`.*test.*`,
		},
		HandlerFunctionPatterns: []string{
			`.*Gin$`,
			`.*Handler$`,
			`.*Endpoint$`,
		},
	}
}

// DefaultSchemaGenerationConfig returns default schema generation configuration
func DefaultSchemaGenerationConfig() *SchemaGenerationConfig {
	return &SchemaGenerationConfig{
		MaxDepth:               10,
		IgnoreUnexportedFields: true,
		UseJSONTags:            true,
		GenerateExamples:       false,
	}
}

// CLIConfig returns configuration optimized for CLI usage
func CLIConfig(outputPath, format string, verbose bool) *GenerationConfig {
	config := DefaultConfig()
	config.OutputPath = outputPath
	config.OutputFormat = format
	config.VerboseLogging = verbose
	return config
}
