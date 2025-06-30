package config

import (
	"github.com/getkin/kin-openapi/openapi3"
)

// AddConfigPaths adds config-related paths to the OpenAPI specification
func AddConfigPaths(spec *openapi3.T) {
	addConfigSchemas(spec)
	addGetFeatureFlagsPath(spec)
	addUpdateFeatureFlagsPath(spec)
	addDNSConfigPaths(spec)
	addHTTPConfigPaths(spec)
	addLoggingConfigPaths(spec)
	addWorkerConfigPaths(spec)
	addRateLimiterConfigPaths(spec)
	addProxyManagerConfigPaths(spec)
	addServerConfigPaths(spec)
	addAuthConfigPaths(spec)
}

// addGetFeatureFlagsPath adds the get feature flags endpoint
func addGetFeatureFlagsPath(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getFeatureFlags",
		Summary:     "Get feature flags",
		Description: "Returns current feature flag settings",
		Tags:        []string{"Config"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}

	getOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Feature flags retrieved successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/FeatureFlags",
				},
			},
		},
	})

	getOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	getOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	spec.Paths.Set("/config/features", &openapi3.PathItem{
		Get: getOp,
	})
}

// addUpdateFeatureFlagsPath adds the update feature flags endpoint
func addUpdateFeatureFlagsPath(spec *openapi3.T) {
	updateOp := &openapi3.Operation{
		OperationID: "updateFeatureFlags",
		Summary:     "Update feature flags",
		Description: "Updates feature flag settings",
		Tags:        []string{"Config"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{
							Ref: "#/components/schemas/FeatureFlags",
						},
					},
				},
			},
		},
	}

	updateOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Feature flags updated successfully"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/FeatureFlags",
				},
			},
		},
	})

	updateOp.AddResponse(400, &openapi3.Response{
		Description: &[]string{"Bad request"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	updateOp.AddResponse(401, &openapi3.Response{
		Description: &[]string{"Unauthorized"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	updateOp.AddResponse(500, &openapi3.Response{
		Description: &[]string{"Internal server error"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{
					Ref: "#/components/schemas/ErrorResponse",
				},
			},
		},
	})

	if spec.Paths.Find("/config/features") == nil {
		spec.Paths.Set("/config/features", &openapi3.PathItem{})
	}
	spec.Paths.Find("/config/features").Post = updateOp
}

// addConfigSchemas adds config-related schemas
func addConfigSchemas(spec *openapi3.T) {
	// FeatureFlags schema
	spec.Components.Schemas["FeatureFlags"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Feature flag settings",
			Properties: map[string]*openapi3.SchemaRef{
				"enableRealTimeUpdates": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable real-time updates feature",
					},
				},
				"enableOfflineMode": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable offline mode feature",
					},
				},
				"enableAnalytics": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable analytics feature",
					},
				},
				"enableDebugMode": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable debug mode feature",
					},
				},
			},
		},
	}

	// DNSConfig schema - based on DNSValidatorConfigJSON
	spec.Components.Schemas["DNSConfig"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "DNS validator configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"resolvers": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"array"},
						Description: "DNS resolver IP addresses",
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{
								Type:   &openapi3.Types{"string"},
								Format: "ipv4",
							},
						},
					},
				},
				"useSystemResolvers": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Use system DNS resolvers",
					},
				},
				"queryTimeoutSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "DNS query timeout in seconds",
						Min:         &[]float64{1}[0],
						Max:         &[]float64{60}[0],
					},
				},
				"maxDomainsPerRequest": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum domains per request",
						Min:         &[]float64{1}[0],
						Max:         &[]float64{1000}[0],
					},
				},
				"resolverStrategy": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Strategy for selecting DNS resolvers",
						Enum:        []interface{}{"round_robin", "random", "weighted", "priority"},
					},
				},
				"resolversWeighted": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"object"},
						Description: "Weighted resolver configuration",
						AdditionalProperties: openapi3.AdditionalProperties{
							Schema: &openapi3.SchemaRef{
								Value: &openapi3.Schema{Type: &openapi3.Types{"integer"}},
							},
						},
					},
				},
				"resolversPreferredOrder": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"array"},
						Description: "Preferred order of resolvers",
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{Type: &openapi3.Types{"string"}},
						},
					},
				},
				"concurrentQueriesPerDomain": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Concurrent queries per domain",
						Min:         &[]float64{1}[0],
						Max:         &[]float64{10}[0],
					},
				},
				"queryDelayMinMs": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Minimum query delay in milliseconds",
						Min:         &[]float64{0}[0],
						Max:         &[]float64{5000}[0],
					},
				},
				"queryDelayMaxMs": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum query delay in milliseconds",
						Min:         &[]float64{0}[0],
						Max:         &[]float64{10000}[0],
					},
				},
				"maxConcurrentGoroutines": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum concurrent goroutines",
						Min:         &[]float64{1}[0],
						Max:         &[]float64{1000}[0],
					},
				},
				"rateLimitDps": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"number"},
						Description: "Rate limit in queries per second",
						Min:         &[]float64{0}[0],
					},
				},
				"rateLimitBurst": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Rate limit burst capacity",
						Min:         &[]float64{1}[0],
					},
				},
			},
		},
	}

	// HTTPConfig schema - based on HTTPValidatorConfigJSON
	spec.Components.Schemas["HTTPConfig"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "HTTP validator configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"defaultUserAgent": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Default User-Agent string for HTTP requests",
					},
				},
				"userAgents": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"array"},
						Description: "List of User-Agent strings to rotate through",
						Items: &openapi3.SchemaRef{
							Value: &openapi3.Schema{Type: &openapi3.Types{"string"}},
						},
					},
				},
				"defaultHeaders": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"object"},
						Description: "Default HTTP headers",
						AdditionalProperties: openapi3.AdditionalProperties{
							Schema: &openapi3.SchemaRef{
								Value: &openapi3.Schema{Type: &openapi3.Types{"string"}},
							},
						},
					},
				},
				"requestTimeoutSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Request timeout in seconds",
						Min:         &[]float64{1}[0],
						Max:         &[]float64{300}[0],
					},
				},
				"maxRedirects": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum number of redirects to follow",
						Min:         &[]float64{0}[0],
						Max:         &[]float64{20}[0],
					},
				},
				"followRedirects": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether to follow HTTP redirects",
					},
				},
				"maxDomainsPerRequest": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum domains per request",
						Min:         &[]float64{1}[0],
						Max:         &[]float64{1000}[0],
					},
				},
				"allowInsecureTLS": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Allow insecure TLS connections",
					},
				},
				"maxConcurrentGoroutines": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum concurrent goroutines",
						Min:         &[]float64{1}[0],
						Max:         &[]float64{1000}[0],
					},
				},
				"rateLimitDps": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"number"},
						Description: "Rate limit in requests per second",
						Min:         &[]float64{0}[0],
					},
				},
				"rateLimitBurst": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Rate limit burst capacity",
						Min:         &[]float64{1}[0],
					},
				},
				"maxBodyReadBytes": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum bytes to read from response body",
						Format:      "int64",
						Min:         &[]float64{1024}[0],
					},
				},
			},
		},
	}

	// LoggingConfig schema
	spec.Components.Schemas["LoggingConfig"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Logging configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"level": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Log level",
						Enum:        []interface{}{"DEBUG", "INFO", "WARN", "ERROR"},
					},
				},
				"enableFileLogging": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable file-based logging",
					},
				},
				"logDirectory": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Directory for log files",
					},
				},
				"maxFileSize": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum log file size in MB",
						Min:         &[]float64{1}[0],
					},
				},
				"maxBackups": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum number of backup log files",
						Min:         &[]float64{0}[0],
					},
				},
				"maxAge": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum age of log files in days",
						Min:         &[]float64{0}[0],
					},
				},
				"enableJSONFormat": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable JSON log format",
					},
				},
				"enableRequestLogging": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable request logging",
					},
				},
				"enablePerformanceLogging": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Enable performance logging",
					},
				},
			},
		},
	}

	// WorkerConfig schema
	spec.Components.Schemas["WorkerConfig"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Worker configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"numWorkers": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of worker goroutines",
						Min:         &[]float64{1}[0],
						Max:         &[]float64{100}[0],
					},
				},
				"pollIntervalSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Polling interval in seconds",
						Min:         &[]float64{1}[0],
					},
				},
				"errorRetryDelaySeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Error retry delay in seconds",
						Min:         &[]float64{1}[0],
					},
				},
				"maxJobRetries": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum job retry attempts",
						Min:         &[]float64{0}[0],
					},
				},
				"jobProcessingTimeoutMinutes": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Job processing timeout in minutes",
						Min:         &[]float64{1}[0],
					},
				},
				"batchSize": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Batch size for processing",
						Min:         &[]float64{1}[0],
					},
				},
				"maxRetries": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum retry attempts",
						Min:         &[]float64{0}[0],
					},
				},
				"retryDelaySeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Retry delay in seconds",
						Min:         &[]float64{1}[0],
					},
				},
				"dnsSubtaskConcurrency": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "DNS subtask concurrency",
						Min:         &[]float64{1}[0],
					},
				},
				"httpKeywordSubtaskConcurrency": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "HTTP keyword subtask concurrency",
						Min:         &[]float64{1}[0],
					},
				},
			},
		},
	}

	// RateLimiterConfig schema
	spec.Components.Schemas["RateLimiterConfig"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Rate limiter configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"maxRequests": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum requests per window",
						Min:         &[]float64{1}[0],
					},
				},
				"windowSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Rate limit window in seconds",
						Min:         &[]float64{1}[0],
					},
				},
			},
			Required: []string{"maxRequests", "windowSeconds"},
		},
	}

	// ProxyManagerConfig schema - based on ProxyManagerConfigJSON
	spec.Components.Schemas["ProxyManagerConfig"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Proxy manager configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"testTimeoutSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Proxy test timeout in seconds",
						Min:         &[]float64{1}[0],
						Max:         &[]float64{300}[0],
					},
				},
				"testUrl": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "URL to use for proxy testing",
						Format:      "uri",
					},
				},
				"initialHealthCheckTimeoutSeconds": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Initial health check timeout in seconds",
						Min:         &[]float64{1}[0],
						Max:         &[]float64{300}[0],
					},
				},
				"maxConcurrentInitialChecks": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum concurrent initial health checks",
						Min:         &[]float64{1}[0],
					},
				},
			},
			Required: []string{"testTimeoutSeconds"},
		},
	}

	// ServerConfig schema
	spec.Components.Schemas["ServerConfig"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Server configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"port": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Server port",
						Pattern:     "^[0-9]+$",
					},
				},
				"streamChunkSize": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Stream chunk size in bytes",
						Min:         &[]float64{1024}[0],
					},
				},
				"ginMode": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Gin framework mode",
						Enum:        []interface{}{"debug", "release", "test"},
					},
				},
			},
		},
	}

	// AuthConfig schema
	spec.Components.Schemas["AuthConfig"] = &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"object"},
			Description: "Authentication configuration",
			Properties: map[string]*openapi3.SchemaRef{
				"bcryptCost": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "BCrypt cost factor for password hashing",
						Min:         &[]float64{4}[0],
						Max:         &[]float64{20}[0],
					},
				},
				"passwordMinLength": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Minimum password length requirement",
						Min:         &[]float64{8}[0],
					},
				},
				"sessionDuration": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Session duration (e.g., '120m')",
					},
				},
				"sessionIdleTimeout": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Session idle timeout (e.g., '30m')",
					},
				},
				"sessionCookieName": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Session cookie name",
					},
				},
				"sessionCookieDomain": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Session cookie domain",
					},
				},
				"sessionCookieSecure": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"boolean"},
						Description: "Whether session cookie requires HTTPS",
					},
				},
				"resetTokenExpiry": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Password reset token expiry (e.g., '15m')",
					},
				},
				"maxFailedAttempts": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum failed login attempts before lockout",
						Min:         &[]float64{1}[0],
					},
				},
				"accountLockDuration": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Account lock duration (e.g., '15m')",
					},
				},
				"rateLimitWindow": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Rate limit window (e.g., '15m')",
					},
				},
				"maxLoginAttempts": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum login attempts per rate limit window",
						Min:         &[]float64{1}[0],
					},
				},
				"maxPasswordResetAttempts": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Maximum password reset attempts per rate limit window",
						Min:         &[]float64{1}[0],
					},
				},
				"recaptchaSiteKey": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "reCAPTCHA site key",
					},
				},
				"captchaThreshold": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "Number of failed attempts before requiring CAPTCHA",
						Min:         &[]float64{1}[0],
					},
				},
				"smtpHost": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "SMTP server host",
					},
				},
				"smtpPort": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"integer"},
						Description: "SMTP server port",
						Min:         &[]float64{1}[0],
						Max:         &[]float64{65535}[0],
					},
				},
				"smtpUsername": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "SMTP username",
					},
				},
				"fromEmail": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "From email address for system emails",
						Format:      "email",
					},
				},
				"fromName": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "From name for system emails",
					},
				},
			},
		},
	}
}

