'use client';

import React, { useEffect, memo, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { WebSocketStatusProvider } from '@/contexts/WebSocketStatusContext';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '@/components/ui/sidebar';
import { Home, Target, Users, Settings, Zap, Database, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { websocketService } from '@/lib/services/websocketService.simple';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Navigation menu items
const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home
  },
  {
    title: "Campaigns",
    url: "/campaigns",
    icon: Target
  },
  {
    title: "Personas",
    url: "/personas",
    icon: Users
  },
  {
    title: "Proxies",
    url: "/proxies",
    icon: Zap
  },
  {
    title: "Keywords",
    url: "/keywords",
    icon: Database
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings
  }
];

// Memoized sidebar component to prevent unnecessary re-renders
const AppSidebar = memo(() => {
  const { user, logout, isLoading, isAuthenticated } = useAuth();

  // Always show all navigation items - middleware ensures user is authenticated
  const filteredItems = useMemo(() => {
    // Middleware guarantees authentication, so always show full navigation
    return navigationItems;
  }, []);

  // Memoize logout handler to prevent re-creation on every render
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold">DomainFlow</h2>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.email}</span>
            <span className="text-xs text-muted-foreground">
              {isLoading ? 'Loading...' : (user?.isActive !== false ? 'Active User' : 'Inactive User')}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-accent"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
});

AppSidebar.displayName = 'AppSidebar';

// Memoized main layout component for optimal performance
const AppLayout = memo(({ children }: AppLayoutProps) => {
  const pathname = usePathname();


  // Optimized WebSocket cleanup with proper lifecycle management
  useEffect(() => {
    // Cleanup function for WebSocket services
    return () => {
      console.log('[AppLayout] Cleaning up global WebSocket services');
      try {
        websocketService.disconnectAll();
      } catch (error) {
        console.error('[AppLayout] Error during WebSocket cleanup:', error);
      }
    };
  }, []);

  // SECURITY: Isolated routes that should bypass the main app layout
  const isolatedRoutes = ['/dbgui'];
  const isIsolatedRoute = isolatedRoutes.some(route => pathname?.startsWith(route));

  // If this is an isolated route (like dbgui), render children directly without any app layout
  if (isIsolatedRoute) {
    console.log('[AppLayout] 🔒 SECURITY: Isolated route detected, bypassing main app layout:', pathname);
    return <>{children}</>;
  }

  return (
    <WebSocketStatusProvider>
      <SidebarProvider>
        <div className="min-h-screen bg-background flex" suppressHydrationWarning>
          <AppSidebar />
          
          {/* Main content area with optimized structure */}
          <main className="flex-1 flex flex-col">
            <div className="p-4 border-b">
              <SidebarTrigger className="lg:hidden" />
            </div>
            <div className="flex-1 p-6">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </WebSocketStatusProvider>
  );
});

AppLayout.displayName = 'AppLayout';

export default AppLayout;