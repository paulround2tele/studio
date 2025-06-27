# Separator

Visual content dividers that help organize and structure interfaces.

## Overview

The Separator component provides visual separation between content sections. It supports horizontal and vertical orientations, multiple variants, optional labels, and flexible spacing options.

## Import

```typescript
import { Separator } from '@/components/ui/separator'
```

## Basic Usage

```tsx
// Basic horizontal separator
<Separator />

// Vertical separator
<Separator orientation="vertical" className="h-6" />

// With spacing
<Separator spacing="md" />
```

## Variants

### Visual Variants

```tsx
// Default border color
<Separator variant="default" />

// Muted appearance
<Separator variant="muted" />

// Accent color
<Separator variant="accent" />

// Primary brand color
<Separator variant="primary" />

// Destructive/error state
<Separator variant="destructive" />
```

### Sizes

```tsx
// Thin line (0.5px)
<Separator size="thin" />

// Default thickness (1px)
<Separator size="default" />

// Thick line (2px)
<Separator size="thick" />
```

## Orientations

### Horizontal (Default)

```tsx
<div className="space-y-4">
  <p>Content above</p>
  <Separator />
  <p>Content below</p>
</div>
```

### Vertical

```tsx
<div className="flex items-center space-x-4">
  <span>Left content</span>
  <Separator orientation="vertical" className="h-6" />
  <span>Right content</span>
</div>
```

## Spacing Options

```tsx
// No spacing
<Separator spacing="none" />

// Small spacing (8px margin)
<Separator spacing="sm" />

// Medium spacing (16px margin) 
<Separator spacing="md" />

// Large spacing (24px margin)
<Separator spacing="lg" />
```

## Labeled Separators

```tsx
// Section divider with label
<Separator label="OR" spacing="md" />

// Custom styling
<Separator 
  label="Advanced Options" 
  variant="muted" 
  spacing="lg" 
/>
```

## Advanced Examples

### Navigation Menu Divider

```tsx
<nav className="flex items-center space-x-4">
  <a href="/home">Home</a>
  <Separator orientation="vertical" className="h-4" variant="muted" />
  <a href="/about">About</a>
  <Separator orientation="vertical" className="h-4" variant="muted" />
  <a href="/contact">Contact</a>
</nav>
```

### Form Section Dividers

```tsx
<form className="space-y-6">
  {/* Personal Information */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">Personal Information</h3>
    <Input placeholder="Full Name" />
    <Input placeholder="Email" />
  </div>
  
  <Separator label="Contact Details" spacing="lg" />
  
  {/* Contact Information */}
  <div className="space-y-4">
    <Input placeholder="Phone" />
    <Input placeholder="Address" />
  </div>
  
  <Separator spacing="lg" />
  
  {/* Submit */}
  <Button type="submit">Save Profile</Button>
</form>
```

### Card Content Separation

```tsx
<Card className="w-80">
  <CardHeader>
    <CardTitle>User Profile</CardTitle>
  </CardHeader>
  
  <CardContent className="space-y-4">
    <div className="flex items-center space-x-3">
      <Avatar />
      <div>
        <p className="font-medium">John Doe</p>
        <p className="text-sm text-muted-foreground">john@example.com</p>
      </div>
    </div>
    
    <Separator spacing="sm" />
    
    <div className="space-y-2">
      <p className="text-sm"><strong>Role:</strong> Administrator</p>
      <p className="text-sm"><strong>Department:</strong> Engineering</p>
      <p className="text-sm"><strong>Location:</strong> San Francisco</p>
    </div>
    
    <Separator spacing="sm" />
    
    <div className="flex space-x-2">
      <Button size="sm">Edit</Button>
      <Button size="sm" variant="outline">View</Button>
    </div>
  </CardContent>
</Card>
```

### Sidebar Navigation

```tsx
<div className="w-64 p-4 space-y-2">
  <nav className="space-y-1">
    <a href="/dashboard" className="block px-3 py-2 rounded">Dashboard</a>
    <a href="/projects" className="block px-3 py-2 rounded">Projects</a>
    <a href="/tasks" className="block px-3 py-2 rounded">Tasks</a>
  </nav>
  
  <Separator spacing="md" />
  
  <nav className="space-y-1">
    <a href="/team" className="block px-3 py-2 rounded">Team</a>
    <a href="/settings" className="block px-3 py-2 rounded">Settings</a>
  </nav>
  
  <Separator spacing="md" />
  
  <nav className="space-y-1">
    <a href="/help" className="block px-3 py-2 rounded">Help</a>
    <a href="/support" className="block px-3 py-2 rounded">Support</a>
  </nav>
</div>
```

### Toolbar Separators

```tsx
<div className="flex items-center p-2 bg-background border rounded-lg">
  <Button variant="ghost" size="sm">
    <Bold className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="sm">
    <Italic className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="sm">
    <Underline className="h-4 w-4" />
  </Button>
  
  <Separator orientation="vertical" className="mx-2 h-6" />
  
  <Button variant="ghost" size="sm">
    <AlignLeft className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="sm">
    <AlignCenter className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="sm">
    <AlignRight className="h-4 w-4" />
  </Button>
  
  <Separator orientation="vertical" className="mx-2 h-6" />
  
  <Button variant="ghost" size="sm">
    <Link className="h-4 w-4" />
  </Button>
</div>
```

## API Reference

### Separator Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Separator direction |
| `variant` | `'default' \| 'muted' \| 'accent' \| 'primary' \| 'destructive'` | `'default'` | Visual style |
| `size` | `'thin' \| 'default' \| 'thick'` | `'default'` | Line thickness |
| `label` | `string` | - | Optional text label (horizontal only) |
| `spacing` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'none'` | Margin spacing |
| `decorative` | `boolean` | `true` | Whether separator is decorative |

## Accessibility

- Uses Radix UI Separator primitive for full accessibility support
- Properly implements ARIA attributes
- Supports screen reader navigation
- Respects semantic meaning when `decorative={false}`

### Semantic Usage

```tsx
{/* Decorative separator (default) */}
<Separator decorative={true} />

{/* Semantic separator for screen readers */}
<Separator decorative={false} aria-label="End of section" />
```

## Best Practices

### Do's
- Use separators to create visual hierarchy
- Keep separator styling consistent throughout the app
- Use labels for section dividers when helpful
- Choose appropriate spacing for the context
- Use vertical separators in toolbars and navigation

### Don'ts
- Don't overuse separators - white space can be enough
- Don't use separators as the only way to separate content
- Don't make separators too prominent (usually subtle is better)
- Don't use separators in place of proper layout spacing

## Design Tokens

```css
/* Separator colors */
--separator-default: hsl(var(--border));
--separator-muted: hsl(var(--muted));
--separator-accent: hsl(var(--accent));
--separator-primary: hsl(var(--primary));
--separator-destructive: hsl(var(--destructive));

/* Separator sizes */
--separator-thin: 0.5px;
--separator-default: 1px;
--separator-thick: 2px;

/* Spacing */
--separator-spacing-sm: 0.5rem;
--separator-spacing-md: 1rem;
--separator-spacing-lg: 1.5rem;
```

## Related Components

- [Card](../molecular/card.md) - For containing separated content
- [Sidebar](../organism/sidebar.md) - Common usage context
- [Menubar](../molecular/menubar.md) - Toolbar separators
