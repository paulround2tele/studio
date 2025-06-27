# Tabs Component

## Overview

The Tabs component provides a flexible tabbed interface built on Radix UI primitives. It supports multiple variants, sizes, and provides a clean way to organize content into separate sections. Perfect for navigation, settings panels, and content organization.

## API Reference

### Tabs (Root)

The root container that manages tab state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `undefined` | Controlled active tab value |
| `defaultValue` | `string` | `undefined` | Default active tab for uncontrolled usage |
| `onValueChange` | `(value: string) => void` | `undefined` | Callback when active tab changes |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Tab orientation |
| `dir` | `"ltr" \| "rtl"` | `"ltr"` | Reading direction |
| `activationMode` | `"automatic" \| "manual"` | `"automatic"` | How tabs activate (keyboard navigation) |

### TabsList

Container for tab triggers.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "line" \| "pills" \| "ghost"` | `"default"` | Visual style variant |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size of the tab list |
| `className` | `string` | `undefined` | Additional CSS classes |

### TabsTrigger

Individual tab trigger button.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | Required | Unique value for this tab |
| `variant` | `"default" \| "line" \| "pills" \| "ghost"` | `"default"` | Visual style variant |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size of the trigger |
| `disabled` | `boolean` | `false` | Whether trigger is disabled |
| `className` | `string` | `undefined` | Additional CSS classes |

### TabsContent

Content panel for each tab.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | Required | Value matching the associated trigger |
| `variant` | `"default" \| "line" \| "pills" \| "ghost"` | `"default"` | Visual style variant |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Content size styling |
| `className` | `string` | `undefined` | Additional CSS classes |

## Usage Examples

### Basic Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="account" className="w-[400px]">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">
    <p>Make changes to your account here.</p>
  </TabsContent>
  <TabsContent value="password">
    <p>Change your password here.</p>
  </TabsContent>
</Tabs>
```

### Controlled Tabs

```tsx
const [activeTab, setActiveTab] = useState("overview")

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="reports">Reports</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    <DashboardOverview />
  </TabsContent>
  <TabsContent value="analytics">
    <AnalyticsPanel />
  </TabsContent>
  <TabsContent value="reports">
    <ReportsPanel />
  </TabsContent>
</Tabs>
```

### Different Variants

```tsx
{/* Default variant */}
<Tabs defaultValue="tab1" variant="default">
  <TabsList variant="default">
    <TabsTrigger value="tab1" variant="default">Default</TabsTrigger>
    <TabsTrigger value="tab2" variant="default">Style</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1" variant="default">Default content</TabsContent>
  <TabsContent value="tab2" variant="default">Content 2</TabsContent>
</Tabs>

{/* Line variant */}
<Tabs defaultValue="tab1">
  <TabsList variant="line">
    <TabsTrigger value="tab1" variant="line">Line</TabsTrigger>
    <TabsTrigger value="tab2" variant="line">Style</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1" variant="line">Line content</TabsContent>
  <TabsContent value="tab2" variant="line">Content 2</TabsContent>
</Tabs>

{/* Pills variant */}
<Tabs defaultValue="tab1">
  <TabsList variant="pills">
    <TabsTrigger value="tab1" variant="pills">Pills</TabsTrigger>
    <TabsTrigger value="tab2" variant="pills">Style</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1" variant="pills">Pills content</TabsContent>
  <TabsContent value="tab2" variant="pills">Content 2</TabsContent>
</Tabs>

{/* Ghost variant */}
<Tabs defaultValue="tab1">
  <TabsList variant="ghost">
    <TabsTrigger value="tab1" variant="ghost">Ghost</TabsTrigger>
    <TabsTrigger value="tab2" variant="ghost">Style</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1" variant="ghost">Ghost content</TabsContent>
  <TabsContent value="tab2" variant="ghost">Content 2</TabsContent>
</Tabs>
```

### Different Sizes