// DNS Config paths
func addDNSConfigPaths(spec *openapi3.T) {
	// GET /api/v2/config/dns
	getOp := &openapi3.Operation{
		OperationID: "getDNSConfig",
		Summary:     "Get DNS configuration",
		Description: "Retrieves the default DNS validator configuration",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}
	getOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"DNS configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/DNSConfig"},
			},
		},
	})

	// POST /api/v2/config/dns
	postOp := &openapi3.Operation{
		OperationID: "updateDNSConfig",
		Summary:     "Update DNS configuration",
		Description: "Updates the default DNS validator configuration",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/DNSConfig"},
					},
				},
			},
		},
	}
	postOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Updated DNS configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/DNSConfig"},
			},
		},
	})

	spec.Paths.Set("/api/v2/config/dns", &openapi3.PathItem{
		Get:  getOp,
		Post: postOp,
	})
}

// HTTP Config paths
func addHTTPConfigPaths(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getHTTPConfig",
		Summary:     "Get HTTP configuration",
		Description: "Retrieves the default HTTP validator configuration",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}
	getOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"HTTP configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/HTTPConfig"},
			},
		},
	})

	postOp := &openapi3.Operation{
		OperationID: "updateHTTPConfig",
		Summary:     "Update HTTP configuration",
		Description: "Updates the default HTTP validator configuration",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/HTTPConfig"},
					},
				},
			},
		},
	}
	postOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Updated HTTP configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/HTTPConfig"},
			},
		},
	})

	spec.Paths.Set("/api/v2/config/http", &openapi3.PathItem{
		Get:  getOp,
		Post: postOp,
	})
}

