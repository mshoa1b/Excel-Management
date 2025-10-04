'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ModuleRegistry,
  AllCommunityModule,
  GridApi,
  GridReadyEvent,
  FirstDataRenderedEvent,
  ColumnResizedEvent,
  GridSizeChangedEvent,
  ColDef,
  CellValueChangedEvent,
  Column, // type for getColumns()
} from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-theme-alpine.css';

import { Button } from '@/components/ui/button';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { listSheets, createSheet, updateSheet, deleteSheet, fetchBMOrder } from './api';
import { computePlatform, computeWithin30, buildReturnId } from '@/lib/sheetFormulas';
import { format } from 'date-fns';

export interface SheetRecord {
  id: number;
  business_id: number;
  blocked_by: string;
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
  locked: string;
  oow_case: string;
  replacement_available: string;
  done_by: string;
  cs_comment: string;
  resolution: string;
  refund_amount: number;
  refund_date?: string;
  return_tracking_no: string;
  platform: string;
  return_within_30_days: boolean;
  issue: string;
  out_of_warranty: boolean;
  additional_notes: string;
  status: string;
  manager_notes: string;
}

const staffOptions = ['Alice', 'Bob', 'Charlie'];
const blockedByOptions = [
  'PIN Required',
  'Code Required',
  'Apple ID Required',
  'Google ID Required',
  'Awaiting Part',
  'Awaiting Replacement',
  'Awaiting Customer',
  'Awaiting BM',
  'Awaiting G&I',
  'Awaiting Softezm',
];
const lockedOptions = ['No', 'Google ID', 'Apple ID', 'PIN'];
const oowOptions = ['No', 'Damaged', 'Wrong Device'];

// Multiline columns to exclude from width autosizing
const MULTILINE_COLS = ['customer_comment', 'additional_notes', 'cs_comment', 'manager_notes'];