```tsx
{/* Small size */}
<Tabs defaultValue="tab1">
  <TabsList size="sm">
    <TabsTrigger value="tab1" size="sm">Small</TabsTrigger>
    <TabsTrigger value="tab2" size="sm">Tabs</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1" size="sm">Small content</TabsContent>
  <TabsContent value="tab2" size="sm">Content 2</TabsContent>
</Tabs>

{/* Large size */}
<Tabs defaultValue="tab1">
  <TabsList size="lg">
    <TabsTrigger value="tab1" size="lg">Large</TabsTrigger>
    <TabsTrigger value="tab2" size="lg">Tabs</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1" size="lg">Large content</TabsContent>
  <TabsContent value="tab2" size="lg">Content 2</TabsContent>
</Tabs>
```

### Vertical Tabs

```tsx
<Tabs defaultValue="general" orientation="vertical" className="flex">
  <TabsList variant="ghost" className="flex-col h-auto">
    <TabsTrigger value="general" variant="ghost">General</TabsTrigger>
    <TabsTrigger value="security" variant="ghost">Security</TabsTrigger>
    <TabsTrigger value="notifications" variant="ghost">Notifications</TabsTrigger>
    <TabsTrigger value="billing" variant="ghost">Billing</TabsTrigger>
  </TabsList>
  <div className="flex-1 ml-6">
    <TabsContent value="general">
      <h3 className="text-lg font-medium">General Settings</h3>
      <p>Configure your general preferences.</p>
    </TabsContent>
    <TabsContent value="security">
      <h3 className="text-lg font-medium">Security Settings</h3>
      <p>Manage your security preferences.</p>
    </TabsContent>
    <TabsContent value="notifications">
      <h3 className="text-lg font-medium">Notification Settings</h3>
      <p>Control your notification preferences.</p>
    </TabsContent>
    <TabsContent value="billing">
      <h3 className="text-lg font-medium">Billing Settings</h3>
      <p>Manage your billing information.</p>
    </TabsContent>
  </div>
</Tabs>
```

### With Disabled Tabs

```tsx
<Tabs defaultValue="active">
  <TabsList>
    <TabsTrigger value="active">Active Tab</TabsTrigger>
    <TabsTrigger value="disabled" disabled>Disabled Tab</TabsTrigger>
    <TabsTrigger value="another">Another Tab</TabsTrigger>
  </TabsList>
  <TabsContent value="active">
    This tab is active and accessible.
  </TabsContent>
  <TabsContent value="disabled">
    This content won't be accessible due to disabled trigger.
  </TabsContent>
  <TabsContent value="another">
    Another accessible tab.
  </TabsContent>
</Tabs>
```

### Dynamic Tabs

```tsx
const [tabs, setTabs] = useState([
  { id: 'tab1', label: 'Tab 1', content: 'Content 1' },
  { id: 'tab2', label: 'Tab 2', content: 'Content 2' }
])
const [activeTab, setActiveTab] = useState('tab1')

const addTab = () => {
  const newId = `tab${tabs.length + 1}`
  setTabs(prev => [...prev, {
    id: newId,
    label: `Tab ${tabs.length + 1}`,
    content: `Content ${tabs.length + 1}`
  }])
  setActiveTab(newId)
}

const removeTab = (tabId) => {
  setTabs(prev => prev.filter(tab => tab.id !== tabId))
  if (activeTab === tabId) {
    setActiveTab(tabs[0]?.id || '')
  }
}

<div>
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <div className="flex items-center justify-between">
      <TabsList>
        {tabs.map(tab => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeTab(tab.id)
              }}
              className="ml-2 hover:bg-destructive/20 rounded-full p-1"
            >
              ×
            </button>
          </TabsTrigger>
        ))}
      </TabsList>
      <Button onClick={addTab} size="sm">Add Tab</Button>
    </div>
    
    {tabs.map(tab => (
      <TabsContent key={tab.id} value={tab.id}>
        <div className="p-4 border rounded">
          {tab.content}
        </div>
      </TabsContent>
    ))}
  </Tabs>
</div>
```

### Complex Form Tabs

