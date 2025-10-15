'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { getStoredUser, isAuthenticated } from '@/lib/auth';

interface Business {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

interface BusinessContextType {
  business: Business | null;
  businessName: string;
  loading: boolean;
  updateBusinessName: (name: string) => void;
  refreshBusiness: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};

interface BusinessProviderProps {
  children: React.ReactNode;
}

// Business name storage keys
const BUSINESS_NAME_SESSION_KEY = 'business_name';
const BUSINESS_NAME_COOKIE_KEY = 'business_name';

// Cookie utilities
const setCookie = (name: string, value: string, days = 30) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};

export const BusinessProvider: React.FC<BusinessProviderProps> = ({ children }) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load business name from storage on mount
  useEffect(() => {
    const loadStoredBusinessName = () => {
      // Try session storage first, then cookie
      let storedName = '';
      
      if (typeof window !== 'undefined') {
        storedName = sessionStorage.getItem(BUSINESS_NAME_SESSION_KEY) || '';
        
        if (!storedName) {
          storedName = getCookie(BUSINESS_NAME_COOKIE_KEY) || '';
        }
      }
      
      if (storedName) {
        setBusinessName(storedName);
        console.log('Loaded business name from storage:', storedName);
      }
    };

    loadStoredBusinessName();
  }, []);

  // Fetch business data when user is available
  useEffect(() => {
    const fetchBusiness = async () => {
      const user = getStoredUser();
      
      if (!isAuthenticated() || !user?.business_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching business data for ID:', user.business_id);
        
        // Fetch business details
        const businessData = await apiClient.request(`/businesses/${user.business_id}`);
        
        setBusiness(businessData);
        
        // Update business name if we got new data
        if (businessData?.name) {
          updateBusinessNameInStorage(businessData.name);
        }
        
      } catch (error) {
        console.error('Failed to fetch business data:', error);
        // Don't clear existing name if fetch fails
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, []);

  const updateBusinessNameInStorage = (name: string) => {
    setBusinessName(name);
    
    if (typeof window !== 'undefined') {
      // Store in session storage
      sessionStorage.setItem(BUSINESS_NAME_SESSION_KEY, name);
      
      // Store in cookie (for persistence across sessions)
      setCookie(BUSINESS_NAME_COOKIE_KEY, name);
      
      console.log('Updated business name in storage:', name);
    }
  };

  const updateBusinessName = (name: string) => {
    updateBusinessNameInStorage(name);
    
    // Also update the business object if we have one
    if (business) {
      setBusiness({ ...business, name });
    }
  };

  const refreshBusiness = async () => {
    const user = getStoredUser();
    
    if (!isAuthenticated() || !user?.business_id) {
      return;
    }

    try {
      setLoading(true);
      const businessData = await apiClient.request(`/businesses/${user.business_id}`);
      
      setBusiness(businessData);
      
      if (businessData?.name) {
        updateBusinessNameInStorage(businessData.name);
      }
      
    } catch (error) {
      console.error('Failed to refresh business data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear business data when user logs out
  useEffect(() => {
    const clearBusinessData = () => {
      setBusiness(null);
      setBusinessName('');
      
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(BUSINESS_NAME_SESSION_KEY);
        deleteCookie(BUSINESS_NAME_COOKIE_KEY);
        console.log('Cleared business data from context');
      }
    };

    const checkAuthAndClearIfNeeded = () => {
      const user = getStoredUser();
      
      if (!isAuthenticated() || !user) {
        clearBusinessData();
      }
    };

    // Check immediately on mount
    checkAuthAndClearIfNeeded();

    // Listen for auth-cleared custom event
    const handleAuthCleared = () => {
      clearBusinessData();
    };

    // Listen for storage changes (when auth is cleared from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuthAndClearIfNeeded();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth-cleared', handleAuthCleared);
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth-cleared', handleAuthCleared);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []);

  return (
    <BusinessContext.Provider
      value={{
        business,
        businessName,
        loading,
        updateBusinessName,
        refreshBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};