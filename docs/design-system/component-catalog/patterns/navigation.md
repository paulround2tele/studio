# Navigation Systems

Coordinated navigation patterns combining multiple components for comprehensive user navigation.

## Overview

Navigation systems integrate multiple navigation components to create cohesive user experiences. This includes coordinating sidebars, menubars, breadcrumbs, and tabs to provide clear, consistent navigation throughout the application.

## Import

```typescript
import { 
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  Tabs,
  TabsList,
  TabsTrigger
} from '@/components/ui'
```

## Navigation Hierarchy

### Primary Navigation (Sidebar)
Main application navigation for major sections and features.

### Secondary Navigation (Menubar)
Contextual actions and less frequently used options.

### Tertiary Navigation (Breadcrumbs)
Location awareness and quick backward navigation.

### Local Navigation (Tabs)
Content organization within a specific section.

## Basic Navigation System

```tsx
function AppNavigation() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  return (
    <div className="flex h-screen">
      {/* Primary Sidebar Navigation */}
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SidebarHeader>
          <div className="flex items-center space-x-2">
            <Logo className="h-8 w-8" />
            <span className="font-semibold">DomainFlow</span>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <NavigationMenu>
            <NavigationMenuItem>
              <NavigationMenuLink 
                href="/dashboard"
                className={cn(activeSection === "dashboard" && "bg-accent")}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="/campaigns">
                <Target className="h-4 w-4" />
                Campaigns
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="/domains">
                <Globe className="h-4 w-4" />
                Domains
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenu>
        </SidebarContent>
        
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
      </Sidebar>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Secondary Menubar Navigation */}
        <Menubar className="border-b">
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New Campaign</MenubarItem>
              <MenubarItem>Import Domains</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Export Results</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
              <MenubarItem>Redo</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Select All</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Refresh</MenubarItem>
              <MenubarItem>Full Screen</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        
        {/* Breadcrumb Navigation */}
        <div className="border-b px-4 py-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/campaigns">Campaigns</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Campaign Details</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        
        {/* Content with Local Navigation */}
        <div className="flex-1 p-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="domains">Domains</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              {/* Overview content */}
            </TabsContent>
            <TabsContent value="domains">
              {/* Domains content */}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
```

## Responsive Navigation

```tsx
function ResponsiveNavigation() {
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  if (isMobile) {
    return (
      <div className="flex h-screen flex-col">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="font-semibold">DomainFlow</div>
          
          <UserAvatar />
        </header>
        
        {/* Mobile Menu Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-80">
            <MobileNavigationMenu onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        
        {/* Mobile Breadcrumbs */}
        <div className="border-b px-4 py-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Current</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Content */}
        </main>
      </div>
    )
  }
  
  // Desktop navigation (from previous example)
  return <DesktopNavigation />
}
```

## Dashboard Navigation

```tsx
function DashboardNavigation() {
  const [currentView, setCurrentView] = useState("overview")
  const [quickActions, setQuickActions] = useState(false)
  
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center px-4">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Logo className="h-6 w-6" />
            <h1 className="font-semibold">Dashboard</h1>
          </div>
          
          {/* Search */}
          <div className="flex-1 max-w-sm mx-4">
            <Input
              placeholder="Search campaigns, domains..."
              className="w-full"
            />
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
            
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            
            <UserMenu />
          </div>
        </div>
      </header>
      
      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 border-r bg-muted/10">
          <nav className="space-y-2 p-4">
            <div className="space-y-1">
              <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Main
              </h3>
              
              <NavigationButton
                icon={<BarChart3 className="h-4 w-4" />}
                label="Overview"
                active={currentView === "overview"}
                onClick={() => setCurrentView("overview")}
              />
              
              <NavigationButton
                icon={<Target className="h-4 w-4" />}
                label="Campaigns"
                active={currentView === "campaigns"}
                onClick={() => setCurrentView("campaigns")}
                badge="12"
              />
              
              <NavigationButton
                icon={<Globe className="h-4 w-4" />}
                label="Domains"
                active={currentView === "domains"}
                onClick={() => setCurrentView("domains")}
              />
            </div>
            
            <div className="space-y-1">
              <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6">
                Tools
              </h3>
              
              <NavigationButton
                icon={<Settings className="h-4 w-4" />}
                label="Settings"
                onClick={() => setCurrentView("settings")}
              />
              
              <NavigationButton
                icon={<HelpCircle className="h-4 w-4" />}
                label="Help & Support"
                onClick={() => setCurrentView("help")}
              />
            </div>
          </nav>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1">
          {/* Context Tabs */}
          <div className="border-b">
            <Tabs value={currentView} onValueChange={setCurrentView}>
              <TabsList className="h-12 px-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="campaigns">
                  Campaigns
                  <Badge variant="secondary" className="ml-2">12</Badge>
                </TabsTrigger>
                <TabsTrigger value="domains">Domains</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Page Content */}
          <div className="p-6">
            {currentView === "overview" && <OverviewContent />}
            {currentView === "campaigns" && <CampaignsContent />}
            {currentView === "domains" && <DomainsContent />}
          </div>
        </main>
      </div>
    </div>
  )
}
```

## Multi-Level Navigation