```tsx
const [formData, setFormData] = useState({
  personal: { name: '', email: '' },
  business: { company: '', role: '' },
  preferences: { theme: 'light', notifications: true }
})

const [currentTab, setCurrentTab] = useState('personal')
const [completedTabs, setCompletedTabs] = useState(new Set())

const validateTab = (tabName) => {
  // Validation logic for each tab
  switch (tabName) {
    case 'personal':
      return formData.personal.name && formData.personal.email
    case 'business':
      return formData.business.company && formData.business.role
    default:
      return true
  }
}

const handleTabChange = (newTab) => {
  if (validateTab(currentTab)) {
    setCompletedTabs(prev => new Set([...prev, currentTab]))
  }
  setCurrentTab(newTab)
}

<Tabs value={currentTab} onValueChange={handleTabChange}>
  <TabsList variant="line">
    <TabsTrigger value="personal" variant="line">
      Personal Info
      {completedTabs.has('personal') && (
        <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
      )}
    </TabsTrigger>
    <TabsTrigger value="business" variant="line">
      Business Info
      {completedTabs.has('business') && (
        <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
      )}
    </TabsTrigger>
    <TabsTrigger value="preferences" variant="line">
      Preferences
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="personal" variant="line">
    <div className="space-y-4">
      <Input
        label="Name"
        value={formData.personal.name}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          personal: { ...prev.personal, name: e.target.value }
        }))}
      />
      <Input
        label="Email"
        type="email"
        value={formData.personal.email}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          personal: { ...prev.personal, email: e.target.value }
        }))}
      />
    </div>
  </TabsContent>
  
  <TabsContent value="business" variant="line">
    <div className="space-y-4">
      <Input
        label="Company"
        value={formData.business.company}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          business: { ...prev.business, company: e.target.value }
        }))}
      />
      <Input
        label="Role"
        value={formData.business.role}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          business: { ...prev.business, role: e.target.value }
        }))}
      />
    </div>
  </TabsContent>
  
  <TabsContent value="preferences" variant="line">
    <div className="space-y-4">
      <Select
        value={formData.preferences.theme}
        onValueChange={(value) => setFormData(prev => ({
          ...prev,
          preferences: { ...prev.preferences, theme: value }
        }))}
      >
        <SelectTrigger label="Theme">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="notifications"
          checked={formData.preferences.notifications}
          onCheckedChange={(checked) => setFormData(prev => ({
            ...prev,
            preferences: { ...prev.preferences, notifications: checked }
          }))}
        />
        <Label htmlFor="notifications">Enable notifications</Label>
      </div>
    </div>
  </TabsContent>
</Tabs>
```

## Accessibility

### Features

- **ARIA Support**: Full ARIA tablist implementation via Radix UI
- **Keyboard Navigation**: Arrow keys navigate, Space/Enter activates
- **Focus Management**: Proper focus cycling and restoration
- **Screen Reader**: Announces tab changes and content
- **Role Attributes**: Proper tablist/tab/tabpanel roles

### Best Practices

```tsx
// Provide meaningful tab labels
<TabsList>
  <TabsTrigger value="dashboard">Dashboard Overview</TabsTrigger>
  <TabsTrigger value="users">User Management</TabsTrigger>
  <TabsTrigger value="settings">System Settings</TabsTrigger>
</TabsList>

// Use proper content structure
<TabsContent value="dashboard">
  <h2>Dashboard Overview</h2>
  <p>Welcome to your dashboard...</p>
</TabsContent>

// Handle disabled states appropriately
<TabsTrigger value="premium" disabled>
  Premium Features (Upgrade Required)
</TabsTrigger>

// Provide loading states for dynamic content
<TabsContent value="reports">
  {isLoading ? (
    <div>Loading reports...</div>
  ) : (
    <ReportsContent />
  )}
</TabsContent>
```

## Styling

### CSS Variables

The component uses the following CSS custom properties:

- `--muted`: Background color for tab list
- `--background`: Active tab background
- `--foreground`: Text colors
- `--primary`: Active tab indicator color (line variant)
- `--ring`: Focus ring color

