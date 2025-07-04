# Implementation Details

This document describes the technical implementation of the sophisticated MCP server with business domain analysis capabilities.

## Architecture

The MCP server is a JSON-RPC 2.0 server built in Go that communicates over stdin/stdout following the Model Context Protocol specification. It provides comprehensive full-stack analysis with advanced business domain awareness.

### Core Components

*   **`cmd/mcp-server/main.go`**: Entry point with database auto-detection and JSON-RPC server initialization
*   **`internal/server`**: Server infrastructure and bridge pattern for tool access
*   **`internal/jsonrpc`**: JSON-RPC 2.0 protocol implementation and tool dispatching
*   **`internal/analyzer`**: Core analysis logic for frontend, backend, and cross-stack analysis
*   **`internal/models`**: Comprehensive data structures for all analysis results

### Protocol Architecture

```
┌─────────────────┐    JSON-RPC 2.0    ┌──────────────────┐
│  VS Code        │◄──────────────────►│  MCP Server      │
│  Copilot Chat   │    (stdin/stdout)  │  (Go)            │
└─────────────────┘                    └──────────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────┐
                                │    Sophisticated Analysis │
                                │  ┌─────────────────────┐  │
                                │  │  Business Domains   │  │
                                │  │  - Keywords         │  │
                                │  │  - Proxy Pools      │  │
                                │  │  - Cross-Domain     │  │
                                │  └─────────────────────┘  │
                                │  ┌─────────────────────┐  │
                                │  │  Frontend (Next.js) │  │
                                │  │  - API Client       │  │
                                │  │  - Components       │  │
                                │  │  - TypeScript       │  │
                                │  └─────────────────────┘  │
                                │  ┌─────────────────────┐  │
                                │  │  Backend (Go)       │  │
                                │  │  - Advanced Tooling │  │
                                │  │  - Services         │  │
                                │  │  - Enhanced APIs    │  │
                                │  └─────────────────────┘  │
                                └───────────────────────────┘
```

## Advanced Analysis Techniques

### 1. Business Domain Analysis

The server employs sophisticated domain-driven analysis techniques:

#### Domain Discovery
- **AST-based Service Discovery**: Parses Go source code to identify domain-specific services
- **API Endpoint Categorization**: Automatically categorizes API endpoints by business domain
- **Cross-Domain Dependency Mapping**: Analyzes imports and references between domains

#### Implementation
```go
// Business domain detection via AST analysis
func ParseBusinessDomains(backendPath string) ([]models.BusinessDomain, error) {
    // Scan directory structure for domain patterns
    // Analyze service implementations within each domain
    // Extract domain-specific API patterns
    // Map cross-domain dependencies
}
```

### 2. Enhanced Frontend Analysis

#### TypeScript API Client Analysis
- **Type System Analysis**: Deep inspection of TypeScript type definitions and relationships
- **Generated Code Detection**: Identifies OpenAPI-generated vs. hand-written client code
- **Business Domain Mapping**: Maps frontend API usage to backend business domains

#### React Component Analysis
- **Component Tree Construction**: Builds comprehensive component dependency graphs
- **Props and Events Extraction**: Analyzes component interfaces and event handling patterns
- **Test Coverage Mapping**: Links components to their corresponding test files

### 3. Advanced Backend Analysis

#### Service Architecture Analysis
- **Interface Implementation Discovery**: Sophisticated matching of interfaces to implementations
- **Call Graph Construction**: Builds detailed function call relationships with context
- **Dependency Injection Analysis**: Traces service dependencies and injection patterns

#### Advanced Database Tooling
- **Migration Verification**: Analyzes database migration scripts and validators
- **Schema Evolution Tracking**: Monitors schema changes and compatibility
- **Performance Analysis**: Database query performance and optimization insights

### 4. Cross-Stack Integration Analysis

#### Contract Validation
- **OpenAPI Alignment**: Verifies frontend/backend API contract consistency
- **Type Safety Analysis**: Ensures TypeScript types match backend model definitions
- **Business Domain Consistency**: Validates domain organization across frontend/backend

## Key Tool Implementation Categories

### Business Domain Tools (16 tools)

#### Keyword Management Domain
```go
func GetKeywordExtractionServices() ([]models.Service, error) {
    // Analyzes internal/keywordextractor directory
    // Extracts service implementations and patterns
    // Maps keyword processing algorithms
}
```

#### Proxy Management Domain
```go
func GetProxyManagementServices() ([]models.Service, error) {
    // Analyzes internal/proxymanager directory
    // Extracts proxy pool management strategies
    // Maps proxy health monitoring patterns
}
```

#### Cross-Domain Analysis
```go
func GetBusinessDomainCrossDependencies() (map[string]interface{}, error) {
    // Analyzes import relationships between domains
    // Maps shared utilities and common dependencies
    // Identifies tight coupling patterns
}
```

### Enhanced Analysis Tools

