# Studio Full-Stack Analyzer

A comprehensive Model Context Protocol (MCP) server that provides deep analysis and tooling for full-stack applications, including frontend (React/Next.js), backend (Go), and database components with sophisticated business domain awareness.

## Overview

This MCP server is a complete full-stack development assistant with advanced business domain analysis capabilities:

- **Frontend Analysis**: Sophisticated TypeScript API client analysis, React component trees, Next.js routes, test coverage
- **Backend Analysis**: Business domain-aware Go services, APIs, middleware, advanced tooling, database schemas
- **Business Domain Intelligence**: Keyword management, proxy pool analysis, cross-domain dependencies
- **Database Analysis**: Schema inspection, performance metrics, advanced tooling analysis
- **Cross-Stack Integration**: Contract validation, dependency analysis, performance bottlenecks

## Features

### Frontend Tools
- **Advanced API Client Analysis**: Sophisticated TypeScript client structure analysis with business domain mapping
- **Route Discovery**: Automatically detect Next.js app router routes
- **Component Analysis**: Extract React component dependencies and prop definitions
- **Test Coverage**: Generate test coverage reports and component-to-test mapping
- **UI Testing**: Generate automated test prompts with visual context

### Backend Tools
- **Business Domain Analysis**: Comprehensive analysis of keyword-sets, proxy-pools, and domain-specific services
- **API Analysis**: Enhanced OpenAPI schema extraction with business domain awareness
- **Service Architecture**: Service discovery, interface implementations, call graphs with domain mapping
- **Advanced Tooling**: Database migration verifiers, schema validators, regression testers
- **Code Quality**: Complexity analysis, security scanning, dependency tracking

### Business Domain Features
- **Keyword Management**: Extraction and scanning service analysis
- **Proxy Pool Management**: Advanced proxy management service analysis
- **Cross-Domain Dependencies**: Analyze dependencies between business domains
- **Domain-Specific Middleware**: Business domain middleware analysis and patterns

### Cross-Stack Features
- **Enhanced Contract Validation**: Business domain-aware API contract alignment
- **Performance Analysis**: Detect bottlenecks across the entire stack
- **Dependency Management**: Enhanced dependency tracking with business domain mapping
- **Terminal Integration**: Execute commands and scripts safely

## Architecture

```
┌─────────────────┐    JSON-RPC 2.0    ┌──────────────────┐
│  VS Code        │◄──────────────────►│  MCP Server      │
│  Copilot Chat   │    (stdin/stdout)  │  (Go)            │
└─────────────────┘                    └──────────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────┐
                                │    Full-Stack Analysis    │
                                │  ┌─────────────────────┐  │
                                │  │  Frontend (Next.js) │  │
                                │  │  - Components       │  │
                                │  │  - Routes           │  │
                                │  │  - Tests            │  │
                                │  └─────────────────────┘  │
                                │  ┌─────────────────────┐  │
                                │  │  Backend (Go)       │  │
                                │  │  - APIs             │  │
                                │  │  - Services         │  │
                                │  │  - Handlers         │  │
                                │  └─────────────────────┘  │
                                │  ┌─────────────────────┐  │
                                │  │  Database           │  │
                                │  │  - Schema           │  │
                                │  │  - Performance      │  │
                                │  │  - Metrics          │  │
                                │  └─────────────────────┘  │
                                └───────────────────────────┘
```

## Tool Categories

**Total: 68+ Sophisticated Analysis Tools**

### Database Tools (3)
- `get_database_schema` - Extract complete database schema with indexes
- `get_database_stats` - Performance statistics and metrics
- `get_backend_openapi_schema` - OpenAPI specifications and route definitions

### Code Analysis Tools (7)
- `get_backend_data_models` - Data model definitions and structures
- `get_backend_api_routes` - API route mappings and endpoints
- `get_backend_api_endpoints` - All API endpoints (alias)
- `get_backend_request_handlers` - Request handlers analysis
- `get_backend_services` - Service definitions and interfaces
- `get_interfaces` - Interface specifications and methods
- `find_implementations` - Interface implementations discovery
- `get_call_graph` - Function call relationships analysis

### Frontend Tools (6)
- `frontend_nextjs_app_routes` - Next.js app router routes discovery
- `frontend_react_component_tree` - React component dependencies and tree
- `frontend_react_component_props` - Component interface and props analysis
- `frontend_test_coverage` - Frontend test coverage metrics
- `frontend_react_component_tests` - Component-to-test relationships
- `frontend_api_client_analysis` - **NEW**: Sophisticated TypeScript API client analysis

### Business Domain Tools (16) **NEW**
#### Keyword Management Domain
- `get_keyword_extraction_services` - Keyword extraction service implementations
- `get_keyword_scanning_services` - Keyword scanning service implementations
- `get_keyword_set_api_specs` - Keyword-sets API specifications and endpoints

#### Proxy Management Domain
- `get_proxy_management_services` - Proxy management service implementations
- `get_proxy_pool_api_specs` - Proxy-pools API specifications and endpoints

