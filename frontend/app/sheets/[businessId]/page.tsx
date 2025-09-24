'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SheetsList from '@/components/sheets/SheetsList';
import SheetForm from '@/components/sheets/SheetForm';
import { Sheet } from '@/types';

export default function SheetsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [showForm, setShowForm] = useState(false);
  const [editingSheet, setEditingSheet] = useState<Sheet | null>(null);

  const handleCreateSheet = () => {
    setEditingSheet(null);
    setShowForm(true);
  };

  const handleEditSheet = (sheet: Sheet) => {
    setEditingSheet(sheet);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSheet(null);
    // The SheetsList component will reload automatically
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingSheet(null);
  };

  return (
    <ProtectedRoute businessId={businessId}>
      <DashboardLayout>
        {showForm ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-slate-800">
                {editingSheet ? 'Edit Sheet' : 'Create New Sheet'}
              </h1>
            </div>
            <SheetForm
              businessId={businessId}
              sheet={editingSheet || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Sheets Management</h1>
              <p className="text-slate-600">Manage all sheets for this business</p>
            </div>
            <SheetsList
              businessId={businessId}
              onCreateSheet={handleCreateSheet}
              onEditSheet={handleEditSheet}
            />
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}