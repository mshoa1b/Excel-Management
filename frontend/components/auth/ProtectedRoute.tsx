'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Minimum role required to view the page
  requiredRole?: 'Superadmin' | 'Business Admin' | 'User';
  // If the page is scoped to a specific business, pass its id
  businessId?: string | number;
}

const ROLE_ORDER = ['User', 'Business Admin', 'Superadmin'] as const;
type RoleName = (typeof ROLE_ORDER)[number];

function normalizeRoleName(n?: string | null): RoleName | undefined {
  const s = String(n || '').trim().toLowerCase();
  if (s === 'superadmin') return 'Superadmin';
  if (s === 'business admin') return 'Business Admin';
  if (s === 'user') return 'User';
  return undefined;
}

function roleRank(n?: string | null): number {
  const norm = normalizeRoleName(n);
  return norm ? ROLE_ORDER.indexOf(norm) : -1;
}

function satisfiesRole(required?: RoleName, actual?: string | null): boolean {
  if (!required) return true;
  const need = ROLE_ORDER.indexOf(required);
  const have = roleRank(actual);
  return have >= 0 && need >= 0 && have >= need;
}

export default function ProtectedRoute({ children, requiredRole, businessId }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const redirectedRef = useRef(false);

  // Normalize role and business ids
  const roleName = normalizeRoleName(user?.role?.name);
  const normRouteBizId = businessId != null ? String(businessId) : null;
  // Treat empty string as no business
  const normUserBizId = user?.business_id ? String(user.business_id) : null;

  const canAccess = useMemo(() => {
    if (!user) return false;

    // Role hierarchy check
    if (!satisfiesRole(requiredRole, roleName)) return false;

    // Superadmin can access everything
    if (roleName === 'Superadmin') return true;

    // If page is business-scoped, BA/User must match that business
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

    // Logged in but not authorized
    if (!canAccess) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        router.replace('/unauthorized');
      }
      return;
    }

    // Authorized
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
