# Breadcrumb

Navigation hierarchy display that shows the user's location within a multi-level structure.

## Overview

The Breadcrumb component provides contextual navigation that shows users where they are in a hierarchical structure and allows them to navigate back to previous levels. It supports multiple variants, sizes, custom separators, and automatic truncation for long navigation paths.

## Import

```typescript
import { 
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  SimpleBreadcrumb 
} from '@/components/ui/breadcrumb'
```

## Basic Usage

### Simple Breadcrumb

```tsx
<SimpleBreadcrumb 
  items={[
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    { label: "Category", href: "/products/electronics" },
    { label: "iPhone 15", current: true }
  ]}
/>
```

### Manual Construction

```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/products">Products</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Current Page</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

## Variants

### Visual Variants

```tsx
// Default styling
<SimpleBreadcrumb variant="default" items={items} />

// Subtle appearance
<SimpleBreadcrumb variant="subtle" items={items} />

// Prominent styling
<SimpleBreadcrumb variant="prominent" items={items} />

// Minimal styling
<SimpleBreadcrumb variant="minimal" items={items} />
```

### Sizes

```tsx
// Small breadcrumbs
<SimpleBreadcrumb size="sm" items={items} />

// Default size
<SimpleBreadcrumb size="default" items={items} />

// Large breadcrumbs
<SimpleBreadcrumb size="lg" items={items} />
```

## Custom Separators

```tsx
// Slash separator
<SimpleBreadcrumb 
  items={items}
  separator={<span>/</span>}
/>

// Arrow separator
<SimpleBreadcrumb 
  items={items}
  separator={<ArrowRight className="h-4 w-4" />}
/>

// Dot separator
<SimpleBreadcrumb 
  items={items}
  separator={<span>•</span>}
/>
```

## Truncation

### Max Items

```tsx
// Show only first and last 2 items with ellipsis
<SimpleBreadcrumb 
  items={longItemList}
  maxItems={4}
/>

// Show only first and last item
<SimpleBreadcrumb 
  items={longItemList}
  maxItems={2}
/>
```

### Manual Ellipsis

```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbEllipsis />
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/category">Category</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Current</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

## Advanced Examples

### E-commerce Navigation

```tsx
const productBreadcrumbs = [
  { label: "Home", href: "/" },
  { label: "Electronics", href: "/electronics" },
  { label: "Smartphones", href: "/electronics/smartphones" },
  { label: "Apple", href: "/electronics/smartphones/apple" },
  { label: "iPhone 15 Pro Max", current: true }
]

<SimpleBreadcrumb 
  items={productBreadcrumbs}
  variant="prominent"
  size="default"
  maxItems={5}
  onItemClick={(item, index) => {
    console.log(`Navigating to: ${item.label}`)
  }}
/>
```

### Dashboard Navigation

```tsx
const dashboardBreadcrumbs = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Reports", href: "/dashboard/analytics/reports" },
  { label: "Monthly Sales", current: true }
]

<div className="border-b pb-4">
  <SimpleBreadcrumb 
    items={dashboardBreadcrumbs}
    variant="default"
    size="sm"
    separator={<ChevronRight className="h-3 w-3" />}
  />
</div>
```

### File System Browser

```tsx
const fileBreadcrumbs = [
  { label: "Documents", onClick: () => navigate("/documents") },
  { label: "Projects", onClick: () => navigate("/documents/projects") },
  { label: "DomainFlow", onClick: () => navigate("/documents/projects/domainflow") },
  { label: "src", onClick: () => navigate("/documents/projects/domainflow/src") },
  { label: "components", current: true }
]

<SimpleBreadcrumb 
  items={fileBreadcrumbs}
  variant="subtle"
  separator={<span className="text-muted-foreground/30">/</span>}
  maxItems={6}
/>
```

### Dynamic Breadcrumbs

```tsx
const DynamicBreadcrumb = ({ pathname }: { pathname: string }) => {
  const segments = pathname.split('/').filter(Boolean)
  
  const items = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1
    
    return {
      label: segment.charAt(0).toUpperCase() + segment.slice(1),
      href: isLast ? undefined : href,
      current: isLast
    }
  })
  
  return (
    <SimpleBreadcrumb 
      items={[
        { label: "Home", href: "/" },
        ...items
      ]}
      maxItems={4}
    />
  )
}

// Usage
<DynamicBreadcrumb pathname="/products/electronics/smartphones" />
```

