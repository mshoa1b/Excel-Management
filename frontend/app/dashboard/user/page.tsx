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
import type { Stats, Sheet } from '@/types';
import { FileSpreadsheet, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';

export default function UserDashboard() {
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
      <ProtectedRoute requiredRole="User">
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="User">
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              {user?.business?.name ? `${user.business.name} Dashboard` : 'User Dashboard'}
            </h1>
            <p className="text-slate-600">View your business operations and analytics</p>
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
                title="Total Refund Amount"
                value={formatCurrency(stats.totalRefundAmount ?? 0)}
                description="This period"
                icon={DollarSign}
              />
              <StatsCard
                title="Unique Orders"
                value={stats.uniqueOrders ?? 0}
                description="Distinct order numbers"
                icon={TrendingUp}
              />
              <StatsCard
                title="Average Refund"
                value={
                  stats.uniqueOrders > 0
                    ? formatCurrency((stats.totalRefundAmount ?? 0) / stats.uniqueOrders)
                    : formatCurrency(0)
                }
                description="Per order"
                icon={DollarSign}
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  Manage Returns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-600 text-sm">
                  Access and manage return sheets, view order details, and process refunds.
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">
                    Business ID: {bizId}
                  </span>
                  <Link href={`/sheets/${bizId}`}>
                    <Button className="group">
                      View Sheets
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Information */}
          {user?.business && (
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Business Name</p>
                    <p className="text-slate-600">{user.business.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Business ID</p>
                    <p className="text-slate-600">{user.business.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Currency</p>
                    <p className="text-slate-600">
                      {user.business.currency_symbol} ({user.business.currency_code})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Your Role</p>
                    <p className="text-slate-600">{user.role?.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
