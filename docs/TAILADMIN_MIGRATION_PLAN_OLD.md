# DomainFlow × TailAdmin UI Migration Plan

**Document Version:** 3.0  
**Date:** December 31, 2025  
**Status:** ✅ PHASE 1 COMPLETE — Phase 2 In Progress

---

## Locked Decisions (Approved Dec 31, 2025)

| Issue | Decision |
|-------|----------|
| Input min/max type incompatibility | Use Controller wrapper |
| Button missing `type` prop | Local FormButton adapter (`/src/components/form/FormButton.tsx`) |
| Switch is uncontrolled only | Use TailAdmin Checkbox instead |
| Missing components (Progress, Skeleton, Tabs, Tooltip) | Simple Tailwind patterns inline |
| Checkbox disabled typing | Type assertion if needed |

### Tailwind Patterns (Use Inline)

**Progress Bar:**
```tsx
<div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
  <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${percent}%` }} />
</div>
```

**Skeleton:**
```tsx
<div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
```

**Textarea:**
```tsx
<textarea className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90" />
```

**Radio Cards:**
```tsx
<label className={cn("cursor-pointer rounded-lg border-2 p-4", selected ? "border-brand-500 bg-brand-50" : "border-gray-200")}>
  <input type="radio" className="sr-only" ... />
  <span>{label}</span>
</label>
```

**Tabs (Simple State):**
```tsx
const [activeTab, setActiveTab] = useState('tab1');
<div className="flex border-b border-gray-200">
  <button className={cn("px-4 py-2", activeTab === 'tab1' && "border-b-2 border-brand-500")} onClick={() => setActiveTab('tab1')}>Tab 1</button>
