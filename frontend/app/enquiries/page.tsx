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
import { useBusiness } from '@/contexts/BusinessContext';
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
  Filter,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Store
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
  last_update_at?: string;
  last_update_by?: string;
}

export default function EnquiriesPage() {
  const { user } = useAuth();
  const { businessName } = useBusiness();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);
  const [newEnquiryOpen, setNewEnquiryOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Search and filter state
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active'); // Default to non-resolved (Awaiting...)
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  
  // New enquiry form state
  const [formData, setFormData] = useState({
    order_number: '',
    platform: '',
    description: '',
    status: 'Awaiting Business' // Default status
  });

  // Stats state
  const [stats, setStats] = useState({
    resolved: 0,
    awaitingBusiness: 0,
    awaitingTechezm: 0,
    amazon: 0,
    backmarket: 0,
    total: 0
  });

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
  }, [searchOrderNumber, dateFrom, dateTo, platformFilter, statusFilter, page, limit]);

  const loadEnquiries = async () => {
    if (loadingRef.current) return; // Prevent concurrent requests
    
    try {
      loadingRef.current = true;
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      
      params.append('page', page.toString());
      params.append('limit', limit.toString());

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
      
      const response = await apiClient.request(endpoint);
      
      if (response.pagination) {
        setEnquiries(response.data);
        setTotalItems(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
        if (response.stats) {
          setStats(response.stats);
        }
      } else {
        setEnquiries(response);
        setTotalItems(response.length);
        setTotalPages(1);
        // Fallback stats calculation for non-paginated response (should not happen with updated backend)
        setStats({
          resolved: response.filter((e: Enquiry) => e.status === 'Resolved').length,
          awaitingBusiness: response.filter((e: Enquiry) => e.status === 'Awaiting Business').length,
          awaitingTechezm: response.filter((e: Enquiry) => e.status === 'Awaiting Techezm').length,
          amazon: response.filter((e: Enquiry) => e.platform === 'amazon').length,
          backmarket: response.filter((e: Enquiry) => e.platform === 'backmarket').length,
          total: response.length
        });
      }
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

      console.log('Creating enquiry with data:', enquiryData);

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
    } catch (error: any) {
      console.error('Failed to create enquiry:', error);
      
      // Handle specific error cases
      if ((error?.message && error.message.includes('409')) || error?.status === 409) {
        // Try to get more details from the error response
        let errorMessage = `An enquiry already exists for order number "${formData.order_number}".`;
        
        // Check if we can parse additional error details
        try {
          if (error?.response && error.response.error) {
            errorMessage = error.response.error;
          }
        } catch (parseError) {
          // Use default message if parsing fails
        }
        
        const shouldNavigate = confirm(
          `${errorMessage}\n\nWould you like to view the existing enquiry instead?`
        );
        
        if (shouldNavigate) {
          // Try to find the existing enquiry and navigate to it
          try {
            const existingEnquiries = await apiClient.request(`/enquiries?order_number=${encodeURIComponent(formData.order_number)}`);
            if (existingEnquiries && existingEnquiries.length > 0) {
              window.location.href = `/enquiries/${existingEnquiries[0].id}`;
              return;
            }
          } catch (searchError) {
            console.error('Failed to find existing enquiry:', searchError);
          }
          
          // If we can't find the specific enquiry, just reload the list
          loadEnquiries();
        }
      } else {
        // Generic error message for other types of errors
        alert('Failed to create enquiry. Please try again.');
      }
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
        return 'bg-blue-100 text-blue-800';
      case 'Awaiting Techezm':
        return 'bg-orange-100 text-orange-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDisplayStatus = (status: string) => {
    if (status === 'Awaiting Business') {
      return `Awaiting ${businessName || 'Business'}`;
    }
    return status;
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
              <p className="text-slate-600">Manage communication between Techezm and {businessName || 'businesses'}</p>
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
                        <SelectItem value="Awaiting Business">Awaiting {businessName || 'Business'}</SelectItem>
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
              <div className="mt-4 flex flex-wrap items-end gap-4">
                {/* Order Number Search */}
                <div className="space-y-2 flex-1 min-w-[200px]">
                  <Label htmlFor="search">Order Number</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="search"
                      placeholder="Search..."
                      value={searchOrderNumber}
                      onChange={(e) => setSearchOrderNumber(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Platform Filter */}
                <div className="space-y-2 w-[150px]">
                  <Label>Platform</Label>
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="amazon">Amazon</SelectItem>
                      <SelectItem value="backmarket">Backmarket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2 w-[180px]">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="awaiting_business">Awaiting {businessName || 'Business'}</SelectItem>
                      <SelectItem value="awaiting_techezm">Awaiting Techezm</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From */}
                <div className="space-y-2 w-[160px]">
                  <Label>Date From</Label>
                  <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal px-3"
                      >
                        {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Start date'}
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
                <div className="space-y-2 w-[160px]">
                  <Label>Date To</Label>
                  <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal px-3"
                      >
                        {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'End date'}
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

                {/* Clear Filters Button */}
                <div className="pb-0.5">
                  <Button variant="outline" onClick={clearFilters} title="Clear Filters">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Stats Section */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Awaiting Business */}
                <Card 
                  className={`border-l-4 border-l-blue-500 shadow-sm cursor-pointer transition-all hover:shadow-md ${statusFilter === 'awaiting_business' ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50/50' : ''}`}
                  onClick={() => setStatusFilter(prev => prev === 'awaiting_business' ? 'active' : 'awaiting_business')}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Awaiting {businessName || 'Business'}</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.awaitingBusiness}</h3>
                    </div>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusFilter === 'awaiting_business' ? 'bg-blue-100' : 'bg-blue-50'}`}>
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                {/* Awaiting Techezm */}
                <Card 
                  className={`border-l-4 border-l-orange-500 shadow-sm cursor-pointer transition-all hover:shadow-md ${statusFilter === 'awaiting_techezm' ? 'ring-2 ring-orange-500 ring-offset-2 bg-orange-50/50' : ''}`}
                  onClick={() => setStatusFilter(prev => prev === 'awaiting_techezm' ? 'active' : 'awaiting_techezm')}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Awaiting Techezm</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.awaitingTechezm}</h3>
                    </div>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusFilter === 'awaiting_techezm' ? 'bg-orange-100' : 'bg-orange-50'}`}>
                      <User className="h-5 w-5 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                {/* Amazon */}
                <Card 
                  className={`border-l-4 border-l-yellow-500 shadow-sm cursor-pointer transition-all hover:shadow-md ${platformFilter === 'amazon' ? 'ring-2 ring-yellow-500 ring-offset-2 bg-yellow-50/50' : ''}`}
                  onClick={() => setPlatformFilter(prev => prev === 'amazon' ? 'all' : 'amazon')}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Amazon Active</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.amazon}</h3>
                    </div>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${platformFilter === 'amazon' ? 'bg-yellow-100' : 'bg-yellow-50'}`}>
                      <ShoppingCart className="h-5 w-5 text-yellow-600" />
                    </div>
                  </CardContent>
                </Card>

                {/* Back Market */}
                <Card 
                  className={`border-l-4 border-l-purple-500 shadow-sm cursor-pointer transition-all hover:shadow-md ${platformFilter === 'backmarket' ? 'ring-2 ring-purple-500 ring-offset-2 bg-purple-50/50' : ''}`}
                  onClick={() => setPlatformFilter(prev => prev === 'backmarket' ? 'all' : 'backmarket')}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Back Market Active</p>
                      <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.backmarket}</h3>
                    </div>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${platformFilter === 'backmarket' ? 'bg-purple-100' : 'bg-purple-50'}`}>
                      <Store className="h-5 w-5 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
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
                      <TableHead>Created By</TableHead>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Update</TableHead>
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
                        <TableCell>{enquiry.created_by_username || 'Unknown'}</TableCell>
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
                            {getDisplayStatus(enquiry.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {enquiry.last_update_at ? format(new Date(enquiry.last_update_at), 'dd-MM-yyyy HH:mm') : '-'}
                            </span>
                            <span className="text-xs text-slate-500">
                              by {enquiry.last_update_by || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        
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

              {/* Pagination Controls */}
              {totalItems > 0 && (
                <div className="flex items-center justify-between mt-4 border-t pt-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-500">Rows per page:</span>
                    <Select 
                      value={limit.toString()} 
                      onValueChange={(val) => {
                        setLimit(Number(val));
                        setPage(1); // Reset to first page when limit changes
                      }}
                    >
                      <SelectTrigger className="w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="40">40</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-slate-500">
                      Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-slate-500">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}