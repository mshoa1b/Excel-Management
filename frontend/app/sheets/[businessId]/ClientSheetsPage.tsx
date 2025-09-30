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
      <DashboardLayout>
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">Sheets (Excel style)</h1>
            <p className="text-slate-600">Inline editable grid with auto formulas.</p>
          </div>
          <SheetsGrid businessId={businessId} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
