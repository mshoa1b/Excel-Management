import './globals.css';
import type { Metadata } from 'next';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NotificationProvider } from '@/contexts/NotificationContext';

export const metadata: Metadata = {
  title: 'Techezm RMA',
  description: 'Multi-tenant SaaS platform for business management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className="font-sans">
        <ErrorBoundary>
          <LoadingProvider>
            <BusinessProvider>
              <NavigationProvider>
                <NotificationProvider>
                  {children}
                </NotificationProvider>
              </NavigationProvider>
            </BusinessProvider>
          </LoadingProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}