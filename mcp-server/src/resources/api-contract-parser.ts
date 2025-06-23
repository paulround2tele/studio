import * as fs from 'fs/promises';
import * as path from 'path';

interface ApiContractData {
  summary: string;
  contractAlignment: ContractAlignment;
  endpoints: ApiEndpoint[];
  models: ContractModel[];
  validationRules: ValidationRule[];
  typeMapping: TypeMapping[];
}

interface ContractAlignment {
  alignedCount: number;
  missingTypescript: string[];
  missingGo: string[];
  alignmentPercentage: number;
}

interface ApiEndpoint {
  method: string;
  path: string;
  handler: string;
  requestType?: string;
  responseType?: string;
  description: string;
}

interface ContractModel {
  name: string;
  type: 'go' | 'typescript' | 'both';
  goDefinition?: string;
  typescriptDefinition?: string;
  fields: ModelField[];
}

interface ModelField {
  name: string;
  goType?: string;
  typescriptType?: string;
  validation?: string;
  description: string;
}

interface ValidationRule {
  entity: string;
  field: string;
  rule: string;
  description: string;
}

interface TypeMapping {
  postgresType: string;
  goType: string;
  typescriptType: string;
  notes: string;
}

/**
 * API Contract Parser Resource
 * 
 * Analyzes and provides Go backend and TypeScript frontend type contracts.
 * Tracks contract alignment and identifies discrepancies.
 */
