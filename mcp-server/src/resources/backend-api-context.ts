/**
 * Backend API Context Provider
 * 
 * Provides comprehensive context about Go backend REST API endpoints,
 * request/response patterns, and API architecture patterns.
 */

export interface BackendAPIContext {
  // API Architecture Overview
  apiArchitecture: {
    framework: "Gin (Go HTTP framework)";
    authentication: "Session-based authentication with fingerprinting";
    authorization: "Role-based access control (RBAC)";
    middleware: [
      "CORS", "RateLimiting", "Authentication", "Logging", 
      "RequestID", "Recovery", "Compression"
    ];
    responseFormat: "JSON with consistent error handling";
    apiVersion: "v1";
    baseUrl: "/api/v1";
  };

  // API Endpoint Categories
  endpointCategories: {
    authentication: {
      basePath: "/auth";
      endpoints: [
        "POST /login", "POST /logout", "POST /register",
        "GET /session", "POST /refresh", "DELETE /session"
      ];
      features: ["session_management", "fingerprinting", "rate_limiting"];
    };

    campaigns: {
      basePath: "/campaigns";
      endpoints: [
        "GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id",
        "POST /:id/start", "POST /:id/pause", "POST /:id/resume",
        "GET /:id/status", "GET /:id/results", "GET /:id/logs"
      ];
      features: ["CRUD_operations", "state_management", "real_time_status"];
    };

    personas: {
      basePath: "/personas";
      endpoints: [
        "GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id",
        "POST /:id/test", "GET /:id/stats", "POST /bulk"
      ];
      features: ["DNS_and_HTTP_personas", "validation", "bulk_operations"];
    };

    keywordSets: {
      basePath: "/keyword-sets";
      endpoints: [
        "GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id",
        "POST /:id/test", "GET /:id/validate"
      ];
      features: ["rule_validation", "testing", "import_export"];
    };

    proxies: {
      basePath: "/proxies";
      endpoints: [
        "GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id",
        "POST /:id/test", "GET /:id/health", "POST /bulk"
      ];
      features: ["health_checks", "rotation_strategies", "bulk_management"];
    };

    users: {
      basePath: "/users";
      endpoints: [
        "GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id",
        "PUT /:id/password", "PUT /:id/roles", "GET /:id/sessions"
      ];
      features: ["user_management", "role_assignment", "session_tracking"];
    };

    health: {
      basePath: "/health";
      endpoints: [
        "GET /", "GET /ready", "GET /live", "GET /metrics"
      ];
      features: ["service_health", "readiness_probes", "metrics_export"];
    };
  };

  // Request/Response Patterns
  requestResponsePatterns: {
    standardHeaders: {
      required: ["Content-Type", "Accept"];
      authentication: ["Authorization", "X-Session-ID"];
      security: ["X-Request-ID", "X-Real-IP", "X-Forwarded-For"];
      fingerprinting: ["User-Agent", "X-Browser-Fingerprint"];
    };

    requestValidation: {
      jsonValidation: "Go struct tags with validate package";
      headerValidation: "Custom middleware for required headers";
      parameterValidation: "Gin binding with custom validators";
      businessRuleValidation: "Service layer validation";
    };

    responseStructure: {
      success: {
        data: "T"; // Generic type
        message?: "string";
        pagination?: "PaginationMeta";
      };
      error: {
        error: "string";
        code: "string";
        details?: "any";
        requestId: "string";
      };
      pagination: {
        page: "number";
        perPage: "number";
        total: "number";
        totalPages: "number";
      };
    };

    httpStatusCodes: {
      success: {
        200: "OK - Standard success";
        201: "Created - Resource created";
        202: "Accepted - Async operation started";
        204: "No Content - Successful deletion";
      };
      clientError: {
        400: "Bad Request - Validation errors";
        401: "Unauthorized - Authentication required";
        403: "Forbidden - Insufficient permissions";
        404: "Not Found - Resource not found";
        409: "Conflict - Resource conflict";
        422: "Unprocessable Entity - Business rule violation";
        429: "Too Many Requests - Rate limit exceeded";
      };
      serverError: {
        500: "Internal Server Error - Unexpected error";
        502: "Bad Gateway - External service error";
        503: "Service Unavailable - Temporary unavailability";
        504: "Gateway Timeout - External service timeout";
      };
    };
  };

