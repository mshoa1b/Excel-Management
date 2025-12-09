'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBusiness } from '@/contexts/BusinessContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { VisionSectionHeader } from '@/components/vision/VisionSectionHeader';
import { VisionCanvasSwitcher } from '@/components/vision/VisionCanvasSwitcher';
import { VisionAnomalyPulse } from '@/components/vision/VisionAnomalyPulse';
import { ReturnsCanvas } from '@/components/canvas/ReturnsCanvas';
import { ProductCanvas } from '@/components/canvas/ProductCanvas';
import { PlatformCanvas } from '@/components/canvas/PlatformCanvas';
import { AgentsCanvas } from '@/components/canvas/AgentsCanvas';
import { FraudCanvas } from '@/components/canvas/FraudCanvas';
import { AttachmentsCanvas } from '@/components/canvas/AttachmentsCanvas';
import { apiClient } from '@/lib/api';
import { detectAnomalies } from '@/lib/anomaly-engine';
import { AdvancedStats, Anomaly } from '@/types';
import { Loader2, Calendar, LayoutGrid, Package, Globe, Users, ShieldAlert, FileText } from 'lucide-react';

type CanvasType = 'returns' | 'product' | 'platform' | 'agents' | 'fraud' | 'attachments';

export default function AnalyticsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { business } = useBusiness();
  const router = useRouter();

  const [activeCanvas, setActiveCanvas] = useState<CanvasType>('returns');
  const [range, setRange] = useState('1m');
  const [data, setData] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (businessId) {
        setLoading(true);
        setError(null);
        try {
          const stats = await apiClient.getAdvancedStats(businessId, range);
          setData(stats);

          // Run Anomaly Engine
          if (stats) {
            const detected = detectAnomalies(
              stats.trends,
              stats.topSkus,
              stats.agentPerformance,
              stats.repeatedImeis,
              0 // Attachment gap placeholder
            );
            setAnomalies(detected);
          }
        } catch (error) {
          console.error("Failed to fetch analytics", error);
          setError(error instanceof Error ? error.message : "Failed to load analytics");
        } finally {
          setLoading(false);
        }
      }
    };
    fetchAnalytics();
  }, [businessId, range]);

  const switcherItems = [
    { id: 'returns', label: 'Returns Loop', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'product', label: 'Product Intelligence', icon: <Package className="w-4 h-4" /> },
    { id: 'platform', label: 'Channel & Issues', icon: <Globe className="w-4 h-4" /> },
    { id: 'agents', label: 'Agent Performance', icon: <Users className="w-4 h-4" /> },
    { id: 'fraud', label: 'Risk & Fraud', icon: <ShieldAlert className="w-4 h-4" />, alertCount: anomalies.length > 0 ? anomalies.length : undefined },
    { id: 'attachments', label: 'Evidence & Compliance', icon: <FileText className="w-4 h-4" /> },
  ];

  const renderActiveCanvas = () => {
    if (loading) return null; // Handled by outer loader

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-500">
          <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">Unable to load data</h3>
          <p className="text-sm opacity-80 mt-2">{error}</p>
        </div>
      );
    }

    if (!data) return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Package className="w-12 h-12 mb-4 opacity-50" />
        <p>No data available</p>
      </div>
    );

    switch (activeCanvas) {
      case 'returns':
        return <ReturnsCanvas data={data.trends} loading={loading} />;
      case 'product':
        return <ProductCanvas data={data.topSkus} loading={loading} />;
      case 'platform':
        return <PlatformCanvas platformData={data.platformBreakdown} issueData={data.issueBreakdown} loading={loading} />;
      case 'agents':
        return <AgentsCanvas data={data.agentPerformance} loading={loading} />;
      case 'fraud':
        return <FraudCanvas anomalies={anomalies} repeatedImeis={data.repeatedImeis} loading={loading} />;
      case 'attachments':
        return <AttachmentsCanvas stats={data.attachmentStats || { with: 0, without: 0 }} loading={loading} />;
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute requiredRole="Business Admin">
      <DashboardLayout fullWidth>
        <div className="flex flex-col h-full w-full">
          <header className="py-5 border-b border-white/10 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300">
                Omni-Board Analytics
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {business?.name} &bull; {range.toUpperCase()} View
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
              {['1m', '3m', '6m', '1y'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${range === r ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <aside className="w-full lg:w-64 p-4 lg:py-6 lg:pl-6 border-r border-slate-200/50 dark:border-slate-800/50 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl space-y-6">
              <VisionCanvasSwitcher
                items={switcherItems}
                activeId={activeCanvas}
                onChange={(id) => setActiveCanvas(id as CanvasType)}
              />

              <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-2">
                  <FileText className="w-3 h-3" /> Refunds Statement
                </h4>
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase">Period</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs" id="report-start" />
                    <input type="date" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs" id="report-end" />
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const start = (document.getElementById('report-start') as HTMLInputElement).value;
                    const end = (document.getElementById('report-end') as HTMLInputElement).value;
                    if (!start || !end) return alert('Please select dates');

                    try {
                      const data = await apiClient.request(`/sheets/${businessId}/refunds-report?dateFrom=${start}&dateTo=${end}&platform=all`);

                      const headers = ['Order', 'Date', 'Customer', 'Amount', 'Platform'].join(',');
                      const rows = data.map((d: any) => [d.order_number, d.refund_date.split('T')[0], d.customer_name, d.refund_amount, d.platform].join(',')).join('\n');
                      const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
                      const link = document.createElement('a');
                      link.href = window.URL.createObjectURL(blob);
                      link.download = `Refunds_Statement_${start}_${end}.csv`;
                      link.click();
                    } catch (err) {
                      console.error('Report generation failed', err);
                      alert('Failed to generate report');
                    }
                  }}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                >
                  Generate Report
                </button>
              </div>
            </aside>

            <main className="flex-1 p-4 lg:p-6 overflow-auto relative">
              {loading && !data ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="h-full max-w-7xl mx-auto animate-in fade-in duration-500 slide-in-from-bottom-2">
                  {renderActiveCanvas()}
                </div>
              )}
            </main>
          </div>

          <VisionAnomalyPulse anomalies={anomalies} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}