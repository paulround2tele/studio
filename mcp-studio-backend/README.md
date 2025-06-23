# MCP Studio Backend Context Server

A comprehensive Model Context Protocol (MCP) server that provides Copilot with detailed context about the Studio Golang backend application.

## Overview

This MCP server helps Copilot understand the Studio backend by providing access to:

- **Data Models & Structures**: All Go structs, interfaces, types, and enums
- **API Endpoints**: REST API routes, handlers, and parameters  
- **Database Schema**: Table structures, relationships, and migrations
- **Business Logic**: Service layer functions and validation rules
- **Configuration**: Configuration structures and environment variables
- **Architecture Patterns**: Overall application architecture and design patterns

## Features

### Schema Introspection Tools
- `get_models` - Return all data models with fields, types, and validation tags
- `get_enums` - Return all enum types and their possible values
- `get_interfaces` - Return all interface definitions and methods
- `search_types` - Search for specific types or fields by name/pattern

### API Documentation Tools
- `get_endpoints` - Return all REST API endpoints with methods and paths
- `get_handlers` - Return handler function signatures and business logic
- `get_middleware` - Return middleware functions and their purposes
- `search_api` - Search API endpoints by path, method, or functionality

### Database Tools
- `get_tables` - Return database table structures and relationships
- `get_migrations` - Return migration history and schema changes
- `get_indexes` - Return database indexes and constraints
- `search_schema` - Search database schema by table/column names

### Business Logic Tools
- `get_services` - Return service layer functions and purposes
- `get_validators` - Return validation rules and business constraints
- `get_workflows` - Return campaign workflows and state transitions
- `search_logic` - Search business logic by functionality

### Configuration Tools
- `get_config` - Return configuration structures and documentation
- `get_env_vars` - Return environment variables and purposes
- `get_dependencies` - Return Go module dependencies and versions

### Code Navigation Tools
- `find_usage` - Find where specific types/functions are used
- `get_references` - Get cross-references between components
- `get_call_graph` - Get function call relationships

## Installation

1. **Build the MCP Server:**
   ```bash
   cd mcp-studio-backend
   go build -o mcp-server ./cmd/mcp-server
   ```

2. **Make it executable:**
   ```bash
   chmod +x mcp-server
   ```

## Usage

### Command Line Options

```bash
./mcp-server [OPTIONS]

Options:
  -backend-path string
        Path to the Studio backend codebase (default "../backend")
  -db-url string
        PostgreSQL database URL (optional)
  -help
        Show help information
```

### Environment Variables

- `DATABASE_URL` - PostgreSQL database URL (alternative to `-db-url`)

### Example Usage

```bash
# Basic usage (without database)
./mcp-server -backend-path=/path/to/studio/backend

# With database connection
./mcp-server \
  -backend-path=/path/to/studio/backend \
  -db-url='postgres://user:pass@localhost:5432/studio?sslmode=disable'

# Using environment variable for database
export DATABASE_URL='postgres://user:pass@localhost:5432/studio?sslmode=disable'
./mcp-server -backend-path=/path/to/studio/backend
```

## Integration with Copilot

### MCP Configuration

Add this server to your MCP configuration:

```json
{
  "mcpServers": {
    "studio-backend-context": {
      "command": "/path/to/mcp-studio-backend/mcp-server",
      "args": [
        "-backend-path=/path/to/studio/backend",
        "-db-url=postgres://user:pass@localhost:5432/studio"
      ]
    }
  }
}
```

### Tool Usage Examples

1. **Get all data models:**
   ```
   Use the get_models tool to show me all data structures
   ```

2. **Search for specific types:**
   ```
   Use search_types to find all models related to "campaign"
   ```

3. **Get API endpoints:**
   ```
   Use get_endpoints to show all REST API endpoints
   ```

4. **Search API by functionality:**
   ```
   Use search_api to find all endpoints related to "authentication"
   ```

5. **Get database schema:**
   ```
   Use get_tables to show the database structure
   ```

6. **Find usage of a type:**
   ```
   Use find_usage to see where the "Campaign" struct is used
   ```

## Architecture

The MCP server is built with the following components:

```
mcp-studio-backend/
├── cmd/mcp-server/          # Main server entry point
├── internal/
│   ├── analyzer/            # Code analysis and parsing
│   ├── handlers/            # MCP tool handlers
│   ├── models/              # MCP-specific data models
│   ├── parser/              # Go AST parsing utilities
│   └── server/              # MCP server implementation
├── pkg/studio/              # Studio backend integration
└── config.json             # MCP server configuration
```

### Key Components

1. **StudioAnalyzer**: Analyzes the Studio backend codebase using Go's AST parsing and reflection
2. **MCP Server**: Implements the Model Context Protocol for communication with Copilot
3. **Tool Handlers**: Individual handlers for each MCP tool
4. **Database Integration**: Optional PostgreSQL integration for schema introspection

## Dependencies

- **Go 1.23+**: Required for building and running
- **Studio Backend**: Access to the Studio backend codebase
- **PostgreSQL** (optional): For database schema introspection

## Development

### Building from Source

```bash
cd mcp-studio-backend
go mod tidy
go build -o mcp-server ./cmd/mcp-server
```

### Testing

```bash
go test ./...
```

### Adding New Tools

1. Add tool definition to `config.json`
2. Implement handler in `internal/handlers/`
3. Register handler in `internal/server/server.go`
4. Update documentation

## Limitations

- AST parsing is simplified in the current implementation
- Database connection is optional but recommended for full functionality
- Some advanced code analysis features are placeholders for future enhancement

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:

1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information
4. Contact the development team

## Roadmap

- [ ] Enhanced AST parsing for more accurate code analysis
- [ ] Real-time file watching for dynamic updates
- [ ] Integration with Git for change tracking
- [ ] Performance optimization for large codebases
- [ ] Additional database introspection features
- [ ] Code generation assistance tools