### Customization

```tsx
// Custom tab styling
<TabsList className="bg-blue-100 dark:bg-blue-900">
  <TabsTrigger 
    value="custom"
    className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
  >
    Custom Tab
  </TabsTrigger>
</TabsList>

// Custom content styling
<TabsContent 
  value="styled"
  className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg"
>
  Styled content
</TabsContent>

// Custom animations
<TabsContent 
  value="animated"
  className="data-[state=active]:animate-fade-in"
>
  Animated content
</TabsContent>
```

## Performance

### Optimization Tips

1. **Lazy Content**: Only render active tab content
2. **Memoization**: Memoize expensive tab content
3. **Virtual Tabs**: For many tabs, consider virtualization

```tsx
// Lazy tab content
const TabContent = ({ value, isActive }) => {
  if (!isActive) return null
  return <ExpensiveComponent />
}

<TabsContent value="expensive">
  <TabContent value="expensive" isActive={activeTab === "expensive"} />
</TabsContent>

// Memoized content
const MemoizedTabContent = React.memo(({ data }) => (
  <div>{/* expensive rendering */}</div>
))

// Virtualized tabs for large datasets
const VirtualizedTabs = ({ items }) => {
  const [visibleRange, setVisibleRange] = useState([0, 10])
  
  return (
    <Tabs>
      <TabsList>
        {items.slice(...visibleRange).map(item => (
          <TabsTrigger key={item.id} value={item.id}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {/* content */}
    </Tabs>
  )
}
```

## Migration Guide

### From Custom Tab Implementation

```tsx
// Before: Custom tabs
const [activeTab, setActiveTab] = useState('tab1')

<div>
  <div className="tab-buttons">
    <button 
      className={activeTab === 'tab1' ? 'active' : ''}
      onClick={() => setActiveTab('tab1')}
    >
      Tab 1
    </button>
    <button 
      className={activeTab === 'tab2' ? 'active' : ''}
      onClick={() => setActiveTab('tab2')}
    >
      Tab 2
    </button>
  </div>
  <div className="tab-content">
    {activeTab === 'tab1' && <div>Content 1</div>}
    {activeTab === 'tab2' && <div>Content 2</div>}
  </div>
</div>

// After: UI Tabs
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

## Related Components

- **NavigationMenu**: For site navigation
- **Accordion**: For expandable content sections
- **Card**: For tab content containers
- **Separator**: For tab section dividers

## Testing

### Test Scenarios

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Basic functionality
test('switches tabs on click', async () => {
  render(
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content 1</TabsContent>
      <TabsContent value="tab2">Content 2</TabsContent>
    </Tabs>
  )
  
  expect(screen.getByText('Content 1')).toBeVisible()
  expect(screen.queryByText('Content 2')).not.toBeVisible()
  
  fireEvent.click(screen.getByText('Tab 2'))
  
  expect(screen.queryByText('Content 1')).not.toBeVisible()
  expect(screen.getByText('Content 2')).toBeVisible()
})

// Keyboard navigation
test('supports keyboard navigation', () => {
  render(
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content 1</TabsContent>
      <TabsContent value="tab2">Content 2</TabsContent>
    </Tabs>
  )
  
  const tab1 = screen.getByText('Tab 1')
  tab1.focus()
  
  fireEvent.keyDown(tab1, { key: 'ArrowRight' })
  
  expect(screen.getByText('Tab 2')).toHaveFocus()
})

// Accessibility
test('has proper ARIA attributes', () => {
  render(
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content 1</TabsContent>
    </Tabs>
  )
  
  const tablist = screen.getByRole('tablist')
  const tab = screen.getByRole('tab')
  const tabpanel = screen.getByRole('tabpanel')
  
  expect(tablist).toBeInTheDocument()
  expect(tab).toHaveAttribute('aria-selected', 'true')
  expect(tabpanel).toHaveAttribute('aria-labelledby', tab.id)
})
```
