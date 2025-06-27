# Usage Guidelines

## Overview

This document provides comprehensive guidelines for using the DomainFlow Design System components effectively. It covers component selection, composition patterns, accessibility standards, performance best practices, and common anti-patterns to avoid.

## Component Selection Guide

### When to Use Each Component Type

#### Atomic Components
Use atomic components for basic UI elements that serve single purposes:

```tsx
// ✅ Good: Use Button for actions
<Button onClick={handleSave}>Save Changes</Button>

// ✅ Good: Use Input for data entry
<Input type="email" placeholder="Enter email" />

// ✅ Good: Use Badge for status indicators
<Badge variant="success">Active</Badge>
```

#### Molecular Components
Use molecular components for grouped functionality:

```tsx
// ✅ Good: Use Card for content grouping
<Card>
  <CardHeader>
    <CardTitle>User Profile</CardTitle>
  </CardHeader>
  <CardContent>
    <Input label="Name" />
    <Input label="Email" />
  </CardContent>
</Card>

// ✅ Good: Use Table for structured data
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  {/* ... */}
</Table>
```

#### Organism Components
Use organism components for complex features:

```tsx
// ✅ Good: Use Form for data collection
<Form {...form}>
  <FormRoot variant="card">
    <FormSection title="Personal Information">
      {/* Multiple form fields */}
    </FormSection>
  </FormRoot>
</Form>
```

## Composition Patterns

### Proper Component Composition

#### Hierarchical Structure
Maintain proper component hierarchy:

```tsx
// ✅ Good: Proper nesting
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    <Form>
      <FormField>
        <FormLabel>Label</FormLabel>
        <FormControl>
          <Input />
        </FormControl>
        <FormMessage />
      </FormField>
    </Form>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// ❌ Bad: Improper nesting
<Card>
  <Input />  {/* Missing proper form structure */}
  <Button />  {/* Should be in CardFooter */}
</Card>
```

#### Component Variants
Use appropriate variants for context:

```tsx
// ✅ Good: Context-appropriate variants
<Button variant="destructive">Delete User</Button>
<Alert variant="warning">Important notice</Alert>
<Badge variant="success">Completed</Badge>

// ❌ Bad: Mismatched variants
<Button variant="success">Delete User</Button>  {/* Confusing */}
<Alert variant="success">Critical error</Alert>  {/* Misleading */}
```

### Layout Composition

#### Grid and Flex Patterns
Use proper layout patterns:

```tsx
// ✅ Good: Dashboard layout
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>
    <CardHeader>
      <CardTitle>Stats</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">1,234</div>
    </CardContent>
  </Card>
  {/* More cards */}
</div>

// ✅ Good: Form layout
<FormRoot variant="card">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField name="firstName">
      {/* Form field */}
    </FormField>
    <FormField name="lastName">
      {/* Form field */}
    </FormField>
  </div>
</FormRoot>
```

## Accessibility Guidelines

### Semantic Structure

Always use proper semantic structure:

```tsx
// ✅ Good: Semantic markup
<main>
  <section aria-labelledby="users-heading">
    <h1 id="users-heading">User Management</h1>
    <Table>
      <TableCaption>List of all users in the system</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Name</TableHead>
          <TableHead scope="col">Email</TableHead>
        </TableRow>
      </TableHeader>
      {/* ... */}
    </Table>
  </section>
</main>

// ❌ Bad: Non-semantic structure
<div>
  <div>User Management</div>
  <div>
    <div>Name</div>
    <div>Email</div>
  </div>
</div>
```

### Keyboard Navigation

Ensure proper keyboard navigation:

```tsx
// ✅ Good: Keyboard accessible
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit User</DialogTitle>
    </DialogHeader>
    <Form>
      <Input autoFocus />  {/* Focus management */}
      <Button type="submit">Save</Button>
      <Button type="button" onClick={onCancel}>Cancel</Button>
    </Form>
  </DialogContent>
</Dialog>

// ✅ Good: Custom keyboard handling
<Card 
  interactive
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
  tabIndex={0}
  role="button"
  aria-label="View details"
>
  {/* Card content */}
</Card>
```

### ARIA Labels and Descriptions

Provide proper ARIA attributes:

