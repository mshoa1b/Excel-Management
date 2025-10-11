'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';
import { storeAuth } from '@/lib/auth';
import { Loader2, LogIn } from 'lucide-react';
import type { AuthResponse, User as IUser } from '@/types';

type CanonicalRole = 'Superadmin' | 'Business Admin' | 'User';

function canonicalizeRoleName(name: unknown): CanonicalRole {
  const s = String(name ?? '').toLowerCase();
  if (s === 'superadmin') return 'Superadmin';
  if (s === 'business admin') return 'Business Admin';
  return 'User';
}

// Keep the returned user compatible with your IUser
function canonicalizeUser(user: IUser): IUser {
  const roleName = canonicalizeRoleName(user?.role?.name);

  const canon: IUser = {
    ...user,
    id: String(user.id ?? ''),                     // always string
    business_id: user.business_id != null ? String(user.business_id) : '', // string, never null
    role_id: Number(user.role_id ?? user.role?.id ?? 0),
    role: {
      ...user.role,
      id: Number(user.role?.id ?? user.role_id ?? 0),
      name: roleName,
      permissions: Array.isArray(user.role?.permissions) ? user.role.permissions : [],
    },
  };

  return canon;
}

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError('');

    try {
      const resp = await apiClient.login(username.trim(), password) as AuthResponse;
      const canonicalUser = canonicalizeUser(resp.user);

      storeAuth(resp.token, canonicalUser);

      switch (canonicalUser.role.name) {
        case 'Superadmin':
          router.push('/dashboard/superadmin');
          break;
        case 'Business Admin':
          router.push('/dashboard/business-admin');
          break;
        case 'User':
          router.push('/dashboard/user');
          break;
        default:
          router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-slate-600">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="h-11 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="h-11 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={loading || !username.trim() || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
