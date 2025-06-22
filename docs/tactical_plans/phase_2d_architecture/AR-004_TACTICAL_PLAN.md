# **AR-004: API DESIGN INCONSISTENCIES - TACTICAL IMPLEMENTATION PLAN**

**Finding ID**: AR-004  
**Phase**: 2D Architecture  
**Priority**: MEDIUM  
**Estimated Effort**: 2-3 days  
**Dependencies**: AR-003 Event-Driven Architecture Gaps  

---

## **FINDING OVERVIEW**

### **Problem Statement**
DomainFlow services exhibit significant API design inconsistencies including mixed versioning strategies, inconsistent error responses, varied authentication patterns, and non-standard HTTP status code usage. This creates integration complexity, reduces developer productivity, and complicates API documentation and maintenance.

### **Technical Impact**
- **Integration Complexity**: Different API patterns across services require service-specific integration code
- **Developer Experience**: Inconsistent APIs slow down development and increase learning curve
- **Documentation Fragmentation**: Multiple API documentation styles and formats
- **Error Handling Inconsistency**: Varied error response formats complicate client error handling
- **Versioning Strategy Gaps**: Mixed versioning approaches cause compatibility issues
- **Performance Variability**: Inconsistent pagination, filtering, and sorting implementations

### **Integration Points**
- **Service Architecture**: Builds on AR-001 service standardization framework
- **Communication Layer**: Leverages AR-002 communication patterns
- **Authorization Layer**: Integrates with BL-005 API authorization gaps
- **Performance Monitoring**: Uses PF-002 response time optimization
- **Caching Layer**: Integrates with PF-004 API response caching

---

## **POSTGRESQL MIGRATION**

### **API Design Governance Schema**
```sql
-- Migration: 20250622_api_design_governance.up.sql
CREATE TABLE IF NOT EXISTS api_specifications (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    api_version VARCHAR(20) NOT NULL,
    spec_format VARCHAR(20) NOT NULL DEFAULT 'openapi3', -- 'openapi3', 'swagger2', 'custom'
    specification JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'deprecated'
    breaking_changes BOOLEAN DEFAULT false,
    compatibility_score DECIMAL(5,2) DEFAULT 100.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deprecated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(service_name, api_version)
);

CREATE TABLE IF NOT EXISTS api_endpoints (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    api_version VARCHAR(20) NOT NULL,
    endpoint_path VARCHAR(500) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    operation_id VARCHAR(100),
    description TEXT,
    request_schema JSONB,
    response_schemas JSONB, -- Multiple response schemas by status code
    authentication_required BOOLEAN DEFAULT true,
    authorization_scopes TEXT[],
    rate_limit_rpm INTEGER DEFAULT 1000,
    deprecation_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_name, api_version, endpoint_path, http_method)
);

CREATE TABLE IF NOT EXISTS api_usage_metrics (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    api_version VARCHAR(20) NOT NULL,
    endpoint_path VARCHAR(500) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    client_id VARCHAR(100),
    request_count INTEGER DEFAULT 1,
    total_response_time_ms BIGINT DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    avg_response_size INTEGER DEFAULT 0,
    recorded_hour TIMESTAMP WITH TIME ZONE DEFAULT date_trunc('hour', NOW()),
    INDEX (service_name, api_version, recorded_hour),
    INDEX (recorded_hour DESC),
    UNIQUE(service_name, api_version, endpoint_path, http_method, client_id, recorded_hour)
);

CREATE TABLE IF NOT EXISTS api_compatibility_matrix (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    current_version VARCHAR(20) NOT NULL,
    target_version VARCHAR(20) NOT NULL,
    compatibility_type VARCHAR(30) NOT NULL, -- 'backward', 'forward', 'breaking'
    compatibility_score DECIMAL(5,2) NOT NULL,
    breaking_changes JSONB DEFAULT '[]',
    migration_guide TEXT,
    automated_migration BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(service_name, current_version, target_version)
);

CREATE TABLE IF NOT EXISTS api_design_violations (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    api_version VARCHAR(20) NOT NULL,
    endpoint_path VARCHAR(500) NOT NULL,
    violation_type VARCHAR(50) NOT NULL, -- 'naming_convention', 'http_method', 'status_code', 'response_format'
    violation_severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    violation_description TEXT NOT NULL,
    recommendation TEXT,
    auto_fixable BOOLEAN DEFAULT false,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    INDEX (service_name, violation_severity),
    INDEX (detected_at DESC) WHERE resolved_at IS NULL
);

-- Strategic indexes for API governance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_specs_service_status 
    ON api_specifications(service_name, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_endpoints_service_version 
    ON api_endpoints(service_name, api_version);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_metrics_aggregation 
    ON api_usage_metrics(service_name, recorded_hour DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violations_unresolved 
    ON api_design_violations(service_name, violation_severity) WHERE resolved_at IS NULL;

-- API governance analysis function
CREATE OR REPLACE FUNCTION analyze_api_governance()
RETURNS TABLE(
    service_name VARCHAR(100),
    total_endpoints INTEGER,
    governance_score DECIMAL(5,2),
    violation_count INTEGER,
    compatibility_issues INTEGER,
    recommendations TEXT[]
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH endpoint_stats AS (
        SELECT 
            ae.service_name,
            COUNT(*) as endpoint_count,
            COUNT(CASE WHEN ae.deprecation_date IS NOT NULL THEN 1 END) as deprecated_count
        FROM api_endpoints ae
        GROUP BY ae.service_name
    ),
    violation_stats AS (
        SELECT 
            adv.service_name,
            COUNT(*) as violation_count,
            COUNT(CASE WHEN adv.violation_severity IN ('high', 'critical') THEN 1 END) as critical_violations
        FROM api_design_violations adv
        WHERE adv.resolved_at IS NULL
        GROUP BY adv.service_name
    ),
    compatibility_stats AS (
        SELECT 
            acm.service_name,
            COUNT(CASE WHEN acm.compatibility_score < 80.0 THEN 1 END) as compatibility_issues
        FROM api_compatibility_matrix acm
        GROUP BY acm.service_name
    )
    SELECT 
        es.service_name,
        es.endpoint_count::INTEGER,
        CASE 
            WHEN COALESCE(vs.violation_count, 0) = 0 AND COALESCE(cs.compatibility_issues, 0) = 0 THEN 95.0
            WHEN COALESCE(vs.critical_violations, 0) = 0 AND COALESCE(cs.compatibility_issues, 0) < 2 THEN 80.0
            WHEN COALESCE(vs.critical_violations, 0) < 3 AND COALESCE(cs.compatibility_issues, 0) < 5 THEN 65.0
            ELSE 40.0
        END as score,
        COALESCE(vs.violation_count, 0)::INTEGER,
        COALESCE(cs.compatibility_issues, 0)::INTEGER,
        CASE 
            WHEN COALESCE(vs.violation_count, 0) > 5 THEN ARRAY['REDUCE_DESIGN_VIOLATIONS']
            ELSE ARRAY[]::TEXT[]
        END ||
        CASE 
            WHEN es.deprecated_count > 0 THEN ARRAY['UPDATE_DEPRECATED_ENDPOINTS']
            ELSE ARRAY[]::TEXT[]
        END ||
        CASE 
            WHEN COALESCE(cs.compatibility_issues, 0) > 2 THEN ARRAY['IMPROVE_API_COMPATIBILITY']
            ELSE ARRAY[]::TEXT[]
        END as recs
    FROM endpoint_stats es
    LEFT JOIN violation_stats vs ON es.service_name = vs.service_name
    LEFT JOIN compatibility_stats cs ON es.service_name = cs.service_name;
END;
$$;
```

