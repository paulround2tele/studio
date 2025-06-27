# Dialog Component

## Overview

The Dialog component provides a comprehensive modal system built on Radix UI primitives with extensive customization options for size, variants, overlay styles, and layout. Perfect for confirmations, forms, content display, and complex interactions.

## API Reference

### Dialog Root

The root container that manages dialog state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | `undefined` | Controlled open state |
| `defaultOpen` | `boolean` | `false` | Default open state for uncontrolled usage |
| `onOpenChange` | `(open: boolean) => void` | `undefined` | Callback when open state changes |
| `modal` | `boolean` | `true` | Whether dialog is modal |

### DialogContent

The main dialog content container.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg" \| "xl" \| "full"` | `"default"` | Dialog size |
| `variant` | `"default" \| "destructive" \| "success" \| "warning"` | `"default"` | Visual variant |
| `hideClose` | `boolean` | `false` | Whether to hide close button |
| `overlayVariant` | `"default" \| "light" \| "dark" \| "blur"` | `"default"` | Overlay style |
| `className` | `string` | `undefined` | Additional CSS classes |

### DialogHeader

Header section for title and description.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg" \| "xl"` | `"default"` | Header size |
| `className` | `string` | `undefined` | Additional CSS classes |

### DialogFooter

Footer section for actions.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg" \| "xl"` | `"default"` | Footer size |
| `alignment` | `"left" \| "center" \| "right" \| "between"` | `"right"` | Button alignment |
| `className` | `string` | `undefined` | Additional CSS classes |

### DialogTitle

Accessible dialog title.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg" \| "xl"` | `"default"` | Title size |
| `className` | `string` | `undefined` | Additional CSS classes |

### DialogDescription

Optional dialog description.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "default" \| "lg" \| "xl"` | `"default"` | Description size |
| `className` | `string` | `undefined` | Additional CSS classes |

## Usage Examples

### Basic Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone. This will permanently delete your data.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button type="submit">Continue</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Controlled Dialog

```tsx
const [open, setOpen] = useState(false)

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Controlled Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Controlled Dialog</DialogTitle>
    </DialogHeader>
    <p>This dialog's state is controlled externally.</p>
    <DialogFooter>
      <Button onClick={() => setOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Different Sizes

```tsx
{/* Small dialog */}
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Small</Button>
  </DialogTrigger>
  <DialogContent size="sm">
    <DialogHeader size="sm">
      <DialogTitle size="sm">Small Dialog</DialogTitle>
      <DialogDescription size="sm">
        Compact dialog for simple confirmations.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter size="sm">
      <Button size="sm">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Large dialog */}
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Large</Button>
  </DialogTrigger>
  <DialogContent size="lg">
    <DialogHeader size="lg">
      <DialogTitle size="lg">Large Dialog</DialogTitle>
      <DialogDescription size="lg">
        Spacious dialog for complex content and forms.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter size="lg">
      <Button size="lg">Continue</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Full screen dialog */}
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Full Screen</Button>
  </DialogTrigger>
  <DialogContent size="full">
    <DialogHeader size="xl">
      <DialogTitle size="xl">Full Screen Dialog</DialogTitle>
      <DialogDescription size="xl">
        Maximum space for complex interfaces.
      </DialogDescription>
    </DialogHeader>
    <div className="flex-1 overflow-auto">
      {/* Main content */}
    </div>
    <DialogFooter size="xl">
      <Button size="lg">Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Variants and Overlay Styles

```tsx
{/* Destructive variant */}
<Dialog>
  <DialogTrigger asChild>
    <Button variant="destructive">Delete Item</Button>
  </DialogTrigger>
  <DialogContent variant="destructive" overlayVariant="dark">
    <DialogHeader>
      <DialogTitle>Delete Confirmation</DialogTitle>
      <DialogDescription>
        This action cannot be undone. Are you sure?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Success variant with blur overlay */}
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Success Dialog</Button>
  </DialogTrigger>
  <DialogContent variant="success" overlayVariant="blur">
    <DialogHeader>
      <DialogTitle>Success!</DialogTitle>
      <DialogDescription>
        Your changes have been saved successfully.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button>Continue</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form Dialog

```tsx
const [formData, setFormData] = useState({ name: "", email: "" })

<Dialog>
  <DialogTrigger asChild>
    <Button>Edit Profile</Button>
  </DialogTrigger>
  <DialogContent size="lg">
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here. Click save when you're done.
      </DialogDescription>
    </DialogHeader>
    
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            name: e.target.value 
          }))}
          placeholder="Your name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            email: e.target.value 
          }))}
          placeholder="your.email@example.com"
        />
      </div>
    </form>
    
    <DialogFooter>
      <Button type="submit">Save Changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Custom Close Handling

```tsx
const [open, setOpen] = useState(false)
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

const handleOpenChange = (newOpen) => {
  if (!newOpen && hasUnsavedChanges) {
    // Show confirmation dialog
    if (confirm("You have unsaved changes. Are you sure you want to close?")) {
      setOpen(false)
      setHasUnsavedChanges(false)
    }
  } else {
    setOpen(newOpen)
  }
}

<Dialog open={open} onOpenChange={handleOpenChange}>
  <DialogTrigger asChild>
    <Button>Open Editor</Button>
  </DialogTrigger>
  <DialogContent hideClose>
    <DialogHeader>
      <DialogTitle>Document Editor</DialogTitle>
    </DialogHeader>
    
    <textarea
      onChange={() => setHasUnsavedChanges(true)}
      className="min-h-[200px] w-full rounded border p-3"
      placeholder="Start typing..."
    />
    
    <DialogFooter>
      <Button variant="outline" onClick={() => handleOpenChange(false)}>
        Cancel
      </Button>
      <Button onClick={() => {
        // Save logic
        setHasUnsavedChanges(false)
        setOpen(false)
      }}>
        Save & Close
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Footer Alignment Options

