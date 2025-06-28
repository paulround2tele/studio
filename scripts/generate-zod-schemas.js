#!/usr/bin/env node

/**
 * Code Generation Script: Go Validation Tags to Zod Schemas
 * 
 * This script parses Go struct definitions and their validation tags
 * to generate corresponding TypeScript Zod validation schemas.
 * 
 * Usage: node scripts/generate-zod-schemas.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  inputDir: './backend/internal',
  outputDir: './src/lib/schemas/generated',
  patterns: {
    // Files to scan for Go structs with validation tags
    goFiles: ['**/*.go'],
    // Struct patterns to extract
    structPattern: /type\s+(\w+)\s+struct\s*\{([^}]+)\}/gs,
    // Field patterns with validation tags - improved to handle omitempty correctly
    fieldPattern: /(\w+)\s+([*]?)(\w+(?:\.\w+)?)\s+`[^`]*json:"([^"]+)"[^`]*(?:(?:binding:"([^"]+)")|(?:validate:"([^"]+)"))?\s*.*?`/g
  }
};

/**
 * Mapping from Go validation tags to Zod validators
 */
const VALIDATION_MAPPINGS = {
  // Basic validators
  'required': (field) => field.endsWith('.optional()') ? field.replace('.optional()', '') : field,
  'omitempty': (field) => field.includes('.optional()') ? field : `${field}.optional()`,
  
  // String validators
  'email': (field) => `${field}.email()`,
  'url': (field) => `${field}.url()`,
  'uuid': (field) => `${field}.uuid()`,
  'hostname_port': (field) => `${field}.regex(/^[a-zA-Z0-9.-]+:[0-9]+$/, "Invalid hostname:port format")`,
  
  // Length validators
  'min': (field, value) => `${field}.min(${value})`,
  'max': (field, value) => `${field}.max(${value})`,
  'len': (field, value) => `${field}.length(${value})`,
  
  // Numeric validators
  'gte': (field, value) => `${field}.gte(${value})`,
  'lte': (field, value) => `${field}.lte(${value})`,
  'gt': (field, value) => `${field}.gt(${value})`,
  'lt': (field, value) => `${field}.lt(${value})`,
  
  // Enum validators
  'oneof': (field, values) => {
    const enumValues = values.split(' ').map(v => `"${v}"`).join(', ');
    return `z.enum([${enumValues}])`;
  },
  
  // Special validators
  'dive': (field) => `z.array(${field.replace('z.array(', '').replace(/\)$/, '')}).min(1)`
};

/**
 * Maps Go types to Zod base types
 */
const TYPE_MAPPINGS = {
  'string': 'z.string()',
  'int': 'z.number().int()',
  'int32': 'z.number().int()',
  'int64': 'z.number().int()',
  'float32': 'z.number()',
  'float64': 'z.number()',
  'bool': 'z.boolean()',
  'time.Time': 'z.string().datetime()',
  'uuid.UUID': 'z.string().uuid()',
  'json.RawMessage': 'z.record(z.any())',
  'sql.NullString': 'z.string().nullable()',
  'sql.NullInt32': 'z.number().int().nullable()',
  'sql.NullInt64': 'z.number().int().nullable()',
  'sql.NullTime': 'z.string().datetime().nullable()',
  'sql.NullBool': 'z.boolean().nullable()',
};

/**
 * Parses validation string and applies mappings
 */
function parseValidation(validationStr, baseType, isOptional = false) {
  if (!validationStr) {
    return isOptional ? `${baseType}.optional()` : baseType;
  }
  
  let result = baseType;
  const validators = validationStr.split(',');
  let shouldBeOptional = isOptional;
  
  for (const validator of validators) {
    const [rule, ...args] = validator.split('=');
    const value = args.join('=');
    
    // Handle omitempty specially
    if (rule === 'omitempty') {
      shouldBeOptional = true;
      continue;
    }
    
    if (VALIDATION_MAPPINGS[rule]) {
      result = VALIDATION_MAPPINGS[rule](result, value);
    }
  }
  
  // Add optional() at the end if needed
  return shouldBeOptional ? `${result}.optional()` : result;
}

/**
 * Converts Go type to Zod type
 */