---

## **IMPLEMENTATION GUIDANCE**

### **1. OpenAPI Specification Management**

**Implement centralized API specification governance:**

```go
// pkg/api/specification_manager.go
type APISpecification struct {
    ServiceName        string                 `json:"service_name"`
    Version            string                 `json:"version"`
    Format             SpecFormat             `json:"format"`
    Specification      map[string]interface{} `json:"specification"`
    Status             SpecStatus             `json:"status"`
    BreakingChanges    bool                   `json:"breaking_changes"`
    CompatibilityScore float64                `json:"compatibility_score"`
    CreatedAt          time.Time              `json:"created_at"`
    UpdatedAt          time.Time              `json:"updated_at"`
}

type SpecificationManager struct {
    db                *sql.DB
    validator         *OpenAPIValidator
    versionManager    *APIVersionManager
    documentGenerator *DocumentationGenerator
    metrics           *APIMetrics
}

func (sm *SpecificationManager) RegisterSpecification(ctx context.Context, spec *APISpecification) error {
    // Validate OpenAPI specification
    if err := sm.validator.ValidateSpecification(spec.Specification); err != nil {
        return fmt.Errorf("specification validation failed: %w", err)
    }
    
    // Check for breaking changes
    if err := sm.analyzeBreakingChanges(ctx, spec); err != nil {
        return fmt.Errorf("breaking change analysis failed: %w", err)
    }
    
    // Calculate compatibility score
    score, err := sm.calculateCompatibilityScore(ctx, spec)
    if err != nil {
        return fmt.Errorf("compatibility score calculation failed: %w", err)
    }
    spec.CompatibilityScore = score
    
    // Store specification
    if err := sm.storeSpecification(ctx, spec); err != nil {
        return fmt.Errorf("failed to store specification: %w", err)
    }
    
    // Generate documentation
    go sm.documentGenerator.GenerateDocumentation(spec)
    
    sm.metrics.RecordSpecificationRegistration(spec.ServiceName, spec.Version)
    return nil
}

func (sm *SpecificationManager) ValidateAPICompliance(ctx context.Context, serviceName, version string) (*ComplianceReport, error) {
    // Get current specification
    spec, err := sm.getSpecification(ctx, serviceName, version)
    if err != nil {
        return nil, fmt.Errorf("failed to get specification: %w", err)
    }
    
    // Run compliance checks
    violations := []APIViolation{}
    
    // Check naming conventions
    namingViolations := sm.checkNamingConventions(spec)
    violations = append(violations, namingViolations...)
    
    // Check HTTP method usage
    methodViolations := sm.checkHTTPMethodUsage(spec)
    violations = append(violations, methodViolations...)
    
    // Check status code patterns
    statusViolations := sm.checkStatusCodePatterns(spec)
    violations = append(violations, statusViolations...)
    
    // Check response format consistency
    formatViolations := sm.checkResponseFormats(spec)
    violations = append(violations, formatViolations...)
    
    // Store violations
    if err := sm.storeViolations(ctx, violations); err != nil {
        return nil, fmt.Errorf("failed to store violations: %w", err)
    }
    
    return &ComplianceReport{
        ServiceName:       serviceName,
        Version:           version,
        Violations:        violations,
        ComplianceScore:   sm.calculateComplianceScore(violations),
        Recommendations:   sm.generateRecommendations(violations),
        GeneratedAt:       time.Now(),
    }, nil
}

// OpenAPI specification validation
func (sm *SpecificationManager) checkNamingConventions(spec *APISpecification) []APIViolation {
    violations := []APIViolation{}
    
    // Extract paths from OpenAPI spec
    paths, ok := spec.Specification["paths"].(map[string]interface{})
    if !ok {
        return violations
    }
    
    for path, operations := range paths {
        // Check path naming conventions (kebab-case, no trailing slashes, etc.)
        if !sm.isValidPathNaming(path) {
            violations = append(violations, APIViolation{
                ServiceName:         spec.ServiceName,
                Version:             spec.Version,
                EndpointPath:        path,
                ViolationType:       "naming_convention",
                Severity:            "medium",
                Description:         "Path does not follow naming conventions",
                Recommendation:      "Use kebab-case, no trailing slashes, plural nouns for resources",
                AutoFixable:         false,
            })
        }
        
        // Check operation ID naming
        if ops, ok := operations.(map[string]interface{}); ok {
            for method, operation := range ops {
                if op, ok := operation.(map[string]interface{}); ok {
                    if operationID, exists := op["operationId"]; exists {
                        if !sm.isValidOperationID(fmt.Sprintf("%v", operationID)) {
                            violations = append(violations, APIViolation{
                                ServiceName:    spec.ServiceName,
                                Version:        spec.Version,
                                EndpointPath:   path,
                                HTTPMethod:     method,
                                ViolationType:  "naming_convention",
                                Severity:       "low",
                                Description:    "Operation ID does not follow naming conventions",
                                Recommendation: "Use camelCase operation IDs with verb + noun pattern",
                                AutoFixable:    true,
                            })
                        }
                    }
                }
            }
        }
    }
    
    return violations
}
```

