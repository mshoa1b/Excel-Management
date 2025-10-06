'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import type { Business, User } from '@/types';
import { Building2, Users, UserCheck, Activity } from 'lucide-react';

export default function SuperadminDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bizData, userData] = await Promise.all([
          apiClient.getBusinesses(), // SuperAdmin only
          apiClient.getUsers(),      // SuperAdmin sees all
        ]);
        if (cancelled) return;
        setBusinesses(Array.isArray(bizData) ? bizData : []);
        setUsers(Array.isArray(userData) ? userData : []);
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const businessAdmins = useMemo(
    () => users.filter(u => u.role?.name === 'Business Admin'),
    [users]
  );
  const regularUsers = useMemo(
    () => users.filter(u => u.role?.name === 'User'),
    [users]
  );

  // Small helpers
  const safeDate = (value: any) => {
    // Backend didn’t send created_at; show “—” gracefully
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="Superadmin">
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="Superadmin">
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Superadmin Dashboard</h1>
            <p className="text-slate-600">Overview of all businesses and users in the system</p>
          </div>

          {err && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {err}
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Businesses"
              value={businesses.length}
              description="Active businesses"
              icon={Building2}
            />
            <StatsCard
              title="Total Users"
              value={users.length}
              description="All registered users"
              icon={Users}
            />
            <StatsCard
              title="Business Admins"
              value={businessAdmins.length}
              description="Admin users"
              icon={UserCheck}
            />
            <StatsCard
              title="Regular Users"
              value={regularUsers.length}
              description="Standard users"
              icon={Activity}
            />
          </div>

          {/* Recent Businesses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Businesses</CardTitle>
              <Link href="/admin/businesses">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {businesses.slice(0, 5).map((b: any) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{b.name}</p>
                      <p className="text-sm text-slate-500">
                        ID: {b.id}
                        {b.owner_username ? ` • Owner: ${b.owner_username}` : ''}
                        {typeof b.user_count === 'number' ? ` • Users: ${b.user_count}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">
                        Created {safeDate(b.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {businesses.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No businesses found</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Users</CardTitle>
              <Link href="/admin/users">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.slice(0, 5).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{u.username}</p>
                      <p className="text-sm text-slate-500">{u.role?.name || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">
                        Created {safeDate((u as any).created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No users found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
