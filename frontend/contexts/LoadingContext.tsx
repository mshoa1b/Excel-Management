'use client';

/**
 * Global Loading Context
 * 
 * This context provides a global loading state that shows a full-screen loader
 * to improve UX by eliminating the "dead time" between user actions and feedback.
 * 
 * Usage:
 * 1. Navigation: Use the custom useRouter hook from @/hooks/useRouter
 * 2. Links: Use LoadingLink component from @/components/ui/loading-link
 * 3. Manual control: Use useLoading hook's setLoading function
 * 4. Async actions: Use useAsyncAction hook for wrapped async operations
 * 
 * The loader automatically stops when the route changes (pathname changes).
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import useChunkErrorHandler from '@/hooks/useChunkErrorHandler';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  startNavigation: () => void;
  stopNavigation: () => void;
  forceStop: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: React.ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // Handle chunk loading errors globally
  useChunkErrorHandler();

  // Stop loading when route changes
  useEffect(() => {
    setIsLoading(false);
  }, [pathname]);

  // Also handle browser navigation events
  useEffect(() => {
    const handleBeforeUnload = () => setIsLoading(false);
    const handlePopState = () => setIsLoading(false);
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Auto-stop loading after a timeout to prevent infinite loops
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.warn('Loading state auto-stopped after timeout');
        setIsLoading(false);
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading]);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const startNavigation = () => {
    setIsLoading(true);
  };

  const stopNavigation = () => {
    setIsLoading(false);
  };

  // Emergency stop function - can be called from anywhere
  const forceStop = () => {
    console.log('Loading force stopped');
    setIsLoading(false);
  };

  // Add keyboard shortcut to force stop loading (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLoading) {
        console.log('Loading stopped by Escape key');
        setIsLoading(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLoading]);

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        setLoading,
        startNavigation,
        stopNavigation,
        forceStop,
      }}
    >
      {children}
      {isLoading && <GlobalLoader />}
    </LoadingContext.Provider>
  );
};

const GlobalLoader: React.FC = () => {
  const { forceStop } = useLoading();
  
  return (
    <div 
      className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-6"
      onClick={forceStop}
    >
      <div className="flex flex-col items-center space-y-4 bg-white p-12 rounded-lg shadow-lg border">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-slate-600 font-medium">Loading...</p>
        <p className="text-slate-400 text-sm">Please wait while we process your request</p>
        <p className="text-slate-400 text-xs mt-2">Press Escape or click to cancel</p>
      </div>
    </div>
  );
};