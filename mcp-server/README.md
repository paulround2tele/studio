# MCP Server for GitHub Copilot

A production-ready Model Context Protocol (MCP) server that provides deep introspection capabilities for the Go monorepo, enabling GitHub Copilot to understand the codebase architecture, API contracts, business logic, and database schemas.

## Overview

This MCP server implements the JSON-RPC 2.0 specification and provides 20+ specialized tools grouped by functionality to give GitHub Copilot comprehensive understanding of the codebase structure, making it a "brain" for the repository that's structured, safe, queryable, and persistent.

## Features

### Tool Categories

#### 🏗️ Schema Tools
- **get_models**: Extract database models and entity definitions
- **get_database_schema**: Analyze database schema with tables, columns, constraints
- **get_api_schema**: Generate OpenAPI specifications and route definitions

#### 🌐 API Tools  
- **get_endpoints**: List all API endpoints with HTTP methods and handlers
- **get_routes**: Detailed route information with middleware chains
- **get_middleware**: Analyze middleware components and execution order

#### ⚙️ Service Tools
- **get_services**: List services with interfaces and implementations  
- **get_dependencies**: Analyze service dependencies and injection patterns
- **get_call_graph**: Generate function and method relationship graphs

#### 💼 Business Logic Tools
- **get_workflows**: Identify business workflows and process flows
- **get_business_rules**: Extract business rules and validation logic
- **get_handlers**: List request handlers and business logic implementations

#### ⚙️ Configuration Tools
- **get_env_vars**: List environment variables used throughout codebase
- **get_config**: Get configuration structure from config files
- **get_feature_flags**: Identify feature flags and conditional logic

#### 🧭 Navigation Tools
- **find_by_type**: Find code elements by type (structs, interfaces, functions)
- **search_code**: Search for code patterns and text across codebase
- **get_package_structure**: Get package organization and structure

## Architecture

### Clean Go Architecture
```
mcp-server/
├── cmd/
│   └── mcp-server/          # Main application entry point
│       └── main.go
├── internal/                # Private application code
│   ├── server/              # JSON-RPC 2.0 server implementation
│   ├── handlers/            # MCP tool handlers
│   ├── analysis/            # AST parsing and code analysis
│   └── config/              # Configuration management
├── pkg/
│   └── bridge/              # Bridge Pattern - public API interface
├── config/
│   └── config.json          # Default configuration
├── docs/                    # Documentation
├── .copilot/
│   └── config.json          # GitHub Copilot integration config
└── test.sh                  # Validation script
```

### Bridge Pattern Implementation
The server uses the Bridge Pattern in `pkg/bridge` to provide a safe public API interface that prevents internal package leaks. This ensures:
- Internal implementation details remain private
- Clean separation between public API and internal logic
- Safe evolution of internal structures without breaking clients
- Controlled access to sensitive operations

### Technical Features
- **Static Code Analysis**: Go AST parsing for type information and structure analysis
- **Dynamic Reflection**: Runtime type information extraction
- **SQL Parsing**: Database schema introspection capabilities  
- **Middleware Tracing**: Request flow and middleware chain analysis
- **Fast Structured Responses**: Optimized JSON responses for large codebases
- **JSON-RPC 2.0 Compliance**: Full specification conformance
- **Rate Limiting**: Built-in request throttling and security
- **CORS Support**: Cross-origin request handling
- **Graceful Shutdown**: Proper resource cleanup and shutdown handling

## Quick Start

### Installation

1. **Clone and Navigate**:
   ```bash
   cd mcp-server
   ```

2. **Install Dependencies**:
   ```bash
   go mod download
   ```

3. **Build**:
   ```bash
   go build -o bin/mcp-server ./cmd/mcp-server
   ```

### Configuration

#### Option 1: Command Line Arguments
```bash
./bin/mcp-server \
  -backend-path="../backend" \
  -db-url="postgres://user:pass@localhost:5432/studio" \
  -port=8081 \
  -log-level=info
```

#### Option 2: Configuration File
```bash
./bin/mcp-server -config=config/config.json
```

#### Option 3: Environment Variables
```bash
export MCP_SERVER_BACKEND_PATH="../backend"
export MCP_SERVER_DATABASE_URL="postgres://user:pass@localhost:5432/studio"
export MCP_SERVER_PORT=8081
./bin/mcp-server
```

### Basic Usage

1. **Start the server**:
   ```bash
   ./bin/mcp-server -backend-path="../backend"
   ```

2. **Test connectivity**:
   ```bash
   curl -X POST http://localhost:8081/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"ping","id":1}'
   ```

3. **List available tools**:
   ```bash
   curl -X POST http://localhost:8081/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'
   ```

4. **Execute a tool**:
   ```bash
   curl -X POST http://localhost:8081/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_package_structure","arguments":{}},"id":3}'
   ```

