'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Trash2, RotateCcw, Search, Calendar, Paperclip } from 'lucide-react';
import { AttachmentManager } from './AttachmentManager';
import { listSheets, createSheet, updateSheet, deleteSheet, fetchBMOrder, searchSheets, getSheetsByDateRange } from './api';
import { computePlatform, computeWithin30, buildReturnId } from '@/lib/sheetFormulas';
import { useCurrency } from '@/hooks/useCurrency';
import { apiClient } from '@/lib/api';
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
  out_of_warranty: string;
  additional_notes: string;
  status: string;
  manager_notes: string;
}

const blockedByOptions = [
  'Choose','','PIN Required','Code Required','Apple ID Required','Google ID Required',
  'Awaiting Part','Awaiting Replacement','Awaiting Customer','Awaiting BM','Awaiting G&I','Awaiting Techezm'
];
const lockedOptions = ['Choose','No','Google ID','Apple ID','PIN'];
const oowOptions = ['Choose','No','Damaged','Wrong Device'];

// Columns that should be multiline, fixed width
const MULTILINE_COLS = ['customer_comment', 'additional_notes', 'cs_comment', 'manager_notes'];

// Helpers
const toYMD = (v: any): string => {
  if (!v || v === '') return '';
  
  // Handle string dates
  if (typeof v === 'string') {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    
    // Handle dd/MM/yyyy format (European style - our display format)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)) {
      const [day, month, year] = v.split('/');
      const parsedDay = parseInt(day, 10);
      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);
      
      // Validate ranges
      if (parsedDay >= 1 && parsedDay <= 31 && parsedMonth >= 1 && parsedMonth <= 12) {
        const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (!isNaN(date.getTime())) {
          return format(date, 'yyyy-MM-dd');
        }
      }
    }
    
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return format(d, 'yyyy-MM-dd');
  }
  
  // Handle Date objects
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return format(v, 'yyyy-MM-dd');
  }
  
  // Try to parse other formats
  const d = new Date(v);
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
  out_of_warranty: r.out_of_warranty || 'Choose',
  date_received: toYMD(r.date_received) || '',
  order_date: toYMD(r.order_date) || '',
  refund_date: r.refund_date ? toYMD(r.refund_date) || '' : '',
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
      if (eq(b, 'Awaiting Techezm')) return '#F97316';
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
  const { formatCurrency } = useCurrency(businessId);
  const apiRef = useRef<GridApi<SheetRecord> | null>(null);
  const [rowData, setRowData] = useState<SheetRecord[]>([]);
  const [filteredData, setFilteredData] = useState<SheetRecord[]>([]);
  const [staffOptions, setStaffOptions] = useState<string[]>(['Choose']);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isDateFiltered, setIsDateFiltered] = useState<boolean>(false);
  const [platformFilter, setPlatformFilter] = useState<string>('All');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState<boolean>(false);
  const [selectedRowsForDeletion, setSelectedRowsForDeletion] = useState<number[]>([]);
  const [singleRowIdForDeletion, setSingleRowIdForDeletion] = useState<number | null>(null);
  const [totals, setTotals] = useState<{ amazon: number; backmarket: number; total: number }>({
    amazon: 0, backmarket: 0, total: 0
  });
  const [attachmentCounts, setAttachmentCounts] = useState<{ [sheetId: number]: number }>({});

  // Smart search and platform filtering
  useEffect(() => {
    const performFiltering = async () => {
      let dataToFilter = rowData;

      // Apply search filter first
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const localFiltered = rowData.filter(row => {
          const orderNo = (row.order_no || '').toLowerCase();
          const customerName = (row.customer_name || '').toLowerCase();
          return orderNo.includes(searchLower) || customerName.includes(searchLower);
        });

        // If found results in local data, use them
        if (localFiltered.length > 0) {
          dataToFilter = localFiltered;
        } else {
          // If no local results, search the full database
          try {
            const searchResults = await searchSheets(businessId, searchTerm);
            const formatted = searchResults.map((row: any) => ({
              ...row,
              id: Number(row.id),
              business_id: Number(row.business_id),
              refund_amount: Number(row.refund_amount ?? 0),
              date_received: row.date_received ? toYMD(row.date_received) : '',
              order_date: row.order_date ? toYMD(row.order_date) : '',
              refund_date: row.refund_date ? toYMD(row.refund_date) : '',
              return_within_30_days: !!row.return_within_30_days,
              out_of_warranty: row.out_of_warranty || 'Choose',
            }));
            dataToFilter = formatted;
          } catch (error) {
            dataToFilter = localFiltered; // Fall back to local results (empty)
          }
        }
      }

      // Apply platform filter
      if (platformFilter !== 'All') {
        dataToFilter = dataToFilter.filter(row => {
          const platform = computePlatform(row.order_no || '');
          return platform === platformFilter;
        });
      }

      setFilteredData(dataToFilter);
    };

    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(performFiltering, 300);
    return () => clearTimeout(timeoutId);
  }, [rowData, searchTerm, platformFilter, businessId]);

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

  // Load staff options
  const loadStaffOptions = useCallback(async () => {
    try {
      const users = await apiClient.getBusinessUsers(Number(businessId));
      const usernames = users.map((user: any) => user.username);
      setStaffOptions(['Choose', ...usernames]);
    } catch (error) {
      console.error('Failed to load staff options:', error);
      // Keep default options on error
      setStaffOptions(['Choose']);
    }
  }, [businessId]);

  // Load attachment counts for all sheets
  const loadAttachmentCounts = useCallback(async (sheets: SheetRecord[]) => {
    const counts: { [sheetId: number]: number } = {};
    
    // Load attachment counts for each sheet
    await Promise.all(
      sheets.map(async (sheet) => {
        try {
          const attachments = await apiClient.getAttachments(sheet.id);
          counts[sheet.id] = attachments.length;
        } catch (error) {
          counts[sheet.id] = 0; // Default to 0 on error
        }
      })
    );
    
    setAttachmentCounts(counts);
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
          out_of_warranty: row.out_of_warranty || 'Choose',
        }))
      : [];
    setRowData(formatted);
    recomputeTodayTotals(formatted);
    
    // Load attachment counts
    loadAttachmentCounts(formatted);

    setTimeout(() => {
      autoSizeNonMultiline();
      reflowAutoHeight();
    }, 0);
  }, [businessId, autoSizeNonMultiline, reflowAutoHeight, recomputeTodayTotals, loadAttachmentCounts]);

  useEffect(() => { 
    loadStaffOptions();
    refresh(); 
  }, [loadStaffOptions, refresh]);

  // Date range filtering
  const handleDateRangeFilter = useCallback(async () => {
    if (!dateFrom || !dateTo) return;

    try {
      const dateResults = await getSheetsByDateRange(businessId, dateFrom, dateTo);
      const formatted: SheetRecord[] = dateResults.map((row: any) => ({
        ...row,
        id: Number(row.id),
        business_id: Number(row.business_id),
        refund_amount: Number(row.refund_amount ?? 0),
        date_received: row.date_received ? toYMD(row.date_received) : '',
        order_date: row.order_date ? toYMD(row.order_date) : '',
        refund_date: row.refund_date ? toYMD(row.refund_date) : '',
        return_within_30_days: !!row.return_within_30_days,
        out_of_warranty: row.out_of_warranty || 'Choose',
      }));
      
      setRowData(formatted);
      setIsDateFiltered(true);
      recomputeTodayTotals(formatted);

      setTimeout(() => {
        autoSizeNonMultiline();
        reflowAutoHeight();
      }, 0);
    } catch (error) {
      // Silently handle date range filter errors
    }
  }, [businessId, dateFrom, dateTo, autoSizeNonMultiline, reflowAutoHeight, recomputeTodayTotals]);

  // Clear date filter and return to default loading
  const clearDateFilter = useCallback(() => {
    setDateFrom('');
    setDateTo('');
    setIsDateFiltered(false);
    refresh(); // This will load the default filtered data
  }, [refresh]);

  // Trigger date filter when both dates are selected
  useEffect(() => {
    if (dateFrom && dateTo) {
      handleDateRangeFilter();
    }
  }, [dateFrom, dateTo, handleDateRangeFilter]);

  // Add/Delete
  const addRow = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const base: Partial<SheetRecord> = {
      blocked_by: '',
      date_received: today,
      order_date: today,
      order_no: '',
      customer_name: '',
      imei: '',
      sku: '',
      customer_comment: '',
      multiple_return: 'Choose',
      apple_google_id: 'Choose',
      return_type: 'Choose',
      locked: 'Choose',
      oow_case: 'Choose',
      replacement_available: 'Choose',
      done_by: 'Choose',
      cs_comment: '',
      resolution: 'Choose',
      refund_amount: 0,
      refund_date: undefined,
      return_tracking_no: '',
      platform: '',
      return_within_30_days: false,
      issue: 'Choose',
      out_of_warranty: 'Choose',
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

  const removeSelected = () => {
    const rows = apiRef.current?.getSelectedRows() || [];
    if (!rows.length) return;
    
    const rowIds = rows.map(r => r.id).filter(Boolean) as number[];
    setSelectedRowsForDeletion(rowIds);
    setBulkDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    for (const id of selectedRowsForDeletion) {
      await deleteSheet(businessId, id);
    }
    setBulkDeleteConfirmOpen(false);
    setSelectedRowsForDeletion([]);
    await refresh();
  };

  const handleSingleRowDelete = (rowId: number) => {
    setSingleRowIdForDeletion(rowId);
    setDeleteConfirmOpen(true);
  };

  const confirmSingleDelete = async () => {
    if (singleRowIdForDeletion) {
      await deleteSheet(businessId, singleRowIdForDeletion);
      setDeleteConfirmOpen(false);
      setSingleRowIdForDeletion(null);
      await refresh();
    }
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

    // Prevent saving if the change would result in data loss
    const changedField = event.colDef.field as string | undefined;
    if (changedField && ['date_received', 'order_date', 'refund_date'].includes(changedField)) {
      // If the new value is invalid and would clear existing data, don't save
      if (event.newValue === '' && event.oldValue && event.oldValue !== '') {
        // Restore the old value
        if (event.node && event.node.data) {
          (event.node.data as any)[changedField] = event.oldValue;
          apiRef.current?.redrawRows?.({ rowNodes: [event.node] });
        }
        return;
      }
    }

    const payload = normalizeForSave(r);

    // Trigger BM fetch when order_no becomes 8 chars
    if (event.colDef.field === 'order_no' && payload.order_no?.length === 8) {
      await handleBMOrderFetch(payload);
      apiRef.current?.redrawRows?.({ rowNodes: [event.node] });
      return;
    }

    await updateSheet(String(payload.business_id), payload).catch(() => {
      // Silently handle save errors
    });

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

  // Custom Date Cell Editor Component
  const DateCellEditor = React.forwardRef((props: any, ref: any) => {
    const [value, setValue] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => ({
      getValue: () => {
        // Convert display format back to YYYY-MM-DD for storage
        return toYMD(value) || props.value || '';
      },
      isCancelBeforeStart: () => false,
      isCancelAfterEnd: () => false,
    }));

    React.useEffect(() => {
      // Initialize with formatted display value
      const initialValue = props.value ? format(new Date(props.value), 'dd/MM/yyyy') : '';
      setValue(initialValue);
      
      // Focus and select the input
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [props.value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;
      
      // Auto-format as user types (add slashes)
      newValue = newValue.replace(/\D/g, ''); // Remove non-digits
      if (newValue.length >= 2) {
        newValue = newValue.slice(0, 2) + '/' + newValue.slice(2);
      }
      if (newValue.length >= 5) {
        newValue = newValue.slice(0, 5) + '/' + newValue.slice(5, 9);
      }
      
      setValue(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        props.stopEditing();
      } else if (e.key === 'Escape') {
        setValue(props.value ? format(new Date(props.value), 'dd/MM/yyyy') : '');
        props.stopEditing();
      }
    };

    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="dd/MM/yyyy"
        className="w-full h-full px-2 border-none outline-none bg-white"
        style={{ height: '100%', border: 'none', outline: 'none' }}
      />
    );
  });

  DateCellEditor.displayName = 'DateCellEditor';

  // Formatters and parsers
  const dateFormatter = (p: any) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '');
  const dateParser = (p: any) => {
    // If newValue is null, undefined, or empty string, preserve the original value
    if (p.newValue == null || p.newValue === '') {
      return p.oldValue || '';
    }
    return toYMD(p.newValue);
  };
  const numberParser = (p: any) => {
    const n = parseFloat(p.newValue);
    return isNaN(n) ? 0 : n;
  };

  // Columns
  const colDefs: ColDef<SheetRecord>[] = useMemo(
    () => [
      { headerName: 'Blocked By', field: 'blocked_by', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: blockedByOptions }, pinned: 'left', minWidth: 120 },
      { headerName: 'Return ID', valueGetter: p => buildReturnId(p.data?.date_received, p.node?.rowIndex ?? 0), editable: false, minWidth: 120 },

      { headerName: 'Date Received', field: 'date_received', editable: true, 
        cellEditor: DateCellEditor,
        valueFormatter: dateFormatter, 
        valueParser: dateParser,
        suppressKeyboardEvent: (params: any) => {
          // Prevent delete/backspace from clearing the cell when it has a value
          if (params.event.key === 'Delete' || params.event.key === 'Backspace') {
            if (params.node.data?.date_received) {
              return true; // suppress the event
            }
          }
          return false;
        },
        minWidth: 130 },
      { headerName: 'Order Date', field: 'order_date', editable: true, 
        cellEditor: DateCellEditor,
        valueFormatter: dateFormatter, 
        valueParser: dateParser,
        suppressKeyboardEvent: (params: any) => {
          // Prevent delete/backspace from clearing the cell when it has a value
          if (params.event.key === 'Delete' || params.event.key === 'Backspace') {
            if (params.node.data?.order_date) {
              return true; // suppress the event
            }
          }
          return false;
        },
        minWidth: 120 },

      { headerName: 'Order Number', field: 'order_no', editable: true, minWidth: 130 },
      { headerName: 'Customer Name', field: 'customer_name', editable: true, minWidth: 140 },
      { headerName: 'IMEI', field: 'imei', editable: true, minWidth: 130 },
      { headerName: 'SKU / Product', field: 'sku', editable: true, minWidth: 150 },

      // Multiline, fixed width
      { headerName: 'Customer Comment', field: 'customer_comment', editable: true, cellEditor: 'agLargeTextCellEditor', cellEditorParams: { maxLength: 500, rows: 4 }, wrapText: true, autoHeight: true, width: 260 },
      { headerName: 'CS Comment', field: 'cs_comment', editable: true, wrapText: true, autoHeight: true, width: 260 },

      { headerName: 'Multiple Return', field: 'multiple_return', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose','No','2nd Time','3rd Time'] }, minWidth: 130 },
      { headerName: 'Apple/Google ID', field: 'apple_google_id', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose','Yes','Yes-Issue raised','No'] }, minWidth: 150 },
      { headerName: 'Return Type', field: 'return_type', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose','Refund','URGENT REPAIR','Replacement','Repair','Faulty','Other'] }, minWidth: 130 },

      { headerName: 'Locked', field: 'locked', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: lockedOptions }, minWidth: 120 },
      { headerName: 'OOW Case', field: 'oow_case', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: oowOptions }, minWidth: 120 },

      { headerName: 'Replacement Available', field: 'replacement_available', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose','Yes','No'] }, minWidth: 170 },
      { headerName: 'Done By', field: 'done_by', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: staffOptions }, minWidth: 110 },

      { headerName: 'Resolution', field: 'resolution', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose','Back in stock','Sent repaired back to customer','Sent back to customer','Sent replacement','Sent back to supplier','BER'] }, minWidth: 160 },

      { headerName: 'Refund Amount', field: 'refund_amount', editable: true, valueFormatter: (p) => typeof p.value === 'number' ? formatCurrency(p.value) : formatCurrency(0), valueParser: numberParser, minWidth: 130 },

      { headerName: 'Refund Date', field: 'refund_date', editable: true, 
        cellEditor: DateCellEditor,
        valueFormatter: dateFormatter, 
        valueParser: dateParser,
        suppressKeyboardEvent: (params: any) => {
          // Prevent delete/backspace from clearing the cell when it has a value
          if (params.event.key === 'Delete' || params.event.key === 'Backspace') {
            if (params.node.data?.refund_date) {
              return true; // suppress the event
            }
          }
          return false;
        },
        minWidth: 120 },

      { headerName: 'Return Tracking No', field: 'return_tracking_no', editable: true, minWidth: 160 },
      { headerName: 'Platform', field: 'platform', editable: false, valueGetter: p => computePlatform(p.data?.order_no ?? ''), minWidth: 110 },
      { headerName: 'Return within 30 days', field: 'return_within_30_days', editable: false, valueGetter: p => computeWithin30(p.data?.date_received ?? '', p.data?.order_date ?? ''), minWidth: 180 },

      { headerName: 'Issue', field: 'issue', editable: true, cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Choose','Battery','board','Body issue','bought wrong device','Buttons','Camera','Change of mind','Charging','Charging Port','Cosmetic','Damage in transit','GPS','IC','Language','Lcd','Mic','Network','Overheating','OW','Screen','Software','Speaker','Wrong product','No issue','Other'] },
        minWidth: 160 },

      { headerName: 'Out of Warranty', field: 'out_of_warranty', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Choose','Yes','No'] }, minWidth: 140 },

      // Multiline, fixed width
      { headerName: 'Additional Notes', field: 'additional_notes', editable: true, wrapText: true, autoHeight: true, width: 260 },

      { headerName: 'Status', field: 'status', editable: true, cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['Pending','In Progress','Resolved'] }, minWidth: 120 },
      { headerName: 'Manager Notes', field: 'manager_notes', editable: true, wrapText: true, autoHeight: true, width: 260 },

      {
        headerName: 'Actions',
        pinned: 'right',
        width: 120,
        cellRenderer: (p: any) => (
          <div className="flex justify-end gap-1 pr-1">
            <div className="relative">
              <AttachmentManager 
                sheetId={p.data?.id} 
                onAttachmentChange={() => {
                  // Refresh attachment count for this row
                  if (p.data?.id) {
                    apiClient.getAttachments(p.data.id).then(attachments => {
                      setAttachmentCounts(prev => ({
                        ...prev,
                        [p.data.id]: attachments.length
                      }));
                    }).catch(() => {
                      // Ignore errors for count updates
                    });
                  }
                }}
              />
              {attachmentCounts[p.data?.id] > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {attachmentCounts[p.data?.id]}
                </span>
              )}
            </div>
            <button
              className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
              onClick={() => p.data?.id && handleSingleRowDelete(p.data.id)}
              title="Delete row"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [businessId, refresh, staffOptions, formatCurrency, attachmentCounts]
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

  // Calculate status stats based on filtered data
  const statusStats = useMemo(() => {
    const blocked = filteredData.filter(row => 
      row.blocked_by && row.blocked_by.trim() !== '' && row.blocked_by !== 'Choose'
    ).length;

    const unresolved = filteredData.filter(row => {
      const isBlocked = row.blocked_by && row.blocked_by.trim() !== '' && row.blocked_by !== 'Choose';
      const isNotResolved = !row.status || row.status.toLowerCase() !== 'resolved';
      return !isBlocked && isNotResolved;
    }).length;

    const resolved = filteredData.filter(row => 
      row.status && row.status.toLowerCase() === 'resolved'
    ).length;

    const total = filteredData.length;
    const actionable = unresolved; // Cases that can be worked on (not blocked, not resolved)

    return { blocked, unresolved, resolved, total, actionable };
  }, [filteredData]);

  return (
    <div className="flex flex-col space-y-3 p-4 bg-white rounded-lg shadow-md">
      {/* Filters Row */}
      <div className="flex items-center justify-between mb-3 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">Date Range:</span>
            </div>
            <span className="text-sm text-muted-foreground">From:</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
            />
            <span className="text-sm text-muted-foreground">To:</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
            />
            {isDateFiltered && (
              <Button variant="outline" size="sm" onClick={clearDateFilter}>
                Clear
              </Button>
            )}
          </div>
          
          {/* Platform Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">Platform:</span>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Amazon">Amazon</SelectItem>
                <SelectItem value="Back Market">Back Market</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Order Number or Customer Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-80"
          />
        </div>
      </div>

      {/* Status Stats */}
      <div className="mb-2 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Status Overview</h3>
          <span className="text-xs text-gray-500">Updates with filters</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded-md shadow-sm border border-red-100">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-red-700 font-medium text-sm">Blocked:</span>
            <span className="text-lg font-bold text-red-800">{statusStats.blocked}</span>
          </div>
          <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-md shadow-sm border border-yellow-100">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-yellow-700 font-medium text-sm">Actionable:</span>
            <span className="text-lg font-bold text-yellow-800">{statusStats.actionable}</span>
          </div>
          <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-md shadow-sm border border-green-100">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-700 font-medium text-sm">Resolved:</span>
            <span className="text-lg font-bold text-green-800">{statusStats.resolved}</span>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-md shadow-sm border border-blue-100">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-blue-700 font-medium text-sm">Total:</span>
            <span className="text-lg font-bold text-blue-800">{statusStats.total}</span>
          </div>
          {statusStats.total > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-md shadow-sm border border-slate-100">
              <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
              <span className="text-slate-700 font-medium text-sm">Progress:</span>
              <span className="text-lg font-bold text-slate-800">
                {Math.round((statusStats.resolved / statusStats.total) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Buttons Row */}
      <div className="flex items-center gap-2 mb-2">
        <Button className="gap-2" onClick={addRow}><Plus /> New Row</Button>
        <Button variant="outline" className="gap-2" onClick={removeSelected}><Trash2 /> Delete Selected</Button>
        <Button variant="outline" className="gap-2" onClick={refresh}><RotateCcw /> Refresh</Button>
      </div>

      {/* Marketplace totals for today */}
      <div className="flex flex-wrap gap-4 text-gray-800 font-medium mb-2">
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-md shadow-sm">
          <span className="text-blue-700 font-semibold">Amazon Refunds (Today):</span>
          <span className="text-lg font-bold text-blue-800">{formatCurrency(totals.amazon)}</span>
        </div>
        <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-md shadow-sm">
          <span className="text-green-700 font-semibold">Back Market Refunds (Today):</span>
          <span className="text-lg font-bold text-green-800">{formatCurrency(totals.backmarket)}</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-md shadow-sm">
          <span className="text-slate-700 font-semibold">Total Refunds (All Marketplaces):</span>
          <span className="text-lg font-bold text-slate-900">{formatCurrency(totals.total)}</span>
        </div>
      </div>

      {/* Optional legend */}
      <div className="flex flex-wrap gap-2 text-xs mb-2">
        {[
          ['#166534','Resolved'],
          ['#F59E0B','Awaiting Customer/BM'],
          ['#1D4ED8','Awaiting G&I'],
          ['#F97316','Awaiting Techezm'],
          ['#DB2777','Awaiting Replacement'],
          ['#6B7280','Blocked'],
          ['#DC2626','Locked'],
          ['#B45309','OOW'],
          ['#22C55E','Unresolved'],
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
          rowData={filteredData}
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

      {/* Single Row Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this row? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSingleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRowsForDeletion.length} selected row(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedRowsForDeletion([])}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-700">
              Delete {selectedRowsForDeletion.length} Row(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
