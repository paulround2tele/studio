#!/usr/bin/env node
/**
 * Compiler Hardening Report Script
 * Phase 3: Compiler Hardening & allowJs Evaluation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const TYPESCRIPT_CONFIG = 'tsconfig.json';
const BACKUP_CONFIG = 'tsconfig.json.backup';

/**
 * Test TypeScript configuration changes
 */
async function testCompilerFlags() {
  console.log('🔍 Testing TypeScript Compiler Hardening...\n');

  // Backup original config
  const originalConfig = fs.readFileSync(TYPESCRIPT_CONFIG, 'utf8');
  fs.writeFileSync(BACKUP_CONFIG, originalConfig);

  const results = {};

  try {
    // Analyze current state
    results.currentErrors = analyzeCurrentErrors();
    
    // Test exactOptionalPropertyTypes
    results.exactOptional = await testExactOptionalPropertyTypes();
    
    // Test allowJs removal
    results.allowJs = await testAllowJsRemoval();
    
    // Test skipLibCheck requirement
    results.skipLibCheck = await testSkipLibCheck();

    // Generate recommendations
    const recommendations = generateRecommendations(results);

    // Write detailed report
    writeReport(results, recommendations);

    return results;

  } finally {
    // Restore original config
    fs.writeFileSync(TYPESCRIPT_CONFIG, originalConfig);
    if (fs.existsSync(BACKUP_CONFIG)) {
      fs.unlinkSync(BACKUP_CONFIG);
    }
  }
}

/**
 * Test enabling exactOptionalPropertyTypes
 */
