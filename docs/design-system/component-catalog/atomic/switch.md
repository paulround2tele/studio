# Switch Component

## Overview

The Switch component provides a toggle control for binary states (on/off, enabled/disabled). Built on Radix UI primitives with smooth animations, multiple variants, sizes, and comprehensive accessibility features.

## API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `checked` | `boolean` | `undefined` | Controlled checked state |
| `defaultChecked` | `boolean` | `undefined` | Default checked state for uncontrolled usage |
| `onCheckedChange` | `(checked: boolean) => void` | `undefined` | Callback when checked state changes |
| `variant` | `"default" \| "destructive" \| "outline" \| "ghost"` | `"default"` | Visual style variant |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size of the switch |
| `error` | `boolean` | `false` | Whether switch is in error state (forces destructive variant) |
| `disabled` | `boolean` | `false` | Whether switch is disabled |
| `required` | `boolean` | `false` | Whether toggle is required |
| `name` | `string` | `undefined` | Form name attribute |
| `value` | `string` | `undefined` | Form value attribute |
| `className` | `string` | `undefined` | Additional CSS classes |

All Radix UI Switch props are also supported.

## Usage Examples

### Basic Switch

```tsx
import { Switch } from "@/components/ui/switch"

// Uncontrolled
<Switch defaultChecked />

// Controlled
const [enabled, setEnabled] = useState(false)
<Switch checked={enabled} onCheckedChange={setEnabled} />
```

### With Labels

```tsx
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

<div className="flex items-center space-x-2">
  <Switch id="airplane-mode" />
  <Label htmlFor="airplane-mode">Airplane mode</Label>
</div>

// More descriptive layout
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label htmlFor="notifications">Push Notifications</Label>
    <p className="text-sm text-muted-foreground">
      Receive notifications about new messages and updates
    </p>
  </div>
  <Switch id="notifications" />
</div>
```

### Different Variants

```tsx
{/* Default variant */}
<Switch variant="default" defaultChecked />

{/* Destructive variant */}
<Switch variant="destructive" defaultChecked />

{/* Outline variant */}
<Switch variant="outline" defaultChecked />

{/* Ghost variant */}
<Switch variant="ghost" defaultChecked />

{/* Error state */}
<Switch error defaultChecked />
```

### Different Sizes

```tsx
<div className="flex items-center space-x-4">
  {/* Small size */}
  <div className="flex items-center space-x-2">
    <Switch size="sm" defaultChecked />
    <Label className="text-sm">Small</Label>
  </div>
  
  {/* Default size */}
  <div className="flex items-center space-x-2">
    <Switch size="default" defaultChecked />
    <Label>Default</Label>
  </div>
  
  {/* Large size */}
  <div className="flex items-center space-x-2">
    <Switch size="lg" defaultChecked />
    <Label className="text-lg">Large</Label>
  </div>
</div>
```

### Form Integration

```tsx
const [settings, setSettings] = useState({
  notifications: true,
  darkMode: false,
  autoSave: true,
  publicProfile: false
})

<form className="space-y-6">
  <div className="space-y-4">
    <h3 className="text-lg font-medium">Preferences</h3>
    
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="notifications">Email Notifications</Label>
        <p className="text-sm text-muted-foreground">
          Receive email notifications about account activity
        </p>
      </div>
      <Switch 
        id="notifications"
        checked={settings.notifications}
        onCheckedChange={(checked) => 
          setSettings(prev => ({ ...prev, notifications: checked }))
        }
      />
    </div>
    
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="dark-mode">Dark Mode</Label>
        <p className="text-sm text-muted-foreground">
          Use dark theme across the application
        </p>
      </div>
      <Switch 
        id="dark-mode"
        checked={settings.darkMode}
        onCheckedChange={(checked) => 
          setSettings(prev => ({ ...prev, darkMode: checked }))
        }
      />
    </div>
    
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="auto-save">Auto Save</Label>
        <p className="text-sm text-muted-foreground">
          Automatically save your work every few minutes
        </p>
      </div>
      <Switch 
        id="auto-save"
        checked={settings.autoSave}
        onCheckedChange={(checked) => 
          setSettings(prev => ({ ...prev, autoSave: checked }))
        }
      />
    </div>
    
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor="public-profile">Public Profile</Label>
        <p className="text-sm text-muted-foreground">
          Make your profile visible to other users
        </p>
      </div>
      <Switch 
        id="public-profile"
        checked={settings.publicProfile}
        onCheckedChange={(checked) => 
          setSettings(prev => ({ ...prev, publicProfile: checked }))
        }
      />
    </div>
  </div>
</form>
```

### With Validation