// Logging Config paths
func addLoggingConfigPaths(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getLoggingConfig",
		Summary:     "Get logging configuration",
		Description: "Retrieves the current logging configuration",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}
	getOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Logging configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/LoggingConfig"},
			},
		},
	})

	postOp := &openapi3.Operation{
		OperationID: "updateLoggingConfig",
		Summary:     "Update logging configuration",
		Description: "Updates the logging configuration",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/LoggingConfig"},
					},
				},
			},
		},
	}
	postOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Updated logging configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/LoggingConfig"},
			},
		},
	})

	spec.Paths.Set("/api/v2/config/logging", &openapi3.PathItem{
		Get:  getOp,
		Post: postOp,
	})
}

// Worker Config paths
func addWorkerConfigPaths(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getWorkerConfig",
		Summary:     "Get worker configuration",
		Description: "Retrieves the worker configuration",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}
	getOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Worker configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/WorkerConfig"},
			},
		},
	})

	postOp := &openapi3.Operation{
		OperationID: "updateWorkerConfig",
		Summary:     "Update worker configuration",
		Description: "Updates the worker configuration",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/WorkerConfig"},
					},
				},
			},
		},
	}
	postOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Updated worker configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/WorkerConfig"},
			},
		},
	})

	spec.Paths.Set("/api/v2/config/worker", &openapi3.PathItem{
		Get:  getOp,
		Post: postOp,
	})
}