#### Sophisticated Dependency Analysis
```go
func GetEnhancedDependencies(backendPath string) (map[string]interface{}, error) {
    result := map[string]interface{}{
        "dependencies":                 getStandardDependencies(),
        "internalDependencies":         mapInternalServiceDeps(),
        "businessDomainDependencies":   mapDomainCrossDeps(),
    }
    return result, nil
}
```

#### Enhanced Security Analysis
```go
func GetEnhancedSecurityAnalysis(backendPath string) (map[string]interface{}, error) {
    analysis := map[string]interface{}{
        "securityPolicies":              extractSecurityPolicies(),
        "businessDomainAuthPatterns":    mapDomainAuthPatterns(),
        "enhancedAuthMechanisms":        analyzeAuthMechanisms(),
    }
    return analysis, nil
}
```

### Frontend Analysis Tools

#### API Client Analysis
```go
func GetFrontendAPIClientAnalysis(frontendRoot string) (map[string]interface{}, error) {
    analysis := map[string]interface{}{
        "status":           "sophisticated_typescript_client",
        "client_type":      detectClientType(),
        "api_classes":      extractAPIClasses(),
        "model_types":      extractModelTypes(),
        "business_domains": mapBusinessDomains(),
        "client_features":  analyzeClientFeatures(),
        "documentation":    findDocumentation(),
        "total_endpoints":  countEndpoints(),
    }
    return analysis, nil
}
```

## Advanced Features

### 1. Database Auto-Detection
The server automatically detects database configuration from multiple sources:
```go
func AutoDetectDatabaseConfig(projectRoot string) (string, error) {
    // 1. backend/config.json (preferred)
    // 2. .db_connection file
    // 3. DB_CONNECTION environment variable
}
```

### 2. Tool Dispatching
Sophisticated tool routing with comprehensive coverage:
```go
func (s *JSONRPCServer) handleCallTool(ctx context.Context, params json.RawMessage) (interface{}, error) {
    // Routes to 68+ different analysis tools
    // Provides business domain-aware analysis
    // Supports both frontend and backend analysis
}
```

### 3. Visual Context Integration
Integration with Playwright for UI analysis:
```go
func BrowseWithPlaywright(url string) (models.PlaywrightResult, error) {
    // Captures screenshots and HTML
    // Extracts component metadata
    // Maps components to source files
    // Builds visual context for UI testing
}
```

## Data Models

### Business Domain Models
```go
type BusinessDomain struct {
    Name        string   `json:"name"`
    Description string   `json:"description"`
    Path        string   `json:"path"`
    Services    []string `json:"services"`
    APIs        []string `json:"apis"`
}

type AdvancedTool struct {
    Name        string `json:"name"`
    Type        string `json:"type"`
    Category    string `json:"category"`
    Description string `json:"description"`
    Path        string `json:"path"`
}
```

### Enhanced Analysis Models
```go
type EnhancedAPISchema struct {
    OpenAPIVersion   string                 `json:"openapi_version"`
    Endpoints        []string               `json:"endpoints"`
    Methods          []string               `json:"methods"`
    SchemaFiles      []string               `json:"schema_files"`
    ValidationRules  map[string]interface{} `json:"validation_rules"`
}
```

## Performance Optimizations

### 1. Concurrent Analysis
Many analysis operations run concurrently to improve performance:
```go
// Concurrent service analysis across domains
var wg sync.WaitGroup
for _, domain := range domains {
    wg.Add(1)
    go func(d string) {
        defer wg.Done()
        analyzeDomain(d)
    }(domain)
}
wg.Wait()
```

### 2. Caching Strategy
Results are cached when appropriate to avoid redundant analysis:
```go
// Cache expensive AST parsing results
var astCache = make(map[string]*ast.File)
```

### 3. Efficient AST Processing
Uses Go's native AST processing with optimized traversal patterns:
```go
// Efficient AST walking with visitor pattern
ast.Inspect(file, func(n ast.Node) bool {
    // Process specific node types efficiently
    return true
})
```

## Security Considerations

### 1. Controlled Access
The server includes security flags for dangerous operations:
- `--allow-terminal`: Required for terminal command execution
- `--allow-mutation`: Required for file modification operations

### 2. Safe Defaults
By default, the server operates in read-only mode with comprehensive analysis capabilities.

### 3. Input Validation
All tool inputs are validated before processing to prevent injection attacks.

## Error Handling

### 1. Graceful Degradation
If certain analysis tools fail, others continue to function:
```go
if err := analyzeAdvancedFeature(); err != nil {
    log.Printf("Advanced analysis failed, continuing with basic analysis: %v", err)
    return basicAnalysis(), nil
}
```

### 2. Comprehensive Error Context
Error messages include sufficient context for debugging:
```go
return fmt.Errorf("failed to analyze business domain %s: %w", domain, err)
```

## Future Enhancements

- Real-time analysis with file system watching
- Advanced machine learning integration for pattern recognition
- Enhanced cross-language analysis (TypeScript ↔ Go type mapping)
- Automated refactoring suggestions based on domain analysis
- Performance profiling integration with analysis results