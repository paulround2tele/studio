# Popover

Contextual content overlays that display additional information or controls relative to a trigger element.

## Overview

The Popover component creates floating content containers that appear relative to trigger elements. It supports various sizes, visual variants, positioning options, and can contain any type of content including forms, menus, or rich information panels.

## Import

```typescript
import { 
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverArrow,
  PopoverClose,
  SimplePopover 
} from '@/components/ui/popover'
```

## Basic Usage

### Simple Popover

```tsx
<SimplePopover
  trigger={<Button variant="outline">Open Popover</Button>}
>
  <div className="space-y-2">
    <h4 className="font-medium leading-none">Popover Title</h4>
    <p className="text-sm text-muted-foreground">
      This is the popover content. It can contain any React components.
    </p>
  </div>
</SimplePopover>
```

### Manual Construction

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Settings</Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Dimensions</h4>
        <p className="text-sm text-muted-foreground">
          Set the dimensions for the layer.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="width">Width</Label>
        <Input id="width" defaultValue="100%" />
        <Label htmlFor="height">Height</Label>
        <Input id="height" defaultValue="25px" />
      </div>
    </div>
  </PopoverContent>
</Popover>
```

## Variants

### Visual Variants

```tsx
// Default popover style
<SimplePopover variant="default" trigger={trigger}>
  Content here
</SimplePopover>

// Elevated with stronger shadow
<SimplePopover variant="elevated" trigger={trigger}>
  Content here
</SimplePopover>

// Minimal with backdrop blur
<SimplePopover variant="minimal" trigger={trigger}>
  Content here
</SimplePopover>

// Accent colored
<SimplePopover variant="accent" trigger={trigger}>
  Content here
</SimplePopover>

// Destructive (for warnings/errors)
<SimplePopover variant="destructive" trigger={trigger}>
  Content here
</SimplePopover>

// Success state
<SimplePopover variant="success" trigger={trigger}>
  Content here
</SimplePopover>

// Warning state
<SimplePopover variant="warning" trigger={trigger}>
  Content here
</SimplePopover>
```

### Sizes

```tsx
// Small popover
<SimplePopover size="sm" trigger={trigger}>
  Compact content
</SimplePopover>

// Default size
<SimplePopover size="default" trigger={trigger}>
  Regular content
</SimplePopover>

// Large popover
<SimplePopover size="lg" trigger={trigger}>
  Expanded content
</SimplePopover>

// Extra large
<SimplePopover size="xl" trigger={trigger}>
  Very large content
</SimplePopover>

// Auto-sized
<SimplePopover size="auto" trigger={trigger}>
  Content determines size
</SimplePopover>

// Full width
<SimplePopover size="full" trigger={trigger}>
  Full width content
</SimplePopover>
```

## Positioning

### Alignment and Side

```tsx
// Different sides
<SimplePopover side="top" trigger={trigger}>Top positioned</SimplePopover>
<SimplePopover side="right" trigger={trigger}>Right positioned</SimplePopover>
<SimplePopover side="bottom" trigger={trigger}>Bottom positioned</SimplePopover>
<SimplePopover side="left" trigger={trigger}>Left positioned</SimplePopover>

// Different alignments
<SimplePopover align="start" trigger={trigger}>Start aligned</SimplePopover>
<SimplePopover align="center" trigger={trigger}>Center aligned</SimplePopover>
<SimplePopover align="end" trigger={trigger}>End aligned</SimplePopover>

// Custom offset
<SimplePopover sideOffset={20} trigger={trigger}>
  Further from trigger
</SimplePopover>
```

### With Arrow

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Show with Arrow</Button>
  </PopoverTrigger>
  <PopoverContent>
    <PopoverArrow />
    <div className="space-y-2">
      <h4 className="font-medium">With Arrow</h4>
      <p className="text-sm text-muted-foreground">
        This popover has an arrow pointing to the trigger.
      </p>
    </div>
  </PopoverContent>
</Popover>
```

## Advanced Examples

### Form Popover

```tsx
const FormPopover = () => {
  const [open, setOpen] = useState(false)
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </PopoverTrigger>
      <PopoverContent size="lg">
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault()
          // Handle form submission
          setOpen(false)
        }}>
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Add New Item</h4>
            <p className="text-sm text-muted-foreground">
              Enter the details for the new item.
            </p>
          </div>
          
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Item name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Item description"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Item</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
```

### Date Picker Popover

```tsx
const DatePickerPopover = () => {
  const [date, setDate] = useState<Date>()
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent size="auto" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
```

### Color Picker Popover

