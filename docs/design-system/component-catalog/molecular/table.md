# Table Component

## Overview

The `Table` component provides a comprehensive solution for displaying tabular data with extensive customization options. It includes basic table components for full control, a `SimpleTable` for quick implementation, and built-in features like sorting, loading states, and accessibility support.

## Import

```typescript
import { 
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  SimpleTable,
  TableLoading
} from '@/components/ui/table'
```

## Basic Usage

```tsx
// Manual table construction
<Table>
  <TableCaption>A list of your recent invoices.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Invoice</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Method</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-medium">INV001</TableCell>
      <TableCell>Paid</TableCell>
      <TableCell>Credit Card</TableCell>
      <TableCell className="text-right">$250.00</TableCell>
    </TableRow>
  </TableBody>
</Table>

// Quick implementation with SimpleTable
<SimpleTable
  headers={['Name', 'Email', 'Role', 'Status']}
  data={[
    { Name: 'John Doe', Email: 'john@example.com', Role: 'Admin', Status: 'Active' },
    { Name: 'Jane Smith', Email: 'jane@example.com', Role: 'User', Status: 'Inactive' }
  ]}
  sortable
  onRowClick={(row) => console.log('Clicked:', row)}
/>
```

## API Reference

### Table Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'striped' \| 'bordered' \| 'minimal' \| 'card' \| 'compact'` | `'default'` | Visual style variant |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Size of the table |
| `containerClassName` | `string` | `undefined` | CSS classes for the scroll container |
| `className` | `string` | `undefined` | Additional CSS classes |

### SimpleTable Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `headers` | `string[]` | `[]` | Column headers |
| `data` | `Record<string, any>[]` | `[]` | Table data |
| `caption` | `string` | `undefined` | Table caption |
| `onRowClick` | `(row: Record<string, any>, index: number) => void` | `undefined` | Row click handler |
| `sortable` | `boolean` | `false` | Enable column sorting |
| `loading` | `boolean` | `false` | Show loading state |
| `emptyMessage` | `string` | `'No data available'` | Empty state message |

### Subcomponents

#### TableHeader
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'elevated' \| 'accent' \| 'minimal' \| 'dark' \| 'gradient'` | `'default'` | Header style variant |

#### TableRow
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'interactive' \| 'static' \| 'accent' \| 'subtle'` | `'default'` | Row interaction style |
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Row height |

#### TableHead
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Header cell size |
| `sortable` | `boolean` | `false` | Enable sorting interaction |

#### TableCell
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'default' \| 'lg'` | `'default'` | Cell size |
| `textAlign` | `'left' \| 'center' \| 'right'` | `'left'` | Text alignment |

## Variants

### Default
```tsx
<Table variant="default">
  {/* Standard table with subtle borders */}
</Table>
```

### Striped
```tsx
<Table variant="striped">
  {/* Alternating row backgrounds for better readability */}
</Table>
```

### Bordered
```tsx
<Table variant="bordered">
  {/* Full borders around table and cells */}
</Table>
```

### Minimal
```tsx
<Table variant="minimal">
  {/* Clean table without borders */}
</Table>
```

### Card
```tsx
<Table variant="card">
  {/* Table with card-like appearance and rounded corners */}
</Table>
```

### Compact
```tsx
<Table variant="compact">
  {/* Smaller text and reduced spacing */}
</Table>
```

## Header Variants

### Elevated
```tsx
<TableHeader variant="elevated">
  {/* Subtle background for header distinction */}
</TableHeader>
```

### Accent
```tsx
<TableHeader variant="accent">
  {/* Accent-colored header background */}
</TableHeader>
```

### Dark
```tsx
<TableHeader variant="dark">
  {/* Dark header with light text */}
</TableHeader>
```

### Gradient
```tsx
<TableHeader variant="gradient">
  {/* Gradient background header */}
</TableHeader>
```

## Sizes

### Small
```tsx
<Table size="sm">
  <TableHeader>
    <TableRow>
      <TableHead size="sm">Header</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow size="sm">
      <TableCell size="sm">Content</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Large
