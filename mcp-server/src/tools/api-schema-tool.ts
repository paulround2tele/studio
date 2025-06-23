import * as fs from 'fs/promises';
import * as path from 'path';

interface ApiSchemaArgs {
  component: string;
  includeValidation?: boolean;
}

interface ApiContract {
  name: string;
  type: 'request' | 'response' | 'model';
  goDefinition?: string;
  typeScriptDefinition?: string;
  validation?: string;
  endpoints?: string[];
}

/**
 * API Schema Tool
 * 
 * Provides Go backend API contracts and TypeScript frontend types.
 * Understands the contract alignment between backend and frontend.
 */
export async function apiSchemaTool(
  args: ApiSchemaArgs,
  rootPath: string
) {
  const { component, includeValidation = true } = args;

  try {
    const contracts = await getApiContracts(component, rootPath);
    const typeDefinitions = await getTypeDefinitions(component, rootPath);
    const endpoints = await getApiEndpoints(component, rootPath);
    
    const summary = generateApiSchemaSummary(component, contracts, typeDefinitions, endpoints, includeValidation);

    return {
      content: [
        {
          type: 'text',
          text: summary,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to get API schema context: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function getApiContracts(component: string, rootPath: string): Promise<ApiContract[]> {
  const contracts: ApiContract[] = [];

  // Try to read Go model definitions
  try {
    const modelsPath = path.join(rootPath, 'backend/internal/models');
    const modelFiles = await fs.readdir(modelsPath);
    
    for (const file of modelFiles) {
      if (file.includes(component) && file.endsWith('.go')) {
        const content = await fs.readFile(path.join(modelsPath, file), 'utf-8');
        const goStructs = extractGoStructs(content, component);
        contracts.push(...goStructs);
      }
    }
  } catch (error) {
    // Continue if models directory doesn't exist
  }

  // Try to read TypeScript type definitions
  try {
    const typesPath = path.join(rootPath, 'src/lib/types.ts');
    const typesContent = await fs.readFile(typesPath, 'utf-8');
    const tsTypes = extractTypeScriptTypes(typesContent, component);
    
    // Merge with Go contracts
    for (const tsType of tsTypes) {
      const existingContract = contracts.find(c => c.name === tsType.name);
      if (existingContract) {
        existingContract.typeScriptDefinition = tsType.typeScriptDefinition;
      } else {
        contracts.push(tsType);
      }
    }
  } catch (error) {
    // Continue if types file doesn't exist
  }

  return contracts;
}

async function getTypeDefinitions(component: string, rootPath: string): Promise<string[]> {
  const definitions: string[] = [];

  // Check for component-specific schema files
  try {
    const schemasPath = path.join(rootPath, 'src/lib/schemas');
    const schemaFiles = await fs.readdir(schemasPath);
    
    for (const file of schemaFiles) {
      if (file.includes(component) && file.endsWith('.ts')) {
        const content = await fs.readFile(path.join(schemasPath, file), 'utf-8');
        definitions.push(`// ${file}\n${content}`);
      }
    }
  } catch (error) {
    // Continue if schemas directory doesn't exist
  }

  return definitions;
}

async function getApiEndpoints(component: string, rootPath: string): Promise<string[]> {
  const endpoints: string[] = [];

  // Try to read API specification
  try {
    const apiSpecPath = path.join(rootPath, 'API_SPEC.md');
    const apiSpec = await fs.readFile(apiSpecPath, 'utf-8');
    const componentEndpoints = extractEndpointsFromSpec(apiSpec, component);
    endpoints.push(...componentEndpoints);
  } catch (error) {
    // Try swagger.json as fallback
    try {
      const swaggerPath = path.join(rootPath, 'backend/docs/swagger.json');
      const swaggerContent = await fs.readFile(swaggerPath, 'utf-8');
      const swagger = JSON.parse(swaggerContent);
      const swaggerEndpoints = extractEndpointsFromSwagger(swagger, component);
      endpoints.push(...swaggerEndpoints);
    } catch (swaggerError) {
      // Continue if neither exists
    }
  }

  return endpoints;
}

function extractGoStructs(content: string, component: string): ApiContract[] {
  const contracts: ApiContract[] = [];
  const structRegex = /type\s+(\w+)\s+struct\s*{([^}]+)}/g;
  let match;

  while ((match = structRegex.exec(content)) !== null) {
    const structName = match[1];
    const structBody = match[2];
    
    // Check if struct is related to component
    if (structName.toLowerCase().includes(component.toLowerCase()) ||
        structBody.includes(`json:"${component}`) ||
        isComponentRelated(structName, component)) {
      
      contracts.push({
        name: structName,
        type: inferContractType(structName),
        goDefinition: match[0],
      });
    }
  }

  return contracts;
}

function extractTypeScriptTypes(content: string, component: string): ApiContract[] {
  const contracts: ApiContract[] = [];
  
  // Extract interface definitions
  const interfaceRegex = /export interface\s+(\w+)\s*{([^}]+)}/g;
  let match;

  while ((match = interfaceRegex.exec(content)) !== null) {
    const interfaceName = match[1];
    
    if (interfaceName.toLowerCase().includes(component.toLowerCase()) ||
        isComponentRelated(interfaceName, component)) {
      
      contracts.push({
        name: interfaceName,
        type: inferContractType(interfaceName),
        typeScriptDefinition: match[0],
      });
    }
  }

  // Extract type aliases
  const typeRegex = /export type\s+(\w+)\s*=([^;]+);/g;
  while ((match = typeRegex.exec(content)) !== null) {
    const typeName = match[1];
    
    if (typeName.toLowerCase().includes(component.toLowerCase()) ||
        isComponentRelated(typeName, component)) {
      
      contracts.push({
        name: typeName,
        type: inferContractType(typeName),
        typeScriptDefinition: match[0],
      });
    }
  }

  return contracts;
}

function extractEndpointsFromSpec(apiSpec: string, component: string): string[] {
  const endpoints: string[] = [];
  const lines = apiSpec.split('\n');
  
  let inComponentSection = false;
  for (const line of lines) {
    // Check for section headers
    if (line.startsWith('##') && line.toLowerCase().includes(component.toLowerCase())) {
      inComponentSection = true;
      continue;
    } else if (line.startsWith('##') && !line.toLowerCase().includes(component.toLowerCase())) {
      inComponentSection = false;
      continue;
    }
    
    // Extract endpoints if in component section
    if (inComponentSection && (line.includes('GET ') || line.includes('POST ') || 
                               line.includes('PUT ') || line.includes('DELETE ') ||
                               line.includes('PATCH '))) {
      endpoints.push(line.trim());
    }
  }
  
  return endpoints;
}

function extractEndpointsFromSwagger(swagger: any, component: string): string[] {
  const endpoints: string[] = [];
  
  if (swagger.paths) {
    for (const [path, methods] of Object.entries(swagger.paths)) {
      if (path.toLowerCase().includes(component.toLowerCase())) {
        for (const [method, details] of Object.entries(methods as Record<string, any>)) {
          if (typeof details === 'object' && details.summary) {
            endpoints.push(`${method.toUpperCase()} ${path} - ${details.summary}`);
          }
        }
      }
    }
  }
  
  return endpoints;
}

function isComponentRelated(name: string, component: string): boolean {
  const componentVariations = [
    component.toLowerCase(),
    component.charAt(0).toUpperCase() + component.slice(1),
    component.toUpperCase(),
  ];
  
  return componentVariations.some(variation => 
    name.includes(variation) || 
    name.toLowerCase().includes(variation.toLowerCase())
  );
}

function inferContractType(name: string): 'request' | 'response' | 'model' {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('request') || nameLower.includes('req') || nameLower.endsWith('input')) {
    return 'request';
  } else if (nameLower.includes('response') || nameLower.includes('resp') || nameLower.endsWith('output')) {
    return 'response';
  } else {
    return 'model';
  }
}

function generateApiSchemaSummary(
  component: string,
  contracts: ApiContract[],
  typeDefinitions: string[],
  endpoints: string[],
  includeValidation: boolean
): string {
  let summary = `# API Schema Context: ${component}\n\n`;
  summary += `Found API contracts, type definitions, and endpoints for: **${component}**\n\n`;

  // Contract alignment overview
  summary += `## Contract Alignment Overview\n\n`;
  summary += generateContractAlignment(contracts);

  // API Endpoints
  if (endpoints.length > 0) {
    summary += `## API Endpoints\n\n`;
    for (const endpoint of endpoints) {
      summary += `- ${endpoint}\n`;
    }
    summary += '\n';
  }

  // Go Backend Contracts
  const goContracts = contracts.filter(c => c.goDefinition);
  if (goContracts.length > 0) {
    summary += `## Go Backend Contracts\n\n`;
    for (const contract of goContracts) {
      summary += `### ${contract.name} (${contract.type})\n\n`;
      summary += `\`\`\`go\n${contract.goDefinition}\n\`\`\`\n\n`;
    }
  }

  // TypeScript Frontend Types
  const tsContracts = contracts.filter(c => c.typeScriptDefinition);
  if (tsContracts.length > 0) {
    summary += `## TypeScript Frontend Types\n\n`;
    for (const contract of tsContracts) {
      summary += `### ${contract.name} (${contract.type})\n\n`;
      summary += `\`\`\`typescript\n${contract.typeScriptDefinition}\n\`\`\`\n\n`;
    }
  }

  // Type Definitions (Schemas)
  if (typeDefinitions.length > 0) {
    summary += `## Type Definitions & Schemas\n\n`;
    for (const definition of typeDefinitions) {
      summary += `\`\`\`typescript\n${definition}\n\`\`\`\n\n`;
    }
  }

  // Add component-specific context
  summary += generateComponentContext(component);

  // Include validation context if requested
  if (includeValidation) {
    summary += generateValidationContext(component);
  }

  return summary;
}

function generateContractAlignment(contracts: ApiContract[]): string {
  let alignment = '';
  
  const aligned = contracts.filter(c => c.goDefinition && c.typeScriptDefinition);
  const goOnly = contracts.filter(c => c.goDefinition && !c.typeScriptDefinition);
  const tsOnly = contracts.filter(c => !c.goDefinition && c.typeScriptDefinition);

  alignment += `- **Aligned Contracts**: ${aligned.length} (Go ↔ TypeScript)\n`;
  alignment += `- **Go Only**: ${goOnly.length}\n`;
  alignment += `- **TypeScript Only**: ${tsOnly.length}\n\n`;

  if (goOnly.length > 0) {
    alignment += `**Missing TypeScript definitions**: ${goOnly.map(c => c.name).join(', ')}\n\n`;
  }

  if (tsOnly.length > 0) {
    alignment += `**Missing Go definitions**: ${tsOnly.map(c => c.name).join(', ')}\n\n`;
  }

  return alignment;
}

function generateComponentContext(component: string): string {
  const componentContexts: Record<string, string> = {
    campaign: `
## Campaign Component Context

**Key Concepts**:
- **Campaign Types**: Generation, DNS validation, HTTP keyword validation
- **State Management**: Sequential pipeline with closed-loop architecture
- **SafeBigInt Usage**: All int64 fields use SafeBigInt for type safety
- **Real-time Updates**: WebSocket integration for live status

**Type Safety Requirements**:
- ID fields must use \`UUID\` branded type
- Timestamps use \`ISODateString\` branded type
- Large numbers use \`SafeBigInt\` for int64 alignment
- Status fields use enum constraints

**API Patterns**:
- POST /api/v2/campaigns/{type} for creation
- GET /api/v2/campaigns/{id} for status
- WebSocket updates for real-time progress
`,
    persona: `
## Persona Component Context

**Key Concepts**:
- **Persona Types**: DNS and HTTP personas for domain validation
- **Configuration Management**: JSON-based configuration storage
- **Validation Rules**: Built-in validation for persona parameters
- **Health Monitoring**: Status tracking and health checks

**Type Safety Requirements**:
- Configuration uses \`Record<string, unknown>\` for flexibility
- Status enums with strict validation
- Optional fields properly typed with \`| undefined\`

**API Patterns**:
- GET/POST /api/v2/personas/dns for DNS personas
- GET/POST /api/v2/personas/http for HTTP personas
- Health check endpoints for monitoring
`,
    auth: `
## Authentication Component Context

**Key Concepts**:
- **Session-based Authentication**: HTTP-only cookies with fingerprinting
- **Role-based Access Control**: Granular permissions system
- **Token Management**: Bearer token with API key fallback
- **Security Features**: Advanced validation and audit logging

**Type Safety Requirements**:
- User ID uses \`SafeBigInt\` for int64 alignment
- Role and permission enums with strict validation
- Session data properly typed with branded types

**API Patterns**:
- POST /api/v2/auth/login for authentication
- POST /api/v2/auth/logout for session termination
- Middleware-based protection for protected routes
`,
  };

  return componentContexts[component.toLowerCase()] || '';
}

function generateValidationContext(component: string): string {
  return `
## Validation Context

**Runtime Validation**:
- Use \`validateUUID\` for UUID fields
- Use \`validateSafeBigInt\` for int64 fields
- Use \`validateNonEmptyString\` for required strings
- Use component-specific validators from \`src/lib/utils/runtime-validators.ts\`

**Schema Validation**:
- Zod schemas available in \`src/lib/schemas/\`
- Backend validation tags in Go struct definitions
- Frontend form validation with \`react-hook-form\`

**Type Guards**:
- Use branded types for type safety
- Runtime type checking with custom validators
- Comprehensive error handling with \`ValidationError\`
`;
}