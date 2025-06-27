# Card Component

## Overview

The `Card` component is a versatile container that provides a structured layout for content with header, body, and footer sections. It supports multiple visual variants, sizes, interactive states, and accessibility features, making it perfect for displaying grouped content, forms, and data.

## Import

```typescript
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card'
```

## Basic Usage

```tsx
// Simple card
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here.</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Interactive card
<Card interactive onClick={() => console.log('Card clicked')}>
  <CardHeader>
    <CardTitle>Interactive Card</CardTitle>
  </CardHeader>
  <CardContent>
    <p>This card is clickable.</p>
  </CardContent>
</Card>
```

## API Reference

### Card Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'elevated' \| 'outlined' \| 'filled' \| 'ghost'` | `'default'` | Visual style variant |
| `size` | `'compact' \| 'default' \| 'spacious'` | `'default'` | Size/spacing of the card |
| `interactive` | `boolean` | `false` | Whether card is clickable/interactive |
| `state` | `'default' \| 'disabled' \| 'selected'` | `'default'` | Visual state of the card |
| `asChild` | `boolean` | `false` | Render as child component |
| `className` | `string` | `undefined` | Additional CSS classes |

### Subcomponents

All subcomponents support a `size` prop that coordinates with the parent Card size:

#### CardHeader
Container for card title and description with consistent spacing.

#### CardTitle
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6'` | `'h3'` | HTML heading element |
| `size` | `'compact' \| 'default' \| 'spacious'` | `'default'` | Text size variant |

#### CardDescription
Simple text component for card descriptions.

#### CardContent
Main content area with proper spacing relative to header/footer.

#### CardFooter
Footer area typically containing actions or additional information.

## Variants

### Default
```tsx
<Card variant="default">
  <CardHeader>
    <CardTitle>Default Card</CardTitle>
  </CardHeader>
  <CardContent>Standard card with border and shadow.</CardContent>
</Card>
```

### Elevated
```tsx
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Elevated Card</CardTitle>
  </CardHeader>
  <CardContent>Card with enhanced shadow and hover effects.</CardContent>
</Card>
```

### Outlined
```tsx
<Card variant="outlined">
  <CardHeader>
    <CardTitle>Outlined Card</CardTitle>
  </CardHeader>
  <CardContent>Card with prominent border and transparent background.</CardContent>
</Card>
```

### Filled
```tsx
<Card variant="filled">
  <CardHeader>
    <CardTitle>Filled Card</CardTitle>
  </CardHeader>
  <CardContent>Card with muted background and no border.</CardContent>
</Card>
```

### Ghost
```tsx
<Card variant="ghost">
  <CardHeader>
    <CardTitle>Ghost Card</CardTitle>
  </CardHeader>
  <CardContent>Minimal card with no background or border.</CardContent>
</Card>
```

## Sizes

### Compact
```tsx
<Card size="compact">
  <CardHeader size="compact">
    <CardTitle size="compact">Compact Card</CardTitle>
  </CardHeader>
  <CardContent size="compact">Reduced padding for tight layouts.</CardContent>
</Card>
```

### Default
```tsx
<Card size="default">
  <CardHeader size="default">
    <CardTitle size="default">Default Card</CardTitle>
  </CardHeader>
  <CardContent size="default">Standard padding for most use cases.</CardContent>
</Card>
```

### Spacious
```tsx
<Card size="spacious">
  <CardHeader size="spacious">
    <CardTitle size="spacious">Spacious Card</CardTitle>
  </CardHeader>
  <CardContent size="spacious">Extra padding for premium feel.</CardContent>
</Card>
```

## States

### Interactive
```tsx
<Card interactive onClick={handleClick}>
  <CardHeader>
    <CardTitle>Clickable Card</CardTitle>
  </CardHeader>
  <CardContent>This entire card is clickable.</CardContent>
</Card>
```

### Selected
```tsx
<Card state="selected">
  <CardHeader>
    <CardTitle>Selected Card</CardTitle>
  </CardHeader>
  <CardContent>This card appears selected.</CardContent>
</Card>
```