```tsx
const [isPrivate, setIsPrivate] = useState(false)
const [error, setError] = useState("")

const handleToggle = (checked) => {
  setIsPrivate(checked)
  
  // Example validation
  if (checked && !user.hasPremium) {
    setError("Private repositories require a premium account")
    setIsPrivate(false)
    return
  }
  
  setError("")
}

<div className="space-y-2">
  <div className="flex items-center justify-between">
    <div className="space-y-0.5">
      <Label htmlFor="private-repo">Private Repository</Label>
      <p className="text-sm text-muted-foreground">
        Make this repository private and restrict access
      </p>
    </div>
    <Switch 
      id="private-repo"
      checked={isPrivate}
      onCheckedChange={handleToggle}
      error={!!error}
    />
  </div>
  {error && (
    <p className="text-sm text-destructive">{error}</p>
  )}
</div>
```

### Loading State

```tsx
const [isLoading, setIsLoading] = useState(false)
const [enabled, setEnabled] = useState(false)

const handleToggle = async (checked) => {
  setIsLoading(true)
  try {
    await updateSetting('feature', checked)
    setEnabled(checked)
  } catch (error) {
    // Handle error
  } finally {
    setIsLoading(false)
  }
}

<div className="flex items-center space-x-2">
  <Switch 
    checked={enabled}
    onCheckedChange={handleToggle}
    disabled={isLoading}
  />
  <Label className={isLoading ? "opacity-50" : ""}>
    {isLoading ? "Updating..." : "Feature enabled"}
  </Label>
</div>
```

### Conditional Switches

```tsx
const [mainFeature, setMainFeature] = useState(false)
const [subFeature1, setSubFeature1] = useState(false)
const [subFeature2, setSubFeature2] = useState(false)

<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label htmlFor="main-feature">Enable Advanced Features</Label>
    <Switch 
      id="main-feature"
      checked={mainFeature}
      onCheckedChange={(checked) => {
        setMainFeature(checked)
        if (!checked) {
          setSubFeature1(false)
          setSubFeature2(false)
        }
      }}
    />
  </div>
  
  {mainFeature && (
    <div className="ml-6 space-y-4 border-l pl-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="sub-feature-1">Analytics</Label>
        <Switch 
          id="sub-feature-1"
          checked={subFeature1}
          onCheckedChange={setSubFeature1}
          size="sm"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="sub-feature-2">Real-time Updates</Label>
        <Switch 
          id="sub-feature-2"
          checked={subFeature2}
          onCheckedChange={setSubFeature2}
          size="sm"
        />
      </div>
    </div>
  )}
</div>
```

### Switch Groups

```tsx
const [permissions, setPermissions] = useState({
  read: true,
  write: false,
  delete: false,
  admin: false
})

const updatePermission = (permission, checked) => {
  setPermissions(prev => {
    const updated = { ...prev, [permission]: checked }
    
    // Auto-enable read if any other permission is enabled
    if (checked && permission !== 'read') {
      updated.read = true
    }
    
    // Auto-disable dependent permissions
    if (!checked && permission === 'read') {
      updated.write = false
      updated.delete = false
      updated.admin = false
    }
    
    return updated
  })
}

<fieldset className="space-y-4">
  <legend className="text-lg font-medium">User Permissions</legend>
  
  <div className="grid grid-cols-2 gap-4">
    <div className="flex items-center justify-between">
      <Label htmlFor="read">Read Access</Label>
      <Switch 
        id="read"
        checked={permissions.read}
        onCheckedChange={(checked) => updatePermission('read', checked)}
      />
    </div>
    
    <div className="flex items-center justify-between">
      <Label htmlFor="write">Write Access</Label>
      <Switch 
        id="write"
        checked={permissions.write}
        onCheckedChange={(checked) => updatePermission('write', checked)}
        disabled={!permissions.read}
      />
    </div>
    
    <div className="flex items-center justify-between">
      <Label htmlFor="delete">Delete Access</Label>
      <Switch 
        id="delete"
        checked={permissions.delete}
        onCheckedChange={(checked) => updatePermission('delete', checked)}
        disabled={!permissions.read}
        variant="destructive"
      />
    </div>
    
    <div className="flex items-center justify-between">
      <Label htmlFor="admin">Admin Access</Label>
      <Switch 
        id="admin"
        checked={permissions.admin}
        onCheckedChange={(checked) => updatePermission('admin', checked)}
        disabled={!permissions.read}
        variant="outline"
      />
    </div>
  </div>
</fieldset>
```

## Accessibility

### Features

- **ARIA Support**: Full ARIA switch implementation via Radix UI
- **Keyboard Navigation**: Space/Enter toggles, Tab navigation
- **Screen Reader**: Proper state announcements (on/off)
- **Focus Management**: Visible focus indicators
- **Label Association**: Supports proper labeling

### Best Practices

