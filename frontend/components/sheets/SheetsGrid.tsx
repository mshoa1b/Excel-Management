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
  Column,
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
  date_received: string;  // 'yyyy-MM-dd'
  order_date: string;     // 'yyyy-MM-dd'
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
  refund_date?: string;   // 'yyyy-MM-dd'
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
  'PIN Required','Code Required','Apple ID Required','Google ID Required',
  'Awaiting Part','Awaiting Replacement','Awaiting Customer','Awaiting BM','Awaiting G&I','Awaiting Softezm'
];
const lockedOptions = ['No','Google ID','Apple ID','PIN'];
const oowOptions = ['No','Damaged','Wrong Device'];

// Columns that should be multiline, fixed width
const MULTILINE_COLS = ['customer_comment', 'additional_notes', 'cs_comment', 'manager_notes'];

// Helpers
const toYMD = (v: any): string => {
  if (!v) return '';
  const d = typeof v === 'string' ? new Date(v) : v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return '';
  return format(d, 'yyyy-MM-dd');
};

// Parse a date-like value to a local midnight Date
const toLocalMidnight = (v: string | Date | undefined | null): Date | null => {
  if (!v) return null;

  if (v instanceof Date && !isNaN(v.getTime())) {
    return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  }

  if (typeof v === 'string') {
    if (v.includes('/')) {
      const [dd, mm, yyyy] = v.split('/');
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    if (v.includes('-')) {
      const [yyyy, mm, dd] = v.split('-');
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    const d = new Date(v);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  return null;
};

const normalizeForSave = (r: SheetRecord): SheetRecord => ({
  ...r,
  refund_amount: Number(r.refund_amount ?? 0),
  platform: computePlatform(r.order_no ?? ''),
  return_within_30_days: !!r.return_within_30_days,
  out_of_warranty: !!r.out_of_warranty,
  date_received: toYMD(r.date_received),
  order_date: toYMD(r.order_date),
  refund_date: r.refund_date ? toYMD(r.refund_date) : undefined,
});

/** ========= Row color helpers ========= **/

const eq = (a?: string, b?: string) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

const notEmpty = (v?: string) => !!(v && v.trim().length);

// Pick readable text color for a background
const pickTextColor = (hex: string) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '#111';
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
  return lum > 0.6 ? '#111' : '#fff';
};

const colorForRow = (r?: SheetRecord): string => {
  if (!r) return '#22C55E';

  if (eq(r.status, 'resolved')) return '#166534';

  if (!eq(r.status, 'resolved')) {
    if (notEmpty(r.blocked_by)) {
      const b = (r.blocked_by || '').trim();
      if (eq(b, 'Awaiting Customer') || eq(b, 'Awaiting BM')) return '#F59E0B';
      if (eq(b, 'Awaiting G&I')) return '#1D4ED8';
      if (eq(b, 'Awaiting Softezm')) return '#F97316';
      if (eq(b, 'Awaiting Replacement')) return '#DB2777';
      return '#6B7280';
    }

    if (!notEmpty(r.blocked_by)) {
      if (eq(r.return_type, 'refund')) {
        if (notEmpty(r.locked) && !eq(r.locked, 'No')) return '#DC2626';
        if (notEmpty(r.oow_case) && !eq(r.oow_case, 'No')) return '#B45309';
        if ((!notEmpty(r.locked) || eq(r.locked, 'No')) && (!notEmpty(r.oow_case) || eq(r.oow_case, 'No')))
          return '#F97316';
      }

      if (eq(r.return_type, 'replacement')) {
        if (eq(r.replacement_available, 'yes') || eq(r.replacement_available, 'no')) return '#F97316';
        return '#1D4ED8';
      }
    }

    return '#22C55E';
  }

  return '#22C55E';
};

/** ==================================== **/

export default function SheetsGrid({ businessId }: { businessId: string }) {
  const apiRef = useRef<GridApi<SheetRecord> | null>(null);
  const [rowData, setRowData] = useState<SheetRecord[]>([]);
  const [totals, setTotals] = useState<{ amazon: number; backmarket: number; total: number }>({
    amazon: 0, backmarket: 0, total: 0
  });

  // Prevent hover from overriding row colors
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .ag-theme-alpine .ag-row-hover {
        background-color: inherit !important;
        color: inherit !important;
        filter: none !important;
      }
      /* Also prevent cell hover overrides in some themes */
      .ag-theme-alpine .ag-cell:hover {
        background-color: transparent !important;
        color: inherit !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Autosize all except multiline
  const autoSizeNonMultiline = useCallback(() => {
    const api = apiRef.current;
    if (!api || !api.getColumns) return;
    const cols = api.getColumns() as Column[] | null;
    if (!cols) return;

    const ids = cols
      .map(c => c.getColId())
      .filter((id): id is string => Boolean(id) && !MULTILINE_COLS.includes(String(id)));

    if (ids.length) (api as any).autoSizeColumns?.(ids, false);
  }, []);

  const reflowAutoHeight = useCallback(() => {
    apiRef.current?.onRowHeightChanged?.();
  }, []);

  // Stats based on refund_date
  const recomputeTodayTotals = useCallback((rows: SheetRecord[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const t = { amazon: 0, backmarket: 0, total: 0 };

    for (const r of rows) {
      const d = toLocalMidnight(r.refund_date);
      if (!d) continue;

      if (d.getTime() === today.getTime()) {
        const p = (r.platform || computePlatform(r.order_no || '') || '').toLowerCase();
        const amt = Number(r.refund_amount || 0);
        if (p.includes('amazon')) t.amazon += amt;
        else if (p.includes('back market') || p.includes('backmarket') || p.includes('bm')) t.backmarket += amt;
        t.total += amt;
      }
    }
    setTotals(t);
  }, []);

  // Load
  const refresh = useCallback(async () => {
    const data = await listSheets(businessId);
    const formatted: SheetRecord[] = Array.isArray(data)
      ? data.map((row: any) => ({
          ...row,
          id: Number(row.id),
          business_id: Number(row.business_id),
          refund_amount: Number(row.refund_amount ?? 0),
          date_received: row.date_received ? toYMD(row.date_received) : '',
          order_date: row.order_date ? toYMD(row.order_date) : '',
          refund_date: row.refund_date ? toYMD(row.refund_date) : '',
          return_within_30_days: !!row.return_within_30_days,
          out_of_warranty: !!row.out_of_warranty,
        }))
      : [];
    setRowData(formatted);
    recomputeTodayTotals(formatted);

    setTimeout(() => {
      autoSizeNonMultiline();
      reflowAutoHeight();
    }, 0);
  }, [businessId, autoSizeNonMultiline, reflowAutoHeight, recomputeTodayTotals]);

  useEffect(() => { refresh(); }, [refresh]);

  // Add/Delete
  const addRow = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
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

    const newSheet = await createSheet(businessId, base);
    setRowData(prev => {
      const newRow = normalizeForSave({ ...base, ...newSheet } as SheetRecord);
      const newRows = [...prev, newRow];
      setTimeout(() => {
        apiRef.current?.ensureIndexVisible(newRows.length - 1, 'middle');
        autoSizeNonMultiline();
        reflowAutoHeight();
      }, 50);
      recomputeTodayTotals(newRows);
      return newRows;
    });
  };

  const removeSelected = async () => {
    const rows = apiRef.current?.getSelectedRows() || [];
    if (!rows.length) return;
    if (!confirm(`Delete ${rows.length} row(s)?`)) return;
    for (const r of rows) if (r.id) await deleteSheet(businessId, r.id);
    await refresh();
  };

  // BM auto-fill
  const handleBMOrderFetch = async (row: SheetRecord) => {
    if (!row.order_no || row.order_no.length !== 8) return;
    const data = await fetchBMOrder(row.order_no);
    if (!data) return;

    const updated: Partial<SheetRecord> = {
      customer_name: data.customer_name,
      imei: data.imei,
      sku: data.sku,
      refund_amount: Number(data.refund_amount ?? 0),
      return_tracking_no: data.return_tracking_no,
      platform: data.platform,
      order_date: toYMD(data.order_date ?? new Date()),
      date_received: toYMD(data.date_received ?? new Date()),
    };

    const payload = normalizeForSave({ ...row, ...updated } as SheetRecord);
    await updateSheet(String(row.business_id), payload);

    setRowData(prev => {
      const next = prev.map(r => (r.id === row.id ? { ...r, ...payload } : r));
      recomputeTodayTotals(next);
      return next;
    });

    setTimeout(() => {
      autoSizeNonMultiline();
      reflowAutoHeight();
    }, 0);
  };

  // Save edits
  const onCellValueChanged = async (event: CellValueChangedEvent<SheetRecord>) => {
    const r = event.data;
    if (!r?.id) return;

    const payload = normalizeForSave(r);

    // Trigger BM fetch when order_no becomes 8 chars
    if (event.colDef.field === 'order_no' && payload.order_no?.length === 8) {
      await handleBMOrderFetch(payload);
      apiRef.current?.redrawRows?.({ rowNodes: [event.node] });
      return;
    }

    await updateSheet(String(payload.business_id), payload).catch(err =>
      console.error('Save failed:', err?.message)
    );

    // Autosize changed column if not multiline
    const field = event.colDef.field as string | undefined;
    const api = apiRef.current;
    if (field && api && !MULTILINE_COLS.includes(field)) {
      (api as any).autoSizeColumns?.([field], false);
    }

    // Recompute when refund_date, refund_amount, platform, or order_no changes
    if (field === 'refund_amount' || field === 'refund_date' || field === 'platform' || field === 'order_no') {
      const next = rowData.map(x => (x.id === payload.id ? payload : x));
      recomputeTodayTotals(next);
      setRowData(next);
    }

    // Update auto-height and row color immediately
    reflowAutoHeight();
    apiRef.current?.redrawRows?.({ rowNodes: [event.node] });
  };

  // Formatters and parsers
  const dateFormatter = (p: any) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '');
  const dateParser = (p: any) => toYMD(p.newValue);
  const numberParser = (p: any) => {
    const n = parseFloat(p.newValue);
    return isNaN(n) ? 0 : n;
  };

  // Columns
  const colDefs: ColDef<SheetRecord>[] = useMemo(
    () => [
      { headerName: 'Blocked By', field: 'blocked_by', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: blockedByOptions }, pinned: 'left', minWidth: 120 },
      { headerName: 'Return ID', valueGetter: p => buildReturnId(p.data?.order_date, p.node?.rowIndex ?? 0), editable: false, minWidth: 120 },

      { headerName: 'Date Received', field: 'date_received', editable: true, cellEditor: 'agDateCellEditor', valueFormatter: dateFormatter, valueParser: dateParser, minWidth: 130 },
      { headerName: 'Order Date', field: 'order_date', editable: true, cellEditor: 'agDateCellEditor', valueFormatter: dateFormatter, valueParser: dateParser, minWidth: 120 },

      { headerName: 'Order Number', field: 'order_no', editable: true, minWidth: 130 },
      { headerName: 'Customer Name', field: 'customer_name', editable: true, minWidth: 140 },
      { headerName: 'IMEI', field: 'imei', editable: true, minWidth: 130 },
      { headerName: 'SKU / Product', field: 'sku', editable: true, minWidth: 150 },

      // Multiline, fixed width
      { headerName: 'Customer Comment', field: 'customer_comment', editable: true, cellEditor: 'agLargeTextCellEditor', cellEditorParams: { maxLength: 500, rows: 4 }, wrapText: true, autoHeight: true, width: 260 },
      { headerName: 'CS Comment', field: 'cs_comment', editable: true, wrapText: true, autoHeight: true, width: 260 },

      { headerName: 'Multiple Return', field: 'multiple_return', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose','No','2nd Time','3rd Time'] }, minWidth: 130 },
      { headerName: 'Apple/Google ID', field: 'apple_google_id', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose','Yes','Yes-Issue raised','No'] }, minWidth: 150 },
      { headerName: 'Return Type', field: 'return_type', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Refund','URGENT REPAIR','Replacement','Repair','Faulty','Other'] }, minWidth: 130 },

      { headerName: 'Locked', field: 'locked', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: lockedOptions }, minWidth: 120 },
      { headerName: 'OOW Case', field: 'oow_case', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: oowOptions }, minWidth: 120 },

      { headerName: 'Replacement Available', field: 'replacement_available', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Yes','No'] }, minWidth: 170 },
      { headerName: 'Done By', field: 'done_by', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: staffOptions }, minWidth: 110 },

      { headerName: 'Resolution', field: 'resolution', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Back in stock','Sent repaired back to customer','Sent back to customer','Sent replacement','Sent back to supplier','BER'] }, minWidth: 160 },

      { headerName: 'Refund Amount', field: 'refund_amount', editable: true, valueFormatter: (p) => typeof p.value === 'number' ? `$${p.value.toFixed(2)}` : '$0.00', valueParser: numberParser, minWidth: 130 },

      { headerName: 'Refund Date', field: 'refund_date', editable: true, cellEditor: 'agDateCellEditor', valueFormatter: dateFormatter, valueParser: dateParser, minWidth: 120 },

      { headerName: 'Return Tracking No', field: 'return_tracking_no', editable: true, minWidth: 160 },
      { headerName: 'Platform', field: 'platform', editable: false, valueGetter: p => computePlatform(p.data?.order_no ?? ''), minWidth: 110 },
      { headerName: 'Return within 30 days', field: 'return_within_30_days', editable: false, valueGetter: p => computeWithin30(p.data?.date_received ?? '', p.data?.order_date ?? ''), minWidth: 180 },

      { headerName: 'Issue', field: 'issue', editable: true, cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Choose','Battery','board','Body issue','bought wrong device','Buttons','Camera','Change of mind','Charging','Charging Port','Cosmetic','Damage in transit','GPS','IC','Language','Lcd','Mic','Network','Overheating','OW','Screen','Software','Speaker','Wrong product','No issue','Other'] },
        minWidth: 160 },

      { headerName: 'Out of Warranty', field: 'out_of_warranty', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Yes','No'] }, minWidth: 140 },

      // Multiline, fixed width
      { headerName: 'Additional Notes', field: 'additional_notes', editable: true, wrapText: true, autoHeight: true, width: 260 },

      { headerName: 'Status', field: 'status', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Pending','In Progress','Resolved'] }, minWidth: 120 },
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

  // Grid events
  const onGridReady = useCallback((params: GridReadyEvent<SheetRecord>) => {
    apiRef.current = params.api;
  }, []);

  const onFirstDataRendered = useCallback((_e: FirstDataRenderedEvent<SheetRecord>) => {
    autoSizeNonMultiline();
    reflowAutoHeight();
  }, [autoSizeNonMultiline, reflowAutoHeight]);

  const onGridSizeChanged = useCallback((_e: GridSizeChangedEvent<SheetRecord>) => {
    autoSizeNonMultiline();
  }, [autoSizeNonMultiline]);

  const onColumnResized = useCallback((e: ColumnResizedEvent<SheetRecord>) => {
    if (e.finished) reflowAutoHeight();
  }, [reflowAutoHeight]);

  return (
    <div className="flex flex-col space-y-3 p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <Button className="gap-2" onClick={addRow}><Plus /> New Row</Button>
        <Button variant="outline" className="gap-2" onClick={removeSelected}><Trash2 /> Delete Selected</Button>
        <Button variant="outline" className="gap-2" onClick={refresh}><RotateCcw /> Refresh</Button>
      </div>

      {/* Marketplace totals for today */}
      <div className="flex flex-wrap gap-4 text-gray-800 font-medium mb-2">
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-md shadow-sm">
          <span className="text-blue-700 font-semibold">Amazon Refunds (Today):</span>
          <span className="text-lg font-bold text-blue-800">${totals.amazon.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-md shadow-sm">
          <span className="text-green-700 font-semibold">Back Market Refunds (Today):</span>
          <span className="text-lg font-bold text-green-800">${totals.backmarket.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-md shadow-sm">
          <span className="text-slate-700 font-semibold">Total Refunds (All Marketplaces):</span>
          <span className="text-lg font-bold text-slate-900">${totals.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Optional legend */}
      <div className="flex flex-wrap gap-2 text-xs mb-2">
        {[
          ['#166534','Resolved'],
          ['#F59E0B','Awaiting Customer/BM'],
          ['#1D4ED8','Awaiting G&I or Replacement info unknown'],
          ['#F97316','Awaiting Softezm / Refund default / Replacement check'],
          ['#DB2777','Awaiting Replacement'],
          ['#6B7280','Other blocked'],
          ['#DC2626','Locked refund'],
          ['#B45309','OOW refund'],
          ['#22C55E','Unresolved fallback'],
        ].map(([hex,label])=>(
          <div key={hex} className="flex items-center gap-2 px-2 py-1 rounded border">
            <span style={{backgroundColor: hex, width: 14, height: 14, borderRadius: 3}} />
            <span>{label}</span>
          </div>
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
            // removed hover:bg-gray-50 to avoid white-out on hover
            cellClass: 'px-2 py-1 border border-gray-200',
          }}
          getRowId={p => String(p.data?.id ?? Math.random())}
          getRowStyle={(params) => {
            const bg = colorForRow(params.data);
            const color = pickTextColor(bg);
            return { backgroundColor: bg, color };
          }}
        />
      </div>
    </div>
  );
}