**Implementation Steps:**
1. **OpenAPI standard adoption** - Migrate all APIs to OpenAPI 3.0 specifications
2. **Specification validation** - Implement automated specification validation
3. **Breaking change detection** - Analyze API changes for breaking compatibility
4. **Documentation generation** - Auto-generate API documentation from specifications
5. **Compliance monitoring** - Continuous monitoring of API design compliance

### **2. API Versioning Strategy**

**Implement consistent API versioning across services:**

```go
// pkg/api/version_manager.go
type APIVersionManager struct {
    db              *sql.DB
    migrationEngine *APIMigrationEngine
    compatibilityChecker *CompatibilityChecker
}

type VersionStrategy string

const (
    VersionStrategyURL    VersionStrategy = "url"    // /v1/users
    VersionStrategyHeader VersionStrategy = "header" // Accept: application/vnd.api+json;version=1
    VersionStrategyQuery  VersionStrategy = "query"  // ?version=1
)

type APIVersion struct {
    ServiceName     string          `json:"service_name"`
    Version         string          `json:"version"`
    Strategy        VersionStrategy `json:"strategy"`
    Status          VersionStatus   `json:"status"`
    SupportedUntil  *time.Time      `json:"supported_until,omitempty"`
    MigrationPath   string          `json:"migration_path,omitempty"`
    BreakingChanges []BreakingChange `json:"breaking_changes"`
}

func (vm *APIVersionManager) CreateNewVersion(ctx context.Context, serviceName, currentVersion, newVersion string, changes []APIChange) (*APIVersion, error) {
    // Analyze changes for breaking modifications
    breakingChanges := vm.identifyBreakingChanges(changes)
    
    // Determine version increment strategy
    versionIncrement := vm.determineVersionIncrement(breakingChanges)
    
    // Validate new version follows semver
    if !vm.isValidSemanticVersion(newVersion) {
        return nil, fmt.Errorf("invalid semantic version: %s", newVersion)
    }
    
    // Create compatibility matrix
    compatibility, err := vm.calculateCompatibility(ctx, serviceName, currentVersion, newVersion, changes)
    if err != nil {
        return nil, fmt.Errorf("compatibility calculation failed: %w", err)
    }
    
    // Store compatibility matrix
    if err := vm.storeCompatibilityMatrix(ctx, compatibility); err != nil {
        return nil, fmt.Errorf("failed to store compatibility matrix: %w", err)
    }
    
    // Generate migration guide
    migrationGuide := vm.generateMigrationGuide(currentVersion, newVersion, breakingChanges)
    
    version := &APIVersion{
        ServiceName:     serviceName,
        Version:         newVersion,
        Strategy:        VersionStrategyURL, // Default strategy
        Status:          VersionStatusDraft,
        BreakingChanges: breakingChanges,
        MigrationPath:   migrationGuide,
    }
    
    return version, nil
}

func (vm *APIVersionManager) identifyBreakingChanges(changes []APIChange) []BreakingChange {
    breakingChanges := []BreakingChange{}
    
    for _, change := range changes {
        switch change.Type {
        case ChangeTypeRemoveEndpoint:
            breakingChanges = append(breakingChanges, BreakingChange{
                Type:        "endpoint_removal",
                Description: fmt.Sprintf("Endpoint %s removed", change.EndpointPath),
                Impact:      "Clients calling this endpoint will receive 404 errors",
                Mitigation:  "Use alternative endpoint or update client code",
            })
        case ChangeTypeRemoveField:
            breakingChanges = append(breakingChanges, BreakingChange{
                Type:        "field_removal",
                Description: fmt.Sprintf("Field %s removed from response", change.FieldName),
                Impact:      "Clients depending on this field will fail",
                Mitigation:  "Update client code to handle missing field",
            })
        case ChangeTypeChangeFieldType:
            breakingChanges = append(breakingChanges, BreakingChange{
                Type:        "field_type_change",
                Description: fmt.Sprintf("Field %s type changed from %s to %s", change.FieldName, change.OldValue, change.NewValue),
                Impact:      "Clients may fail to parse response",
                Mitigation:  "Update client code to handle new field type",
            })
        case ChangeTypeAddRequiredField:
            breakingChanges = append(breakingChanges, BreakingChange{
                Type:        "required_field_addition",
                Description: fmt.Sprintf("Required field %s added to request", change.FieldName),
                Impact:      "Existing requests will fail validation",
                Mitigation:  "Update client code to include required field",
            })
        }
    }
    
    return breakingChanges
}

func (vm *APIVersionManager) DetermineDeprecationStrategy(ctx context.Context, serviceName, version string) (*DeprecationPlan, error) {
    // Get usage metrics for the version
    usage, err := vm.getVersionUsage(ctx, serviceName, version)
    if err != nil {
        return nil, fmt.Errorf("failed to get version usage: %w", err)
    }
    
    // Calculate deprecation timeline based on usage
    var deprecationPeriod time.Duration
    if usage.RequestCount > 10000 { // High usage
        deprecationPeriod = 12 * time.Month
    } else if usage.RequestCount > 1000 { // Medium usage
        deprecationPeriod = 6 * time.Month
    } else { // Low usage
        deprecationPeriod = 3 * time.Month
    }
    
    deprecationDate := time.Now().Add(deprecationPeriod)
    
    return &DeprecationPlan{
        ServiceName:     serviceName,
        Version:         version,
        DeprecationDate: deprecationDate,
        SunsetDate:      deprecationDate.Add(3 * time.Month), // 3 months grace period
        MigrationGuide:  vm.getMigrationGuide(serviceName, version),
        NotificationPlan: vm.createNotificationPlan(usage.Clients),
    }, nil
}
```