```tsx
const ColorPickerPopover = () => {
  const [color, setColor] = useState("#3b82f6")
  
  const colors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e",
    "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899"
  ]
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-start">
          <div 
            className="w-4 h-4 rounded mr-2 border"
            style={{ backgroundColor: color }}
          />
          {color}
        </Button>
      </PopoverTrigger>
      <PopoverContent size="sm">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Pick a color</h4>
          <div className="grid grid-cols-4 gap-2">
            {colors.map((c) => (
              <button
                key={c}
                className={cn(
                  "w-8 h-8 rounded border-2",
                  color === c ? "border-ring" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-color">Custom Color</Label>
            <Input
              id="custom-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#000000"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

### User Info Popover

```tsx
const UserInfoPopover = ({ user }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Avatar className="h-6 w-6 mr-2">
            <AvatarImage src={user.avatar} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          {user.name}
        </Button>
      </PopoverTrigger>
      <PopoverContent size="lg" align="start">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold">{user.name}</h4>
              <p className="text-sm text-muted-foreground">{user.title}</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid gap-2 text-sm">
            <div className="flex items-center">
              <Mail className="mr-2 h-4 w-4 opacity-70" />
              {user.email}
            </div>
            <div className="flex items-center">
              <Phone className="mr-2 h-4 w-4 opacity-70" />
              {user.phone}
            </div>
            <div className="flex items-center">
              <MapPin className="mr-2 h-4 w-4 opacity-70" />
              {user.location}
            </div>
          </div>
          
          <Separator />
          
          <div className="flex space-x-2">
            <Button size="sm" variant="outline">
              <MessageCircle className="mr-2 h-4 w-4" />
              Message
            </Button>
            <Button size="sm" variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Connect
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

### Settings Popover

```tsx
const SettingsPopover = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    autoSave: true
  })
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-4">
          <h4 className="font-medium leading-none">Quick Settings</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications" className="text-sm">
                Notifications
              </Label>
              <Switch
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, notifications: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="text-sm">
                Dark Mode
              </Label>
              <Switch
                id="dark-mode"
                checked={settings.darkMode}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, darkMode: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-save" className="text-sm">
                Auto Save
              </Label>
              <Switch
                id="auto-save"
                checked={settings.autoSave}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, autoSave: checked }))
                }
              />
            </div>
          </div>
          
          <Separator />
          
          <Button size="sm" variant="outline" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            All Settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

### Confirmation Popover

```tsx
const ConfirmationPopover = ({ onConfirm, children }) => {
  const [open, setOpen] = useState(false)
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent variant="destructive" size="sm">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <h4 className="font-medium">Confirm Action</h4>
          </div>
          <p className="text-sm">
            Are you sure you want to perform this action? This cannot be undone.
          </p>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                onConfirm()
                setOpen(false)
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

## API Reference

### Popover Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Controlled open state |
| `defaultOpen` | `boolean` | `false` | Default open state |
| `onOpenChange` | `(open: boolean) => void` | - | Open change handler |
| `modal` | `boolean` | `false` | Modal behavior |

### PopoverContent Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'default' \| 'lg' \| 'xl' \| 'auto' \| 'full'` | `'default'` | Content size |
| `variant` | `'default' \| 'elevated' \| 'minimal' \| 'accent' \| 'destructive' \| 'success' \| 'warning'` | `'default'` | Visual variant |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment relative to trigger |
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'` | Preferred side |
| `sideOffset` | `number` | `4` | Distance from trigger |
| `alignOffset` | `number` | `0` | Alignment offset |
| `avoidCollisions` | `boolean` | `true` | Avoid collisions with viewport |

### SimplePopover Props

Combines all Popover and PopoverContent props with a simpler API:

| Prop | Type | Description |
|------|------|-------------|
| `trigger` | `React.ReactNode` | Trigger element |
| `children` | `React.ReactNode` | Popover content |

## Accessibility

- Full keyboard navigation support
- Proper ARIA attributes and roles
- Screen reader compatibility
- Focus management and trapping
- Escape key to close
- Click outside to close

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Navigate within popover content |
| `Escape` | Close popover |
| `Enter/Space` | Activate trigger (when focused) |

## Best Practices

### Do's
- Use popovers for contextual information and actions
- Keep content focused and relevant
- Position popovers to avoid viewport edges
- Provide clear close mechanisms
- Use appropriate variants for context (error, success, etc.)
- Keep popover content accessible via keyboard

### Don'ts
- Don't use popovers for critical navigation
- Don't nest popovers too deeply
- Don't make popovers too large or complex
- Don't forget mobile experience considerations
- Don't use popovers for content that should be persistent

## Design Tokens

```css
/* Popover animations */
--popover-animation-duration: 150ms;
--popover-fade-in: fade-in 150ms ease-out;
--popover-fade-out: fade-out 150ms ease-in;
--popover-zoom-in: zoom-in-95 150ms ease-out;
--popover-zoom-out: zoom-out-95 150ms ease-in;

/* Popover sizes */
--popover-sm: 12rem;
--popover-default: 18rem;
--popover-lg: 24rem;
--popover-xl: 30rem;

/* Popover colors */
--popover-bg: hsl(var(--popover));
--popover-border: hsl(var(--border));
--popover-text: hsl(var(--popover-foreground));
--popover-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
```

## Related Components

- [Dropdown Menu](./dropdown-menu.md) - For action menus
- [Tooltip](./tooltip.md) - For simple information display
- [Dialog](../organism/dialog.md) - For complex modals
- [Sheet](../organism/sheet.md) - For slide-out panels