```tsx
<Table size="lg">
  <TableHeader>
    <TableRow>
      <TableHead size="lg">Header</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow size="lg">
      <TableCell size="lg">Content</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Common Use Cases

### Data Display with Actions

```tsx
function UserTable({ users }: { users: User[] }) {
  return (
    <Table variant="striped">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                {user.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Sortable Table

```tsx
function SortableTable({ data }: { data: any[] }) {
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  const sortedData = useMemo(() => {
    if (!sortConfig) return data
    
    return [...data].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [data, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead 
            sortable 
            onClick={() => handleSort('name')}
            className="cursor-pointer hover:text-foreground"
          >
            Name {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead 
            sortable 
            onClick={() => handleSort('email')}
            className="cursor-pointer hover:text-foreground"
          >
            Email {sortConfig?.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((item, index) => (
          <TableRow key={index}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.email}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Selectable Rows

```tsx
function SelectableTable({ data }: { data: any[] }) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    const newSelection = new Set(selectedRows)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedRows(newSelection)
  }

  const toggleAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(data.map(item => item.id)))
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={selectedRows.size === data.length}
              indeterminate={selectedRows.size > 0 && selectedRows.size < data.length}
              onChange={toggleAll}
            />
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow 
            key={item.id}
            data-state={selectedRows.has(item.id) ? "selected" : undefined}
          >
            <TableCell>
              <Checkbox
                checked={selectedRows.has(item.id)}
                onChange={() => toggleRow(item.id)}
              />
            </TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.email}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Loading State

```tsx
function LoadingTable() {
  return (
    <TableLoading 
      headers={['Name', 'Email', 'Role', 'Status']}
      rows={5}
      variant="striped"
    />
  )
}

// Or with conditional rendering
function DataTable({ data, loading }: { data: any[], loading: boolean }) {
  if (loading) {
    return <TableLoading headers={['Name', 'Email', 'Role']} />
  }

  return (
    <SimpleTable
      headers={['Name', 'Email', 'Role']}
      data={data}
      emptyMessage="No users found"
    />
  )
}
```

## Advanced Patterns

### Responsive Table

```tsx
function ResponsiveTable({ data }: { data: any[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Role</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                <div>
                  {item.name}
                  <div className="md:hidden text-sm text-muted-foreground">
                    {item.email}
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{item.email}</TableCell>
              <TableCell className="hidden lg:table-cell">{item.role}</TableCell>
              <TableCell>
                <Badge variant={item.status === 'active' ? 'success' : 'secondary'}>
                  {item.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Expandable Rows

```tsx
function ExpandableTable({ data }: { data: any[] }) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <React.Fragment key={item.id}>
            <TableRow>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleRow(item.id)}
                >
                  {expandedRows.has(item.id) ? <ChevronDown /> : <ChevronRight />}
                </Button>
              </TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.email}</TableCell>
            </TableRow>
            {expandedRows.has(item.id) && (
              <TableRow>
                <TableCell colSpan={3} className="p-0">
                  <div className="p-4 bg-muted/30">
                    <h4 className="font-medium mb-2">Additional Details</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  )
}
```

## Accessibility

### Features
- **Semantic Structure**: Proper table markup with headers and captions
- **Keyboard Navigation**: Full keyboard support for interactive elements
- **ARIA Support**: Appropriate ARIA attributes for screen readers
- **Screen Reader Support**: Table headers are properly associated with data cells
- **Focus Management**: Clear focus indicators for sortable headers

### Best Practices

```tsx
// Always provide table captions for context
<Table>
  <TableCaption>
    Employee directory showing name, role, and contact information
  </TableCaption>
  {/* ... */}
</Table>

// Use semantic headers
<TableHeader>
  <TableRow>
    <TableHead scope="col">Name</TableHead>
    <TableHead scope="col">Email</TableHead>
    <TableHead scope="col">Actions</TableHead>
  </TableRow>