**Implementation Steps:**
1. **Semantic versioning adoption** - Standardize on semantic versioning across all APIs
2. **Version strategy standardization** - Use consistent versioning strategy (URL-based recommended)
3. **Breaking change detection** - Automated detection of breaking changes between versions
4. **Migration guide generation** - Auto-generate migration guides for version transitions
5. **Deprecation timeline management** - Systematic deprecation planning based on usage metrics

### **3. Standardized Error Handling**

**Implement consistent error response patterns:**

```go
// pkg/api/error_handler.go
type StandardErrorResponse struct {
    Error   ErrorDetail   `json:"error"`
    TraceID string        `json:"trace_id"`
    Meta    ErrorMeta     `json:"meta,omitempty"`
}

type ErrorDetail struct {
    Code        string            `json:"code"`
    Message     string            `json:"message"`
    Details     string            `json:"details,omitempty"`
    Fields      map[string]string `json:"fields,omitempty"`
    Suggestions []string          `json:"suggestions,omitempty"`
}

type ErrorMeta struct {
    Timestamp   time.Time `json:"timestamp"`
    Path        string    `json:"path"`
    Method      string    `json:"method"`
    UserAgent   string    `json:"user_agent,omitempty"`
    APIVersion  string    `json:"api_version"`
}

type ErrorHandler struct {
    logger    *log.Logger
    metrics   *ErrorMetrics
    tracer    opentracing.Tracer
}

func (eh *ErrorHandler) HandleError(ctx context.Context, err error, req *http.Request, writer http.ResponseWriter) {
    // Extract trace ID from context
    traceID := eh.getTraceID(ctx)
    
    // Determine error type and status code
    statusCode, errorDetail := eh.classifyError(err)
    
    // Create standard error response
    errorResponse := StandardErrorResponse{
        Error:   errorDetail,
        TraceID: traceID,
        Meta: ErrorMeta{
            Timestamp:  time.Now(),
            Path:       req.URL.Path,
            Method:     req.Method,
            UserAgent:  req.Header.Get("User-Agent"),
            APIVersion: eh.extractAPIVersion(req),
        },
    }
    
    // Log error with appropriate level
    eh.logError(statusCode, errorResponse, err)
    
    // Record metrics
    eh.metrics.RecordError(statusCode, req.URL.Path, req.Method)
    
    // Set response headers
    writer.Header().Set("Content-Type", "application/json")
    writer.Header().Set("X-Trace-ID", traceID)
    writer.WriteHeader(statusCode)
    
    // Write error response
    if err := json.NewEncoder(writer).Encode(errorResponse); err != nil {
        eh.logger.Printf("Failed to encode error response: %v", err)
    }
}

func (eh *ErrorHandler) classifyError(err error) (int, ErrorDetail) {
    switch e := err.(type) {
    case *ValidationError:
        return http.StatusBadRequest, ErrorDetail{
            Code:        "VALIDATION_ERROR",
            Message:     "Request validation failed",
            Details:     e.Error(),
            Fields:      e.FieldErrors,
            Suggestions: e.Suggestions,
        }
    case *AuthenticationError:
        return http.StatusUnauthorized, ErrorDetail{
            Code:        "AUTHENTICATION_ERROR",
            Message:     "Authentication required",
            Details:     e.Error(),
            Suggestions: []string{"Provide valid authentication credentials"},
        }
    case *AuthorizationError:
        return http.StatusForbidden, ErrorDetail{
            Code:        "AUTHORIZATION_ERROR",
            Message:     "Insufficient permissions",
            Details:     e.Error(),
            Suggestions: []string{"Contact administrator for required permissions"},
        }
    case *NotFoundError:
        return http.StatusNotFound, ErrorDetail{
            Code:        "RESOURCE_NOT_FOUND",
            Message:     "Requested resource not found",
            Details:     e.Error(),
            Suggestions: []string{"Check resource ID", "Ensure resource exists"},
        }
    case *ConflictError:
        return http.StatusConflict, ErrorDetail{
            Code:        "RESOURCE_CONFLICT",
            Message:     "Resource conflict detected",
            Details:     e.Error(),
            Suggestions: []string{"Refresh resource state", "Resolve conflicts manually"},
        }
    case *RateLimitError:
        return http.StatusTooManyRequests, ErrorDetail{
            Code:        "RATE_LIMIT_EXCEEDED",
            Message:     "Rate limit exceeded",
            Details:     e.Error(),
            Suggestions: []string{"Reduce request rate", "Implement exponential backoff"},
        }
    default:
        return http.StatusInternalServerError, ErrorDetail{
            Code:        "INTERNAL_SERVER_ERROR",
            Message:     "An internal server error occurred",
            Details:     "Contact support if the issue persists",
            Suggestions: []string{"Retry the request", "Contact support"},
        }
    }
}

// Standard HTTP middleware for error handling
func (eh *ErrorHandler) Middleware() func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            defer func() {
                if rec := recover(); rec != nil {
                    err := fmt.Errorf("panic recovered: %v", rec)
                    eh.HandleError(r.Context(), err, r, w)
                }
            }()
            
            next.ServeHTTP(w, r)
        })
    }
}
```

