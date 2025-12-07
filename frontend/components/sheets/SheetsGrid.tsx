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
import { Plus, Trash2, RotateCcw, Search, Calendar, Paperclip, MessageSquare, Download, History, Pencil, Truck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AttachmentManager } from './AttachmentManager';
import { SheetHistoryModal } from './SheetHistoryModal';
import { SheetFormModal } from './SheetFormModal';
import { CreateLabelModal } from './CreateLabelModal';
import { blockedByOptions, MULTILINE_COLS } from './constants';
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
  updated_at?: string;
}

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
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
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

      if (!notEmpty(r.locked) || eq(r.locked, 'Choose')) return '#1D4ED8';
      if (!notEmpty(r.oow_case) && eq(r.oow_case, 'Choose')) return '#1D4ED8';

      if (notEmpty(r.locked) && eq(r.locked, 'No') && !eq(r.locked, 'Choose')) return '#DC2626';
      if (notEmpty(r.oow_case) && !eq(r.oow_case, 'No') && !eq(r.locked, 'Choose')) return '#B45309';



      if (eq(r.return_type, 'refund')) {
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
  const [historyRow, setHistoryRow] = useState<SheetRecord | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [historySheetId, setHistorySheetId] = useState<number | null>(null);

  // Label Modal State
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [selectedSheetForLabel, setSelectedSheetForLabel] = useState<SheetRecord | null>(null);


  // Modal Edit State
  const [formOpen, setFormOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Partial<SheetRecord> | null>(null);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [enquiryCounts, setEnquiryCounts] = useState<{ [orderNumber: string]: number }>({});
  const [attachmentCounts, setAttachmentCounts] = useState<{ [sheetId: number]: number }>({});
  const [totals, setTotals] = useState<{ amazon: number; backmarket: number; total: number }>({ amazon: 0, backmarket: 0, total: 0 });
  // Enquiry handling functions
  const checkExistingEnquiry = async (orderNumber: string) => {
    try {
      const enquiries = await apiClient.request(`/enquiries?order_number=${encodeURIComponent(orderNumber)}`);
      // Find exact match (the backend does partial match, so we filter here)
      return enquiries.find((e: any) => e.order_number === orderNumber) || null;
    } catch (error) {
      console.error('Error checking existing enquiry:', error);
      return null;
    }
  };

  const handleEnquiryAction = async (orderNumber: string, platform: string) => {
    try {
      const existingEnquiry = await checkExistingEnquiry(orderNumber);

      if (existingEnquiry) {
        // Open existing enquiry in new tab
        window.open(`/enquiries/${existingEnquiry.id}`, '_blank');
      } else {
        // Create new enquiry in new tab with pre-filled data
        const createUrl = `/enquiries/create?order_number=${encodeURIComponent(orderNumber)}&platform=${platform}`;
        window.open(createUrl, '_blank');
      }
    } catch (error) {
      console.error('Error handling enquiry action:', error);
      alert('Failed to process enquiry action. Please try again.');
    }
  };

  // Add a ref to track if enquiry counts are currently loading
  const isLoadingEnquiryCounts = useRef(false);

  // Load enquiry counts for visible order numbers (bulk request)
  const loadEnquiryCounts = useCallback(async (sheets: SheetRecord[]) => {
    // Prevent multiple concurrent calls
    if (isLoadingEnquiryCounts.current) {
      return;
    }

    isLoadingEnquiryCounts.current = true;

    try {
      const orderNumbers = Array.from(new Set(sheets.map(sheet => sheet.order_no).filter(Boolean)));

      if (orderNumbers.length === 0) {
        setEnquiryCounts({});
        return;
      }

      // Use the new bulk counts endpoint
      const counts = await apiClient.request('/enquiries/bulk-counts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_numbers: orderNumbers })
      });

      setEnquiryCounts(counts);
    } catch (error) {
      console.error('Error loading enquiry counts:', error);
      // Set all counts to 0 on error
      const orderNumbers = Array.from(new Set(sheets.map(sheet => sheet.order_no).filter(Boolean)));
      const counts: { [orderNumber: string]: number } = {};
      orderNumbers.forEach(orderNumber => {
        counts[orderNumber] = 0;
      });
      setEnquiryCounts(counts);
    } finally {
      isLoadingEnquiryCounts.current = false;
    }
  }, []);

  // Smart search, platform, and tile filtering
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

        if (localFiltered.length > 0) {
          dataToFilter = localFiltered;
        } else {
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
              updated_at: row.updated_at,
            }));
            dataToFilter = formatted;
          } catch (error) {
            dataToFilter = localFiltered;
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

      // Apply Tile/Legend Filter
      if (activeFilter) {
        dataToFilter = dataToFilter.filter(row => {
          const status = (row.status || '').toLowerCase();
          const blockedBy = (row.blocked_by || '').trim();
          const isBlocked = blockedBy !== '' && blockedBy !== 'Choose';
          const locked = (row.locked || '').trim();
          const oow = (row.oow_case || '').trim();
          const returnType = (row.return_type || '').toLowerCase();
          const replacementAvailable = (row.replacement_available || '').toLowerCase();

          switch (activeFilter) {
            // Status Overview Filters
            case 'Blocked':
              return isBlocked;
            case 'Actionable':
              return !isBlocked && status !== 'resolved';
            case 'Resolved':
              return status === 'resolved';
            case 'Overdue': {
              if (!row.date_received || status === 'resolved') return false;
              const received = new Date(row.date_received);
              const now = new Date();
              const diffTime = now.getTime() - received.getTime();
              const diffDays = diffTime / (1000 * 3600 * 24);
              return diffDays > 14;
            }

            // Legend Filters
            case 'Legend_Resolved':
              return status === 'resolved';
            case 'Legend_Awaiting Customer/BM':
              return isBlocked && (eq(blockedBy, 'Awaiting Customer') || eq(blockedBy, 'Awaiting BM'));
            case 'Legend_Awaiting G&I':
              return isBlocked && eq(blockedBy, 'Awaiting G&I');
            case 'Legend_Awaiting Techezm':
              return isBlocked && eq(blockedBy, 'Awaiting Techezm');
            case 'Legend_Awaiting Replacement':
              return isBlocked && eq(blockedBy, 'Awaiting Replacement');
            case 'Legend_Blocked':
              // Generic blocked (not one of the specific ones above)
              return isBlocked && !['Awaiting Customer', 'Awaiting BM', 'Awaiting G&I', 'Awaiting Techezm', 'Awaiting Replacement'].some(x => eq(blockedBy, x));
            case 'Legend_Locked':
              return !isBlocked && status !== 'resolved' && notEmpty(locked) && eq(locked, 'No') && !eq(locked, 'Choose');
            case 'Legend_OOW':
              return !isBlocked && status !== 'resolved' && notEmpty(oow) && !eq(oow, 'No') && !eq(locked, 'Choose');
            case 'Legend_Unresolved':
              // Green default logic approximation
              const color = colorForRow(row);
              return color === '#22C55E';
            default:
              return true;
          }
        });
      }

      setFilteredData(dataToFilter);
    };

    const timeoutId = setTimeout(performFiltering, 300);
    return () => clearTimeout(timeoutId);
  }, [rowData, searchTerm, platformFilter, businessId, activeFilter]);

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

    if (ids.length) {
      // Autosize columns but skip header to fit content tightly
      (api as any).autoSizeColumns?.(ids, false);
    }
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
        updated_at: row.updated_at,
      }))
      : [];
    setRowData(formatted);
    recomputeTodayTotals(formatted);

    // Load attachment counts
    loadAttachmentCounts(formatted);

    // Load enquiry counts
    loadEnquiryCounts(formatted);

    setTimeout(() => {
      autoSizeNonMultiline();
      reflowAutoHeight();
    }, 0);
  }, [businessId, autoSizeNonMultiline, reflowAutoHeight, recomputeTodayTotals]);

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
        updated_at: row.updated_at,
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
  const addRow = () => {
    setEditingRow(null);
    setFormOpen(true);
  };

  const handleSaveSheet = async (data: Partial<SheetRecord>) => {
    try {
      if (data.id) {
        // Update existing
        const payload = normalizeForSave({ ...data } as SheetRecord);
        await updateSheet(String(businessId), payload);

        setRowData(prev => {
          const next = prev.map(r => r.id === payload.id ? payload : r);
          recomputeTodayTotals(next);
          return next;
        });
      } else {
        // Create new
        const newSheet = await createSheet(businessId, data);
        const normalized = normalizeForSave({ ...data, ...newSheet } as SheetRecord);

        setRowData(prev => {
          const next = [normalized, ...prev];
          recomputeTodayTotals(next);
          return next;
        });

        setTimeout(() => {
          apiRef.current?.ensureIndexVisible(0, 'middle');
          autoSizeNonMultiline();
          reflowAutoHeight();
        }, 50);
      }

      // Refresh attachment counts if needed, though form doesn't edit attachments yet

    } catch (error) {
      console.error("Failed to save sheet", error);
      alert("Failed to save sheet");
      throw error; // Propagate to modal to keep it open or show error
    }
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

  const handleViewHistory = (row: SheetRecord) => {
    if (!row?.id) return;
    setHistorySheetId(row.id);
    setHistoryRow(row);
    setHistoryModalOpen(true);
  };

  const handleHistoryClick = () => {
    const selectedRows = apiRef.current?.getSelectedRows();
    if (!selectedRows || selectedRows.length === 0) {
      alert("Please select a row to view history.");
      return;
    }
    if (selectedRows.length > 1) {
      alert("Please select only one row to view history.");
      return;
    }
    handleViewHistory(selectedRows[0]);
  };

  // BM auto-fill
  const handleBMOrderFetch = async (row: SheetRecord) => {
    if (!row.order_no || row.order_no.length !== 8) return;
    try {
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
    } catch (error) {
      console.warn("Back Market fetch failed (likely no creds):", error);
      // Suppress alert to avoid disrupting user workflow, but log it.
    }



    setTimeout(() => {
      autoSizeNonMultiline();
      reflowAutoHeight();
    }, 0);
  };

  // Save edits


  // Remove custom DateCellEditor - using ag-Grid's built-in agDateStringCellEditor instead

  // Formatters and parsers
  const dateFormatter = (p: any) => (p.value ? format(new Date(p.value), 'dd/MM/yyyy') : '');
  const dateParser = (p: any) => {
    // If newValue is null, undefined, or empty string, allow clearing the date
    if (p.newValue == null || p.newValue === '') {
      return '';
    }

    // Try to parse the new value and return it (toYMD already handles invalid dates by returning '')
    return toYMD(p.newValue);
  };
  const numberParser = (p: any) => {
    const n = parseFloat(p.newValue);
    return isNaN(n) ? 0 : n;
  };

  // Columns
  const colDefs: ColDef<SheetRecord>[] = useMemo(
    () => [

      {
        colId: 'rowNum',
        headerName: '#',
        valueGetter: (params: any) => (params.node?.rowIndex ?? 0) + 1,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        pinned: 'left',
        width: 90,
        minWidth: 90,
        maxWidth: 100,
        suppressMenu: true,
        filter: false,
        resizable: true,
        suppressSizeToFit: true
      },
      { headerName: 'Order Number', field: 'order_no', editable: false, pinned: 'left', minWidth: 150 },
      { headerName: 'Blocked By', field: 'blocked_by', editable: false, pinned: 'left' },
      { headerName: 'Customer Name', field: 'customer_name', editable: false },
      { headerName: 'IMEI', field: 'imei', editable: false, minWidth: 150 },
      { headerName: 'SKU', field: 'sku', editable: false },
      { headerName: 'Return ID', valueGetter: p => buildReturnId(p.data?.date_received, p.node?.rowIndex ?? 0), editable: false, hide: true },

      {
        headerName: 'Date Received', field: 'date_received', editable: false,
        valueFormatter: dateFormatter,
      },
      {
        headerName: 'Order Date', field: 'order_date', editable: false,
        valueFormatter: dateFormatter,
      },

      { headerName: 'Return Type', field: 'return_type', editable: false },
      { headerName: 'Locked', field: 'locked', editable: false },
      { headerName: 'OOW Case', field: 'oow_case', editable: false },

      { headerName: 'Replacement Available', field: 'replacement_available', editable: false },
      { headerName: 'Done By', field: 'done_by', editable: false },

      { headerName: 'Resolution', field: 'resolution', editable: false },

      { headerName: 'Refund Amount', field: 'refund_amount', editable: false, valueFormatter: (p) => typeof p.value === 'number' ? formatCurrency(p.value) : formatCurrency(0) },

      {
        headerName: 'Refund Date', field: 'refund_date', editable: false,
        valueFormatter: dateFormatter,
      },

      { headerName: 'Return Tracking No', field: 'return_tracking_no', editable: false },
      { headerName: 'Platform', field: 'platform', editable: false, valueGetter: p => computePlatform(p.data?.order_no ?? '') },
      { headerName: 'Return within 30 days', field: 'return_within_30_days', editable: false, valueGetter: p => computeWithin30(p.data?.date_received ?? '', p.data?.order_date ?? '') },

      {
        headerName: 'Issue', field: 'issue', editable: false,
      },

      { headerName: 'Out of Warranty', field: 'out_of_warranty', editable: false },

      // Multiline, fixed width
      { headerName: 'Additional Notes', field: 'additional_notes', editable: false, wrapText: true, autoHeight: true, width: 260 },

      { headerName: 'Status', field: 'status', editable: false },
      { headerName: 'Customer Comment', field: 'customer_comment', editable: false, wrapText: true, autoHeight: true, width: 260 },
      { headerName: 'Multiple Return', field: 'multiple_return', editable: false },
      { headerName: 'Manager Notes', field: 'manager_notes', editable: false, wrapText: true, autoHeight: true, width: 260 },

      { headerName: 'Last Updated', field: 'updated_at', editable: false, valueFormatter: (p) => p.value ? format(new Date(p.value), 'dd-MM-yyyy HH:mm') : '' },

      {
        headerName: 'Actions',
        pinned: 'right',
        width: 200,
        minWidth: 200,
        maxWidth: 240,
        filter: false,
        resizable: true,
        suppressSizeToFit: true,
        cellClass: 'p-0 flex items-center justify-center',
        cellRenderer: (p: any) => {
          const orderNumber = p.data?.order_no;
          const platform = computePlatform(p.data);
          const hasEnquiry = enquiryCounts[orderNumber] > 0;

          const btnClass = "h-8 w-8 inline-flex items-center justify-center rounded-md text-white group-hover:text-slate-800 hover:bg-white/20 group-hover:hover:bg-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2";
          const activeBtnClass = "h-6 w-6 inline-flex items-center justify-center rounded-md text-white bg-blue-600 hover:bg-blue-900 transition-all";

          return (
            <div className="flex items-center justify-end gap-[1px] h-full w-full">
              

              <button
                className={btnClass}
                onClick={() => {
                  if (p.data) {
                    setEditingRow(p.data);
                    setFormOpen(true);
                  }
                }}
                title="Edit Row"
              >
                <Pencil className="h-4 w-4" />
              </button>

              <button
                className={btnClass}
                onClick={() => {
                  if (p.data) {
                    setSelectedSheetForLabel(p.data);
                    setLabelModalOpen(true);
                  }
                }}
                title="Create Label"
              >
                <Truck className="h-4 w-4" />
              </button>

              <div className="flex-shrink-0">
                <AttachmentManager
                  sheetId={p.data?.id}
                  attachmentCount={attachmentCounts[p.data?.id] || 0}
                  returnId={buildReturnId(p.data?.date_received, p.node?.rowIndex ?? 0)}
                  onAttachmentChange={() => {
                    if (p.data?.id) {
                      apiClient.getAttachments(p.data.id).then(attachments => {
                        setAttachmentCounts(prev => ({
                          ...prev,
                          [p.data.id]: attachments.length
                        }));
                      }).catch(() => { });
                    }
                  }}
                />
              </div>

              <button
                className={hasEnquiry ? activeBtnClass : btnClass}
                onClick={() => orderNumber && handleEnquiryAction(orderNumber, platform)}
                title={hasEnquiry ? 'View existing enquiry' : 'Create new enquiry'}
                disabled={!orderNumber}
              >
                <MessageSquare className="h-4 w-4" />
              </button>

              <button
                className={btnClass}
                onClick={() => p.data && handleViewHistory(p.data)}
                title="View History"
              >
                <History className="h-4 w-4" />
              </button>

              <button
                className={`${btnClass} hover:text-red-600 hover:bg-red-50`}
                onClick={() => p.data?.id && handleSingleRowDelete(p.data.id)}
                title="Delete row"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div >
          );
        },
      },
    ],
    [businessId, refresh, staffOptions, formatCurrency, attachmentCounts, enquiryCounts]
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

  const toggleFilter = (filterName: string) => {
    setActiveFilter(prev => prev === filterName ? null : filterName);
  };

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

    const overdue = filteredData.filter(row => {
      if (!row.date_received || (row.status && row.status.toLowerCase() === 'resolved')) return false;
      const received = new Date(row.date_received);
      const now = new Date();
      const diffTime = now.getTime() - received.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays > 14;
    }).length;

    const total = filteredData.length;
    const actionable = unresolved; // Cases that can be worked on (not blocked, not resolved)

    return { blocked, unresolved, resolved, total, actionable, overdue };
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
          <span className="text-xs text-gray-500">Click tiles to filter</span>
        </div>
        {statusStats.overdue > 0 && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            There are {statusStats.overdue} returns received more than 14 days ago. Please review them urgently.
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <div
            onClick={() => toggleFilter('Blocked')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md shadow-sm border cursor-pointer transition-all ${activeFilter === 'Blocked' ? 'ring-2 ring-red-500 ring-offset-1 bg-red-100' : 'bg-red-50 border-red-100 hover:bg-red-100'
              }`}
          >
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-red-700 font-medium text-sm">Blocked:</span>
            <span className="text-lg font-bold text-red-800">{statusStats.blocked}</span>

          </div>
          <div
            onClick={() => toggleFilter('Actionable')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md shadow-sm border cursor-pointer transition-all ${activeFilter === 'Actionable' ? 'ring-2 ring-yellow-500 ring-offset-1 bg-yellow-100' : 'bg-yellow-50 border-yellow-100 hover:bg-yellow-100'
              }`}
          >
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-yellow-700 font-medium text-sm">Actionable:</span>
            <span className="text-lg font-bold text-yellow-800">{statusStats.actionable}</span>
          </div>
          <div
            onClick={() => toggleFilter('Resolved')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md shadow-sm border cursor-pointer transition-all ${activeFilter === 'Resolved' ? 'ring-2 ring-green-500 ring-offset-1 bg-green-100' : 'bg-green-50 border-green-100 hover:bg-green-100'
              }`}
          >
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
          <div
            onClick={() => toggleFilter('Overdue')}
            className={`ml-auto flex items-center gap-2 px-3 py-2 rounded-md shadow-sm border cursor-pointer transition-all ${activeFilter === 'Overdue' ? 'ring-2 ring-red-500 ring-offset-1 bg-red-700 text-white' : 'bg-red-600 border-red-600 text-white hover:bg-red-700'
              }`}
          >
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <span className="font-medium text-sm text-white">Received 14+ Days:</span>
            <span className="text-lg font-bold text-white">{statusStats.overdue}</span>
          </div>
        </div>
      </div>

      {/* Buttons Row */}
      <div className="flex items-center gap-2 mb-2">
        <Button className="gap-2" onClick={addRow}><Plus /> New Row</Button>
        <Button variant="outline" className="gap-2" onClick={removeSelected}><Trash2 /> Delete Selected</Button>
        <Button variant="outline" className="gap-2" onClick={handleHistoryClick}><History /> History</Button>
        <Button variant="outline" className="gap-2" onClick={refresh}><RotateCcw /> Refresh</Button>
        <Button
          variant="outline"
          className="gap-2 ml-auto"
          onClick={() => {
            const ws = XLSX.utils.json_to_sheet(filteredData.map(row => ({
              ...row,
              // Format dates for Excel
              date_received: row.date_received ? format(new Date(row.date_received), 'dd/MM/yyyy') : '',
              order_date: row.order_date ? format(new Date(row.order_date), 'dd/MM/yyyy') : '',
              refund_date: row.refund_date ? format(new Date(row.refund_date), 'dd/MM/yyyy') : '',
              updated_at: row.updated_at ? format(new Date(row.updated_at), 'dd/MM/yyyy HH:mm') : ''
            })));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheets");
            XLSX.writeFile(wb, `sheets_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
          }}
        >
          <Download className="h-4 w-4" /> Download XLS
        </Button>
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

      {/* Interactive Legend */}
      <div className="flex flex-wrap gap-2 text-xs mb-2">
        {[
          ['#166534', 'Resolved', 'Legend_Resolved'],
          ['#F59E0B', 'Awaiting Customer/BM', 'Legend_Awaiting Customer/BM'],
          ['#1D4ED8', 'Awaiting G&I', 'Legend_Awaiting G&I'],
          ['#F97316', 'Awaiting Techezm', 'Legend_Awaiting Techezm'],
          ['#DB2777', 'Awaiting Replacement', 'Legend_Awaiting Replacement'],
          ['#6B7280', 'Blocked', 'Legend_Blocked'],
          ['#DC2626', 'Locked', 'Legend_Locked'],
          ['#B45309', 'OOW', 'Legend_OOW'],
          ['#22C55E', 'Unresolved', 'Legend_Unresolved'],

        ].map(([hex, label, filterKey]) => (
          <div
            key={hex}
            onClick={() => toggleFilter(filterKey)}
            className={`flex items-center gap-2 px-2 py-1 rounded border cursor-pointer transition-all ${activeFilter === filterKey
              ? 'ring-2 ring-offset-1 ring-gray-400 bg-gray-100'
              : 'hover:bg-gray-50'
              }`}
          >
            <span style={{ backgroundColor: hex, width: 14, height: 14, borderRadius: 3 }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="ag-theme-alpine" style={{ width: '100%', height: '75vh', borderRadius: '0.5rem' }}>
        <AgGridReact<SheetRecord>
          onGridReady={onGridReady}
          rowData={filteredData}
          columnDefs={colDefs}
          rowSelection="multiple"
          rowClass="group"
          rowHeight={27}
          animateRows
          enableCellTextSelection
          onFirstDataRendered={onFirstDataRendered}
          onGridSizeChanged={onGridSizeChanged}
          onColumnResized={onColumnResized}
          pagination={true}
          paginationPageSize={30}
          paginationPageSizeSelector={[20, 30, 40, 50, 100, 200]}
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: true,
            minWidth: 40,
            wrapText: true,
            autoHeight: true,
            cellClass: 'px-2 py-1 border border-gray-200 flex items-center justify-center text-center break-words leading-tight',
          }}
          getRowId={p => String(p.data?.id ?? Math.random())}
          getRowClass={() => 'group'}
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


      <SheetFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingRow}
        onSave={handleSaveSheet}
        businessId={businessId}
        staffOptions={staffOptions}
        onChat={handleEnquiryAction}
        onHistory={handleViewHistory}
      />

      {selectedSheetForLabel && (
        <CreateLabelModal
          open={labelModalOpen}
          onOpenChange={setLabelModalOpen}
          sheet={selectedSheetForLabel}
          businessId={Number(businessId)}
        />
      )}

      <SheetHistoryModal
        businessId={Number(businessId)}
        sheetId={historySheetId || undefined}
        currentRow={historyRow}
        open={historyModalOpen}
        onOpenChange={(val) => {
          setHistoryModalOpen(val);
          if (!val) setHistoryRow(null);
        }}
      />
    </div>
  );
}
