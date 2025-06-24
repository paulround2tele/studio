# MCP Server for GitHub Copilot

This project is a Go-based MCP (Model Context Protocol) server designed to provide contextual information to GitHub Copilot. It analyzes a Go codebase and exposes several tool endpoints that Copilot can use to understand the project's structure, database schema, and more.

## Features

*   **Code Analysis:** Parses Go source code to extract information about models, routes, handlers, services, and interfaces.
*   **Database Schema Parsing:** Parses SQL schema files to understand the database structure.
*   **Extensible:** New tools can be easily added by implementing new handlers and registering new routes.

## Tool Endpoints

The following tool endpoints are available:

| Category          | Endpoint                      | Description                                                                 |
| ----------------- | ----------------------------- | --------------------------------------------------------------------------- |
| **Code**          | `/tools/get_models`               | Returns a list of Go structs (models) from the specified models directory.  |
|                   | `/tools/get_routes`               | Returns a list of API routes from the main application file.                |
|                   | `/tools/get_handlers`             | Returns a list of API handlers from the specified handlers directory.       |
|                   | `/tools/get_services`             | Returns a list of services (interfaces and implementations).                |
|                   | `/tools/get_interfaces`           | Returns a list of Go interfaces defined in the project.                     |
|                   | `/tools/find_implementations`     | Finds all types that implement a given interface.                           |
|                   | `/tools/get_call_graph`           | Returns the call graph for a specific function.                             |
| **Database**      | `/tools/get_database_schema`      | Returns the database schema by parsing a `schema.sql` file.                 |
| **Configuration** | `/tools/get_config`               | Returns the application's configuration schema.                             |
|                   | `/tools/get_middleware`           | Returns a list of available middleware.                                     |
| **WebSockets**    | `/tools/get_websocket_endpoints`  | Returns a list of WebSocket endpoints.                                      |
|                   | `/tools/get_websocket_handlers`   | Returns a list of WebSocket handlers.                                       |
|                   | `/tools/get_websocket_messages`   | Returns a list of WebSocket message structs.                                |
| **Search**        | `/tools/search_code`              | Searches for a pattern in the codebase.                                     |
|                   | `/tools/get_package_structure`    | Returns the package structure of the project.                               |
|                   | `/tools/get_dependencies`         | Returns a list of project dependencies from `go.mod`.                       |
|                   | `/tools/get_dependency_graph`     | Builds a package dependency graph (DOT format optional).                    |
|                   | `/tools/get_env_vars`             | Finds all usages of environment variables.                                  |
| **Business Logic**| `/tools/get_middleware_usage`     | Finds all routes that use a given middleware.                               |
|                   | `/tools/get_workflows`            | Identifies and lists potential business workflows.                          |
|                   | `/tools/get_business_rules`       | Lists functions that appear to contain business rules.                      |
|                   | `/tools/get_feature_flags`        | Lists all identified feature flags.                                         |
|                   | `/tools/find_by_type`             | Finds all variables or instances of a specific Go type.                     |
| **Advanced**      | `/tools/get_references`           | Finds all references to a function or type.                                 |
|                   | `/tools/get_change_impact`        | Analyzes the potential impact of a code change.                             |
|                   | `/tools/snapshot`                 | Creates a git stash snapshot of the current changes.                        |
|                   | `/tools/contract_drift_check`     | Checks for API contract drift between the code and the OpenAPI schema.      |
| **Interactive**   | `/tools/run_terminal_command`     | Executes a terminal command.                                                |
|                   | `/tools/apply_code_change`        | Applies a diff to a file.                                                   |