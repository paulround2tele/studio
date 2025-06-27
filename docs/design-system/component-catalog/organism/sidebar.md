# Sidebar

Complex navigation component with collapsible sections, mobile responsiveness, and advanced interaction patterns.

## Overview

The Sidebar component provides a comprehensive navigation solution with support for multiple layout variants, collapsible behavior, mobile-first design, and rich content organization. It includes context management, keyboard shortcuts, and accessibility features.

## Import

```typescript
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  SidebarTrigger,
  SidebarInput,
  SidebarInset,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar'
```

## Basic Usage

### Simple Sidebar

```tsx
<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      <h2 className="text-lg font-semibold">My App</h2>
    </SidebarHeader>
    
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Home className="w-4 h-4" />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Users className="w-4 h-4" />
              <span>Users</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
    
    <SidebarFooter>
      <p className="text-sm text-muted-foreground">Version 1.0</p>
    </SidebarFooter>
  </Sidebar>
  
  <SidebarInset>
    <main className="p-4">
      <SidebarTrigger />
      <h1>Main Content</h1>
    </main>
  </SidebarInset>
</SidebarProvider>
```

## Variants

### Layout Variants

```tsx
// Default sidebar
<Sidebar variant="sidebar">
  {/* content */}
</Sidebar>

// Floating sidebar with shadow
<Sidebar variant="floating">
  {/* content */}
</Sidebar>

// Inset sidebar with rounded corners
<Sidebar variant="inset">
  {/* content */}
</Sidebar>
```

### Collapsible Behavior

```tsx
// Offcanvas (slides out completely)
<Sidebar collapsible="offcanvas">
  {/* content */}
</Sidebar>

// Icon mode (shows only icons when collapsed)
<Sidebar collapsible="icon">
  {/* content */}
</Sidebar>

// Non-collapsible
<Sidebar collapsible="none">
  {/* content */}
</Sidebar>
```

### Side Position

```tsx
// Left sidebar (default)
<Sidebar side="left">
  {/* content */}
</Sidebar>

// Right sidebar
<Sidebar side="right">
  {/* content */}
</Sidebar>
```

## Advanced Examples

### Complete Navigation Sidebar

```tsx
const NavigationSidebar = () => {
  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenuButton size="lg" asChild>
            <a href="/">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GalleryVerticalEnd className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">DomainFlow</span>
                <span className="text-xs">Enterprise</span>
              </div>
            </a>
          </SidebarMenuButton>
        </SidebarHeader>
        
        <SidebarContent>
          {/* Platform Section */}
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Dashboard">
                  <SquareTerminal />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Campaigns">
                  <Bot />
                  <span>Campaigns</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Domains">
                  <BookOpen />
                  <span>Domains</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          
          {/* Projects Section with Submenu */}
          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Frame />
                  <span>Project Alpha</span>
                </SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <a href="/projects/alpha/overview">Overview</a>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <a href="/projects/alpha/settings">Settings</a>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          
          <SidebarSeparator />
          
          {/* Settings Section */}
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings2 />
                  <span>General</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <LifeBuoy />
                  <span>Support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton>
                    <User2 />
                    <span>John Doe</span>
                    <ChevronUp className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-popper-anchor-width]"
                >
                  <DropdownMenuItem>
                    <span>Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
          </div>
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
```

### Sidebar with Search