```tsx
// ✅ Good: ARIA attributes
<Button 
  aria-label="Delete user John Doe"
  onClick={() => handleDelete(user.id)}
>
  <Trash className="h-4 w-4" />
</Button>

<Input 
  aria-describedby="password-help"
  type="password"
/>
<div id="password-help">
  Password must be at least 8 characters long
</div>

<Table aria-label="User directory">
  <TableHeader>
    <TableRow>
      <TableHead 
        onClick={() => handleSort('name')}
        aria-sort={sortDirection}
      >
        Name
      </TableHead>
    </TableRow>
  </TableHeader>
</Table>
```

## Performance Best Practices

### Component Optimization

#### Memoization
Use memoization for expensive operations:

```tsx
// ✅ Good: Memoized components
const MemoizedCard = React.memo(Card)
const MemoizedTableRow = React.memo(TableRow)

// ✅ Good: Memoized calculations
const filteredData = useMemo(() => {
  return data.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
}, [data, searchTerm])

// ✅ Good: Stable callbacks
const handleDelete = useCallback((id: string) => {
  setItems(prev => prev.filter(item => item.id !== id))
}, [])
```

#### Lazy Loading
Implement lazy loading for large datasets:

```tsx
// ✅ Good: Virtual scrolling for large lists
import { FixedSizeList as List } from 'react-window'

function VirtualTable({ items }: { items: any[] }) {
  const Row = ({ index, style }: { index: number, style: any }) => (
    <div style={style}>
      <TableRow>
        <TableCell>{items[index].name}</TableCell>
      </TableRow>
    </div>
  )

  return (
    <List
      height={400}
      itemCount={items.length}
      itemSize={50}
    >
      {Row}
    </List>
  )
}

// ✅ Good: Pagination for API data
function PaginatedTable() {
  const [page, setPage] = useState(1)
  const { data, loading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => fetchUsers(page),
  })

  return (
    <>
      <Table>
        {/* Table content */}
      </Table>
      <Pagination 
        currentPage={page}
        totalPages={data?.totalPages}
        onPageChange={setPage}
      />
    </>
  )
}
```

### Bundle Optimization

#### Tree Shaking
Import only what you need:

```tsx
// ✅ Good: Specific imports
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

// ❌ Bad: Barrel imports (if not tree-shakeable)
import { Button, Card, CardHeader, CardContent } from '@/components/ui'
```

#### Code Splitting
Use dynamic imports for large components:

```tsx
// ✅ Good: Dynamic imports
const HeavyDialog = lazy(() => import('./HeavyDialog'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {showDialog && <HeavyDialog />}
    </Suspense>
  )
}
```

## State Management Guidelines

### Form State

Use React Hook Form with proper validation:

```tsx
// ✅ Good: Structured form validation
const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

function UserForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onChange', // Real-time validation
  })

  return (
    <Form {...form}>
      <FormRoot onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </FormRoot>
    </Form>
  )
}
```

### Component State

Use appropriate state management:

```tsx
// ✅ Good: Local state for UI
function DataTable() {
  const [sortColumn, setSortColumn] = useState<string>()
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

  // Component logic
}

// ✅ Good: Global state for shared data
function UserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  return (
    <UserContext.Provider value={{ users, setUsers, loading }}>
      {children}
    </UserContext.Provider>
  )
}
```

## Error Handling Patterns

### Form Errors

Handle form errors gracefully:

```tsx
// ✅ Good: Comprehensive error handling
function UserForm() {
  const [submitError, setSubmitError] = useState<string>()
  
  const onSubmit = async (data: UserFormData) => {
    try {
      setSubmitError(undefined)
      await createUser(data)
      toast({ title: "User created successfully" })
    } catch (error) {
      if (error instanceof ValidationError) {
        // Handle field-specific errors
        error.fields.forEach(({ field, message }) => {
          form.setError(field, { message })
        })
      } else {
        // Handle general errors
        setSubmitError(error.message)
      }
    }
  }

  return (
    <Form {...form}>
      {submitError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}
      
      <FormRoot onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </FormRoot>
    </Form>
  )
}
```

### Loading States

Provide clear loading feedback:

