# MCP JSON-RPC 2.0 Server

This directory contains a Model Context Protocol (MCP) server implemented as a JSON-RPC 2.0 server, making it compatible with VS Code extensions and other Language Server Protocol (LSP) clients.

## Features

- **JSON-RPC 2.0 Protocol**: Full compliance with JSON-RPC 2.0 specification
- **LSP Compatibility**: Implements core LSP methods for VS Code integration
- **MCP Methods**: Custom MCP-specific methods for backend analysis
- **Database Integration**: Direct database schema analysis
- **Code Modification**: Safe code change application with validation

## Architecture

```
┌─────────────────┐    JSON-RPC 2.0    ┌──────────────────┐
│  VS Code        │◄──────────────────►│  MCP Server      │
│  Extension      │    (stdin/stdout)  │  (Go)            │
└─────────────────┘                    └──────────────────┘
                                                │
                                                ▼
                                       ┌──────────────────┐
                                       │  Backend         │
                                       │  Database        │
                                       └──────────────────┘
```

## Supported Methods

### LSP Standard Methods
- `initialize` - Initialize the language server
- `initialized` - Notification that client is ready
- `shutdown` - Graceful shutdown request
- `exit` - Exit notification

### MCP Custom Methods
- `mcp/get_database_schema` - Retrieve database schema information
- `mcp/apply_code_change` - Apply code changes/patches
- `mcp/get_models` - Get data model information
- `mcp/get_endpoints` - Get API endpoint information
- `mcp/search_code` - Search through codebase
- `mcp/get_config` - Get configuration information

## Quick Start

### 1. Build the Server
```bash
make build
# or
go build -o mcp-server ./cmd/mcpserver
```

### 2. Set Environment Variables
```bash
export DB_CONNECTION="postgres://user:password@localhost/mcpdb?sslmode=disable"
```

### 3. Start the Server
```bash
./start-mcp-server.sh
# or
make run
```

### 4. Test JSON-RPC Communication
```bash
./test-jsonrpc.sh
```

## Manual Testing

You can manually test the JSON-RPC server by sending properly formatted messages:

```bash
# Test initialize request
echo -e 'Content-Length: 100\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"processId":null,"capabilities":{}}}' | ./mcp-server
```

## VS Code Extension Integration

To use this server with a VS Code extension, configure your extension's `package.json`:

```json
{
  "contributes": {
    "languages": [
      {
        "id": "mcp",
        "aliases": ["MCP", "mcp"],
        "extensions": [".mcp"]
      }
    ]
  },
  "activationEvents": [
    "onLanguage:mcp"
  ]
}
```

And in your extension code:

```typescript
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';

export function activate(context: vscode.ExtensionContext) {
    const serverOptions: ServerOptions = {
        command: 'go',
        args: ['run', './cmd/mcpserver'],
        options: {
            cwd: '/path/to/mcp/server',
            env: {
                ...process.env,
                DB_CONNECTION: 'your_database_connection_string'
            }
        }
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'mcp' }],
        synchronize: {
            configurationSection: 'mcp'
        }
    };

    const client = new LanguageClient('mcpServer', 'MCP Server', serverOptions, clientOptions);
    client.start();
}
```

## Configuration

### Environment Variables
- `DB_CONNECTION`: PostgreSQL connection string (required)

### Example Configuration
```bash
export DB_CONNECTION="postgres://username:password@localhost:5432/database_name?sslmode=disable"
```

## Development

### Prerequisites
- Go 1.23.0 or later
- PostgreSQL database (for database-related functions)

### Building
```bash
make build
```

### Running Tests
```bash
make test
```

### Development Mode
```bash
make dev
```

### Code Formatting
```bash
make fmt
```

## Protocol Details

The server implements JSON-RPC 2.0 over stdio transport:

1. **Message Format**: All messages use Content-Length headers followed by JSON payload
2. **Request/Response**: Standard JSON-RPC 2.0 request/response pattern
3. **Notifications**: Support for fire-and-forget notifications
4. **Error Handling**: Proper JSON-RPC 2.0 error codes and messages

### Example Message Flow

**Initialize Request:**
```
Content-Length: 100

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "processId": null,
    "capabilities": {}
  }
}
```

**Initialize Response:**
```
Content-Length: 200

{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "capabilities": {
      "textDocumentSync": 1,
      "executeCommandProvider": {
        "commands": ["mcp.getDatabaseSchema", "mcp.applyCodeChange"]
      }
    },
    "serverInfo": {
      "name": "MCP Language Server",
      "version": "1.0.0"
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure `DB_CONNECTION` environment variable is set
   - Verify database is running and accessible
   - Check connection string format

2. **Server Not Responding**
   - Check that the server process is running
   - Verify stdin/stdout communication is not blocked
   - Check server logs (written to stderr)

3. **VS Code Extension Issues**
   - Ensure the extension can find the MCP server binary
   - Check extension logs in VS Code Developer Console
   - Verify the server path and environment variables

### Debugging

Enable debug logging by running the server with:
```bash
go run ./cmd/mcpserver 2>debug.log
```

This will write all debug information to `debug.log` while keeping JSON-RPC communication on stdout.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `make test` to ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
