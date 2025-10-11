'use client';

import { useAuth } from '@/hooks/useAuth';
import { useParams, usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserDebugInfo() {
  const { user, loading } = useAuth();
  const params = useParams();
  const pathname = usePathname();

  if (loading) return <div>Loading debug info...</div>;

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-sm text-yellow-800">Debug Information</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div><strong>Current Path:</strong> {pathname}</div>
        <div><strong>URL Params:</strong> {JSON.stringify(params)}</div>
        <div><strong>User ID:</strong> {user?.id}</div>
        <div><strong>Username:</strong> {user?.username}</div>
        <div><strong>Role:</strong> {user?.role?.name} (ID: {user?.role?.id})</div>
        <div><strong>Business ID:</strong> {user?.business_id}</div>
        <div><strong>Expected URLs:</strong></div>
        <ul className="ml-4 space-y-1">
          <li>• Sheets: /sheets/{user?.business_id}</li>
          <li>• Stats: /stats/{user?.business_id}</li>
        </ul>
      </CardContent>
    </Card>
  );
}