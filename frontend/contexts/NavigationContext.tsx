'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  isNavCollapsed: boolean;
  setIsNavCollapsed: (collapsed: boolean) => void;
  getNavWidth: () => number;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);

  const getNavWidth = () => {
    return isNavCollapsed ? 64 : 256; // 16 * 4 = 64px, 64 * 4 = 256px
  };

  return (
    <NavigationContext.Provider value={{
      isNavCollapsed,
      setIsNavCollapsed,
      getNavWidth
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}