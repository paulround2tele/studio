# Dropdown Menu

Context menus and dropdown interfaces for actions, navigation, and selections.

## Overview

The Dropdown Menu component provides a versatile menu system that can be triggered by buttons, icons, or other elements. It supports nested submenus, checkboxes, radio buttons, keyboard shortcuts, and various visual styles with smooth animations and full accessibility.

## Import

```typescript
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from '@/components/ui/dropdown-menu'
```

## Basic Usage

### Simple Menu

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Profile</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Logout</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### With Icon Trigger

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>
      <Edit className="mr-2 h-4 w-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuItem>
      <Copy className="mr-2 h-4 w-4" />
      Duplicate
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive">
      <Trash className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Variants

### Content Variants

```tsx
// Default popover style
<DropdownMenuContent variant="default">
  {/* items */}
</DropdownMenuContent>

// Elevated with stronger shadow
<DropdownMenuContent variant="elevated">
  {/* items */}
</DropdownMenuContent>

// Flat without shadow
<DropdownMenuContent variant="flat">
  {/* items */}
</DropdownMenuContent>

// Minimal background style
<DropdownMenuContent variant="minimal">
  {/* items */}
</DropdownMenuContent>
```

### Sizes

```tsx
// Small menu
<DropdownMenuContent size="sm">
  <DropdownMenuItem size="sm">Small Item</DropdownMenuItem>
</DropdownMenuContent>

// Default size
<DropdownMenuContent size="default">
  <DropdownMenuItem size="default">Default Item</DropdownMenuItem>
</DropdownMenuContent>

// Large menu
<DropdownMenuContent size="lg">
  <DropdownMenuItem size="lg">Large Item</DropdownMenuItem>
</DropdownMenuContent>
```

### Item Variants

```tsx
<DropdownMenuContent>
  <DropdownMenuItem variant="default">Normal Action</DropdownMenuItem>
  <DropdownMenuItem variant="destructive">Delete Action</DropdownMenuItem>
  <DropdownMenuItem variant="ghost">Subtle Action</DropdownMenuItem>
</DropdownMenuContent>
```

## Advanced Features

### Checkboxes and Radio Groups

```tsx
const [notifications, setNotifications] = useState(true)
const [theme, setTheme] = useState("light")

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Preferences</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Settings</DropdownMenuLabel>
    <DropdownMenuSeparator />
    
    {/* Checkbox Item */}
    <DropdownMenuCheckboxItem
      checked={notifications}
      onCheckedChange={setNotifications}
    >
      Enable Notifications
    </DropdownMenuCheckboxItem>
    
    <DropdownMenuSeparator />
    <DropdownMenuLabel>Theme</DropdownMenuLabel>
    
    {/* Radio Group */}
    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
      <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  </DropdownMenuContent>
</DropdownMenu>
```

### Submenus

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Actions</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>New File</DropdownMenuItem>
    
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <FileText className="mr-2 h-4 w-4" />
        Templates
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem>Blank Document</DropdownMenuItem>
        <DropdownMenuItem>Meeting Notes</DropdownMenuItem>
        <DropdownMenuItem>Project Plan</DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
    
    <DropdownMenuSeparator />
    <DropdownMenuItem>Import</DropdownMenuItem>
    <DropdownMenuItem>Export</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Keyboard Shortcuts

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Edit</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>
      Undo
      <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuItem>
      Redo
      <DropdownMenuShortcut>⌘⇧Z</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>
      Cut
      <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuItem>
      Copy
      <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
    </DropdownMenuItem>
    <DropdownMenuItem>
      Paste
      <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Advanced Examples

### User Profile Menu

```tsx
const UserProfileMenu = ({ user }) => {
  const router = useRouter()
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/profile')}>
            <User className="mr-2 h-4 w-4" />
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/billing')}>
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Table Row Actions

```tsx
const TableRowActions = ({ row }) => {
  const [open, setOpen] = useState(false)
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(row.id)}>
          <Copy className="mr-2 h-4 w-4" />
          Copy ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => editRow(row)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => duplicateRow(row)}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => deleteRow(row)}
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Context Menu