  // API Endpoint Details
  endpointDetails: {
    // Campaign Management Endpoints
    "POST /api/v1/campaigns": {
      purpose: "Create new campaign";
      requestBody: {
        name: "string";
        description: "string";
        type: "domain_generation | dns_validation | http_keyword_validation";
        config: "CampaignConfig"; // Type varies by campaign type
        personas?: "UUID[]";
        keywordSets?: "UUID[]";
        proxies?: "UUID[]";
      };
      responseBody: {
        data: "Campaign";
        message: "Campaign created successfully";
      };
      validation: ["name_required", "type_required", "config_valid"];
      authorization: "campaigns:create";
    };

    "POST /api/v1/campaigns/:id/start": {
      purpose: "Start campaign execution";
      pathParams: { id: "UUID" };
      requestBody: { 
        force?: "boolean";
        skipValidation?: "boolean";
      };
      responseBody: {
        data: "CampaignJob";
        message: "Campaign started successfully";
      };
      preconditions: ["campaign_exists", "not_running", "valid_config"];
      authorization: "campaigns:execute";
    };

    "GET /api/v1/campaigns/:id/status": {
      purpose: "Get real-time campaign status";
      pathParams: { id: "UUID" };
      queryParams: {
        includeMetrics?: "boolean";
        includeLogs?: "boolean";
        fromTimestamp?: "timestamp";
      };
      responseBody: {
        data: "CampaignStatus";
        message: "Status retrieved successfully";
      };
      features: ["real_time_updates", "performance_metrics", "error_details"];
      authorization: "campaigns:read";
    };

    // Persona Management Endpoints
    "POST /api/v1/personas": {
      purpose: "Create new persona (DNS or HTTP)";
      requestBody: {
        name: "string";
        type: "dns | http";
        config: "DNSConfig | HTTPConfig";
        isActive: "boolean";
        description?: "string";
      };
      responseBody: {
        data: "Persona";
        message: "Persona created successfully";
      };
      validation: ["name_unique", "type_valid", "config_schema_valid"];
      authorization: "personas:create";
    };

    "POST /api/v1/personas/:id/test": {
      purpose: "Test persona configuration";
      pathParams: { id: "UUID" };
      requestBody: {
        testType: "connectivity | resolution | stealth";
        target?: "string"; // Domain for testing
        samples?: "number"; // Number of test samples
      };
      responseBody: {
        data: "PersonaTestResult";
        message: "Test completed";
      };
      features: ["configuration_validation", "connectivity_test", "stealth_assessment"];
      authorization: "personas:test";
    };

    // Keyword Set Management
    "POST /api/v1/keyword-sets": {
      purpose: "Create keyword set with rules";
      requestBody: {
        name: "string";
        description?: "string";
        category: "service | technology | business | contact | location";
        keywords: "KeywordRule[]";
        scoring: "ScoringConfig";
      };
      responseBody: {
        data: "KeywordSet";
        message: "Keyword set created successfully";
      };
      validation: ["name_unique", "keywords_valid", "scoring_config_valid"];
      authorization: "keyword_sets:create";
    };

    "POST /api/v1/keyword-sets/:id/validate": {
      purpose: "Validate keyword rules and scoring";
      pathParams: { id: "UUID" };
      requestBody: {
        testContent: "string";
        validateRegex: "boolean";
        checkPerformance: "boolean";
      };
      responseBody: {
        data: "KeywordValidationResult";
        message: "Validation completed";
      };
      features: ["regex_validation", "performance_testing", "scoring_simulation"];
      authorization: "keyword_sets:validate";
    };

    // Authentication Endpoints
    "POST /api/v1/auth/login": {
      purpose: "Authenticate user with session creation";
      requestBody: {
        email: "string";
        password: "string";
        rememberMe?: "boolean";
        fingerprint: "BrowserFingerprint";
      };
      responseBody: {
        data: "AuthSession";
        message: "Login successful";
      };
      headers: {
        "Set-Cookie": "session_id=...; HttpOnly; Secure; SameSite=Strict";
      };
      features: ["fingerprinting", "session_management", "rate_limiting"];
      rateLimit: "5 attempts per 15 minutes per IP";
    };

    "GET /api/v1/auth/session": {
      purpose: "Validate current session and get user info";
      headers: {
        required: ["Cookie"];
        optional: ["X-Request-ID"];
      };
      responseBody: {
        data: "SessionInfo";
        message: "Session valid";
      };
      features: ["session_validation", "user_permissions", "activity_tracking"];
    };
  };