function goTypeToZodType(goType, isPointer) {
  // Handle array types
  if (goType.startsWith('[]')) {
    const elementType = goType.slice(2);
    const elementZodType = TYPE_MAPPINGS[elementType] || 'z.any()';
    return `z.array(${elementZodType})`;
  }
  
  // Handle enum types (contains models.)
  if (goType.includes('models.') && goType.includes('Enum')) {
    const enumName = goType.replace('models.', '').replace('Enum', '');
    // Map to our predefined enum schemas
    const enumMappings = {
      'PersonaType': '_personaTypeEnumSchema',
      'ProxyProtocol': '_proxyProtocolEnumSchema',
      'CampaignType': '_campaignTypeEnumSchema',
      'CampaignStatus': '_campaignStatusEnumSchema',
      'CampaignJobStatus': '_jobStatusEnumSchema',
      'ValidationStatus': '_validationStatusEnumSchema',
      'DNSValidationStatus': '_dnsValidationStatusEnumSchema',
      'HTTPValidationStatus': '_httpValidationStatusEnumSchema',
      'KeywordRuleType': '_keywordRuleTypeEnumSchema'
    };
    return enumMappings[enumName] || `${enumName.toLowerCase()}EnumSchema`;
  }
  
  // Return base type without .optional() - we'll handle that in parseValidation
  return TYPE_MAPPINGS[goType] || 'z.any()';
}

/**
 * Extracts struct information from Go source
 */
function extractStructs(sourceCode) {
  const structs = [];
  let match;
  
  while ((match = CONFIG.patterns.structPattern.exec(sourceCode)) !== null) {
    const structName = match[1];
    const structBody = match[2];
    
    // Include request/response structs, main model structs, and structs with validation tags
    const isRequestResponse = structName.includes('Request') || structName.includes('Response');
    const isMainModel = ['Persona', 'Proxy', 'KeywordSet', 'KeywordRule', 'Campaign', 'User'].includes(structName);
    const hasValidationTags = structBody.includes('binding:') || structBody.includes('validate:');
    
    if (!isRequestResponse && !isMainModel && !hasValidationTags) {
      continue;
    }
    
    const fields = [];
    let fieldMatch;
    
    // Reset regex for field extraction
    CONFIG.patterns.fieldPattern.lastIndex = 0;
    
    while ((fieldMatch = CONFIG.patterns.fieldPattern.exec(structBody)) !== null) {
      const fieldName = fieldMatch[1];
      const isPointer = fieldMatch[2] === '*';
      const goType = fieldMatch[3];
      const jsonTag = fieldMatch[4];
      const bindingTag = fieldMatch[5];
      const validateTag = fieldMatch[6];
      
      // Parse JSON tag (format: "fieldName" or "fieldName,omitempty")
      const jsonParts = jsonTag.split(',');
      const jsonName = jsonParts[0];
      const isOmitEmpty = jsonParts.includes('omitempty');
      
      // Skip fields without JSON tags or with "-" JSON tags
      if (!jsonName || jsonName === '-') continue;
      
      fields.push({
        name: fieldName,
        jsonName: jsonName,
        goType,
        isPointer: isPointer || isOmitEmpty,
        validation: bindingTag || validateTag || ''
      });
    }
    
    if (fields.length > 0) {
      structs.push({ name: structName, fields });
    }
  }
  
  return structs;
}

/**
 * Generates Zod schema for a struct
 */
function generateZodSchema(struct) {
  const schemaName = `${struct.name.charAt(0).toLowerCase() + struct.name.slice(1)}Schema`;
  
  let schema = `export const ${schemaName} = z.object({\n`;
  
  for (const field of struct.fields) {
    const baseType = goTypeToZodType(field.goType, field.isPointer);
    const finalType = parseValidation(field.validation, baseType, field.isPointer);
    
    schema += `  ${field.jsonName}: ${finalType},\n`;
  }
  
  schema += '});\n\n';
  schema += `export type ${struct.name} = z.infer<typeof ${schemaName}>;\n\n`;
  
  return schema;
}

/**
 * Scans directory for Go files
 */
