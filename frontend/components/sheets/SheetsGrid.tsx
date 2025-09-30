'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellValueChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { Button } from '@/components/ui/button';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { listSheets, createSheet, updateSheet, deleteSheet } from './api';
import { computePlatform, computeWithin30, buildReturnId } from '@/lib/sheetFormulas';

// -------------------- Sheet Type --------------------
export interface SheetRecord {
  id: number;
  business_id: number;
  date_received: string;
  order_date: string;
  order_no: string;
  customer_name: string;
  imei: string;
  sku: string;
  customer_comment: string;
  multiple_return: string;
  apple_google_id: string;
  return_type: string;
  replacement_available: string;
  done_by: string;
  blocked_by: string;
  cs_comment: string;
  resolution: string;
  refund_amount: number;
  return_tracking_no: string;
  platform: string;
  return_within_30_days: boolean;
  issue: string;
  out_of_warranty: boolean;
  additional_notes: string;
  status: string;
  manager_notes: string;
}

// -------------------- Staff Options --------------------
const staffOptions = ['Alice', 'Bob', 'Charlie'];

// -------------------- Component --------------------
export default function SheetsGrid({ businessId }: { businessId: string }) {
  const gridRef = useRef<AgGridReact<SheetRecord>>(null);
  const [rowData, setRowData] = useState<SheetRecord[]>([]);
  const [error, setError] = useState<string>('');

  // ---------------- Fetch Data ----------------
  const refresh = useCallback(async () => {
    try {
      const data = await listSheets(businessId);
      setRowData(
        Array.isArray(data)
          ? data.map((row: any) => ({
              ...row,
              id: Number(row.id),
              business_id: Number(row.business_id),
              refund_amount: Number(row.refund_amount ?? 0),
              return_within_30_days: !!row.return_within_30_days,
              out_of_warranty: !!row.out_of_warranty,
            }))
          : []
      );
      setError('');
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    }
  }, [businessId]);

  useEffect(() => { refresh(); }, [refresh]);

  // ---------------- Add Row at Bottom ----------------
  const addRow = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const base: Partial<SheetRecord> = {
      date_received: today,
      order_date: today,
      order_no: '',
      customer_name: '',
      imei: '',
      sku: '',
      customer_comment: '',
      multiple_return: 'Choose',
      apple_google_id: 'Choose',
      return_type: 'Refund',
      replacement_available: 'Yes',
      done_by: staffOptions[0],
      blocked_by: 'PIN required',
      cs_comment: '',
      resolution: 'Back in stock',
      refund_amount: 0,
      return_tracking_no: '',
      platform: '',
      return_within_30_days: false,  // ✅ boolean
      issue: 'Choose',
      out_of_warranty: false,        // ✅ boolean
      additional_notes: '',
      status: 'Pending',
      manager_notes: '',
    };
    try {
      const newSheet = await createSheet(businessId, base);
      setRowData((prev) => {
        const newRow = { ...base, ...newSheet } as SheetRecord;
        const newRows = [...prev, newRow]; // append at bottom
        setTimeout(() => gridRef.current?.api.ensureIndexVisible(newRows.length - 1, 'middle'), 50);
        return newRows;
      });
    } catch (e: any) {
      alert(e.message || 'Create failed');
    }
  };

  // ---------------- Remove Selected ----------------
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

  // ---------------- Cell Value Changed ----------------
  const onCellValueChanged = async (event: CellValueChangedEvent<SheetRecord>) => {
    const r = event.data;
    if (!r?.id) return;

    // Ensure booleans are true/false, never empty string
    const returnWithin30 = r.return_within_30_days ? true : false;
    const outOfWarranty = r.out_of_warranty ? true : false;

    const payload: SheetRecord = {
      ...r,
      return_within_30_days: returnWithin30,
      out_of_warranty: outOfWarranty,
      platform: computePlatform(r.order_no ?? ''),
      refund_amount: Number(r.refund_amount ?? 0),
    };

    try {
      await updateSheet(String(r.business_id), payload);
    } catch (err: any) {
      alert(err.message || 'Save failed');
    }
  };

  // ---------------- Formatters ----------------
  const dateFormatter = (params: any) => params.value ? new Date(params.value).toLocaleDateString() : '';
  const currencyFormatter = (params: any) => typeof params.value === 'number' ? `$${params.value.toFixed(2)}` : '$0.00';

  // ---------------- Column Definitions ----------------
  const colDefs: ColDef<SheetRecord>[] = useMemo(() => [
    { headerName: 'Return ID', valueGetter: (p) => buildReturnId(p.data?.order_date, p.node?.rowIndex ?? 0), editable: false, width: 130, pinned: 'left' },
    { headerName: 'Date Received', field: 'date_received', editable: true, cellEditor: 'agDateCellEditor', valueFormatter: dateFormatter, width: 140 },
    { headerName: 'Order Date', field: 'order_date', editable: true, cellEditor: 'agDateCellEditor', valueFormatter: dateFormatter, width: 140 },
    { headerName: 'Order Number', field: 'order_no', editable: true, width: 140 },
    { headerName: 'Customer Name', field: 'customer_name', editable: true, width: 160 },
    { headerName: 'IMEI', field: 'imei', editable: true, width: 160 },
    { headerName: 'SKU / Product', field: 'sku', editable: true, width: 180 },
    { headerName: 'Customer Comment', field: 'customer_comment', editable: true, width: 220 },
    { headerName: 'Multiple Return', field: 'multiple_return', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose','No','2nd Time','3rd Time'] }, width: 140 },
    { headerName: 'Apple/Google ID', field: 'apple_google_id', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose','Yes','Yes-Issue raised','No'] }, width: 160 },
    { headerName: 'Return Type', field: 'return_type', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Refund','URGENT REPAIR','Replacement','Repair','Faulty','Other'] }, width: 140 },
    { headerName: 'Replacement Available', field: 'replacement_available', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Yes','No'] }, width: 180 },
    { headerName: 'Done By', field: 'done_by', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: staffOptions }, width: 120 },
    { headerName: 'Blocked By', field: 'blocked_by', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['PIN required','Code required','Apple ID required','Google ID required','Awaiting part/Part','Awaiting Replacement','Awaiting Customer'] }, width: 150 },
    { headerName: 'CS Comment', field: 'cs_comment', editable: true, width: 160 },
    { headerName: 'Resolution', field: 'resolution', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Back in stock','Sent repaired back to customer','Sent back to customer','Sent replacement','Sent back to supplier','BER'] }, width: 160 },
    { headerName: 'Refund Amount', field: 'refund_amount', editable: true, width: 140, valueFormatter: currencyFormatter },
    { headerName: 'Return Tracking No', field: 'return_tracking_no', editable: true, width: 170 },
    { headerName: 'Platform', field: 'platform', editable: false, valueGetter: (p) => computePlatform(p.data?.order_no ?? ''), width: 130 },
    { headerName: 'Return within 30 days', field: 'return_within_30_days', editable: false, valueGetter: (p) => computeWithin30(p.data?.date_received ?? '', p.data?.order_date ?? '') ? 'Yes' : 'No', width: 180 },
    { headerName: 'Issue', field: 'issue', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose','Battery','board','Body issue','bought wrong device','Buttons','Camera','Change of mind','Charging','Charging Port','Cosmetic','Damage in transit','GPS','IC','Language','Lcd','Mic','Network','Overheating','OW','Screen','Software','Speaker','Wrong product','No issue','Other'] }, width: 160 },
    { headerName: 'Out of Warranty', field: 'out_of_warranty', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Yes','No'] }, width: 150 },
    { headerName: 'Additional Notes', field: 'additional_notes', editable: true, width: 200 },
    { headerName: 'Status', field: 'status', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Pending','In Progress','Resolved'] }, width: 140,
      cellClassRules: {
        'bg-green-600 text-white': (params) => !!params.data && params.data.status === 'Resolved',
        'bg-green-100': (params) => !!params.data && params.data.status !== 'Resolved' && !params.data.blocked_by,
        'bg-red-100': (params) => !!params.data && params.data.status !== 'Resolved' && !!params.data.blocked_by && params.data.blocked_by !== 'Awaiting Customer',
        'bg-yellow-200': (params) => !!params.data && params.data.status !== 'Resolved' && params.data.blocked_by === 'Awaiting Customer',
      }
    },
    { headerName: 'Manager Notes', field: 'manager_notes', editable: true, width: 200 },
    { headerName: '', width: 80, pinned: 'right', cellRenderer: (p: any) => (
      <div className="flex justify-end pr-1">
        <button className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50" onClick={() => p.data?.id && deleteSheet(businessId, p.data.id).then(refresh)} title="Delete row">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )}
  ], []);

  return (
    <div className="flex flex-col space-y-3 p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <Button className="gap-2" onClick={addRow}><Plus /> New Row</Button>
        <Button variant="outline" className="gap-2" onClick={removeSelected}><Trash2 /> Delete Selected</Button>
        <Button variant="outline" className="gap-2" onClick={refresh}><RotateCcw /> Refresh</Button>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="ag-theme-alpine" style={{ width: '100%', height: '75vh', borderRadius: '0.5rem' }}>
        <AgGridReact<SheetRecord>
          ref={gridRef}
          rowData={rowData}
          columnDefs={colDefs}
          rowSelection="multiple"
          animateRows
          singleClickEdit
          stopEditingWhenCellsLoseFocus
          enableCellTextSelection
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: true,
            flex: 1,
            minWidth: 80,
            cellClass: 'px-2 py-1 border border-gray-200 hover:bg-gray-50',
          }}
          onCellValueChanged={onCellValueChanged}
          getRowId={(params) => String(params.data?.id ?? Math.random())}
        />
      </div>
    </div>
  );
}
