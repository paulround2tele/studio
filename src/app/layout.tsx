
import type {Metadata} from 'next';
// Font imports removed for offline build
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import ConditionalLayout from '@/components/layout/ConditionalLayout';
import { GlobalLoadingIndicator } from '@/components/ui/global-loading';


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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        <GlobalLoadingIndicator />
        <AuthProvider>
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
