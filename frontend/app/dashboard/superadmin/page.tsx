'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { Business, User } from '@/types';
import { Building2, Users, UserCheck, Activity } from 'lucide-react';

export default function SuperadminDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [businessesData, usersData] = await Promise.all([
        apiClient.getBusinesses(),
        apiClient.getUsers(),
      ]);
      setBusinesses(businessesData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="Superadmin">
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const businessAdmins = users.filter(user => user.role.name === 'Business Admin');
  const regularUsers = users.filter(user => user.role.name === 'User');

  return (
    <ProtectedRoute requiredRole="Superadmin">
      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Superadmin Dashboard</h1>
            <p className="text-slate-600">Overview of all businesses and users in the system</p>
          </div>

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
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {businesses.slice(0, 5).map((business) => (
                  <div key={business.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-medium text-slate-800">{business.name}</p>
                      <p className="text-sm text-slate-500">ID: {business.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">
                        Created {new Date(business.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Users</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="font-medium text-slate-800">{user.username}</p>
                      <p className="text-sm text-slate-500">{user.role.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">
                        Created {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}