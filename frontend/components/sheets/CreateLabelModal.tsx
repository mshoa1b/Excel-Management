'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { Loader2, Download, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SheetRecord } from './SheetsGrid';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CreateLabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: SheetRecord;
  businessId: number;
}

interface LabelData {
  id: number;
  shipstation_label_url: string;
  shipstation_label_pdf_base64: string;
  shipstation_tracking_number: string;
  created_at: string;
}

export function CreateLabelModal({ open, onOpenChange, sheet, businessId }: CreateLabelModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingDefaults, setFetchingDefaults] = useState(false);
  const [existingLabels, setExistingLabels] = useState<LabelData[]>([]);
  const [generatedLabel, setGeneratedLabel] = useState<LabelData | null>(null);
  const [showShipFrom, setShowShipFrom] = useState(false);

  const [formData, setFormData] = useState({
    // Ship To
    name: '',
    email: '',
    phone: '',
    street1: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'GB',

    // Order Details
    orderNumber: '',
    sku: '',
    itemName: '',

    // Ship From
    shipFrom: {
      name: '',
      street1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'GB'
    },

    weight: 250,
    shipDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (open && sheet) {
      fetchDefaults();
      fetchExistingLabels();
    }
  }, [open, sheet]);

  const fetchExistingLabels = async () => {
    try {
      const labels = await apiClient.request<LabelData[]>(`/shipstation/labels/${sheet.id}`);
      setExistingLabels(labels);
    } catch (error) {
      console.error('Failed to fetch existing labels', error);
    }
  };

  const fetchDefaults = async () => {
    setFetchingDefaults(true);
    try {
      // 1. Fetch Business Details for Ship From
      let businessData: any = {};
      try {
        businessData = await apiClient.request(`/businesses/${businessId}`);
      } catch (e) {
        console.warn('Failed to fetch business details', e);
      }

      // 2. Start with sheet data
      let defaults = {
        name: sheet.customer_name || '',
        email: '',
        phone: '',
        street1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'GB',
        
        orderNumber: sheet.order_no || `SHEET-${sheet.id}`,
        sku: sheet.sku || 'GENERIC',
        itemName: sheet.issue || 'Repair/Replacement',

        shipFrom: {
          name: businessData.name || '',
          street1: businessData.street1 || '',
          city: businessData.city || '',
          state: businessData.state || '',
          postalCode: businessData.postal_code || '',
          country: businessData.country || 'GB'
        },

        weight: 250,
        shipDate: new Date().toISOString().split('T')[0]
      };

      // 3. Try to fetch BM order if applicable
      // Check platform OR regex pattern (8 digits)
      const orderNo = (sheet.order_no || '').trim();
      const isBackMarket = (sheet.platform === 'Back Market') || /^\d{8}$/.test(orderNo);
      
      if (isBackMarket && orderNo) {
        try {
          console.log('Fetching Back Market order details for:', orderNo);
          const bmOrder = await apiClient.request<any>(`/bmOrders/${orderNo}?businessId=${businessId}`);
          console.log('Back Market order details received:', bmOrder);
          
          if (bmOrder) {
            // Note: bmOrder is the transformed 'sheetData' from backend/routes/bmOrders.js
            // We added shipping_address, customer_email, product_title to it.
            
            defaults = {
              ...defaults,
              name: bmOrder.customer_name || defaults.name,
              email: bmOrder.customer_email || defaults.email,
              
              phone: bmOrder.shipping_address?.phone || defaults.phone,
              street1: bmOrder.shipping_address?.street || defaults.street1,
              city: bmOrder.shipping_address?.city || defaults.city,
              state: bmOrder.shipping_address?.state || defaults.state,
              postalCode: bmOrder.shipping_address?.postal_code || defaults.postalCode,
              country: bmOrder.shipping_address?.country || defaults.country,
              
              // Autofill SKU and Item Name from BM if available
              sku: bmOrder.sku || defaults.sku,
              itemName: bmOrder.product_title || defaults.itemName,
            };
          }
        } catch (e) {
          console.warn('Failed to fetch BM order for autofill', e);
        }
      }

      setFormData(defaults);
    } catch (error) {
      console.error('Error fetching defaults', error);
      toast({
        title: 'Error',
        description: 'Failed to load default values',
        variant: 'destructive'
      });
    } finally {
      setFetchingDefaults(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.street1 || !formData.city || !formData.postalCode || !formData.country) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required Ship To fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.request('/shipstation/create-label', {
        method: 'POST',
        body: JSON.stringify({
          sheetId: sheet.id,
          overrides: formData
        })
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Label created successfully',
        });
        setGeneratedLabel(response.dbRecord);
        fetchExistingLabels();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create label',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = (base64: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Shipping Label</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {fetchingDefaults && <div className="text-sm text-muted-foreground">Loading defaults...</div>}
          
          {/* Order Details Section */}
          <div className="space-y-4 border p-4 rounded-md">
            <h3 className="font-semibold text-lg">Order Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Order Number</Label>
                <Input 
                  value={formData.orderNumber} 
                  onChange={(e) => setFormData({...formData, orderNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input 
                  value={formData.sku} 
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input 
                  value={formData.itemName} 
                  onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Ship To Section */}
          <div className="space-y-4 border p-4 rounded-md">
            <h3 className="font-semibold text-lg">Ship To</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={!formData.name ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Address Line 1 *</Label>
                <Input 
                  value={formData.street1} 
                  onChange={(e) => setFormData({...formData, street1: e.target.value})}
                  className={!formData.street1 ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>City *</Label>
                <Input 
                  value={formData.city} 
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className={!formData.city ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>State/County</Label>
                <Input 
                  value={formData.state} 
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Postcode *</Label>
                <Input 
                  value={formData.postalCode} 
                  onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                  className={!formData.postalCode ? 'border-red-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Country *</Label>
                <Input 
                  value={formData.country} 
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className={!formData.country ? 'border-red-300' : ''}
                />
              </div>
            </div>
          </div>

          {/* Shipment Details */}
          <div className="space-y-4 border p-4 rounded-md">
            <h3 className="font-semibold text-lg">Shipment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weight (grams)</Label>
                <Input 
                  type="number"
                  value={formData.weight} 
                  onChange={(e) => setFormData({...formData, weight: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Ship Date</Label>
                <Input 
                  type="date"
                  value={formData.shipDate} 
                  onChange={(e) => setFormData({...formData, shipDate: e.target.value})}
                />
              </div>
            </div>
            
            <div className="bg-muted p-4 rounded-md mt-4">
              <h4 className="font-semibold mb-2">Service Details (Locked)</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>Carrier: <span className="font-medium">Royal Mail</span></div>
                <div>Service: <span className="font-medium">Tracked 24</span></div>
                <div>Package: <span className="font-medium">Package</span></div>
              </div>
            </div>
          </div>

          {/* Ship From Section (Collapsible) */}
          <Collapsible open={showShipFrom} onOpenChange={setShowShipFrom} className="border p-4 rounded-md">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Ship From (Business Address)</h3>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {showShipFrom ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input 
                    value={formData.shipFrom.name} 
                    onChange={(e) => setFormData({...formData, shipFrom: {...formData.shipFrom, name: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address Line 1</Label>
                  <Input 
                    value={formData.shipFrom.street1} 
                    onChange={(e) => setFormData({...formData, shipFrom: {...formData.shipFrom, street1: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input 
                    value={formData.shipFrom.city} 
                    onChange={(e) => setFormData({...formData, shipFrom: {...formData.shipFrom, city: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input 
                    value={formData.shipFrom.state} 
                    onChange={(e) => setFormData({...formData, shipFrom: {...formData.shipFrom, state: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Postcode</Label>
                  <Input 
                    value={formData.shipFrom.postalCode} 
                    onChange={(e) => setFormData({...formData, shipFrom: {...formData.shipFrom, postalCode: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input 
                    value={formData.shipFrom.country} 
                    onChange={(e) => setFormData({...formData, shipFrom: {...formData.shipFrom, country: e.target.value}})}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {generatedLabel && (
            <div className="bg-green-50 p-4 rounded-md border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Label Generated!</h4>
              <div className="flex gap-2 items-center mb-2">
                <span className="text-sm">Tracking: {generatedLabel.shipstation_tracking_number}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => downloadPdf(generatedLabel.shipstation_label_pdf_base64, `label-${generatedLabel.shipstation_tracking_number}.pdf`)}>
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                   const win = window.open();
                   if (win) {
                     win.document.write(`<iframe src="data:application/pdf;base64,${generatedLabel.shipstation_label_pdf_base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                   }
                }}>
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
              </div>
            </div>
          )}

          {existingLabels.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Previous Labels</h4>
              <div className="space-y-2">
                {existingLabels.map(label => (
                  <div key={label.id} className="flex justify-between items-center p-2 border rounded bg-white">
                    <div className="text-sm">
                      <div>Tracking: {label.shipstation_tracking_number}</div>
                      <div className="text-xs text-muted-foreground">{new Date(label.created_at).toLocaleString()}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => downloadPdf(label.shipstation_label_pdf_base64, `label-${label.shipstation_tracking_number}.pdf`)}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleSubmit} disabled={loading || fetchingDefaults}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Generate Label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
