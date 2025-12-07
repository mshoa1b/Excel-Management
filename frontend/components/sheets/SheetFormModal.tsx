'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SheetRecord } from './SheetsGrid';
import { blockedByOptions, lockedOptions, oowOptions, yesNoOptions, returnTypeOptions } from './constants';
import { fetchBMOrder } from './api';
import { computePlatform, buildReturnId } from '@/lib/sheetFormulas';
import { format } from 'date-fns';
import { Loader2, MessageSquare, History } from 'lucide-react';
import { AttachmentManager } from './AttachmentManager';
import { apiClient } from '@/lib/api';

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
    const [formData, setFormData] = useState<Partial<SheetRecord>>({});
    const [loading, setLoading] = useState(false);
    const [fetchingBM, setFetchingBM] = useState(false);
    const [attachmentCount, setAttachmentCount] = useState(0);

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
                    done_by: 'Choose',
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

    const handleChange = (field: keyof SheetRecord, value: any) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };

            // Auto-calculate platform
            if (field === 'order_no') {
                next.platform = computePlatform(value || '');
            }

            return next;
        });
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
                        order_date: data.order_date ? format(new Date(data.order_date), 'yyyy-MM-dd') : prev.order_date,
                        date_received: data.date_received ? format(new Date(data.date_received), 'yyyy-MM-dd') : prev.date_received,
                    }));
                }
            } catch (error) {
                console.warn('Back Market fetch failed:', error);
            } finally {
                setFetchingBM(false);
            }
        };

        // Only trigger if typing created an 8-char string and we are in create mode or order_no changed significantly
        // To avoid spamming, we check logic inside effect
        if (formData.order_no?.length === 8) {
            fetchBM();
        }
    }, [formData.order_no]);

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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-500 border-b pb-1">Order Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Order Number {fetchingBM && <Loader2 className="inline h-3 w-3 animate-spin exact" />}</Label>
                                <Input
                                    value={formData.order_no}
                                    onChange={e => handleChange('order_no', e.target.value)}
                                    placeholder="Order No"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Date Received</Label>
                                <Input
                                    type="date"
                                    value={formData.date_received}
                                    onChange={e => handleChange('date_received', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Order Date</Label>
                                <Input
                                    type="date"
                                    value={formData.order_date}
                                    onChange={e => handleChange('order_date', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Platform</Label>
                                <Input value={formData.platform} readOnly className="bg-slate-100" />
                            </div>
                            <div className="space-y-2">
                                <Label>Return Tracking No</Label>
                                <Input
                                    value={formData.return_tracking_no}
                                    onChange={e => handleChange('return_tracking_no', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Product & Customer */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-500 border-b pb-1">Product & Customer</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Customer Name</Label>
                                <Input
                                    value={formData.customer_name}
                                    onChange={e => handleChange('customer_name', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>IMEI</Label>
                                <Input
                                    value={formData.imei}
                                    onChange={e => handleChange('imei', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>SKU</Label>
                                <Input
                                    value={formData.sku}
                                    onChange={e => handleChange('sku', e.target.value)}
                                />
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label>Customer Comment</Label>
                                <Textarea
                                    value={formData.customer_comment}
                                    onChange={e => handleChange('customer_comment', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Status & Resolution */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-500 border-b pb-1">Status & Resolution</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={formData.status} onValueChange={v => handleChange('status', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                                <Select value={formData.blocked_by || 'Choose'} onValueChange={v => handleChange('blocked_by', v === 'Choose' ? '' : v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {blockedByOptions.map(opt => (
                                            <SelectItem key={opt} value={opt || 'Choose'}>{opt || 'Choose'}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Locked?</Label>
                                <Select value={formData.locked || 'Choose'} onValueChange={v => handleChange('locked', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {lockedOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Out of Warranty?</Label>
                                <Select value={formData.oow_case || 'Choose'} onValueChange={v => handleChange('oow_case', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-500 border-b pb-1">Processing Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Done By</Label>
                                <Select value={formData.done_by || 'Choose'} onValueChange={v => handleChange('done_by', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {staffOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Return Type</Label>
                                <Select value={formData.return_type || 'Choose'} onValueChange={v => handleChange('return_type', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {returnTypeOptions.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Replacement Available</Label>
                                <Select value={formData.replacement_available || 'Choose'} onValueChange={v => handleChange('replacement_available', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Refund Date</Label>
                                <Input
                                    type="date"
                                    value={formData.refund_date}
                                    onChange={e => handleChange('refund_date', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>CS Comment</Label>
                            <Textarea
                                value={formData.cs_comment}
                                onChange={e => handleChange('cs_comment', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Manager Notes</Label>
                            <Textarea
                                value={formData.manager_notes}
                                onChange={e => handleChange('manager_notes', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Additional Notes</Label>
                            <Textarea
                                value={formData.additional_notes}
                                onChange={e => handleChange('additional_notes', e.target.value)}
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
