'use client';

import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SheetsGrid from '@/components/sheets/SheetsGrid';

export default function ClientSheetsPage() {
  const params = useParams() as { businessId?: string };
  const businessId = params?.businessId;

  if (!businessId) {
    return <div className="p-6 text-red-600">Invalid business URL.</div>;
  }

  return (
    <ProtectedRoute businessId={businessId}>
      <DashboardLayout fullWidth={true}>
        <div className="space-y-4">
          <SheetsGrid businessId={businessId} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