async function testExactOptionalPropertyTypes() {
  console.log('📋 Testing exactOptionalPropertyTypes...\n');
  
  const config = JSON.parse(fs.readFileSync(TYPESCRIPT_CONFIG, 'utf8'));
  config.compilerOptions.exactOptionalPropertyTypes = true;
  
  fs.writeFileSync(TYPESCRIPT_CONFIG, JSON.stringify(config, null, 2));
  
  try {
    const output = execSync('npx tsc --noEmit', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ exactOptionalPropertyTypes: No new errors\n');
    return { success: true, errors: [] };
  } catch (error) {
    const errorOutput = error.stdout || error.stderr || '';
    const errorLines = errorOutput.split('\n').filter(line => line.includes('error TS'));
    
    console.log(`❌ exactOptionalPropertyTypes: ${errorLines.length} new errors`);
    console.log('Sample errors:');
    errorLines.slice(0, 10).forEach(line => console.log(`  ${line}`));
    console.log('');
    
    return { success: false, errors: errorLines };
  } finally {
    // Restore config for next test
    const originalConfig = fs.readFileSync(BACKUP_CONFIG, 'utf8');
    fs.writeFileSync(TYPESCRIPT_CONFIG, originalConfig);
  }
}

/**
 * Test removing allowJs
 */
async function testAllowJsRemoval() {
  console.log('📋 Testing allowJs removal...\n');
  
  const config = JSON.parse(fs.readFileSync(TYPESCRIPT_CONFIG, 'utf8'));
  config.compilerOptions.allowJs = false;
  
  fs.writeFileSync(TYPESCRIPT_CONFIG, JSON.stringify(config, null, 2));
  
  try {
    const output = execSync('npx tsc --noEmit', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ allowJs removal: No blocking errors\n');
    return { success: true, errors: [] };
  } catch (error) {
    const errorOutput = error.stdout || error.stderr || '';
    const errorLines = errorOutput.split('\n').filter(line => line.includes('error TS'));
    
    console.log(`❌ allowJs removal: ${errorLines.length} errors`);
    console.log('Sample errors:');
    errorLines.slice(0, 10).forEach(line => console.log(`  ${line}`));
    console.log('');
    
    return { success: false, errors: errorLines };
  } finally {
    // Restore config for next test
    const originalConfig = fs.readFileSync(BACKUP_CONFIG, 'utf8');
    fs.writeFileSync(TYPESCRIPT_CONFIG, originalConfig);
  }
}

/**
 * Test skipLibCheck impact
 */
async function testSkipLibCheck() {
  console.log('📋 Testing skipLibCheck requirement...\n');
  
  const config = JSON.parse(fs.readFileSync(TYPESCRIPT_CONFIG, 'utf8'));
  config.compilerOptions.skipLibCheck = false;
  
  fs.writeFileSync(TYPESCRIPT_CONFIG, JSON.stringify(config, null, 2));
  
  try {
    const output = execSync('npx tsc --noEmit', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ skipLibCheck disabled: No library errors\n');
    return { success: true, errors: [] };
  } catch (error) {
    const errorOutput = error.stdout || error.stderr || '';
    const libErrors = errorOutput.split('\n')
      .filter(line => line.includes('node_modules') && line.includes('error TS'));
    
    if (libErrors.length > 0) {
      console.log(`⚠️  skipLibCheck disabled: ${libErrors.length} library errors`);
      console.log('Sample library errors:');
      libErrors.slice(0, 5).forEach(line => console.log(`  ${line}`));
      console.log('');
      return { success: false, errors: libErrors, needsSkipLibCheck: true };
    } else {
      console.log('✅ skipLibCheck disabled: No library errors\n');
      return { success: true, errors: [] };
    }
  }
}

/**
 * Analyze current error patterns
 */
function analyzeCurrentErrors() {
  console.log('📊 Analyzing current error patterns...\n');
  
  try {
    const output = execSync('npx tsc --noEmit', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log('✅ No TypeScript errors found\n');
    return [];
  } catch (error) {
    const errorOutput = error.stdout || error.stderr || '';
    const errorLines = errorOutput.split('\n').filter(line => line.includes('error TS'));
    
    const errorCategories = {
      'Cannot find module': 0,
      'JSX element implicitly has type': 0,
      'Cannot find name': 0,
      'Property does not exist': 0,
      'Argument of type': 0,
      'Type assertion': 0,
      'Object is possibly': 0,
      'Other': 0
    };

    errorLines.forEach(line => {
      let categorized = false;
      for (const category of Object.keys(errorCategories)) {
        if (category !== 'Other' && line.includes(category)) {
          errorCategories[category]++;
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        errorCategories['Other']++;
      }
    });
    
    console.log(`Total errors: ${errorLines.length}`);
    console.log('Error breakdown:');
    Object.entries(errorCategories).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`  ${category}: ${count}`);
      }
    });
    console.log('');
    
    return errorLines;
  }
}

/**
 * Generate recommendations
 */
function generateRecommendations(results) {
  console.log('💡 Recommendations:\n');

  const recommendations = [];

  // exactOptionalPropertyTypes
  if (results.exactOptional?.success) {
    recommendations.push('✅ ENABLE exactOptionalPropertyTypes - No blocking errors found');
  } else {
    const errorCount = results.exactOptional?.errors?.length || 0;
    if (errorCount < 50) {
      recommendations.push(`⚠️  CONSIDER exactOptionalPropertyTypes - ${errorCount} errors, manageable scope`);
    } else {
      recommendations.push(`❌ DEFER exactOptionalPropertyTypes - ${errorCount} errors, requires architectural changes`);
    }
  }

  // allowJs removal
  if (results.allowJs?.success) {
    recommendations.push('✅ REMOVE allowJs - No blocking dependencies found');
  } else {
    const errorCount = results.allowJs?.errors?.length || 0;
    recommendations.push(`⚠️  PLAN allowJs removal - ${errorCount} files need conversion to TypeScript`);
  }

  // skipLibCheck
  if (results.skipLibCheck?.needsSkipLibCheck) {
    recommendations.push('⚠️  KEEP skipLibCheck - Required due to library type conflicts');
  } else {
    recommendations.push('✅ skipLibCheck optional - No library type conflicts detected');
  }

  recommendations.forEach(rec => console.log(rec));
  console.log('');

  return recommendations;
}

/**
 * Write detailed report
 */
function writeReport(results, recommendations) {
  const reportPath = 'TYPE_SAFETY_PHASE_NEXT.md';
  
  const report = `# Type Safety Phase Next - Compiler Hardening Report

## Executive Summary

Generated: ${new Date().toISOString()}

### Current Error Baseline
- Total TypeScript errors: ${results.currentErrors?.length || 0}

### Compiler Flag Analysis

#### exactOptionalPropertyTypes
- Status: ${results.exactOptional?.success ? '✅ Ready' : '❌ Needs Work'}
- New errors: ${results.exactOptional?.errors?.length || 0}
- Recommendation: ${results.exactOptional?.success ? 'Enable immediately' : 'Defer pending fixes'}

#### allowJs Removal  
- Status: ${results.allowJs?.success ? '✅ Ready' : '❌ Needs Migration'}
- Blocking errors: ${results.allowJs?.errors?.length || 0}
- Recommendation: ${results.allowJs?.success ? 'Remove immediately' : 'Plan migration'}

#### skipLibCheck Requirement
- Status: ${results.skipLibCheck?.needsSkipLibCheck ? '⚠️  Required' : '✅ Optional'}
- Library conflicts: ${results.skipLibCheck?.errors?.length || 0}

### Recommendations

${recommendations.map(rec => `- ${rec}`).join('\n')}

### Risk Assessment

| Flag | Risk Level | Effort | Timeline |
|------|------------|--------|----------|
| exactOptionalPropertyTypes | ${results.exactOptional?.success ? 'Low' : 'Medium'} | ${results.exactOptional?.success ? 'Low' : 'Medium'} | ${results.exactOptional?.success ? 'Immediate' : '1-2 sprints'} |
| allowJs removal | ${results.allowJs?.success ? 'Low' : 'High'} | ${results.allowJs?.success ? 'Low' : 'High'} | ${results.allowJs?.success ? 'Immediate' : '2-4 sprints'} |
| skipLibCheck | Low | Low | Optional |

### Next Steps

1. Address high-priority exactOptionalPropertyTypes errors
2. Create migration plan for JavaScript files if needed
3. Monitor library type conflicts
4. Implement changes incrementally with rollback plan

### Implementation Timeline

#### Phase 1 (Immediate - 1 week)
- ${results.exactOptional?.success ? 'Enable exactOptionalPropertyTypes' : 'Inventory exactOptionalPropertyTypes errors'}
- Complete remaining scheduling/task queue safety improvements

#### Phase 2 (2-4 weeks)
- ${results.allowJs?.success ? 'Remove allowJs' : 'Convert JavaScript files to TypeScript'}
- Implement model alignment normalizers across codebase

#### Phase 3 (1-2 months)
- Full type safety validation
- Performance impact assessment
- Documentation updates

---

*Generated by compiler-hardening-report.mjs*
`;

  fs.writeFileSync(reportPath, report);
  console.log(`📄 Detailed report written to ${reportPath}\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Compiler Hardening Evaluation\n');

  const results = await testCompilerFlags();

  console.log('✅ Compiler hardening evaluation completed!');
  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testCompilerFlags, analyzeCurrentErrors };