```tsx
function MultiLevelNavigation() {
  const [expandedSections, setExpandedSections] = useState<string[]>(["main"])
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }
  
  return (
    <Sidebar>
      <SidebarContent>
        {/* Main Section */}
        <NavigationSection
          title="Main"
          expanded={expandedSections.includes("main")}
          onToggle={() => toggleSection("main")}
        >
          <NavigationItem href="/dashboard" icon={<Home />}>
            Dashboard
          </NavigationItem>
          <NavigationItem href="/analytics" icon={<BarChart />}>
            Analytics
          </NavigationItem>
        </NavigationSection>
        
        {/* Campaigns Section */}
        <NavigationSection
          title="Campaigns"
          expanded={expandedSections.includes("campaigns")}
          onToggle={() => toggleSection("campaigns")}
          badge="5 active"
        >
          <NavigationItem href="/campaigns/active">
            Active Campaigns
          </NavigationItem>
          <NavigationItem href="/campaigns/completed">
            Completed
          </NavigationItem>
          <NavigationItem href="/campaigns/templates">
            Templates
          </NavigationItem>
        </NavigationSection>
        
        {/* Tools Section */}
        <NavigationSection
          title="Tools & Settings"
          expanded={expandedSections.includes("tools")}
          onToggle={() => toggleSection("tools")}
        >
          <NavigationItem href="/personas">
            Personas
          </NavigationItem>
          <NavigationItem href="/keywords">
            Keywords
          </NavigationItem>
          <NavigationItem href="/settings">
            Settings
          </NavigationItem>
        </NavigationSection>
      </SidebarContent>
    </Sidebar>
  )
}

function NavigationSection({ 
  title, 
  children, 
  expanded, 
  onToggle, 
  badge 
}: {
  title: string
  children: React.ReactNode
  expanded: boolean
  onToggle: () => void
  badge?: string
}) {
  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        className="w-full justify-between px-2 py-1 h-8"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <ChevronDown className={cn(
          "h-3 w-3 transition-transform",
          expanded && "transform rotate-180"
        )} />
      </Button>
      
      {expanded && (
        <div className="space-y-1 pl-4">
          {children}
        </div>
      )}
    </div>
  )
}
```

## Navigation State Management

```tsx
// Navigation context for state management
const NavigationContext = createContext<{
  currentPath: string[]
  navigate: (path: string[]) => void
  goBack: () => void
  canGoBack: boolean
}>({
  currentPath: [],
  navigate: () => {},
  goBack: () => {},
  canGoBack: false,
})

function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [navigationHistory, setNavigationHistory] = useState<string[][]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  
  const currentPath = navigationHistory[currentIndex] || []
  
  const navigate = useCallback((path: string[]) => {
    setNavigationHistory(prev => [...prev.slice(0, currentIndex + 1), path])
    setCurrentIndex(prev => prev + 1)
  }, [currentIndex])
  
  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])
  
  const canGoBack = currentIndex > 0
  
  return (
    <NavigationContext.Provider 
      value={{ currentPath, navigate, goBack, canGoBack }}
    >
      {children}
    </NavigationContext.Provider>
  )
}

// Hook for using navigation state
function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider")
  }
  return context
}
```

## Keyboard Navigation

```tsx
function KeyboardNavigationHandler({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Global navigation shortcuts
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault()
            // Open command palette
            openCommandPalette()
            break
          case 'b':
            event.preventDefault()
            // Toggle sidebar
            toggleSidebar()
            break
          case '/':
            event.preventDefault()
            // Focus search
            focusSearch()
            break
          case '[':
            event.preventDefault()
            // Previous tab
            previousTab()
            break
          case ']':
            event.preventDefault()
            // Next tab
            nextTab()
            break
        }
      }
      
      // Alt key shortcuts
      if (event.altKey) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault()
            // Go back in navigation
            goBack()
            break
          case 'ArrowRight':
            event.preventDefault()
            // Go forward in navigation
            goForward()
            break
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  return <>{children}</>
}
```

## API Reference

### Navigation Components

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Sidebar` | Primary navigation | `open`, `onOpenChange`, `variant` |
| `Menubar` | Secondary actions | `className` |
| `Breadcrumb` | Location context | `separator`, `maxItems` |
| `Tabs` | Local navigation | `value`, `onValueChange` |

### Navigation Patterns

| Pattern | Use Case | Components |
|---------|----------|------------|
| App Navigation | Full application | Sidebar + Menubar + Breadcrumbs |
| Dashboard | Data-focused views | Tabs + Sidebar |
| Multi-level | Complex hierarchies | Collapsible sidebar sections |
| Mobile | Responsive design | Sheet + Simplified navigation |

## Accessibility

- Proper ARIA landmarks and navigation roles
- Keyboard navigation support (Tab, Arrow keys, shortcuts)
- Screen reader announcements for navigation changes
- Focus management when navigating between sections
- Skip links for keyboard users

## Best Practices

### Do's
- Maintain consistent navigation patterns across the app
- Use clear, descriptive labels for navigation items
- Provide multiple ways to reach important content
- Show current location clearly (active states, breadcrumbs)
- Support keyboard navigation shortcuts
- Design for mobile-first responsive navigation

### Don'ts
- Don't hide primary navigation without clear alternatives
- Don't use too many navigation levels (max 3-4)
- Don't make navigation items too small for touch devices
- Don't change navigation patterns between sections
- Don't forget to handle loading and error states

## Related Components

- [Sidebar](../organism/sidebar.md) - Primary navigation
- [Menubar](../molecular/menubar.md) - Secondary navigation
- [Breadcrumb](../molecular/breadcrumb.md) - Location awareness
- [Tabs](../molecular/tabs.md) - Local navigation
- [Button](../atomic/button.md) - Navigation triggers
