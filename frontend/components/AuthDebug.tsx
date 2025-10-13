'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export default function AuthDebug() {
  const { user, token, loading } = useAuth();

  useEffect(() => {
    console.log('Auth Debug:', {
      loading,
      user,
      token: token ? 'Present' : 'Missing',
      userRole: user?.role?.name,
      businessId: user?.business_id
    });
  }, [user, token, loading]);

  if (loading) return <div>Loading auth...</div>;

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="font-bold">Auth Debug Info:</h3>
      <p>Loading: {loading.toString()}</p>
      <p>User: {user ? user.username : 'null'}</p>
      <p>Role: {user?.role?.name || 'none'}</p>
      <p>Business ID: {user?.business_id || 'none'}</p>
      <p>Token: {token ? 'Present' : 'Missing'}</p>
    </div>
  );
}