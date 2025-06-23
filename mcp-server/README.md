# DomainFlow MCP Server

A Model Context Protocol (MCP) server that provides intelligent context and automation capabilities for GitHub Copilot agent mode to accelerate DomainFlow development and debugging workflows.

## Features

### Core MCP Tools
- **Repository Context**: Automatically provide relevant file context based on current development focus
- **API Schema Awareness**: Understand Go backend API contracts and TypeScript frontend types
- **Database Schema Context**: Provide PostgreSQL schema context for database-related operations
- **Testing Context**: Suggest appropriate test patterns and existing test structures
- **Build & Deployment Context**: Understand the project's build pipeline and deployment requirements

### Domain-Specific Intelligence
- **Campaign Management**: Understand DomainFlow's campaign lifecycle and business logic
- **Authentication & Authorization**: Provide context about session-based auth system and permission structures
- **WebSocket Real-time Features**: Understand real-time communication patterns
- **Type Safety**: Maintain awareness of SafeBigInt, UUID types, and contract alignment requirements

## Setup

### Prerequisites
- Node.js 18+ 
- Access to DomainFlow repository
- VS Code with GitHub Copilot extension

### Installation

1. **Install dependencies**:
   ```bash
   cd mcp-server
   npm install
   ```

2. **Build the server**:
   ```bash
   npm run build
   ```

3. **Configure VS Code**: Update your VS Code settings.json:
   ```json
   {
     "github.copilot.chat.mcp.servers": {
       "domainflow": {
         "command": "node",
         "args": ["./mcp-server/dist/index.js"],
         "cwd": "${workspaceFolder}"
       }
     }
   }
   ```

### Development

Run in development mode with auto-rebuild:
```bash
npm run dev
```

## Usage

Once configured, the MCP server will automatically provide context to GitHub Copilot about:

- **Project Structure**: Understanding of DomainFlow's architecture and component organization
- **API Contracts**: Knowledge of Go backend types and their TypeScript equivalents
- **Database Schema**: PostgreSQL table structures and relationships
- **Testing Patterns**: Existing test structures and recommended patterns
- **Build Pipeline**: Integration with npm scripts and development tools

## Architecture

The MCP server is organized into:

- **Tools** (`src/tools/`): Interactive tools for specific development tasks
- **Resources** (`src/resources/`): Static context providers for codebase understanding
- **Prompts** (`src/prompts/`): Specialized prompts for DomainFlow-specific scenarios

## Integration

This MCP server integrates with:
- GitHub Copilot agent mode
- VS Code development environment
- DomainFlow's existing build tools (npm scripts, Makefile)
- PostgreSQL schema and migration tools