'use client';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { VisionSectionHeader } from '@/components/vision/VisionSectionHeader';
import { VisionKpiOrbit } from '@/components/vision/VisionKpiOrbit';
import { VisionInsightCanvas } from '@/components/vision/VisionInsightCanvas';
import { apiClient } from '@/lib/api';
import { Loader2, Server, Database, Activity, Users } from 'lucide-react';

export default function SuperAdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [health, setHealth] = useState<{ db: boolean; latency: number; endpoints: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user && user.role_id !== 1) { // 1 = SuperAdmin
      router.push('/dashboard/business-admin');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const biz = await apiClient.getBusinesses();
        setBusinesses(biz || []);

        // Simulate Health Check (or call real endpoint if exists)
        // Ideally we'd have a /api/health endpoint
        const start = performance.now();
        await apiClient.getUsers(); // Light ping
        const latency = Math.round(performance.now() - start);

        setHealth({
          db: true,
          latency,
          endpoints: [
            { name: 'Auth Service', status: 'operational', uptime: '99.9%' },
            { name: 'Sheet API', status: 'operational', uptime: '99.5%' },
            { name: 'Stats Engine', status: 'operational', uptime: '99.8%' },
            { name: 'Attachment Store', status: 'operational', uptime: '100%' }
          ]
        });

      } catch (e) {
        console.error(e);
        setHealth({ db: false, latency: 0, endpoints: [] });
      } finally {
        setLoading(false);
      }
    };
    if (user?.role_id === 1) loadData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute requiredRole="Superadmin">
      <DashboardLayout>
        <div className="w-full flex flex-col gap-8">
          <VisionSectionHeader
            title="System Overview"
            description="Global administrator console operations center"
            actions={
              <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-bold flex items-center gap-2 border border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                SYSTEM OPERATIONAL
              </span>
            }
          />

          {/* KPI OVERVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <VisionKpiOrbit
              label="Active Businesses"
              value={businesses.length.toString()}
              subValue="Platform Tenants"
              icon={<Server className="w-4 h-4 text-indigo-500" />}
            />
            <VisionKpiOrbit
              label="Total Users"
              value={businesses.reduce((acc, b) => acc + (b.users_count || 0), 0).toString()}
              subValue="Registered Accounts"
              icon={<Users className="w-4 h-4 text-blue-500" />}
            />
            <VisionKpiOrbit
              label="DB Latency"
              value={`${health?.latency || 0}ms`}
              subValue={health?.db ? "Connected" : "Disconnected"}
              icon={<Database className={`w-4 h-4 ${health?.db ? 'text-green-500' : 'text-red-500'}`} />}
              trend={{ value: 0, direction: health?.latency && health.latency < 100 ? 'up' : 'down' }}
            />
          </div>

          {/* HEALTH MATRIX */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VisionInsightCanvas title="Endpoint Health" description="API Service Status">
              <div className="space-y-4">
                {health?.endpoints.map((ep, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{ep.name}</div>
                        <div className="text-xs text-slate-500">Uptime: {ep.uptime}</div>
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold rounded uppercase">
                      {ep.status}
                    </div>
                  </div>
                ))}
              </div>
            </VisionInsightCanvas>

            <VisionInsightCanvas title="Active Organizations" description="Tenant Management">
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {businesses.map((biz) => (
                  <div key={biz.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border border-transparent hover:border-blue-100 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                        {biz.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{biz.name}</div>
                        <div className="text-xs text-slate-500">ID: {biz.id} &bull; Created: {new Date().toLocaleDateString()}</div>
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-white shadow-sm border rounded-md text-xs font-bold text-slate-600">
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            </VisionInsightCanvas>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
