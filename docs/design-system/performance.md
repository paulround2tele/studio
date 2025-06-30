# Performance Best Practices

## Overview

The DomainFlow Design System is optimized for performance while maintaining rich functionality and accessibility. This guide covers optimization strategies and best practices for building fast, responsive applications.

## Core Performance Principles

### 1. Minimize Bundle Size
- Tree-shakeable component imports
- Optimized dependencies
- Code splitting for large components
- Efficient CSS-in-JS implementation

### 2. Optimize Rendering
- Minimized re-renders through proper memoization
- Efficient state management
- Virtual scrolling for large datasets
- Lazy loading for non-critical components

### 3. Enhance User Experience
- Fast initial load times
- Smooth animations and transitions
- Responsive interactions
- Progressive loading strategies

## Bundle Optimization

### Tree Shaking

Import only the components you need:

```tsx
// ✅ Good: Specific imports (tree-shakeable)
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

// ❌ Avoid: Barrel imports (if not properly configured)
import * as UI from '@/components/ui'

// ✅ Good: Multiple specific imports
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell 
} from '@/components/ui/table'
```

### Code Splitting

Split large components and features:

```tsx
// ✅ Good: Lazy loading for heavy components
import { lazy, Suspense } from 'react'

const DataVisualization = lazy(() => import('./DataVisualization'))
const AdvancedSettings = lazy(() => import('./AdvancedSettings'))

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      
      <Suspense fallback={<div>Loading charts...</div>}>
        <DataVisualization />
      </Suspense>
      
      {showAdvanced && (
        <Suspense fallback={<div>Loading settings...</div>}>
          <AdvancedSettings />
        </Suspense>
      )}
    </div>
  )
}

// ✅ Good: Route-based code splitting
const UserManagement = lazy(() => import('@/pages/UserManagement'))
const Reports = lazy(() => import('@/pages/Reports'))

function App() {
  return (
    <Router>
      <Routes>
        <Route 
          path="/users" 
          element={
            <Suspense fallback={<PageSkeleton />}>
              <UserManagement />
            </Suspense>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <Suspense fallback={<PageSkeleton />}>
              <Reports />
            </Suspense>
          } 
        />
      </Routes>
    </Router>
  )
}
```

### Dynamic Imports

Load features on demand:

```tsx
// ✅ Good: Dynamic imports for conditional features
async function handleExport() {
  const { exportToCSV } = await import('@/utils/export')
  exportToCSV(data)
}

async function handleAdvancedEdit() {
  const { AdvancedEditor } = await import('./AdvancedEditor')
  setEditor(<AdvancedEditor />)
}

// ✅ Good: Conditional library loading
async function handleChartGeneration() {
  if (needsAdvancedCharts) {
    const { Chart } = await import('react-chartjs-2')
    return <Chart data={chartData} />
  }
  return <SimpleChart data={chartData} />
}
```

## Rendering Optimization

### Memoization Strategies

Use React.memo for expensive components:

```tsx
// ✅ Good: Memoized components
const ExpensiveTableRow = React.memo(({ user, onEdit, onDelete }: {
  user: User
  onEdit: (user: User) => void
  onDelete: (id: string) => void
}) => {
  return (
    <TableRow>
      <TableCell>{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>
        <Button onClick={() => onEdit(user)}>Edit</Button>
        <Button onClick={() => onDelete(user.id)}>Delete</Button>
      </TableCell>
    </TableRow>
  )
})

// ✅ Good: Memoized expensive calculations
function UserList({ users, searchTerm }: { users: User[], searchTerm: string }) {
  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [users, searchTerm])

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => a.name.localeCompare(b.name))
  }, [filteredUsers])

  return (
    <Table>
      <TableBody>
        {sortedUsers.map(user => (
          <ExpensiveTableRow key={user.id} user={user} />
        ))}
      </TableBody>
    </Table>
  )
}
```

### Callback Optimization

Stabilize callback references:

