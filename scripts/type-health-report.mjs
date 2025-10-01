#!/usr/bin/env node

/**
 * Type Health Report Generator
 * Generates JSON + table report of TypeScript errors for CI tracking
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const ERROR_TYPE_DESCRIPTIONS = {
  'TS2532': 'Object is possibly undefined',
  'TS18048': 'Property is possibly undefined', 
  'TS2307': 'Cannot find module',
  'TS2345': 'Argument type mismatch',
  'TS2322': 'Type assignment incompatibility',
  'TS2538': 'Type cannot be used as index',
  'TS2339': 'Property does not exist',
  'TS2724': 'Module has no exported member',
  'TS2353': 'Object literal excess property',
  'TS2741': 'Property missing in type',
  'TS2862': 'Duplicate identifier',
  'TS2393': 'Duplicate function implementation',
  'TS2305': 'Module has no exported member',
  'TS7034': 'Variable implicitly has any type',
  'TS7005': 'Variable implicitly has any type',
  'TS2769': 'No overload matches call',
  'TS2488': 'Type must have Symbol.iterator',
  'TS2454': 'Variable used before assignment',
  'TS1117': 'An object literal cannot have multiple properties',
  'TS1064': 'The return type of an async function'
};

async function runTypeCheck() {
  try {
    const { stdout, stderr } = await execAsync('npx tsc --noEmit --pretty false', { 
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    return { stdout, stderr, success: true };
  } catch (error) {
    return { 
      stdout: error.stdout || '', 
      stderr: error.stderr || '', 
      success: false,  
      exitCode: error.code
    };
  }
}

function parseTypeScriptErrors(output) {
  const errorLines = output.split('\n').filter(line => line.includes('error TS'));
  
  const errors = errorLines.map(line => {
    const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
    if (!match) return null;
    
    const [, file, lineNum, column, errorCode, message] = match;
    return {
      file: file.replace(/^src\//, ''),
      line: parseInt(lineNum),
      column: parseInt(column),
      errorCode,
      message: message.trim(),
      category: ERROR_TYPE_DESCRIPTIONS[errorCode] || 'Other'
    };
  }).filter(Boolean);

  return errors;
}

function analyzeErrors(errors) {
  const byType = {};
  const byFile = {};
  const byCategory = {};

  errors.forEach(error => {
    // By error type
    byType[error.errorCode] = (byType[error.errorCode] || 0) + 1;
    
    // By file
    byFile[error.file] = (byFile[error.file] || 0) + 1;
    
    // By category
    byCategory[error.category] = (byCategory[error.category] || 0) + 1;
  });

  return {
    total: errors.length,
    byType: Object.entries(byType).sort((a, b) => b[1] - a[1]),
    byFile: Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 20), // Top 20 files
    byCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  };
}

function formatTableReport(analysis, errors) {
  let report = `\n=== TypeScript Health Report ===\n`;
  report += `Total Errors: ${analysis.total}\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;

  report += `--- Top Error Types ---\n`;
  analysis.byType.forEach(([type, count]) => {
    const description = ERROR_TYPE_DESCRIPTIONS[type] || 'Other';
    report += `${type.padEnd(8)} ${count.toString().padStart(3)} - ${description}\n`;
  });

  report += `\n--- Top Error Categories ---\n`;
  analysis.byCategory.forEach(([category, count]) => {
    report += `${category.padEnd(35)} ${count.toString().padStart(3)}\n`;
  });

  report += `\n--- Most Problematic Files ---\n`;
  analysis.byFile.slice(0, 15).forEach(([file, count]) => {
    report += `${count.toString().padStart(3)} ${file}\n`;
  });

  return report;
}

async function generateReport() {
  console.log('🔍 Running TypeScript health check...');
  
  const typeCheckResult = await runTypeCheck();
  const errorOutput = typeCheckResult.stderr || typeCheckResult.stdout;
  
  if (typeCheckResult.success && !errorOutput.includes('error TS')) {
    console.log('✅ No TypeScript errors found!');
    const report = {
      timestamp: new Date().toISOString(),
      total: 0,
      errors: [],
      analysis: { total: 0, byType: [], byFile: [], byCategory: [] }
    };
    
    await fs.writeFile('type-safety-report.json', JSON.stringify(report, null, 2));
    console.log('📊 Report saved to type-safety-report.json');
    return report;
  }

  const errors = parseTypeScriptErrors(errorOutput);
  const analysis = analyzeErrors(errors);
  
  const report = {
    timestamp: new Date().toISOString(),
    total: analysis.total,
    errors: errors,
    analysis: analysis
  };

  // Save JSON report
  await fs.writeFile('type-safety-report.json', JSON.stringify(report, null, 2));
  
  // Generate and save table report
  const tableReport = formatTableReport(analysis, errors);
  await fs.writeFile('type-safety-report.txt', tableReport);
  
  console.log(tableReport);
  console.log(`📊 Reports saved: type-safety-report.json, type-safety-report.txt`);
  
  return report;
}

// Check if we're being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateReport()
    .then(report => {
      process.exit(report.total > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Error generating report:', error);
      process.exit(1);
    });
}

export { generateReport, parseTypeScriptErrors, analyzeErrors };