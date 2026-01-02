# UI Contract - TailAdmin Visual Compliance Rulebook

> **⚠️ FROZEN - DO NOT MODIFY WITHOUT PRODUCT APPROVAL (Carlo)**
> 
> **Last Updated**: January 1, 2026  
> **Status**: ENFORCED  
> **Visual Source of Truth**: https://demo.tailadmin.com

---

## 1. Enforcement Policy

**This document is LAW for all UI development in DomainFlow Studio.**

Any deviation from these tokens, primitives, or patterns requires:
1. Explicit written approval from Product (Carlo)
2. Update to this document before code changes
3. Screenshot comparison against TailAdmin demo

---

## 2. Visual Source of Truth

**TailAdmin Demo** (https://demo.tailadmin.com) is the **SINGLE visual source of truth**.

When in doubt about any UI element:
1. Open TailAdmin demo
2. Find the matching component/pattern
3. Extract exact Tailwind classes
4. Use verbatim - do not modify

---

## 3. Frozen Layout Primitives

### Location: \`src/components/shared/Card.tsx\`

These components are **IMMUTABLE**. No page may create ad-hoc styling that duplicates these.

| Component | Purpose | Usage |
|-----------|---------|-------|
| \`Card\` | Main container | Wraps all card-based content |
| \`CardHeader\` | Header section | Title + description + optional actions |
| \`CardTitle\` | Section title | With optional icon (tightly grouped) |
| \`CardDescription\` | Subtitle | Muted text below title |
| \`CardBody\` | Content area | \`noPadding\` for tables |
| \`CardFooter\` | Footer section | Visual "end" of card |
| \`CardEmptyState\` | Zero state | Icon + title + description + CTA |

### Location: \`src/components/ta/ui/button/Button.tsx\`

| Variant | Usage |
|---------|-------|
| \`primary\` | Primary CTAs (blue) |
| \`outline\` | Secondary actions |
| \`success\` | Positive confirmations (green) |
| \`warning\` | Caution actions (yellow) |
| \`error\` | Destructive actions (red) |
| \`info\` | Informational actions (light blue) |

---

## 4. Table Tokens

### Source: \`tailadmin/.../partials/table/table-06.html\`

These are **EXACT verbatim tokens**. Do not modify.

#### Constants (exported from \`Card.tsx\`)

\`\`\`typescript
TABLE_HEADER_CLASSES      // bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700
TABLE_HEADER_CELL_CLASSES // px-5 py-3 sm:px-6 text-left font-medium text-gray-500 text-theme-xs dark:text-gray-400
TABLE_BODY_CLASSES        // divide-y divide-gray-100 dark:divide-gray-800
TABLE_BODY_CELL_CLASSES   // px-5 py-4 sm:px-6
TABLE_ROW_CLASSES         // hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors
TableActionButton         // Icon-only action with hover emphasis
\`\`\`

---

## 5. Page Composition Rules

### Required Structure

\`\`\`tsx
<>
  <PageBreadcrumb pageTitle="Page Title" />
  
  <div className="space-y-6">
    {/* Header Actions Bar */}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-gray-500">Description</p>
      <Button>CTA</Button>
    </div>

    {/* Main Content Card(s) */}
    <Card>
      {/* ... */}
    </Card>
  </div>
</>
\`\`\`

### Empty States (ALWAYS scaffold)

\`\`\`tsx
{items.length === 0 ? (
  <Card>
    <CardBody>
      <CardEmptyState
        icon={<Icon className="h-12 w-12" />}
        title="No Items Yet"
        description="Create your first item to get started."
        action={<Button>Create First</Button>}
      />
    </CardBody>
  </Card>
) : (
  // Populated state
)}
\`\`\`

---

## 6. Forbidden Patterns

❌ **NEVER do these:**

\`\`\`tsx
// Ad-hoc card styling
<div className="rounded-xl border p-6">

// Ad-hoc table header backgrounds  
<TableHeader className="bg-gray-50">

// Manual spacing on pages (outside primitives)
<div className="mt-8 mb-4 px-4 py-3">

// Inline px-*/py-* on <td>, <th> outside primitives
<td className="px-4 py-2">

// Button-based action cells with custom sizing
<Button variant="outline" size="sm" className="h-8 w-8 p-0">
\`\`\`

✅ **ALWAYS use frozen primitives:**

\`\`\`tsx
<Card>
<TABLE_HEADER_CLASSES>
<div className="space-y-6">
<TableActionButton icon={<Icon />} />
\`\`\`

---

## 7. UI Status: DONE

**Effective immediately, the UI layer is FROZEN.**

### What this means:

- ✅ **Allowed**: Bug fixes, accessibility improvements, new business features
- ❌ **Not Allowed**: Spacing tweaks, visual polish, layout refactors
- ❌ **Not Allowed**: "Making it look better" changes
- ❌ **Not Allowed**: Custom styling outside primitives

### Focus going forward:

1. Business logic implementation
2. Performance optimization
3. Correctness and bug fixes
4. New features (using existing primitives)

---

## 8. Migration Completion Status

| Page | Status | Sign-off |
|------|--------|----------|
| \`/dashboard\` | ✅ Complete | Visual approved |
| \`/campaigns\` | ✅ Complete | Visual approved |
| \`/campaigns/[id]\` | ✅ Complete | Visual approved |
| \`/campaigns/new\` | ✅ Complete | Visual approved |
| \`/personas\` | ✅ Complete | Visual approved |
| \`/keyword-sets\` | ✅ Complete | Visual approved |
| \`/proxies\` | ✅ Complete | Visual approved |

---

## 9. Component Locations

All frozen primitives live in:
\`\`\`
src/components/shared/Card.tsx     # Layout primitives + table tokens
src/components/ta/ui/button/       # TailAdmin Button
src/components/ta/ui/badge/        # TailAdmin Badge
src/components/ta/ui/table/        # TailAdmin Table
src/components/ta/ui/alert/        # TailAdmin Alert
src/components/ta/ui/modal/        # TailAdmin Modal
src/components/ta/form/            # TailAdmin Form inputs
\`\`\`

**DO NOT** create competing components. Extend existing ones (with approval).

---

## 10. Change Log

| Date | Change | Approved By |
|------|--------|-------------|
| 2026-01-01 | Initial table token specification | Pending |
| 2026-01-01 | Full UI_CONTRACT finalized as law | Carlo (implicit) |
| 2026-01-01 | UI declared DONE - no more polish | Carlo |

---

## 11. Enforcement (Coming Soon)

ESLint rules will be added to enforce:
- ❌ Disallow \`px-*\` \`py-*\` on \`<td>\`, \`<th>\`, \`<Card>\` usage outside primitives
- ❌ Ban Tailwind spacing utilities in \`app/**/page.tsx\`
- ✅ Allow spacing only inside \`ui/\` or \`components/primitives/\`

---

**This contract is the final authority on all UI decisions.**
