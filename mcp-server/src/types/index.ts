// src/types/index.ts
// Enhanced MCP Server Types - Centralized Export

// Campaign Flow Context Types
export * from './campaign-flow-context.js';

// Persona System & Stealth Validation Types
export * from './persona-context.js';

// Keyword Scoring & Lead Intelligence Types
export * from './keyword-scoring-context.js';

// Multi-State Domain Status Evolution Types
export * from './domain-status-context.js';

// Frontend/Backend Contract Drift Detection Types
export * from './contract-drift-context.js';

// Streaming & Concurrency Behavior Intelligence Types
export * from './concurrency-context.js';

// Enum Contract Management Types
export * from './enum-contract-context.js';

// Common MCP Types
export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MCPResourceResult {
  uri: string;
  mimeType: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface MCPContextProvider {
  getContext(params: Record<string, any>): Promise<MCPResourceResult>;
  validateContext(context: any): boolean;
  transformContext?(context: any, format: string): any;
}

export interface MCPToolProvider {
  execute(params: Record<string, any>): Promise<MCPToolResult>;
  validateParams(params: Record<string, any>): boolean;
  getSchema(): Record<string, any>;
}

// DomainFlow-specific context interfaces
export interface DomainFlowMCPContext {
  domainflow: {
    version: string;
    environment: 'development' | 'staging' | 'production';
    capabilities: string[];
  };
  campaign?: {
    id?: string;
    type?: string;
    phase?: string;
    status?: string;
  };
  persona?: {
    id?: string;
    type?: 'dns' | 'http';
    stealthLevel?: string;
  };
  domain?: {
    name?: string;
    status?: string;
    lastValidated?: string;
  };
  system?: {
    performance?: any;
    health?: any;
    capacity?: any;
  };
}

// Error types for MCP operations
export class MCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export class MCPValidationError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'MCPValidationError';
  }
}

export class MCPResourceError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, 'RESOURCE_ERROR', details);
    this.name = 'MCPResourceError';
  }
}

export class MCPToolExecutionError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, 'TOOL_EXECUTION_ERROR', details);
    this.name = 'MCPToolExecutionError';
  }
}