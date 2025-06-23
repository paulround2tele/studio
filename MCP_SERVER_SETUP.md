# DomainFlow MCP Server Setup Guide

This guide provides instructions for setting up and using the DomainFlow Model Context Protocol (MCP) server with GitHub Copilot agent mode.

## Overview

The DomainFlow MCP server provides intelligent context and automation capabilities for GitHub Copilot, enabling:

- **Repository Context**: Automatic file context based on development focus
- **API Schema Awareness**: Understanding of Go backend and TypeScript frontend contracts
- **Database Context**: PostgreSQL schema knowledge for database operations
- **Testing Context**: Suggestion of appropriate test patterns
- **Build Automation**: Understanding of the build pipeline and deployment

## Prerequisites

- Node.js 18+
- VS Code with GitHub Copilot extension
- Access to DomainFlow repository

## Installation

### 1. Build the MCP Server

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configure VS Code

The MCP server is already configured in `.vscode/settings.json`:

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

### 3. Restart VS Code

After configuration, restart VS Code to load the MCP server.

## Available Tools

### 1. Repository Context Tool
**Name**: `repository_context`

Provides relevant file context based on your current development focus.

**Parameters**:
- `focus` (required): Development area (e.g., "campaigns", "auth", "websockets")
- `includeTests` (optional): Include test files in context

**Example Usage**:
```
I'm working on campaign management features
```

This will automatically use the repository context tool to provide relevant files.

### 2. API Schema Tool
**Name**: `api_schema_context`

Provides Go backend API contracts and TypeScript frontend types.

**Parameters**:
- `component` (required): API component to analyze (e.g., "campaigns", "personas")
- `includeValidation` (optional): Include validation schemas

**Example Usage**:
```
I need to understand the campaign API contracts
```

### 3. Database Context Tool
**Name**: `database_context`

Provides PostgreSQL schema context for database operations.

**Parameters**:
- `table` (optional): Specific table to analyze
- `includeRelations` (optional): Include table relationships

**Example Usage**:
```
I need to work with the database schema for campaigns
```

### 4. Test Context Tool
**Name**: `test_context`

Provides test patterns and existing test structures.

**Parameters**:
- `testType` (required): Type of test ("unit", "integration", "e2e")
- `component` (optional): Component to test

**Example Usage**:
```
I need to write unit tests for the campaign service
```

### 5. Build Context Tool
**Name**: `build_context`

Provides build pipeline and deployment context.

**Parameters**:
- `environment` (optional): Target environment ("development", "production")

**Example Usage**:
```
I need help with the build and deployment process
```

## Available Resources

### 1. Project Structure
**URI**: `domainflow://codebase/structure`

Complete project structure and architecture overview.

### 2. API Contracts
**URI**: `domainflow://api/contracts`

Go backend and TypeScript frontend type contracts.

### 3. Database Schema
**URI**: `domainflow://database/schema`

PostgreSQL schema and table relationships.

## Available Prompts

### 1. Campaign Development
**Name**: `campaign_development`

Specialized prompts for campaign management development.

**Parameters**:
- `operation`: Campaign operation type (e.g., "creation", "management", "validation")

### 2. Authentication Development
**Name**: `auth_development`

Authentication and authorization development guidance.

**Parameters**:
- `feature`: Auth feature to implement (e.g., "login", "session", "permissions")

### 3. Debugging Assistance
**Name**: `debugging_assistance`

DomainFlow-specific debugging and troubleshooting.

**Parameters**:
- `issue`: Issue or error to debug (e.g., "websocket", "api", "database")

## Usage with GitHub Copilot

### Chat Mode

When using GitHub Copilot Chat, the MCP server will automatically provide context. You can ask questions like:

- "How do I create a new campaign?"
- "What's the database schema for users?"
- "Show me the WebSocket implementation"
- "Help me debug API authentication issues"

### Agent Mode Features

The MCP server enhances Copilot with:

1. **Contextual Awareness**: Understanding of DomainFlow architecture
2. **Code Generation**: Assistance with generating API handlers and components
3. **Testing Support**: Appropriate test patterns and examples
4. **Debugging Help**: Domain-specific troubleshooting guidance
5. **Type Safety**: Knowledge of SafeBigInt, UUID, and branded types

### Best Practices

1. **Be Specific**: Mention the specific component or feature you're working on
2. **Include Context**: Reference whether you're working on frontend, backend, or full-stack
3. **Mention Environment**: Specify if you're in development or preparing for production
4. **Use Domain Terms**: Use DomainFlow-specific terminology (campaigns, personas, etc.)

## Development

### Running in Development Mode

```bash
cd mcp-server
npm run dev
```

This enables TypeScript watch mode for automatic rebuilds.

### Adding New Tools

1. Create a new tool file in `src/tools/`
2. Implement the tool function with proper TypeScript interfaces
3. Add the tool to `src/index.ts` in the tools list and handler
4. Rebuild with `npm run build`

### Adding New Resources

1. Create a new resource file in `src/resources/`
2. Implement the resource function
3. Add the resource to `src/index.ts` in the resources list and handler
4. Rebuild with `npm run build`

### Adding New Prompts

1. Create or update prompt files in `src/prompts/`
2. Add new prompt handlers
3. Add the prompt to `src/index.ts` in the prompts list and handler
4. Rebuild with `npm run build`

## Troubleshooting

### MCP Server Not Loading

1. Check that the server built successfully: `npm run build`
2. Verify VS Code settings are correct
3. Restart VS Code
4. Check the VS Code output panel for errors

### Tools Not Working

1. Verify the repository structure matches expectations
2. Check that required files exist (package.json, go.mod, etc.)
3. Look at VS Code console for error messages

### Performance Issues

1. The MCP server caches analysis results
2. Large repositories may take longer to analyze
3. Consider running `npm run build` if you notice stale data

## Architecture

The MCP server is structured as:

```
mcp-server/
├── src/
│   ├── index.ts                    # Main MCP server
│   ├── tools/                      # Interactive tools
│   │   ├── repository-context.ts   # Repository file analysis
│   │   ├── api-schema-tool.ts      # API contract analysis
│   │   ├── database-context.ts     # Database schema analysis
│   │   ├── test-generator.ts       # Test pattern analysis
│   │   └── build-automation.ts     # Build process analysis
│   ├── resources/                  # Static context providers
│   │   ├── codebase-indexer.ts     # Project structure analysis
│   │   ├── api-contract-parser.ts  # Contract alignment tracking
│   │   └── project-structure.ts    # Architecture overview
│   └── prompts/                    # Specialized prompts
│       ├── campaign-prompts.ts     # Campaign development guidance
│       ├── auth-prompts.ts         # Authentication guidance
│       └── debugging-prompts.ts    # Debugging assistance
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # Documentation
```

## Contributing

1. Make changes to the MCP server source files
2. Test locally with `npm run dev`
3. Build and test with `npm run build`
4. Commit changes and create a pull request

The MCP server is designed to understand DomainFlow's specific architecture and provide intelligent assistance for development workflows.