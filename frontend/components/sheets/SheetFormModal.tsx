'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SheetRecord } from './SheetsGrid';
import { blockedByOptions, lockedOptions, oowOptions, yesNoOptions, returnTypeOptions, resolutionOptions } from './constants';
import { fetchBMOrder } from './api';
import { computePlatform, buildReturnId } from '@/lib/sheetFormulas';
import { format } from 'date-fns';
import { Loader2, MessageSquare, History, CalendarIcon, Copy, Check } from 'lucide-react';
import { AttachmentManager } from './AttachmentManager';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SheetFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData: Partial<SheetRecord> | null;
    onSave: (data: Partial<SheetRecord>) => Promise<void>;
    businessId: string;
    staffOptions: string[];
    onChat?: (orderNumber: string, platform: string) => void;
    onHistory?: (row: SheetRecord) => void;
}

export function SheetFormModal({
    open,
    onOpenChange,
    initialData,
    onSave,
    businessId,
    staffOptions,
    onChat,
    onHistory,
}: SheetFormModalProps) {
    const { user } = useAuth();
    const [formData, setFormData] = useState<Partial<SheetRecord>>({});
    const [loading, setLoading] = useState(false);
    const [fetchingBM, setFetchingBM] = useState(false);
    const [attachmentCount, setAttachmentCount] = useState(0);
    const [orderNoChanged, setOrderNoChanged] = useState(false);

    useEffect(() => {
        if (initialData?.id && open) {
            apiClient.getAttachments(initialData.id).then(attachments => {
                setAttachmentCount(attachments.length);
            }).catch(() => setAttachmentCount(0));
        } else {
            setAttachmentCount(0);
        }
    }, [initialData?.id, open]);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({ ...initialData });
                setOrderNoChanged(false);
            } else {
                // Default values for new row
                const today = format(new Date(), 'yyyy-MM-dd');
                setFormData({
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
                    done_by: user?.username || 'Choose',
                    cs_comment: '',
                    resolution: 'Choose',
                    refund_amount: 0,
                    return_tracking_no: '',
                    platform: '',
                    return_within_30_days: false,
                    issue: 'Choose',
                    out_of_warranty: 'Choose',
                    additional_notes: '',
                    status: 'Pending',
                    manager_notes: '',
                });
            }
        }
    }, [open, initialData]);

    const isTechezm = user?.username?.toLowerCase().startsWith('cs');
    const isEdit = !!initialData?.id;

    const isFieldDisabled = (field: string) => {
        // System always disabled
        if (['platform', 'updated_at'].includes(field))
            return true;

        switch (field) {

            // Techezm-only fields (Client = N)
            case 'order_date':
            case 'sku':
            case 'customer_comment':
            case 'return_type':
            case 'cs_comment':
                return !isTechezm;

            // Client-only fields (Techezm = N)
            case 'locked':
            case 'oow_case':
            case 'done_by':
            case 'replacement_available':
            case 'manager_notes':
                return isTechezm;

            // Conditional: Techezm Edit-only (Client = N, Techezm Add = N)
            case 'return_tracking_no':
            case 'refund_amount':
            case 'refund_date':
                if (!isTechezm) return true;
                if (!isEdit) return true;
                return false;

            // Always enabled
            case 'order_no':
            case 'date_received':
            case 'customer_name':
            case 'imei':
            case 'status':
            case 'blocked_by':
            case 'additional_notes':
                return false;

            default:
                return false;
        }
    };

    const handleChange = (field: keyof SheetRecord, value: any) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };

            if (field === 'order_no') {
                setOrderNoChanged(true);
            }

            // Auto-calculate platform
            if (field === 'order_no') {
                next.platform = computePlatform(value || '');
            }

            return next;
        });
    };

    const getInputClassName = (field: string) => {
        const disabled = isFieldDisabled(field);
        return disabled
            ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed opacity-100 shadow-none"
            : "bg-white border-slate-300 text-slate-900 shadow-sm focus:border-blue-500 focus:ring-blue-500";
    };

    // Auto-fetch Back Market
    useEffect(() => {
        const fetchBM = async () => {
            if (!formData.order_no || formData.order_no.length !== 8) return;
            if (fetchingBM) return;

            setFetchingBM(true);
            try {
                const data = await fetchBMOrder(formData.order_no);
                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        customer_name: data.customer_name,
                        imei: data.imei,
                        sku: data.sku,
                        refund_amount: Number(data.refund_amount ?? 0),
                        return_tracking_no: data.return_tracking_no,
                        platform: data.platform,
                        order_date: data.order_date ? (data.order_date.includes('T') ? format(new Date(data.order_date), 'yyyy-MM-dd') : data.order_date) : prev.order_date,
                        date_received: data.date_received ? (data.date_received.includes('T') ? format(new Date(data.date_received), 'yyyy-MM-dd') : data.date_received) : prev.date_received,
                    }));
                }
            } catch (error) {
                console.warn('Back Market fetch failed:', error);
            } finally {
                setFetchingBM(false);
            }
        };

        // Only trigger if typing created an 8-char string
        // To avoid spamming, we check logic inside effect
        // ALSO: Do not fetch if we are in Edit mode and the order number matches initialData (prevent overwrite on open)
        if (formData.order_no?.length === 8) {
            // Robust check: In edit mode, only fetch if the user explicitly changed the order number
            if (isEdit && !orderNoChanged) {
                return;
            }
            fetchBM();
        }
    }, [formData.order_no, isEdit, orderNoChanged]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(formData);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save sheet:', error);
            alert('Failed to save. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[85vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Sheet Record' : 'New Sheet Record'}</DialogTitle>
                </DialogHeader>



                <form onSubmit={handleSubmit} className="space-y-6 py-4">

                    {/* Actions Row */}
                    {initialData?.id && (
                        <div className="flex items-center gap-2 mb-4 p-2 bg-slate-50 rounded-md border">
                            <span className="text-sm font-medium text-slate-600 mr-2">Quick Actions:</span>

                            <div className="flex-shrink-0">
                                <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 gap-2">
                                    <AttachmentManager
                                        sheetId={initialData.id}
                                        attachmentCount={attachmentCount}
                                        returnId={buildReturnId(initialData.date_received, 0)}
                                        variant="form"
                                        onAttachmentChange={() => {
                                            if (initialData.id) {
                                                apiClient.getAttachments(initialData.id).then(attachments => {
                                                    setAttachmentCount(attachments.length);
                                                }).catch(() => { });
                                            }
                                        }}
                                    />
                                    <span className="text-sm">Attachments</span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-2 h-8"
                                onClick={() => onChat && formData.order_no && onChat(formData.order_no, formData.platform || '')}
                                disabled={!formData.order_no}
                            >
                                <MessageSquare className="h-4 w-4" />
                                Chat
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-2 h-8"
                                onClick={() => onHistory && onHistory(initialData as SheetRecord)}
                            >
                                <History className="h-4 w-4" />
                                History
                            </Button>
                        </div>
                    )}

                    {/* Section 1: Order Info */}
                    <div className="space-y-4 border rounded-lg p-4 bg-slate-50/50">
                        <h3 className="text-base font-semibold text-slate-900 border-b pb-2">Order Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label>Order Number {fetchingBM && <Loader2 className="inline h-3 w-3 animate-spin exact" />}</Label>
                                <HoverCard openDelay={200}>
                                    <HoverCardTrigger asChild>
                                        <Input
                                            value={formData.order_no}
                                            onChange={e => handleChange('order_no', e.target.value)}
                                            disabled={isFieldDisabled('order_no')}
                                            className={getInputClassName('order_no')}
                                            placeholder="Order No"
                                        />
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-96 p-4 bg-white shadow-xl border-slate-200" align="start">
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-sm text-slate-900 border-b pb-2">Quick Details</h4>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                                <span className="text-slate-500">Order Number:</span>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-medium text-slate-900 truncate">{formData.order_no || '-'}</span>
                                                    {formData.order_no && (
                                                        <button
                                                            type="button"
                                                            className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-blue-600 focus:outline-none"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                e.preventDefault();
                                                                navigator.clipboard.writeText(formData.order_no || '');
                                                                const btn = e.currentTarget;
                                                                btn.style.color = '#16a34a';
                                                                setTimeout(() => { btn.style.color = ''; }, 1000);
                                                            }}
                                                            title="Copy Order Number"
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>

                                                <span className="text-slate-500">SKU:</span>
                                                <span className="font-medium text-slate-900 truncate">{formData.sku || '-'}</span>

                                                <span className="text-slate-500">Customer Comment:</span>
                                                <span className="font-medium text-slate-900 whitespace-pre-wrap break-words" title={formData.customer_comment}>{formData.customer_comment || '-'}</span>

                                                <span className="text-slate-500">Multiple Return:</span>
                                                <span className="font-medium text-slate-900">{formData.multiple_return || '-'}</span>

                                                <span className="text-slate-500">Return Type:</span>
                                                <span className="font-medium text-slate-900">{formData.return_type || '-'}</span>

                                                <span className="text-slate-500">Locked:</span>
                                                <span className="font-medium text-slate-900">{formData.locked || '-'}</span>

                                                <span className="text-slate-500">OOW Case:</span>
                                                <span className="font-medium text-slate-900">{formData.oow_case || '-'}</span>

                                                <span className="text-slate-500">Out of Warranty:</span>
                                                <span className="font-medium text-slate-900">{formData.out_of_warranty || '-'}</span>

                                                <span className="text-slate-500">Replacement Avail:</span>
                                                <span className="font-medium text-slate-900">{formData.replacement_available || '-'}</span>

                                                <span className="text-slate-500">Return Tracking:</span>
                                                <span className="font-medium text-slate-900 truncate">{formData.return_tracking_no || '-'}</span>

                                                <span className="text-slate-500">Refund Amount:</span>
                                                <span className="font-medium text-slate-900">{formData.refund_amount || 0}</span>

                                                <span className="text-slate-500">Refund Date:</span>
                                                <span className="font-medium text-slate-900">{formData.refund_date ? (() => {
                                                    if (/^\d{4}-\d{2}-\d{2}$/.test(formData.refund_date)) {
                                                        const [y, m, d] = formData.refund_date.split('-');
                                                        return `${d}-${m}-${y}`;
                                                    }
                                                    try { return format(new Date(formData.refund_date), 'dd-MM-yyyy'); } catch { return formData.refund_date; }
                                                })() : '-'}</span>

                                                <span className="text-slate-500">Last Updated:</span>
                                                <span className="font-medium text-slate-900">{formData.updated_at ? format(new Date(formData.updated_at), 'dd-MM-yyyy HH:mm') : '-'}</span>
                                            </div>
                                        </div>
                                    </HoverCardContent>
                                </HoverCard>
                            </div>
                            <div className="space-y-2">
                                <Label>Date Received</Label>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formData.date_received && "text-muted-foreground",
                                                getInputClassName('date_received')
                                            )}
                                            disabled={isFieldDisabled('date_received')}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.date_received ? (
                                                (() => {
                                                    if (/^\d{4}-\d{2}-\d{2}$/.test(formData.date_received)) {
                                                        const [y, m, d] = formData.date_received.split('-');
                                                        return `${d}-${m}-${y}`;
                                                    }
                                                    try { return format(new Date(formData.date_received), 'dd-MM-yyyy'); } catch { return formData.date_received; }
                                                })()
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.date_received ? new Date(formData.date_received) : undefined}
                                            onSelect={(d) => handleChange('date_received', d ? format(d, 'yyyy-MM-dd') : '')}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Order Date</Label>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formData.order_date && "text-muted-foreground",
                                                getInputClassName('order_date')
                                            )}
                                            disabled={isFieldDisabled('order_date')}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.order_date ? (
                                                (() => {
                                                    if (/^\d{4}-\d{2}-\d{2}$/.test(formData.order_date)) {
                                                        const [y, m, d] = formData.order_date.split('-');
                                                        return `${d}-${m}-${y}`;
                                                    }
                                                    try { return format(new Date(formData.order_date), 'dd-MM-yyyy'); } catch { return formData.order_date; }
                                                })()
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.order_date ? new Date(formData.order_date) : undefined}
                                            onSelect={(d) => handleChange('order_date', d ? format(d, 'yyyy-MM-dd') : '')}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Platform</Label>
                                <Input
                                    value={formData.platform}
                                    readOnly
                                    disabled={isFieldDisabled('platform')}
                                    className={getInputClassName('platform')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Return Tracking No</Label>
                                <Input
                                    value={formData.return_tracking_no}
                                    onChange={e => handleChange('return_tracking_no', e.target.value)}
                                    disabled={isFieldDisabled('return_tracking_no')}
                                    className={getInputClassName('return_tracking_no')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Product & Customer */}
                    <div className="space-y-4 border rounded-lg p-4 bg-slate-50/50">
                        <h3 className="text-base font-semibold text-slate-900 border-b pb-2">Product & Customer</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Customer Name</Label>
                                <Input
                                    value={formData.customer_name}
                                    onChange={e => handleChange('customer_name', e.target.value)}
                                    disabled={isFieldDisabled('customer_name')}
                                    className={getInputClassName('customer_name')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>IMEI</Label>
                                <Input
                                    value={formData.imei}
                                    onChange={e => handleChange('imei', e.target.value)}
                                    disabled={isFieldDisabled('imei')}
                                    className={getInputClassName('imei')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>SKU</Label>
                                <Input
                                    value={formData.sku}
                                    onChange={e => handleChange('sku', e.target.value)}
                                    disabled={isFieldDisabled('sku')}
                                    className={getInputClassName('sku')}
                                />
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label>Customer Comment</Label>
                                <Textarea
                                    value={formData.customer_comment}
                                    onChange={e => handleChange('customer_comment', e.target.value)}
                                    disabled={isFieldDisabled('customer_comment')}
                                    className={getInputClassName('customer_comment')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Status & Resolution */}
                    <div className="space-y-4 border rounded-lg p-4 bg-slate-50/50">
                        <h3 className="text-base font-semibold text-slate-900 border-b pb-2">Status & Resolution</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={formData.status} onValueChange={v => handleChange('status', v)} disabled={isFieldDisabled('status')}>
                                    <SelectTrigger className={getInputClassName('status')}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Resolved">Resolved</SelectItem>
                                        <SelectItem value="Awaiting Business">Awaiting Business</SelectItem>
                                        <SelectItem value="Awaiting Techezm">Awaiting Techezm</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Blocked By</Label>
                                <Select value={formData.blocked_by || 'Choose'} onValueChange={v => handleChange('blocked_by', v === 'Choose' ? '' : v)} disabled={isFieldDisabled('blocked_by')}>
                                    <SelectTrigger className={getInputClassName('blocked_by')}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {blockedByOptions.map(opt => (
                                            <SelectItem key={opt} value={opt || 'Choose'}>{opt || 'Choose'}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Locked?</Label>
                                <Select value={formData.locked || 'Choose'} onValueChange={v => handleChange('locked', v)} disabled={isFieldDisabled('locked')}>
                                    <SelectTrigger className={getInputClassName('locked')}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {lockedOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Out of Warranty?</Label>
                                <Select value={formData.oow_case || 'Choose'} onValueChange={v => handleChange('oow_case', v)} disabled={isFieldDisabled('oow_case')}>
                                    <SelectTrigger className={getInputClassName('oow_case')}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {oowOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Processing */}
                    <div className="space-y-4 border rounded-lg p-4 bg-slate-50/50">
                        <h3 className="text-base font-semibold text-slate-900 border-b pb-2">Processing Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label>Done By</Label>
                                <Select value={formData.done_by || 'Choose'} onValueChange={v => handleChange('done_by', v)} disabled={isFieldDisabled('done_by')}>
                                    <SelectTrigger className={getInputClassName('done_by')}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {staffOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Return Type</Label>
                                <Select value={formData.return_type || 'Choose'} onValueChange={v => handleChange('return_type', v)} disabled={isFieldDisabled('return_type')}>
                                    <SelectTrigger className={getInputClassName('return_type')}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {returnTypeOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Replacement Available</Label>
                                <Select value={formData.replacement_available || 'Choose'} onValueChange={v => handleChange('replacement_available', v)} disabled={isFieldDisabled('replacement_available')}>
                                    <SelectTrigger className={getInputClassName('replacement_available')}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {yesNoOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Refund Amount</Label>
                                <Input
                                    type="number"
                                    value={formData.refund_amount}
                                    onChange={e => handleChange('refund_amount', parseFloat(e.target.value))}
                                    disabled={isFieldDisabled('refund_amount')}
                                    className={getInputClassName('refund_amount')}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Refund Date</Label>
                                <Input
                                    type="date"
                                    value={formData.refund_date}
                                    onChange={e => handleChange('refund_date', e.target.value)}
                                    disabled={isFieldDisabled('refund_date')}
                                    className={getInputClassName('refund_date')}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Resolution</Label>
                                <Select value={formData.resolution || 'Choose'} onValueChange={v => handleChange('resolution', v)} disabled={isFieldDisabled('resolution')}>
                                    <SelectTrigger className={getInputClassName('resolution')}><SelectValue placeholder="Choose" /></SelectTrigger>
                                    <SelectContent>
                                        {resolutionOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>CS Comment</Label>
                            <Textarea
                                value={formData.cs_comment}
                                onChange={e => handleChange('cs_comment', e.target.value)}
                                disabled={isFieldDisabled('cs_comment')}
                                className={getInputClassName('cs_comment')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Manager Notes</Label>
                            <Textarea
                                value={formData.manager_notes}
                                onChange={e => handleChange('manager_notes', e.target.value)}
                                disabled={isFieldDisabled('manager_notes')}
                                className={getInputClassName('manager_notes')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Additional Notes</Label>
                            <Textarea
                                value={formData.additional_notes}
                                onChange={e => handleChange('additional_notes', e.target.value)}
                                disabled={isFieldDisabled('additional_notes')}
                                className={getInputClassName('additional_notes')}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Record
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
