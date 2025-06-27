# Component Catalog

## Overview

Interactive catalog of all DomainFlow UI components with examples, props documentation, and usage guidelines.

## Component Categories

### 1. Atomic Components ✅ COMPLETE

#### Input Controls
- [Button](./atomic/button.md) - Primary interaction element with variants and loading states ✅
- [Input](./atomic/input.md) - Text input with validation and variants ✅
- [Label](./atomic/label.md) - Form labels with accessibility features ✅
- [Checkbox](./atomic/checkbox.md) - Boolean input with indeterminate state ✅
- [Select](./atomic/select.md) - Dropdown selection with search and grouping ✅
- [Textarea](./atomic/textarea.md) - Multi-line text input with character counting ✅
- [Radio Group](./atomic/radio-group.md) - Single selection from multiple options ✅
- [Switch](./atomic/switch.md) - Toggle control with smooth animations ✅
- [Slider](./atomic/slider.md) - Range input for numeric values ✅

#### Data Display
- [Badge](./atomic/badge.md) - Status indicators and labels ✅
- [Avatar](./atomic/avatar.md) - User profile pictures and placeholders ✅
- [Separator](./atomic/separator.md) - Visual content dividers ✅
- [Progress](./atomic/progress.md) - Progress indicators with animations ✅
- [Skeleton](./atomic/skeleton.md) - Loading state placeholders ✅

#### Feedback
- [Alert](./atomic/alert.md) - Important messages and notifications ✅

### 2. Molecular Components ✅ COMPLETE

#### Navigation
- [Breadcrumb](./molecular/breadcrumb.md) - Navigation hierarchy display ✅
- [Pagination](./molecular/pagination.md) - Content pagination controls ✅
- [Tabs](./molecular/tabs.md) - Tabbed interface with multiple variants ✅

#### Data
- [Table](./molecular/table.md) - Data display with sorting and selection ✅
- [Card](./molecular/card.md) - Content containers with headers and actions ✅

#### Layout
- [Accordion](./molecular/accordion.md) - Collapsible content sections ✅

#### Feedback
- [Toast](./molecular/toast.md) - Temporary notification system ✅

#### Overlays
- [Popover](./molecular/popover.md) - Contextual content overlays ✅
- [Dropdown Menu](./molecular/dropdown-menu.md) - Context menus and action lists ✅

### 3. Organism Components ✅ COMPLETE

#### Navigation
- [Sidebar](./organism/sidebar.md) - Complex navigation with collapsible sections ✅

#### Forms
- [Form](./organism/form.md) - Complete form system with validation ✅

#### Modals & Overlays
- [Dialog](./organism/dialog.md) - Modal dialogs with focus management ✅

#### Data Visualization
- [Chart](./organism/chart.md) - Data visualization with multiple chart types ✅

#### Notifications
- [Toaster](./organism/toaster.md) - Toast notification management system ✅

### 4. Integration Patterns ✅ COMPLETE

- [CRUD Workflows](./patterns/crud.md) - Table + Form + Dialog patterns ✅
- [Navigation Systems](./patterns/navigation.md) - Sidebar + Menubar coordination ✅
- [Data Visualization](./patterns/data-viz.md) - Chart + Table + Form integration ✅
- [Toast Management](./patterns/toast-queue.md) - Advanced toast queue patterns ✅

## Documentation Status

### Phase 4b Completion Summary

✅ **Atomic Components**: 15/15 documented (100%)
- All input controls, data display, and feedback components complete

✅ **Molecular Components**: 9/9 documented (100%) 
- Navigation, data, layout, feedback, and overlay components complete

✅ **Organism Components**: 5/5 documented (100%)
- Navigation, forms, modals, data visualization, and notifications complete

✅ **Integration Patterns**: 4/4 documented (100%)
- All core interaction patterns documented

**Total Documentation Coverage: 33/33 components (100%)**

## Usage Guidelines

### Component Selection
```typescript
// Choose the right component for your use case
import { Button } from '@domainflow/ui' // For primary actions
import { Alert } from '@domainflow/ui'  // For important messages
import { Toast } from '@domainflow/ui'  // For temporary feedback
```

### Composition Patterns
```typescript
// Combine components effectively
<Card>
  <CardHeader>
    <CardTitle>User Profile</CardTitle>
  </CardHeader>
  <CardContent>
    <Form>
      <Input label="Name" />
      <Button type="submit">Save</Button>
    </Form>
  </CardContent>
</Card>
```

### Accessibility First
```typescript
// Always include proper ARIA attributes
<Button 
  aria-label="Save changes"
  aria-describedby="save-help"
>
  Save
</Button>
<div id="save-help" className="sr-only">
  This will save your changes permanently
</div>
```

## Design Principles

1. **Consistency** - Uniform behavior across all components
2. **Accessibility** - WCAG 2.1 AA compliance throughout
3. **Performance** - Optimized for speed and bundle size
4. **Flexibility** - Composable and customizable
5. **Developer Experience** - Clear APIs and documentation

## Quick Reference

### Most Common Patterns

```typescript
// Form with validation
<Form onSubmit={handleSubmit}>
  <FormField>
    <Label>Email</Label>
    <Input type="email" required />
    <FormMessage />
  </FormField>
  <Button type="submit">Submit</Button>
</Form>

// Data table with actions
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>
          <Button variant="ghost" size="sm">Edit</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>

// Toast notifications
const { toast } = useToast()
toast({
  title: "Success",
  description: "Your changes have been saved.",
})
```

### Component Relationships

```
Atomic → Molecular → Organism → Patterns
  ↓         ↓         ↓         ↓
Button → Card → Form → CRUD Workflow
Input  → Table → Dialog → Data Dashboard
Alert  → Toast → Sidebar → Navigation System
```

## Getting Started

1. **Read the [Design System Overview](../README.md)**
2. **Review [Usage Guidelines](../usage-guidelines.md)**
3. **Check [Accessibility Guidelines](../accessibility.md)**
4. **Explore individual component documentation**
5. **Study integration patterns for complex UIs**

## Contributing

See our [contribution guidelines](../CONTRIBUTING.md) for information on:
- Adding new components
- Updating documentation
- Reporting issues
- Requesting features

---

**Last Updated**: June 27, 2025  
**Documentation Version**: 1.0  
**Component Library Version**: 2.0
