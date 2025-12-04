'use client';

import { useEffect, useState } from 'react';
import Navigation from './Navigation';
import { useNavigation } from '@/contexts/NavigationContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isNavCollapsed } = useNavigation();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const getLeftPadding = () => {
    if (!isDesktop) return '0px';
    return isNavCollapsed ? '64px' : '256px';
  };

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <div
          className="transition-all duration-300"
          style={{ paddingLeft: getLeftPadding() }}
        >
          <main className="py-6 px-4 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}