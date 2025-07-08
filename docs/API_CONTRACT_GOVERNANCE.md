# API Contract Governance

## Overview

This document establishes governance processes and tooling to prevent frontend/backend API contract drift, ensuring type safety and consistency across the application.

## 🎯 Governance Principles

### 1. Single Source of Truth
- **OpenAPI schema** is the authoritative contract definition
- All frontend types are **generated** from backend schema
- Manual type definitions are **prohibited** except for UI-specific extensions

### 2. Breaking Change Prevention
- All API changes require **contract review**
- Automated **breaking change detection** in CI/CD
- **Versioning strategy** for major API updates

### 3. Automated Validation
- **Pre-commit hooks** validate schema consistency
- **CI/CD pipeline** enforces contract compliance
- **Runtime validation** in development environment

## 🔧 Technical Implementation

### Type Generation Pipeline

```bash
# Backend generates OpenAPI schema
cd backend && go run cmd/generate-openapi/main.go

# Frontend generates types from schema
npm run generate:types

# Validation step
npm run validate:api-contract
```

### Pre-commit Hook Setup

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: api-contract-validation
        name: API Contract Validation
        entry: scripts/validate-api-contract.sh
        language: script
        files: "^(backend/.*\\.go|src/lib/api-client/.*|backend/api/.*)"
```

## 📋 Governance Processes

### 1. API Change Workflow

#### For Backend Changes:
1. **Update Go models/handlers**
2. **Regenerate OpenAPI schema**
3. **Run contract validation** (`make validate-contract`)
4. **Generate frontend types** (`npm run generate:types`)
5. **Update affected frontend code**
6. **Validate TypeScript compilation**
7. **Submit PR with both backend and frontend changes**

#### For Frontend Requirements:
1. **Document required data structure**
2. **Review with backend team**
3. **Update backend models/endpoints**
4. **Follow backend change workflow above**

### 2. Review Requirements

#### Schema Changes Require:
- [ ] **Backend team approval** for Go model changes
- [ ] **Frontend team approval** for type impact
- [ ] **Breaking change analysis** using automated tools
- [ ] **Migration strategy** if breaking changes detected

### 3. Breaking Change Policy

#### Allowed (Non-breaking):
- ✅ Adding new optional fields
- ✅ Adding new endpoints
- ✅ Expanding enum values
- ✅ Relaxing validation constraints

#### Forbidden (Breaking):
- ❌ Removing fields or endpoints
- ❌ Changing field types
- ❌ Making optional fields required
- ❌ Removing enum values

## 🛠️ Tooling and Automation

### Contract Validation Script

```bash
#!/bin/bash
# scripts/validate-api-contract.sh

set -e

echo "🔍 Validating API Contract..."

# 1. Regenerate OpenAPI schema from backend
cd backend && go run cmd/generate-openapi/main.go

# 2. Check for schema changes
if git diff --exit-code backend/api/openapi.yaml; then
    echo "✅ Schema unchanged"
else
    echo "⚠️ Schema changes detected - validating..."
fi

# 3. Generate frontend types
cd .. && npm run generate:types

# 4. Validate TypeScript compilation
npm run type-check

# 5. Check for breaking changes
npm run check-breaking-changes

echo "✅ API Contract validation passed"
```

### Package.json Scripts

```json
{
  "scripts": {
    "generate:types": "openapi-typescript backend/api/openapi.yaml -o src/lib/api-client/types.ts",
    "validate:api-contract": "scripts/validate-api-contract.sh",
    "type-check": "tsc --noEmit --skipLibCheck",
    "check-breaking-changes": "node scripts/check-breaking-changes.js"
  }
}
```

### Breaking Change Detection

```javascript
// scripts/check-breaking-changes.js
const { execSync } = require('child_process');
const fs = require('fs');

const PREVIOUS_SCHEMA = 'backend/api/openapi-previous.yaml';
const CURRENT_SCHEMA = 'backend/api/openapi.yaml';

function checkBreakingChanges() {
  if (!fs.existsSync(PREVIOUS_SCHEMA)) {
    console.log('📋 First time running - creating baseline schema');
    fs.copyFileSync(CURRENT_SCHEMA, PREVIOUS_SCHEMA);
    return;
  }

  try {
    // Use oasdiff or similar tool to detect breaking changes
    execSync(`npx @apidevtools/swagger-diff ${PREVIOUS_SCHEMA} ${CURRENT_SCHEMA}`, {
      stdio: 'inherit'
    });
    
    console.log('✅ No breaking changes detected');
    fs.copyFileSync(CURRENT_SCHEMA, PREVIOUS_SCHEMA);
  } catch (error) {
    console.error('💥 Breaking changes detected!');
    console.error('Please review changes and update according to governance policy');
    process.exit(1);
  }
}

checkBreakingChanges();
```

## 📊 Monitoring and Metrics

### Contract Health Dashboard
- **Schema drift detection** frequency
- **Type generation** success rate
- **Breaking change** prevention metrics
- **CI/CD pipeline** contract validation stats

### Alerts and Notifications
- **Slack notifications** for breaking changes
- **PR comments** with contract impact analysis
- **Email alerts** for governance policy violations

## 🎓 Team Guidelines

### For Developers

#### Before Making API Changes:
1. **Review governance policy** (this document)
2. **Assess impact** on existing contracts
3. **Plan migration strategy** if breaking changes needed
4. **Coordinate with both teams** (frontend/backend)

#### Best Practices:
- **Use shared types** from generated API client
- **Never manually create API types** in frontend
- **Test contract changes** in both development and staging
- **Document data requirements** clearly in tickets

### For Code Reviews

#### Checklist for API-related PRs:
- [ ] Contract validation passes
- [ ] No manual type definitions added
- [ ] Breaking changes properly reviewed
- [ ] Frontend types regenerated
- [ ] Migration strategy documented (if needed)

## 🔄 Continuous Improvement

### Monthly Review Process
1. **Analyze contract drift incidents**
2. **Review governance effectiveness**
3. **Update tooling and processes**
4. **Team training and feedback**

### Quarterly Assessment
- **Tool effectiveness evaluation**
- **Process refinement**
- **Team satisfaction survey**
- **Governance policy updates**

---

## 🚀 Implementation Status

- [x] **Documentation created**
- [ ] **Validation scripts implemented**
- [ ] **CI/CD integration configured**
- [ ] **Pre-commit hooks installed**
- [ ] **Breaking change detection setup**
- [ ] **Team training completed**

## 📞 Support and Questions

For questions about API contract governance:
- **Slack**: #api-contract-governance
- **Email**: engineering-leads@company.com
- **Documentation**: This guide and linked resources

---

*Last Updated: 2025-07-08*
*Next Review: 2025-08-08*