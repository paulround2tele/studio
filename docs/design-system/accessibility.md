# Accessibility Documentation

## Overview

The DomainFlow Design System is built with accessibility as a core principle. Every component follows WCAG 2.1 AA guidelines and implements best practices for inclusive design. This document outlines accessibility features, testing strategies, and implementation guidelines.

## Accessibility Principles

### 1. Perceivable
Information and UI components must be presentable to users in ways they can perceive.

#### Color and Contrast
- All components meet WCAG AA contrast requirements (4.5:1 for normal text, 3:1 for large text)
- Information is never conveyed by color alone
- Color themes support both light and dark modes

```tsx
// ✅ Good: Information conveyed through multiple means
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />  {/* Icon */}
  <AlertTitle>Error</AlertTitle>  {/* Text */}
  <AlertDescription>
    Please fix the following issues:
  </AlertDescription>
</Alert>

// ❌ Bad: Information conveyed by color only
<span className="text-red-500">Error</span>
```

#### Text and Typography
- Scalable text that works with zoom up to 200%
- Readable font sizes and line heights
- Sufficient spacing between interactive elements

```tsx
// ✅ Good: Scalable typography
<Button size="lg">Large Button</Button>  {/* 44px minimum touch target */}
<Label className="text-base leading-relaxed">
  Clear, readable label text
</Label>
```

### 2. Operable
UI components and navigation must be operable by all users.

#### Keyboard Navigation
All interactive components are keyboard accessible:

```tsx
// ✅ Good: Full keyboard support
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Settings</DialogTitle>
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
  aria-label="View user profile"
>
  User Information
</Card>
```

#### Focus Management
- Visible focus indicators on all interactive elements
- Logical tab order
- Focus trapped in modals and dialogs

```tsx
// ✅ Good: Focus indicators
<Button className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
  Accessible Button
</Button>

// ✅ Good: Focus trapping in dialogs
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    {/* Focus is automatically trapped within dialog */}
    <Input autoFocus />
    <Button onClick={() => setIsOpen(false)}>Close</Button>
  </DialogContent>
</Dialog>
```

### 3. Understandable
Information and UI operation must be understandable.

#### Clear Labels and Instructions
- Descriptive labels for all form controls
- Clear error messages and validation feedback
- Consistent interaction patterns

```tsx
// ✅ Good: Clear labeling
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email Address</FormLabel>
      <FormControl>
        <Input 
          type="email" 
          placeholder="your@email.com"
          aria-describedby="email-help email-error"
          {...field} 
        />
      </FormControl>
      <FormDescription id="email-help">
        We'll never share your email with anyone else.
      </FormDescription>
      <FormMessage id="email-error" />
    </FormItem>
  )}
/>

// ✅ Good: Clear error messages
<FormMessage>
  Please enter a valid email address (example: user@domain.com)
</FormMessage>
```

### 4. Robust
Content must be robust enough to be interpreted by a wide variety of user agents.

#### Semantic HTML
- Proper HTML5 semantic elements
- Valid markup structure
- Compatible with assistive technologies

```tsx
// ✅ Good: Semantic structure
<main>
  <section aria-labelledby="users-heading">
    <h1 id="users-heading">User Management</h1>
    <nav aria-label="User actions">
      <Button>Add User</Button>
      <Button>Export Users</Button>
    </nav>
    <Table>
      <TableCaption>
        List of all users with their roles and status
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Name</TableHead>
          <TableHead scope="col">Email</TableHead>
          <TableHead scope="col">Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </section>
</main>
```

## Component Accessibility Features

### Form Components

#### Form Fields
```tsx
// ✅ Accessibility features built-in
<FormField
  control={form.control}
  name="username"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Username *</FormLabel>  {/* Required indicator */}
      <FormControl>
        <Input 
          {...field}
          aria-invalid={!!error}  {/* Error state */}
          aria-describedby="username-help username-error"  {/* Associations */}
        />
      </FormControl>
      <FormDescription id="username-help">
        Must be at least 3 characters long
      </FormDescription>
      <FormMessage id="username-error" role="alert" />  {/* Live error announcements */}
    </FormItem>
  )}
/>
```

#### Select Components
```tsx
// ✅ Accessible select with proper ARIA
<Select value={value} onValueChange={setValue}>
  <SelectTrigger 
    aria-label="Choose user role"
    aria-expanded={isOpen}
    aria-haspopup="listbox"
  >
    <SelectValue placeholder="Select role" />
  </SelectTrigger>
  <SelectContent role="listbox">
    <SelectItem value="admin" role="option">Administrator</SelectItem>
    <SelectItem value="user" role="option">User</SelectItem>
    <SelectItem value="viewer" role="option">Viewer</SelectItem>
  </SelectContent>
</Select>
```

