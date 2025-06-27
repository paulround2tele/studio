#!/usr/bin/env node

/**
 * Comprehensive Accessibility Audit Script
 * Tests all UI components for WCAG 2.1 AA compliance
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Components to audit - all interactive and form components
const COMPONENTS_TO_AUDIT = {
  interactive_components: [
    'button', 'input', 'select', 'checkbox', 'radio-group', 'switch', 
    'slider', 'tabs', 'accordion', 'dropdown-menu', 'dialog', 
    'alert-dialog', 'sheet', 'tooltip', 'popover', 'menubar', 
    'sidebar', 'data-table', 'pagination'
  ],
  form_components: [
    'form', 'input', 'textarea', 'select', 'checkbox', 'radio-group', 
    'switch', 'slider', 'date-picker', 'bigint-input'
  ],
  navigation_components: [
    'breadcrumb', 'pagination', 'menubar', 'sidebar', 'tabs'
  ],
  feedback_components: [
    'alert', 'toast', 'toaster', 'progress'
  ]
};

class AccessibilityAuditor {
  constructor() {
    this.results = {
      summary: {
        total_components: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        coverage_percentage: 0
      },
      component_results: {},
      detailed_issues: [],
      recommendations: []
    };
  }

  async runAudit() {
    console.log('🔍 Starting Comprehensive Accessibility Audit...\n');

    // Get all unique components
    const allComponents = new Set();
    Object.values(COMPONENTS_TO_AUDIT).forEach(components => {
      components.forEach(comp => allComponents.add(comp));
    });

    this.results.summary.total_components = allComponents.size;

    for (const component of allComponents) {
      await this.auditComponent(component);
    }

    this.generateSummary();
    this.generateReport();
    this.generateRecommendations();

    return this.results;
  }

  async auditComponent(componentName) {
    console.log(`📋 Auditing: ${componentName}`);
    
    const testFile = `src/components/ui/__tests__/${componentName}.test.tsx`;
    const componentFile = `src/components/ui/${componentName}.tsx`;
    
    // Check if test file exists
    if (!fs.existsSync(testFile)) {
      this.results.component_results[componentName] = {
        status: 'failed',
        reason: 'No test file found',
        accessibility_score: 0,
        issues: ['Missing accessibility test coverage']
      };
      this.results.summary.failed++;
      return;
    }

    // Check if component file exists
    if (!fs.existsSync(componentFile)) {
      this.results.component_results[componentName] = {
        status: 'failed',
        reason: 'Component file not found',
        accessibility_score: 0,
        issues: ['Component file missing']
      };
      this.results.summary.failed++;
      return;
    }

    try {
      // Run axe tests for this component
      const { stdout, stderr } = await execAsync(
        `npm test -- --testPathPattern=${componentName}.test.tsx --silent`
      );

      // Check for axe violations in the output
      const hasAxeViolations = stderr.includes('axe') || stdout.includes('violation');
      const hasAccessibilityTests = this.checkAccessibilityTestCoverage(testFile);
      
      let score = 0;
      let issues = [];
      let status = 'passed';

      // Score accessibility implementation
      if (hasAccessibilityTests.hasAxeTests) score += 30;
      if (hasAccessibilityTests.hasKeyboardTests) score += 25;
      if (hasAccessibilityTests.hasAriaTests) score += 25;
      if (hasAccessibilityTests.hasFocusTests) score += 20;

      if (hasAxeViolations) {
        issues.push('Axe violations detected');
        score -= 20;
        status = 'failed';
      }

      if (!hasAccessibilityTests.hasAxeTests) {
        issues.push('Missing axe accessibility tests');
        status = score > 50 ? 'warning' : 'failed';
      }

      if (!hasAccessibilityTests.hasKeyboardTests && this.isInteractiveComponent(componentName)) {
        issues.push('Missing keyboard navigation tests');
        status = score > 50 ? 'warning' : 'failed';
      }

      if (!hasAccessibilityTests.hasAriaTests) {
        issues.push('Missing ARIA attributes tests');
        status = score > 50 ? 'warning' : 'failed';
      }

      this.results.component_results[componentName] = {
        status,
        accessibility_score: Math.max(0, score),
        issues,
        test_coverage: hasAccessibilityTests
      };

      if (status === 'passed') this.results.summary.passed++;
      else if (status === 'warning') this.results.summary.warnings++;
      else this.results.summary.failed++;

    } catch (error) {
      this.results.component_results[componentName] = {
        status: 'failed',
        reason: 'Test execution failed',
        accessibility_score: 0,
        issues: [`Test error: ${error.message}`]
      };
      this.results.summary.failed++;
    }
  }

  checkAccessibilityTestCoverage(testFile) {
    const content = fs.readFileSync(testFile, 'utf8');
    
    return {
      hasAxeTests: content.includes('axe') || content.includes('toHaveNoViolations'),
      hasKeyboardTests: content.includes('keyDown') || content.includes('keyboard') || content.includes('Tab'),
      hasAriaTests: content.includes('aria-') || content.includes('getByRole') || content.includes('getByLabelText'),
      hasFocusTests: content.includes('focus') || content.includes('Focus') || content.includes('blur'),
      hasScreenReaderTests: content.includes('screen reader') || content.includes('getByText') 
    };
  }

  isInteractiveComponent(componentName) {
    return COMPONENTS_TO_AUDIT.interactive_components.includes(componentName) ||
           COMPONENTS_TO_AUDIT.form_components.includes(componentName) ||
           COMPONENTS_TO_AUDIT.navigation_components.includes(componentName);
  }

  generateSummary() {
    const total = this.results.summary.total_components;
    const passed = this.results.summary.passed;
    this.results.summary.coverage_percentage = Math.round((passed / total) * 100);
  }

  generateReport() {
    const reportPath = 'accessibility-audit-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📊 Accessibility audit report saved to: ${reportPath}`);
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.results.summary.failed > 0) {
      recommendations.push(
        '🔴 Priority 1: Fix failing components with accessibility violations'
      );
    }

    if (this.results.summary.warnings > 0) {
      recommendations.push(
        '🟡 Priority 2: Address components with missing accessibility test coverage'
      );
    }

    recommendations.push(
      '✅ Add automated accessibility testing to CI/CD pipeline',
      '✅ Implement manual screen reader testing for complex components',
      '✅ Set up color contrast validation for all UI elements',
      '✅ Create keyboard navigation testing checklist'
    );

    this.results.recommendations = recommendations;

    console.log('\n🎯 Accessibility Recommendations:');
    recommendations.forEach(rec => console.log(`  ${rec}`));
  }
}

// Run the audit
async function main() {
  const auditor = new AccessibilityAuditor();
  
  try {
    const results = await auditor.runAudit();
    
    console.log('\n📈 Accessibility Audit Summary:');
    console.log(`  Total Components: ${results.summary.total_components}`);
    console.log(`  ✅ Passed: ${results.summary.passed}`);
    console.log(`  ⚠️  Warnings: ${results.summary.warnings}`);
    console.log(`  ❌ Failed: ${results.summary.failed}`);
    console.log(`  📊 Coverage: ${results.summary.coverage_percentage}%`);
    
    process.exit(results.summary.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Accessibility audit failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { AccessibilityAuditor };
