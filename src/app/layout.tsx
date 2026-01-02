
import type {Metadata} from 'next';
import { cookies } from 'next/headers';
import { SESSION_CONFIG } from '@/lib/constants';
import { getCachedHasSession, setCachedHasSession } from '@/server/authCookieCache';
// Font imports removed for offline build
import './globals.css';
import AdvancedConditionalLayout from '@/components/layout/AdvancedConditionalLayout';
import { GlobalLoadingIndicator } from '@/components/ui/global-loading';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { TAThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ReduxProvider } from '@/components/providers/ReduxProvider';
import { NuqsProvider } from '@/components/providers/NuqsProvider';
import { RTKCampaignDataProvider } from '@/providers/RTKCampaignDataProvider';
import NetworkRequestLogger from '@/components/debug/NetworkRequestLogger';

export const metadata: Metadata = {
  title: 'DomainFlow',
  description: 'Campaign-driven domain generation, validation, and lead management.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side: peek at the session cookie for a lightweight hint
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_CONFIG.SESSION_COOKIE_NAME)?.value;
  let hasSession = getCachedHasSession(sessionCookie);
  if (hasSession === null) {
    hasSession = Boolean(sessionCookie && sessionCookie.length > 0);
    setCachedHasSession(sessionCookie, hasSession);
  }
  return (
    <html lang="en" suppressHydrationWarning data-has-session={hasSession ? '1' : '0'}>
      <body className="font-sans antialiased bg-gray-50 dark:bg-gray-900" suppressHydrationWarning>
        {process.env.NEXT_PUBLIC_ENABLE_NETWORK_LOGGING === 'true' ? <NetworkRequestLogger /> : null}
        <ReduxProvider>
          <NuqsProvider>
            <ThemeProvider defaultTheme="dark" storageKey="domainflow-theme">
              <TAThemeProvider>
                <AuthProvider>
                  <RTKCampaignDataProvider>
                    <GlobalLoadingIndicator />
                    <AdvancedConditionalLayout>
                      {children}
                    </AdvancedConditionalLayout>
                  </RTKCampaignDataProvider>
                </AuthProvider>
              </TAThemeProvider>
            </ThemeProvider>
          </NuqsProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