```tsx
{/* Left aligned */}
<DialogFooter alignment="left">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</DialogFooter>

{/* Center aligned */}
<DialogFooter alignment="center">
  <Button>Got It</Button>
</DialogFooter>

{/* Space between */}
<DialogFooter alignment="between">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</DialogFooter>
```

## Accessibility

### Features

- **ARIA Compliance**: Full ARIA dialog implementation via Radix UI
- **Focus Management**: Automatic focus trapping and restoration
- **Keyboard Navigation**: Escape closes, Tab cycles through focusable elements
- **Screen Reader**: Proper role and state announcements
- **Portal Rendering**: Content rendered outside normal DOM flow

### Best Practices

```tsx
// Always provide title and description
<DialogContent>
  <DialogHeader>
    <DialogTitle>Delete Account</DialogTitle>
    <DialogDescription>
      This will permanently delete your account and all associated data.
      This action cannot be undone.
    </DialogDescription>
  </DialogHeader>
  {/* content */}
</DialogContent>

// Use proper button hierarchy
<DialogFooter>
  <DialogClose asChild>
    <Button variant="outline">Cancel</Button>
  </DialogClose>
  <Button variant="destructive" autoFocus>
    Delete Account
  </Button>
</DialogFooter>

// Handle loading states
<Dialog open={isDeleting} onOpenChange={!isDeleting ? setOpen : undefined}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        {isDeleting ? "Deleting..." : "Confirm Delete"}
      </DialogTitle>
    </DialogHeader>
    <DialogFooter>
      <Button disabled={isDeleting}>
        {isDeleting ? "Deleting..." : "Delete"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Styling

### CSS Variables

The component uses the following CSS custom properties:

- `--background`: Dialog background color
- `--border`: Border color
- `--ring`: Focus ring color
- `--destructive`: Destructive variant colors
- `--foreground`: Text color
- `--muted-foreground`: Secondary text color

### Customization

```tsx
// Custom dialog styling
<DialogContent className="bg-gradient-to-br from-blue-50 to-indigo-100">
  {/* content */}
</DialogContent>

// Custom overlay
<DialogContent overlayVariant="blur" className="backdrop-blur-md">
  {/* content */}
</DialogContent>

// Custom animations
<DialogContent className="data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down">
  {/* content */}
</DialogContent>
```

## Performance

### Optimization Tips

1. **Lazy Content**: Only render dialog content when open
2. **Portal Management**: Use single portal for multiple dialogs
3. **Form Optimization**: Reset forms when dialog closes

```tsx
// Lazy content rendering
const [open, setOpen] = useState(false)

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  {open && (
    <DialogContent>
      <ExpensiveDialogContent />
    </DialogContent>
  )}
</Dialog>

// Form reset optimization
const [open, setOpen] = useState(false)
const [formData, setFormData] = useState(initialData)

const handleOpenChange = (newOpen) => {
  setOpen(newOpen)
  if (!newOpen) {
    // Reset form when dialog closes
    setFormData(initialData)
  }
}

// Memoized dialog content
const MemoizedDialogContent = React.memo(({ data }) => (
  <DialogContent>
    {/* expensive content */}
  </DialogContent>
))
```

## Migration Guide

### From Basic Modal

```tsx
// Before: Custom modal
const [isOpen, setIsOpen] = useState(false)

{isOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div className="bg-white rounded p-6">
      <h2>Title</h2>
      <p>Content</p>
      <button onClick={() => setIsOpen(false)}>Close</button>
    </div>
  </div>
)}

// After: Dialog component
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <p>Content</p>
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### From Other Libraries

```tsx
// From Chakra UI
// Before:
// <Modal isOpen={isOpen} onClose={onClose}>
//   <ModalOverlay />
//   <ModalContent>
//     <ModalHeader>Title</ModalHeader>
//     <ModalCloseButton />
//     <ModalBody>Content</ModalBody>
//     <ModalFooter>
//       <Button onClick={onClose}>Close</Button>
//     </ModalFooter>
//   </ModalContent>
// </Modal>

// After:
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <div>Content</div>
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Related Components

- **AlertDialog**: For confirmation dialogs
- **Sheet**: For slide-out panels
- **Popover**: For smaller overlays
- **Tooltip**: For contextual information

## Testing

### Test Scenarios

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'

// Basic functionality
test('opens and closes dialog', async () => {
  const user = userEvent.setup()
  
  render(
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogTitle>Test Dialog</DialogTitle>
        <p>Dialog content</p>
      </DialogContent>
    </Dialog>
  )
  
  await user.click(screen.getByText('Open'))
  expect(screen.getByText('Test Dialog')).toBeInTheDocument()
  
  await user.keyboard('{Escape}')
  expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument()
})

// Accessibility
test('has proper ARIA attributes', () => {
  render(
    <Dialog defaultOpen>
      <DialogContent>
        <DialogTitle>Test Title</DialogTitle>
        <p>Content</p>
      </DialogContent>
    </Dialog>
  )
  
  const dialog = screen.getByRole('dialog')
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(dialog).toHaveAccessibleName('Test Title')
})

// Controlled state
test('respects controlled state', async () => {
  const handleOpenChange = jest.fn()
  
  render(
    <Dialog open={false} onOpenChange={handleOpenChange}>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogTitle>Test</DialogTitle>
      </DialogContent>
    </Dialog>
  )
  
  await userEvent.click(screen.getByText('Open'))
  expect(handleOpenChange).toHaveBeenCalledWith(true)
})
```
