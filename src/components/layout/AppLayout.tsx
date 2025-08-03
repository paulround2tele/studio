'use client';

import React, { memo, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '@/components/ui/sidebar';
import { Home, Target, Users, Settings, Zap, Database, LogOut } from 'lucide-react';
import Link from 'next/link';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
import { useCachedAuth } from '@/lib/hooks/useCachedAuth';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Navigation menu items
const navigationItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Campaigns', href: '/campaigns', icon: Target },
  { label: 'Personas', href: '/personas', icon: Users },
  { label: 'Keyword Sets', href: '/keyword-sets', icon: Settings },
  { label: 'Proxies', href: '/proxies', icon: Zap },
];

const otherItems = [
  { label: 'Database', href: '/dbgui', icon: Database, external: true },
];

const AppSidebar = memo(() => {
  const { logout } = useCachedAuth();
  const pathname = usePathname();

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const isActive = useCallback((href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname?.startsWith(href) || false;
  }, [pathname]);

  const sidebarItems = useMemo(() => (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive(item.href)}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {otherItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  ), [isActive]);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-4">
          <h2 className="text-lg font-semibold">DomainFlow</h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sidebarItems}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
});

AppSidebar.displayName = 'AppSidebar';

const AppLayout = memo(({ children }: AppLayoutProps) => {
  const pathname = usePathname();

  // No WebSocket cleanup needed - handled by WebSocketProvider
  // Removed elasticWebSocketService.disconnectAll() as part of TASK-WS-004

  // SECURITY: Isolated routes that should bypass the main app layout
  const isolatedRoutes = ['/dbgui'];
  const isIsolatedRoute = isolatedRoutes.some(route => pathname?.startsWith(route));

  if (isIsolatedRoute) {
    return <>{children}</>;
  }

  return (
    <WebSocketProvider>
      <SidebarProvider>
        <div className="flex h-screen">
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
    </WebSocketProvider>
  );
});

AppLayout.displayName = 'AppLayout';

export default AppLayout;
