'use client';

import React from 'react';
import { VisionTopNav } from '../vision/VisionTopNav';
import { useAuth } from '@/hooks/useAuth';

interface DashboardLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function DashboardLayout({ children, fullWidth = true }: DashboardLayoutProps) {
  // We ignore fullWidth prop now as everything is effectively full width 
  // but keeping it in interface for backward compatibility with existing usages
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-dashboard-gradient-lines flex items-center justify-center">Loading...</div>;
  }

  if (!user) return null; // Or redirect

  return (
    <div className="min-h-screen w-full dashboard-gradient-bg-light dark:dashboard-gradient-bg-dark flex flex-col overflow-hidden">
      {/* Top Navigation Fixed Bar */}
      <VisionTopNav />

      {/* Main Content Area - Full Viewport, No Padding */}
      <main className="flex-1 w-full relative overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {children}
      </main>
    </div>
  );
}