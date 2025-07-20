
import type {Metadata} from 'next';
// Font imports removed for offline build
import './globals.css';
import AdvancedConditionalLayout from '@/components/layout/AdvancedConditionalLayout';
import { GlobalLoadingIndicator } from '@/components/ui/global-loading';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { NoSSR } from '@/components/providers/NoSSR';

export const metadata: Metadata = {
  title: 'DomainFlow',
  description: 'Campaign-driven domain generation, validation, and lead management.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <NoSSR fallback={
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        }>
          <ThemeProvider defaultTheme="dark" storageKey="domainflow-theme">
            <GlobalLoadingIndicator />
            <AdvancedConditionalLayout>
              {children}
            </AdvancedConditionalLayout>
          </ThemeProvider>
        </NoSSR>
      </body>
    </html>
  );
}