### Navigation Components

#### Tables
```tsx
// ✅ Accessible table structure
<Table>
  <TableCaption>
    Employee directory showing 50 of 150 employees
  </TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead 
        scope="col"
        className="sortable"
        onClick={() => handleSort('name')}
        aria-sort={sortDirection}
      >
        Name
      </TableHead>
      <TableHead scope="col">Department</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {employees.map((employee) => (
      <TableRow key={employee.id}>
        <TableHead scope="row">{employee.name}</TableHead>  {/* Row header */}
        <TableCell>{employee.department}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### Pagination
```tsx
// ✅ Accessible pagination
<nav aria-label="Pagination Navigation" role="navigation">
  <div className="flex items-center space-x-2">
    <Button 
      variant="outline" 
      onClick={() => setPage(page - 1)}
      disabled={page === 1}
      aria-label="Go to previous page"
    >
      Previous
    </Button>
    
    <span className="text-sm text-muted-foreground" aria-live="polite">
      Page {page} of {totalPages}
    </span>
    
    <Button 
      variant="outline" 
      onClick={() => setPage(page + 1)}
      disabled={page === totalPages}
      aria-label="Go to next page"
    >
      Next
    </Button>
  </div>
</nav>
```

### Feedback Components

#### Alerts
```tsx
// ✅ Accessible alerts with proper roles
<Alert variant="destructive" role="alert">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    There was an error processing your request. Please try again.
  </AlertDescription>
</Alert>

// ✅ Status updates with live regions
<Alert variant="success" role="status" aria-live="polite">
  <CheckCircle className="h-4 w-4" />
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>
    Your changes have been saved successfully.
  </AlertDescription>
</Alert>
```

#### Toasts
```tsx
// ✅ Accessible toast notifications
<Toast>
  <div className="grid gap-1">
    <ToastTitle>Notification</ToastTitle>
    <ToastDescription>Your file has been uploaded.</ToastDescription>
  </div>
  <ToastClose 
    aria-label="Close notification"
    onClick={onClose}
  />
</Toast>

// ✅ Toast with action
<Toast>
  <div className="grid gap-1">
    <ToastTitle>Email sent</ToastTitle>
    <ToastDescription>
      Your message has been sent to john@example.com
    </ToastDescription>
  </div>
  <ToastAction 
    altText="Undo send email"
    onClick={handleUndo}
  >
    Undo
  </ToastAction>
</Toast>
```

## Screen Reader Support

### ARIA Labels and Descriptions

#### Descriptive Labels
```tsx
// ✅ Descriptive button labels
<Button aria-label="Delete user John Doe">
  <Trash className="h-4 w-4" />
</Button>

<Button aria-label="Edit user profile">
  <Edit className="h-4 w-4" />
  Edit
</Button>

// ✅ Complex controls
<div 
  role="slider"
  aria-label="Volume"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={volume}
  aria-valuetext={`${volume} percent`}
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
  <div className="slider-track">
    <div 
      className="slider-thumb" 
      style={{ left: `${volume}%` }}
    />
  </div>
</div>
```

#### Live Regions
```tsx
// ✅ Live announcements for dynamic content
<div aria-live="polite" aria-atomic="true">
  {loading && "Loading user data..."}
  {error && `Error: ${error.message}`}
  {success && "Data loaded successfully"}
</div>

// ✅ Search results announcement
<div aria-live="polite" aria-atomic="false">
  {searchResults.length} results found for "{searchTerm}"
</div>
```

### Content Structure

#### Heading Hierarchy
```tsx
// ✅ Proper heading structure
<main>
  <h1>Dashboard</h1>
  
  <section>
    <h2>User Statistics</h2>
    <div>
      <h3>Active Users</h3>
      <p>1,234 users</p>
    </div>
    <div>
      <h3>New Registrations</h3>
      <p>56 this week</p>
    </div>
  </section>
  
  <section>
    <h2>Recent Activity</h2>
    <Table>
      <TableCaption>Latest user activities</TableCaption>
      {/* Table content */}
    </Table>
  </section>