### Disabled
```tsx
<Card state="disabled">
  <CardHeader>
    <CardTitle>Disabled Card</CardTitle>
  </CardHeader>
  <CardContent>This card is disabled.</CardContent>
</Card>
```

## Common Use Cases

### Product Cards

```tsx
function ProductCard({ product }: { product: Product }) {
  return (
    <Card variant="elevated" interactive onClick={() => viewProduct(product.id)}>
      <CardHeader>
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-48 object-cover rounded-t-lg"
        />
      </CardHeader>
      <CardContent>
        <CardTitle size="compact">{product.name}</CardTitle>
        <CardDescription className="mt-2">
          {product.description}
        </CardDescription>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-2xl font-bold">${product.price}</span>
          <Badge variant={product.inStock ? "success" : "secondary"}>
            {product.inStock ? "In Stock" : "Out of Stock"}
          </Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Add to Cart</Button>
      </CardFooter>
    </Card>
  )
}
```

### Settings Cards

```tsx
function SettingsCard({ 
  title, 
  description, 
  children 
}: { 
  title: string
  description: string
  children: React.ReactNode 
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}

// Usage
<SettingsCard 
  title="Email Notifications" 
  description="Configure how you receive email notifications"
>
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Marketing emails</Label>
      <Switch />
    </div>
    <div className="flex items-center justify-between">
      <Label>Security alerts</Label>
      <Switch defaultChecked />
    </div>
  </div>
</SettingsCard>
```

### Dashboard Stats

```tsx
function StatsCard({ 
  title, 
  value, 
  change, 
  trend 
}: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
}) {
  return (
    <Card variant="filled">
      <CardContent size="compact" className="pt-6">
        <div className="flex items-center justify-between">
          <CardTitle size="compact" className="text-sm font-medium">
            {title}
          </CardTitle>
          <TrendingUp className={cn(
            "h-4 w-4",
            trend === 'up' && "text-green-500",
            trend === 'down' && "text-red-500",
            trend === 'neutral' && "text-muted-foreground"
          )} />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold">{value}</div>
          <div className={cn(
            "text-xs",
            trend === 'up' && "text-green-500",
            trend === 'down' && "text-red-500",
            trend === 'neutral' && "text-muted-foreground"
          )}>
            {change}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Form Cards

```tsx
function FormCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          {children}
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  )
}
```

## Advanced Patterns

### Selectable Card Grid

```tsx
function SelectableCardGrid({ 
  items, 
  selectedIds, 
  onSelectionChange 
}: {
  items: Array<{ id: string, title: string, description: string }>
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}) {
  const handleCardClick = (id: string) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter(selectedId => selectedId !== id)
      : [...selectedIds, id]
    onSelectionChange(newSelection)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card
          key={item.id}
          interactive
          state={selectedIds.includes(item.id) ? "selected" : "default"}
          onClick={() => handleCardClick(item.id)}
        >
          <CardHeader>
            <CardTitle size="compact">{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
```

### Expandable Card

```tsx
function ExpandableCard({ 
  title, 
  preview, 
  children 
}: {
  title: string
  preview: string
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{preview}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {children}
        </CardContent>
      )}
    </Card>
  )
}
```

### Card with Loading State

```tsx
function LoadingCard({ loading, children }: { loading: boolean, children: React.ReactNode }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-4/5" />
        </CardContent>
      </Card>
    )
  }

  return children
}
```

## Accessibility

### Features
- **Semantic Structure**: Proper heading hierarchy with CardTitle
- **Interactive Support**: Keyboard navigation and focus management for interactive cards
- **ARIA Roles**: Appropriate roles when cards are interactive (button role)
- **Focus Indicators**: Clear visual focus states
- **Screen Reader Support**: Proper content structure and labeling

### Best Practices

```tsx
// Use proper heading hierarchy
<Card>
  <CardHeader>
    <CardTitle as="h2">Section Title</CardTitle>
    <CardDescription>Supporting description</CardDescription>
  </CardHeader>
</Card>

