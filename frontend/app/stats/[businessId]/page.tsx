'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { Stats } from '@/types';
import { 
  FileSpreadsheet, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

export default function StatsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState('1m');

  useEffect(() => {
    loadStats();
  }, [businessId, selectedRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getStats(businessId, selectedRange);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRangeLabel = (range: string) => {
    switch (range) {
      case '1d': return 'Last 24 Hours';
      case '1w': return 'Last Week';
      case '1m': return 'Last Month';
      case '3m': return 'Last 3 Months';
      case '6m': return 'Last 6 Months';
      case '1y': return 'Last Year';
      default: return 'Last Month';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute businessId={businessId}>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute businessId={businessId}>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Debug Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs">
            <strong>Debug Info:</strong> Route businessId: {businessId}, User businessId: {user?.business_id}, Role: {user?.role?.name}
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Analytics Dashboard</h1>
              <p className="text-slate-600">Business insights and statistics</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Time Range:</span>
              <Select value={selectedRange} onValueChange={setSelectedRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 Hours</SelectItem>
                  <SelectItem value="1w">Last Week</SelectItem>
                  <SelectItem value="1m">Last Month</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {stats && (
            <>
              {/* Primary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatsCard
                  title="Total Orders"
                  value={stats.totalOrders}
                  description={getRangeLabel(selectedRange)}
                  icon={FileSpreadsheet}
                />
                <StatsCard
                  title="Total Refund Amount"
                  value={`$${stats.totalRefundAmount.toFixed(2)}`}
                  description={getRangeLabel(selectedRange)}
                  icon={DollarSign}
                />
                <StatsCard
                  title="Average Refund"
                  value={`$${stats.averageRefundAmount.toFixed(2)}`}
                  description="Per order"
                  icon={TrendingUp}
                />
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatsCard
                  title="Unique Orders"
                  value={stats.uniqueOrders}
                  description="Distinct order numbers"
                  icon={FileSpreadsheet}
                />
                <StatsCard
                  title="Returns (30 days)"
                  value={stats.ordersWithin30Days}
                  description="Within return window"
                  icon={Calendar}
                />
                <StatsCard
                  title="Out of Warranty"
                  value={stats.outOfWarrantyReturns}
                  description="Beyond warranty period"
                  icon={AlertTriangle}
                />
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span>Return Timeline</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Within 30 days</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ 
                                width: `${stats.totalOrders > 0 ? (stats.ordersWithin30Days / stats.totalOrders) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="font-medium">{stats.ordersWithin30Days}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Out of warranty</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500 rounded-full"
                              style={{ 
                                width: `${stats.totalOrders > 0 ? (stats.outOfWarrantyReturns / stats.totalOrders) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="font-medium">{stats.outOfWarrantyReturns}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-teal-600" />
                      <span>Financial Summary</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600">Total Refund Amount</span>
                        <span className="font-bold text-lg">${stats.totalRefundAmount.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600">Average per Order</span>
                        <span className="font-bold text-lg">${stats.averageRefundAmount.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-600">Total Orders</span>
                        <span className="font-bold text-lg">{stats.totalOrders}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}