</main>
```

## Testing Accessibility

### Automated Testing

#### Using jest-axe
```tsx
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('should not have accessibility violations', async () => {
  const { container } = render(<UserForm />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

#### ESLint Rules
```json
{
  "extends": [
    "plugin:jsx-a11y/recommended"
  ],
  "rules": {
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-has-content": "error",
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-role": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/heading-has-content": "error",
    "jsx-a11y/iframe-has-title": "error",
    "jsx-a11y/img-redundant-alt": "error",
    "jsx-a11y/no-access-key": "error",
    "jsx-a11y/no-distracting-elements": "error",
    "jsx-a11y/no-redundant-roles": "error",
    "jsx-a11y/role-has-required-aria-props": "error",
    "jsx-a11y/role-supports-aria-props": "error",
    "jsx-a11y/scope": "error"
  }
}
```

### Manual Testing

#### Keyboard Navigation Testing
1. Test tab order through all interactive elements
2. Verify focus indicators are visible
3. Test escape key functionality in modals
4. Verify arrow key navigation in menus/lists
5. Test enter/space activation of buttons

#### Screen Reader Testing
1. Use NVDA (free) or JAWS for testing
2. Verify all content is announced correctly
3. Test form field associations
4. Verify error message announcements
5. Test table navigation and cell content

#### Browser Testing Checklist
- [ ] Chrome with ChromeVox extension
- [ ] Firefox with NVDA
- [ ] Safari with VoiceOver (macOS)
- [ ] Edge with Narrator (Windows)

### Testing Tools

#### Browser Extensions
- **axe DevTools**: Automated accessibility testing
- **WAVE**: Web accessibility evaluation
- **Lighthouse**: Accessibility audit
- **Color Oracle**: Color blindness simulation

#### Command Line Tools
```bash
# Install accessibility testing tools
npm install --save-dev @axe-core/cli jest-axe

# Run axe-core CLI
npx axe-core http://localhost:3000

# Run Lighthouse accessibility audit
npx lighthouse http://localhost:3000 --only-categories=accessibility
```

## Common Accessibility Issues and Solutions

### Issue: Missing Alt Text
```tsx
// ❌ Problem
<img src="user-avatar.jpg" />

// ✅ Solution
<img src="user-avatar.jpg" alt="John Doe's profile picture" />

// ✅ Decorative images
<img src="decoration.jpg" alt="" role="presentation" />
```

### Issue: Poor Focus Management
```tsx
// ❌ Problem
<div onClick={handleClick}>Click me</div>

// ✅ Solution
<Button onClick={handleClick}>Click me</Button>

// ✅ Custom interactive element
<div 
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
>
  Custom Button
</div>
```

### Issue: Missing Form Labels
```tsx
// ❌ Problem
<Input placeholder="Enter email" />

// ✅ Solution
<FormField
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email Address</FormLabel>
      <FormControl>
        <Input placeholder="your@email.com" {...field} />
      </FormControl>
    </FormItem>
  )}
/>
```

### Issue: Insufficient Color Contrast
```tsx
// ❌ Problem: Low contrast text
<span className="text-gray-400 bg-gray-100">
  Hard to read text
</span>

// ✅ Solution: High contrast
<span className="text-gray-900 bg-gray-100">
  Easy to read text
</span>

// ✅ Use design system colors
<Badge variant="secondary">Proper contrast</Badge>
```

## Accessibility Checklist

### Before Release
- [ ] All images have appropriate alt text
- [ ] Form fields have associated labels
- [ ] Interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA requirements
- [ ] Error messages are announced to screen readers
- [ ] Heading structure is logical
- [ ] Tables have proper headers and captions
- [ ] ARIA labels are descriptive and accurate
- [ ] Live regions announce dynamic content changes

### Component Development
- [ ] Uses semantic HTML elements
- [ ] Implements proper ARIA attributes
- [ ] Supports keyboard navigation
- [ ] Provides focus management
- [ ] Includes proper labeling
- [ ] Tests with screen readers
- [ ] Passes automated accessibility tests
- [ ] Maintains high color contrast
- [ ] Supports browser zoom to 200%
- [ ] Works without JavaScript (where applicable)

## Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Testing Tools
- [axe-core](https://github.com/dequelabs/axe-core)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

### Screen Readers
- [NVDA](https://www.nvaccess.org/) (Free, Windows)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/) (Windows)
- [VoiceOver](https://www.apple.com/accessibility/mac/vision/) (macOS, iOS)
- [Orca](https://wiki.gnome.org/Projects/Orca) (Linux)

By following these accessibility guidelines, the DomainFlow Design System ensures that all users can effectively interact with applications built using our components.