</div>
{activeTab === 'tab1' && <div>Content</div>}
```

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Analysis: DomainFlow (Current)](#2-architecture-analysis-domainflow-current)
3. [Architecture Analysis: TailAdmin (Target Shell)](#3-architecture-analysis-tailadmin-target-shell)
4. [Target Architecture](#4-target-architecture)
5. [Routing Map](#5-routing-map)
6. [Provider Injection Diagram](#6-provider-injection-diagram)
7. [Phase-by-Phase Migration Plan](#7-phase-by-phase-migration-plan)
8. [File & Directory Changes](#8-file--directory-changes)
9. [Risk Assessment](#9-risk-assessment)
10. [Explicit DO NOT DO List](#10-explicit-do-not-do-list)
11. [Rollback Strategy](#11-rollback-strategy)

---

## 1. Executive Summary

### Before State
```
┌─────────────────────────────────────────────────────────────┐
│ DomainFlow (Next.js 15 App Router)                          │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌────────────────────────────────────┐ │
│ │ Custom UI Shell │  │ Business Logic (Redux, RTK Query)  │ │
│ │ - Radix-based   │  │ - campaignApi                      │ │
│ │ - Custom layout │  │ - authApi                          │ │
│ │ - Custom sidebar│  │ - scoringApi                       │ │
│ │ - Custom header │  │ - SSE handling                     │ │
│ └─────────────────┘  └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### After State
```
┌─────────────────────────────────────────────────────────────┐
│ DomainFlow + TailAdmin (Next.js 15 App Router)              │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌────────────────────────────────────┐ │
│ │ TailAdmin Shell │  │ Business Logic (UNCHANGED)         │ │
│ │ - TA Sidebar    │◄─┤ - campaignApi                      │ │
│ │ - TA Header     │  │ - authApi                          │ │
│ │ - TA Theme      │  │ - scoringApi                       │ │
│ │ - TA Components │  │ - SSE handling                     │ │
│ └─────────────────┘  └────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────┐│
│ │ DomainFlow Pages (rendered inside TailAdmin layout)      ││
│ │ - Campaigns, Personas, Proxies, etc.                     ││
│ │ - Use TailAdmin components for UI                        ││
│ │ - Use DomainFlow hooks/RTK Query for data                ││
│ └───────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 🔑 Key Finding: Migration Already Started!

**CRITICAL:** TailAdmin integration is **~80% complete** for Phase 0-1:

| Component | Status | Location |
|-----------|--------|----------|
| `TailAdminLayout` | ✅ Done | `src/layout/TailAdminLayout.tsx` |
| `AppSidebar` (TA) | ✅ Done | `src/layout/AppSidebar.tsx` |
| `AppHeader` (TA) | ✅ Done | `src/layout/AppHeader.tsx` |
| `SidebarContext` | ✅ Done | `src/contexts/SidebarContext.tsx` |
| `TAThemeProvider` | ✅ Done | `src/contexts/ThemeContext.tsx` |
| TA Components | ✅ Done | `src/components/ta/*` |
| TA Icons | ✅ Done | `src/icons/*` |
| Conditional Layout | ✅ Done | `src/components/layout/AdvancedConditionalLayout.tsx` |
| Provider Hierarchy | ✅ Done | `src/app/layout.tsx` |

---

## 2. Architecture Analysis: DomainFlow (Current)

### 2.1 Framework & Version

| Technology | Version | Notes |
|------------|---------|-------|
| Next.js | 15.x | App Router (`/app` directory) |
| React | 19.x | Latest React with RSC |
| TypeScript | 5.x | Strict mode enabled |
| Tailwind CSS | 4.x | Modern config |

### 2.2 Provider Stack (Root Layout)

```tsx
// src/app/layout.tsx - Provider hierarchy (PRESERVED)
<html>
  <body>
    <NoSSR>
      <ReduxProvider>           // Redux store
        <NuqsProvider>          // URL state
          <ThemeProvider>       // shadcn/ui theme
            <TAThemeProvider>   // TailAdmin theme ✅ INTEGRATED
              <AuthProvider>    // Authentication context
                <RTKCampaignDataProvider>  // Campaign data
                  <GlobalLoadingIndicator />
                  <AdvancedConditionalLayout>  // ✅ Routes to TailAdminLayout
                    {children}
                  </AdvancedConditionalLayout>
                </RTKCampaignDataProvider>
              </AuthProvider>
            </TAThemeProvider>
          </ThemeProvider>
        </NuqsProvider>
      </ReduxProvider>
    </NoSSR>
  </body>
</html>
```

### 2.3 Routing Structure

```
src/app/
├── layout.tsx              # Root layout with providers
├── page.tsx                # Root page (redirect)
├── login/page.tsx          # Login (public)
├── dashboard/page.tsx      # Dashboard (protected)
├── campaigns/
│   ├── page.tsx            # Campaign list
│   ├── new/page.tsx        # Campaign creation
│   └── [id]/
│       ├── page.tsx        # Campaign detail
│       ├── edit/page.tsx   # Campaign edit
│       ├── execution/page.tsx  # **SSE CRITICAL**
│       └── results/page.tsx    # Results view
├── personas/page.tsx       # Personas
├── keyword-sets/page.tsx   # Keyword sets
├── proxies/page.tsx        # Proxies
└── dbgui/page.tsx          # Database GUI
```

### 2.4 Code Classification

| Type | Description | Action |
|------|-------------|--------|
| **Logic-Only** | `src/store/`, `src/hooks/`, `src/services/`, `src/lib/`, `src/types/`, `backend/` | **NEVER TOUCH** |
| **UI-Only** | Old layout, old components | Replace with TailAdmin |
| **UI + Logic** | Campaign forms, auth forms | Preserve logic, swap UI |

---

## 3. Architecture Analysis: TailAdmin (Target Shell)

### 3.1 TailAdmin → Next.js Adaptations (DONE)

| TailAdmin Original | DomainFlow Location | Status |
|--------------------|---------------------|--------|
| `layout/AppLayout.tsx` | `src/layout/TailAdminLayout.tsx` | ✅ Adapted |
| `layout/AppSidebar.tsx` | `src/layout/AppSidebar.tsx` | ✅ Uses next/link |
| `layout/AppHeader.tsx` | `src/layout/AppHeader.tsx` | ✅ Uses next/link |
| `layout/Backdrop.tsx` | `src/layout/Backdrop.tsx` | ✅ Done |
| `context/SidebarContext` | `src/contexts/SidebarContext.tsx` | ✅ "use client" |
| `context/ThemeContext` | `src/contexts/ThemeContext.tsx` | ✅ TAThemeProvider |
| `components/*` | `src/components/ta/*` | ✅ Complete |
| `icons/*` | `src/icons/*` | ✅ SVG components |

### 3.2 What's Complete vs Missing

| Component | Status | Action Required |
|-----------|--------|-----------------|
| Layout shell | ✅ Complete | None |
| Sidebar navigation | ✅ Complete | Minor: wire user data |
| Header | ✅ Complete | Wire UserDropdown to auth |
| Theme toggle | ✅ Complete | None |
| TA UI components | ✅ Imported | Use in pages |
| Page content | 🔄 Partial | Phase 2: inject pages |

---

## 4. Target Architecture

### 4.1 Layout Decision Flow

```tsx
// AdvancedConditionalLayout.tsx (ALREADY WORKING)
const publicPaths = ['/login', '/signup'];
const appPaths = ['/dashboard', '/campaigns', '/personas', '/keyword-sets', '/proxies', '/dbgui'];

if (publicPaths.includes(pathname)) {
  return <div className="min-h-screen bg-background">{children}</div>;
}

if (appPaths.some(p => pathname?.startsWith(p))) {
  return <TailAdminLayout>{children}</TailAdminLayout>;  // ✅ WORKING
}
```

### 4.2 Page Structure Pattern

```tsx
// Pattern for all DomainFlow pages inside TailAdmin shell:
"use client";

import PageBreadcrumb from "@/components/ta/common/PageBreadcrumb";
import PageMeta from "@/components/ta/common/PageMeta";
import ComponentCard from "@/components/ta/common/ComponentCard";
import { useDomainFlowHook } from "@/hooks/...";  // DomainFlow data

export default function SomePage() {
  const { data, loading } = useDomainFlowHook();  // Keep DomainFlow logic
  
  return (
    <>
      <PageMeta title="Page | DomainFlow" />
      <PageBreadcrumb pageTitle="Page Title" />
      <ComponentCard title="Section">
        {/* TailAdmin UI + DomainFlow data */}
      </ComponentCard>
    </>
  );
}
```

---

## 5. Routing Map

### Routes Unchanged (URLs Preserved)

| Route | Layout | Status |
|-------|--------|--------|
| `/login` | Public | ✅ Working |
| `/dashboard` | TailAdminLayout | ✅ Working |
| `/campaigns` | TailAdminLayout | ✅ Working |
| `/campaigns/new` | TailAdminLayout | ✅ Working |
| `/campaigns/[id]` | TailAdminLayout | ✅ Working |
| `/campaigns/[id]/execution` | TailAdminLayout | ✅ **SSE preserved** |
| `/personas` | TailAdminLayout | ✅ Working |
| `/keyword-sets` | TailAdminLayout | ✅ Working |
| `/proxies` | TailAdminLayout | ✅ Working |

### Sidebar Navigation (CONFIGURED)

```tsx
// src/layout/AppSidebar.tsx
const navItems: NavItem[] = [
  { icon: <GridIcon />, name: "Dashboard", path: "/dashboard" },
  { icon: <Target />, name: "Campaigns", path: "/campaigns" },
  { icon: <Users />, name: "Personas", path: "/personas" },
  { icon: <Settings />, name: "Keyword Sets", path: "/keyword-sets" },
  { icon: <Zap />, name: "Proxies", path: "/proxies" },
];
const othersItems: NavItem[] = [
  { icon: <Database />, name: "Database", path: "/dbgui" },
];
```

---

## 6. Provider Injection Diagram

```
Root Layout (src/app/layout.tsx)
└── NoSSR
    └── ReduxProvider (store)
        └── NuqsProvider (URL state)
            └── ThemeProvider (shadcn)
                └── TAThemeProvider (TailAdmin) ← INJECTED
                    └── AuthProvider
                        └── RTKCampaignDataProvider
                            └── AdvancedConditionalLayout
                                ├── Public paths → Minimal layout
                                └── App paths → TailAdminLayout
                                    ├── SidebarProvider ← TA Context
                                    ├── AppSidebar ← TA Component
                                    ├── AppHeader ← TA Component
                                    └── {children} ← DomainFlow pages
