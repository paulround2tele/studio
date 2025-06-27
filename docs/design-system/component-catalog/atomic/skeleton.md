# Skeleton

Loading state placeholders that provide visual feedback while content is being fetched.

## Overview

The Skeleton component creates animated placeholder elements that mimic the structure of content being loaded. It supports multiple animation variants, shapes, and provides pre-built patterns for common use cases.

## Import

```typescript
import { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonCard 
} from '@/components/ui/skeleton'
```

## Basic Usage

```tsx
// Basic skeleton
<Skeleton className="w-full h-4" />

// Multiple lines
<Skeleton lines={3} spacing="normal" />

// Custom dimensions
<Skeleton width={200} height={20} />
```

## Variants

### Animation Variants

```tsx
// Default pulse animation
<Skeleton variant="default" />

// Shimmer effect (recommended)
<Skeleton variant="shimmer" />

// Wave animation
<Skeleton variant="wave" />

// Pulse animation
<Skeleton variant="pulse" />
```

### Shapes

```tsx
// Default rounded
<Skeleton shape="default" />

// Circular (for avatars)
<Skeleton shape="circle" width={40} height={40} />

// Square corners
<Skeleton shape="square" />

// More rounded
<Skeleton shape="rounded" />
```

### Sizes

```tsx
// Predefined sizes
<Skeleton size="sm" />  {/* 16px height */}
<Skeleton size="md" />  {/* 24px height */}
<Skeleton size="lg" />  {/* 32px height */}
<Skeleton size="xl" />  {/* 40px height */}

// Custom size
<Skeleton width="100%" height={60} />
```

## Pre-built Patterns

### Text Skeleton

```tsx
// Multiple text lines
<SkeletonText lines={3} spacing="normal" />

// Tight spacing
<SkeletonText lines={2} spacing="tight" />

// Loose spacing
<SkeletonText lines={4} spacing="loose" />
```

### Avatar Skeleton

```tsx
// Different avatar sizes
<SkeletonAvatar size="sm" />  {/* 32x32px */}
<SkeletonAvatar size="md" />  {/* 40x40px */}
<SkeletonAvatar size="lg" />  {/* 48x48px */}
<SkeletonAvatar size="xl" />  {/* 64x64px */}
```

### Card Skeleton

```tsx
// Complete card layout
<SkeletonCard />

// Custom card with additional content
<SkeletonCard className="p-6">
  <SkeletonText lines={2} />
</SkeletonCard>
```

## Advanced Examples

### Table Skeleton

```tsx
<div className="space-y-4">
  {/* Table header */}
  <div className="flex space-x-4">
    <Skeleton width="20%" height={20} />
    <Skeleton width="30%" height={20} />
    <Skeleton width="25%" height={20} />
    <Skeleton width="25%" height={20} />
  </div>
  
  {/* Table rows */}
  {Array.from({ length: 5 }, (_, index) => (
    <div key={index} className="flex space-x-4">
      <Skeleton width="20%" height={16} />
      <Skeleton width="30%" height={16} />
      <Skeleton width="25%" height={16} />
      <Skeleton width="25%" height={16} />
    </div>
  ))}
</div>
```

### Form Skeleton

```tsx
<div className="space-y-6">
  {/* Form fields */}
  <div className="space-y-2">
    <Skeleton width="25%" height={14} />
    <Skeleton width="100%" height={40} />
  </div>
  
  <div className="space-y-2">
    <Skeleton width="30%" height={14} />
    <Skeleton width="100%" height={40} />
  </div>
  
  <div className="space-y-2">
    <Skeleton width="35%" height={14} />
    <Skeleton width="100%" height={80} />
  </div>
  
  {/* Submit button */}
  <Skeleton width={120} height={40} shape="rounded" />
</div>
```

### Profile Card Skeleton

```tsx
<div className="p-6 space-y-4">
  {/* Header with avatar and info */}
  <div className="flex items-center space-x-4">
    <SkeletonAvatar size="lg" />
    <div className="space-y-2 flex-1">
      <Skeleton width="60%" height={20} />
      <Skeleton width="40%" height={16} />
    </div>
  </div>
  
  {/* Stats */}
  <div className="grid grid-cols-3 gap-4">
    {Array.from({ length: 3 }, (_, index) => (
      <div key={index} className="text-center space-y-2">
        <Skeleton width="100%" height={24} />
        <Skeleton width="80%" height={14} />
      </div>
    ))}
  </div>
  
  {/* Description */}
  <SkeletonText lines={3} />
</div>
```

## API Reference

### Skeleton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'shimmer' \| 'wave' \| 'pulse'` | `'default'` | Animation variant |
| `shape` | `'default' \| 'circle' \| 'square' \| 'rounded'` | `'default'` | Border radius style |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Predefined height |
| `width` | `string \| number` | - | Custom width |
| `height` | `string \| number` | - | Custom height |
| `lines` | `number` | - | Number of skeleton lines |
| `spacing` | `'tight' \| 'normal' \| 'loose'` | `'normal'` | Spacing between lines |

### SkeletonText Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lines` | `number` | `3` | Number of text lines |
| `spacing` | `'tight' \| 'normal' \| 'loose'` | `'normal'` | Line spacing |

### SkeletonAvatar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Avatar size |

## Accessibility

- Uses semantic HTML structure
- Respects `prefers-reduced-motion` for animations
- Provides proper contrast ratios
- Screen readers announce loading state when used with aria-label

### ARIA Labels

```tsx
<Skeleton aria-label="Loading user profile" />
<SkeletonText lines={3} aria-label="Loading article content" />
```

## Best Practices

### Do's
- Use skeletons for perceived performance improvement
- Match skeleton structure to actual content layout
- Provide meaningful aria-labels for screen readers
- Use shimmer variant for better visual feedback
- Keep skeleton duration reasonable (2-5 seconds)

### Don'ts
- Don't use skeletons for instant content
- Don't make skeletons too different from actual content
- Don't animate skeletons indefinitely
- Don't use skeletons without loading states

## Design Tokens

```css
/* Animation speeds */
--skeleton-animation-duration: 2s;
--skeleton-shimmer-duration: 1.5s;
--skeleton-wave-duration: 1.8s;

/* Colors */
--skeleton-bg: hsl(var(--muted));
--skeleton-shimmer-from: hsl(var(--muted));
--skeleton-shimmer-via: hsl(var(--muted) / 0.5);
--skeleton-shimmer-to: hsl(var(--muted));
```

## Related Components

- [Avatar](./avatar.md) - When content loads
- [Card](../molecular/card.md) - Container for skeleton layouts
- [Table](../molecular/table.md) - For table loading states