**Implementation Steps:**
1. **Error response standardization** - Implement consistent error response format
2. **Error classification system** - Categorize errors with appropriate HTTP status codes
3. **Error middleware integration** - Apply error handling middleware across all services
4. **Error tracking and metrics** - Track error patterns and frequencies
5. **Client-friendly error messages** - Provide actionable error messages and suggestions

### **4. API Gateway Integration**

**Implement centralized API gateway for consistency:**

```go
// pkg/api/gateway.go
type APIGateway struct {
    router          *mux.Router
    rateLimiter     *RateLimiter
    authManager     *AuthenticationManager
    specRegistry    *SpecificationRegistry
    routeManager    *RouteManager
    middleware      []Middleware
}

type RouteDefinition struct {
    ServiceName     string            `json:"service_name"`
    Path            string            `json:"path"`
    Method          string            `json:"method"`
    UpstreamURL     string            `json:"upstream_url"`
    RateLimitRPM    int               `json:"rate_limit_rpm"`
    AuthRequired    bool              `json:"auth_required"`
    Scopes          []string          `json:"scopes"`
    Transformations []Transformation  `json:"transformations"`
    CacheConfig     *CacheConfig      `json:"cache_config,omitempty"`
}

func (gw *APIGateway) RegisterRoute(route *RouteDefinition) error {
    // Validate route definition against service specification
    if err := gw.validateRoute(route); err != nil {
        return fmt.Errorf("route validation failed: %w", err)
    }
    
    // Create handler chain
    handler := gw.createHandlerChain(route)
    
    // Register route with router
    gw.router.HandleFunc(route.Path, handler).Methods(route.Method)
    
    return nil
}

func (gw *APIGateway) createHandlerChain(route *RouteDefinition) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        
        // Apply middleware chain
        for _, middleware := range gw.middleware {
            if !middleware.ShouldApply(route, r) {
                continue
            }
            
            if err := middleware.Process(ctx, w, r); err != nil {
                gw.handleMiddlewareError(w, r, err)
                return
            }
        }
        
        // Rate limiting
        if !gw.rateLimiter.Allow(route.ServiceName, route.Path, gw.getClientID(r)) {
            gw.handleRateLimitExceeded(w, r)
            return
        }
        
        // Authentication
        if route.AuthRequired {
            user, err := gw.authManager.Authenticate(r)
            if err != nil {
                gw.handleAuthenticationError(w, r, err)
                return
            }
            ctx = context.WithValue(ctx, "user", user)
        }
        
        // Authorization
        if len(route.Scopes) > 0 {
            if err := gw.authManager.Authorize(ctx, route.Scopes); err != nil {
                gw.handleAuthorizationError(w, r, err)
                return
            }
        }
        
        // Request transformation
        transformedReq := gw.applyRequestTransformations(r, route.Transformations)
        
        // Proxy to upstream service
        gw.proxyRequest(w, transformedReq, route)
    }
}

func (gw *APIGateway) proxyRequest(w http.ResponseWriter, r *http.Request, route *RouteDefinition) {
    // Create upstream request
    upstreamURL, err := url.Parse(route.UpstreamURL)
    if err != nil {
        gw.handleUpstreamError(w, r, fmt.Errorf("invalid upstream URL: %w", err))
        return
    }
    
    // Preserve request context and headers
    upstreamReq := r.Clone(r.Context())
    upstreamReq.URL = upstreamURL
    upstreamReq.Host = upstreamURL.Host
    
    // Add gateway headers
    upstreamReq.Header.Set("X-Gateway-Request-ID", uuid.New().String())
    upstreamReq.Header.Set("X-Gateway-Version", "1.0")
    
    // Execute request with timeout
    client := &http.Client{
        Timeout: 30 * time.Second,
        Transport: &http.Transport{
            MaxIdleConns:        100,
            MaxIdleConnsPerHost: 10,
            IdleConnTimeout:     30 * time.Second,
        },
    }
    
    resp, err := client.Do(upstreamReq)
    if err != nil {
        gw.handleUpstreamError(w, r, fmt.Errorf("upstream request failed: %w", err))
        return
    }
    defer resp.Body.Close()
    
    // Copy response headers
    for k, v := range resp.Header {
        w.Header()[k] = v
    }
    
    // Apply response transformations
    gw.applyResponseTransformations(w, resp, route.Transformations)
    
    // Copy status code and body
    w.WriteHeader(resp.StatusCode)
    io.Copy(w, resp.Body)
}
```