// Rate Limiter Config paths
func addRateLimiterConfigPaths(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getRateLimiterConfig",
		Summary:     "Get rate limiter configuration",
		Description: "Retrieves global rate limiter settings",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}
	getOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Rate limiter configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/RateLimiterConfig"},
			},
		},
	})

	postOp := &openapi3.Operation{
		OperationID: "updateRateLimiterConfig",
		Summary:     "Update rate limiter configuration",
		Description: "Updates global rate limiter settings",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/RateLimiterConfig"},
					},
				},
			},
		},
	}
	postOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Updated rate limiter configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/RateLimiterConfig"},
			},
		},
	})

	spec.Paths.Set("/api/v2/config/rate-limit", &openapi3.PathItem{
		Get:  getOp,
		Post: postOp,
	})
}

// Proxy Manager Config paths
func addProxyManagerConfigPaths(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getProxyManagerConfig",
		Summary:     "Get proxy manager configuration",
		Description: "Retrieves proxy manager settings",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}
	getOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Proxy manager configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/ProxyManagerConfig"},
			},
		},
	})

	postOp := &openapi3.Operation{
		OperationID: "updateProxyManagerConfig",
		Summary:     "Update proxy manager configuration",
		Description: "Updates proxy manager settings",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/ProxyManagerConfig"},
					},
				},
			},
		},
	}
	postOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Updated proxy manager configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/ProxyManagerConfig"},
			},
		},
	})

	spec.Paths.Set("/api/v2/config/proxy-manager", &openapi3.PathItem{
		Get:  getOp,
		Post: postOp,
	})
}

