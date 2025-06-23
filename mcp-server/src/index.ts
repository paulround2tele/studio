#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool implementations
import { repositoryContextTool } from './tools/repository-context.js';
import { apiSchemaTool } from './tools/api-schema-tool.js';
import { databaseContextTool } from './tools/database-context.js';
import { testGeneratorTool } from './tools/test-generator.js';
import { buildAutomationTool } from './tools/build-automation.js';

// Import resource implementations
import { codebaseIndexer } from './resources/codebase-indexer.js';
import { apiContractParser } from './resources/api-contract-parser.js';
import { projectStructure } from './resources/project-structure.js';

// Import prompt implementations
import { campaignPrompts } from './prompts/campaign-prompts.js';
import { authPrompts } from './prompts/auth-prompts.js';
import { debuggingPrompts } from './prompts/debugging-prompts.js';

/**
 * DomainFlow MCP Server
 * 
 * Provides intelligent context and automation capabilities for GitHub Copilot
 * agent mode to accelerate DomainFlow development and debugging workflows.
 */
class DomainFlowMCPServer {
  private server: Server;
  private rootPath: string;

  constructor() {
    this.server = new Server(
      {
        name: 'domainflow-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.rootPath = process.cwd();
    this.setupHandlers();
  }

  private setupHandlers() {
    // Tools handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'repository_context',
            description: 'Get relevant file context based on development focus',
            inputSchema: {
              type: 'object',
              properties: {
                focus: {
                  type: 'string',
                  description: 'Current development focus (e.g., "campaigns", "auth", "websockets")',
                },
                includeTests: {
                  type: 'boolean',
                  description: 'Include test files in context',
                  default: false,
                },
              },
              required: ['focus'],
            },
          },
          {
            name: 'api_schema_context',
            description: 'Get Go backend API contracts and TypeScript frontend types',
            inputSchema: {
              type: 'object',
              properties: {
                component: {
                  type: 'string',
                  description: 'API component to analyze (e.g., "campaigns", "personas", "auth")',
                },
                includeValidation: {
                  type: 'boolean',
                  description: 'Include validation schemas',
                  default: true,
                },
              },
              required: ['component'],
            },
          },
          {
            name: 'database_context',
            description: 'Get PostgreSQL schema context for database operations',
            inputSchema: {
              type: 'object',
              properties: {
                table: {
                  type: 'string',
                  description: 'Specific table to analyze (optional)',
                },
                includeRelations: {
                  type: 'boolean',
                  description: 'Include table relationships',
                  default: true,
                },
              },
            },
          },
          {
            name: 'test_context',
            description: 'Get test patterns and existing test structures',
            inputSchema: {
              type: 'object',
              properties: {
                testType: {
                  type: 'string',
                  enum: ['unit', 'integration', 'e2e'],
                  description: 'Type of test context needed',
                },
                component: {
                  type: 'string',
                  description: 'Component to test (optional)',
                },
              },
              required: ['testType'],
            },
          },
          {
            name: 'build_context',
            description: 'Get build pipeline and deployment context',
            inputSchema: {
              type: 'object',
              properties: {
                environment: {
                  type: 'string',
                  enum: ['development', 'production'],
                  description: 'Target environment',
                  default: 'development',
                },
              },
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'repository_context':
            return await repositoryContextTool(args as any, this.rootPath);

          case 'api_schema_context':
            return await apiSchemaTool(args as any, this.rootPath);

          case 'database_context':
            return await databaseContextTool(args as any, this.rootPath);

          case 'test_context':
            return await testGeneratorTool(args as any, this.rootPath);

          case 'build_context':
            return await buildAutomationTool(args as any, this.rootPath);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

    // Resources handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'domainflow://codebase/structure',
            name: 'DomainFlow Project Structure',
            description: 'Complete project structure and architecture overview',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://api/contracts',
            name: 'API Contracts',
            description: 'Go backend and TypeScript frontend type contracts',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://database/schema',
            name: 'Database Schema',
            description: 'PostgreSQL schema and table relationships',
            mimeType: 'application/json',
          },
        ],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case 'domainflow://codebase/structure':
            return await projectStructure(this.rootPath);

          case 'domainflow://api/contracts':
            return await apiContractParser(this.rootPath);

          case 'domainflow://database/schema':
            return await codebaseIndexer(this.rootPath);

          default:
            throw new Error(`Unknown resource: ${uri}`);
        }
      } catch (error) {
        throw new Error(`Error reading resource ${uri}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    // Prompts handlers
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'campaign_development',
            description: 'Specialized prompts for campaign management development',
            arguments: [
              {
                name: 'operation',
                description: 'Campaign operation type',
                required: true,
              },
            ],
          },
          {
            name: 'auth_development',
            description: 'Authentication and authorization development guidance',
            arguments: [
              {
                name: 'feature',
                description: 'Auth feature to implement',
                required: true,
              },
            ],
          },
          {
            name: 'debugging_assistance',
            description: 'DomainFlow-specific debugging and troubleshooting',
            arguments: [
              {
                name: 'issue',
                description: 'Issue or error to debug',
                required: true,
              },
            ],
          },
        ],
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'campaign_development':
            return await campaignPrompts(args?.operation || '');

          case 'auth_development':
            return await authPrompts(args?.feature || '');

          case 'debugging_assistance':
            return await debuggingPrompts(args?.issue || '');

          default:
            throw new Error(`Unknown prompt: ${name}`);
        }
      } catch (error) {
        throw new Error(`Error getting prompt ${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DomainFlow MCP server running on stdio');
  }
}

// Start the server
const server = new DomainFlowMCPServer();
server.run().catch((error) => {
  console.error('Fatal error in DomainFlow MCP server:', error);
  process.exit(1);
});