## GitHub Copilot Integration

### Setup with .copilot/config.json
The server automatically loads configuration from `.copilot/config.json` if present, enabling seamless GitHub Copilot integration.

### Usage in Copilot
Once configured, GitHub Copilot can automatically:
- Query codebase structure for better code suggestions
- Understand API contracts when generating integration code
- Access business logic patterns for consistent implementations
- Navigate complex dependency relationships
- Generate code that follows existing architectural patterns

## API Reference

### JSON-RPC 2.0 Methods

#### `initialize`
Initialize the MCP server connection.
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "client_name": "github-copilot",
    "client_version": "1.0.0"
  },
  "id": 1
}
```

#### `tools/list`
Get list of available tools.
```json
{
  "jsonrpc": "2.0", 
  "method": "tools/list",
  "id": 2
}
```

#### `tools/call`
Execute a specific tool.
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call", 
  "params": {
    "name": "get_models",
    "arguments": {
      "include_fields": true,
      "include_relationships": true
    }
  },
  "id": 3
}
```

#### `ping`
Health check endpoint.
```json
{
  "jsonrpc": "2.0",
  "method": "ping",
  "id": 4
}
```

## Configuration Reference

### Complete Configuration Options

```json
{
  "port": 8081,
  "log_level": "info",
  "enable_cors": false,
  "backend_path": "../backend",
  "database_url": "postgres://user:pass@localhost:5432/studio",
  "analysis": {
    "enable_ast_analysis": true,
    "enable_database_analysis": true,
    "enable_middleware_tracing": true,
    "enable_dependency_graph": true,
    "max_concurrent_analysis": 4,
    "cache_timeout_seconds": 300,
    "max_file_size_mb": 10,
    "include_paths": ["cmd", "internal", "pkg"],
    "exclude_paths": ["vendor", ".git", "node_modules", "dist", "bin"]
  },
  "tools": {
    "enable_schema_tools": true,
    "enable_api_tools": true,
    "enable_service_tools": true,
    "enable_business_logic_tools": true,
    "enable_configuration_tools": true,
    "enable_navigation_tools": true
  },
  "security": {
    "enable_rate_limit": true,
    "requests_per_minute": 60,
    "max_request_size_mb": 10,
    "allowed_origins": ["*"]
  }
}
```

### Environment Variables
- `MCP_SERVER_PORT`: Server port (default: 8081)
- `MCP_SERVER_LOG_LEVEL`: Log level (debug, info, warn, error)
- `MCP_SERVER_BACKEND_PATH`: Path to backend codebase
- `MCP_SERVER_DATABASE_URL`: Database connection string
- `MCP_SERVER_ENABLE_CORS`: Enable CORS headers (true/false)

## Development

### Building
```bash
go build -o bin/mcp-server ./cmd/mcp-server
```

### Testing
```bash
go test ./...
```

### Validation
```bash
./test.sh
```

### Development with Hot Reload
```bash
go run ./cmd/mcp-server -backend-path="../backend" -log-level=debug
```

## Security

### Built-in Security Features
- **Rate Limiting**: Configurable requests per minute
- **Request Size Limits**: Prevent DoS attacks
- **CORS Configuration**: Control cross-origin access
- **Input Validation**: All tool parameters validated
- **Path Traversal Protection**: Safe file system access
- **SQL Injection Prevention**: Parameterized queries only

### Production Security Recommendations
1. **Disable CORS** in production (`enable_cors: false`)
2. **Set strict allowed origins** if CORS is needed
3. **Use HTTPS** with proper TLS certificates
4. **Configure firewall rules** to restrict access
5. **Monitor rate limits** and adjust as needed
6. **Regular security updates** of dependencies

## Troubleshooting

### Common Issues

#### "Backend path does not exist"
- Ensure the `-backend-path` points to the correct Go backend directory
- Check file permissions and accessibility

#### "Database connection failed"
- Verify database is running and accessible
- Check connection string format and credentials
- Ensure database exists and user has proper permissions

#### "Port already in use"
- Change port with `-port` flag or `MCP_SERVER_PORT` environment variable
- Check for other services using the same port

#### "Tool execution timeout"
- Increase `cache_timeout_seconds` in configuration
- Check for large files that might slow analysis
- Verify sufficient system resources

### Debug Mode
Enable debug logging for detailed information:
```bash
./bin/mcp-server -log-level=debug -backend-path="../backend"
```

### Health Check
Verify server health:
```bash
curl http://localhost:8081/health
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow existing code patterns and architecture
4. Add tests for new functionality  
5. Update documentation
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review existing GitHub issues
3. Create a new issue with detailed information
4. Include logs and configuration details

---

**Note**: This MCP server is designed specifically for the Studio monorepo architecture. Adaptation may be needed for other codebases.