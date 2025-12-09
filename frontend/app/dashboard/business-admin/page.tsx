'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/contexts/BusinessContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { VisionSectionHeader } from '@/components/vision/VisionSectionHeader';
import { VisionKpiOrbit } from '@/components/vision/VisionKpiOrbit';
import { VisionInsightCanvas } from '@/components/vision/VisionInsightCanvas';
import { apiClient } from '@/lib/api';
import { Stats, Role } from '@/types';
import { format } from 'date-fns';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip } from 'recharts';

// KPI Card data structure
interface KpiMetric {
  label: string;
  value: string;
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' };
  subValue?: string;
}

export default function BusinessAdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { business } = useBusiness();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('1m');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const fetchStats = async () => {
      if (business?.id) {
        setLoading(true);
        try {
          const data = await apiClient.getStats(business.id, range);
          setStats(data);
        } catch (error) {
          console.error("Failed to fetch stats", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchStats();
  }, [business, range]);

  if (authLoading || !user || !business) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute requiredRole="Business Admin">
      <DashboardLayout>
        <div className="w-full flex flex-col gap-8">

          <VisionSectionHeader
            title={`Overview: ${business.name}`}
            description={`Performance snapshot for the last ${range === '1m' ? '30 days' : range === '3m' ? '3 months' : range}`}
            actions={
              <div className="bg-white/50 dark:bg-slate-800/50 p-1 rounded-lg flex gap-1 shadow-sm">
                {['1m', '3m', '6m', '1y'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${range === r ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            }
          />

          {/* KPI ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <VisionKpiOrbit
              label="Total Orders"
              value={stats?.totalOrders.toString() || '0'}
              subValue="Processed Returns"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <VisionKpiOrbit
              label="Refund Value"
              value={`$${stats?.totalRefundAmount?.toLocaleString() || '0'}`}
              subValue={`${stats?.averageRefundAmount ? `Avg $${Math.floor(stats.averageRefundAmount)}` : '$0 avg'}`}
              icon={<TrendingDown className="w-4 h-4 text-emerald-500" />}
            />
            <VisionKpiOrbit
              label="Orders (30 Days)"
              value={stats?.ordersWithin30Days.toString() || '0'}
              subValue="Recent Volume"
            />
            <VisionKpiOrbit
              label="Warranty Status"
              value={stats?.outOfWarrantyReturns.toString() || '0'}
              subValue="Out of Warranty"
              trend={{ direction: 'neutral' }}
            />
          </div>

          {/* MAIN CHARTS ROW */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[400px]">
            <VisionInsightCanvas
              title="Return Volume Trends"
              description="Daily processing volume"
              className="xl:col-span-2"
              loading={loading}
              toolbar={
                <button
                  onClick={() => router.push(`/stats/${business.id}`)}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  View Full Analytics &rarr;
                </button>
              }
            >
              <div className="w-full h-full">
                {stats && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      /* Mock data shape based on stats - normally we'd fetch trends here */
                      { name: 'Week 1', value: Math.floor(stats.totalOrders * 0.2) },
                      { name: 'Week 2', value: Math.floor(stats.totalOrders * 0.3) },
                      { name: 'Week 3', value: Math.floor(stats.totalOrders * 0.1) },
                      { name: 'Week 4', value: Math.floor(stats.totalOrders * 0.4) },
                    ]}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                {!stats && !loading && (
                  <div className="flex h-full items-center justify-center text-slate-400 text-sm">No data available</div>
                )}
              </div>
            </VisionInsightCanvas>

            <VisionInsightCanvas
              title="Quick Actions"
              description="Common management tasks"
            >
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => router.push('/sheets')} className="p-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-semibold transition-colors text-left flex items-center justify-between group">
                  <span>Manage Returns</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                </button>
                <button onClick={() => router.push(`/stats/${business.id}`)} className="p-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold transition-colors text-left flex items-center justify-between group">
                  <span>View Analytics Board</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">&rarr;</span>
                </button>
              </div>
            </VisionInsightCanvas>
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
