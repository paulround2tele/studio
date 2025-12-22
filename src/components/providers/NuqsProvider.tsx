/**
 * NuqsProvider - URL state synchronization adapter for Next.js App Router
 * 
 * This provider enables nuqs URL state management throughout the application.
 * Must wrap the component tree that uses URL-synced state.
 * 
 * @see https://nuqs.47ng.com/docs/adapters/next-app
 */

'use client';

import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { ReactNode } from 'react';

interface NuqsProviderProps {
  children: ReactNode;
}

export function NuqsProvider({ children }: NuqsProviderProps) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}

export default NuqsProvider;
