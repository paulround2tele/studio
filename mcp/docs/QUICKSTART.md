# Quickstart Guide

This guide provides step-by-step instructions to get the MCP server up and running with VS Code and GitHub Copilot.

## Prerequisites

*   Go 1.21 or later installed
*   VS Code with the latest GitHub Copilot extension
*   Access to the studio project codebase
*   PostgreSQL database running (for full functionality)

## 1. Build the Server

Build the server binary from the MCP directory:

```bash
cd mcp
make build
```

This will create an executable file at `bin/mcp-server`.

## 2. Configure Database (Optional)

For full functionality, ensure PostgreSQL is running and the database connection is configured:

```bash
# The server will auto-detect database configuration from:
# - backend/config.json (preferred)
# - .db_connection file
# - DB_CONNECTION environment variable
```

## 3. Configure VS Code MCP Integration

The MCP server is already configured in `.vscode/mcp.json`. Verify the configuration:

```json
{
  "servers": {
    "studio-backend-context": {
      "command": "/home/vboxuser/studio/mcp/bin/mcp-server",
      "args": ["-allow-terminal", "-allow-mutation"],
      "cwd": "/home/vboxuser/studio"
    }
  }
}
```

## 4. Run the Server (Development)

For development and testing, you can run the server directly:

```bash
./bin/mcp-server -allow-terminal -allow-mutation
```

You should see log messages indicating successful startup:

```
2024/01/01 12:00:00 MCP Server starting...
2024/01/01 12:00:00 Database connection successful
2024/01/01 12:00:00 Starting JSON-RPC server...
```

## 5. Use with VS Code Copilot

1. **Open VS Code** in the studio project directory
2. **Open GitHub Copilot Chat** (Ctrl+Shift+P → "GitHub Copilot: Open Chat")
3. **Ask questions** about your codebase, and the MCP tools will automatically provide context

### Example Queries

Try these example queries in Copilot Chat:

```
# Business domain analysis
"What business domains are implemented in this backend?"

# Frontend analysis  
"Analyze the TypeScript API client structure"

# Database analysis
"Show me the database schema and performance stats"

# Cross-stack analysis
"Check for API contract drift between frontend and backend"

# Security analysis
"Perform enhanced security analysis with business domain awareness"
```

## 6. Available Tool Categories

The MCP server provides 68+ sophisticated analysis tools organized into categories:

- **Database Tools**: Schema analysis, performance metrics
- **Business Domain Tools**: Keyword management, proxy pools, cross-domain analysis
- **Frontend Tools**: React component analysis, TypeScript API client analysis
- **Code Analysis**: Services, interfaces, handlers, call graphs
- **Security & Performance**: Enhanced analysis with domain awareness
- **Interactive Tools**: Terminal commands, code changes, UI testing

## 7. Advanced Usage

### Business Domain Analysis
```bash
# Analyze keyword extraction services
mcp-client call get_keyword_extraction_services

# Analyze proxy management services  
mcp-client call get_proxy_management_services

# Cross-domain dependency analysis
mcp-client call get_business_domain_cross_dependencies
```

### Frontend Analysis
```bash
# Sophisticated API client analysis
mcp-client call frontend_api_client_analysis

# React component analysis
mcp-client call frontend_react_component_tree
```

### Enhanced Security
```bash
# Business domain-aware security analysis
mcp-client call get_enhanced_security_analysis

# Enhanced dependency analysis
mcp-client call get_enhanced_dependencies
```

## Troubleshooting

### Database Connection Issues
```bash
# Check database configuration
cat backend/config.json

# Verify connection string
echo $DB_CONNECTION
```

### MCP Server Not Responding
```bash
# Check server logs
./bin/mcp-server -allow-terminal -allow-mutation

# Verify VS Code MCP configuration
cat .vscode/mcp.json
```

### Missing Tools
Ensure you have the latest version with all 68+ tools:
```bash
# Rebuild the server
make clean && make build

# Verify tool count
./bin/mcp-server --list-tools
```

## Next Steps

- Review [Business Domain Analysis](BUSINESS_DOMAIN_ANALYSIS.md) for advanced domain analysis
- Check [Enhanced API Client Analysis](ENHANCED_API_CLIENT_ANALYSIS.md) for frontend analysis
- See [Implementation Details](IMPLEMENTATION.md) for technical architecture information