# MCP Server for GitHub Copilot

This project is a Go-based MCP (Model Context Protocol) server designed to provide contextual information to GitHub Copilot. It analyzes a Go codebase and exposes several tool endpoints that Copilot can use to understand the project's structure, database schema, and more.

## Features

*   **Code Analysis:** Parses Go source code to extract information about models, routes, handlers, services, and interfaces.
*   **Database Schema Parsing:** Parses SQL schema files to understand the database structure.
*   **Extensible:** New tools can be easily added by implementing new handlers and registering new routes.

## Tool Endpoints

The following tool endpoints are available (44 total):

| Category          | Endpoint                      | Description                                                                 |
| ----------------- | ----------------------------- | --------------------------------------------------------------------------- |
| **Code**          | `/tools/get_models`               | Returns a list of Go structs (models) from the specified models directory.  |
|                   | `/tools/get_routes`               | Returns a list of API routes from the main application file.                |
|                   | `/tools/get_endpoints`            | Alias of `get_routes` providing all endpoints.                              |
|                   | `/tools/get_api_schema`           | Returns the OpenAPI schema and route definitions.                           |
|                   | `/tools/get_handlers`             | Returns a list of API handlers from the specified handlers directory.       |
|                   | `/tools/get_services`             | Returns a list of services (interfaces and implementations).                |
|                   | `/tools/get_interfaces`           | Returns a list of Go interfaces defined in the project.                     |
|                   | `/tools/find_implementations`     | Finds all types that implement a given interface.                           |
|                   | `/tools/get_call_graph`           | Returns the call graph for a specific function.                             |
| **Database**      | `/tools/get_database_schema`      | Returns the database schema by parsing a `schema.sql` file.                 |
|                   | `/tools/get_database_stats`       | Provides database performance statistics and metrics.                       |
| **Configuration** | `/tools/get_config`               | Returns the application's configuration schema.                             |
|                   | `/tools/get_middleware`           | Returns a list of available middleware.                                     |
| **WebSockets**    | `/tools/get_websocket_endpoints`  | Returns a list of WebSocket endpoints.                                      |
|                   | `/tools/get_websocket_handlers`   | Returns a list of WebSocket handlers.                                       |
|                   | `/tools/get_websocket_messages`   | Returns a list of WebSocket message structs.                                |
|                   | `/tools/get_websocket_lifecycle`  | Returns WebSocket connection lifecycle details.                             |
|                   | `/tools/test_websocket_flow`      | Tests WebSocket message flow and connectivity.                              |
| **Search**        | `/tools/search_code`              | Searches for a pattern in the codebase.                                     |
|                   | `/tools/get_package_structure`    | Returns the package structure of the project.                               |
|                   | `/tools/get_dependencies`         | Returns a list of project dependencies from `go.mod`.                       |
|                   | `/tools/get_dependency_graph`     | Builds a package dependency graph (DOT format optional).                    |
|                   | `/tools/get_env_vars`             | Finds all usages of environment variables.                                  |
| **Business Logic**| `/tools/get_middleware_usage`     | Finds all routes that use a given middleware.                               |
|                   | `/tools/get_workflows`            | Identifies and lists potential business workflows.                          |
|                   | `/tools/trace_middleware_flow`    | Traces the execution path through middleware layers.                        |
|                   | `/tools/get_business_rules`       | Lists functions that appear to contain business rules.                      |
|                   | `/tools/get_feature_flags`        | Lists all identified feature flags.                                         |
|                   | `/tools/get_campaign_pipeline`    | Shows the campaign's pipeline steps and statuses.                           |
|                   | `/tools/find_by_type`             | Finds all variables or instances of a specific Go type.                     |
| **Advanced**      | `/tools/get_references`           | Finds all references to a function or type.                                 |
|                   | `/tools/get_change_impact`        | Analyzes the potential impact of a code change.                             |
|                   | `/tools/snapshot`                 | Creates a git stash snapshot of the current changes.                        |
|                   | `/tools/contract_drift_check`     | Checks for API contract drift between the code and the OpenAPI schema.      |
|                   | `/tools/get_test_coverage`        | Provides test coverage metrics.                                            |
|                   | `/tools/analyze_code_quality`     | Analyzes code quality and technical debt.                                  |
|                   | `/tools/analyze_performance`      | Analyzes application performance bottlenecks.                               |
|                   | `/tools/get_security_analysis`    | Performs a security analysis of the codebase.                               |
|                   | `/tools/validate_api_contracts`   | Validates API contracts and OpenAPI specifications.                         |
|                   | `/tools/analyze_complexity`       | Reports cyclomatic complexity for functions using gocyclo.                  |
|                   | `/tools/get_lint_diagnostics`  | Runs golangci-lint or staticcheck and go build. |
| **Interactive**   | `/tools/run_terminal_command`     | Executes a terminal command.                                                |
|                   | `/tools/apply_code_change`        | Applies a diff to a file.                                                   |
|                   | `/tools/browse_with_playwright`   | Opens a URL with Playwright and captures a screenshot.                      |
|                   | `/tools/get_latest_screenshot`    | Returns the last Playwright screenshot (path or base64).                    |
|                   | `/tools/get_ui_metadata`          | Extracts component metadata from the captured HTML.                          |
|                   | `/tools/get_ui_code_map`          | Maps UI components to React source files.                                   |
|                   | `/tools/get_visual_context`       | Runs Playwright and returns screenshot, metadata and code mapping.          |

### Complexity Analysis

The `analyze_complexity` endpoint runs `gocyclo` over the backend directory and
returns a list of functions with their cyclomatic complexity.

Example response snippet:

```json
[
  {"function": "handlers.CreateUser", "file": "internal/handlers/user.go", "line": 42, "complexity": 16}
]
```

### Campaign Pipeline

The `get_campaign_pipeline` endpoint returns the ordered steps for a campaign.

Example output:

```json
{
  "campaignId": "123e4567-e89b-12d3-a456-426614174000",
  "steps": [
    {"name": "domain_generation", "status": "completed", "startedAt": "2025-07-01T10:00:00Z", "finishedAt": "2025-07-01T10:05:00Z"},
    {"name": "dns_validation", "status": "running", "startedAt": "2025-07-01T10:05:01Z", "finishedAt": "0001-01-01T00:00:00Z"},
    {"name": "http_keyword_validation", "status": "pending", "startedAt": "0001-01-01T00:00:00Z", "finishedAt": "0001-01-01T00:00:00Z"}
  ]
}
```

Steps always appear in the sequence: domain generation → DNS validation → HTTP keyword analysis.