export async function apiContractParser(rootPath: string) {
  try {
    const contractData = await parseApiContracts(rootPath);
    const contractJson = JSON.stringify(contractData, null, 2);

    return {
      contents: [
        {
          type: 'text',
          text: contractJson,
        },
      ],
    };
  } catch (error) {
    throw new Error(`Failed to parse API contracts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function parseApiContracts(rootPath: string): Promise<ApiContractData> {
  const endpoints = await parseApiEndpoints(rootPath);
  const models = await parseContractModels(rootPath);
  const validationRules = await parseValidationRules(rootPath);
  const typeMapping = getTypeMapping();
  const contractAlignment = calculateContractAlignment(models);
  const summary = generateContractSummary(contractAlignment, endpoints, models);

  return {
    summary,
    contractAlignment,
    endpoints,
    models,
    validationRules,
    typeMapping,
  };
}

async function parseApiEndpoints(rootPath: string): Promise<ApiEndpoint[]> {
  const endpoints: ApiEndpoint[] = [];

  // Parse from API_SPEC.md
  try {
    const apiSpecPath = path.join(rootPath, 'API_SPEC.md');
    const apiSpec = await fs.readFile(apiSpecPath, 'utf-8');
    endpoints.push(...parseEndpointsFromSpec(apiSpec));
  } catch (error) {
    // Continue if API spec doesn't exist
  }

  // Parse from Swagger/OpenAPI
  try {
    const swaggerPath = path.join(rootPath, 'backend/docs/swagger.json');
    const swagger = JSON.parse(await fs.readFile(swaggerPath, 'utf-8'));
    endpoints.push(...parseEndpointsFromSwagger(swagger));
  } catch (error) {
    // Continue if swagger doesn't exist
  }

  // Parse from Go handlers
  try {
    const handlersPath = path.join(rootPath, 'backend/internal/handlers');
    const handlerFiles = await fs.readdir(handlersPath);
    
    for (const file of handlerFiles) {
      if (file.endsWith('.go')) {
        const content = await fs.readFile(path.join(handlersPath, file), 'utf-8');
        endpoints.push(...parseEndpointsFromGoHandlers(content, file));
      }
    }
  } catch (error) {
    // Continue if handlers directory doesn't exist
  }

  return deduplicateEndpoints(endpoints);
}

async function parseContractModels(rootPath: string): Promise<ContractModel[]> {
  const models: ContractModel[] = [];

  // Parse Go models
  const goModels = await parseGoModels(rootPath);
  models.push(...goModels);

  // Parse TypeScript types
  const tsModels = await parseTypeScriptModels(rootPath);
  
  // Merge TypeScript with Go models
  for (const tsModel of tsModels) {
    const existingModel = models.find(m => m.name === tsModel.name);
    if (existingModel) {
      existingModel.type = 'both';
      existingModel.typescriptDefinition = tsModel.typescriptDefinition;
      // Merge fields
      for (const tsField of tsModel.fields) {
        const existingField = existingModel.fields.find(f => f.name === tsField.name);
        if (existingField) {
          existingField.typescriptType = tsField.typescriptType;
        } else {
          existingModel.fields.push(tsField);
        }
      }
    } else {
      models.push(tsModel);
    }
  }

  return models;
}

async function parseGoModels(rootPath: string): Promise<ContractModel[]> {
  const models: ContractModel[] = [];

  try {
    const modelsPath = path.join(rootPath, 'backend/internal/models');
    const modelFiles = await fs.readdir(modelsPath);

    for (const file of modelFiles) {
      if (file.endsWith('.go') && !file.endsWith('_test.go')) {
        const content = await fs.readFile(path.join(modelsPath, file), 'utf-8');
        models.push(...parseGoStructs(content));
      }
    }
  } catch (error) {
    // Models directory might not exist
  }

  return models;
}

async function parseTypeScriptModels(rootPath: string): Promise<ContractModel[]> {
  const models: ContractModel[] = [];

  try {
    // Parse main types file
    const typesPath = path.join(rootPath, 'src/lib/types.ts');
    const typesContent = await fs.readFile(typesPath, 'utf-8');
    models.push(...parseTypeScriptInterfaces(typesContent));
  } catch (error) {
    // Types file might not exist
  }

  try {
    // Parse schema files
    const schemasPath = path.join(rootPath, 'src/lib/schemas');
    const schemaFiles = await fs.readdir(schemasPath);

    for (const file of schemaFiles) {
      if (file.endsWith('.ts')) {
        const content = await fs.readFile(path.join(schemasPath, file), 'utf-8');
        models.push(...parseTypeScriptInterfaces(content));
      }
    }
  } catch (error) {
    // Schemas directory might not exist
  }

  return models;
}

function parseEndpointsFromSpec(apiSpec: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  const lines = apiSpec.split('\n');

  for (const line of lines) {
    const httpMethodMatch = line.match(/^(GET|POST|PUT|DELETE|PATCH)\s+([^\s]+)(?:\s+-\s+(.*))?/);
    if (httpMethodMatch) {
      endpoints.push({
        method: httpMethodMatch[1],
        path: httpMethodMatch[2],
        handler: inferHandlerName(httpMethodMatch[1], httpMethodMatch[2]),
        description: httpMethodMatch[3] || 'API endpoint',
      });
    }
  }

  return endpoints;
}

function parseEndpointsFromSwagger(swagger: any): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];

  if (swagger.paths) {
    for (const [path, methods] of Object.entries(swagger.paths)) {
      for (const [method, details] of Object.entries(methods as Record<string, any>)) {
        if (typeof details === 'object' && details.operationId) {
          endpoints.push({
            method: method.toUpperCase(),
            path,
            handler: details.operationId,
            description: details.summary || details.description || 'API endpoint',
          });
        }
      }
    }
  }

  return endpoints;
}

function parseEndpointsFromGoHandlers(content: string, filename: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  
  // Look for router group definitions
  const routeRegex = /\w+\.(GET|POST|PUT|DELETE|PATCH)\s*\(\s*["']([^"']+)["']\s*,\s*(\w+)/g;
  let match;

  while ((match = routeRegex.exec(content)) !== null) {
    endpoints.push({
      method: match[1],
      path: match[2],
      handler: match[3],
      description: `Handler from ${filename}`,
    });
  }

  return endpoints;
}

function parseGoStructs(content: string): ContractModel[] {
  const models: ContractModel[] = [];
  const structRegex = /type\s+(\w+)\s+struct\s*{([^}]+)}/g;
  let match;

  while ((match = structRegex.exec(content)) !== null) {
    const structName = match[1];
    const structBody = match[2];
    
    const fields = parseGoStructFields(structBody);
    
    models.push({
      name: structName,
      type: 'go',
      goDefinition: match[0],
      fields,
    });
  }

  return models;
}

function parseGoStructFields(structBody: string): ModelField[] {
  const fields: ModelField[] = [];
  const lines = structBody.split('\n').map(l => l.trim()).filter(l => l);

  for (const line of lines) {
    const fieldMatch = line.match(/^(\w+)\s+([^\s`]+)(?:\s+`([^`]+)`)?/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const tags = fieldMatch[3] || '';

      const validation = extractValidationFromTags(tags);
      const description = generateFieldDescription(fieldName, fieldType);

      fields.push({
        name: fieldName,
        goType: fieldType,
        validation,
        description,
      });
    }
  }

  return fields;
}

function parseTypeScriptInterfaces(content: string): ContractModel[] {
  const models: ContractModel[] = [];
  
  // Parse interfaces
  const interfaceRegex = /export interface\s+(\w+)\s*{([^}]+)}/g;
  let match;

  while ((match = interfaceRegex.exec(content)) !== null) {
    const interfaceName = match[1];
    const interfaceBody = match[2];
    
    const fields = parseTypeScriptFields(interfaceBody);
    
    models.push({
      name: interfaceName,
      type: 'typescript',
      typescriptDefinition: match[0],
      fields,
    });
  }

  // Parse type aliases
  const typeRegex = /export type\s+(\w+)\s*=\s*([^;]+);/g;
  while ((match = typeRegex.exec(content)) !== null) {
    const typeName = match[1];
    const typeDefinition = match[2];
    
    models.push({
      name: typeName,
      type: 'typescript',
      typescriptDefinition: match[0],
      fields: [{
        name: 'definition',
        typescriptType: typeDefinition,
        description: 'Type alias definition',
      }],
    });
  }

  return models;
}

function parseTypeScriptFields(interfaceBody: string): ModelField[] {
  const fields: ModelField[] = [];
  const lines = interfaceBody.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

  for (const line of lines) {
    const fieldMatch = line.match(/^(\w+)(\?)?\s*:\s*([^;,]+)[;,]?/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const isOptional = !!fieldMatch[2];
      const fieldType = fieldMatch[3].trim();

      fields.push({
        name: fieldName,
        typescriptType: isOptional ? `${fieldType} | undefined` : fieldType,
        description: generateFieldDescription(fieldName, fieldType),
      });
    }
  }

  return fields;
}

async function parseValidationRules(rootPath: string): Promise<ValidationRule[]> {
  const rules: ValidationRule[] = [];

  // Parse from Go validation tags
  try {
    const modelsPath = path.join(rootPath, 'backend/internal/models');
    const modelFiles = await fs.readdir(modelsPath);

    for (const file of modelFiles) {
      if (file.endsWith('.go')) {
        const content = await fs.readFile(path.join(modelsPath, file), 'utf-8');
        rules.push(...extractValidationRulesFromGo(content));
      }
    }
  } catch (error) {
    // Continue if models don't exist
  }

  // Parse from TypeScript validators
  try {
    const validatorsPath = path.join(rootPath, 'src/lib/utils/runtime-validators.ts');
    const validatorsContent = await fs.readFile(validatorsPath, 'utf-8');
    rules.push(...extractValidationRulesFromTypeScript(validatorsContent));
  } catch (error) {
    // Continue if validators don't exist
  }

  return rules;
}

function extractValidationFromTags(tags: string): string | undefined {
  const validationMatch = tags.match(/validate:"([^"]+)"/);
  return validationMatch ? validationMatch[1] : undefined;
}

function extractValidationRulesFromGo(content: string): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const tagMatch = line.match(/(\w+)\s+[^\s`]+\s+`[^`]*validate:"([^"]+)"[^`]*`/);
    if (tagMatch) {
      const fieldName = tagMatch[1];
      const validation = tagMatch[2];
      
      rules.push({
        entity: 'Go Model',
        field: fieldName,
        rule: validation,
        description: `Go validation: ${validation}`,
      });
    }
  }

  return rules;
}