```tsx
// ✅ Good: Stable callbacks with useCallback
function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())

  const handleUserEdit = useCallback((user: User) => {
    // Edit logic that doesn't change
    setUsers(prev => prev.map(u => u.id === user.id ? user : u))
  }, [])

  const handleUserDelete = useCallback((userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId))
    setSelectedUsers(prev => {
      const next = new Set(prev)
      next.delete(userId)
      return next
    })
  }, [])

  const handleUserSelect = useCallback((userId: string, selected: boolean) => {
    setSelectedUsers(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(userId)
      } else {
        next.delete(userId)
      }
      return next
    })
  }, [])

  return (
    <Table>
      <TableBody>
        {users.map(user => (
          <UserTableRow
            key={user.id}
            user={user}
            selected={selectedUsers.has(user.id)}
            onEdit={handleUserEdit}
            onDelete={handleUserDelete}
            onSelect={handleUserSelect}
          />
        ))}
      </TableBody>
    </Table>
  )
}
```

## Large Dataset Handling

### Virtual Scrolling

For large lists and tables:

```tsx
import { FixedSizeList as List } from 'react-window'

// ✅ Good: Virtual scrolling for large datasets
function VirtualizedUserList({ users }: { users: User[] }) {
  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => (
    <div style={style}>
      <Card className="m-2">
        <CardContent className="p-4">
          <h3>{users[index].name}</h3>
          <p>{users[index].email}</p>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <List
      height={600}
      itemCount={users.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  )
}

// ✅ Good: Virtual table with react-window
import { VariableSizeGrid as Grid } from 'react-window'

function VirtualizedTable({ data, columns }: { 
  data: any[][], 
  columns: { width: number, header: string }[] 
}) {
  const Cell = ({ columnIndex, rowIndex, style }: {
    columnIndex: number
    rowIndex: number
    style: React.CSSProperties
  }) => (
    <div style={style} className="border-b border-r p-2">
      {data[rowIndex]?.[columnIndex] || ''}
    </div>
  )

  return (
    <Grid
      columnCount={columns.length}
      columnWidth={(index) => columns[index].width}
      height={400}
      rowCount={data.length}
      rowHeight={() => 50}
      width="100%"
    >
      {Cell}
    </Grid>
  )
}
```

### Pagination

Efficient data pagination:

```tsx
// ✅ Good: Server-side pagination
function PaginatedUserTable() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  
  const { data, loading, error } = useQuery({
    queryKey: ['users', page, pageSize],
    queryFn: () => fetchUsers({ page, pageSize }),
    keepPreviousData: true, // Smooth transitions
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show</span>
          <Select 
            value={pageSize.toString()} 
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">entries</span>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data?.total || 0)} of {data?.total || 0} entries
        </div>
      </div>

      {loading && <TableLoading headers={['Name', 'Email', 'Role']} />}
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error loading users</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination
        currentPage={page}
        totalPages={Math.ceil((data?.total || 0) / pageSize)}
        onPageChange={setPage}
      />
    </div>
  )
}
```

### Infinite Scrolling

For continuous data loading:

```tsx
import { useInfiniteQuery } from '@tanstack/react-query'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'

// ✅ Good: Infinite scrolling with intersection observer
function InfiniteUserList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['users'],
    queryFn: ({ pageParam = 0 }) => fetchUsers(pageParam),
    getNextPageParam: (lastPage, pages) => 
      lastPage.hasMore ? pages.length : undefined,
  })

  const { ref, inView } = useIntersectionObserver({
    threshold: 0,
  })

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage])

  if (status === 'loading') return <div>Loading...</div>
  if (status === 'error') return <div>Error loading users</div>

  return (
    <div className="space-y-4">
      {data.pages.map((group, i) => (
        <div key={i} className="space-y-4">
          {group.users.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-4">
                <h3>{user.name}</h3>
                <p>{user.email}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
      
      <div ref={ref}>
        {isFetchingNextPage && (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  )
}
```

## Search and Filtering Optimization

### Debounced Search

Optimize search performance:

```tsx
import { useDebouncedCallback } from 'use-debounce'

// ✅ Good: Debounced search to reduce API calls
function SearchableUserList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      setDebouncedSearchTerm(value)
    },
    300
  )

  useEffect(() => {
    debouncedSearch(searchTerm)
  }, [searchTerm, debouncedSearch])

  const { data: users, loading } = useQuery({
    queryKey: ['users', debouncedSearchTerm],
    queryFn: () => searchUsers(debouncedSearchTerm),
    enabled: debouncedSearchTerm.length >= 2, // Only search after 2+ characters
  })

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      {loading && <div>Searching...</div>}
      
      {users && (
        <div className="text-sm text-muted-foreground">
          Found {users.length} users
        </div>
      )}
      
      <UserList users={users || []} />
    </div>
  )
}
```

