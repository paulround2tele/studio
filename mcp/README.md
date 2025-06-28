# Studio Full-Stack Analyzer

A comprehensive Model Context Protocol (MCP) server that provides deep analysis and tooling for full-stack applications, including frontend (React/Next.js), backend (Go), and database components.

## Overview

This MCP server has been upgraded from a simple backend analyzer to a complete full-stack development assistant that can:

- **Frontend Analysis**: React component trees, props/events, Next.js routes, test coverage
- **Backend Analysis**: Go services, APIs, models, handlers, middleware, database schemas
- **Database Analysis**: Schema inspection, performance metrics, relationship mapping
- **Cross-Stack Integration**: Contract validation, dependency analysis, performance bottlenecks

## Features

### Frontend Tools
- **Route Discovery**: Automatically detect Next.js app router routes
- **Component Analysis**: Extract React component dependencies and prop definitions
- **Test Coverage**: Generate test coverage reports and component-to-test mapping
- **UI Testing**: Generate automated test prompts with visual context

### Backend Tools
- **API Analysis**: OpenAPI schema extraction, route mapping, handler analysis
- **Service Architecture**: Service discovery, interface implementations, call graphs
- **Database Integration**: Schema analysis, performance metrics, query optimization
- **Code Quality**: Complexity analysis, security scanning, dependency tracking

### Cross-Stack Features
- **Contract Validation**: Ensure frontend/backend API contract alignment
- **Performance Analysis**: Detect bottlenecks across the entire stack
- **Dependency Management**: Track dependencies across frontend and backend
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

### Database Tools (7)
- `get_database_schema` - Extract complete database schema
- `get_database_stats` - Performance statistics and metrics
- `get_backend_openapi_schema` - OpenAPI specifications and route definitions
- `get_backend_data_models` - Data model definitions
- `get_backend_api_routes` - API route mappings
- `get_backend_api_endpoints` - All API endpoints (alias)
- `get_backend_request_handlers` - Request handlers

### Frontend Tools (5)
- `get_nextjs_app_routes` - Next.js app router routes
- `get_react_component_tree` - React component dependencies
- `get_react_component_props` - Component interface analysis
- `get_frontend_test_coverage` - Test coverage metrics
- `get_react_component_tests` - Component-to-test relationships

### Backend Services (10)
- `get_backend_services` - Service definitions
- `get_interfaces` - Interface specifications
- `find_implementations` - Interface implementations
- `get_call_graph` - Function call relationships
- `get_config` - Configuration analysis
- `get_middleware` - Middleware usage
- `get_env_vars` - Environment variables
- `search_code` - Code pattern search
- `get_package_structure` - Module organization
- `get_dependencies` - Dependency analysis

### WebSocket Tools (4)
- `get_websocket_endpoints` - WebSocket endpoints
- `get_websocket_handlers` - Message handlers
- `get_websocket_messages` - Message types
- `get_websocket_lifecycle` - Connection lifecycle

### Analysis Tools (8)
- `analyze_performance` - Performance bottlenecks
- `get_security_analysis` - Security vulnerabilities
- `validate_api_contracts` - Contract compliance
- `get_test_coverage` - Test coverage analysis
- `analyze_code_quality` - Code quality metrics
- `analyze_complexity` - Cyclomatic complexity
- `get_lint_diagnostics` - Linting results
- `get_dependency_graph` - Dependency visualization

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

## Recent Updates

- ✅ **Added Frontend Analysis**: Complete React/Next.js component analysis
- ✅ **Enhanced Database Tools**: Performance metrics and schema analysis  
- ✅ **Cross-Stack Validation**: Contract drift detection and API alignment
- ✅ **Visual Context**: UI component testing with screenshot analysis
- ✅ **Renamed from studio-backend-context**: Now reflects full-stack capabilities
- ✅ **Removed Legacy DomainFlow**: Cleaned up old tool references

## Development

- **Language**: Go 1.21+
- **Protocol**: JSON-RPC 2.0 over stdin/stdout
- **Database**: PostgreSQL with auto-detection
- **Frontend**: Next.js 14+ with App Router
- **Testing**: Integrated with Jest and Playwright
