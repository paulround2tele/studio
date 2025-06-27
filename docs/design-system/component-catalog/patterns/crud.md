# CRUD Workflows Integration Pattern

## Overview

The CRUD (Create, Read, Update, Delete) workflow pattern demonstrates how to combine Table, Form, Dialog, and Button components to create comprehensive data management interfaces. This pattern is fundamental to most business applications and showcases proper component composition and state management.

## Core Components

- **Table**: Data display with sorting, selection, and pagination
- **Dialog**: Modal containers for forms and confirmations
- **Form**: Data input and validation
- **Button**: Action triggers
- **Alert**: Status feedback
- **Toast**: Success/error notifications

## Basic CRUD Pattern

```tsx
import { useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'

interface User {
  id: string
  name: string
  email: string
  role: string
}

function UserCRUD() {
  const [users, setUsers] = useState<User[]>([])
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  // Create new user
  const handleCreate = async (data: Omit<User, 'id'>) => {
    const newUser = { ...data, id: crypto.randomUUID() }
    setUsers(prev => [...prev, newUser])
    setDialogOpen(false)
    toast({
      title: "User created",
      description: "New user has been successfully created.",
    })
  }

  // Update existing user
  const handleUpdate = async (data: User) => {
    setUsers(prev => prev.map(user => 
      user.id === data.id ? data : user
    ))
    setEditingUser(null)
    setDialogOpen(false)
    toast({
      title: "User updated",
      description: "User information has been successfully updated.",
    })
  }

  // Delete user
  const handleDelete = async (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId))
    toast({
      title: "User deleted",
      description: "User has been successfully removed.",
    })
  }

  return (
    <div className="space-y-4">
      {/* Header with Create button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage your users</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingUser(null)}>
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Create User'}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Update user information below.'
                  : 'Add a new user to your organization.'
                }
              </DialogDescription>
            </DialogHeader>
            <UserForm
              user={editingUser}
              onSubmit={editingUser ? handleUpdate : handleCreate}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Data Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">{user.role}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingUser(user)
                      setDialogOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(user.id)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Form component for user data
function UserForm({ 
  user, 
  onSubmit, 
  onCancel 
}: { 
  user: User | null
  onSubmit: (data: any) => void
  onCancel: () => void 
}) {
  const form = useForm({
    defaultValues: user || {
      name: '',
      email: '',
      role: '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Enter email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {user ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

## Advanced CRUD with Bulk Operations

```tsx
function AdvancedUserCRUD() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Bulk delete
  const handleBulkDelete = async () => {
    setLoading(true)
    try {
      setUsers(prev => prev.filter(user => !selectedUsers.has(user.id)))
      setSelectedUsers(new Set())
      toast({
        title: "Users deleted",
        description: `${selectedUsers.size} users have been removed.`,
      })
    } finally {
      setLoading(false)
    }
  }

  // Bulk export
  const handleBulkExport = () => {
    const selectedUserData = users.filter(user => selectedUsers.has(user.id))
    const csvData = convertToCSV(selectedUserData)
    downloadCSV(csvData, 'users.csv')
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedUsers.size} user(s) selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBulkExport}>
                Export Selected
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                disabled={loading}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Enhanced Table with Selection */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedUsers.size === users.length && users.length > 0}
                indeterminate={selectedUsers.size > 0 && selectedUsers.size < users.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedUsers(new Set(users.map(u => u.id)))
                  } else {
                    setSelectedUsers(new Set())
                  }
                }}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow 
              key={user.id}
              data-state={selectedUsers.has(user.id) ? "selected" : undefined}
            >
              <TableCell>
                <Checkbox
                  checked={selectedUsers.has(user.id)}
                  onCheckedChange={(checked) => {
                    const newSelection = new Set(selectedUsers)
                    if (checked) {
                      newSelection.add(user.id)
                    } else {
                      newSelection.delete(user.id)
                    }
                    setSelectedUsers(newSelection)
                  }}
                />
              </TableCell>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">{user.role}</Badge>
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
                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDelete(user.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

## CRUD with Search and Filtering

```tsx
function FilterableUserCRUD() {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRole = !roleFilter || user.role === roleFilter
      const matchesStatus = !statusFilter || user.status === statusFilter
      
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchTerm, roleFilter, statusFilter])

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('')
              setRoleFilter('')
              setStatusFilter('')
            }}
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </p>
        <Button>Add User</Button>
      </div>

      {/* Filtered Table */}
      <Table>
        {/* Table implementation with filteredUsers */}
      </Table>
    </div>
  )
}
```

## CRUD with Confirmation Dialogs

```tsx
function SafeUserCRUD() {
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    user: User | null
  }>({ open: false, user: null })

  const handleDelete = (user: User) => {
    setDeleteDialog({ open: true, user })
  }

  const confirmDelete = async () => {
    if (deleteDialog.user) {
      setUsers(prev => prev.filter(u => u.id !== deleteDialog.user!.id))
      toast({
        title: "User deleted",
        description: `${deleteDialog.user.name} has been removed.`,
      })
    }
    setDeleteDialog({ open: false, user: null })
  }

  return (
    <div className="space-y-4">
      {/* Main CRUD interface */}
      
      {/* Confirmation Dialog */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open, user: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <strong>{deleteDialog.user?.name}</strong> and remove their data 
              from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

## CRUD with Optimistic Updates

```tsx
function OptimisticUserCRUD() {
  const [users, setUsers] = useState<User[]>([])
  const [optimisticUpdates, setOptimisticUpdates] = useState<Set<string>>(new Set())

  const handleUpdate = async (updatedUser: User) => {
    // Optimistic update
    setUsers(prev => prev.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ))
    setOptimisticUpdates(prev => new Set(prev).add(updatedUser.id))

    try {
      // API call
      await updateUserAPI(updatedUser)
      
      // Success
      setOptimisticUpdates(prev => {
        const next = new Set(prev)
        next.delete(updatedUser.id)
        return next
      })
      
      toast({
        title: "User updated",
        description: "Changes saved successfully.",
      })
    } catch (error) {
      // Rollback on error
      setUsers(prev => prev.map(user => 
        user.id === updatedUser.id ? originalUser : user
      ))
      setOptimisticUpdates(prev => {
        const next = new Set(prev)
        next.delete(updatedUser.id)
        return next
      })
      
      toast({
        title: "Update failed",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Table>
      <TableBody>
        {users.map((user) => (
          <TableRow 
            key={user.id}
            className={optimisticUpdates.has(user.id) ? "opacity-50" : ""}
          >
            <TableCell>{user.name}</TableCell>
            <TableCell>
              {optimisticUpdates.has(user.id) && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader className="h-3 w-3 animate-spin" />
                  Saving...
                </span>
              )}
            </TableCell>
            {/* Other cells */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

## Best Practices

### State Management
- Use optimistic updates for better UX
- Implement proper error handling and rollback
- Show loading states during operations
- Provide clear feedback with toasts/alerts

### User Experience
- Always confirm destructive actions
- Support bulk operations for efficiency
- Implement search and filtering
- Provide keyboard shortcuts

### Performance
- Implement pagination for large datasets
- Use virtual scrolling for very large lists
- Debounce search inputs
- Memoize filtered results

### Accessibility
- Ensure proper focus management in dialogs
- Use semantic HTML and ARIA labels
- Support keyboard navigation
- Provide clear error messages

## Testing

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('creates new user', async () => {
  const user = userEvent.setup()
  render(<UserCRUD />)
  
  await user.click(screen.getByText('Add User'))
  await user.type(screen.getByLabelText('Name'), 'John Doe')
  await user.type(screen.getByLabelText('Email'), 'john@example.com')
  await user.click(screen.getByText('Create'))
  
  expect(screen.getByText('John Doe')).toBeInTheDocument()
})

test('deletes user with confirmation', async () => {
  const user = userEvent.setup()
  render(<UserCRUD />)
  
  await user.click(screen.getByText('Delete'))
  await user.click(screen.getByText('Delete User'))
  
  expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
})
```

This CRUD pattern demonstrates how multiple components work together to create powerful data management interfaces with proper user experience, accessibility, and performance considerations.
