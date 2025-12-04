'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/contexts/BusinessContext';
import { apiClient } from '@/lib/api';
import { MessageSquare, ArrowLeft, Upload, X, FileText } from 'lucide-react';

export default function CreateEnquiryPage() {
  const { user } = useAuth();
  const { businessName } = useBusiness();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  // Pre-fill from URL parameters
  const [formData, setFormData] = useState({
    order_number: searchParams?.get('order_number') || '',
    platform: searchParams?.get('platform') || '',
    description: '',
    status: 'Awaiting Business' // Default status
  });

  useEffect(() => {
    // Update form data if URL parameters change
    setFormData(prev => ({
      ...prev,
      order_number: searchParams?.get('order_number') || prev.order_number,
      platform: searchParams?.get('platform') || prev.platform,
    }));
  }, [searchParams]);

  const handleInitialSubmit = () => {
    if (!formData.order_number || !formData.platform || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }
    setShowModal(true);
  };

  const handleConfirmCreate = async () => {
    try {
      setLoading(true);
      setShowModal(false);

      let finalDescription = formData.description;
      if (!notificationEnabled) {
        finalDescription = `[SILENT] ${finalDescription}`;
      }

      const enquiryData = {
        order_number: formData.order_number,
        platform: formData.platform,
        description: finalDescription,
        status: formData.status,
        business_id: user?.business_id
      };

      const newEnquiry = await apiClient.request('/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enquiryData)
      });

      // Handle file uploads if any
      if (selectedFiles.length > 0) {
        const formDataFiles = new FormData();
        selectedFiles.forEach(file => {
          formDataFiles.append('files', file);
        });
        formDataFiles.append('enquiry_id', newEnquiry.id.toString());

        try {
          await apiClient.request(`/enquiries/${newEnquiry.id}/attachments`, {
            method: 'POST',
            body: formDataFiles
          });
        } catch (fileError) {
          console.error('File upload error:', fileError);
          alert('Enquiry created successfully, but file upload failed. You can add files from the enquiry details page.');
        }
      }

      // Redirect to the new enquiry
      router.push(`/enquiries/${newEnquiry.id}`);
    } catch (error: any) {
      console.error('Failed to create enquiry:', error);

      if (error.status === 409) {
        // Enquiry already exists
        const response = await error.response?.json?.();
        if (response?.existingEnquiryId) {
          const proceed = confirm('An enquiry already exists for this order number. Would you like to view the existing enquiry?');
          if (proceed) {
            router.push(`/enquiries/${response.existingEnquiryId}`);
            return;
          }
        } else {
          alert('An enquiry already exists for this order number.');
        }
      } else {
        alert('Failed to create enquiry. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const validFiles: File[] = [];
    const rejectedFiles: string[] = [];

    files.forEach(file => {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        rejectedFiles.push(`${file.name} (too large - max 10MB)`);
        return;
      }

      // Check file type
      if (file.type.startsWith('image/') ||
        file.type === 'application/pdf' ||
        file.type === 'text/plain') {
        validFiles.push(file);
      } else {
        rejectedFiles.push(`${file.name} (unsupported type: ${file.type})`);
      }
    });

    if (rejectedFiles.length > 0) {
      alert(`Some files were rejected:\n${rejectedFiles.join('\n')}\n\nOnly images, PDF, and text files under 10MB are allowed.`);
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Create New Enquiry</h1>
                <p className="text-slate-600">Create an enquiry for order #{formData.order_number}</p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Enquiry Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="order_number">Order Number *</Label>
                  <Input
                    id="order_number"
                    value={formData.order_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, order_number: e.target.value }))}
                    placeholder="Enter order number"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="platform">Platform *</Label>
                  <Select value={formData.platform} onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amazon">Amazon</SelectItem>
                      <SelectItem value="backmarket">Backmarket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your enquiry..."
                  maxLength={2000}
                  rows={4}
                />
                <p className="text-xs text-slate-500">
                  {formData.description.length}/2000 characters
                </p>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label>Attachments (Optional)</Label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    accept="image/*,.pdf,.txt"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-1">Click to select files or drag and drop</p>
                    <p className="text-xs text-slate-400">Images, PDF, and text files only (max 10MB each)</p>
                  </label>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Files:</Label>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border border-slate-200 rounded-md">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span className="text-sm truncate max-w-xs">{file.name}</span>
                          <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInitialSubmit}
                  disabled={loading || !formData.order_number || !formData.platform || !formData.description}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create Enquiry
                </Button>
              </div>
            </CardContent>
          </Card>

          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Enquiry Creation</DialogTitle>
                <DialogDescription>
                  Please set the initial status and notification preferences.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="modal-status">Initial Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger id="modal-status">
                      <SelectValue placeholder="Select initial status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Awaiting Business">Awaiting {businessName || 'Business'}</SelectItem>
                      <SelectItem value="Awaiting Techezm">Awaiting Techezm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notification"
                    checked={notificationEnabled}
                    onCheckedChange={(checked) => setNotificationEnabled(checked as boolean)}
                  />
                  <Label htmlFor="notification">Send Notification to Team</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleConfirmCreate} disabled={loading}>
                  {loading ? 'Creating...' : 'Confirm & Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}