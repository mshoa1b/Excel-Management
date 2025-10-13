'use client';

import { useState, useEffect, useRef } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { format } from 'date-fns';
import { 
  MessageSquare, 
  Plus, 
  Eye, 
  Package,
  Building2,
  User,
  FileText,
  Upload,
  X,
  Search,
  CalendarDays,
  Filter
} from 'lucide-react';

interface Enquiry {
  id: number;
  status: 'Awaiting Business' | 'Awaiting Techezm' | 'Resolved';
  enquiry_date: string;
  order_number: string;
  platform: 'amazon' | 'backmarket';
  description: string;
  business_id: number;
  business_name?: string;
  created_by: number;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export default function EnquiriesPage() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const [newEnquiryOpen, setNewEnquiryOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Search and filter state
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active'); // Default to non-resolved + recent resolved
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  
  // New enquiry form state
  const [formData, setFormData] = useState({
    order_number: '',
    platform: '',
    description: '',
    status: 'Awaiting Business' // Default status
  });

  // Get business name for status display
  const businessName = user?.business?.name || 'Business';

  // Calculate stats from current enquiries
  const stats = {
    resolved: enquiries.filter(e => e.status === 'Resolved').length,
    awaitingBusiness: enquiries.filter(e => e.status === 'Awaiting Business').length,
    awaitingTechezm: enquiries.filter(e => e.status === 'Awaiting Techezm').length,
    total: enquiries.length
  };

  useEffect(() => {
    loadEnquiries();
  }, []);

  // Trigger search when filters change
  useEffect(() => {
    if (!loadingRef.current) { // Only trigger if not already loading
      const timeoutId = setTimeout(() => {
        loadEnquiries();
      }, 300); // Debounce search
      return () => clearTimeout(timeoutId);
    }
  }, [searchOrderNumber, dateFrom, dateTo, platformFilter, statusFilter]);

  const loadEnquiries = async () => {
    if (loadingRef.current) return; // Prevent concurrent requests
    
    try {
      loadingRef.current = true;
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      
      if (searchOrderNumber.trim()) {
        params.append('order_number', searchOrderNumber.trim());
      }
      
      if (dateFrom) {
        params.append('date_from', format(dateFrom, 'yyyy-MM-dd'));
      }
      
      if (dateTo) {
        params.append('date_to', format(dateTo, 'yyyy-MM-dd'));
      }
      
      if (platformFilter && platformFilter !== 'all') {
        params.append('platform', platformFilter);
      }
      
      if (statusFilter && statusFilter !== 'all') {
        params.append('status_filter', statusFilter);
      }
      
      const queryString = params.toString();
      const endpoint = queryString ? `/enquiries?${queryString}` : '/enquiries';
      
      const data = await apiClient.request(endpoint);
      setEnquiries(data);
    } catch (error) {
      console.error('Failed to load enquiries:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.order_number || !formData.platform || !formData.description || !formData.status) {
        alert('Please fill in all required fields');
        return;
      }

      const enquiryData = {
        order_number: formData.order_number,
        platform: formData.platform,
        description: formData.description,
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
        console.log('Uploading files:', selectedFiles.length, selectedFiles);
        const formDataFiles = new FormData();
        selectedFiles.forEach(file => {
          console.log('Appending file:', file.name, file.size, file.type);
          formDataFiles.append('files', file);
        });
        formDataFiles.append('enquiry_id', newEnquiry.id.toString());

        try {
          await apiClient.request(`/enquiries/${newEnquiry.id}/attachments`, {
            method: 'POST',
            body: formDataFiles
          });
          console.log('Files uploaded successfully');
        } catch (fileError) {
          console.error('File upload error:', fileError);
          // Don't fail the entire enquiry creation if just file upload fails
          alert('Enquiry created successfully, but file upload failed. You can try uploading files again from the enquiry details page.');
        }
      } else {
        console.log('No files to upload');
      }

      // Reset form
      setFormData({ order_number: '', platform: '', description: '', status: 'Awaiting Business' });
      setSelectedFiles([]);
      setNewEnquiryOpen(false);
      
      // Reload enquiries
      loadEnquiries();
    } catch (error) {
      console.error('Failed to create enquiry:', error);
      alert('Failed to create enquiry. Please try again.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = ['image/', 'application/pdf', 'text/plain'];
    
    const validFiles = files.filter(file => 
      allowedTypes.some(type => file.type.startsWith(type))
    );
    
    if (validFiles.length !== files.length) {
      alert('Only images, PDF, and text files are allowed');
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFilters = () => {
    setSearchOrderNumber('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setPlatformFilter('all');
    setStatusFilter('active');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Awaiting Business':
        return 'bg-orange-100 text-orange-800';
      case 'Awaiting Techezm':
        return 'bg-blue-100 text-blue-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };



  if (loading) {
    return (
      <ProtectedRoute requiredRole="User">
        <DashboardLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading enquiries...</p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="User">
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Enquiries</h1>
              <p className="text-slate-600">Manage communication between Techezm and businesses</p>
            </div>
            
            <Dialog open={newEnquiryOpen} onOpenChange={setNewEnquiryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Enquiry
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Enquiry</DialogTitle>
                  <DialogDescription>
                    Submit a new enquiry for communication with {user?.role.name === 'Superadmin' ? 'the business' : 'Techezm'}.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="order_number">Order Number</Label>
                    <Input
                      id="order_number"
                      value={formData.order_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, order_number: e.target.value }))}
                      placeholder="Enter order number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="status">Initial Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select initial status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Awaiting Business">Awaiting {businessName}</SelectItem>
                        <SelectItem value="Awaiting Techezm">Awaiting Techezm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
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
                    <Label>Attachments</Label>
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
                        <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                        <p className="text-sm text-slate-600">Click to upload files</p>
                        <p className="text-xs text-slate-400">Images, PDF, and text files only</p>
                      </label>
                    </div>
                    
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Selected files:</p>
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                            <span className="text-sm truncate">{file.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewEnquiryOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    Create Enquiry
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Enquiries List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>All Enquiries</span>
              </CardTitle>
              
              {/* Search and Filters */}
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Order Number Search */}
                  <div className="space-y-2">
                    <Label htmlFor="search">Order Number</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="search"
                        placeholder="Search by order number..."
                        value={searchOrderNumber}
                        onChange={(e) => setSearchOrderNumber(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Platform Filter */}
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select value={platformFilter} onValueChange={setPlatformFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Platforms</SelectItem>
                        <SelectItem value="amazon">Amazon</SelectItem>
                        <SelectItem value="backmarket">Backmarket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active (Default)</SelectItem>
                        <SelectItem value="all">All Enquiries</SelectItem>
                        <SelectItem value="awaiting_business">Awaiting Business</SelectItem>
                        <SelectItem value="awaiting_techezm">Awaiting Techezm</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters Button */}
                  <div className="space-y-2">
                    <Label className="invisible">Clear</Label>
                    <Button variant="outline" onClick={clearFilters} className="w-full">
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {/* Date Range Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date From */}
                  <div className="space-y-2">
                    <Label>Date From</Label>
                    <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          
                          {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Select start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={(date) => {
                            setDateFrom(date);
                            setDateFromOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Date To */}
                  <div className="space-y-2">
                    <Label>Date To</Label>
                    <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          
                          {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Select end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={(date) => {
                            setDateTo(date);
                            setDateToOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              
              {/* Stats Section */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
                  <div className="text-sm text-slate-500">Total Enquiries</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{stats.resolved}</div>
                  <div className="text-sm text-green-600">Resolved</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{stats.awaitingBusiness}</div>
                  <div className="text-sm text-blue-600">Awaiting Business</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-700">{stats.awaitingTechezm}</div>
                  <div className="text-sm text-orange-600">Awaiting Techezm</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {enquiries.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 mb-2">No enquiries found</p>
                  <p className="text-sm text-slate-400">Create your first enquiry to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enquiries.map((enquiry) => (
                      <TableRow key={enquiry.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            
                            <span>{format(new Date(enquiry.enquiry_date), 'dd/MM/yyyy')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-slate-400" />
                            <span className="font-mono">{enquiry.order_number}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {enquiry.platform}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(enquiry.status)}>
                            {enquiry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{enquiry.created_by_username || 'Unknown'}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = `/enquiries/${enquiry.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}