**Implementation Steps:**
1. **Gateway deployment** - Deploy centralized API gateway for all services
2. **Route configuration** - Configure routes with consistent patterns and policies
3. **Middleware standardization** - Apply consistent middleware (auth, rate limiting, logging)
4. **Request/response transformation** - Standardize request/response formats at gateway
5. **Traffic management** - Implement load balancing, circuit breaking, and retry policies

---

## **INTEGRATION TESTS**

### **API Design Compliance Testing**
```go
func TestAPISpecificationCompliance(t *testing.T) {
    // Use domainflow_production database
    suite := testutil.ServiceTestSuite{UseDatabaseFromEnv: true}
    testDB := suite.SetupDatabase(t)
    defer testDB.Close()
    
    specManager := NewSpecificationManager(testDB)
    
    testCases := []struct {
        serviceName        string
        specificationFile  string
        expectedViolations int
        expectedScore      float64
    }{
        {"domain-service", "testdata/domain-service-v1.yaml", 0, 95.0},
        {"campaign-service", "testdata/campaign-service-v1.yaml", 2, 80.0},
        {"analytics-service", "testdata/analytics-service-v1.yaml", 1, 85.0},
    }
    
    for _, tc := range testCases {
        t.Run(tc.serviceName, func(t *testing.T) {
            // Load test specification
            specData, err := os.ReadFile(tc.specificationFile)
            assert.NoError(t, err)
            
            var specification map[string]interface{}
            err = yaml.Unmarshal(specData, &specification)
            assert.NoError(t, err)
            
            apiSpec := &APISpecification{
                ServiceName:   tc.serviceName,
                Version:       "1.0.0",
                Format:        SpecFormatOpenAPI3,
                Specification: specification,
                Status:        SpecStatusDraft,
            }
            
            // Register specification
            err = specManager.RegisterSpecification(context.Background(), apiSpec)
            assert.NoError(t, err)
            
            // Validate compliance
            report, err := specManager.ValidateAPICompliance(context.Background(), tc.serviceName, "1.0.0")
            assert.NoError(t, err)
            assert.Equal(t, tc.expectedViolations, len(report.Violations))
            assert.GreaterOrEqual(t, report.ComplianceScore, tc.expectedScore)
        })
    }
}

func TestAPIVersioningStrategy(t *testing.T) {
    versionManager := setupAPIVersionManager(t)
    
    // Test semantic versioning
    t.Run("SemanticVersioning", func(t *testing.T) {
        validVersions := []string{"1.0.0", "1.2.3", "2.0.0-beta.1", "1.0.0-alpha.1"}
        invalidVersions := []string{"1.0", "v1.0.0", "1.0.0.0", "latest"}
        
        for _, version := range validVersions {
            assert.True(t, versionManager.isValidSemanticVersion(version))
        }
        
        for _, version := range invalidVersions {
            assert.False(t, versionManager.isValidSemanticVersion(version))
        }
    })
    
    // Test breaking change detection
    t.Run("BreakingChangeDetection", func(t *testing.T) {
        changes := []APIChange{
            {Type: ChangeTypeRemoveEndpoint, EndpointPath: "/users/{id}"},
            {Type: ChangeTypeAddField, FieldName: "optional_field"},
            {Type: ChangeTypeRemoveField, FieldName: "required_field"},
        }
        
        breakingChanges := versionManager.identifyBreakingChanges(changes)
        assert.Equal(t, 2, len(breakingChanges)) // Only removal changes are breaking
    })
}

func TestStandardErrorHandling(t *testing.T) {
    errorHandler := setupErrorHandler(t)
    
    testCases := []struct {
        error              error
        expectedStatusCode int
        expectedErrorCode  string
    }{
        {&ValidationError{FieldErrors: map[string]string{"email": "invalid format"}}, 400, "VALIDATION_ERROR"},
        {&AuthenticationError{Message: "invalid token"}, 401, "AUTHENTICATION_ERROR"},
        {&AuthorizationError{Message: "insufficient permissions"}, 403, "AUTHORIZATION_ERROR"},
        {&NotFoundError{Resource: "user", ID: "123"}, 404, "RESOURCE_NOT_FOUND"},
        {&ConflictError{Message: "resource already exists"}, 409, "RESOURCE_CONFLICT"},
        {fmt.Errorf("unexpected error"), 500, "INTERNAL_SERVER_ERROR"},
    }
    
    for _, tc := range testCases {
        t.Run(tc.expectedErrorCode, func(t *testing.T) {
            recorder := httptest.NewRecorder()
            request := httptest.NewRequest("GET", "/test", nil)
            request = request.WithContext(context.WithValue(request.Context(), "trace_id", "test-trace-123"))
            
            errorHandler.HandleError(request.Context(), tc.error, request, recorder)
            
            assert.Equal(t, tc.expectedStatusCode, recorder.Code)
            assert.Equal(t, "application/json", recorder.Header().Get("Content-Type"))
            assert.Equal(t, "test-trace-123", recorder.Header().Get("X-Trace-ID"))
            
            var errorResponse StandardErrorResponse
            err := json.Unmarshal(recorder.Body.Bytes(), &errorResponse)
            assert.NoError(t, err)
            assert.Equal(t, tc.expectedErrorCode, errorResponse.Error.Code)
            assert.Equal(t, "test-trace-123", errorResponse.TraceID)
        })
    }
}

func TestAPIGatewayIntegration(t *testing.T) {
    gateway := setupAPIGateway(t)
    
    // Test route registration
    t.Run("RouteRegistration", func(t *testing.T) {
        route := &RouteDefinition{
            ServiceName:  "test-service",
            Path:         "/api/v1/test",
            Method:       "GET",
            UpstreamURL:  "http://test-service:8080",
            RateLimitRPM: 1000,
            AuthRequired: true,
            Scopes:       []string{"read:test"},
        }
        
        err := gateway.RegisterRoute(route)
        assert.NoError(t, err)
    })
    
    // Test middleware application
    t.Run("MiddlewareChain", func(t *testing.T) {
        // Test that authentication middleware is applied
        request := httptest.NewRequest("GET", "/api/v1/test", nil)
        recorder := httptest.NewRecorder()
        
        gateway.router.ServeHTTP(recorder, request)
        
        // Should return 401 without authentication
        assert.Equal(t, 401, recorder.Code)
    })
}
```

