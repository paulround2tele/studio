'use client';

import React, { memo } from 'react';
import { usePathname } from 'next/navigation';
import TailAdminLayout from '@/layout/TailAdminLayout';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = memo(({ children }: AppLayoutProps) => {
  const pathname = usePathname();

  // SECURITY: Isolated routes that should bypass the main app layout
  const isolatedRoutes = ['/dbgui'];
  const isIsolatedRoute = isolatedRoutes.some(route => pathname?.startsWith(route));

  if (isIsolatedRoute) {
    return <>{children}</>;
  }

  return (
    <TailAdminLayout>
      {children}
    </TailAdminLayout>
  );
});

AppLayout.displayName = 'AppLayout';

export default AppLayout;