```tsx
// Always provide labels
<div className="flex items-center space-x-2">
  <Switch id="feature-toggle" />
  <Label htmlFor="feature-toggle">Enable feature</Label>
</div>

// Provide descriptive context
<div className="flex items-center justify-between">
  <div className="space-y-0.5">
    <Label htmlFor="notifications">Push Notifications</Label>
    <p className="text-sm text-muted-foreground">
      Get notified about important updates
    </p>
  </div>
  <Switch id="notifications" />
</div>

// Use fieldsets for related switches
<fieldset>
  <legend className="text-lg font-medium">Privacy Settings</legend>
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Switch id="public-profile" />
      <Label htmlFor="public-profile">Public profile</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Switch id="show-email" />
      <Label htmlFor="show-email">Show email address</Label>
    </div>
  </div>
</fieldset>

// Handle error states
<div className="space-y-2">
  <div className="flex items-center space-x-2">
    <Switch id="premium-feature" error={!!error} />
    <Label htmlFor="premium-feature">Premium Feature</Label>
  </div>
  {error && (
    <p className="text-sm text-destructive" role="alert">
      {error}
    </p>
  )}
</div>
```

## Styling

### CSS Variables

The component uses the following CSS custom properties:

- `--primary`: Default variant checked color
- `--destructive`: Error/destructive variant color
- `--input`: Background color for unchecked state
- `--accent`: Outline/ghost variant checked color
- `--background`: Thumb color
- `--ring`: Focus ring color

### Customization

```tsx
// Custom switch colors
<Switch 
  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
/>

// Custom sizes
<Switch 
  className="h-8 w-14"
  // Note: You'll also need to adjust thumb size and positioning
/>

// Custom thumb styling
<Switch 
  className="[&>span]:bg-blue-500 [&>span]:border [&>span]:border-white"
/>
```

## Performance

### Optimization Tips

1. **Avoid Inline Functions**: Define change handlers outside render
2. **Memoization**: Wrap in `React.memo` for stable switches
3. **Debounce Updates**: For switches that trigger API calls

```tsx
// Optimized switch with memoization
const MemoizedSwitch = React.memo(({ checked, onChange, ...props }) => (
  <Switch checked={checked} onCheckedChange={onChange} {...props} />
))

// Debounced API updates
const [setting, setSetting] = useState(false)
const debouncedUpdate = useMemo(
  () => debounce((value) => updateUserSetting(value), 500),
  []
)

const handleToggle = (checked) => {
  setSetting(checked)
  debouncedUpdate(checked)
}

<Switch checked={setting} onCheckedChange={handleToggle} />
```

## Migration Guide

### From HTML Checkbox

```tsx
// Before: HTML checkbox used as toggle
<input 
  type="checkbox" 
  checked={enabled}
  onChange={(e) => setEnabled(e.target.checked)}
/>

// After: Switch component
<Switch 
  checked={enabled}
  onCheckedChange={setEnabled}
/>
```

### From Other Libraries

```tsx
// From Chakra UI
// Before:
// <Switch isChecked={enabled} onChange={setEnabled}>
//   Enable feature
// </Switch>

// After:
<div className="flex items-center space-x-2">
  <Switch checked={enabled} onCheckedChange={setEnabled} />
  <Label>Enable feature</Label>
</div>

// From Material-UI
// Before:
// <FormControlLabel
//   control={<Switch checked={enabled} onChange={setEnabled} />}
//   label="Enable feature"
// />

// After:
<div className="flex items-center space-x-2">
  <Switch checked={enabled} onCheckedChange={setEnabled} />
  <Label>Enable feature</Label>
</div>
```

## Related Components

- **Checkbox**: For binary selection in forms
- **RadioGroup**: For single selection from multiple options
- **Toggle**: For button-style toggles
- **Button**: For action triggers

## Testing

### Test Scenarios

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from '@/components/ui/switch'

// Basic functionality
test('toggles on click', () => {
  const handleChange = jest.fn()
  render(<Switch onCheckedChange={handleChange} />)
  
  fireEvent.click(screen.getByRole('switch'))
  expect(handleChange).toHaveBeenCalledWith(true)
})

// Keyboard interaction
test('toggles on space key', () => {
  const handleChange = jest.fn()
  render(<Switch onCheckedChange={handleChange} />)
  
  const switch_ = screen.getByRole('switch')
  switch_.focus()
  fireEvent.keyDown(switch_, { key: ' ' })
  
  expect(handleChange).toHaveBeenCalledWith(true)
})

// Accessibility
test('has proper ARIA attributes', () => {
  render(<Switch checked={true} />)
  const switch_ = screen.getByRole('switch')
  
  expect(switch_).toHaveAttribute('aria-checked', 'true')
})

// Disabled state
test('does not toggle when disabled', () => {
  const handleChange = jest.fn()
  render(<Switch disabled onCheckedChange={handleChange} />)
  
  fireEvent.click(screen.getByRole('switch'))
  expect(handleChange).not.toHaveBeenCalled()
})

// Error state
test('applies error styling', () => {
  render(<Switch error />)
  const switch_ = screen.getByRole('switch')
  
  expect(switch_).toHaveClass('data-[state=checked]:bg-destructive')
})
```
