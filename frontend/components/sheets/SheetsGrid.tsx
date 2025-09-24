'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// AG Grid (register modules first)
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import type { SheetRecord } from './types';
import { listSheets, createSheet, updateSheet, deleteSheet } from './api';
import { computePlatform, computeWithin30, buildReturnId } from '@/lib/sheetFormulas';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, RotateCcw } from 'lucide-react';

export default function SheetsGrid({ businessId }: { businessId: string }) {
  const gridRef = useRef<AgGridReact<SheetRecord>>(null);
  const [rowData, setRowData] = useState<SheetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listSheets(businessId);
      setRowData(Array.isArray(data) ? data : []);
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { refresh(); }, [refresh]);

  const addRow = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const base: Partial<SheetRecord> = {
      date: today,
      order_no: '',
      order_date: today,
      customer_name: '',
      imei: '',
      sku: '',
      customer_comment: '',
      return_type: 'Refund',
      refund_amount: 0,
      platform: '',
      return_within_30_days: false,
      issue: '',
      out_of_warranty: false,
    };
    try {
      await createSheet(businessId, base);
      await refresh();
      const idx = rowData.length;
      setTimeout(() => gridRef.current?.api.ensureIndexVisible(idx, 'middle'), 50);
    } catch (e: any) {
      alert(e.message || 'Create failed');
    }
  };

  const removeSelected = async () => {
    const rows = gridRef.current?.api.getSelectedRows() || [];
    if (!rows.length) return;
    if (!confirm(`Delete ${rows.length} row(s)?`)) return;
    try {
      for (const r of rows) {
        if (r.id) await deleteSheet(businessId, r.id);
      }
      await refresh();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  };

  const onCellValueChanged = async (e: any) => {
    const r: SheetRecord = e.data;
    if (!r?.id) return;

    // recalc formulas
    const newPlatform = computePlatform(r.order_no);
    const within30 = computeWithin30(r.date, r.order_date);

    const payload: any = {
      ...r,
      platform: newPlatform,
      return_within_30_days: within30,
      refund_amount: Number(r.refund_amount ?? 0),
    };

    try {
      await updateSheet(businessId, payload);
    } catch (err: any) {
      alert(err.message || 'Save failed');
    }
  };

  const currencyFormatter = (p: any) =>
    typeof p.value === 'number' ? `$${p.value.toFixed(2)}` : '$0.00';

  const colDefs = useMemo<ColDef<SheetRecord>[]>(() => [
    {
      headerName: 'Return ID',
      valueGetter: (p) => buildReturnId(p.data?.order_date, p.node?.rowIndex ?? 0),
      editable: false,
      width: 130,
      pinned: 'left',
    },
    { headerName: 'Date Received', field: 'date', editable: true, width: 140 },
    { headerName: 'Order Number', field: 'order_no', editable: true, width: 140 },
    { headerName: 'Order Date', field: 'order_date', editable: true, width: 140 },
    { headerName: 'Customer Name', field: 'customer_name', editable: true, width: 160 },
    { headerName: 'IMEI', field: 'imei', editable: true, width: 160 },
    { headerName: 'SKU / Product', field: 'sku', editable: true, width: 180 },
    { headerName: 'Customer Comment', field: 'customer_comment', editable: true, width: 220 },
    { headerName: 'Multiple Return', field: 'multiple_return', editable: true, width: 140 },
    { headerName: 'Apple/Google ID', field: 'apple_google_id', editable: true, width: 160 },
    { headerName: 'Return Type', field: 'return_type', editable: true, width: 140 },
    { headerName: 'Replacement Available', field: 'replacement_available', editable: true, width: 180 },
    { headerName: 'Done By', field: 'done_by', editable: true, width: 120 },
    { headerName: 'Blocked By', field: 'blocked_by', editable: true, width: 120 },
    { headerName: 'CS Comment', field: 'cs_comment', editable: true, width: 160 },
    { headerName: 'Resolution', field: 'resolution', editable: true, width: 160 },
    { headerName: 'Refund Amount', field: 'refund_amount', editable: true, width: 140, valueFormatter: currencyFormatter },
    { headerName: 'Return Tracking No', field: 'return_tracking_no', editable: true, width: 170 },
    {
      headerName: 'Platform',
      field: 'platform',
      editable: false,
      valueGetter: (p) => p.data?.platform || computePlatform(p.data?.order_no || ''),
      width: 130,
    },
    {
      headerName: 'Return within 30 days',
      field: 'return_within_30_days',
      editable: false,
      valueGetter: (p) => {
        const v = p.data?.return_within_30_days;
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        return computeWithin30(p.data?.date, p.data?.order_date) ? 'Yes' : 'No';
      },
      width: 180,
    },
    { headerName: 'Issue', field: 'issue', editable: true, width: 160 },
    {
      headerName: 'Out of Warranty',
      field: 'out_of_warranty',
      editable: true,
      valueFormatter: (p) => (p.value ? 'Yes' : 'No'),
      width: 150,
    },
    { headerName: 'Additional Notes', field: 'additional_notes', editable: true, width: 200 },
    { headerName: 'Status', field: 'status', editable: true, width: 140 },
    { headerName: 'Manager Notes', field: 'manager_notes', editable: true, width: 200 },
    {
      headerName: '',
      width: 80,
      pinned: 'right',
      cellRenderer: (p: ICellRendererParams<SheetRecord>) => (
        <div className="flex justify-end pr-1">
          <button
            className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
            onClick={() => p.data?.id && deleteSheet(businessId, p.data.id).then(refresh)}
            title="Delete row"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ], [businessId, refresh]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button className="gap-2" onClick={addRow}><Plus className="h-4 w-4" /> New Row</Button>
        <Button variant="outline" className="gap-2" onClick={removeSelected}><Trash2 className="h-4 w-4" /> Delete Selected</Button>
        <Button variant="outline" className="gap-2" onClick={refresh}><RotateCcw className="h-4 w-4" /> Refresh</Button>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      <div className="ag-theme-quartz" style={{ width: '100%', height: '70vh' }}>
        <AgGridReact<SheetRecord>
          ref={gridRef}
          rowData={rowData}
          columnDefs={colDefs}
          rowSelection="multiple"
          animateRows
          debounceVerticalScrollbar
          suppressCellFocus
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: true,
            flex: 0,
          }}
          onCellValueChanged={onCellValueChanged}
          getRowId={(p) => String(p.data?.id ?? p.node?.id ?? (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)))}
        />
      </div>
    </div>
  );
}
