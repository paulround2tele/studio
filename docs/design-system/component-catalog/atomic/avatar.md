# Avatar Component

## Overview

The Avatar component displays user profile pictures with fallback support for initials or placeholder content. Built on Radix UI primitives with multiple sizes, variants, and status indicators.

## API Reference

### Avatar

Main avatar container.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg" \| "xl"` | `"default"` | Size of the avatar |
| `variant` | `"default" \| "square"` | `"default"` | Shape variant |
| `className` | `string` | `undefined` | Additional CSS classes |

### AvatarImage

Image element within avatar.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | Required | Image source URL |
| `alt` | `string` | Required | Alt text for accessibility |
| `className` | `string` | `undefined` | Additional CSS classes |

### AvatarFallback

Fallback content when image fails to load.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "square" \| "colorful"` | `"default"` | Fallback style |
| `size` | `"sm" \| "default" \| "lg" \| "xl"` | `"default"` | Text size |
| `className` | `string` | `undefined` | Additional CSS classes |

## Usage Examples

### Basic Avatar

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

<Avatar>
  <AvatarImage src="/avatars/01.png" alt="@johndoe" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### Different Sizes

```tsx
<div className="flex items-center space-x-4">
  <Avatar size="sm">
    <AvatarImage src="/avatars/01.png" alt="Small" />
    <AvatarFallback size="sm">SM</AvatarFallback>
  </Avatar>
  
  <Avatar size="default">
    <AvatarImage src="/avatars/02.png" alt="Default" />
    <AvatarFallback size="default">DF</AvatarFallback>
  </Avatar>
  
  <Avatar size="lg">
    <AvatarImage src="/avatars/03.png" alt="Large" />
    <AvatarFallback size="lg">LG</AvatarFallback>
  </Avatar>
  
  <Avatar size="xl">
    <AvatarImage src="/avatars/04.png" alt="Extra Large" />
    <AvatarFallback size="xl">XL</AvatarFallback>
  </Avatar>
</div>
```

### Square Variant

```tsx
<Avatar variant="square">
  <AvatarImage src="/logos/company.png" alt="Company" />
  <AvatarFallback variant="square">CO</AvatarFallback>
</Avatar>
```

### Fallback Variants

```tsx
<div className="flex space-x-4">
  <Avatar>
    <AvatarImage src="/invalid-url.png" alt="User" />
    <AvatarFallback variant="default">AB</AvatarFallback>
  </Avatar>
  
  <Avatar>
    <AvatarImage src="/invalid-url.png" alt="User" />
    <AvatarFallback variant="colorful">CD</AvatarFallback>
  </Avatar>
</div>
```

### User Profile Display

```tsx
const user = {
  name: "Jane Smith",
  email: "jane@example.com",
  avatar: "/avatars/jane.png"
}

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
}

<div className="flex items-center space-x-3">
  <Avatar>
    <AvatarImage src={user.avatar} alt={user.name} />
    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
  </Avatar>
  <div>
    <p className="text-sm font-medium">{user.name}</p>
    <p className="text-xs text-muted-foreground">{user.email}</p>
  </div>
</div>
```

### Avatar Group

```tsx
const users = [
  { id: 1, name: "John Doe", avatar: "/avatars/01.png" },
  { id: 2, name: "Jane Smith", avatar: "/avatars/02.png" },
  { id: 3, name: "Bob Wilson", avatar: "/avatars/03.png" },
  { id: 4, name: "Alice Brown", avatar: null }
]

<div className="flex -space-x-2">
  {users.slice(0, 3).map((user) => (
    <Avatar key={user.id} className="border-2 border-white">
      <AvatarImage src={user.avatar} alt={user.name} />
      <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
    </Avatar>
  ))}
  {users.length > 3 && (
    <Avatar className="border-2 border-white">
      <AvatarFallback>+{users.length - 3}</AvatarFallback>
    </Avatar>
  )}
</div>
```

### With Status Indicator

```tsx
<div className="relative">
  <Avatar>
    <AvatarImage src="/avatars/user.png" alt="User" />
    <AvatarFallback>US</AvatarFallback>
  </Avatar>
  <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white" />
</div>
```

## Related Components

- **Badge**: For status indicators
- **Card**: For user profile cards
- **Dropdown Menu**: For user menus

## Testing

### Test Scenarios

```tsx
import { render, screen } from '@testing-library/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

test('displays image when src is valid', () => {
  render(
    <Avatar>
      <AvatarImage src="/test.png" alt="Test" />
      <AvatarFallback>TB</AvatarFallback>
    </Avatar>
  )
  
  expect(screen.getByAltText('Test')).toBeInTheDocument()
})

test('shows fallback when image fails', () => {
  render(
    <Avatar>
      <AvatarImage src="/invalid.png" alt="Test" />
      <AvatarFallback>TB</AvatarFallback>
    </Avatar>
  )
  
  expect(screen.getByText('TB')).toBeInTheDocument()
})
```
