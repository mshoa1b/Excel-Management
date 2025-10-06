'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { getStoredUser, getStoredToken, clearAuth } from '@/lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = getStoredUser();
      const storedToken = getStoredToken();

      if (!storedUser || !storedToken) {
        // Clear partial/invalid data
        clearAuth();
        setUser(null);
        setToken(null);
      } else {
        setUser(storedUser);
        setToken(storedToken);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { user, token, loading };
};
