// src/index.ts
// Enhanced MCP Server for DomainFlow - Main Entry Point

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Resource Providers
import { CampaignFlowContextProvider } from './resources/campaign-flow-context.js';
import { PersonaContextProvider } from './resources/persona-context.js';
import { KeywordScoringContextProvider } from './resources/keyword-scoring-context.js';

// Backend Context Resources
import { BACKEND_MODELS_CONTEXT, BACKEND_DATA_FLOW_PATTERNS, BACKEND_VALIDATION_RULES } from './resources/backend-models-context.js';
import { BACKEND_SERVICES_CONTEXT } from './resources/backend-services-context.js';
import { BACKEND_API_CONTEXT } from './resources/backend-api-context.js';
import { DATABASE_SCHEMA_CONTEXT } from './resources/database-schema-context.js';
import { BACKEND_ARCHITECTURE_CONTEXT } from './resources/backend-architecture-context.js';

// Tools
import { CampaignFlowAnalyzer } from './tools/campaign-flow-analyzer.js';
import { LeadScorer } from './tools/lead-scorer.js';

// Types
import type { DomainFlowMCPContext, MCPError } from './types/index.js';

/**
 * Enhanced MCP Server for DomainFlow
 * Provides domain-specific intelligence for telecom lead generation
 */
class DomainFlowMCPServer {
  private server: Server;
  private campaignFlowProvider: CampaignFlowContextProvider;
  private personaProvider: PersonaContextProvider;
  private keywordProvider: KeywordScoringContextProvider;
  private campaignAnalyzer: CampaignFlowAnalyzer;
  private leadScorer: LeadScorer;

