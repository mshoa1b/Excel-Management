'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminUsersRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the correct manage page
    router.replace('/manage');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="text-slate-600">Redirecting to user management...</p>
      </div>
    </div>
  );
}