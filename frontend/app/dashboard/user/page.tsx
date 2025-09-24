'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { Sheet } from '@/types';
import { FileSpreadsheet, DollarSign, Calendar, User, ArrowRight } from 'lucide-react';

export default function UserDashboard() {
  const { user } = useAuth();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.business_id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.business_id) return;

    try {
      const sheetsData = await apiClient.getSheets(user.business_id);
      setSheets(sheetsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="User">
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const totalRefunds = sheets.reduce((sum, sheet) => sum + sheet.refund_amount, 0);
  const returnsWithin30Days = sheets.filter(sheet => sheet.return_within_30_days).length;
  const recentSheets = sheets.slice(0, 5);

  return (
    <ProtectedRoute requiredRole="User">
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">My Dashboard</h1>
            <p className="text-slate-600">View your personal data and sheet information</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="My Sheets"
              value={sheets.length}
              description="Total sheets"
              icon={FileSpreadsheet}
            />
            <StatsCard
              title="Total Refunds"
              value={`$${totalRefunds.toFixed(2)}`}
              description="All time"
              icon={DollarSign}
            />
            <StatsCard
              title="Returns (30 days)"
              value={returnsWithin30Days}
              description="Within warranty"
              icon={Calendar}
            />
            <StatsCard
              title="Profile Status"
              value="Active"
              description="Account status"
              icon={User}
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  <span>My Sheets</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">View all your sheets and return information</p>
                <Link href={`/sheets/${user?.business_id}`}>
                  <Button className="w-full">
                    View My Sheets
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-teal-600" />
                  <span>Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">Manage your profile and account settings</p>
                <Link href="/profile">
                  <Button variant="outline" className="w-full">
                    Manage Profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Recent Sheets */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Sheets</CardTitle>
              <Link href={`/sheets/${user?.business_id}`}>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSheets.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No sheets found</p>
                ) : (
                  recentSheets.map((sheet) => (
                    <div key={sheet.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="font-medium text-slate-800">{sheet.order_no}</p>
                        <p className="text-sm text-slate-500">{sheet.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-800">${sheet.refund_amount.toFixed(2)}</p>
                        <p className="text-sm text-slate-500">{sheet.return_type}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}