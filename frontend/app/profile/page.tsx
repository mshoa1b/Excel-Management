'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api'; // <-- wire-up
import { User as UserIcon, Building2, Shield, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // frontend validation to match your backend rules
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill all the password fields.');
      setLoading(false);
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      setLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      // Calls /api/users/me/password (requires current, new, confirm)
      
      await apiClient.changeMyPassword(currentPassword, newPassword);

      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="User">
      <DashboardLayout>
        <div className="space-y-8 max-w-4xl">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Profile</h1>
            <p className="text-slate-600">Manage your account information and settings</p>
          </div>

          {/* Profile Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                  <span>Account Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Username</span>
                  <span className="font-medium">{user?.username}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Role</span>
                  <Badge variant={user?.role.name === 'Superadmin' ? 'default' : 'secondary'}>
                    {user?.role.name}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Account Created</span>
                  <span className="font-medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-600">Last Updated</span>
                  <span className="font-medium">
                    {user?.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {user?.business && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-teal-600" />
                    <span>Business Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Business Name</span>
                    <span className="font-medium">{user.business.name}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Business ID</span>
                    <span className="font-medium text-xs bg-slate-100 px-2 py-1 rounded">
                      {user.business.id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-600">Created</span>
                    <span className="font-medium">
                      {user.business.created_at ? new Date(user.business.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-amber-600" />
                <span>Change Password</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-700">{success}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Permissions */}
          {user?.role && Array.isArray(user.role.permissions) && user.role.permissions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <span>Permissions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {user.role.permissions.map((permission: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-slate-700">{permission}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  <span>Permissions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500">No specific permissions assigned for this role.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