```tsx
// ✅ Good: Loading states
function UserList() {
  const { data: users, loading, error } = useUsers()

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <TableLoading headers={['Name', 'Email', 'Role']} rows={5} />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading users</AlertTitle>
        <AlertDescription>
          {error.message}
          <Button 
            variant="outline" 
            className="mt-2"
            onClick={() => refetch()}
          >
            Try Again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return <Table>{/* Table content */}</Table>
}
```

## Anti-Patterns to Avoid

### Component Misuse

```tsx
// ❌ Bad: Using wrong component types
<Button variant="link" onClick={handleNavigation}>
  Navigate to Page  {/* Use Link component instead */}
</Button>

<div onClick={handleClick}>  {/* Use Button component */}
  Clickable area
</div>

// ❌ Bad: Ignoring component contracts
<Table>
  <div>Not a proper table structure</div>
</Table>

// ❌ Bad: Overriding component behavior
<Input 
  className="custom-styles"  {/* Breaks design system */}
  style={{ border: '2px solid red' }}  {/* Use variant instead */}
/>
```

### Accessibility Issues

```tsx
// ❌ Bad: Missing accessibility
<div onClick={handleClick}>Clickable</div>  {/* Not keyboard accessible */}

<img src="chart.png" />  {/* Missing alt text */}

<Button>
  <span>Save</span>  {/* Redundant nesting */}
</Button>

// ❌ Bad: Poor ARIA usage
<div role="button">  {/* Use Button component */}
  Click me
</div>

<input aria-label="Search" placeholder="Search" />  {/* Redundant labels */}
```

### Performance Issues

```tsx
// ❌ Bad: Unnecessary re-renders
function BadComponent({ items }: { items: Item[] }) {
  return (
    <div>
      {items.map((item, index) => (
        <Card 
          key={index}  {/* Use stable ID */}
          onClick={() => handleClick(item)}  {/* Creates new function each render */}
        >
          {item.name}
        </Card>
      ))}
    </div>
  )
}

// ❌ Bad: Inline styles and objects
function BadStyling() {
  return (
    <Card 
      style={{ margin: '10px' }}  {/* Use CSS classes */}
      className={`card ${isActive ? 'active' : ''}`}  {/* Use cn() utility */}
    >
      Content
    </Card>
  )
}
```

## Testing Guidelines

### Component Testing

Test components properly:

```tsx
// ✅ Good: Component testing
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('form submits with valid data', async () => {
  const user = userEvent.setup()
  const onSubmit = jest.fn()
  
  render(<UserForm onSubmit={onSubmit} />)
  
  await user.type(screen.getByLabelText('Email'), 'test@example.com')
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(onSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123',
  })
})

test('shows validation errors', async () => {
  const user = userEvent.setup()
  
  render(<UserForm />)
  
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(screen.getByText('Email is required')).toBeInTheDocument()
})
```

### Integration Testing

Test component interactions:

```tsx
// ✅ Good: Integration testing
test('CRUD workflow', async () => {
  const user = userEvent.setup()
  
  render(<UserCRUD />)
  
  // Create user
  await user.click(screen.getByText('Add User'))
  await user.type(screen.getByLabelText('Name'), 'John Doe')
  await user.click(screen.getByText('Save'))
  
  expect(screen.getByText('John Doe')).toBeInTheDocument()
  
  // Edit user
  await user.click(screen.getByLabelText('Edit John Doe'))
  await user.clear(screen.getByLabelText('Name'))
  await user.type(screen.getByLabelText('Name'), 'Jane Doe')
  await user.click(screen.getByText('Save'))
  
  expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
})
```

## Migration Strategies

When migrating from other design systems:

1. **Audit Existing Components**: Identify which components need replacement
2. **Create Mapping**: Map old components to new ones
3. **Gradual Migration**: Replace components incrementally
4. **Update Patterns**: Adopt new composition patterns
5. **Test Thoroughly**: Ensure functionality remains intact

## Summary

Following these usage guidelines ensures:

- **Consistency**: Components are used as intended
- **Accessibility**: Applications work for all users
- **Performance**: Optimal rendering and user experience
- **Maintainability**: Code is clean and predictable
- **Quality**: Robust and tested applications

For specific component usage, refer to individual component documentation in the catalog.