function extractValidationRulesFromTypeScript(content: string): ValidationRule[] {
  const rules: ValidationRule[] = [];
  
  // Look for validation function names
  const validatorFunctions = [
    'validateUUID', 'validateEmail', 'validateSafeBigInt', 
    'validateNonEmptyString', 'validateCampaignStatus'
  ];

  for (const validator of validatorFunctions) {
    if (content.includes(validator)) {
      rules.push({
        entity: 'TypeScript',
        field: validator.replace('validate', '').toLowerCase(),
        rule: validator,
        description: `TypeScript runtime validator: ${validator}`,
      });
    }
  }

  return rules;
}

function generateFieldDescription(fieldName: string, fieldType: string): string {
  const descriptions: Record<string, string> = {
    'id': 'Unique identifier',
    'userId': 'User reference',
    'campaignId': 'Campaign reference',
    'name': 'Display name',
    'email': 'Email address',
    'status': 'Current status',
    'createdAt': 'Creation timestamp',
    'updatedAt': 'Last update timestamp',
    'config': 'Configuration data',
    'results': 'Operation results',
  };

  const knownDescription = descriptions[fieldName];
  if (knownDescription) return knownDescription;

  if (fieldType.includes('BigInt') || fieldType.includes('SafeBigInt')) {
    return 'Large integer value (SafeBigInt for type safety)';
  } else if (fieldType.includes('UUID')) {
    return 'UUID identifier (branded type)';
  } else if (fieldType.includes('ISODateString') || fieldType.includes('time.Time')) {
    return 'Timestamp in ISO format';
  } else if (fieldType.includes('json') || fieldType.includes('Record')) {
    return 'JSON configuration or data';
  }

  return `${fieldType} field`;
}

