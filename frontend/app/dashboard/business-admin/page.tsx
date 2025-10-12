'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { apiClient } from '@/lib/api';
import type { Stats } from '@/types';
import { FileSpreadsheet, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';



export default function BusinessAdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { formatCurrency } = useCurrency(user?.business_id || '');
  const [stats, setStats] = useState<Stats | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const bizId = useMemo(
    () => (user?.business_id != null ? String(user.business_id) : null),
    [user?.business_id]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!bizId) {
      setDataLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setDataLoading(true);
      setError("");
      try {
        const statsData = await apiClient.getStats(bizId, '1m');
        if (cancelled) return;
        setStats(statsData);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, bizId]);

  // Show a nice loader while either auth or data is loading
  if (authLoading || dataLoading) {
    return (
      <ProtectedRoute requiredRole="Business Admin">
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="Business Admin">
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              {user?.business?.name ? `${user.business.name} Dashboard` : 'Business Admin Dashboard'}
            </h1>
            <p className="text-slate-600">Manage your business operations and view analytics</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Orders"
                value={stats.totalOrders ?? 0}
                description="This period"
                icon={FileSpreadsheet}
              />
              <StatsCard
                title="Total Refunds"
                value={formatCurrency(Number(stats.totalRefundAmount ?? 0))}
                description="This period"
                icon={DollarSign}
              />
              <StatsCard
                title="Average Refund"
                value={formatCurrency(Number(stats.averageRefundAmount ?? 0))}
                description="Per order"
                icon={TrendingUp}
              />
              <StatsCard
                title="Unique Orders"
                value={stats.uniqueOrders ?? 0}
                description="Deduped by order no."
                icon={FileSpreadsheet}
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  <span>Returns Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">Create, edit, and manage all your business returns</p>
                <Link href={bizId ? `/sheets/${bizId}` : '#'} aria-disabled={!bizId}>
                  <Button className="w-full" disabled={!bizId}>
                    Manage Returns
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-teal-600" />
                  <span>Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">View detailed statistics and insights</p>
                <Link href={bizId ? `/stats/${bizId}` : '#'} aria-disabled={!bizId}>
                  <Button variant="outline" className="w-full" disabled={!bizId}>
                    View Analytics
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
