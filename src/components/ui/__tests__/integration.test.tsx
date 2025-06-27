import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Import components for comprehensive integration testing
import { Button } from '../button';
import { Input } from '../input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormSection, FormActions, SimpleForm } from '../form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SimpleTable } from '../table';
import { Toaster, ToastQueue } from '../toaster';
import { Toast, ToastTitle, ToastDescription, ToastClose } from '../toast';
import { Sidebar, SidebarProvider, SidebarContent, SidebarHeader, SidebarFooter } from '../sidebar';
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } from '../menubar';
import { ChartContainer } from '../chart';
import { useToast } from '../../../hooks/use-toast';
import { useForm } from 'react-hook-form';

// Mock hooks
jest.mock('../../../hooks/use-toast', () => ({
  useToast: jest.fn()
}));

const mockToast = jest.fn();
const mockDismiss = jest.fn();
const mockUseToast = require('../../../hooks/use-toast').useToast as jest.MockedFunction<any>;

describe('Cross-Component Integration Tests', () => {
  beforeEach(() => {
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: mockDismiss,
      toasts: []
    });
    mockToast.mockClear();
    mockDismiss.mockClear();
  });

  describe('Form + Dialog + Toast Integration', () => {
    const FormDialogComponent = () => {
      const form = useForm({
        defaultValues: {
          email: '',
          password: ''
        }
      });

      const handleSubmit = (data: any) => {
        mockToast({
          title: 'Form Submitted',
          description: `Email: ${data.email}`,
          variant: 'success'
        });
      };

      return (
        <>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Open Form Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Login Form</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    rules={{ required: 'Email is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter email" 
                            {...field} 
                            data-testid="dialog-email-input" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    rules={{ required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter password" 
                            {...field} 
                            data-testid="dialog-password-input" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" data-testid="dialog-submit-button">
                      Submit
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Toaster />
        </>
      );
    };

    test('form validation works within dialog and triggers toast on success', async () => {
      const user = userEvent.setup();
      render(<FormDialogComponent />);

      // Open dialog
      const trigger = screen.getByRole('button', { name: 'Open Form Dialog' });
      await user.click(trigger);

      // Verify dialog is open and form is visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Login Form')).toBeInTheDocument();
      });

      // Try to submit empty form - should show validation errors
      const submitButton = screen.getByTestId('dialog-submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });

      // Fill in valid data
      const emailInput = screen.getByTestId('dialog-email-input');
      const passwordInput = screen.getByTestId('dialog-password-input');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Submit form
      await user.click(submitButton);

      // Verify toast was called
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Form Submitted',
          description: 'Email: test@example.com',
          variant: 'success'
        });
      });
    });

    test('form validation shows individual field errors correctly', async () => {
      const user = userEvent.setup();
      render(<FormDialogComponent />);

      // Open dialog
      await user.click(screen.getByRole('button', { name: 'Open Form Dialog' }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill in email but invalid password
      const emailInput = screen.getByTestId('dialog-email-input');
      const passwordInput = screen.getByTestId('dialog-password-input');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123'); // Too short

      await user.click(screen.getByTestId('dialog-submit-button'));

      await waitFor(() => {
        expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Form + Sheet + Toast Integration', () => {
    const FormSheetComponent = () => {
      const form = useForm({
        defaultValues: {
          name: '',
          description: ''
        }
      });

      const handleSubmit = (data: any) => {
        mockToast({
          title: 'Item Created',
          description: `Name: ${data.name}`,
          variant: 'success'
        });
      };

      return (
        <>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Create Item</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create New Item</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      rules={{ required: 'Name is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter item name" 
                              {...field} 
                              data-testid="sheet-name-input" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      rules={{ required: 'Description is required' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter description" 
                              {...field} 
                              data-testid="sheet-description-input" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" data-testid="sheet-submit-button">
                      Create Item
                    </Button>
                  </form>
                </Form>
              </div>
            </SheetContent>
          </Sheet>
          <Toaster />
        </>
      );
    };

    test('sheet form integration works correctly', async () => {
      const user = userEvent.setup();
      render(<FormSheetComponent />);

      // Open sheet
      const trigger = screen.getByRole('button', { name: 'Create Item' });
      await user.click(trigger);

      // Verify sheet is open
      await waitFor(() => {
        expect(screen.getByText('Create New Item')).toBeInTheDocument();
      });

      // Fill and submit form
      const nameInput = screen.getByTestId('sheet-name-input');
      const descriptionInput = screen.getByTestId('sheet-description-input');
      const submitButton = screen.getByTestId('sheet-submit-button');

      await user.type(nameInput, 'Test Item');
      await user.type(descriptionInput, 'Test Description');
      await user.click(submitButton);

      // Verify toast was triggered
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Item Created',
          description: 'Name: Test Item',
          variant: 'success'
        });
      });
    });
  });

  describe('Button + Toast Integration', () => {
    const ButtonToastComponent = () => {
      const handleClick = (variant: 'success' | 'error' | 'warning' | 'info') => {
        mockToast({
          title: `${variant.charAt(0).toUpperCase() + variant.slice(1)} Toast`,
          description: `This is a ${variant} toast message`,
          variant: variant === 'error' ? 'destructive' : variant
        });
      };

      return (
        <>
          <div className="space-x-2">
            <Button 
              variant="default" 
              onClick={() => handleClick('success')}
              data-testid="success-button"
            >
              Success Toast
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleClick('error')}
              data-testid="error-button"
            >
              Error Toast
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleClick('warning')}
              data-testid="warning-button"
            >
              Warning Toast
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => handleClick('info')}
              data-testid="info-button"
            >
              Info Toast
            </Button>
          </div>
          <Toaster />
        </>
      );
    };

    test('buttons trigger different toast variants correctly', async () => {
      const user = userEvent.setup();
      render(<ButtonToastComponent />);

      // Test success toast
      await user.click(screen.getByTestId('success-button'));
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success Toast',
        description: 'This is a success toast message',
        variant: 'success'
      });

      // Test error toast
      await user.click(screen.getByTestId('error-button'));
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error Toast',
        description: 'This is a error toast message',
        variant: 'destructive'
      });

      // Test warning toast
      await user.click(screen.getByTestId('warning-button'));
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Warning Toast',
        description: 'This is a warning toast message',
        variant: 'warning'
      });

      // Test info toast
      await user.click(screen.getByTestId('info-button'));
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Info Toast',
        description: 'This is a info toast message',
        variant: 'info'
      });

      expect(mockToast).toHaveBeenCalledTimes(4);
    });
  });

  describe('Focus Management Integration', () => {
    const FocusManagementComponent = () => {
      return (
        <>
          <Button data-testid="first-button">First Button</Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button data-testid="dialog-trigger">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Dialog input" data-testid="dialog-input" />
                <Button data-testid="dialog-button">Dialog Button</Button>
              </div>
              <DialogFooter>
                <Button data-testid="dialog-close">Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button data-testid="last-button">Last Button</Button>
        </>
      );
    };

    test('focus management works correctly with dialog', async () => {
      const user = userEvent.setup();
      render(<FocusManagementComponent />);

      const dialogTrigger = screen.getByTestId('dialog-trigger');
      
      // Focus the trigger and open dialog
      dialogTrigger.focus();
      expect(dialogTrigger).toHaveFocus();

      await user.click(dialogTrigger);

      // Verify dialog is open and focus is managed
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        // Focus should be trapped within dialog
        const dialogInput = screen.getByTestId('dialog-input');
        expect(document.activeElement).toBe(dialogInput);
      });

      // Test tab navigation within dialog
      await user.tab();
      expect(screen.getByTestId('dialog-button')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('dialog-close')).toHaveFocus();
    });
  });

  describe('Responsive Integration', () => {
    const ResponsiveComponent = () => {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="default" className="w-full">
              Responsive Button 1
            </Button>
            <Button variant="outline" className="w-full">
              Responsive Button 2
            </Button>
            <Button variant="secondary" className="w-full">
              Responsive Button 3
            </Button>
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button className="md:hidden" data-testid="mobile-sheet-trigger">
                Mobile Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px]">
              <SheetHeader>
                <SheetTitle>Mobile Navigation</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  Home
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  About
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  Contact
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      );
    };

    test('responsive components render correctly', () => {
      render(<ResponsiveComponent />);

      // Verify responsive grid buttons
      expect(screen.getByText('Responsive Button 1')).toBeInTheDocument();
      expect(screen.getByText('Responsive Button 2')).toBeInTheDocument();
      expect(screen.getByText('Responsive Button 3')).toBeInTheDocument();

      // Verify mobile sheet trigger
      expect(screen.getByTestId('mobile-sheet-trigger')).toBeInTheDocument();
    });
  });

  describe('Table + Form + Dialog Integration', () => {
    interface User {
      id: number;
      name: string;
      email: string;
      role: string;
    }

    const DataManagementComponent = () => {
      const [data, setData] = React.useState<User[]>([
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor' }
      ]);
      const [editingUser, setEditingUser] = React.useState<User | null>(null);
      const [dialogOpen, setDialogOpen] = React.useState(false);

      const form = useForm({
        mode: 'onChange',
        defaultValues: {
          name: '',
          email: '',
          role: ''
        }
      });

      const handleEdit = (user: User) => {
        setEditingUser(user);
        form.reset(user);
        setDialogOpen(true);
      };

      const handleSave = (formData: Partial<User>) => {
        if (editingUser) {
          setData(prev => prev.map(user => 
            user.id === editingUser.id ? { ...user, ...formData } : user
          ));
          mockToast({
            title: 'User Updated',
            description: `${formData.name} has been updated successfully`,
            variant: 'success'
          });
        }
        setDialogOpen(false);
        setEditingUser(null);
      };

      const handleInvalidSubmit = (errors: any) => {
        // Validation failed, don't submit
        console.log('Validation errors:', errors);
      };

      const handleDelete = (userId: number) => {
        setData(prev => prev.filter(user => user.id !== userId));
        mockToast({
          title: 'User Deleted',
          description: 'User has been removed from the system',
          variant: 'destructive'
        });
      };

      return (
        <>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">User Management</h2>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEdit(user)}
                            data-testid={`edit-user-${user.id}`}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDelete(user.id)}
                            data-testid={`delete-user-${user.id}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent data-testid="edit-user-dialog">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave, handleInvalidSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: 'Name is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="edit-name-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    rules={{ 
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Invalid email format'
                      }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="edit-email-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    rules={{ required: 'Role is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="edit-role-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" data-testid="save-user-button">
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Toaster />
        </>
      );
    };

    test('complete CRUD workflow with table, form, and toast integration', async () => {
      const user = userEvent.setup();
      render(<DataManagementComponent />);

      // Verify initial table data
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Editor')).toBeInTheDocument();

      // Test edit functionality
      const editButton = screen.getByTestId('edit-user-1');
      await user.click(editButton);

      // Verify dialog opens with pre-filled data
      await waitFor(() => {
        expect(screen.getByTestId('edit-user-dialog')).toBeInTheDocument();
        expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
      });

      // Modify user data
      const nameInput = screen.getByTestId('edit-name-input');
      await user.clear(nameInput);
      await user.type(nameInput, 'John Updated');

      // Save changes
      const saveButton = screen.getByTestId('save-user-button');
      await user.click(saveButton);

      // Verify toast notification
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'User Updated',
          description: 'John Updated has been updated successfully',
          variant: 'success'
        });
      });

      // Verify table is updated
      await waitFor(() => {
        expect(screen.getByText('John Updated')).toBeInTheDocument();
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      });

      // Test delete functionality
      const deleteButton = screen.getByTestId('delete-user-2');
      await user.click(deleteButton);

      // Verify delete toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'User Deleted',
          description: 'User has been removed from the system',
          variant: 'destructive'
        });
      });

      // Verify user is removed from table
      await waitFor(() => {
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      });
    });

    test('form validation in dialog prevents invalid data submission', async () => {
      const user = userEvent.setup();
      render(<DataManagementComponent />);

      // Open edit dialog
      const editButton = screen.getByTestId('edit-user-1');
      await user.click(editButton);

      // Clear required fields
      const nameInput = screen.getByTestId('edit-name-input');
      const emailInput = screen.getByTestId('edit-email-input');
      
      await user.clear(nameInput);
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      // Try to save
      const saveButton = screen.getByTestId('save-user-button');
      await user.click(saveButton);

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });

      // Verify toast was NOT called
      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe('Sidebar + Menubar + Navigation Integration', () => {
    const NavigationComponent = () => {
      const [sidebarOpen, setSidebarOpen] = React.useState(true);
      const [activeSection, setActiveSection] = React.useState('dashboard');

      return (
        <SidebarProvider defaultOpen={sidebarOpen} onOpenChange={setSidebarOpen}>
          <div className="flex h-screen">
            <Sidebar>
              <SidebarHeader>
                <h2 className="text-lg font-semibold">My App</h2>
              </SidebarHeader>
              <SidebarContent>
                <nav className="space-y-2">
                  <Button 
                    variant={activeSection === 'dashboard' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveSection('dashboard')}
                    data-testid="nav-dashboard"
                  >
                    Dashboard
                  </Button>
                  <Button 
                    variant={activeSection === 'users' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveSection('users')}
                    data-testid="nav-users"
                  >
                    Users
                  </Button>
                  <Button 
                    variant={activeSection === 'settings' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveSection('settings')}
                    data-testid="nav-settings"
                  >
                    Settings
                  </Button>
                </nav>
              </SidebarContent>
              <SidebarFooter>
                <Button variant="outline" size="sm">
                  Logout
                </Button>
              </SidebarFooter>
            </Sidebar>

            <main className="flex-1 p-6">
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger data-testid="file-menu">File</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem onClick={() => mockToast({ title: 'New File Created' })}>
                      New File
                    </MenubarItem>
                    <MenubarItem onClick={() => mockToast({ title: 'File Opened' })}>
                      Open File
                    </MenubarItem>
                    <MenubarItem onClick={() => mockToast({ title: 'File Saved' })}>
                      Save File
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger data-testid="edit-menu">Edit</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>Undo</MenubarItem>
                    <MenubarItem>Redo</MenubarItem>
                    <MenubarItem>Cut</MenubarItem>
                    <MenubarItem>Copy</MenubarItem>
                    <MenubarItem>Paste</MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>

              <div className="mt-6">
                <h1 className="text-3xl font-bold mb-4">
                  {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
                </h1>
                <div data-testid={`content-${activeSection}`}>
                  {activeSection === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold">Total Users</h3>
                        <p className="text-2xl font-bold">1,234</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold">Active Sessions</h3>
                        <p className="text-2xl font-bold">567</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold">Revenue</h3>
                        <p className="text-2xl font-bold">$12,345</p>
                      </div>
                    </div>
                  )}
                  {activeSection === 'users' && (
                    <div>
                      <p>User management interface would go here...</p>
                    </div>
                  )}
                  {activeSection === 'settings' && (
                    <div>
                      <p>Application settings would go here...</p>
                    </div>
                  )}
                </div>
              </div>
            </main>
          </div>
          <Toaster />
        </SidebarProvider>
      );
    };

    test('sidebar navigation updates main content area', async () => {
      const user = userEvent.setup();
      render(<NavigationComponent />);

      // Verify initial state (dashboard)
      expect(screen.getAllByText('Dashboard')).toHaveLength(2); // One in sidebar, one in content
      expect(screen.getByTestId('content-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();

      // Navigate to users section
      const usersNav = screen.getByTestId('nav-users');
      await user.click(usersNav);

      // Verify content changes
      await waitFor(() => {
        expect(screen.getAllByText('Users')).toHaveLength(2); // One in sidebar, one in content
        expect(screen.getByTestId('content-users')).toBeInTheDocument();
        expect(screen.getByText('User management interface would go here...')).toBeInTheDocument();
      });

      // Navigate to settings
      const settingsNav = screen.getByTestId('nav-settings');
      await user.click(settingsNav);

      await waitFor(() => {
        expect(screen.getAllByText('Settings')).toHaveLength(2); // One in sidebar, one in content
        expect(screen.getByTestId('content-settings')).toBeInTheDocument();
        expect(screen.getByText('Application settings would go here...')).toBeInTheDocument();
      });
    });

    test('menubar actions trigger toast notifications', async () => {
      const user = userEvent.setup();
      render(<NavigationComponent />);

      // Test file menu actions
      const fileMenu = screen.getByTestId('file-menu');
      await user.click(fileMenu);

      await waitFor(() => {
        expect(screen.getByText('New File')).toBeInTheDocument();
      });

      const newFileItem = screen.getByText('New File');
      await user.click(newFileItem);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'New File Created'
        });
      });

      // Test another menu action
      await user.click(fileMenu);
      const saveFileItem = screen.getByText('Save File');
      await user.click(saveFileItem);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'File Saved'
        });
      });
    });
  });

  describe('Chart + Table + Form Data Visualization Integration', () => {
    const DataVisualizationComponent = () => {
      const [chartData, setChartData] = React.useState([
        { month: 'Jan', sales: 1200, expenses: 800 },
        { month: 'Feb', sales: 1500, expenses: 900 },
        { month: 'Mar', sales: 1800, expenses: 1100 },
        { month: 'Apr', sales: 2000, expenses: 1300 },
        { month: 'May', sales: 2200, expenses: 1400 }
      ]);

      const [newDataEntry, setNewDataEntry] = React.useState({
        month: '',
        sales: '',
        expenses: ''
      });

      const form = useForm({
        mode: 'onChange',
        defaultValues: newDataEntry
      });

      const handleAddData = (data: any) => {
        const newEntry = {
          month: data.month,
          sales: parseInt(data.sales),
          expenses: parseInt(data.expenses)
        };

        setChartData(prev => [...prev, newEntry]);
        
        mockToast({
          title: 'Data Added',
          description: `Added ${data.month} data to chart`,
          variant: 'success'
        });

        form.reset();
      };

      const handleInvalidSubmit = (errors: any) => {
        // Validation failed, don't submit
        console.log('Validation errors:', errors);
      };

      const config = {
        sales: {
          label: 'Sales',
          color: 'hsl(var(--chart-1))'
        },
        expenses: {
          label: 'Expenses', 
          color: 'hsl(var(--chart-2))'
        }
      };

      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Sales & Expenses Dashboard</h2>
          
          {/* Chart Section */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Monthly Overview</h3>
            <ChartContainer config={config} className="h-[300px]" data-testid="sales-chart">
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Chart would render here with data: {chartData.length} entries
              </div>
            </ChartContainer>
          </div>

          {/* Table Section */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Data Table</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  chartData.map((item, index) => (
                    <TableRow key={index} data-testid={`data-row-${index}`}>
                      <TableCell>{item.month}</TableCell>
                      <TableCell>${item.sales.toLocaleString()}</TableCell>
                      <TableCell>${item.expenses.toLocaleString()}</TableCell>
                      <TableCell className={item.sales - item.expenses > 0 ? 'text-green-600' : 'text-red-600'}>
                        ${(item.sales - item.expenses).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Form Section */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Add New Data</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleAddData, handleInvalidSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="month"
                    rules={{ required: 'Month is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Jun" {...field} data-testid="month-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sales"
                    rules={{ 
                      required: 'Sales amount is required',
                      pattern: { value: /^\d+$/, message: 'Must be a number' }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="2500" {...field} data-testid="sales-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expenses"
                    rules={{ 
                      required: 'Expenses amount is required',
                      pattern: { value: /^\d+$/, message: 'Must be a number' }
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expenses</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1500" {...field} data-testid="expenses-input" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" data-testid="add-data-button">
                  Add Data Entry
                </Button>
              </form>
            </Form>
          </div>
          <Toaster />
        </div>
      );
    };

    test('form data submission updates both chart and table', async () => {
      const user = userEvent.setup();
      render(<DataVisualizationComponent />);

      // Verify initial data in table  
      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getAllByText('$1,200')).toHaveLength(1); // Should only be sales column
      expect(screen.getByText('$400')).toBeInTheDocument(); // Profit for Jan

      // Add new data entry
      const monthInput = screen.getByTestId('month-input');
      const salesInput = screen.getByTestId('sales-input');
      const expensesInput = screen.getByTestId('expenses-input');

      await user.type(monthInput, 'Jun');
      await user.type(salesInput, '2500');
      await user.type(expensesInput, '1500');

      const addButton = screen.getByTestId('add-data-button');
      await user.click(addButton);

      // Verify toast notification
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Data Added',
          description: 'Added Jun data to chart',
          variant: 'success'
        });
      });

      // Verify new data appears in table
      await waitFor(() => {
        expect(screen.getByText('Jun')).toBeInTheDocument();
        expect(screen.getByText('$2,500')).toBeInTheDocument();
        expect(screen.getByText('$1,000')).toBeInTheDocument(); // Profit for Jun
      });

      // Verify chart data count is updated
      const chart = screen.getByTestId('sales-chart');
      expect(within(chart).getByText('Chart would render here with data: 6 entries')).toBeInTheDocument();
    });

    test('form validation prevents invalid data entry', async () => {
      const user = userEvent.setup();
      render(<DataVisualizationComponent />);

      // Try to submit with invalid data
      const monthInput = screen.getByTestId('month-input');
      const salesInput = screen.getByTestId('sales-input');
      const expensesInput = screen.getByTestId('expenses-input');

      // Fill month field but leave sales and expenses empty to trigger required validation
      await user.type(monthInput, 'Jun');

      const addButton = screen.getByTestId('add-data-button');
      await user.click(addButton);

      // Verify validation errors for required fields
      await waitFor(() => {
        expect(screen.getByText('Sales amount is required')).toBeInTheDocument();
        expect(screen.getByText('Expenses amount is required')).toBeInTheDocument();
      });

      // Verify no toast was triggered
      expect(mockToast).not.toHaveBeenCalled();

      // Verify data count didn't change
      const chart = screen.getByTestId('sales-chart');
      expect(within(chart).getByText('Chart would render here with data: 5 entries')).toBeInTheDocument();
    });
  });

  describe('Advanced ToastQueue Integration', () => {
    const ToastQueueComponent = () => {
      const [queueLength, setQueueLength] = React.useState(0);
      const [maxConcurrent, setMaxConcurrent] = React.useState(3);
      const toastQueue = React.useMemo(() => ToastQueue.getInstance(), []);

      React.useEffect(() => {
        const updateQueueLength = () => {
          setQueueLength(toastQueue.getQueue().length);
        };
        
        // Update initially
        updateQueueLength();
        setMaxConcurrent(toastQueue.getMaxConcurrent());
        
        // Simple polling to update queue length for demo purposes
        const interval = setInterval(updateQueueLength, 100);
        return () => clearInterval(interval);
      }, [toastQueue]);

      const triggerMultipleToasts = () => {
        // Add multiple toasts to queue to test concurrency management
        for (let i = 1; i <= 5; i++) {
          toastQueue.add({
            id: `toast-${i}`,
            props: {
              title: `Toast ${i}`,
              description: `This is toast number ${i}`,
              variant: i % 2 === 0 ? 'success' : 'default'
            }
          });
        }
        setQueueLength(toastQueue.getQueue().length);
      };

      const processQueue = () => {
        const processed = toastQueue.processQueueSync();
        setQueueLength(toastQueue.getQueue().length);
        mockToast({
          title: 'Queue Processed',
          description: `Processed ${processed.length} toasts`,
          variant: 'info'
        });
      };

      const clearQueue = () => {
        toastQueue.clear();
        setQueueLength(toastQueue.getQueue().length);
        mockToast({
          title: 'Queue Cleared',
          description: 'All toasts removed from queue',
          variant: 'warning'
        });
      };

      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Toast Queue Management</h2>
          <div className="flex gap-4">
            <Button 
              onClick={triggerMultipleToasts}
              data-testid="trigger-multiple-toasts"
            >
              Add 5 Toasts to Queue
            </Button>
            <Button 
              onClick={processQueue}
              variant="secondary"
              data-testid="process-queue"
            >
              Process Queue
            </Button>
            <Button 
              onClick={clearQueue}
              variant="destructive"
              data-testid="clear-queue"
            >
              Clear Queue
            </Button>
          </div>
          <div className="mt-4">
            <p>Queue Length: <span data-testid="queue-length">{queueLength}</span></p>
            <p>Max Concurrent: <span data-testid="max-concurrent">{maxConcurrent}</span></p>
          </div>
          <Toaster />
        </div>
      );
    };

    test('toast queue manages multiple toasts correctly', async () => {
      const user = userEvent.setup();
      render(<ToastQueueComponent />);

      // Verify initial state
      expect(screen.getByTestId('queue-length')).toHaveTextContent('0');
      expect(screen.getByTestId('max-concurrent')).toHaveTextContent('3');

      // Add multiple toasts to queue
      const triggerButton = screen.getByTestId('trigger-multiple-toasts');
      await user.click(triggerButton);

      // Verify queue length increased
      await waitFor(() => {
        expect(screen.getByTestId('queue-length')).toHaveTextContent('5');
      });

      // Process queue
      const processButton = screen.getByTestId('process-queue');
      await user.click(processButton);

      // Verify processing toast was triggered
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Queue Processed',
          description: 'Processed 3 toasts', // Should process max concurrent (3)
          variant: 'info'
        });
      });

      // Verify queue length decreased
      await waitFor(() => {
        expect(screen.getByTestId('queue-length')).toHaveTextContent('2');
      });

      // Clear remaining queue
      const clearButton = screen.getByTestId('clear-queue');
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Queue Cleared',
          description: 'All toasts removed from queue',
          variant: 'warning'
        });
      });

      // Verify queue is empty
      await waitFor(() => {
        expect(screen.getByTestId('queue-length')).toHaveTextContent('0');
      });
    });
  });
});