```

---

## 7. Phase-by-Phase Migration Plan

### Phase 0: Scaffolding ✅ COMPLETE

All TailAdmin components copied and adapted for Next.js.

### Phase 1: Shell Activation ✅ COMPLETE

| Task | Status |
|------|--------|
| TailAdminLayout active | ✅ |
| Sidebar wired | ✅ |
| Header working | ✅ |
| Theme toggle | ✅ |
| Mobile responsive | ✅ |
| FormButton adapter created | ✅ `/src/components/form/FormButton.tsx` |
| `/logout` migrated | ✅ |
| `/keyword-sets/new` migrated | ✅ |
| `/keyword-sets/[id]/edit` migrated | ✅ |

### Phase 2: CampaignCreateWizard + Steps 🔄 IN PROGRESS

| File | Status |
|------|--------|
| `CampaignCreateWizard.tsx` | 🔲 Pending |
| `steps/GoalStep.tsx` | 🔲 Pending |
| `steps/PatternStep.tsx` | 🔲 Pending |
| `steps/TargetingStep.tsx` | 🔲 Pending |
| `steps/ReviewStep.tsx` | 🔲 Pending |

**shadcn → TailAdmin/Tailwind Mapping:**
| shadcn | Replacement |
|--------|-------------|
| Button | TailAdmin Button + FormButton |
| Card/* | Tailwind card div pattern |
| Progress | Tailwind progress pattern |
| Input | TailAdmin Input with Controller |
| Textarea | Tailwind textarea pattern |
| Label | TailAdmin Label |
| RadioGroup | Tailwind radio card pattern |
| Switch | TailAdmin Checkbox |
| Alert/* | TailAdmin Alert |
| Badge | TailAdmin Badge |
| Checkbox | TailAdmin Checkbox |

### Phase 3: PersonaForm + Routes 🔲 NOT STARTED

| Page | Priority | Status |
|------|----------|--------|
| `/login` | P0 | ⚠️ Uses old LoginForm |
| `/dashboard` | P0 | ⚠️ Uses custom components |
| `/campaigns` | P1 | ⚠️ Uses shadcn cards |
| `/campaigns/new` | P1 | ⚠️ Custom wizard |
| `/campaigns/[id]/execution` | P2 **CRITICAL** | ⚠️ Must preserve SSE |
| `/personas` | P3 | ⚠️ Custom table |
| `/keyword-sets` | P3 | ⚠️ Custom table |
| `/proxies` | P3 | ⚠️ Custom table |

**Page Injection Pattern:**
1. Keep all data hooks (`useRTKCampaignsList`, etc.)
2. Replace UI components with TailAdmin equivalents
3. Add PageBreadcrumb and PageMeta
4. Test thoroughly

### Phase 3: PersonaForm + Routes 🔲 NOT STARTED

| File | Status |
|------|--------|
| `PersonaForm.tsx` | 🔲 Pending |
| `/personas/new/page.tsx` | 🔲 Pending |
| `/personas/[id]/edit/page.tsx` | 🔲 Pending |

### Phase 4: ExecutionPanel + ResultsDrilldown 🔲 NOT STARTED

| File | Status |
|------|--------|
| `ExecutionPanel.tsx` | 🔲 Pending |
| `ResultsDrilldown.tsx` | 🔲 Pending |
| `/campaigns/[id]/execution/page.tsx` | 🔲 Pending |
| `/campaigns/[id]/results/page.tsx` | 🔲 Pending |

### Phase 5: Dev Tools (Low Priority) 🔲 NOT STARTED

| File | Status |
|------|--------|
| `/dbgui/page.tsx` | 🔲 Pending |
| `/test-ui/page.tsx` | 🔲 Pending |

### Phase 6: Cleanup 🔲 NOT STARTED

- Delete unused shadcn components
- Remove duplicate imports
- Audit for dead code
- Final testing

---

## 8. File & Directory Changes

### Files to MODIFY (Phase 2)

```
src/app/login/page.tsx              # Use TA AuthLayout
src/app/dashboard/page.tsx          # Use TA cards/charts
src/app/campaigns/page.tsx          # Use TA table/cards
src/app/campaigns/new/page.tsx      # Use TA forms
src/app/campaigns/[id]/execution/page.tsx  # TA UI, PRESERVE SSE
src/app/personas/page.tsx           # TA table
src/layout/AppHeader.tsx            # Wire UserDropdown
```

### Files NEVER TOUCH

```
src/store/**/*              # Redux, RTK Query
src/hooks/**/*              # All hooks
src/services/**/*           # Business logic
src/lib/**/*                # API client, utils
src/types/**/*              # Types
src/contexts/CampaignSSEContext.tsx
src/providers/**/*
backend/**/*
```

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| SSE breaks during migration | **CRITICAL** | Never touch SSE hooks/context |
| Auth state issues | Medium | AuthProvider above layout switch |
| RTK Query breaks | Low | Never modify store/ |
| Style conflicts | Low | Use TA classes only |

---

## 10. Explicit DO NOT DO List

### ❌ FORBIDDEN

1. Modify `src/store/`
2. Modify `src/hooks/`
3. Modify `src/services/`
4. Modify `src/lib/`
5. Modify `src/types/`
6. Modify `backend/`
7. Modify `src/contexts/CampaignSSEContext.tsx`
8. Change route URLs
9. Create adapters/wrappers
10. Restyle TailAdmin components

---

## 11. Rollback Strategy

### Git Rollback
```bash
git checkout main
git branch -D feature/tailadmin-phase-X
```

### Feature Flag (if needed)
```tsx
const USE_TAILADMIN = process.env.NEXT_PUBLIC_USE_TAILADMIN !== 'false';
if (!USE_TAILADMIN) return <OldLayout>{children}</OldLayout>;
return <TailAdminLayout>{children}</TailAdminLayout>;
```

### Verification Checklist

Before each phase:
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `scripts/smoke-e2e-campaign.sh` passes
- [ ] Manual testing of affected pages

---

## Component Mapping Reference

| Old Component | TailAdmin Replacement |
|---------------|----------------------|
| `Card` | `ComponentCard` (`@/components/ta/common/ComponentCard`) |
| `Button` | `Button` (`@/components/ta/ui/button/Button`) |
| `Badge` | `Badge` (`@/components/ta/ui/badge/Badge`) |
| `Table` | `BasicTableOne` (`@/components/ta/tables/`) |
| `Input` | `Input` (`@/components/ta/form/input/`) |
| `Alert` | `Alert` (`@/components/ta/ui/alert/`) |

---

**Last Updated:** December 31, 2025  
**Next Action:** Complete Phase 2 (CampaignCreateWizard + step components)