```tsx
const ContextMenuDemo = () => {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <div className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
          Right click here
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuItem inset>
          <PlusCircle className="mr-2 h-4 w-4" />
          New File
        </DropdownMenuItem>
        <DropdownMenuItem inset>
          <Folder className="mr-2 h-4 w-4" />
          New Folder
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem inset disabled>
          <Download className="mr-2 h-4 w-4" />
          Download
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger inset>
            <Share className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            <DropdownMenuItem>
              <Mail className="mr-2 h-4 w-4" />
              Email link
            </DropdownMenuItem>
            <DropdownMenuItem>
              <MessageSquare className="mr-2 h-4 w-4" />
              Message
            </DropdownMenuItem>
            <DropdownMenuItem>
              <PlusCircle className="mr-2 h-4 w-4" />
              More...
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Filter Menu

```tsx
const FilterMenu = ({ filters, onFilterChange }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {Object.values(filters).some(Boolean) && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0">
              {Object.values(filters).filter(Boolean).length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={filters.active}
          onCheckedChange={(checked) => onFilterChange('active', checked)}
        >
          Active
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.pending}
          onCheckedChange={(checked) => onFilterChange('pending', checked)}
        >
          Pending
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.completed}
          onCheckedChange={(checked) => onFilterChange('completed', checked)}
        >
          Completed
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onFilterChange('reset')}>
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Command Palette Style

```tsx
const CommandMenu = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-sm text-muted-foreground">
          <Search className="mr-2 h-4 w-4" />
          Search commands...
          <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px]" align="start">
        <DropdownMenuLabel>Recent Commands</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <FileText className="mr-2 h-4 w-4" />
          Create new document
          <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FolderPlus className="mr-2 h-4 w-4" />
          Create new folder
          <DropdownMenuShortcut>⇧⌘N</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Search className="mr-2 h-4 w-4" />
          Global search
          <DropdownMenuShortcut>⌘F</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Navigation</DropdownMenuLabel>
        <DropdownMenuItem>
          <Home className="mr-2 h-4 w-4" />
          Go to dashboard
          <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Open settings
          <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## API Reference

### DropdownMenu Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Controlled open state |
| `defaultOpen` | `boolean` | `false` | Default open state |
| `onOpenChange` | `(open: boolean) => void` | - | Open change handler |
| `modal` | `boolean` | `true` | Modal behavior |

### DropdownMenuContent Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'elevated' \| 'flat' \| 'minimal'` | `'default'` | Visual variant |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Size variant |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment relative to trigger |
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'` | Preferred side |
| `sideOffset` | `number` | `4` | Distance from trigger |

### DropdownMenuItem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'destructive' \| 'ghost'` | `'default'` | Item variant |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Item size |
| `inset` | `boolean` | `false` | Indent for alignment |
| `disabled` | `boolean` | `false` | Disable item |

### Checkbox and Radio Items

| Prop | Type | Description |
|------|------|-------------|
| `checked` | `boolean` | Checked state |
| `onCheckedChange` | `(checked: boolean) => void` | Change handler |

## Accessibility

- Full keyboard navigation (Tab, Arrow keys, Enter, Escape)
- Proper ARIA attributes and roles
- Screen reader support with item announcements
- Focus management and visual indicators
- Supports roving tabindex for efficient navigation

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter/Space` | Activate item |
| `↓` | Move to next item |
| `↑` | Move to previous item |
| `→` | Open submenu |
| `←` | Close submenu |
| `Escape` | Close menu |
| `Tab` | Close menu and move to next element |

## Best Practices

### Do's
- Use clear, actionable labels
- Group related items with separators
- Include icons for better visual recognition
- Provide keyboard shortcuts for common actions
- Use consistent menu patterns throughout the app
- Position menus to avoid screen edges

### Don'ts
- Don't put too many items in a single menu
- Don't nest submenus too deeply (max 2-3 levels)
- Don't use menus for primary navigation
- Don't forget to handle disabled states
- Don't make menu items too similar in appearance

## Design Tokens

```css
/* Dropdown animations */
--dropdown-animation-duration: 150ms;
--dropdown-fade-in: fade-in 150ms ease-out;
--dropdown-fade-out: fade-out 150ms ease-in;
--dropdown-zoom-in: zoom-in-95 150ms ease-out;
--dropdown-zoom-out: zoom-out-95 150ms ease-in;

/* Dropdown spacing */
--dropdown-content-padding: 0.25rem;
--dropdown-item-padding-sm: 0.25rem 0.375rem;
--dropdown-item-padding-default: 0.375rem 0.5rem;
--dropdown-item-padding-lg: 0.5rem 0.75rem;

/* Dropdown colors */
--dropdown-bg: hsl(var(--popover));
--dropdown-border: hsl(var(--border));
--dropdown-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--dropdown-item-hover: hsl(var(--accent));
--dropdown-item-focus: hsl(var(--accent));
```

## Related Components

- [Button](../atomic/button.md) - Trigger element
- [Menubar](./menubar.md) - Application menu bar
- [Popover](./popover.md) - Alternative overlay content
- [Select](../atomic/select.md) - For single value selection