---

## **CI/CD VALIDATION CHECKLIST**

### **API Design Quality Gates**
- [ ] **OpenAPI Specification Validation**: All APIs have valid OpenAPI 3.0 specifications
- [ ] **API Design Compliance**: No critical design violations detected
- [ ] **Version Compatibility**: API changes maintain backward compatibility when required
- [ ] **Error Response Consistency**: All errors follow standard error response format
- [ ] **Authentication Integration**: All protected endpoints require proper authentication
- [ ] **Rate Limiting Configuration**: All endpoints have appropriate rate limiting

### **Database Schema Validation**
```bash
# Validate API governance schema
POSTGRES_DATABASE=domainflow_production go test ./pkg/api/... -tags=integration -run=TestAPIGovernanceSchema

# Check API compliance
POSTGRES_DATABASE=domainflow_production psql $TEST_POSTGRES_DSN -c "SELECT * FROM analyze_api_governance();"

# Validate specification storage
POSTGRES_DATABASE=domainflow_production go test ./pkg/api/... -tags=integration -run=TestSpecificationManager -race
```

### **Deployment Pipeline Integration**
```yaml
# .github/workflows/api-design-validation.yml
api-design-validation:
  runs-on: ubuntu-latest
  steps:
    - name: OpenAPI Specification Validation
      run: |
        go run ./cmd/api-spec-validator --specs=./api/specs/
        
    - name: API Design Compliance Check
      run: |
        go run ./cmd/api-compliance-checker --config=.api-governance.yml
        
    - name: API Version Compatibility Test
      run: |
        POSTGRES_DATABASE=domainflow_production go test ./pkg/api/... -tags=integration -timeout=5m
      env:
        POSTGRES_DATABASE: domainflow_production
```

