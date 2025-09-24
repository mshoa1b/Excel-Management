'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sheet } from '@/types';
import { apiClient } from '@/lib/api';
import { Loader2 } from 'lucide-react';

interface SheetFormProps {
  businessId: string;
  sheet?: Sheet;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SheetForm({ businessId, sheet, onSuccess, onCancel }: SheetFormProps) {
  const [formData, setFormData] = useState({
    date: '',
    order_no: '',
    customer_name: '',
    imei: '',
    sku: '',
    customer_comment: '',
    return_type: 'REFUND' as 'REFUND' | 'EXCHANGE',
    refund_amount: '',
    platform: '',
    return_within_30_days: false,
    issue: '',
    out_of_warranty: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sheet) {
      setFormData({
        date: sheet.date.split('T')[0],
        order_no: sheet.order_no,
        customer_name: sheet.customer_name,
        imei: sheet.imei,
        sku: sheet.sku,
        customer_comment: sheet.customer_comment,
        return_type: sheet.return_type,
        refund_amount: sheet.refund_amount.toString(),
        platform: sheet.platform,
        return_within_30_days: sheet.return_within_30_days,
        issue: sheet.issue,
        out_of_warranty: sheet.out_of_warranty,
      });
    }
  }, [sheet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = {
        ...formData,
        refund_amount: parseFloat(formData.refund_amount),
        ...(sheet && { id: sheet.id }),
      };

      if (sheet) {
        await apiClient.updateSheet(businessId, data);
      } else {
        await apiClient.createSheet(businessId, data);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {sheet ? 'Edit Sheet' : 'Create New Sheet'}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_no">Order Number</Label>
              <Input
                id="order_no"
                value={formData.order_no}
                onChange={(e) => setFormData({ ...formData, order_no: e.target.value })}
                placeholder="Enter order number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Enter customer name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imei">IMEI</Label>
              <Input
                id="imei"
                value={formData.imei}
                onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                placeholder="Enter IMEI number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Enter SKU"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Input
                id="platform"
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                placeholder="e.g., Back Market"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="return_type">Return Type</Label>
              <Select
                value={formData.return_type}
                onValueChange={(value: 'REFUND' | 'EXCHANGE') => 
                  setFormData({ ...formData, return_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REFUND">Refund</SelectItem>
                  <SelectItem value="EXCHANGE">Exchange</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund_amount">Refund Amount</Label>
              <Input
                id="refund_amount"
                type="number"
                step="0.01"
                value={formData.refund_amount}
                onChange={(e) => setFormData({ ...formData, refund_amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue">Issue</Label>
            <Input
              id="issue"
              value={formData.issue}
              onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
              placeholder="e.g., Battery Issue"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer_comment">Customer Comment</Label>
            <Textarea
              id="customer_comment"
              value={formData.customer_comment}
              onChange={(e) => setFormData({ ...formData, customer_comment: e.target.value })}
              placeholder="Enter customer comment"
              rows={3}
            />
          </div>

          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="return_within_30_days" className="text-sm font-medium">
                Return within 30 days
              </Label>
              <Switch
                id="return_within_30_days"
                checked={formData.return_within_30_days}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, return_within_30_days: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="out_of_warranty" className="text-sm font-medium">
                Out of warranty
              </Label>
              <Switch
                id="out_of_warranty"
                checked={formData.out_of_warranty}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, out_of_warranty: checked })
                }
              />
            </div>
          </div>

          <div className="flex space-x-4 pt-6">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {sheet ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                sheet ? 'Update Sheet' : 'Create Sheet'
              )}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}