"use client";

import React from "react";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import Backdrop from "./Backdrop";

interface TailAdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Inner layout component that consumes sidebar context.
 * Separated to allow useSidebar hook usage within SidebarProvider.
 */
function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isExpanded, isHovered } = useSidebar();
  
  // Determine margin based on sidebar state
  // Expanded or hovered = 290px, collapsed = 90px
  const sidebarWidth = isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      {/* Sidebar */}
      <AppSidebar />
      
      {/* Mobile backdrop */}
      <Backdrop />
      
      {/* Main content area - margin adjusts based on sidebar state */}
      <div className={`flex-1 flex flex-col ${sidebarWidth} transition-all duration-300 ease-in-out`}>
        {/* Header */}
        <AppHeader />
        
        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900">
          <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * TailAdmin-based layout wrapper.
 * This replaces the old AppLayout with TailAdmin's polished sidebar/header system.
 * DomainFlow business logic (auth, redux, etc.) is injected via providers in root layout.
 */
export default function TailAdminLayout({ children }: TailAdminLayoutProps) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  );
}
