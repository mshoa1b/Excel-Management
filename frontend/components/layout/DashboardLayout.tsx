'use client';

import Navigation from './Navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <div className="lg:pl-64">
        <main className="py-6 px-4 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}