```tsx
const SearchableSidebar = () => {
  const [searchQuery, setSearchQuery] = useState("")
  
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarInput
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Results</SidebarGroupLabel>
          <SidebarMenu>
            {filteredItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton>
                  <item.icon />
                  <span>{item.name}</span>
                  {item.badge && (
                    <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

### Sidebar with Actions

```tsx
const ActionSidebar = () => {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            Recent Projects
            <SidebarGroupAction>
              <Plus />
              <span className="sr-only">Add Project</span>
            </SidebarGroupAction>
          </SidebarGroupLabel>
          
          <SidebarMenu>
            {projects.map((project) => (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton asChild>
                  <a href={`/projects/${project.id}`}>
                    <project.icon />
                    <span>{project.name}</span>
                  </a>
                </SidebarMenuButton>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontal />
                      <span className="sr-only">More</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem>
                      <Folder />
                      View Project
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share />
                      Share Project
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Trash2 />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

### Loading State Sidebar

```tsx
const LoadingSidebar = () => {
  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenuSkeleton showIcon />
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {Array.from({ length: 5 }).map((_, index) => (
              <SidebarMenuItem key={index}>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
```

### Mobile-Responsive Sidebar

```tsx
const ResponsiveSidebar = () => {
  const { isMobile } = useSidebar()
  
  return (
    <SidebarProvider>
      <Sidebar collapsible={isMobile ? "offcanvas" : "icon"}>
        {/* Sidebar content adapts based on mobile state */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={isMobile ? undefined : "Dashboard"}>
                  <Home />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      
      <SidebarInset>
        <header className="flex h-16 items-center gap-2 px-4">
          <SidebarTrigger />
          {/* Rest of header */}
        </header>
        {/* Main content */}
      </SidebarInset>
    </SidebarProvider>
  )
}
```

## API Reference

### SidebarProvider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultOpen` | `boolean` | `true` | Default open state |
| `open` | `boolean` | - | Controlled open state |
| `onOpenChange` | `(open: boolean) => void` | - | Open change handler |

### Sidebar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `side` | `'left' \| 'right'` | `'left'` | Sidebar position |
| `variant` | `'sidebar' \| 'floating' \| 'inset'` | `'sidebar'` | Visual variant |
| `collapsible` | `'offcanvas' \| 'icon' \| 'none'` | `'offcanvas'` | Collapse behavior |

### SidebarMenuButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'outline'` | `'default'` | Button variant |
| `size` | `'default' \| 'sm' \| 'lg'` | `'default'` | Button size |
| `isActive` | `boolean` | `false` | Active state |
| `tooltip` | `string \| TooltipProps` | - | Tooltip content |
| `asChild` | `boolean` | `false` | Render as child element |

### SidebarMenuSubButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md'` | `'md'` | Sub-button size |
| `isActive` | `boolean` | `false` | Active state |
| `asChild` | `boolean` | `false` | Render as child element |

### useSidebar Hook

Returns sidebar context with the following properties:

```typescript
{
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + B` | Toggle sidebar |
| `Tab` | Navigate through sidebar items |
| `Enter/Space` | Activate focused item |
| `Escape` | Close mobile sidebar |

## Accessibility

- Full keyboard navigation support
- Proper ARIA labels and roles
- Screen reader announcements for state changes
- Focus management between collapsed/expanded states
- Mobile accessibility with sheet overlay
- Semantic HTML structure

### ARIA Attributes

```tsx
<SidebarMenuButton aria-current="page" isActive>
  Current Page
</SidebarMenuButton>

<SidebarGroupLabel aria-level={2}>
  Section Title
</SidebarGroupLabel>
```

## Best Practices

### Do's
- Use logical grouping for navigation items
- Provide tooltips for collapsed icon state
- Include search functionality for large navigation
- Use consistent iconography throughout
- Implement proper loading states
- Handle mobile experience thoughtfully

### Don'ts
- Don't nest menu items too deeply (max 2-3 levels)
- Don't make sidebar the only navigation method
- Don't forget keyboard navigation
- Don't ignore responsive design considerations
- Don't overload with too many sections

## Design Tokens

```css
/* Sidebar dimensions */
--sidebar-width: 16rem;
--sidebar-width-mobile: 18rem;
--sidebar-width-icon: 3rem;

/* Sidebar colors */
--sidebar-bg: hsl(var(--sidebar));
--sidebar-text: hsl(var(--sidebar-foreground));
--sidebar-border: hsl(var(--sidebar-border));
--sidebar-accent: hsl(var(--sidebar-accent));
--sidebar-accent-foreground: hsl(var(--sidebar-accent-foreground));

/* Sidebar animations */
--sidebar-transition-duration: 200ms;
--sidebar-transition-easing: ease-linear;
```

## Related Components

- [Sheet](../organism/sheet.md) - Mobile sidebar implementation
- [Breadcrumb](../molecular/breadcrumb.md) - Navigation context
- [Dropdown Menu](../molecular/dropdown-menu.md) - Action menus
- [Button](../atomic/button.md) - Menu buttons