function scanGoFiles(dir) {
  const files = [];
  
  function scanDir(currentDir) {
    const entries = fs.readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.endsWith('.go')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDir(dir);
  return files;
}

/**
 * Main execution function
 */
function main() {
  console.log('🚀 Generating Zod schemas from Go validation tags...\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Scan for Go files
  const goFiles = scanGoFiles(CONFIG.inputDir);
  console.log(`📁 Found ${goFiles.length} Go files to scan\n`);
  
  let structsByFile = {};
  
  // Extract structs from each file
  for (const filePath of goFiles) {
    try {
      const sourceCode = fs.readFileSync(filePath, 'utf8');
      const structs = extractStructs(sourceCode);
      
      if (structs.length > 0) {
        console.log(`📋 ${path.relative('.', filePath)}: ${structs.length} structs`);
        structsByFile[filePath] = structs;
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  console.log(`\n✅ Total extracted structs: ${Object.values(structsByFile).flat().length}`);
  
  // Deduplicate structs by name, prioritizing those from models.go
  const allStructs = [];
  const seenStructNames = new Set();
  
  // First pass: Add structs from models.go files
  for (const filePath of Object.keys(structsByFile)) {
    if (filePath.includes('models.go')) {
      for (const struct of structsByFile[filePath]) {
        if (!seenStructNames.has(struct.name)) {
          allStructs.push({ ...struct, sourceFile: filePath });
          seenStructNames.add(struct.name);
        }
      }
    }
  }
  
  // Second pass: Add remaining structs from other files, skipping duplicates
  for (const filePath of Object.keys(structsByFile)) {
    if (!filePath.includes('models.go')) {
      for (const struct of structsByFile[filePath]) {
        if (!seenStructNames.has(struct.name)) {
          allStructs.push({ ...struct, sourceFile: filePath });
          seenStructNames.add(struct.name);
        }
      }
    }
  }
  
  console.log(`\n✅ After deduplication: ${allStructs.length} unique structs\n`);
  
  // Generate schemas
  let generatedContent = `// Auto-generated Zod schemas from Go validation tags
// Generated on: ${new Date().toISOString()}
// Do not edit this file manually - it will be overwritten

import { z } from 'zod';

// Enum schemas (defined inline to avoid circular imports)
const _personaTypeEnumSchema = z.enum(['dns', 'http']);
const _proxyProtocolEnumSchema = z.enum(['http', 'https', 'socks5', 'socks4']);
const _campaignTypeEnumSchema = z.enum(['domain_generation', 'dns_validation', 'http_keyword_validation']);
const _campaignStatusEnumSchema = z.enum(['pending', 'queued', 'running', 'pausing', 'paused', 'completed', 'failed', 'archived', 'cancelled']);
const _jobStatusEnumSchema = z.enum(['pending', 'queued', 'running', 'processing', 'completed', 'failed', 'retry']);
const _validationStatusEnumSchema = z.enum(['pending', 'valid', 'invalid', 'error', 'skipped']);
const _dnsValidationStatusEnumSchema = z.enum(['resolved', 'unresolved', 'timeout', 'error']);
const _httpValidationStatusEnumSchema = z.enum(['success', 'failed', 'timeout', 'error']);
const _keywordRuleTypeEnumSchema = z.enum(['string', 'regex']);

// Export enum schemas for use in generated schemas
export const personaTypeEnumSchema = _personaTypeEnumSchema;
export const proxyProtocolEnumSchema = _proxyProtocolEnumSchema;
export const campaignTypeEnumSchema = _campaignTypeEnumSchema;
export const campaignStatusEnumSchema = _campaignStatusEnumSchema;
export const jobStatusEnumSchema = _jobStatusEnumSchema;
export const validationStatusEnumSchema = _validationStatusEnumSchema;
export const dnsValidationStatusEnumSchema = _dnsValidationStatusEnumSchema;
export const httpValidationStatusEnumSchema = _httpValidationStatusEnumSchema;
export const keywordRuleTypeEnumSchema = _keywordRuleTypeEnumSchema;

`;
  
  for (const struct of allStructs) {
    console.log(`🔧 Generating schema for ${struct.name}`);
    generatedContent += generateZodSchema(struct);
  }
  
  // Write output file
  const outputFile = path.join(CONFIG.outputDir, 'validationSchemas.ts');
  fs.writeFileSync(outputFile, generatedContent);
  
  console.log(`\n🎉 Generated schemas written to: ${outputFile}`);
  console.log(`📊 Generated ${allStructs.length} validation schemas`);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { extractStructs, generateZodSchema, goTypeToZodType, parseValidation };
