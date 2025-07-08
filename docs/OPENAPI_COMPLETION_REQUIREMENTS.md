# OpenAPI3 Migration Completion Requirements

## Problem Summary
The OpenAPI3 migration has 448 TypeScript compilation errors because the auto-generated schema is missing UI-specific properties that frontend components require. The backend OpenAPI specification needs to be updated to include these properties before regenerating types.

## Required Backend Model Updates

### 1. Campaign Schema Extensions

**Current OpenAPI Campaign Schema Missing:**
```typescript
// Properties that need to be added to backend Campaign model
currentPhase?: "idle" | "domain_generation" | "dns_validation" | "http_keyword_validation" | "completed";
phaseStatus?: "Pending" | "InProgress" | "Paused" | "Succeeded" | "Failed";
progress?: number; // Alternative to progressPercentage
domains?: string[]; // List of domains associated with campaign
leads?: any[]; // Lead generation results
dnsValidatedDomains?: string[]; // Domains that passed DNS validation
domainGenerationParams?: {
  numDomainsToGenerate?: number;
  constantString?: string;
  tld?: string;
  patternType?: string;
}; // Domain generation configuration
```

**Status Enum Standardization:**
- Current: `"pending" | "queued" | "running" | "pausing" | "paused" | "completed" | "failed" | "archived" | "cancelled"`
- Needs: Map to UI expectations or provide aliases for `"InProgress"`, `"Succeeded"`, `"Pending"`, `"Paused"`

### 2. User Schema Extensions

**Missing Properties:**
```typescript
name?: string; // Full name or display name (UI uses user?.name)
```

### 3. Persona Schema Extensions

**Missing Properties:**
```typescript
status?: "Active" | "Disabled" | "Testing" | "Failed"; // UI status values
lastTested?: string; // ISO date string
lastError?: string; // Last error message
tags?: string[]; // Classification tags
```

**Configuration Schema Issues:**
- HTTP Persona Config missing: `allowInsecureTls`, `requestTimeoutSec`, `maxRedirects`, `tlsClientHello`, `http2Settings`
- DNS Persona Config missing: resolver strategy values (`"random_rotation"`, `"weighted_rotation"`, `"sequential_failover"`)

### 4. Proxy Schema Extensions

**Missing Properties:**
```typescript
status?: "Active" | "Disabled" | "Testing" | "Failed"; // Current proxy status
notes?: string; // User notes about proxy
lastTested?: string; // ISO date string
successCount?: number; // Success test count
failureCount?: number; // Failed test count
lastError?: string; // Last error message
```

### 5. API Response Schema Standardization

**Missing Response Wrapper Properties:**
Many endpoints return responses without standardized `status`, `message`, `data` properties that UI expects:

```typescript
// Standard response wrapper needed for:
ProxiesListResponse = {
  status: "success" | "error";
  message?: string;
  data: Proxy[];
}

ProxyDeleteResponse = {
  status: "success" | "error";
  message?: string;
  deleted: boolean;
}

ProxyActionResponse = {
  status: "success" | "error";
  message?: string;
  success: boolean;
}
```

## Enum Value Mapping Requirements

### Campaign Types
- Frontend uses: `"prefix_variable"`, `"suffix_variable"`, `"both_variable"`
- OpenAPI has: `"prefix"`, `"suffix"`, `"both"`
- **Action:** Update backend to use frontend values OR provide mapping

### Status Values
- **Persona Status:** Map `"enabled"/"disabled"/"active"` ↔ `"Active"/"Disabled"/"Testing"/"Failed"`
- **Proxy Status:** Add status field with UI-expected values
- **Campaign Phase Status:** Add phase status field with UI-expected values

## Configuration Schema Updates

### HTTP Persona Configuration
Add missing fields to `HttpPersonaConfig`:
```typescript
allowInsecureTls?: boolean;
requestTimeoutSec?: number; // Alternative to requestTimeoutSeconds
maxRedirects?: number;
tlsClientHello?: TLSClientHello;
http2Settings?: HTTP2SettingsConfig;
```

### DNS Persona Configuration  
Update `resolverStrategy` enum to include:
```typescript
resolverStrategy?: "round_robin" | "random" | "weighted" | "priority" | 
                   "random_rotation" | "weighted_rotation" | "sequential_failover";
```

### Cookie Handling Configuration
Update `CookieHandling` mode enum:
```typescript
mode?: "preserve" | "ignore" | "custom" | "none" | "file" | "session";
```

## Priority Implementation Order

### High Priority (Blocks Basic Functionality)
1. **Campaign Schema:** Add `currentPhase`, `phaseStatus`, `domains`, `domainGenerationParams`
2. **User Schema:** Add `name` property
3. **Response Wrappers:** Standardize API responses with `status`/`message`/`data`

### Medium Priority (Blocks Advanced Features)
4. **Persona Schema:** Add `status`, `lastTested`, `lastError`, config extensions
5. **Proxy Schema:** Add `status`, `notes`, `lastTested`, test counters

### Low Priority (UI Polish)
6. **Enum Value Alignment:** Standardize status values across schemas
7. **Configuration Extensions:** Add remaining config properties

## Files That Need Backend Updates

### Most Critical (High Error Count)
- `src/components/campaigns/CampaignListItem.tsx` (30 errors) - Needs Campaign extensions
- `src/components/dashboard/LatestActivityTable.tsx` (93 errors) - Needs Campaign + domain properties
- `src/components/campaigns/CampaignProgress.tsx` (82 errors) - Needs Campaign phase/status properties

### API Service Mismatches
- `src/app/proxies/page.tsx` (11 errors) - Needs Proxy response standardization
- `src/components/personas/PersonaListItem.tsx` (33 errors) - Needs Persona extensions
- `src/components/proxies/ProxyForm.tsx` (11 errors) - Needs Proxy status enums

## Next Steps

1. **Backend Team:** Update models to include missing properties listed above
2. **Backend Team:** Regenerate OpenAPI specification from updated models  
3. **Frontend Team:** Regenerate TypeScript types using `npm run generate-types`
4. **Frontend Team:** Run `npm run typecheck` to verify 448 errors are resolved
5. **QA Team:** Test UI functionality with new backend properties

## Validation Commands

After backend updates:
```bash
# Regenerate frontend types
npm run generate-types

# Verify compilation 
npm run typecheck

# Should result in 0 errors instead of 448