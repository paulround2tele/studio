"use client";

import React from "react";
import { SidebarProvider } from "@/contexts/SidebarContext";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import Backdrop from "./Backdrop";

interface TailAdminLayoutProps {
  children: React.ReactNode;
}

/**
 * TailAdmin-based layout wrapper.
 * This replaces the old AppLayout with TailAdmin's polished sidebar/header system.
 * DomainFlow business logic (auth, redux, etc.) is injected via providers in root layout.
 */
export default function TailAdminLayout({ children }: TailAdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen xl:flex">
        {/* Sidebar */}
        <AppSidebar />
        
        {/* Mobile backdrop */}
        <Backdrop />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col lg:ml-[290px] transition-all duration-300">
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
    </SidebarProvider>
  );
}
