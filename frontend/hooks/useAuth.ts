'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { getStoredUser, getStoredToken } from '@/lib/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getStoredUser();
    const storedToken = getStoredToken();
    
    setUser(storedUser);
    setToken(storedToken);
    setLoading(false);
  }, []);

  return { user, token, loading };
};