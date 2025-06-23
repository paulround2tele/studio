import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { BACKEND_MODELS_CONTEXT, BACKEND_DATA_FLOW_PATTERNS, BACKEND_VALIDATION_RULES } from "../resources/backend-models-context.js";
import { BACKEND_SERVICES_CONTEXT } from "../resources/backend-services-context.js";
import { BACKEND_API_CONTEXT } from "../resources/backend-api-context.js";
import { DATABASE_SCHEMA_CONTEXT } from "../resources/database-schema-context.js";
import { BACKEND_ARCHITECTURE_CONTEXT } from "../resources/backend-architecture-context.js";

/**
 * Backend Context Analyzer Tool
 * 
 * Analyzes and provides comprehensive insights about the Go backend architecture,
 * models, services, API endpoints, and database schema that serve as the source
 * of truth for the entire DomainFlow system.
 */

export interface BackendAnalysisRequest {
  operation: 
    | "analyze_models"           // Analyze Go models and enums
    | "analyze_services"         // Analyze service layer architecture  
    | "analyze_api"              // Analyze REST API endpoints
    | "analyze_database"         // Analyze database schema
    | "analyze_architecture"     // Analyze overall backend architecture
    | "analyze_data_flow"        // Analyze data flow patterns
    | "analyze_validation"       // Analyze validation rules
    | "analyze_dependencies"     // Analyze component dependencies
    | "analyze_performance"      // Analyze performance characteristics
    | "analyze_security"         // Analyze security implementation
    | "find_inconsistencies"     // Find potential inconsistencies
    | "suggest_improvements";    // Suggest architectural improvements
  
  scope?: string;                // Specific scope to analyze
  includeExamples?: boolean;     // Include implementation examples
  includeMetrics?: boolean;      // Include performance metrics
  format?: "detailed" | "summary" | "checklist";
}

export interface BackendAnalysisResult {
  operation: string;
  scope: string;
  analysis: {
    overview: string;
    keyFindings: string[];
    details: Record<string, any>;
    examples?: string[];
    metrics?: Record<string, any>;
    recommendations?: string[];
    potentialIssues?: string[];
  };
  metadata: {
    analysisTimestamp: string;
    contextVersion: string;
    confidence: number;
  };
}

export const backendContextAnalyzer: Tool = {
  name: "backend_context_analyzer",
  description: "Analyzes Go backend architecture, models, services, API, and database schema",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: [
          "analyze_models", "analyze_services", "analyze_api", "analyze_database",
          "analyze_architecture", "analyze_data_flow", "analyze_validation",
          "analyze_dependencies", "analyze_performance", "analyze_security",
          "find_inconsistencies", "suggest_improvements"
        ],
        description: "Type of backend analysis to perform"
      },
      scope: {
        type: "string",
        description: "Specific scope to analyze (e.g., 'campaigns', 'personas', 'authentication')"
      },
      includeExamples: {
        type: "boolean",
        description: "Include implementation examples in the analysis",
        default: false
      },
      includeMetrics: {
        type: "boolean", 
        description: "Include performance metrics in the analysis",
        default: false
      },
      format: {
        type: "string",
        enum: ["detailed", "summary", "checklist"],
        description: "Format of the analysis output",
        default: "detailed"
      }
    },
    required: ["operation"]
  }
};

export async function executeBackendContextAnalyzer(args: BackendAnalysisRequest): Promise<BackendAnalysisResult> {
  const { operation, scope = "all", includeExamples = false, includeMetrics = false, format = "detailed" } = args;

  let analysis: BackendAnalysisResult["analysis"];

  switch (operation) {
    case "analyze_models":
      analysis = analyzeModels(scope, includeExamples);
      break;
    
    case "analyze_services":
      analysis = analyzeServices(scope, includeExamples, includeMetrics);
      break;
      
    case "analyze_api":
      analysis = analyzeAPI(scope, includeExamples);
      break;
      
    case "analyze_database":
      analysis = analyzeDatabase(scope, includeExamples);
      break;
      
    case "analyze_architecture":
      analysis = analyzeArchitecture(scope, includeExamples);
      break;
      
    case "analyze_data_flow":
      analysis = analyzeDataFlow(scope, includeExamples);
      break;
      
    case "analyze_validation":
      analysis = analyzeValidation(scope, includeExamples);
      break;
      
    case "analyze_dependencies":
      analysis = analyzeDependencies(scope, includeExamples);
      break;
      
    case "analyze_performance":
      analysis = analyzePerformance(scope, includeMetrics);
      break;
      
    case "analyze_security":
      analysis = analyzeSecurity(scope, includeExamples);
      break;
      
    case "find_inconsistencies":
      analysis = findInconsistencies(scope);
      break;
      
    case "suggest_improvements":
      analysis = suggestImprovements(scope);
      break;
      
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  // Format the analysis based on requested format
  if (format === "summary") {
    analysis = formatSummary(analysis);
  } else if (format === "checklist") {
    analysis = formatChecklist(analysis);
  }

  return {
    operation,
    scope,
    analysis,
    metadata: {
      analysisTimestamp: new Date().toISOString(),
      contextVersion: "1.0.0",
      confidence: 0.95
    }
  };
}

function analyzeModels(scope: string, includeExamples: boolean) {
  const models = BACKEND_MODELS_CONTEXT;
  
  return {
    overview: "Go backend models define the source of truth for all data structures, enums, and business entities in DomainFlow",
    keyFindings: [
      "9 core enum types covering all business domains",
      "Comprehensive campaign lifecycle with 9 status states",
      "Dual persona system for DNS and HTTP validation",
      "4 validation status hierarchies for different validation types",
      "Complex configuration structures for DNS and HTTP personas"
    ],
    details: {
      enums: {
        campaignTypes: Object.keys(models.campaignTypes).length,
        campaignStatuses: Object.keys(models.campaignStatuses).length,
        personaTypes: Object.keys(models.personaTypes).length,
        validationStatuses: Object.keys(models.validationStatuses).length
      },
      dataFlow: BACKEND_DATA_FLOW_PATTERNS.campaignOrchestration,
      validationRules: BACKEND_VALIDATION_RULES.campaignValidation
    },
    examples: includeExamples ? [
      "Campaign Type Enum: domain_generation, dns_validation, http_keyword_validation",
      "Campaign Status Flow: pending → queued → running → completed",
      "DNS Config: resolvers, timeouts, rate limits, concurrency settings",
      "HTTP Config: user agents, headers, TLS settings, anti-detection features"
    ] : undefined,
    recommendations: [
      "Ensure enum consistency across TypeScript frontend and Go backend",
      "Implement validation for complex JSONB configuration structures",
      "Consider enum versioning strategy for backward compatibility",
      "Add comprehensive validation rules for persona configurations"
    ]
  };
}

function analyzeServices(scope: string, includeExamples: boolean, includeMetrics: boolean) {
  const services = BACKEND_SERVICES_CONTEXT;
  
  return {
    overview: "Service layer implements core business logic with orchestration, domain generation, DNS validation, and HTTP keyword validation",
    keyFindings: [
      "Campaign orchestrator coordinates 3-phase execution workflow",
      "Domain generation service supports 4 different algorithms",
      "DNS service handles concurrent queries with persona rotation",
      "HTTP service implements advanced anti-detection techniques",
      "State machine pattern ensures predictable campaign transitions"
    ],
    details: {
      orchestration: services.serviceArchitecture.campaignOrchestratorService,
      domainGeneration: services.serviceArchitecture.domainGenerationService,
      dnsValidation: services.serviceArchitecture.dnsService,
      httpValidation: services.serviceArchitecture.httpKeywordService,
      stateManagement: services.serviceArchitecture.campaignStateMachine
    },
    examples: includeExamples ? [
      "Orchestrator creates campaign → validates config → starts workers",
      "Domain generation: keyword_substitution + tld_variation + filtering",
      "DNS validation: concurrent queries + resolver failover + caching",
      "HTTP validation: stealth headers + proxy rotation + content analysis"
    ] : undefined,
    metrics: includeMetrics ? services.servicePerformance : undefined,
    recommendations: [
      "Implement comprehensive monitoring for service performance",
      "Add circuit breaker patterns for external dependencies", 
      "Consider implementing service discovery for horizontal scaling",
      "Add detailed service health checks with dependency validation"
    ]
  };
}

function analyzeAPI(scope: string, includeExamples: boolean) {
  const api = BACKEND_API_CONTEXT;
  
  return {
    overview: "RESTful API built on Gin framework with session-based authentication and comprehensive RBAC",
    keyFindings: [
      "7 main endpoint categories covering all functional areas",
      "Session-based authentication with browser fingerprinting",
      "Comprehensive RBAC with granular permissions",
      "Consistent error handling with structured responses",
      "Rate limiting and security middleware throughout"
    ],
    details: {
      architecture: api.apiArchitecture,
      endpoints: api.endpointCategories,
      security: api.securityPatterns,
      errorHandling: api.errorHandling
    },
    examples: includeExamples ? [
      "POST /api/v1/campaigns - Create campaign with validation",
      "GET /api/v1/campaigns/:id/status - Real-time status updates",
      "POST /api/v1/personas/:id/test - Test persona configuration",
      "POST /api/v1/auth/login - Session creation with fingerprinting"
    ] : undefined,
    recommendations: [
      "Implement OpenAPI specification for API documentation",
      "Add API versioning strategy for backward compatibility",
      "Consider implementing GraphQL for complex queries",
      "Add comprehensive API testing and contract validation"
    ]
  };
}

function analyzeDatabase(scope: string, includeExamples: boolean) {
  const db = DATABASE_SCHEMA_CONTEXT;
  
  return {
    overview: "PostgreSQL schema with auth and public schemas, optimized for read-heavy workloads with comprehensive indexing",
    keyFindings: [
      "14 core tables across authentication and business domains",
      "Comprehensive RBAC implementation with roles and permissions",
      "Advanced session management with fingerprinting",
      "Campaign-centric design with job tracking and domain lifecycle",
      "Performance optimized with strategic indexing and partitioning"
    ],
    details: {
      architecture: db.databaseArchitecture,
      coreSchema: db.coreTableStructures,
      relationships: db.relationshipPatterns,
      constraints: db.constraintsAndBusinessRules,
      performance: db.performanceOptimization
    },
    examples: includeExamples ? [
      "auth.users with security features and login tracking",
      "campaigns with JSONB config and hierarchical relationships",
      "domains with cross-campaign inheritance and scoring",
      "personas with type-specific JSONB configuration"
    ] : undefined,
    recommendations: [
      "Implement automated database migration testing",
      "Add comprehensive database monitoring and alerting",
      "Consider implementing read replicas for analytics",
      "Add automated backup verification and recovery testing"
    ]
  };
}

function analyzeArchitecture(scope: string, includeExamples: boolean) {
  const arch = BACKEND_ARCHITECTURE_CONTEXT;
  
  return {
    overview: "Layered architecture with service-oriented design, emphasizing separation of concerns and scalability",
    keyFindings: [
      "4-layer architecture: Presentation, Business, Persistence, Infrastructure",
      "Service-oriented design with dependency injection",
      "Comprehensive security with authentication and authorization",
      "Performance optimized with concurrency and caching strategies",
      "Resilience patterns with circuit breakers and graceful degradation"
    ],
    details: {
      layers: arch.layerArchitecture,
      patterns: arch.designPatterns,
      security: arch.securityArchitecture,
      performance: arch.performanceArchitecture,
      resilience: arch.resilienceArchitecture
    },
    examples: includeExamples ? [
      "API Layer: Gin handlers with middleware pipeline",
      "Service Layer: Business logic with state machines",
      "Persistence Layer: Repository pattern with PostgreSQL",
      "Infrastructure: Configuration, logging, monitoring"
    ] : undefined,
    recommendations: [
      "Implement comprehensive observability with distributed tracing",
      "Add chaos engineering for resilience testing",
      "Consider implementing event sourcing for audit trails",
      "Add automated architecture compliance testing"
    ]
  };
}

function analyzeDataFlow(scope: string, includeExamples: boolean) {
  const dataFlow = BACKEND_DATA_FLOW_PATTERNS;
  
  return {
    overview: "3-phase campaign orchestration with domain lifecycle management and cross-campaign inheritance",
    keyFindings: [
      "Sequential phase execution: Domain Generation → DNS → HTTP validation",
      "Domain status evolution through 5 distinct states",
      "Cross-campaign domain inheritance for qualified leads",
      "Service dependencies clearly defined with interface contracts",
      "State machine controls campaign transitions with validation"
    ],
    details: {
      campaignFlow: dataFlow.campaignOrchestration,
      domainLifecycle: dataFlow.domainStatusFlow,
      serviceDependencies: dataFlow.serviceDependencies
    },
    examples: includeExamples ? [
      "Phase 1: Generate domains based on keyword rules",
      "Phase 2: Validate DNS resolution with persona rotation",
      "Phase 3: Fetch content and score keywords for qualification",
      "Domain inheritance: qualified domains available for new campaigns"
    ] : undefined,
    recommendations: [
      "Implement comprehensive data lineage tracking",
      "Add real-time data flow monitoring and visualization",
      "Consider implementing event-driven architecture",
      "Add data quality validation at each phase transition"
    ]
  };
}

function analyzeValidation(scope: string, includeExamples: boolean) {
  const validation = BACKEND_VALIDATION_RULES;
  
  return {
    overview: "Comprehensive validation rules covering campaigns, personas, and proxies with business rule enforcement",
    keyFindings: [
      "Campaign validation ensures configuration consistency",
      "Persona validation enforces type-specific requirements",
      "Proxy validation includes protocol and connectivity checks",
      "Resource limits prevent abuse and ensure performance",
      "Business rules enforce operational constraints"
    ],
    details: {
      campaignValidation: validation.campaignValidation,
      personaValidation: validation.personaValidation,
      proxyValidation: validation.proxyValidation
    },
    examples: includeExamples ? [
      "Campaign: max 10k domains, 1-10 keyword sets required",
      "DNS Persona: max 50 resolvers, 1-300s timeout range",
      "HTTP Persona: required User-Agent, max 50 headers",
      "Proxy: port 1-65535, supported protocols validation"
    ] : undefined,
    recommendations: [
      "Implement automated validation rule testing",
      "Add validation performance benchmarking",
      "Consider implementing custom validation DSL",
      "Add validation rule versioning and migration"
    ]
  };
}

function analyzeDependencies(scope: string, includeExamples: boolean) {
  const services = BACKEND_SERVICES_CONTEXT;
  const arch = BACKEND_ARCHITECTURE_CONTEXT;
  
  return {
    overview: "Clear service dependencies with interface-based contracts and layered separation of concerns",
    keyFindings: [
      "Campaign orchestrator depends on 3 specialized services",
      "Each service has clearly defined store dependencies",
      "Layer dependencies follow architectural boundaries",
      "External dependencies isolated through interfaces",
      "Dependency injection enables testing and flexibility"
    ],
    details: {
      serviceDependencies: services.serviceArchitecture,
      componentRelationships: arch.componentRelationships,
      layerDependencies: arch.layerArchitecture
    },
    examples: includeExamples ? [
      "CampaignOrchestrator → DomainGeneration + DNS + HTTP services",
      "DNSService → DNSValidator + PersonaManager + ProxyManager",
      "API Layer → Service Layer → Persistence Layer",
      "All services → Configuration + Logging infrastructure"
    ] : undefined,
    recommendations: [
      "Implement dependency injection container",
      "Add circular dependency detection",
      "Consider implementing service mesh for microservices",
      "Add automated dependency analysis and visualization"
    ]
  };
}

function analyzePerformance(scope: string, includeMetrics: boolean) {
  const services = BACKEND_SERVICES_CONTEXT;
  const arch = BACKEND_ARCHITECTURE_CONTEXT;
  
  return {
    overview: "Performance optimized architecture with concurrency, caching, and resource management strategies",
    keyFindings: [
      "Domain generation: 1000 domains/second throughput",
      "DNS validation: 50 queries/second per resolver",
      "HTTP validation: 10 requests/second per persona",
      "Goroutine-based concurrency with worker pools",
      "Comprehensive caching strategy across all layers"
    ],
    details: {
      benchmarks: services.servicePerformance.benchmarks,
      concurrency: arch.performanceArchitecture.concurrencyModel,
      resourceManagement: arch.performanceArchitecture.resourceManagement,
      caching: arch.performanceArchitecture.cachingStrategy
    },
    metrics: includeMetrics ? {
      throughput: services.servicePerformance.monitoringMetrics.throughput,
      latency: services.servicePerformance.monitoringMetrics.latency,
      resources: services.servicePerformance.monitoringMetrics.resources
    } : undefined,
    recommendations: [
      "Implement comprehensive performance monitoring",
      "Add automated performance regression testing",
      "Consider implementing distributed caching",
      "Add performance budgets and SLA monitoring"
    ]
  };
}

function analyzeSecurity(scope: string, includeExamples: boolean) {
  const api = BACKEND_API_CONTEXT;
  const arch = BACKEND_ARCHITECTURE_CONTEXT;
  
  return {
    overview: "Comprehensive security implementation with authentication, authorization, data protection, and stealth features",
    keyFindings: [
      "Session-based authentication with browser fingerprinting",
      "RBAC with granular permissions and role inheritance",
      "Data protection with encryption at rest and in transit",
      "Advanced stealth features for anti-detection",
      "Rate limiting and DDoS protection throughout"
    ],
    details: {
      authentication: arch.securityArchitecture.authentication,
      authorization: arch.securityArchitecture.authorization,
      dataProtection: arch.securityArchitecture.dataProtection,
      stealthFeatures: arch.securityArchitecture.stealthAndAntiDetection
    },
    examples: includeExamples ? [
      "Session: encrypted tokens + IP + browser fingerprinting",
      "RBAC: resource-action permissions with role inheritance",
      "Encryption: AES-256-GCM at rest, TLS 1.3 in transit",
      "Stealth: browser simulation + header randomization + proxy rotation"
    ] : undefined,
    recommendations: [
      "Implement security scanning and vulnerability assessment",
      "Add automated security testing in CI/CD pipeline",
      "Consider implementing zero-trust security model",
      "Add comprehensive security monitoring and alerting"
    ]
  };
}

function findInconsistencies(scope: string) {
  return {
    overview: "Analysis of potential inconsistencies between backend implementation and other system components",
    keyFindings: [
      "Enum consistency between Go backend and TypeScript frontend",
      "API contract alignment with OpenAPI specifications",
      "Database schema synchronization with Go models",
      "Configuration validation across different components"
    ],
    details: {
      enumConsistency: "Backend enums should match frontend TypeScript enums exactly",
      apiContracts: "REST API implementation should match OpenAPI specs",
      schemaSync: "Database schema should reflect Go model definitions",
      configValidation: "Configuration structures should be validated consistently"
    },
    potentialIssues: [
      "Campaign status enums might differ between frontend and backend",
      "API response formats might not match TypeScript interfaces", 
      "Database column types might not align with Go struct tags",
      "Validation rules might be inconsistent across layers"
    ],
    recommendations: [
      "Implement automated cross-layer consistency checking",
      "Add contract testing between frontend and backend",
      "Implement schema migration validation with model checking",
      "Add automated configuration validation testing"
    ]
  };
}

function suggestImprovements(scope: string) {
  return {
    overview: "Architectural improvement suggestions for enhanced maintainability, performance, and scalability",
    keyFindings: [
      "Strong foundation with room for observability improvements",
      "Performance optimizations possible with distributed caching",
      "Security enhancements through additional monitoring",
      "Scalability improvements with microservices architecture"
    ],
    details: {
      observability: "Add distributed tracing and comprehensive metrics",
      performance: "Implement Redis caching and connection pooling",
      security: "Enhance monitoring and threat detection",
      scalability: "Consider microservices and event-driven architecture"
    },
    recommendations: [
      "Implement OpenTelemetry for distributed tracing",
      "Add Redis for distributed caching and session storage",
      "Implement comprehensive logging and monitoring",
      "Consider event-driven architecture for loose coupling",
      "Add automated testing for all architectural components",
      "Implement chaos engineering for resilience testing",
      "Add performance budgets and SLA monitoring",
      "Consider implementing GraphQL for flexible API queries"
    ]
  };
}

function formatSummary(analysis: any) {
  return {
    overview: analysis.overview,
    keyFindings: analysis.keyFindings.slice(0, 3),
    details: Object.keys(analysis.details).reduce((acc, key) => {
      acc[key] = typeof analysis.details[key] === 'object' ? 
        Object.keys(analysis.details[key]).length + " items" : 
        analysis.details[key];
      return acc;
    }, {} as any),
    recommendations: analysis.recommendations?.slice(0, 3)
  };
}

function formatChecklist(analysis: any) {
  return {
    overview: analysis.overview,
    keyFindings: analysis.keyFindings.map((finding: string) => `✓ ${finding}`),
    details: {
      checklist: [
        ...analysis.recommendations?.map((rec: string) => `□ ${rec}`) || [],
        ...analysis.potentialIssues?.map((issue: string) => `⚠ ${issue}`) || []
      ]
    }
  };
}