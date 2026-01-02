# DomainFlow UI Contract

> **⚠️ FROZEN LAYOUT PRIMITIVES - DO NOT MODIFY WITHOUT APPROVAL**

## Purpose

This document defines the **only allowed way** to build pages in DomainFlow.
All pages must be composed from these shared components.
No ad-hoc spacing, styling, or layout on pages.

**Source of Truth**: https://demo.tailadmin.com

---

## Frozen Layout Primitives

### Location: `src/components/shared/Card.tsx`

| Component | Purpose | Usage |
|-----------|---------|-------|
| `Card` | Main container | Wraps all card-based content |
| `CardHeader` | Header section | Title + description + optional actions |
| `CardTitle` | Section title | With optional icon (tightly grouped) |
| `CardDescription` | Subtitle | Muted text below title |
| `CardBody` | Content area | `noPadding` for tables |
| `CardFooter` | Footer section | Visual "end" of card, reduces dead space |
| `CardEmptyState` | Zero state | Icon + title + description + CTA |

### Table Constants (also in `Card.tsx`)

```typescript
TABLE_HEADER_CLASSES      // bg-gray-100 for stronger contrast
TABLE_HEADER_CELL_CLASSES // px-6 py-3.5 uppercase tracking-wider
TABLE_BODY_CELL_CLASSES   // px-6 py-4
TABLE_ROW_CLASSES         // border-b with hover state
TableActionButton         // Icon-only action with hover emphasis
```

---

## Page Composition Rules

### 1. Page Structure

```tsx
<>
  <PageBreadcrumb pageTitle="Page Title" />
  
  <div className="space-y-6">
    {/* Header Actions Bar */}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-gray-500">Description</p>
      <Button>CTA</Button>
    </div>

    {/* Main Content Card */}
    <Card>
      <CardHeader>
        <CardTitle icon={<Icon />}>Section Title</CardTitle>
        <CardDescription>Subtitle text</CardDescription>
      </CardHeader>
      <CardBody>
        {/* Content */}
      </CardBody>
    </Card>
  </div>
</>
```

### 2. Table Pages

```tsx
<Card>
  <CardHeader>
    <CardTitle icon={<Icon />}>Table Title</CardTitle>
    <CardDescription>Muted description</CardDescription>
  </CardHeader>
  <CardBody noPadding>
    <Table>
      <TableHeader className={TABLE_HEADER_CLASSES}>
        <TableRow>
          <TableCell isHeader className={TABLE_HEADER_CELL_CLASSES}>
            Column
          </TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className={TABLE_ROW_CLASSES}>
          <TableCell className={TABLE_BODY_CELL_CLASSES}>
            Value
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </CardBody>
  <CardFooter>
    <p className="text-xs text-gray-400">N items</p>
  </CardFooter>
</Card>
```

### 3. Empty States (ALWAYS scaffold)

```tsx
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
```

---

## Forbidden Patterns

❌ **Never do these:**

```tsx
// Ad-hoc card styling
<div className="rounded-xl border p-6">

// Ad-hoc table header backgrounds
<TableHeader className="bg-gray-50">

// Manual spacing on pages
<div className="mt-8 mb-4">

// Button-based action cells
<Button variant="outline" size="sm" className="h-8 w-8 p-0">
```

✅ **Always use frozen primitives:**

```tsx
<Card>
<TABLE_HEADER_CLASSES>
<div className="space-y-6">
<TableActionButton icon={<Icon />} />
```

---

## Migration Order (Non-negotiable)

1. ✅ `/proxies` - Complete
2. ✅ `/personas` - Complete  
3. 🔄 `/keyword-sets` - In progress
4. ⏳ `/campaigns` - Pending
5. ⏳ `/dashboard` - Last (most opinionated)

---

## Visual Compliance Checklist

Before any page is approved:

- [ ] Card has visible border-b under header
- [ ] Table header uses `bg-gray-100` (stronger contrast)
- [ ] Table actions are icon-only with hover emphasis
- [ ] Empty state is scaffolded
- [ ] Footer reduces dead vertical space
- [ ] No ad-hoc spacing or styling
- [ ] Screenshots at 1920x900 and 1366x768 match TailAdmin demo

---

## Component Location

All frozen primitives live in:
```
src/components/shared/Card.tsx
```

**DO NOT** create competing components. Extend Card.tsx if needed (with approval).