  // API Security Patterns
  securityPatterns: {
    authentication: {
      method: "Session-based with secure cookies";
      sessionStorage: "PostgreSQL with encryption";
      sessionExpiry: "24 hours active, 7 days remember-me";
      fingerprinting: "Browser + IP + screen resolution";
    };

    authorization: {
      model: "Role-Based Access Control (RBAC)";
      permissions: [
        "campaigns:create", "campaigns:read", "campaigns:update", "campaigns:delete", "campaigns:execute",
        "personas:create", "personas:read", "personas:update", "personas:delete", "personas:test",
        "keyword_sets:create", "keyword_sets:read", "keyword_sets:update", "keyword_sets:delete",
        "proxies:create", "proxies:read", "proxies:update", "proxies:delete", "proxies:test",
        "users:create", "users:read", "users:update", "users:delete", "users:manage_roles"
      ];
      enforcement: "Middleware validation on every protected endpoint";
    };

    rateLimiting: {
      global: "1000 requests per hour per user";
      authentication: "5 login attempts per 15 minutes per IP";
      campaignOperations: "10 campaign starts per hour per user";
      bulkOperations: "5 bulk operations per hour per user";
      implementation: "Token bucket with Redis backing";
    };

    inputValidation: {
      jsonSchema: "Go struct validation with 'validate' package";
      sqlInjection: "Parameterized queries with sqlx";
      xssProtection: "HTML escaping on output";
      csrfProtection: "SameSite cookies + fingerprinting";
    };

    dataProtection: {
      passwords: "bcrypt with pepper and salt";
      sensitiveData: "AES-256-GCM encryption at rest";
      apiKeys: "Secure random generation with hashing";
      sessions: "Encrypted session tokens with fingerprinting";
    };
  };

  // Error Handling Patterns
  errorHandling: {
    standardErrorFormat: {
      error: "Human-readable error message";
      code: "Machine-readable error code";
      details: "Additional error context (optional)";
      requestId: "Unique request identifier for tracing";
      timestamp: "ISO 8601 timestamp";
    };

    errorCategories: {
      validation: {
        prefix: "VALIDATION_";
        examples: ["VALIDATION_REQUIRED_FIELD", "VALIDATION_INVALID_FORMAT"];
      };
      authorization: {
        prefix: "AUTH_";
        examples: ["AUTH_INSUFFICIENT_PERMISSIONS", "AUTH_SESSION_EXPIRED"];
      };
      business: {
        prefix: "BUSINESS_";
        examples: ["BUSINESS_CAMPAIGN_RUNNING", "BUSINESS_RESOURCE_LIMIT"];
      };
      system: {
        prefix: "SYSTEM_";
        examples: ["SYSTEM_DATABASE_ERROR", "SYSTEM_EXTERNAL_SERVICE"];
      };
    };

    recoveryStrategies: {
      retryable: ["SYSTEM_TEMPORARY_ERROR", "SYSTEM_RATE_LIMIT"];
      nonRetryable: ["VALIDATION_INVALID_INPUT", "AUTH_INSUFFICIENT_PERMISSIONS"];
      circuitBreaker: ["SYSTEM_DATABASE_ERROR", "SYSTEM_EXTERNAL_SERVICE"];
    };
  };
}