### Breadcrumb with Actions

```tsx
<div className="flex items-center justify-between">
  <SimpleBreadcrumb 
    items={breadcrumbItems}
    variant="prominent"
  />
  
  <div className="flex items-center space-x-2">
    <Button variant="outline" size="sm">
      <Share className="h-4 w-4 mr-2" />
      Share
    </Button>
    <Button variant="outline" size="sm">
      <Bookmark className="h-4 w-4 mr-2" />
      Save
    </Button>
  </div>
</div>
```

### Responsive Breadcrumbs

```tsx
<div className="flex items-center">
  {/* Mobile: Show only current page */}
  <div className="sm:hidden">
    <Button variant="ghost" size="sm">
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back
    </Button>
  </div>
  
  {/* Desktop: Show full breadcrumb */}
  <div className="hidden sm:block">
    <SimpleBreadcrumb 
      items={breadcrumbItems}
      maxItems={4}
    />
  </div>
</div>
```

## API Reference

### SimpleBreadcrumb Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `BreadcrumbItemData[]` | - | Array of breadcrumb items |
| `variant` | `'default' \| 'subtle' \| 'prominent' \| 'minimal'` | `'default'` | Visual variant |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Size variant |
| `separator` | `React.ReactNode` | `<ChevronRight />` | Custom separator |
| `maxItems` | `number` | - | Maximum items before truncation |
| `onItemClick` | `(item, index) => void` | - | Item click handler |

### BreadcrumbItemData

| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Display text |
| `href` | `string` | Navigation link |
| `onClick` | `() => void` | Click handler |
| `current` | `boolean` | Current page indicator |

### Individual Component Props

| Component | Props | Description |
|-----------|-------|-------------|
| `Breadcrumb` | `variant`, `size` | Root container |
| `BreadcrumbItem` | `variant`, `size` | Individual item |
| `BreadcrumbSeparator` | `variant`, `size`, `children` | Item separator |
| `BreadcrumbLink` | Standard anchor props | Navigation link |
| `BreadcrumbPage` | Standard span props | Current page |

## Accessibility

- Full keyboard navigation support
- Proper ARIA labels and structure
- Screen reader compatibility
- Semantic HTML with nav and list elements
- Current page indication with `aria-current="page"`

### ARIA Attributes

```tsx
<Breadcrumb aria-label="Breadcrumb navigation">
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbPage aria-current="page">Current Page</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

## Best Practices

### Do's
- Keep breadcrumb labels concise and descriptive
- Use breadcrumbs for hierarchical navigation
- Always show the current page
- Truncate long breadcrumb trails appropriately
- Make intermediate levels clickable
- Use consistent separator styles

### Don'ts
- Don't use breadcrumbs for single-level navigation
- Don't make breadcrumbs the only navigation method
- Don't show breadcrumbs on the home page
- Don't use breadcrumbs for cross-sectional navigation
- Don't make current page clickable

## Design Tokens

```css
/* Breadcrumb colors */
--breadcrumb-default: hsl(var(--muted-foreground));
--breadcrumb-subtle: hsl(var(--muted-foreground) / 0.7);
--breadcrumb-prominent: hsl(var(--foreground));
--breadcrumb-minimal: hsl(var(--muted-foreground) / 0.6);

/* Breadcrumb sizes */
--breadcrumb-sm: 0.75rem;
--breadcrumb-default: 0.875rem;
--breadcrumb-lg: 1rem;

/* Separator colors */
--breadcrumb-separator: hsl(var(--muted-foreground) / 0.5);
--breadcrumb-separator-subtle: hsl(var(--muted-foreground) / 0.3);
--breadcrumb-separator-prominent: hsl(var(--muted-foreground) / 0.7);
```

## Related Components

- [Button](../atomic/button.md) - For navigation actions
- [Separator](../atomic/separator.md) - Alternative content division
- [Menubar](./menubar.md) - Primary navigation
- [Sidebar](../organism/sidebar.md) - Secondary navigation
