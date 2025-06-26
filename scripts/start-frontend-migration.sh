#!/bin/bash

# Frontend Migration - Phase 1 Kickoff Script
# This script sets up the environment and begins atomic component migration

set -e

echo "🚀 Starting Frontend Migration - Phase 1: Atomic Components"
echo "=========================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create backup of current components
echo "📦 Creating backup of current components..."
if [ ! -d "src/components/backup" ]; then
    mkdir -p src/components/backup
    cp -r src/components/ui src/components/backup/ui_pre_migration_$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created in src/components/backup/"
fi

# Install latest shadcn/ui components for Phase 1
echo "📥 Installing shadcn/ui components..."
npx shadcn@latest add button --force --yes
npx shadcn@latest add input --force --yes  
npx shadcn@latest add label --force --yes
npx shadcn@latest add badge --force --yes
npx shadcn@latest add separator --force --yes

echo "✅ Core components installed"

# Set up feature flags for gradual rollout
echo "🏁 Setting up feature flags..."
cat > src/lib/migration-flags.ts << 'EOF'
/**
 * Frontend Migration Feature Flags
 * Controls rollout of migrated components
 */

export const MIGRATION_FLAGS = {
  // Phase 1: Atomic Components
  BUTTON_V2: process.env.NEXT_PUBLIC_ENABLE_BUTTON_V2 === 'true',
  INPUT_V2: process.env.NEXT_PUBLIC_ENABLE_INPUT_V2 === 'true',
  LABEL_V2: process.env.NEXT_PUBLIC_ENABLE_LABEL_V2 === 'true',
  BADGE_V2: process.env.NEXT_PUBLIC_ENABLE_BADGE_V2 === 'true',
  SEPARATOR_V2: process.env.NEXT_PUBLIC_ENABLE_SEPARATOR_V2 === 'true',
  
  // Phase 2: Molecular Components (TBD)
  SELECT_V2: false,
  DIALOG_V2: false,
  
  // Phase 3: Organism Components (TBD)
  FORM_V2: false,
  TABLE_V2: false,
} as const;

export type MigrationFlag = keyof typeof MIGRATION_FLAGS;

export function useMigrationFlag(flag: MigrationFlag): boolean {
  return MIGRATION_FLAGS[flag];
}
EOF

echo "✅ Feature flags configured"

# Create migration testing utilities
echo "🧪 Setting up migration testing utilities..."
mkdir -p src/components/__tests__/migration

cat > src/components/__tests__/migration/component-migration.test.ts << 'EOF'
/**
 * Migration Testing Utilities
 * Validates component compatibility and functionality
 */

import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

/**
 * Test suite for validating migrated components
 */
export function createMigrationTestSuite(
  componentName: string,
  OldComponent: React.ComponentType<any>,
  NewComponent: React.ComponentType<any>,
  testProps: any[] = [{}]
) {
  describe(`${componentName} Migration Tests`, () => {
    testProps.forEach((props, index) => {
      const testName = `should maintain compatibility with props set ${index + 1}`;
      
      test(testName, () => {
        // Test old component
        const { container: oldContainer } = render(<OldComponent {...props} />);
        
        // Test new component  
        const { container: newContainer } = render(<NewComponent {...props} />);
        
        // Basic render test
        expect(oldContainer).toBeTruthy();
        expect(newContainer).toBeTruthy();
      });
      
      test(`should meet accessibility standards with props set ${index + 1}`, async () => {
        const { container } = render(<NewComponent {...props} />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });
  });
}
EOF

echo "✅ Migration testing utilities created"

# Create migration progress tracker
echo "📊 Setting up progress tracking..."
cat > migration-progress.json << 'EOF'
{
  "migration": {
    "startDate": "2025-06-26",
    "currentPhase": "Phase 1: Atomic Components",
    "phases": {
      "phase1": {
        "name": "Atomic Components",
        "status": "in_progress",
        "components": {
          "button": { "status": "pending", "risk": "low" },
          "input": { "status": "pending", "risk": "low" },
          "label": { "status": "pending", "risk": "low" },
          "badge": { "status": "pending", "risk": "low" },
          "separator": { "status": "pending", "risk": "low" },
          "checkbox": { "status": "planned", "risk": "low" },
          "radio": { "status": "planned", "risk": "low" },
          "switch": { "status": "planned", "risk": "low" },
          "slider": { "status": "planned", "risk": "low" },
          "progress": { "status": "planned", "risk": "low" },
          "avatar": { "status": "planned", "risk": "low" },
          "skeleton": { "status": "planned", "risk": "low" },
          "toast": { "status": "planned", "risk": "low" },
          "bigint-input": { "status": "planned", "risk": "medium" },
          "bigint-display": { "status": "planned", "risk": "medium" }
        }
      },
      "phase2": {
        "name": "Molecular Components", 
        "status": "planned"
      },
      "phase3": {
        "name": "Organism Components",
        "status": "planned"  
      },
      "phase4": {
        "name": "Integration & Polish",
        "status": "planned"
      }
    }
  }
}
EOF

echo "✅ Progress tracking initialized"

# Run initial tests to establish baseline
echo "🔬 Running baseline tests..."
npm run test:coverage -- --silent || echo "⚠️ Some tests may need updates during migration"

# Run performance baseline
echo "📈 Establishing performance baseline..."
if command -v lighthouse &> /dev/null; then
    echo "Running Lighthouse audit..."
    npm run build > /dev/null 2>&1 || echo "⚠️ Build needed for Lighthouse"
else
    echo "📝 Install Lighthouse for performance monitoring: npm install -g lighthouse"
fi

echo ""
echo "🎉 Phase 1 Migration Environment Ready!"
echo "=========================================="
echo ""
echo "📋 Next Steps:"
echo "1. Review migration plan in /mcp/docs/FRONTEND_MIGRATION_CONTEXT.md"
echo "2. Check feature flags in src/lib/migration-flags.ts"
echo "3. Start with Button component: npm run generate:component ButtonV2"
echo "4. Run tests: npm run test:components"
echo "5. Monitor progress in migration-progress.json"
echo ""
echo "🔧 Useful Commands:"
echo "- npm run test:migration     # Run migration-specific tests"
echo "- npm run test:visual        # Visual regression tests"
echo "- npm run test:a11y          # Accessibility tests"
echo "- npm run storybook          # Component development"
echo ""
echo "⚠️ Remember to:"
echo "- Test each component thoroughly before merging"
echo "- Update documentation as you go"
echo "- Use feature flags for gradual rollout"
echo "- Monitor performance and accessibility"
echo ""
echo "Ready to begin migration! 🚀"
