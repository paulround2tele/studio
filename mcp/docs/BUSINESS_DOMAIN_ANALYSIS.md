# Business Domain Analysis Documentation

## Overview

The MCP server now includes sophisticated business domain analysis capabilities that provide deep insights into the architectural organization and implementation patterns of domain-specific functionality.

## Business Domains Supported

### 1. Keyword Management Domain
Comprehensive analysis of keyword-related functionality including extraction, scanning, and management services.

#### Tools:
- **`get_keyword_extraction_services`**: Analyzes keyword extraction service implementations and patterns
- **`get_keyword_scanning_services`**: Analyzes keyword scanning service implementations and patterns  
- **`get_keyword_set_api_specs`**: Analyzes keyword-sets API specifications and endpoints

#### Use Cases:
- Understanding keyword processing pipeline architecture
- Analyzing keyword extraction algorithms and implementations
- Reviewing keyword-sets API design and endpoints
- Identifying performance bottlenecks in keyword processing

### 2. Proxy Management Domain
Advanced analysis of proxy pool management, rotation, and validation services.

#### Tools:
- **`get_proxy_management_services`**: Analyzes proxy management service implementations and patterns
- **`get_proxy_pool_api_specs`**: Analyzes proxy-pools API specifications and endpoints

#### Use Cases:
- Understanding proxy rotation and management strategies
- Analyzing proxy pool health monitoring
- Reviewing proxy-pools API design and endpoints
- Identifying proxy performance and reliability patterns

### 3. Cross-Domain Analysis
Sophisticated analysis of relationships and dependencies between business domains.

#### Tools:
- **`get_business_domains`**: Analyzes business domains within backend architecture
- **`get_business_domain_routes`**: API routes categorized by business domains
- **`get_business_domain_middleware`**: Domain-specific middleware analysis
- **`get_internal_service_dependencies`**: Dependencies between internal services
- **`get_business_domain_cross_dependencies`**: Cross-dependencies between domains

#### Use Cases:
- Understanding domain boundaries and responsibilities
- Analyzing cross-domain communication patterns
- Identifying tight coupling between domains
- Planning domain refactoring and separation

## Advanced Development Tooling

### Database Tooling Analysis
Comprehensive analysis of advanced database development tools.

#### Tools:
- **`get_advanced_tooling`**: Advanced development and database tooling
- **`get_database_tooling_analysis`**: Migration verifiers, schema validators, regression testers

#### Capabilities:
- Migration verification tooling analysis
- Schema validation tool assessment
- Regression testing framework analysis
- Database performance optimization tools

### Enhanced Analysis Tools
Sophisticated analysis with business domain awareness.

#### Tools:
- **`get_enhanced_dependencies`**: Enhanced dependency analysis with domain mapping
- **`get_enhanced_security_analysis`**: Enhanced security analysis for business domains
- **`get_enhanced_api_schema`**: Enhanced API schema with business domain awareness

#### Features:
- Business domain-aware dependency mapping
- Security analysis with domain-specific patterns
- API schema analysis with business context
- Cross-domain security risk assessment

## Frontend API Client Analysis

### Sophisticated TypeScript Client Analysis
Advanced analysis of the frontend TypeScript API client structure.

#### Tools:
- **`frontend_api_client_analysis`**: Sophisticated TypeScript API client structure and capabilities

#### Analysis Includes:
- API client class structure and organization
- Model type definitions and relationships
- Business domain mapping in frontend client
- Documentation coverage and completeness
- Client feature capabilities and patterns

## Examples and Usage Patterns

### Example 1: Keyword Domain Analysis
```bash
# Analyze keyword extraction services
mcp-client call get_keyword_extraction_services

# Review keyword-sets API specifications
mcp-client call get_keyword_set_api_specs

# Analyze keyword scanning patterns
mcp-client call get_keyword_scanning_services
```

### Example 2: Cross-Domain Dependency Analysis
```bash
# Get overview of business domains
mcp-client call get_business_domains

# Analyze cross-domain dependencies
mcp-client call get_business_domain_cross_dependencies

# Review domain-specific routes
mcp-client call get_business_domain_routes
```

### Example 3: Advanced Tooling Assessment
```bash
# Analyze database tooling
mcp-client call get_database_tooling_analysis

# Review enhanced dependencies
mcp-client call get_enhanced_dependencies

# Assess security with domain awareness
mcp-client call get_enhanced_security_analysis
```

## Integration with Existing Tools

The business domain analysis tools integrate seamlessly with existing MCP capabilities:

- **Performance Analysis**: Business domain-aware performance bottleneck detection
- **Security Analysis**: Domain-specific security pattern assessment
- **Dependency Management**: Enhanced cross-domain dependency tracking
- **API Contract Validation**: Business domain-aware contract compliance

## Benefits

1. **Domain-Driven Architecture Insights**: Understand how business domains are organized and implemented
2. **Cross-Domain Impact Analysis**: Assess the impact of changes across business domains
3. **Sophisticated Tooling Assessment**: Analyze advanced development and database tools
4. **Enhanced Security Awareness**: Domain-specific security pattern analysis
5. **Improved API Design**: Business domain-aware API schema analysis

## Future Enhancements

- Additional business domain support as they are identified
- Enhanced cross-domain communication pattern analysis
- Advanced domain boundary optimization recommendations
- Automated domain refactoring suggestions