function calculateContractAlignment(models: ContractModel[]): ContractAlignment {
  const alignedModels = models.filter(m => m.type === 'both');
  const goOnlyModels = models.filter(m => m.type === 'go');
  const tsOnlyModels = models.filter(m => m.type === 'typescript');

  const alignmentPercentage = models.length > 0 
    ? Math.round((alignedModels.length / models.length) * 100)
    : 100;

  return {
    alignedCount: alignedModels.length,
    missingTypescript: goOnlyModels.map(m => m.name),
    missingGo: tsOnlyModels.map(m => m.name),
    alignmentPercentage,
  };
}

function getTypeMapping(): TypeMapping[] {
  return [
    {
      postgresType: 'BIGINT',
      goType: 'int64',
      typescriptType: 'SafeBigInt',
      notes: 'Use SafeBigInt to prevent precision loss in JavaScript',
    },
    {
      postgresType: 'UUID',
      goType: 'uuid.UUID',
      typescriptType: 'UUID',
      notes: 'Branded type for compile-time UUID validation',
    },
    {
      postgresType: 'TIMESTAMP',
      goType: 'time.Time',
      typescriptType: 'ISODateString',
      notes: 'ISO 8601 string format for consistency',
    },
    {
      postgresType: 'TEXT',
      goType: 'string',
      typescriptType: 'string',
      notes: 'Standard string type across all layers',
    },
    {
      postgresType: 'BOOLEAN',
      goType: 'bool',
      typescriptType: 'boolean',
      notes: 'Standard boolean type',
    },
    {
      postgresType: 'JSONB',
      goType: 'json.RawMessage',
      typescriptType: 'Record<string, unknown>',
      notes: 'Flexible JSON with runtime validation',
    },
    {
      postgresType: 'INTEGER',
      goType: 'int32',
      typescriptType: 'number',
      notes: 'Standard 32-bit integer',
    },
  ];
}

function deduplicateEndpoints(endpoints: ApiEndpoint[]): ApiEndpoint[] {
  const seen = new Set<string>();
  return endpoints.filter(endpoint => {
    const key = `${endpoint.method}:${endpoint.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferHandlerName(method: string, path: string): string {
  const pathParts = path.split('/').filter(p => p && !p.startsWith(':'));
  const resource = pathParts[pathParts.length - 1] || 'handler';
  return `${method.toLowerCase()}${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
}

function generateContractSummary(
  alignment: ContractAlignment,
  endpoints: ApiEndpoint[],
  models: ContractModel[]
): string {
  return `
# DomainFlow API Contract Analysis

## Contract Alignment Status
- **Alignment Percentage**: ${alignment.alignmentPercentage}%
- **Aligned Models**: ${alignment.alignedCount}
- **Missing TypeScript**: ${alignment.missingTypescript.length} models
- **Missing Go**: ${alignment.missingGo.length} models

## API Overview
- **Total Endpoints**: ${endpoints.length}
- **Total Models**: ${models.length}
- **Go Models**: ${models.filter(m => m.type === 'go' || m.type === 'both').length}
- **TypeScript Models**: ${models.filter(m => m.type === 'typescript' || m.type === 'both').length}

## Key Features
- **Type Safety**: SafeBigInt for int64 fields, UUID branded types
- **Contract Sync**: Automated generation scripts maintain alignment
- **Validation**: Runtime validation on both Go and TypeScript sides
- **Real-time**: WebSocket integration with typed message contracts

## Missing Alignments
${alignment.missingTypescript.length > 0 ? `
### Models needing TypeScript definitions:
${alignment.missingTypescript.map(name => `- ${name}`).join('\n')}
` : ''}

${alignment.missingGo.length > 0 ? `
### Models needing Go definitions:
${alignment.missingGo.map(name => `- ${name}`).join('\n')}
` : ''}

## Usage Guidelines
1. Always use branded types (UUID, SafeBigInt, ISODateString)
2. Validate at API boundaries with runtime validators
3. Run contract sync scripts after model changes
4. Maintain enum alignment between Go and TypeScript
5. Use consistent naming conventions across all layers
`.trim();
}