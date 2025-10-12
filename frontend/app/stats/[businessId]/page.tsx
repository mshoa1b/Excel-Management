'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { apiClient } from '@/lib/api';
import { Stats } from '@/types';
import { format } from 'date-fns';
import { 
  FileSpreadsheet, 
  DollarSign, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle,
  FileText,
  Download
} from 'lucide-react';

export default function StatsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { user } = useAuth();
  const { currency, formatCurrency, isLoading: currencyLoading } = useCurrency(businessId);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState('1m');
  
  // Refunds Statement state
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);

  useEffect(() => {
    loadStats();
  }, [businessId, selectedRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getStats(businessId, selectedRange);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRefundsReport = async () => {
    try {
      setGeneratingPdf(true);
      
      // Format dates for API
      const fromDate = format(dateFrom, 'yyyy-MM-dd');
      const toDate = format(dateTo, 'yyyy-MM-dd');
      
      // Fetch filtered data from API
      const params = new URLSearchParams({
        dateFrom: fromDate,
        dateTo: toDate,
        platform: selectedPlatform
      });
      
      const response = await apiClient.request(`/sheets/${businessId}/refunds-report?${params}`);
      
      const data = response;
      
      // Generate PDF
      await generateRefundsPDF(data, fromDate, toDate, selectedPlatform);
      
    } catch (error) {
      console.error('Error generating refunds report:', error);
      alert('Failed to generate refunds report. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };
  
  const generateRefundsPDF = async (data: any[], fromDate: string, toDate: string, platform: string) => {
    // Dynamic import for client-side only
    const jsPDF = (await import('jspdf')).default;
    
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Refunds Statement', 20, 20);
    
    // Date range and platform info - format dates as dd-mm-yyyy
    doc.setFontSize(12);
    const fromDateFormatted = format(new Date(fromDate), 'dd-MM-yyyy');
    const toDateFormatted = format(new Date(toDate), 'dd-MM-yyyy');
    doc.text(`Date Range: ${fromDateFormatted} to ${toDateFormatted}`, 20, 35);
    doc.text(`Platform: ${platform === 'all' ? 'All Platforms' : platform}`, 20, 45);
    
    // Sort and process data
    const sortedData = data.sort((a, b) => {
      // Order by platform first, then by date
      if (a.platform !== b.platform) {
        return a.platform.localeCompare(b.platform);
      }
      return new Date(a.refund_date).getTime() - new Date(b.refund_date).getTime();
    });
    
    // Create table manually with wider columns for full order numbers
    let yPosition = 65;
    const columnWidths = [30, 70, 35, 35];
    const columnPositions = [20, 50, 120, 155];
    
    // Table headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Refund Date', columnPositions[0], yPosition);
    doc.text('Order Number', columnPositions[1], yPosition);
    doc.text('Refund Amount', columnPositions[2], yPosition);
    doc.text('Platform', columnPositions[3], yPosition);
    
    // Header line
    yPosition += 5;
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    sortedData.forEach((row, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      const refundDate = format(new Date(row.refund_date), 'dd/MM/yyyy');
      const orderNumber = row.order_number || '-'; // Show full order number without truncation
      const refundAmount = row.refund_amount ? `$${parseFloat(row.refund_amount).toFixed(2)}` : '$0.00';
      const platform = row.platform || '-';
      
      // Use smaller font for order numbers if they're very long
      const isLongOrderNumber = orderNumber.length > 15;
      if (isLongOrderNumber) {
        doc.setFontSize(8);
      }
      
      doc.text(refundDate, columnPositions[0], yPosition);
      doc.text(orderNumber, columnPositions[1], yPosition);
      doc.text(refundAmount, columnPositions[2], yPosition);
      doc.text(platform, columnPositions[3], yPosition);
      
      // Reset font size if it was changed
      if (isLongOrderNumber) {
        doc.setFontSize(10);
      }
      
      yPosition += 8;
    });
    
    // Summary
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    yPosition += 10;
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;
    
    const totalAmount = sortedData.reduce((sum, row) => sum + (parseFloat(row.refund_amount) || 0), 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Records: ${sortedData.length}`, 20, yPosition);
    doc.text(`Total Refund Amount: $${totalAmount.toFixed(2)}`, 120, yPosition);
    
    // Save the PDF with properly formatted dates
    doc.save(`refunds-statement-${fromDateFormatted}-to-${toDateFormatted}.pdf`);
  };

  const getRangeLabel = (range: string) => {
    switch (range) {
      case '1d': return 'Last 24 Hours';
      case '1w': return 'Last Week';
      case '1m': return 'Last Month';
      case '3m': return 'Last 3 Months';
      case '6m': return 'Last 6 Months';
      case '1y': return 'Last Year';
      default: return 'Last Month';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute businessId={businessId}>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute businessId={businessId}>
      <DashboardLayout>
        <div className="space-y-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Analytics Dashboard</h1>
              <p className="text-slate-600">Business insights and statistics</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Time Range:</span>
              <Select value={selectedRange} onValueChange={setSelectedRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 Hours</SelectItem>
                  <SelectItem value="1w">Last Week</SelectItem>
                  <SelectItem value="1m">Last Month</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {stats && (
            <>
              {/* Primary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatsCard
                  title="Total Orders"
                  value={stats.totalOrders}
                  description={getRangeLabel(selectedRange)}
                  icon={FileSpreadsheet}
                />
                <StatsCard
                  title="Total Refund Amount"
                  value={formatCurrency(stats.totalRefundAmount)}
                  description={getRangeLabel(selectedRange)}
                  icon={DollarSign}
                />
                <StatsCard
                  title="Average Refund"
                  value={formatCurrency(stats.averageRefundAmount)}
                  description="Per order"
                  icon={TrendingUp}
                />
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatsCard
                  title="Unique Orders"
                  value={stats.uniqueOrders}
                  description="Distinct order numbers"
                  icon={FileSpreadsheet}
                />
                <StatsCard
                  title="Returns (30 days)"
                  value={stats.ordersWithin30Days}
                  description="Within return window"
                  icon={Calendar}
                />
                <StatsCard
                  title="Out of Warranty"
                  value={stats.outOfWarrantyReturns}
                  description="Beyond warranty period"
                  icon={AlertTriangle}
                />
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span>Return Timeline</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Within 30 days</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ 
                                width: `${stats.totalOrders > 0 ? (stats.ordersWithin30Days / stats.totalOrders) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="font-medium">{stats.ordersWithin30Days}</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Out of warranty</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500 rounded-full"
                              style={{ 
                                width: `${stats.totalOrders > 0 ? (stats.outOfWarrantyReturns / stats.totalOrders) * 100 : 0}%` 
                              }}
                            />
                          </div>
                          <span className="font-medium">{stats.outOfWarrantyReturns}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-teal-600" />
                      <span>Financial Summary</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600">Total Refund Amount</span>
                        <span className="font-bold text-lg">{formatCurrency(stats.totalRefundAmount)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-slate-600">Average per Order</span>
                        <span className="font-bold text-lg">{formatCurrency(stats.averageRefundAmount)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-600">Total Orders</span>
                        <span className="font-bold text-lg">{stats.totalOrders}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Refunds Statement Card */}
              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-purple-600" />
                      <span>Refunds Statement</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Date Range Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="date-from">From Date</Label>
                          <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={dateFrom}
                                onSelect={(date) => {
                                  if (date) {
                                    setDateFrom(date);
                                    setDateFromOpen(false);
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="date-to">To Date</Label>
                          <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={dateTo}
                                onSelect={(date) => {
                                  if (date) {
                                    setDateTo(date);
                                    setDateToOpen(false);
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      
                      {/* Platform Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="platform-select">Platform</Label>
                        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Platforms</SelectItem>
                            <SelectItem value="Backmarket">Backmarket</SelectItem>
                            <SelectItem value="Amazon">Amazon</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Generate Button */}
                      <Button 
                        onClick={handleGenerateRefundsReport} 
                        disabled={generatingPdf || !dateFrom || !dateTo}
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {generatingPdf ? 'Generating PDF...' : 'Generate Refunds Statement'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}