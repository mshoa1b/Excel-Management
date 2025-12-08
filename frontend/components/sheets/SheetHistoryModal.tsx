import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import type { SheetRecord } from './SheetsGrid';

export interface SheetHistoryModalProps {
    businessId: number;
    sheetId?: number;
    currentRow?: SheetRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export interface HistoryLog {
    history_id: number;
    changed_by_name: string;
    changed_at: string;
    change_type: string;
    order_no?: string;
    customer_name?: string;

    // Full snapshot fields
    date_received?: string;
    order_date?: string;
    imei?: string;
    sku?: string;
    customer_comment?: string;
    multiple_return?: string;
    apple_google_id?: string;
    return_type?: string;
    locked?: string;
    oow_case?: string;
    replacement_available?: string;
    done_by?: string;
    blocked_by: string;
    cs_comment?: string;
    resolution?: string;
    refund_amount?: number;
    refund_date?: string;
    return_tracking_no?: string;
    platform?: string;
    return_within_30_days?: string;
    issue?: string;
    out_of_warranty?: string;
    additional_notes?: string;
    status: string;
    manager_notes: string;

    // Changes logic
    changes?: Record<string, { old: any; new: any }>;
}

export function SheetHistoryModal({ businessId, sheetId, currentRow, open, onOpenChange }: SheetHistoryModalProps) {
    const [logs, setLogs] = useState<HistoryLog[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setLoading(true);
            apiClient.getSheetHistory(businessId, sheetId)
                .then((data) => {
                    let historyLogs = data || [];

                    // If we have a current row, prepend it as the latest state
                    if (currentRow) {
                        const currentLog: HistoryLog = {
                            history_id: -1, // Placeholder ID
                            business_id: currentRow.business_id,
                            sheet_id: currentRow.id,
                            change_type: 'CURRENT',
                            changed_at: 'Current', // Magic string to indicate current state
                            changed_by: 0,
                            changed_by_name: 'Current', // Magic string to indicate current state
                            changes: {},

                            // Map all fields
                            order_no: currentRow.order_no,
                            customer_name: currentRow.customer_name,
                            status: currentRow.status,
                            blocked_by: currentRow.blocked_by,
                            date_received: currentRow.date_received,
                            order_date: currentRow.order_date,
                            imei: currentRow.imei,
                            sku: currentRow.sku,
                            customer_comment: currentRow.customer_comment,
                            multiple_return: currentRow.multiple_return,
                            apple_google_id: currentRow.apple_google_id,
                            return_type: currentRow.return_type,
                            locked: currentRow.locked,
                            oow_case: currentRow.oow_case,
                            replacement_available: currentRow.replacement_available,
                            done_by: currentRow.done_by,
                            cs_comment: currentRow.cs_comment,
                            resolution: currentRow.resolution,
                            refund_amount: currentRow.refund_amount,
                            refund_date: currentRow.refund_date,
                            return_tracking_no: currentRow.return_tracking_no,
                            platform: currentRow.platform,
                            return_within_30_days: currentRow.return_within_30_days,
                            issue: currentRow.issue,
                            out_of_warranty: currentRow.out_of_warranty,
                            additional_notes: currentRow.additional_notes,
                            manager_notes: currentRow.manager_notes,
                        } as any; // Cast as any because HistoryLog might not perfectly match every single field of SheetRecord if strictness varies

                        historyLogs = [currentLog, ...historyLogs];
                    }

                    setLogs(historyLogs);
                })
                .catch((err) => console.error("Failed to load history", err))
                .finally(() => setLoading(false));
        } else {
            setLogs([]);
        }
    }, [open, businessId, sheetId, currentRow]);

    const formatDate = (val?: string) => {
        if (!val || val === 'Current') return val === 'Current' ? 'Current' : '-';
        // Handle yyyy-MM-dd strings directly to avoid timezone shifts
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const [y, m, d] = val.split('-');
            return `${d}-${m}-${y}`;
        }
        try {
            return format(new Date(val), 'dd-MM-yyyy');
        } catch { return val; }
    };

    const formatTimestamp = (val: string) => {
        if (val === 'Current') return 'Current';
        try {
            const date = new Date(val);
            return format(date, 'dd-MM-yyyy HH:mm:ss');
        } catch { return val; }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full max-h-[95vh] flex flex-col p-4">
                <DialogHeader className="mb-2">
                    <DialogTitle>Sheet History Log</DialogTitle>
                    <DialogDescription>
                        Full view of all changes.{sheetId ? ' (Filtered by Row)' : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 border rounded-md relative bg-white overflow-hidden flex flex-col">
                    {loading && (
                        <div className="absolute inset-0 z-10 bg-white/50 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                        </div>
                    )}

                    {/* Native scrolling container for reliable X/Y scrolling */}
                    <div className="flex-1 overflow-auto w-full h-full">
                        <div className="min-w-max">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-gray-800 text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Date (Timestamp)</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Order #</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Customer Name</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Status</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Blocked By</th>

                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Date Received</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Order Date</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">IMEI</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">SKU</th>

                                        <th className="p-2 border font-medium whitespace-nowrap min-w-[150px] bg-gray-800">Customer Comment</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Multiple Return</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Apple/Google ID</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Return Type</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Locked</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">OOW Case</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Repl. Available</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Done By</th>
                                        <th className="p-2 border font-medium whitespace-nowrap min-w-[150px] bg-gray-800">CS Comment</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Resolution</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Refund Amount</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Refund Date</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Tracking No</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Platform</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Return 30 Days</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Issue</th>
                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-800">Out of Warranty</th>
                                        <th className="p-2 border font-medium whitespace-nowrap min-w-[150px] bg-gray-800">Add. Notes</th>
                                        <th className="p-2 border font-medium whitespace-nowrap min-w-[150px] bg-gray-800">Manager Notes</th>

                                        <th className="p-2 border font-medium whitespace-nowrap bg-gray-900 border-l-2 border-l-gray-600 sticky right-0 z-20">Edited By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.length === 0 && !loading ? (
                                        <tr>
                                            <td colSpan={30} className="p-8 text-center text-gray-500">
                                                No history records found.
                                            </td>
                                        </tr>
                                    ) : logs.map((log, index) => (
                                        <tr key={log.history_id === -1 ? `current-${index}` : log.history_id} className={`hover:bg-gray-50 border-b ${log.history_id === -1 ? 'bg-blue-50/50' : ''}`}>
                                            <td className="p-2 border whitespace-nowrap font-mono text-gray-600 bg-gray-50 font-bold">{formatTimestamp(log.changed_at)}</td>
                                            <td className="p-2 border whitespace-nowrap font-medium text-blue-600">{log.order_no}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.customer_name}</td>
                                            <td className="p-2 border whitespace-nowrap">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${log.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                                                    log.status === 'Pending' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="p-2 border whitespace-nowrap text-red-600 font-medium">{log.blocked_by}</td>

                                            <td className="p-2 border whitespace-nowrap">{formatDate(log.date_received)}</td>
                                            <td className="p-2 border whitespace-nowrap">{formatDate(log.order_date)}</td>
                                            <td className="p-2 border whitespace-nowrap font-mono text-[10px]">{log.imei}</td>
                                            <td className="p-2 border whitespace-nowrap font-mono text-[10px]">{log.sku}</td>

                                            <td className="p-2 border min-w-[150px] max-w-[250px] truncate" title={log.customer_comment}>{log.customer_comment}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.multiple_return}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.apple_google_id}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.return_type}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.locked}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.oow_case}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.replacement_available}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.done_by}</td>
                                            <td className="p-2 border min-w-[150px] max-w-[250px] truncate" title={log.cs_comment}>{log.cs_comment}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.resolution}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.refund_amount}</td>
                                            <td className="p-2 border whitespace-nowrap">{formatDate(log.refund_date)}</td>
                                            <td className="p-2 border whitespace-nowrap font-mono text-[10px]">{log.return_tracking_no}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.platform}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.return_within_30_days}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.issue}</td>
                                            <td className="p-2 border whitespace-nowrap">{log.out_of_warranty}</td>
                                            <td className="p-2 border min-w-[150px] max-w-[250px] truncate" title={log.additional_notes}>{log.additional_notes}</td>
                                            <td className="p-2 border min-w-[150px] max-w-[250px] truncate" title={log.manager_notes}>{log.manager_notes}</td>

                                            <td className="p-2 border whitespace-nowrap bg-green-50 font-medium text-gray-900 border-l-2 border-l-gray-300 sticky right-0 z-10">
                                                {log.changed_by_name || 'Unknown'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