---

## **SUCCESS CRITERIA**

### **Quantitative Metrics**
- **API Compliance Score**: > 90% across all services
- **Design Violation Count**: < 5 critical violations per service
- **Response Time Consistency**: ±20% variance across similar endpoints
- **Error Response Standardization**: 100% errors follow standard format
- **API Documentation Coverage**: 100% endpoints documented with OpenAPI

### **Qualitative Indicators**
- **Developer Experience**: Reduced integration time due to consistent APIs
- **API Discoverability**: Centralized API catalog with searchable documentation
- **Maintenance Efficiency**: Simplified API maintenance through standardization
- **Client Integration**: Consistent patterns reduce client-side complexity

### **Monitoring Dashboard Integration**
```go
// Integration with existing monitoring (building on PF-002)
func (sm *SpecificationManager) RegisterMetrics(registry *prometheus.Registry) {
    apiComplianceGauge := prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "domainflow_api_compliance_score",
            Help: "API compliance score per service",
        },
        []string{"service_name"},
    )
    
    apiViolationCounter := prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "domainflow_api_violations_total",
            Help: "Total API design violations",
        },
        []string{"service_name", "violation_type", "severity"},
    )
    
    registry.MustRegister(apiComplianceGauge, apiViolationCounter)
}
```

---

## **ROLLBACK PROCEDURES**

### **API Design Rollback Plan**
1. **Specification Rollback**: Revert to previous API specification versions
2. **Gateway Configuration Rollback**: Restore previous gateway routing configuration
3. **Error Format Rollback**: Support legacy error formats during transition
4. **Version Rollback**: Maintain previous API versions during rollback period

### **Database Rollback**
```sql
-- Migration: 20250622_api_design_governance.down.sql
DROP FUNCTION IF EXISTS analyze_api_governance();
DROP INDEX IF EXISTS idx_violations_unresolved;
DROP INDEX IF EXISTS idx_api_usage_metrics_aggregation;
DROP INDEX IF EXISTS idx_api_endpoints_service_version;
DROP INDEX IF EXISTS idx_api_specs_service_status;
DROP TABLE IF EXISTS api_design_violations;
DROP TABLE IF EXISTS api_compatibility_matrix;
DROP TABLE IF EXISTS api_usage_metrics;
DROP TABLE IF EXISTS api_endpoints;
DROP TABLE IF EXISTS api_specifications;
```

---

**Implementation Priority**: Implement after AR-003 Event-Driven Architecture completion  
**Validation Required**: API compliance score > 90% across all services  
**Next Document**: AR-005 Scalability Architecture Limitations