export default function SheetsGrid({ businessId }: { businessId: string }) {
  const apiRef = useRef<GridApi<SheetRecord> | null>(null);

  const [rowData, setRowData] = useState<SheetRecord[]>([]);
  const [error, setError] = useState<string>('');
  const [totals, setTotals] = useState<{ [key: string]: number }>({});

  // ---------- helpers: autosize + row heights ----------
  const autoSizeNonMultiline = useCallback(() => {
    const api = apiRef.current;
    if (!api || !api.getColumns) return;

    const cols = api.getColumns() as Column[] | null;
    if (!cols) return;

    const ids = cols
      .map(c => c.getColId())
      .filter((id): id is string => Boolean(id) && !MULTILINE_COLS.includes(String(id)));

    if (ids.length) {
      (api as any).autoSizeColumns?.(ids, false);
    }
  }, []);

  const recalcRowHeights = useCallback(() => {
    apiRef.current?.resetRowHeights();
  }, []);

  // ---------- load/refresh ----------
  const refresh = useCallback(async () => {
    try {
      const data = await listSheets(businessId);
      const formatted = Array.isArray(data)
        ? data.map((row: any) => ({
            ...row,
            id: Number(row.id),
            business_id: Number(row.business_id),
            refund_amount: Number(row.refund_amount ?? 0),
            return_within_30_days: !!row.return_within_30_days,
          }))
        : [];
      setRowData(formatted);
      setError('');

      const today = format(new Date(), 'yyyy-MM-dd');
      const totalsObj: { [key: string]: number } = {};
      formatted.forEach((r: any) => {
        if (r.date_received === today) {
          totalsObj[r.platform] = (totalsObj[r.platform] || 0) + r.refund_amount;
        }
      });
      setTotals(totalsObj);

      setTimeout(() => {
        autoSizeNonMultiline();
        recalcRowHeights();
      }, 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    }
  }, [businessId, autoSizeNonMultiline, recalcRowHeights]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ---------- add/delete ----------
  const addRow = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const base: Partial<SheetRecord> = {
      blocked_by: 'PIN Required',
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
      locked: 'No',
      oow_case: 'No',
      replacement_available: 'Yes',
      done_by: staffOptions[0],
      cs_comment: '',
      resolution: 'Back in stock',
      refund_amount: 0,
      refund_date: today,
      return_tracking_no: '',
      platform: '',
      return_within_30_days: false,
      issue: 'Choose',
      out_of_warranty: false,
      additional_notes: '',
      status: 'Pending',
      manager_notes: '',
    };

    try {
      const newSheet = await createSheet(businessId, base);
      setRowData(prev => {
        const newRow = { ...base, ...newSheet } as SheetRecord;
        const newRows = [...prev, newRow];
        setTimeout(() => {
          apiRef.current?.ensureIndexVisible(newRows.length - 1, 'middle');
          autoSizeNonMultiline();
          recalcRowHeights();
        }, 50);
        return newRows;
      });
    } catch (e: any) {
      alert(e.message || 'Create failed');
    }
  };

  const removeSelected = async () => {
    const rows = apiRef.current?.getSelectedRows() || [];
    if (!rows.length) return;
    if (!confirm(`Delete ${rows.length} row(s)?`)) return;
    try {
      for (const r of rows) if (r.id) await deleteSheet(businessId, r.id);
      await refresh();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  };

  // ---------- BM auto-fill ----------
  const handleBMOrderFetch = async (row: SheetRecord) => {
    try {
      if (!row.order_no || row.order_no.length !== 8) return;
      const data = await fetchBMOrder(row.order_no);
      if (!data) return;

      const updated: Partial<SheetRecord> = {
        customer_name: data.customer_name,
        imei: data.imei,
        sku: data.sku,
        refund_amount: data.refund_amount,
        return_tracking_no: data.return_tracking_no,
        platform: data.platform,
        order_date: data.order_date ?? new Date().toISOString().slice(0, 10),
        date_received: data.date_received ?? new Date().toISOString().slice(0, 10),
      };

      const payload: SheetRecord = { ...row, ...updated } as SheetRecord;
      await updateSheet(String(row.business_id), payload);

      setRowData(prev => prev.map(r => (r.id === row.id ? { ...r, ...updated } : r)));

      setTimeout(() => {
        autoSizeNonMultiline();
        recalcRowHeights();
      }, 0);
    } catch (err: any) {
      console.error('BM fetch failed:', err.message);
    }
  };

  // ---------- on edit ----------
  const onCellValueChanged = async (event: CellValueChangedEvent<SheetRecord>) => {
    const r = event.data;
    if (!r?.id) return;

    if (event.colDef.field === 'order_no' && r.order_no?.length === 8) {
      await handleBMOrderFetch(r);
      return;
    }

    const payload: SheetRecord = {
      ...r,
      refund_amount: Number(r.refund_amount ?? 0),
      return_within_30_days: !!r.return_within_30_days,
      out_of_warranty: !!r.out_of_warranty,
      platform: computePlatform(r.order_no ?? ''),
    };
    try {
      await updateSheet(String(r.business_id), payload);
    } catch (err: any) {
      console.error('Save failed:', err.message);
    }

    const field = event.colDef.field as string | undefined;
    const api = apiRef.current;
    if (field && api && !MULTILINE_COLS.includes(field)) {
      (api as any).autoSizeColumns?.([field], false);
    }
    recalcRowHeights();
  };

  // ---------- formatters ----------
  const dateFormatter = (p: any) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '');
  const currencyFormatter = (p: any) =>
    typeof p.value === 'number' ? `$${p.value.toFixed(2)}` : '$0.00';

  // ---------- columns ----------
  const colDefs: ColDef<SheetRecord>[] = useMemo(
    () => [
      { headerName: 'Blocked By', field: 'blocked_by', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: blockedByOptions }, pinned: 'left', minWidth: 120 },
      { headerName: 'Return ID', valueGetter: p => buildReturnId(p.data?.order_date, p.node?.rowIndex ?? 0), editable: false, minWidth: 120 },
      { headerName: 'Date Received', field: 'date_received', editable: true, cellEditor: 'agDateCellEditor', valueFormatter: dateFormatter, minWidth: 130 },
      { headerName: 'Order Date', field: 'order_date', editable: true, cellEditor: 'agDateCellEditor', valueFormatter: dateFormatter, minWidth: 120 },
      { headerName: 'Order Number', field: 'order_no', editable: true, minWidth: 130 },
      { headerName: 'Customer Name', field: 'customer_name', editable: true, minWidth: 140 },
      { headerName: 'IMEI', field: 'imei', editable: true, minWidth: 130 },
      { headerName: 'SKU / Product', field: 'sku', editable: true, minWidth: 150 },

      // Multiline columns (fixed width, wrap, autoHeight)
      { headerName: 'Customer Comment', field: 'customer_comment', editable: true, cellEditor: 'agLargeTextCellEditor', cellEditorParams: { maxLength: 500, rows: 4 }, wrapText: true, autoHeight: true, width: 260 },
      { headerName: 'CS Comment', field: 'cs_comment', editable: true, wrapText: true, autoHeight: true, width: 260 },

      { headerName: 'Multiple Return', field: 'multiple_return', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose', 'No', '2nd Time', '3rd Time'] }, minWidth: 130 },
      { headerName: 'Apple/Google ID', field: 'apple_google_id', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose', 'Yes', 'Yes-Issue raised', 'No'] }, minWidth: 150 },
      { headerName: 'Return Type', field: 'return_type', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Refund', 'URGENT REPAIR', 'Replacement', 'Repair', 'Faulty', 'Other'] }, minWidth: 130 },
      { headerName: 'Locked', field: 'locked', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: lockedOptions }, minWidth: 120 },
      { headerName: 'OOW Case', field: 'oow_case', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: oowOptions }, minWidth: 120 },
      { headerName: 'Replacement Available', field: 'replacement_available', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Yes', 'No'] }, minWidth: 170 },
      { headerName: 'Done By', field: 'done_by', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: staffOptions }, minWidth: 110 },

      { headerName: 'Resolution', field: 'resolution', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Back in stock', 'Sent repaired back to customer', 'Sent back to customer', 'Sent replacement', 'Sent back to supplier', 'BER'] }, minWidth: 160 },
      { headerName: 'Refund Amount', field: 'refund_amount', editable: true, valueFormatter: currencyFormatter, minWidth: 130 },
      { headerName: 'Refund Date', field: 'refund_date', editable: true, cellEditor: 'agDateCellEditor', valueFormatter: dateFormatter, minWidth: 120 },
      { headerName: 'Return Tracking No', field: 'return_tracking_no', editable: true, minWidth: 160 },
      { headerName: 'Platform', field: 'platform', editable: false, valueGetter: p => computePlatform(p.data?.order_no ?? ''), minWidth: 110 },
      { headerName: 'Return within 30 days', field: 'return_within_30_days', editable: false, valueGetter: p => computeWithin30(p.data?.date_received ?? '', p.data?.order_date ?? ''), minWidth: 180 },
      { headerName: 'Issue', field: 'issue', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose', 'Battery', 'board', 'Body issue', 'bought wrong device', 'Buttons', 'Camera', 'Change of mind', 'Charging', 'Charging Port', 'Cosmetic', 'Damage in transit', 'GPS', 'IC', 'Language', 'Lcd', 'Mic', 'Network', 'Overheating', 'OW', 'Screen', 'Software', 'Speaker', 'Wrong product', 'No issue', 'Other'] }, minWidth: 160 },
      { headerName: 'Out of Warranty', field: 'out_of_warranty', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Yes', 'No'] }, minWidth: 140 },

      // Multiline columns
      { headerName: 'Additional Notes', field: 'additional_notes', editable: true, wrapText: true, autoHeight: true, width: 260 },

      { headerName: 'Status', field: 'status', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Pending', 'In Progress', 'Resolved'] }, minWidth: 120 },
      { headerName: 'Manager Notes', field: 'manager_notes', editable: true, wrapText: true, autoHeight: true, width: 260 },

      {
        headerName: '',
        pinned: 'right',
        width: 80,
        cellRenderer: (p: any) => (
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
    ],
    [businessId, refresh]
  );

  // ---------- grid events ----------
  const onGridReady = useCallback((params: GridReadyEvent<SheetRecord>) => {
    apiRef.current = params.api;
  }, []);

  const onFirstDataRendered = useCallback((_e: FirstDataRenderedEvent<SheetRecord>) => {
    autoSizeNonMultiline();
    recalcRowHeights();
  }, [autoSizeNonMultiline, recalcRowHeights]);

  const onGridSizeChanged = useCallback((_e: GridSizeChangedEvent<SheetRecord>) => {
    autoSizeNonMultiline();
  }, [autoSizeNonMultiline]);

  const onColumnResized = useCallback((e: ColumnResizedEvent<SheetRecord>) => {
    if (e.finished) recalcRowHeights();
  }, [recalcRowHeights]);

  return (
    <div className="flex flex-col space-y-3 p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <Button className="gap-2" onClick={addRow}><Plus /> New Row</Button>
        <Button variant="outline" className="gap-2" onClick={removeSelected}><Trash2 /> Delete Selected</Button>
        <Button variant="outline" className="gap-2" onClick={refresh}><RotateCcw /> Refresh</Button>
      </div>

      <div className="flex gap-4 text-gray-800 font-medium mb-2">
        {Object.entries(totals).map(([platform, amount]) => (
          <div key={platform}>{platform}: ${amount.toFixed(2)}</div>
        ))}
      </div>

      <div className="ag-theme-alpine" style={{ width: '100%', height: '75vh', borderRadius: '0.5rem' }}>
        <AgGridReact<SheetRecord>
          onGridReady={onGridReady}
          rowData={rowData}
          columnDefs={colDefs}
          rowSelection={{ mode: 'multiRow' }}
          animateRows
          singleClickEdit
          stopEditingWhenCellsLoseFocus
          enableCellTextSelection
          onCellValueChanged={onCellValueChanged}
          onFirstDataRendered={onFirstDataRendered}
          onGridSizeChanged={onGridSizeChanged}
          onColumnResized={onColumnResized}
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: true,
            minWidth: 100,
            cellClass: 'px-2 py-1 border border-gray-200 hover:bg-gray-50',
          }}
          getRowId={p => String(p.data?.id ?? Math.random())}
        />
      </div>
    </div>
  );
}
