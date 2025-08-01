#!/usr/bin/env tsx

/**
 * Numeric Type Fixing Script
 * 
 * Root Cause: OpenAPI generator incorrectly converts backend numeric types:
 * - sql.NullFloat64 fields → string (should be number)
 * - sql.NullInt32 fields → string (should be number) 
 * - sql.NullTime fields → UUID (should be string timestamp)
 * 
 * Real Fix: Post-process generated TypeScript types to correct numeric field types
 * while maintaining null safety and type consistency.
 */

import * as fs from 'fs';
import * as path from 'path';

interface TypeFix {
  fieldName: string;
  fromType: string;
  toType: string;
  reason: string;
}

/**
 * Define the type fixes needed for numeric fields
 */
const TYPE_FIXES: TypeFix[] = [
  {
    fieldName: 'leadScore',
    fromType: 'string',
    toType: 'number',
    reason: 'Backend stores as sql.NullFloat64 → JSON number'
  },
  {
    fieldName: 'httpStatusCode', 
    fromType: 'string',
    toType: 'number',
    reason: 'Backend stores as sql.NullInt32 → JSON number'
  },
  {
    fieldName: 'offsetIndex',
    fromType: 'number',
    toType: 'number', // Already correct but ensure required
    reason: 'Backend stores as int64 NOT NULL → required number'
  },
  {
    fieldName: 'lastValidatedAt',
    fromType: 'components["schemas"]["UUID"]',
    toType: 'string',
    reason: 'Backend stores as sql.NullTime → JSON ISO timestamp string'
  },
  {
    fieldName: 'latencyMs',
    fromType: 'string',
    toType: 'number',
    reason: 'Backend stores as sql.NullInt32 → JSON number (for Proxy model)'
  }
];

/**
 * Apply type fixes to generated TypeScript files
 */
function fixNumericTypes(): void {
  console.log('\n🔧 Fixing numeric type mismatches in generated TypeScript...');
  
  const typesFilePath = 'src/lib/api-client/types.ts';
  const modelsDir = 'src/lib/api-client/models';
  
  // Fix main types.ts file
  if (fs.existsSync(typesFilePath)) {
    fixTypesInFile(typesFilePath);
  }
  
  // Fix individual model files
  if (fs.existsSync(modelsDir)) {
    const modelFiles = fs.readdirSync(modelsDir)
      .filter(file => file.endsWith('.ts'))
      .map(file => path.join(modelsDir, file));
      
    modelFiles.forEach(fixTypesInFile);
  }
  
  console.log('✅ Numeric type fixes completed');
}

/**
 * Fix types in a specific TypeScript file
 */
function fixTypesInFile(filePath: string): void {
  console.log(`  📝 Processing: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  let modifiedContent = content;
  let changesMade = false;
  
  for (const fix of TYPE_FIXES) {
    // Pattern to match field definitions like: 'fieldName'?: string;
    const fieldPattern = new RegExp(
      `(['"]${fix.fieldName}['"]\\??)(\\s*:\\s*)${escapeRegex(fix.fromType)}([;\\s,])`,
      'g'
    );
    
    const replacement = `$1$2${fix.toType}$3`;
    
    if (fieldPattern.test(modifiedContent)) {
      modifiedContent = modifiedContent.replace(fieldPattern, replacement);
      changesMade = true;
      console.log(`    ✅ Fixed ${fix.fieldName}: ${fix.fromType} → ${fix.toType}`);
    }
  }
  
  // Special case: Make offsetIndex required (remove optional ?)
  const optionalPattern = /'offsetIndex'\?:/g;
  if (optionalPattern.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(optionalPattern, "'offsetIndex':");
    changesMade = true;
    console.log(`    ✅ Made offsetIndex required (removed optional ?)`);
  }
  
  // Write changes if any were made
  if (changesMade) {
    fs.writeFileSync(filePath, modifiedContent, 'utf-8');
    console.log(`    💾 Saved changes to ${filePath}`);
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Main execution
 */
if (require.main === module) {
  try {
    fixNumericTypes();
    console.log('\n🎉 All numeric type fixes applied successfully!');
  } catch (error) {
    console.error('\n❌ Error applying numeric type fixes:', error);
    process.exit(1);
  }
}

export { fixNumericTypes, TYPE_FIXES };
