# MCP Studio Backend Context Server

An enhanced Model Context Protocol (MCP) server that provides comprehensive domain-specific tools for analyzing the Studio backend's complex campaign management, domain generation, and performance optimization workflows.

## Overview

This MCP server enables AI assistants to deeply understand and analyze the Studio backend codebase through specialized tools that extract insights about:

- Campaign types and workflows
- Domain generation patterns and validation rules
- Performance optimization strategies
- State machine transitions and orchestration
- Error handling and resilience patterns
- Database transaction patterns
- Testing frameworks and coverage

## Features

### Campaign & Domain Generation Tools
- `get_campaign_types` - Return all campaign types (domain_generation, dns_validation, etc.)
- `get_pattern_types` - Return valid domain generation patterns and their rules

### Performance Analysis Tools
- `get_performance_metrics` - Return performance enhancement patterns
- `get_concurrency_patterns` - Document worker pools, goroutines, and concurrent processing
- `analyze_bottlenecks` - Identify potential performance bottlenecks in code

### State Management & Orchestration
- `get_campaign_states` - Return campaign state machine transitions and rules
- `get_state_machines` - Return state machine definitions and transition rules

### Resilience Tools
- `get_error_patterns` - Return error handling and propagation strategies
- `get_retry_mechanisms` - Document retry logic and backoff strategies
- `get_timeout_strategies` - Document timeout handling across services

## Installation & Setup

### Prerequisites
- Go 1.23 or later
- Access to the Studio backend codebase

### Building the Server
```bash
cd mcp-studio-backend
go mod tidy
go build -o mcp-server ./cmd/mcp-server
```

### Configuration

Create or modify `config.json`:

```json
{
  "studio_backend_path": "../backend",
  "database_connection": "postgresql://localhost:5432/studio",
  "analysis_depth": "deep",
  "cache_ttl": 300,
  "include_test_files": true,
  "include_vendor_deps": false,
  "performance_monitoring": true,
  "real_time_sync": true,
  "domain_specific": {
    "campaign_analysis": true,
    "performance_tracking": true,
    "state_machine_analysis": true,
    "transaction_monitoring": true,
    "resilience_patterns": true
  },
  "search_capabilities": {
    "fuzzy_search": true,
    "semantic_search": true,
    "code_pattern_matching": true,
    "cross_reference_analysis": true
  }
}
```

## Usage

### Running the Server
```bash
./mcp-server -config config.json
```

### Integration with MCP Clients

The server implements the Model Context Protocol and can be integrated with MCP-compatible clients like Claude Desktop or other AI assistants.

Example client configuration:
```json
{
  "mcpServers": {
    "studio-backend": {
      "command": "/path/to/mcp-server",
      "args": ["-config", "/path/to/config.json"]
    }
  }
}
```

## Available Tools

### Campaign Analysis
- **get_campaign_types**: Extracts all campaign types from the backend models
- **get_pattern_types**: Analyzes domain generation patterns (prefix, suffix, both)

### Performance Analysis  
- **get_performance_metrics**: Identifies optimization patterns like batch processing
- **get_concurrency_patterns**: Documents goroutines, channels, and synchronization
- **analyze_bottlenecks**: Finds potential performance issues and suggestions

### State Management
- **get_campaign_states**: Maps campaign state transitions and rules
- **get_state_machines**: Documents state machine implementations

### Resilience Patterns
- **get_error_patterns**: Analyzes error handling strategies
- **get_retry_mechanisms**: Documents retry logic and backoff strategies  
- **get_timeout_strategies**: Maps timeout handling across services

## Architecture

```
mcp-studio-backend/
├── cmd/
│   └── mcp-server/        # Main server application
├── internal/
│   ├── handlers/          # MCP tool handlers
│   │   ├── campaign/      # Campaign analysis tools
│   │   ├── performance/   # Performance analysis tools
│   │   ├── state/         # State management tools
│   │   └── resilience/    # Resilience pattern tools
│   ├── models/            # MCP protocol and data models
│   └── server/            # Core MCP server implementation
└── config.json           # Server configuration
```

## Key Benefits

This MCP server enables:

1. **Debugging complex campaign flows** - trace issues through the entire workflow
2. **Performance optimization** - identify bottlenecks and optimization opportunities  
3. **State consistency** - ensure proper state transitions and data integrity
4. **Error handling analysis** - understand failure modes and recovery mechanisms
5. **Code pattern discovery** - find and document architectural patterns

## Development

### Adding New Tools

1. Create a new tool in the appropriate handler package
2. Implement the Tool interface with Name(), Description(), and Schema() methods
3. Add an Execute() method that returns ToolCallResponse
4. Register the tool in main.go

### Testing

```bash
go test ./...
```

## Examples

### Analyzing Campaign Types
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_campaign_types",
    "arguments": {}
  }
}
```

Response:
```json
{
  "jsonrpc": "2.0", 
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "[\"domain_generation\", \"dns_validation\", \"http_keyword_validation\"]"
    }]
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

This project is part of the Studio backend and follows the same license terms.