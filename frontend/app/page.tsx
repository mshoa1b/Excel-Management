'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        // Redirect based on role
        switch (user.role.name) {
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
            router.push('/login');
        }
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}