#### Business Domain Analysis
- `get_business_domains` - Analyze business domains within backend architecture
- `get_business_domain_routes` - API routes categorized by business domains
- `get_business_domain_middleware` - Domain-specific middleware analysis
- `get_internal_service_dependencies` - Dependencies between internal services
- `get_business_domain_cross_dependencies` - Cross-dependencies between domains

#### Advanced Development Tooling
- `get_advanced_tooling` - Advanced development and database tooling
- `get_database_tooling_analysis` - Migration verifiers, schema validators

#### Enhanced Analysis
- `get_enhanced_dependencies` - Enhanced dependency analysis with domain mapping
- `get_enhanced_security_analysis` - Enhanced security analysis for business domains
- `get_enhanced_api_schema` - Enhanced API schema with business domain awareness

### Configuration Tools (4)
- `get_config` - Configuration analysis and structure
- `get_middleware` - Middleware usage and configuration
- `get_env_vars` - Environment variables analysis
- `trace_middleware_flow` - Middleware execution pipeline tracing

### Search Tools (4)
- `search_code` - Code pattern search and implementations
- `get_package_structure` - Module organization and structure
- `get_dependencies` - Project dependencies and relationships
- `get_dependency_graph` - Package dependency visualization

### WebSocket Tools (5)
- `get_websocket_endpoints` - WebSocket endpoints and configurations
- `get_websocket_handlers` - Message handlers analysis
- `get_websocket_messages` - Message types and structures
- `get_websocket_lifecycle` - Connection lifecycle and state management
- `test_websocket_flow` - WebSocket connectivity and flow testing

### Business Logic Tools (6)
- `get_middleware_usage` - Middleware usage patterns and analysis
- `get_workflows` - Business workflows and processes
- `get_business_rules` - Business rules and validation logic
- `get_feature_flags` - Feature flags and configurations
- `get_campaign_pipeline` - Campaign pipeline status analysis

### Analysis Tools (8)
- `analyze_performance` - Performance bottlenecks detection
- `get_security_analysis` - Security vulnerabilities and analysis
- `validate_api_contracts` - Contract compliance validation
- `get_test_coverage` - Test coverage analysis and metrics
- `analyze_code_quality` - Code quality metrics and technical debt
- `analyze_complexity` - Cyclomatic complexity analysis
- `get_lint_diagnostics` - Linting results and diagnostics
- `get_dependency_graph` - Dependency visualization and analysis

### Advanced Tools (5)
- `find_by_type` - Find code elements by type
- `get_references` - References and usages of code elements
- `get_change_impact` - Impact analysis of code changes
- `snapshot` - Create codebase state snapshots
- `contract_drift_check` - API contract drift detection

### Interactive Tools (11)
- `run_terminal_command` - Execute terminal commands safely
- `apply_code_change` - Apply code changes using diff/patch
- `browse_with_playwright` - Browser automation with screenshots
- `get_latest_screenshot` - Retrieve most recent Playwright screenshot
- `get_ui_metadata` - Extract component metadata from HTML
- `get_ui_code_map` - Map components to React source files
- `get_visual_context` - Comprehensive UI analysis with visual context
- `generate_ui_test_prompt_with_actions` - UI testing with scripted actions
- `generate_ui_test_prompt` - Automated test prompt generation

## Installation & Usage

1. **Build the server**:
   ```bash
   cd mcp
   make build
   ```

2. **Configure VS Code** (already configured in `.vscode/mcp.json`):
   ```json
   {
     "servers": {
       "studio-fullstack-analyzer": {
         "command": "/home/vboxuser/studio/mcp/bin/mcp-server",
         "args": ["-allow-terminal", "-allow-mutation"],
         "cwd": "/home/vboxuser/studio"
       }
     }
   }
   ```

3. **Use in VS Code**:
   - Open GitHub Copilot Chat
   - Ask questions about your codebase
   - The MCP tools will automatically provide context

## Recent Major Updates

- ✅ **Added 16 Business Domain Tools**: Comprehensive keyword-sets and proxy-pools analysis
- ✅ **Enhanced Frontend API Client Analysis**: Sophisticated TypeScript client structure analysis
- ✅ **Advanced Business Domain Intelligence**: Cross-domain dependencies and middleware analysis
- ✅ **Database Advanced Tooling**: Migration verifiers, schema validators, regression testers
- ✅ **Enhanced Security & Dependency Analysis**: Business domain-aware security and dependency mapping
- ✅ **Sophisticated Route Analysis**: Business domain categorization of API routes
- ✅ **Complete Full-Stack Integration**: Mature frontend and backend analysis capabilities
- ✅ **68+ Total Tools**: Significant expansion from 44+ to comprehensive analysis suite

## Development

- **Language**: Go 1.21+
- **Protocol**: JSON-RPC 2.0 over stdin/stdout
- **Database**: PostgreSQL with auto-detection
- **Frontend**: Next.js 14+ with App Router
- **Testing**: Integrated with Jest and Playwright
