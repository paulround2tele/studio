# MCP Server Quick Start Guide

Get your MCP server running in under 5 minutes.

## Prerequisites

- Go 1.23+ installed
- Access to the backend codebase directory
- (Optional) PostgreSQL database for schema analysis

## 1. Quick Installation

```bash
# Navigate to the MCP server directory
cd mcp-server

# Download dependencies
go mod download

# Build the server
go build -o bin/mcp-server ./cmd/mcp-server
```

## 2. Start the Server

### Option A: Quick Start (Default Settings)
```bash
./bin/mcp-server -backend-path="../backend"
```

### Option B: With Database Support
```bash
./bin/mcp-server \
  -backend-path="../backend" \
  -db-url="postgres://user:pass@localhost:5432/studio" \
  -port=8081
```

### Option C: With Custom Configuration
```bash
./bin/mcp-server -config=config/config.json
```

## 3. Verify Installation

### Test Health Endpoint
```bash
curl http://localhost:8081/health
```

### Test MCP Functionality
```bash
# Ping the server
curl -X POST http://localhost:8081/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"ping","id":1}'

# List available tools
curl -X POST http://localhost:8081/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'
```

## 4. First Tool Call

```bash
# Get package structure
curl -X POST http://localhost:8081/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_package_structure","arguments":{"depth":2}},"id":3}'
```

## 5. Configure GitHub Copilot

Create `.copilot/config.json` in your repository root:

```json
{
  "mcp_server": {
    "port": 8081,
    "backend_path": "../backend",
    "tools": {
      "enable_schema_tools": true,
      "enable_api_tools": true,
      "enable_service_tools": true,
      "enable_business_logic_tools": true,
      "enable_configuration_tools": true,
      "enable_navigation_tools": true
    }
  },
  "github_copilot": {
    "context_sources": ["mcp_server"],
    "tools_enabled": true
  }
}
```

## 6. Common Commands

### Development Mode
```bash
# Enable debug logging
./bin/mcp-server -backend-path="../backend" -log-level=debug

# Enable CORS for browser testing
./bin/mcp-server -backend-path="../backend" -enable-cors
```

### Production Mode
```bash
# Run with configuration file
./bin/mcp-server -config=config/config.json

# Run with environment variables
export MCP_SERVER_BACKEND_PATH="../backend"
export MCP_SERVER_DATABASE_URL="postgres://user:pass@localhost:5432/studio"
./bin/mcp-server
```

## 7. Validation Script

Run the complete validation suite:

```bash
./test.sh
```

This will test all endpoints and functionality automatically.

## 8. Available Tools

The server provides 20+ tools in 6 categories:

- **Schema Tools**: `get_models`, `get_database_schema`, `get_api_schema`
- **API Tools**: `get_endpoints`, `get_routes`, `get_middleware`  
- **Service Tools**: `get_services`, `get_dependencies`, `get_call_graph`
- **Business Logic**: `get_workflows`, `get_business_rules`, `get_handlers`
- **Configuration**: `get_env_vars`, `get_config`, `get_feature_flags`
- **Navigation**: `find_by_type`, `search_code`, `get_package_structure`

## Troubleshooting

### Server Won't Start
- Check that the backend path exists and is accessible
- Ensure the port is not already in use
- Verify Go is properly installed

### Tools Return Errors
- Confirm the backend path points to a valid Go project
- Check file permissions
- Enable debug logging to see detailed error messages

### Database Connection Issues
- Verify database is running and accessible
- Check connection string format
- Ensure database user has proper permissions

## Next Steps

1. Read the full [README.md](README.md) for detailed documentation
2. Review [IMPLEMENTATION.md](docs/IMPLEMENTATION.md) for architecture details
3. Explore the tool examples in the documentation
4. Configure GitHub Copilot integration

## Support

- Check existing issues in the repository
- Enable debug logging for troubleshooting
- Review the validation script output for common problems