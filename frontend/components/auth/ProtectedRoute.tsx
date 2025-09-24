'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;       // e.g. 'Superadmin' | 'Business Admin' | 'User'
  businessId?: string | number; // route param like '1'
}

export default function ProtectedRoute({ children, requiredRole, businessId }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const redirectedRef = useRef(false); // avoid double redirects

  // Normalize values once
  const roleName = user?.role?.name;
  const normRouteBizId = businessId != null ? String(businessId) : null;
  const normUserBizId = user?.business_id != null ? String(user.business_id) : null;

  const canAccess = useMemo(() => {
    if (!user) return false;

    // If a specific role is required, check that first
    if (requiredRole && roleName !== requiredRole) return false;

    // Superadmin can access everything
    if (roleName === 'Superadmin') return true;

    // If the page is business-scoped, user must belong to that business
    if (normRouteBizId) return normUserBizId === normRouteBizId;

    // Otherwise any logged-in user is fine
    return true;
  }, [user, roleName, requiredRole, normRouteBizId, normUserBizId]);

  useEffect(() => {
    if (loading) return;

    // Not logged in
    if (!user) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.replace('/login');
      }
      return;
    }

    if (!canAccess) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.replace('/unauthorized');
      }
      return;
    }

    setAuthorized(true);
  }, [user, canAccess, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}