// Server Config paths
func addServerConfigPaths(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getServerConfig",
		Summary:     "Get server configuration",
		Description: "Retrieves current server-wide configurations",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}
	getOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Server configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/ServerConfig"},
			},
		},
	})

	putOp := &openapi3.Operation{
		OperationID: "updateServerConfig",
		Summary:     "Update server configuration",
		Description: "Updates server-wide configurations",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/ServerConfig"},
					},
				},
			},
		},
	}
	putOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Updated server configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/ServerConfig"},
			},
		},
	})

	spec.Paths.Set("/api/v2/config/server", &openapi3.PathItem{
		Get: getOp,
		Put: putOp,
	})
}

// Auth Config paths
func addAuthConfigPaths(spec *openapi3.T) {
	getOp := &openapi3.Operation{
		OperationID: "getAuthConfig",
		Summary:     "Get authentication configuration",
		Description: "Retrieves sanitized authentication configuration",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
	}
	getOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Authentication configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/AuthConfig"},
			},
		},
	})

	postOp := &openapi3.Operation{
		OperationID: "updateAuthConfig",
		Summary:     "Update authentication configuration",
		Description: "Updates authentication configuration",
		Tags:        []string{"Configuration"},
		Security: &openapi3.SecurityRequirements{
			{"sessionAuth": {}},
		},
		RequestBody: &openapi3.RequestBodyRef{
			Value: &openapi3.RequestBody{
				Required: true,
				Content: map[string]*openapi3.MediaType{
					"application/json": {
						Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/AuthConfig"},
					},
				},
			},
		},
	}
	postOp.AddResponse(200, &openapi3.Response{
		Description: &[]string{"Updated authentication configuration"}[0],
		Content: map[string]*openapi3.MediaType{
			"application/json": {
				Schema: &openapi3.SchemaRef{Ref: "#/components/schemas/AuthConfig"},
			},
		},
	})

	spec.Paths.Set("/api/v2/config/auth", &openapi3.PathItem{
		Get:  getOp,
		Post: postOp,
	})
}