// Provide accessible interactive cards
<Card 
  interactive 
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
  aria-label="View product details"
>
  <CardContent>Product information</CardContent>
</Card>

// Group related cards
<section aria-label="Product listings">
  <div className="grid grid-cols-3 gap-4">
    {products.map(product => (
      <Card key={product.id}>...</Card>
    ))}
  </div>
</section>
```

## Performance

### Optimizations
- **Memoized Variants**: CVA variants are computed once and cached
- **Efficient Rendering**: Optimized component structure with minimal DOM nesting
- **Conditional Rendering**: Only renders interactive features when needed
- **Stable References**: Uses React.forwardRef for optimal performance

### Best Practices

```tsx
// Memoize for large lists
const MemoizedCard = React.memo(Card)

// Optimize interactive handlers
function OptimizedCardGrid({ items }: { items: Item[] }) {
  const handleCardClick = useCallback((id: string) => {
    // Handle click
  }, [])

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map(item => (
        <MemoizedCard
          key={item.id}
          interactive
          onClick={() => handleCardClick(item.id)}
        >
          <CardContent>{item.content}</CardContent>
        </MemoizedCard>
      ))}
    </div>
  )
}
```

## Styling

### CSS Variables
The component uses CSS custom properties for theming:

```css
:root {
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --border: 214.3 31.8% 91.4%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --ring: 222.2 84% 4.9%;
}
```

### Custom Styling

```tsx
// Custom card with gradient
<Card className="bg-gradient-to-br from-purple-500 to-blue-600 text-white border-0">
  <CardHeader>
    <CardTitle className="text-white">Gradient Card</CardTitle>
  </CardHeader>
</Card>

// Card with custom spacing
<Card className="p-0 overflow-hidden">
  <div className="bg-primary h-32" />
  <CardContent className="p-6">
    <CardTitle>Custom Layout</CardTitle>
  </CardContent>
</Card>
```

## Testing

### Test Examples

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

test('renders card with content', () => {
  render(
    <Card>
      <CardHeader>
        <CardTitle>Test Title</CardTitle>
      </CardHeader>
      <CardContent>Test Content</CardContent>
    </Card>
  )
  
  expect(screen.getByText('Test Title')).toBeInTheDocument()
  expect(screen.getByText('Test Content')).toBeInTheDocument()
})

test('handles interactive card clicks', async () => {
  const user = userEvent.setup()
  const handleClick = jest.fn()
  
  render(
    <Card interactive onClick={handleClick}>
      <CardContent>Interactive Card</CardContent>
    </Card>
  )
  
  await user.click(screen.getByRole('button'))
  expect(handleClick).toHaveBeenCalledTimes(1)
})

test('applies correct variant styling', () => {
  render(
    <Card variant="elevated" data-testid="card">
      <CardContent>Elevated Card</CardContent>
    </Card>
  )
  
  expect(screen.getByTestId('card')).toHaveClass('shadow-md')
})
```

## Migration Guide

### From Legacy Cards

```tsx
// Before (legacy card)
<div className="card shadow">
  <div className="card-header">
    <h3 className="card-title">Title</h3>
  </div>
  <div className="card-body">Content</div>
</div>

// After (new Card component)
<Card variant="default">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Breaking Changes
- Card structure now requires specific subcomponents
- Styling is handled via variant props instead of CSS classes
- Interactive behavior is built-in with accessibility features

### Migration Checklist
- [ ] Replace `div.card` with `<Card>` component
- [ ] Wrap headers in `<CardHeader>` and titles in `<CardTitle>`
- [ ] Move main content to `<CardContent>`
- [ ] Replace CSS classes with variant props
- [ ] Update interactive cards to use `interactive` prop
- [ ] Ensure proper heading hierarchy with `as` prop

## Related Components

- [Button](../atomic/button.md) - For card actions
- [Badge](../atomic/badge.md) - For status indicators
- [Skeleton](../atomic/skeleton.md) - For loading states
- [Alert](../atomic/alert.md) - For in-card messages
- [Form](../organism/form.md) - For form layouts in cards
