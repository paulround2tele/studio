# MCP Studio Backend Context Server - Quick Start

This guide shows how to quickly get started with the MCP Studio Backend Context Server.

## Installation

1. **Navigate to the MCP server directory:**
   ```bash
   cd mcp-studio-backend
   ```

2. **Build the server:**
   ```bash
   go build -o mcp-server ./cmd/mcp-server
   ```

3. **Run the test script:**
   ```bash
   ./test.sh
   ```

## Basic Usage

### Start the server (without database):
```bash
./mcp-server -backend-path=../backend
```

### Start the server (with database):
```bash
export DATABASE_URL='postgres://user:pass@localhost:5432/studio?sslmode=disable'
./mcp-server -backend-path=../backend
```

## Available Tools

The MCP server provides 22 different tools organized into 6 categories:

### 1. Schema Introspection
- `get_models` - Get all data models with fields and validation
- `get_enums` - Get all enum types and values
- `get_interfaces` - Get all interface definitions
- `search_types` - Search for types by name/pattern

### 2. API Documentation
- `get_endpoints` - Get all REST API endpoints
- `get_handlers` - Get handler functions
- `get_middleware` - Get middleware functions
- `search_api` - Search API endpoints

### 3. Database Tools
- `get_tables` - Get database table structures
- `get_migrations` - Get migration history
- `get_indexes` - Get database indexes
- `search_schema` - Search database schema

### 4. Business Logic
- `get_services` - Get service layer functions
- `get_validators` - Get validation rules
- `get_workflows` - Get campaign workflows
- `search_logic` - Search business logic

### 5. Configuration
- `get_config` - Get configuration structures
- `get_env_vars` - Get environment variables
- `get_dependencies` - Get Go module dependencies

### 6. Code Navigation
- `find_usage` - Find where types/functions are used
- `get_references` - Get cross-references
- `get_call_graph` - Get function call relationships

## Example Tool Calls

### Get all models:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_models",
    "arguments": {}
  }
}
```

### Search for campaign-related types:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_types",
    "arguments": {
      "query": "campaign"
    }
  }
}
```

### Get API endpoints:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_endpoints",
    "arguments": {}
  }
}
```

## Integration with Copilot

Add this server to your MCP configuration:

```json
{
  "mcpServers": {
    "studio-backend-context": {
      "command": "/path/to/mcp-studio-backend/mcp-server",
      "args": [
        "-backend-path=/path/to/studio/backend"
      ]
    }
  }
}
```

## Features Highlights

- ✅ **Real-time Analysis** - Analyzes current codebase state
- ✅ **No External Dependencies** - Works standalone
- ✅ **Optional Database** - Enhanced features with DB connection
- ✅ **Search & Filter** - Find specific information quickly
- ✅ **Markdown Output** - Formatted responses for readability
- ✅ **Error Handling** - Graceful error handling and validation
- ✅ **Extensible** - Easy to add new analysis tools

This MCP server significantly enhances Copilot's understanding of the Studio backend, enabling more accurate suggestions and architectural guidance.