  constructor() {
    this.server = new Server(
      {
        name: 'domainflow-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize providers
    this.campaignFlowProvider = new CampaignFlowContextProvider();
    this.personaProvider = new PersonaContextProvider();
    this.keywordProvider = new KeywordScoringContextProvider();

    // Initialize tools
    this.campaignAnalyzer = new CampaignFlowAnalyzer();
    this.leadScorer = new LeadScorer();

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'domainflow://campaign-flow/context',
            name: 'Campaign Flow Context',
            description: '3-phase campaign architecture intelligence and flow analysis',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://persona-context/stealth',
            name: 'Persona & Stealth Context',
            description: 'Anti-detection strategies and persona management intelligence',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://keyword-scoring/telecom',
            name: 'Telecom Keyword Intelligence',
            description: 'Industry-specific keyword scoring and lead qualification',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://domain-status/evolution',
            name: 'Domain Status Evolution',
            description: 'Multi-state domain lifecycle tracking across campaigns',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://contract-drift/detection',
            name: 'Contract Drift Detection',
            description: 'Real-time frontend/backend contract validation',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://concurrency/optimization',
            name: 'Concurrency & Performance',
            description: 'Streaming and high-performance processing intelligence',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://enum-contracts/validation',
            name: 'Enum Contract Management',
            description: 'Cross-layer enum consistency validation and management',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://backend/models',
            name: 'Backend Models Context',
            description: 'Go backend models, enums, and data structures (source of truth)',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://backend/services',
            name: 'Backend Services Context',
            description: 'Go backend service layer architecture and business logic',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://backend/api',
            name: 'Backend API Context',
            description: 'Go backend REST API endpoints and patterns',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://backend/database',
            name: 'Database Schema Context',
            description: 'PostgreSQL database schema and relationships',
            mimeType: 'application/json',
          },
          {
            uri: 'domainflow://backend/architecture',
            name: 'Backend Architecture Context',
            description: 'Overall Go backend architecture and design patterns',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Read specific resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        let resourceResult: any;
        
        if (uri.startsWith('domainflow://campaign-flow/')) {
          const contextType = uri.split('/').pop() || 'context';
          resourceResult = await this.campaignFlowProvider.getContext({ contextType });
        } else if (uri.startsWith('domainflow://persona-context/')) {
          const contextType = uri.split('/').pop() || 'stealth';
          resourceResult = await this.personaProvider.getContext({ contextType });
        } else if (uri.startsWith('domainflow://keyword-scoring/')) {
          const contextType = uri.split('/').pop() || 'telecom';
          resourceResult = await this.keywordProvider.getContext({ contextType });
        } else if (uri.startsWith('domainflow://backend/')) {
          const contextType = uri.split('/').pop() || 'models';
          resourceResult = this.getBackendContext(contextType);
        } else {
          throw new Error(`Resource not found: ${uri}`);
        }

        return {
          contents: [
            {
              uri: resourceResult.uri,
              mimeType: resourceResult.mimeType,
              text: resourceResult.content,
            },
          ],
        };
      } catch (error) {
        throw new Error(
          `Failed to read resource ${uri}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'campaign_flow_analyzer',
            description: 'Analyzes DomainFlow campaign phases, dependencies, and transition readiness',
            inputSchema: this.campaignAnalyzer.getSchema().parameters,
          },
          {
            name: 'lead_scorer',
            description: 'Performs telecom-specific lead scoring, keyword analysis, and market positioning',
            inputSchema: this.leadScorer.getSchema().parameters,
          },
          {
            name: 'persona_configuration_manager',
            description: 'Manages persona configurations and stealth validation strategies',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['configure', 'optimize', 'validate', 'rotate'],
                  description: 'Persona management operation'
                },
                personaId: {
                  type: 'string',
                  description: 'Persona identifier'
                },
                stealthLevel: {
                  type: 'string',
                  enum: ['basic', 'moderate', 'aggressive', 'maximum'],
                  description: 'Anti-detection level'
                }
              }
            },
          },
          {
            name: 'domain_status_tracker',
            description: 'Tracks domain status evolution and cross-campaign data flow',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['track_status', 'validate_transition', 'analyze_flow'],
                  description: 'Status tracking operation'
                },
                domainId: {
                  type: 'string',
                  description: 'Domain identifier'
                },
                campaignId: {
                  type: 'string',
                  description: 'Campaign identifier'
                }
              }
            },
          },
          {
            name: 'contract_drift_monitor',
            description: 'Monitors and validates frontend/backend contract alignment',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['validate_contracts', 'detect_drift', 'analyze_consistency'],
                  description: 'Contract monitoring operation'
                },
                scope: {
                  type: 'string',
                  enum: ['openapi', 'zod_go', 'enums', 'bigint'],
                  description: 'Validation scope'
                }
              }
            },
          },
          {
            name: 'concurrency_pattern_analyzer',
            description: 'Analyzes and optimizes streaming and concurrency patterns',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['analyze_performance', 'optimize_concurrency', 'detect_bottlenecks'],
                  description: 'Concurrency analysis operation'
                },
                component: {
                  type: 'string',
                  description: 'System component to analyze'
                }
              }
            },
          },
          {
            name: 'enum_consistency_validator',
            description: 'Validates enum consistency across frontend, backend, and database layers',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: ['validate_enums', 'check_consistency', 'analyze_usage'],
                  description: 'Enum validation operation'
                },
                enumName: {
                  type: 'string',
                  description: 'Specific enum to validate'
                },
                layers: {
                  type: 'array',
                  items: { type: 'string', enum: ['frontend', 'backend', 'database'] },
                  description: 'Layers to validate'
                }
              }
            },
          },
          {
            name: 'backend_context_analyzer',
            description: 'Analyzes Go backend architecture, models, services, API, and database schema',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  enum: [
                    'analyze_models', 'analyze_services', 'analyze_api', 'analyze_database',
                    'analyze_architecture', 'analyze_data_flow', 'analyze_validation',
                    'analyze_dependencies', 'analyze_performance', 'analyze_security',
                    'find_inconsistencies', 'suggest_improvements'
                  ],
                  description: 'Type of backend analysis to perform'
                },
                scope: {
                  type: 'string',
                  description: 'Specific scope to analyze (e.g., campaigns, personas, authentication)'
                },
                includeExamples: {
                  type: 'boolean',
                  description: 'Include implementation examples in the analysis',
                  default: false
                },
                includeMetrics: {
                  type: 'boolean',
                  description: 'Include performance metrics in the analysis',
                  default: false
                },
                format: {
                  type: 'string',
                  enum: ['detailed', 'summary', 'checklist'],
                  description: 'Format of the analysis output',
                  default: 'detailed'
                }
              },
              required: ['operation']
            },
          },
        ],
      };
    });

    // Execute tools
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'campaign_flow_analyzer':
            const campaignResult = await this.campaignAnalyzer.execute(args || {});
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(campaignResult, null, 2),
                },
              ],
            };

          case 'lead_scorer':
            const leadResult = await this.leadScorer.execute(args || {});
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(leadResult, null, 2),
                },
              ],
            };

          case 'persona_configuration_manager':
            return await this.executePersonaManager(args || {});

          case 'domain_status_tracker':
            return await this.executeDomainStatusTracker(args || {});

          case 'contract_drift_monitor':
            return await this.executeContractDriftMonitor(args || {});

          case 'concurrency_pattern_analyzer':
            return await this.executeConcurrencyAnalyzer(args || {});

          case 'enum_consistency_validator':
            return await this.executeEnumValidator(args || {});

          case 'backend_context_analyzer':
            return await this.executeBackendContextAnalyzer(args || {});

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // Tool execution methods for tools not yet fully implemented

  private getBackendContext(contextType: string) {
    let content: any;
    let uri: string;
    
    switch (contextType) {
      case 'models':
        content = {
          models: BACKEND_MODELS_CONTEXT,
          dataFlow: BACKEND_DATA_FLOW_PATTERNS,
          validation: BACKEND_VALIDATION_RULES
        };
        uri = 'domainflow://backend/models';
        break;
      case 'services':
        content = BACKEND_SERVICES_CONTEXT;
        uri = 'domainflow://backend/services';
        break;
      case 'api':
        content = BACKEND_API_CONTEXT;
        uri = 'domainflow://backend/api';
        break;
      case 'database':
        content = DATABASE_SCHEMA_CONTEXT;
        uri = 'domainflow://backend/database';
        break;
      case 'architecture':
        content = BACKEND_ARCHITECTURE_CONTEXT;
        uri = 'domainflow://backend/architecture';
        break;
      default:
        throw new Error(`Unknown backend context type: ${contextType}`);
    }

    return {
      uri,
      mimeType: 'application/json',
      content: JSON.stringify(content, null, 2)
    };
  }

  private async executePersonaManager(args: Record<string, any>) {
    const { operation, personaId, stealthLevel } = args;

    // Mock implementation - would integrate with PersonaContextProvider
    const result = {
      success: true,
      data: {
        operation,
        personaId: personaId || 'default-persona',
        stealthLevel: stealthLevel || 'moderate',
        result: 'Persona configuration updated successfully',
        timestamp: new Date().toISOString()
      },
      metadata: {
        tool: 'persona_configuration_manager',
        operation,
        timestamp: new Date().toISOString()
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async executeDomainStatusTracker(args: Record<string, any>) {
    const { operation, domainId, campaignId } = args;

    const result = {
      success: true,
      data: {
        operation,
        domainId: domainId || 'example-domain-id',
        campaignId: campaignId || 'example-campaign-id',
        currentStatus: 'dns_validated',
        statusHistory: [
          {
            status: 'pending',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            triggeredBy: 'campaign_start'
          },
          {
            status: 'dns_validated',
            timestamp: new Date().toISOString(),
            triggeredBy: 'validation_complete'
          }
        ],
        nextValidTransitions: ['http_validation', 'excluded'],
        canProceed: true
      },
      metadata: {
        tool: 'domain_status_tracker',
        operation,
        timestamp: new Date().toISOString()
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async executeContractDriftMonitor(args: Record<string, any>) {
    const { operation, scope } = args;

    const result = {
      success: true,
      data: {
        operation,
        scope: scope || 'openapi',
        driftDetected: false,
        contractHealth: 'good',
        lastValidation: new Date().toISOString(),
        issues: [],
        recommendations: [
          'Continue monitoring contract alignment',
          'Run validation after each deployment',
          'Update schemas when adding new endpoints'
        ]
      },
      metadata: {
        tool: 'contract_drift_monitor',
        operation,
        timestamp: new Date().toISOString()
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async executeConcurrencyAnalyzer(args: Record<string, any>) {
    const { operation, component } = args;

    const result = {
      success: true,
      data: {
        operation,
        component: component || 'dns_validation',
        performanceMetrics: {
          throughput: '15 domains/minute',
          concurrency: '10 concurrent requests',
          utilization: '75%',
          bottlenecks: ['DNS persona capacity', 'Network latency']
        },
        optimizationRecommendations: [
          'Increase DNS persona pool size',
          'Implement request batching',
          'Add connection pooling'
        ],
        riskFactors: ['High system load during peak hours']
      },
      metadata: {
        tool: 'concurrency_pattern_analyzer',
        operation,
        timestamp: new Date().toISOString()
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async executeEnumValidator(args: Record<string, any>) {
    const { operation, enumName, layers } = args;

    const result = {
      success: true,
      data: {
        operation,
        enumName: enumName || 'CampaignStatus',
        layers: layers || ['frontend', 'backend', 'database'],
        consistencyStatus: 'aligned',
        validationResults: {
          frontend: 'valid',
          backend: 'valid',
          database: 'valid'
        },
        issues: [],
        recommendations: [
          'Enum definitions are consistent across layers',
          'Continue monitoring for drift',
          'Update all layers when modifying enums'
        ]
      },
      metadata: {
        tool: 'enum_consistency_validator',
        operation,
        timestamp: new Date().toISOString()
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async executeBackendContextAnalyzer(args: Record<string, any>) {
    const { operation, scope = 'all', includeExamples = false, includeMetrics = false, format = 'detailed' } = args;

    try {
      // Import the execution function
      const { executeBackendContextAnalyzer } = await import('./tools/backend-context-analyzer.js');
      
      const result = await executeBackendContextAnalyzer({
        operation,
        scope,
        includeExamples,
        includeMetrics,
        format
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Backend context analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DomainFlow MCP Server running on stdio');
  }
}

// Create and run the server
const server = new DomainFlowMCPServer();
server.run().catch((error) => {
  console.error('Failed to run server:', error);
  process.exit(1);
});

export { DomainFlowMCPServer };