export const BACKEND_API_CONTEXT: BackendAPIContext = {
  apiArchitecture: {
    framework: "Gin (Go HTTP framework)",
    authentication: "Session-based authentication with fingerprinting",
    authorization: "Role-based access control (RBAC)",
    middleware: [
      "CORS", "RateLimiting", "Authentication", "Logging",
      "RequestID", "Recovery", "Compression"
    ],
    responseFormat: "JSON with consistent error handling",
    apiVersion: "v1",
    baseUrl: "/api/v1"
  },

  endpointCategories: {
    authentication: {
      basePath: "/auth",
      endpoints: [
        "POST /login", "POST /logout", "POST /register",
        "GET /session", "POST /refresh", "DELETE /session"
      ],
      features: ["session_management", "fingerprinting", "rate_limiting"]
    },

    campaigns: {
      basePath: "/campaigns",
      endpoints: [
        "GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id",
        "POST /:id/start", "POST /:id/pause", "POST /:id/resume",
        "GET /:id/status", "GET /:id/results", "GET /:id/logs"
      ],
      features: ["CRUD_operations", "state_management", "real_time_status"]
    },

    personas: {
      basePath: "/personas",
      endpoints: [
        "GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id",
        "POST /:id/test", "GET /:id/stats", "POST /bulk"
      ],
      features: ["DNS_and_HTTP_personas", "validation", "bulk_operations"]
    },

    keywordSets: {
      basePath: "/keyword-sets",
      endpoints: [
        "GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id",
        "POST /:id/test", "GET /:id/validate"
      ],
      features: ["rule_validation", "testing", "import_export"]
    },

    proxies: {
      basePath: "/proxies",
      endpoints: [
        "GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id",
        "POST /:id/test", "GET /:id/health", "POST /bulk"
      ],
      features: ["health_checks", "rotation_strategies", "bulk_management"]
    },

    users: {
      basePath: "/users",
      endpoints: [
        "GET /", "POST /", "GET /:id", "PUT /:id", "DELETE /:id",
        "PUT /:id/password", "PUT /:id/roles", "GET /:id/sessions"
      ],
      features: ["user_management", "role_assignment", "session_tracking"]
    },

    health: {
      basePath: "/health",
      endpoints: [
        "GET /", "GET /ready", "GET /live", "GET /metrics"
      ],
      features: ["service_health", "readiness_probes", "metrics_export"]
    }
  },

  requestResponsePatterns: {
    standardHeaders: {
      required: ["Content-Type", "Accept"],
      authentication: ["Authorization", "X-Session-ID"],
      security: ["X-Request-ID", "X-Real-IP", "X-Forwarded-For"],
      fingerprinting: ["User-Agent", "X-Browser-Fingerprint"]
    },

    requestValidation: {
      jsonValidation: "Go struct tags with validate package",
      headerValidation: "Custom middleware for required headers",
      parameterValidation: "Gin binding with custom validators",
      businessRuleValidation: "Service layer validation"
    },

    responseStructure: {
      success: {
        data: "T",
        message: "string",
        pagination: "PaginationMeta"
      },
      error: {
        error: "string",
        code: "string",
        details: "any",
        requestId: "string"
      },
      pagination: {
        page: "number",
        perPage: "number",
        total: "number",
        totalPages: "number"
      }
    },

    httpStatusCodes: {
      success: {
        200: "OK - Standard success",
        201: "Created - Resource created",
        202: "Accepted - Async operation started",
        204: "No Content - Successful deletion"
      },
      clientError: {
        400: "Bad Request - Validation errors",
        401: "Unauthorized - Authentication required",
        403: "Forbidden - Insufficient permissions",
        404: "Not Found - Resource not found",
        409: "Conflict - Resource conflict",
        422: "Unprocessable Entity - Business rule violation",
        429: "Too Many Requests - Rate limit exceeded"
      },
      serverError: {
        500: "Internal Server Error - Unexpected error",
        502: "Bad Gateway - External service error",
        503: "Service Unavailable - Temporary unavailability",
        504: "Gateway Timeout - External service timeout"
      }
    }
  },

  endpointDetails: {
    "POST /api/v1/campaigns": {
      purpose: "Create new campaign",
      requestBody: {
        name: "string",
        description: "string",
        type: "domain_generation | dns_validation | http_keyword_validation",
        config: "CampaignConfig",
        personas: "UUID[]",
        keywordSets: "UUID[]",
        proxies: "UUID[]"
      },
      responseBody: {
        data: "Campaign",
        message: "Campaign created successfully"
      },
      validation: ["name_required", "type_required", "config_valid"],
      authorization: "campaigns:create"
    },

    "POST /api/v1/campaigns/:id/start": {
      purpose: "Start campaign execution",
      pathParams: { id: "UUID" },
      requestBody: {
        force: "boolean",
        skipValidation: "boolean"
      },
      responseBody: {
        data: "CampaignJob",
        message: "Campaign started successfully"
      },
      preconditions: ["campaign_exists", "not_running", "valid_config"],
      authorization: "campaigns:execute"
    },

    "GET /api/v1/campaigns/:id/status": {
      purpose: "Get real-time campaign status",
      pathParams: { id: "UUID" },
      queryParams: {
        includeMetrics: "boolean",
        includeLogs: "boolean",
        fromTimestamp: "timestamp"
      },
      responseBody: {
        data: "CampaignStatus",
        message: "Status retrieved successfully"
      },
      features: ["real_time_updates", "performance_metrics", "error_details"],
      authorization: "campaigns:read"
    },

    "POST /api/v1/personas": {
      purpose: "Create new persona (DNS or HTTP)",
      requestBody: {
        name: "string",
        type: "dns | http",
        config: "DNSConfig | HTTPConfig",
        isActive: "boolean",
        description: "string"
      },
      responseBody: {
        data: "Persona",
        message: "Persona created successfully"
      },
      validation: ["name_unique", "type_valid", "config_schema_valid"],
      authorization: "personas:create"
    },

    "POST /api/v1/personas/:id/test": {
      purpose: "Test persona configuration",
      pathParams: { id: "UUID" },
      requestBody: {
        testType: "connectivity | resolution | stealth",
        target: "string",
        samples: "number"
      },
      responseBody: {
        data: "PersonaTestResult",
        message: "Test completed"
      },
      features: ["configuration_validation", "connectivity_test", "stealth_assessment"],
      authorization: "personas:test"
    },

    "POST /api/v1/keyword-sets": {
      purpose: "Create keyword set with rules",
      requestBody: {
        name: "string",
        description: "string",
        category: "service | technology | business | contact | location",
        keywords: "KeywordRule[]",
        scoring: "ScoringConfig"
      },
      responseBody: {
        data: "KeywordSet",
        message: "Keyword set created successfully"
      },
      validation: ["name_unique", "keywords_valid", "scoring_config_valid"],
      authorization: "keyword_sets:create"
    },

    "POST /api/v1/keyword-sets/:id/validate": {
      purpose: "Validate keyword rules and scoring",
      pathParams: { id: "UUID" },
      requestBody: {
        testContent: "string",
        validateRegex: "boolean",
        checkPerformance: "boolean"
      },
      responseBody: {
        data: "KeywordValidationResult",
        message: "Validation completed"
      },
      features: ["regex_validation", "performance_testing", "scoring_simulation"],
      authorization: "keyword_sets:validate"
    },

    "POST /api/v1/auth/login": {
      purpose: "Authenticate user with session creation",
      requestBody: {
        email: "string",
        password: "string",
        rememberMe: "boolean",
        fingerprint: "BrowserFingerprint"
      },
      responseBody: {
        data: "AuthSession",
        message: "Login successful"
      },
      headers: {
        "Set-Cookie": "session_id=...; HttpOnly; Secure; SameSite=Strict"
      },
      features: ["fingerprinting", "session_management", "rate_limiting"],
      rateLimit: "5 attempts per 15 minutes per IP"
    },

    "GET /api/v1/auth/session": {
      purpose: "Validate current session and get user info",
      headers: {
        required: ["Cookie"],
        optional: ["X-Request-ID"]
      },
      responseBody: {
        data: "SessionInfo",
        message: "Session valid"
      },
      features: ["session_validation", "user_permissions", "activity_tracking"]
    }
  },

  securityPatterns: {
    authentication: {
      method: "Session-based with secure cookies",
      sessionStorage: "PostgreSQL with encryption",
      sessionExpiry: "24 hours active, 7 days remember-me",
      fingerprinting: "Browser + IP + screen resolution"
    },

    authorization: {
      model: "Role-Based Access Control (RBAC)",
      permissions: [
        "campaigns:create", "campaigns:read", "campaigns:update", "campaigns:delete", "campaigns:execute",
        "personas:create", "personas:read", "personas:update", "personas:delete", "personas:test",
        "keyword_sets:create", "keyword_sets:read", "keyword_sets:update", "keyword_sets:delete",
        "proxies:create", "proxies:read", "proxies:update", "proxies:delete", "proxies:test",
        "users:create", "users:read", "users:update", "users:delete", "users:manage_roles"
      ],
      enforcement: "Middleware validation on every protected endpoint"
    },

    rateLimiting: {
      global: "1000 requests per hour per user",
      authentication: "5 login attempts per 15 minutes per IP",
      campaignOperations: "10 campaign starts per hour per user",
      bulkOperations: "5 bulk operations per hour per user",
      implementation: "Token bucket with Redis backing"
    },

    inputValidation: {
      jsonSchema: "Go struct validation with 'validate' package",
      sqlInjection: "Parameterized queries with sqlx",
      xssProtection: "HTML escaping on output",
      csrfProtection: "SameSite cookies + fingerprinting"
    },

    dataProtection: {
      passwords: "bcrypt with pepper and salt",
      sensitiveData: "AES-256-GCM encryption at rest",
      apiKeys: "Secure random generation with hashing",
      sessions: "Encrypted session tokens with fingerprinting"
    }
  },

  errorHandling: {
    standardErrorFormat: {
      error: "Human-readable error message",
      code: "Machine-readable error code",
      details: "Additional error context (optional)",
      requestId: "Unique request identifier for tracing",
      timestamp: "ISO 8601 timestamp"
    },

    errorCategories: {
      validation: {
        prefix: "VALIDATION_",
        examples: ["VALIDATION_REQUIRED_FIELD", "VALIDATION_INVALID_FORMAT"]
      },
      authorization: {
        prefix: "AUTH_",
        examples: ["AUTH_INSUFFICIENT_PERMISSIONS", "AUTH_SESSION_EXPIRED"]
      },
      business: {
        prefix: "BUSINESS_",
        examples: ["BUSINESS_CAMPAIGN_RUNNING", "BUSINESS_RESOURCE_LIMIT"]
      },
      system: {
        prefix: "SYSTEM_",
        examples: ["SYSTEM_DATABASE_ERROR", "SYSTEM_EXTERNAL_SERVICE"]
      }
    },

    recoveryStrategies: {
      retryable: ["SYSTEM_TEMPORARY_ERROR", "SYSTEM_RATE_LIMIT"],
      nonRetryable: ["VALIDATION_INVALID_INPUT", "AUTH_INSUFFICIENT_PERMISSIONS"],
      circuitBreaker: ["SYSTEM_DATABASE_ERROR", "SYSTEM_EXTERNAL_SERVICE"]
    }
  }
};