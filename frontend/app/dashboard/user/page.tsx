'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/contexts/BusinessContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { VisionSectionHeader } from '@/components/vision/VisionSectionHeader';
import { VisionKpiOrbit } from '@/components/vision/VisionKpiOrbit';
import { VisionRadarCard } from '@/components/vision/VisionRadarCard';
import { VisionInsightCanvas } from '@/components/vision/VisionInsightCanvas';
import { apiClient } from '@/lib/api';
import { AdvancedStats, Stats } from '@/types';
import { Loader2, Activity, CheckCircle, Clock, ShieldAlert, MessageSquare, Package, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { useRouter } from 'next/navigation';

export default function UserDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: businessLoading } = useBusiness();
  const [stats, setStats] = useState<Stats | null>(null);
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);
  const [enquiryStats, setEnquiryStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadDashboardData = async () => {
      if (business?.id && user?.username) {
        setLoading(true);
        try {
          // Fetch Basic Stats (for pending/in-progress counts)
          const basic = await apiClient.getStats(business.id, '1y');
          setStats(basic);

          // Fetch Advanced Stats (for status breakdown and lock analysis)
          const advanced = await apiClient.getAdvancedStats(business.id, '1y');
          setAdvancedStats(advanced);

          // Fetch Enquiry Stats
          try {
            const enquiriesData = await apiClient.getEnquiries({ limit: 1 });
            setEnquiryStats(enquiriesData.stats || {});
          } catch (err) {
            console.error("Enquiry fetch failed", err);
          }

        } catch (error) {
          console.error("Failed to fetch dashboard data", error);
        } finally {
          setLoading(false);
        }
      } else if (!businessLoading && !business) {
        setLoading(false);
      }
    };

    if (!businessLoading) {
      loadDashboardData();
    }
  }, [business, user, businessLoading]);

  if (authLoading || businessLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || !business) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <div className="p-4 rounded-full bg-red-50 text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Account Not Configured</h3>
          <p className="text-slate-500 max-w-md text-center">
            Your account is not associated with a valid business entity.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // --- LOGIC ---
  const isCsUser = user.username.toLowerCase().startsWith('cs');

  // Metrics Calculation
  const unresolvedOrders = (stats?.pendingOrders || 0) + (stats?.inProgressOrders || 0);

  // Helper to find status count from AdvancedStats
  const getStatusCount = (statusName: string) => {
    return advancedStats?.statusBreakdown?.find(s => s.status === statusName)?.count || 0;
  };

  // KPI DATA
  let kpi1 = { label: '', value: 0, sub: '', icon: <Activity className="w-4 h-4 text-orange-500" /> };
  let kpi2 = { label: '', value: 0, sub: '', icon: <CheckCircle className="w-4 h-4 text-blue-500" /> };
  let kpi3 = { label: '', value: 0, sub: '', icon: <MessageSquare className="w-4 h-4 text-purple-500" /> };

  if (isCsUser) {
    // CS USER VIEW
    kpi1 = {
      label: 'Awaiting Techezm',
      value: getStatusCount('Awaiting Techezm'),
      sub: 'Orders Actionable',
      icon: <Clock className="w-4 h-4 text-blue-500" />
    };

    const pinCount = advancedStats?.lockAnalysis?.passcode_count || 0;
    const appleIdCount = advancedStats?.lockAnalysis?.apple_id_count || 0;

    kpi2 = {
      label: 'PIN / Apple ID',
      value: pinCount + appleIdCount,
      sub: 'Locked Devices',
      icon: <ShieldAlert className="w-4 h-4 text-red-500" />
    };

    kpi3 = {
      label: 'Enquiries Pending',
      value: enquiryStats?.awaitingTechezm || 0,
      sub: 'Awaiting Response',
      icon: <MessageSquare className="w-4 h-4 text-purple-500" />
    };

  } else {
    // BUSINESS/REGULAR USER VIEW
    kpi1 = {
      label: 'Awaiting G&I',
      value: getStatusCount('Awaiting G&I'),
      sub: 'Processing',
      icon: <Loader2 className="w-4 h-4 text-indigo-500" />
    };

    kpi2 = {
      label: 'Awaiting Replacement',
      value: getStatusCount('Awaiting Replacement'),
      sub: 'Replacement Queue',
      icon: <Package className="w-4 h-4 text-blue-500" />
    };

    kpi3 = {
      label: 'Enquiries Pending',
      value: enquiryStats?.awaitingBusiness || 0,
      sub: 'Action Required',
      icon: <MessageSquare className="w-4 h-4 text-orange-500" />
    };
  }

  return (
    <ProtectedRoute requiredRole="User">
      <DashboardLayout>
        <div className="w-full flex flex-col gap-6">
          <VisionSectionHeader
            title={`Welcome, ${user.username}`}
            description="Your operational dashboard"
          />

          {/* MAIN KPI ROW */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Common Metric: Total Unresolved */}
            <VisionKpiOrbit
              label="Unresolved Orders"
              value={unresolvedOrders.toString()}
              subValue="Total Active Pipeline"
              icon={<Activity className="w-4 h-4 text-slate-500" />}
            />

            {/* Dynamic Metrics */}
            <VisionKpiOrbit
              label={kpi1.label}
              value={kpi1.value.toString()}
              subValue={kpi1.sub}
              icon={kpi1.icon}
            />

            <VisionKpiOrbit
              label={kpi2.label}
              value={kpi2.value.toString()}
              subValue={kpi2.sub}
              icon={kpi2.icon}
            />

            <VisionKpiOrbit
              label={kpi3.label}
              value={kpi3.value.toString()}
              subValue={kpi3.sub}
              icon={kpi3.icon}
            />
          </div>

          {/* ACTION AREA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              onClick={() => router.push(`/sheets/${business.id}`)}
              className="group relative overflow-hidden rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            >
              {/* Clean Glass Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />

              {/* Content */}
              <div className="relative p-8 h-48 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                    <FileSpreadsheet className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-white/60 text-sm font-semibold tracking-wider uppercase">Quick Access</span>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white mb-1 group-hover:translate-x-1 transition-transform">Manage Returns Sheet</h3>
                  <div className="flex items-center gap-2 text-blue-100/80 text-sm font-medium">
                    <span>Access full database</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Global Stats (Optional Context) */}
            <div className="bg-white/50 dark:bg-slate-900/50 rounded-3xl p-6 border border-white/10 backdrop-blur-md flex flex-col justify-center gap-4">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Platform Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 mb-1">Total Processed</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-200">{stats?.totalOrders || 0}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 mb-1">Total Refunded</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${stats?.totalRefundAmount?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