### Client-Side Filtering

Optimize client-side operations:

```tsx
// ✅ Good: Optimized client-side filtering
function FilterableUserList({ users }: { users: User[] }) {
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
  })

  const filteredUsers = useMemo(() => {
    let filtered = users

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      )
    }

    // Role filter
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role)
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(user => user.status === filters.status)
    }

    return filtered
  }, [users, filters])

  const updateFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search users..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
          
          <Select 
            value={filters.role} 
            onValueChange={(value) => updateFilter('role', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          
          <Select 
            value={filters.status} 
            onValueChange={(value) => updateFilter('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </p>
        
        {Object.values(filters).some(Boolean) && (
          <Button 
            variant="outline" 
            onClick={() => setFilters({ search: '', role: '', status: '' })}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <UserTable users={filteredUsers} />
    </div>
  )
}
```

## Animation and Interaction Optimization

### Efficient Animations

Use CSS animations and transforms:

```tsx
// ✅ Good: CSS-based animations
const slideInVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  }
}

function AnimatedCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={slideInVariants}
      initial="hidden"
      animate="visible"
      className="card"
    >
      {children}
    </motion.div>
  )
}

// ✅ Good: CSS transitions for simple hover effects
<Button className="transition-all duration-200 hover:scale-105 hover:shadow-lg">
  Hover Me
</Button>

// ✅ Good: Transform-based animations (GPU accelerated)
<div className="transform transition-transform duration-300 hover:translate-y-1">
  Smooth transform
</div>
```

### Loading States

Provide immediate feedback:

```tsx
// ✅ Good: Skeleton loading for better perceived performance
function UserCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UserList() {
  const { data: users, loading } = useUsers()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <UserCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}
```


### Bundle Analysis

Analyze bundle size:

```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Analyze bundle
npm run build && npm run analyze
```

### Performance Testing

```tsx
// ✅ Good: Performance testing
import { render } from '@testing-library/react'
import { performance } from 'perf_hooks'

test('large table renders within performance budget', () => {
  const users = generateMockUsers(1000)
  
  const start = performance.now()
  render(<UserTable users={users} />)
  const end = performance.now()
  
  const renderTime = end - start
  expect(renderTime).toBeLessThan(100) // 100ms budget
})
```

## Production Optimization Checklist

### Build Optimization
- [ ] Enable tree shaking
- [ ] Configure code splitting
- [ ] Optimize images and assets
- [ ] Enable gzip/brotli compression
- [ ] Set up CDN for static assets
- [ ] Configure caching headers

### Runtime Optimization
- [ ] Implement proper memoization
- [ ] Use virtual scrolling for large lists
- [ ] Debounce search and filter inputs
- [ ] Lazy load non-critical components
- [ ] Optimize re-renders with React DevTools Profiler
- [ ] Use Web Workers for heavy computations


## Common Performance Anti-Patterns

### Avoid These Patterns

```tsx
// ❌ Bad: Inline object creation causing re-renders
function BadComponent() {
  return (
    <UserList 
      filters={{ role: 'admin' }}  // New object every render
      onUserClick={(user) => console.log(user)}  // New function every render
    />
  )
}

// ❌ Bad: Expensive operations in render
function BadExpensiveComponent({ users }: { users: User[] }) {
  // This runs on every render!
  const expensiveCalculation = users
    .filter(user => user.active)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 10)

  return <UserList users={expensiveCalculation} />
}

// ❌ Bad: Using index as key
function BadKeyComponent({ users }: { users: User[] }) {
  return (
    <div>
      {users.map((user, index) => (
        <UserCard key={index} user={user} />  // Index as key causes issues
      ))}
    </div>
  )
}
```

By following these performance best practices, you can build fast, responsive applications with the DomainFlow Design System that provide excellent user experiences across all devices and network conditions.
