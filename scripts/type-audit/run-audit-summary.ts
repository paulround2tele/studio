#!/usr/bin/env tsx
/*
 * Convenience script to run audit and generate summary table
 */
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

async function main() {
  console.log('=== DomainFlow Frontend Any Usage Audit ===\n');
  
  try {
    // Run the enhanced audit
    console.log('Running enhanced audit...');
    execSync('npx tsx scripts/type-audit/enhanced-audit.ts > docs/enhanced-any-analysis.json', {
      cwd: REPO_ROOT,
      stdio: 'inherit'
    });
    
    // Load results
    const results = JSON.parse(
      await fs.readFile(path.join(REPO_ROOT, 'docs/enhanced-any-analysis.json'), 'utf8')
    );
    
    // Print summary
    console.log('📊 SUMMARY STATISTICS');
    console.log('====================');
    console.log(`Total any usages: ${results.total}`);
    console.log(`Generated at: ${results.generatedAt}`);
    console.log('');
    
    console.log('By Severity:');
    Object.entries(results.bySeverity).forEach(([severity, count]) => {
      console.log(`  ${severity}: ${count}`);
    });
    console.log('');
    
    console.log('By Data Origin:');
    Object.entries(results.byDataOrigin).forEach(([origin, count]) => {
      console.log(`  ${origin}: ${count}`);
    });
    console.log('');
    
    console.log('By Domain:');
    Object.entries(results.byDomain).forEach(([domain, count]) => {
      console.log(`  ${domain}: ${count}`);
    });
    console.log('');
    
    // Show high priority items
    const highPriority = results.analyses.filter((a: any) => a.severity === 'high');
    console.log(`🚨 HIGH PRIORITY FIXES (${highPriority.length} items)`);
    console.log('====================================');
    highPriority.slice(0, 10).forEach((item: any, i: number) => {
      console.log(`${i + 1}. ${item.file}:${item.line}`);
      console.log(`   Code: ${item.code.substring(0, 60)}${item.code.length > 60 ? '...' : ''}`);
      console.log(`   Fix: ${item.recommendation}`);
      console.log('');
    });
    
    if (highPriority.length > 10) {
      console.log(`... and ${highPriority.length - 10} more high priority items\n`);
    }
    
    // Show recommendations
    console.log('📋 NEXT STEPS');
    console.log('=============');
    results.recommendations.immediate.forEach((rec: string) => {
      console.log(`• ${rec}`);
    });
    results.recommendations.backendChanges.forEach((rec: string) => {
      console.log(`• ${rec}`);
    });
    console.log('');
    
    console.log('Files generated:');
    console.log('• docs/allAnyUsages.json - Basic audit results');
    console.log('• docs/enhanced-any-analysis.json - Detailed analysis');
    console.log('• docs/any-remediation-audit-2025.md - Human-readable report');
    console.log('');
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);