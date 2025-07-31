#!/usr/bin/env ts-node

/**
 * Post-processing script to fix UUID types in generated API client
 * 
 * This script finds all fields that should be UUID types (based on OpenAPI spec)
 * and replaces them in the generated TypeScript files.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface OpenAPISpec {
  components: {
    schemas: Record<string, any>;
  };
}

class UUIDTypeFixer {
  private spec: OpenAPISpec;
  private uuidFields: Map<string, string[]> = new Map(); // schema -> field names
  
  constructor(specPath: string) {
    const specContent = fs.readFileSync(specPath, 'utf-8');
    this.spec = yaml.load(specContent) as OpenAPISpec;
    this.extractUUIDFields();
  }

  /**
   * Extract all fields that reference UUID schema
   */
  private extractUUIDFields() {
    const schemas = this.spec.components.schemas;
    
    for (const [schemaName, schema] of Object.entries(schemas)) {
      if (!schema.properties) continue;
      
      const uuidFieldNames: string[] = [];
      
      for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
        // Check if field references UUID schema
        if (this.isUUIDReference(fieldDef)) {
          uuidFieldNames.push(fieldName);
        }
        
        // Check array items
        if ((fieldDef as any).type === 'array' && (fieldDef as any).items) {
          if (this.isUUIDReference((fieldDef as any).items)) {
            uuidFieldNames.push(fieldName);
          }
        }
      }
      
      if (uuidFieldNames.length > 0) {
        this.uuidFields.set(schemaName, uuidFieldNames);
        console.log(`Found ${uuidFieldNames.length} UUID fields in ${schemaName}:`, uuidFieldNames);
      }
    }
    
    console.log(`\nTotal schemas with UUID fields: ${this.uuidFields.size}`);
  }
  
  /**
   * Check if a field definition references UUID schema
   */
  private isUUIDReference(fieldDef: any): boolean {
    return fieldDef && fieldDef.$ref === '#/components/schemas/UUID';
  }
  
  /**
   * Convert PascalCase to kebab-case for filename matching
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }
  
  /**
   * Fix UUID types in generated TypeScript files
   */
  public async fixGeneratedFiles(modelsDir: string) {
    console.log(`\n🔧 Fixing UUID types in ${modelsDir}...`);
    
    let totalFixedFiles = 0;
    let totalFixedFields = 0;
    
    for (const [schemaName, uuidFieldNames] of this.uuidFields) {
      const possibleFilenames = [
        `${this.toKebabCase(schemaName)}.ts`,
        `${schemaName.toLowerCase()}.ts`,
        `${schemaName}.ts`
      ];
      
      let filePath: string | null = null;
      
      // Find the actual file
      for (const filename of possibleFilenames) {
        const testPath = path.join(modelsDir, filename);
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          break;
        }
      }
      
      if (!filePath) {
        console.log(`⚠️  Could not find file for schema: ${schemaName}`);
        continue;
      }
      
      const fixed = await this.fixFileUUIDs(filePath, uuidFieldNames, schemaName);
      if (fixed > 0) {
        totalFixedFiles++;
        totalFixedFields += fixed;
        console.log(`✅ Fixed ${fixed} UUID fields in ${path.basename(filePath)}`);
      }
    }
    
    console.log(`\n🎯 Summary: Fixed ${totalFixedFields} UUID fields in ${totalFixedFiles} files`);
  }
  
  /**
   * Fix UUID types in a specific TypeScript file
   */
  private async fixFileUUIDs(filePath: string, uuidFieldNames: string[], schemaName: string): Promise<number> {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixedCount = 0;
    let needsUUIDImport = false;
    
    // Check if file already imports UUID
    const hasUUIDImport = content.includes("import type { UUID } from '../uuid-types'");
    
    for (const fieldName of uuidFieldNames) {
      // Pattern to match field definitions like:  'fieldName'?: string;
      const stringFieldPattern = new RegExp(
        `(\\s*'${fieldName}'\\??):\\s*string(\\[\\])?;`,
        'g'
      );
      
      // Pattern to match array types like: Array<string>
      const arrayFieldPattern = new RegExp(
        `(\\s*'${fieldName}'\\??):\\s*Array<string>;`,
        'g'
      );
      
      // Replace string with UUID
      const originalContent = content;
      content = content.replace(stringFieldPattern, (match, fieldPart, arrayPart) => {
        fixedCount++;
        needsUUIDImport = true;
        return `${fieldPart}: ${arrayPart ? 'UUID[]' : 'UUID'};`;
      });
      
      content = content.replace(arrayFieldPattern, (match, fieldPart) => {
        fixedCount++;
        needsUUIDImport = true;
        return `${fieldPart}: UUID[];`;
      });
      
      if (content !== originalContent) {
        console.log(`  - Fixed field '${fieldName}' in ${schemaName}`);
      }
    }
    
    // Add UUID import if needed and not already present
    if (needsUUIDImport && !hasUUIDImport) {
      // Find the right place to add the import (after the header comment but before the interface)
      const headerCommentEnd = content.search(/\*\/\n/);
      if (headerCommentEnd !== -1) {
        const insertPoint = headerCommentEnd + 3; // After */\n
        const beforeInsert = content.substring(0, insertPoint);
        const afterInsert = content.substring(insertPoint);
        content = beforeInsert + "\nimport type { UUID } from '../uuid-types';\n" + afterInsert;
      } else {
        // Fallback: add at the beginning after any shebang
        content = "import type { UUID } from '../uuid-types';\n\n" + content;
      }
    }
    
    if (fixedCount > 0) {
      fs.writeFileSync(filePath, content);
    }
    
    return fixedCount;
  }
}

// Main execution
async function main() {
  const specPath = path.join(__dirname, '../backend/docs/openapi-3.yaml');
  const modelsDir = path.join(__dirname, '../src/lib/api-client/models');
  
  if (!fs.existsSync(specPath)) {
    console.error(`❌ OpenAPI spec not found: ${specPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(modelsDir)) {
    console.error(`❌ Models directory not found: ${modelsDir}`);
    process.exit(1);
  }
  
  console.log('🚀 Starting UUID type fixing...');
  console.log(`📖 Reading spec: ${specPath}`);
  console.log(`📁 Processing models: ${modelsDir}`);
  
  try {
    const fixer = new UUIDTypeFixer(specPath);
    await fixer.fixGeneratedFiles(modelsDir);
    console.log('\n✅ UUID type fixing completed successfully!');
  } catch (error) {
    console.error('❌ Error during UUID type fixing:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}