</TableHeader>

// Provide proper labels for interactive elements
<TableHead 
  sortable
  onClick={() => handleSort('name')}
  aria-label="Sort by name"
>
  Name
</TableHead>

// Use proper row selection ARIA
<TableRow 
  aria-selected={isSelected}
  data-state={isSelected ? "selected" : undefined}
>
  {/* ... */}
</TableRow>
```

## Performance

### Optimizations
- **Virtual Scrolling**: For large datasets, consider virtualization
- **Memoized Sorting**: Sorting logic is memoized to prevent unnecessary recalculations
- **Efficient Rendering**: Components use React.forwardRef and proper key props
- **Lazy Loading**: Load data progressively for better initial performance

### Best Practices

```tsx
// Memoize expensive operations
const MemoizedTable = React.memo(Table)

// Use stable keys for rows
{data.map((item) => (
  <TableRow key={item.id}> {/* Use stable ID, not index */}
    <TableCell>{item.name}</TableCell>
  </TableRow>
))}

// Debounce search/filter operations
const debouncedFilter = useDebouncedCallback((value: string) => {
  setFilter(value)
}, 300)
```

## Styling

### CSS Variables
The component uses CSS custom properties for theming:

```css
:root {
  --border: 214.3 31.8% 91.4%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --foreground: 222.2 84% 4.9%;
}
```

### Custom Styling

```tsx
// Custom table styling
<Table className="border-2 border-blue-500 rounded-lg overflow-hidden">
  {/* ... */}
</Table>

// Custom cell styling
<TableCell className="bg-gradient-to-r from-blue-50 to-indigo-50">
  Highlighted content
</TableCell>

// Custom container styling
<Table containerClassName="max-h-96 border rounded-lg">
  {/* Scrollable table with fixed height */}
</Table>
```

## Testing

### Test Examples

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimpleTable } from '@/components/ui/table'

test('renders table with data', () => {
  const data = [
    { Name: 'John', Email: 'john@example.com' }
  ]
  
  render(
    <SimpleTable 
      headers={['Name', 'Email']} 
      data={data} 
    />
  )
  
  expect(screen.getByText('John')).toBeInTheDocument()
  expect(screen.getByText('john@example.com')).toBeInTheDocument()
})

test('handles row clicks', async () => {
  const user = userEvent.setup()
  const handleRowClick = jest.fn()
  
  render(
    <SimpleTable 
      headers={['Name']} 
      data={[{ Name: 'John' }]}
      onRowClick={handleRowClick}
    />
  )
  
  await user.click(screen.getByText('John'))
  expect(handleRowClick).toHaveBeenCalledWith({ Name: 'John' }, 0)
})

test('shows empty state', () => {
  render(
    <SimpleTable 
      headers={['Name']} 
      data={[]}
      emptyMessage="No users found"
    />
  )
  
  expect(screen.getByText('No users found')).toBeInTheDocument()
})
```

## Migration Guide

### From Legacy Tables

```tsx
// Before (legacy table)
<table className="table table-striped">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John</td>
      <td>john@example.com</td>
    </tr>
  </tbody>
</table>

// After (new Table component)
<Table variant="striped">
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John</TableCell>
      <TableCell>john@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Breaking Changes
- Table structure requires specific subcomponents
- Styling is handled via variant props instead of CSS classes
- Interactive features are built-in with accessibility support

### Migration Checklist
- [ ] Replace `<table>` with `<Table>` component
- [ ] Wrap sections in appropriate components (`TableHeader`, `TableBody`, etc.)
- [ ] Replace CSS classes with variant props
- [ ] Update interactive functionality to use built-in props
- [ ] Add proper captions and accessibility attributes

## Related Components

- [Card](./card.md) - For table containers
- [Button](../atomic/button.md) - For table actions
- [Badge](../atomic/badge.md) - For status indicators
- [Checkbox](../atomic/checkbox.md) - For row selection
- [Pagination](./pagination.md) - For table pagination
