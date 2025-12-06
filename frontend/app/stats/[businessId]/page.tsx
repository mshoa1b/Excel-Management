'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import TrendChart from '@/components/dashboard/TrendChart';
import IssueBarChart from '@/components/dashboard/IssueBarChart';
import StatusPieChart from '@/components/dashboard/StatusPieChart';
import PlatformComparison from '@/components/dashboard/PlatformComparison';
import DataTable from '@/components/dashboard/DataTable';
import DonutChart from '@/components/dashboard/DonutChart';
import GroupedBarChart from '@/components/dashboard/GroupedBarChart';
import StackedBarChart from '@/components/dashboard/StackedBarChart';
import AdvancedDataTable from '@/components/dashboard/AdvancedDataTable';
import HeatmapChart from '@/components/dashboard/HeatmapChart';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useBusiness } from '@/contexts/BusinessContext';
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
  Download,
  Box,
  Users,
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function StatsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const { user } = useAuth();
  const { businessName } = useBusiness();
  const { currency, formatCurrency, isLoading: currencyLoading } = useCurrency(businessId);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState('1m');

  // New analytics state
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [issueStats, setIssueStats] = useState<any>(null);
  const [productStats, setProductStats] = useState<any>(null);
  const [agentStats, setAgentStats] = useState<any>(null);
  const [trendStats, setTrendStats] = useState<any>(null);
  const [advancedStats, setAdvancedStats] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

      // Load all analytics in parallel
      const [statsData, platformData, issueData, productData, agentData, trendData, advancedData] = await Promise.all([
        apiClient.getStats(businessId, selectedRange),
        apiClient.getPlatformStats(businessId, selectedRange),
        apiClient.getIssueStats(businessId, selectedRange),
        apiClient.getProductStats(businessId, selectedRange),
        apiClient.getAgentStats(businessId, selectedRange),
        apiClient.getTrendStats(businessId, selectedRange),
        apiClient.getAdvancedStats(businessId, selectedRange)
      ]);

      setStats(statsData);
      setPlatformStats(platformData);
      setIssueStats(issueData);
      setProductStats(productData);
      setAgentStats(agentData);
      setTrendStats(trendData);
      setAdvancedStats(advancedData);
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
      await generateRefundsPDF(data, fromDate, toDate, selectedPlatform, currency?.symbol || '$');

    } catch (error) {
      console.error('Error generating refunds report:', error);
      alert('Failed to generate refunds report. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const generateRefundsPDF = async (data: any[], fromDate: string, toDate: string, platform: string, currencySymbol: string) => {
    // Dynamic import for client-side only
    const jsPDF = (await import('jspdf')).default;

    const doc = new jsPDF();

    // Business Name at the top
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const businessDisplayName = businessName || 'Business';
    doc.text(businessDisplayName, 20, 15);

    // Title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(20);
    doc.text('Refunds Statement', 20, 30);

    // Date range and platform info - format dates as dd-mm-yyyy
    doc.setFontSize(12);
    const fromDateFormatted = format(new Date(fromDate), 'dd-MM-yyyy');
    const toDateFormatted = format(new Date(toDate), 'dd-MM-yyyy');
    doc.text(`Date Range: ${fromDateFormatted} to ${toDateFormatted}`, 20, 45);
    doc.text(`Platform: ${platform === 'all' ? 'All Platforms' : platform}`, 20, 55);

    // Sort and process data
    const sortedData = data.sort((a, b) => {
      // Order by platform first, then by date
      if (a.platform !== b.platform) {
        return a.platform.localeCompare(b.platform);
      }
      return new Date(a.refund_date).getTime() - new Date(b.refund_date).getTime();
    });

    // Create table manually with wider columns for full order numbers
    let yPosition = 75;
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
      const refundAmount = row.refund_amount ? `${currencySymbol}${parseFloat(row.refund_amount).toFixed(2)}` : `${currencySymbol}0.00`;
      const platform = row.platform || '-';

      // Use smaller font for order numbers if they're very long
      const isLongOrderNumber = orderNumber.length > 15;
      doc.setFontSize(10);
      doc.text(refundDate, columnPositions[0], yPosition);

      if (isLongOrderNumber) {
        doc.setFontSize(8);
      }


      doc.text(orderNumber, columnPositions[1], yPosition);

      if (isLongOrderNumber) {
        doc.setFontSize(10);
      }
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
    doc.text(`Total Refund Amount: ${currencySymbol}${totalAmount.toFixed(2)}`, 120, yPosition);

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
                  icon={Box}
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

              {/* NEW ANALYTICS SECTIONS */}

              {/* Trends Over Time */}
              {trendStats?.daily && trendStats.daily.length > 0 && (
                <div className="mt-6">
                  <TrendChart
                    title="Returns Trend Over Time"
                    data={trendStats.daily}
                    height={350}
                  />
                </div>
              )}

              {/* Platform Comparison & Issue Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {platformStats?.platforms && Object.keys(platformStats.platforms).length > 0 && (
                  <PlatformComparison
                    title="Platform Comparison"
                    platforms={platformStats.platforms}
                    height={300}
                  />
                )}

                {issueStats?.statusDistribution && issueStats.statusDistribution.length > 0 && (
                  <StatusPieChart
                    title="Status Distribution"
                    data={issueStats.statusDistribution}
                    height={300}
                  />
                )}
              </div>

              {/* Top Issues */}
              {issueStats?.topIssues && issueStats.topIssues.length > 0 && (
                <div className="mt-6">
                  <IssueBarChart
                    title="Top 10 Most Common Issues"
                    data={issueStats.topIssues}
                    height={400}
                  />
                </div>
              )}

              {/* Lock Issues Summary */}
              {issueStats?.lockIssues && (
                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <span>Lock & Security Issues</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                          <p className="text-sm text-slate-600 mb-1">Passcode Locks</p>
                          <p className="text-2xl font-bold text-slate-800">
                            {issueStats.lockIssues.passcode_count || 0}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                          <p className="text-sm text-slate-600 mb-1">Apple ID Locks</p>
                          <p className="text-2xl font-bold text-slate-800">
                            {issueStats.lockIssues.apple_id_count || 0}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                          <p className="text-sm text-slate-600 mb-1">Google Locks</p>
                          <p className="text-2xl font-bold text-slate-800">
                            {issueStats.lockIssues.google_id_count || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Product Analytics */}
              {productStats?.topReturnedSKUs && productStats.topReturnedSKUs.length > 0 && (
                <div className="mt-6">
                  <DataTable
                    title="Top Returned Products"
                    columns={['SKU', 'Return Count', 'Total Refund']}
                    data={productStats.topReturnedSKUs.map((item: any) => ({
                      sku: item.sku,
                      return_count: item.return_count,
                      total_refund: formatCurrency(item.total_refund)
                    }))}
                  />
                </div>
              )}

              {/* Agent Performance */}
              {agentStats?.agentPerformance && agentStats.agentPerformance.length > 0 && (
                <div className="mt-6">
                  <DataTable
                    title="Team Performance"
                    columns={['Agent', 'Cases Handled', 'Avg Resolution (Days)', 'Resolution Rate (%)']}
                    data={agentStats.agentPerformance.map((item: any) => ({
                      agent: item.agent,
                      cases_handled: item.cases_handled,
                      'avg_resolution_(days)': item.avg_resolution_days?.toFixed(1) || '0.0',
                      'resolution_rate_(%)': item.resolution_rate?.toFixed(1) || '0.0'
                    }))}
                  />
                </div>
              )}

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
                            <SelectItem value="Back Market">Back Market</SelectItem>
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

              {/* Advanced Analytics Section */}
              {advancedStats && (
                <div className="mt-8">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl">Advanced Cross-Dimensional Analytics</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                          {showAdvanced ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Hide Advanced Analytics
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Show Advanced Analytics
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Deep insights through 15 cross-dimensional analyses of your return data
                      </p>
                    </CardHeader>
                    {showAdvanced && (
                      <CardContent className="space-y-6">
                        {/* Section 1: Basic Breakdowns */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Core Metrics</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 1. Resolution Breakdown */}
                            <IssueBarChart
                              title="Resolution Breakdown"
                              data={advancedStats.resolutionBreakdown?.map((item: any) => ({
                                name: item.resolution,
                                count: item.count,
                                percentage: item.percentage
                              })) || []}
                            />

                            {/* 2. Return within 30 Days */}
                            <DonutChart
                              title="Returns Within 30 Days"
                              data={advancedStats.return30DaysAnalysis?.map((item: any) => ({
                                name: item.return_within_30_days === 'Yes' ? 'Within 30 Days' : 'After 30 Days',
                                value: item.count,
                                percentage: item.percentage
                              })) || []}
                              colors={['#10b981', '#f59e0b']}
                            />

                            {/* 4. Return Type Breakdown */}
                            <DonutChart
                              title="Return Type Distribution"
                              data={advancedStats.returnTypeBreakdown?.map((item: any) => ({
                                name: item.return_type,
                                value: item.count,
                                percentage: item.percentage
                              })) || []}
                            />

                            {/* 5. Replacement Analysis */}
                            {advancedStats.replacementAnalysis && advancedStats.replacementAnalysis.length > 0 && (
                              <DonutChart
                                title="Replacement Availability"
                                data={advancedStats.replacementAnalysis.map((item: any) => ({
                                  name: item.replacement_available === 'Yes' ? 'Available' : 'Not Available',
                                  value: item.count,
                                  percentage: item.percentage
                                }))}
                                colors={['#10b981', '#ef4444']}
                              />
                            )}
                          </div>
                        </div>

                        {/* 3. Blocked By Analysis */}
                        <AdvancedDataTable
                          title="Blocked Cases Analysis"
                          data={advancedStats.blockedByAnalysis || []}
                          columns={[
                            { key: 'blocked_by', label: 'Blocked By' },
                            { key: 'count', label: 'Cases', formatter: (v) => v.toLocaleString() },
                            { key: 'avg_blocked_days', label: 'Avg Days Blocked', formatter: (v) => v.toFixed(1) }
                          ]}
                          defaultSortKey="count"
                          maxHeight="300px"
                        />

                        {/* Section 2: Cross-Dimensional Analysis */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Cross-Dimensional Insights</h3>

                          {/* 6. Return Type + Resolution Heatmap */}
                          <div className="mb-6">
                            <HeatmapChart
                              title="Return Type vs Resolution Correlation"
                              data={advancedStats.returnTypeResolution?.map((item: any) => ({
                                row: item.return_type,
                                col: item.resolution,
                                value: item.count
                              })) || []}
                              valueLabel="Cases"
                            />
                          </div>

                          {/* 7. Return Type + 30 Days */}
                          <div className="mb-6">
                            <GroupedBarChart
                              title="Return Type by Warranty Period"
                              data={(() => {
                                const grouped: any = {};
                                advancedStats.returnType30Days?.forEach((item: any) => {
                                  if (!grouped[item.return_type]) {
                                    grouped[item.return_type] = { name: item.return_type };
                                  }
                                  const key = item.return_within_30_days === 'Yes' ? 'within30' : 'after30';
                                  grouped[item.return_type][key] = item.count;
                                });
                                return Object.values(grouped);
                              })()}
                              xKey="name"
                              bars={[
                                { key: 'within30', name: 'Within 30 Days', color: '#10b981' },
                                { key: 'after30', name: 'After 30 Days', color: '#f59e0b' }
                              ]}
                            />
                          </div>

                          {/* 8. 30 Days + Resolution */}
                          <div className="mb-6">
                            <StackedBarChart
                              title="Resolution by Warranty Period"
                              data={(() => {
                                const grouped: any = {};
                                advancedStats.return30DaysResolution?.forEach((item: any) => {
                                  const period = item.return_within_30_days === 'Yes' ? 'Within 30 Days' : 'After 30 Days';
                                  if (!grouped[period]) {
                                    grouped[period] = { name: period };
                                  }
                                  grouped[period][item.resolution] = item.count;
                                });
                                return Object.values(grouped);
                              })()}
                              xKey="name"
                              bars={(() => {
                                const resolutions = new Set<string>();
                                advancedStats.return30DaysResolution?.forEach((item: any) => {
                                  resolutions.add(item.resolution);
                                });
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                                return Array.from(resolutions).map((res, idx) => ({
                                  key: res,
                                  name: res,
                                  color: colors[idx % colors.length]
                                }));
                              })()}
                              showPercentage={true}
                            />
                          </div>

                          {/* 11. Issue + Resolution Correlation */}
                          <div className="mb-6">
                            <HeatmapChart
                              title="Issue vs Resolution Correlation (Top 20)"
                              data={advancedStats.issueResolution?.slice(0, 20).map((item: any) => ({
                                row: item.issue,
                                col: item.resolution,
                                value: item.count
                              })) || []}
                              valueLabel="Cases"
                            />
                          </div>

                          {/* 12. Status + Return Type */}
                          <div className="mb-6">
                            <StackedBarChart
                              title="Status Distribution by Return Type"
                              data={(() => {
                                const grouped: any = {};
                                advancedStats.statusReturnType?.forEach((item: any) => {
                                  if (!grouped[item.return_type]) {
                                    grouped[item.return_type] = { name: item.return_type };
                                  }
                                  grouped[item.return_type][item.status] = item.count;
                                });
                                return Object.values(grouped);
                              })()}
                              xKey="name"
                              bars={(() => {
                                const statuses = new Set<string>();
                                advancedStats.statusReturnType?.forEach((item: any) => {
                                  statuses.add(item.status);
                                });
                                return Array.from(statuses).map((status, idx) => ({
                                  key: status,
                                  name: status,
                                  color: ['#3b82f6', '#f59e0b', '#10b981'][idx % 3]
                                }));
                              })()}
                            />
                          </div>

                          {/* 13. Out of Warranty + Resolution */}
                          <div className="mb-6">
                            <GroupedBarChart
                              title="Out of Warranty Impact on Resolution"
                              data={(() => {
                                const grouped: any = {};
                                advancedStats.oowResolution?.forEach((item: any) => {
                                  if (!grouped[item.resolution]) {
                                    grouped[item.resolution] = { name: item.resolution };
                                  }
                                  const key = item.out_of_warranty === 'Yes' ? 'oow' : 'inWarranty';
                                  grouped[item.resolution][key] = item.count;
                                });
                                return Object.values(grouped);
                              })()}
                              xKey="name"
                              bars={[
                                { key: 'inWarranty', name: 'In Warranty', color: '#10b981' },
                                { key: 'oow', name: 'Out of Warranty', color: '#ef4444' }
                              ]}
                            />
                          </div>
                        </div>

                        {/* Section 3: Detailed Tables */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Detailed Analysis Tables</h3>

                          {/* 9. Multiple Return + Resolution */}
                          <div className="mb-6">
                            <AdvancedDataTable
                              title="Multiple Returns by Resolution"
                              data={advancedStats.multipleReturnResolution || []}
                              columns={[
                                { key: 'multiple_return', label: 'Return Frequency' },
                                { key: 'resolution', label: 'Resolution' },
                                { key: 'count', label: 'Cases', formatter: (v) => v.toLocaleString() }
                              ]}
                              defaultSortKey="count"
                            />
                          </div>

                          {/* 10. Platform + Return Type + Resolution (3-way) */}
                          <div className="mb-6">
                            <AdvancedDataTable
                              title="Platform × Return Type × Resolution (Top 20)"
                              data={advancedStats.platformReturnResolution?.slice(0, 20) || []}
                              columns={[
                                { key: 'platform', label: 'Platform' },
                                { key: 'return_type', label: 'Return Type' },
                                { key: 'resolution', label: 'Resolution' },
                                { key: 'count', label: 'Cases', formatter: (v) => v.toLocaleString() }
                              ]}
                              defaultSortKey="count"
                            />
                          </div>

                          {/* 14. Done By + Return Type Performance */}
                          <div className="mb-6">
                            <AdvancedDataTable
                              title="Agent Performance by Return Type (Top 20)"
                              data={advancedStats.doneByReturnType?.slice(0, 20) || []}
                              columns={[
                                { key: 'done_by', label: 'Agent' },
                                { key: 'return_type', label: 'Return Type' },
                                { key: 'count', label: 'Cases', formatter: (v) => v.toLocaleString() },
                                { key: 'avg_days', label: 'Avg Days', formatter: (v) => v?.toFixed(1) || '-' }
                              ]}
                              defaultSortKey="count"
                            />
                          </div>

                          {/* 15. Apple/Google ID + Resolution */}
                          <div className="mb-6">
                            <AdvancedDataTable
                              title="Lock Issues Resolution Patterns"
                              data={advancedStats.appleGoogleResolution || []}
                              columns={[
                                { key: 'apple_google_id', label: 'Lock Type' },
                                { key: 'resolution', label: 'Resolution' },
                                { key: 'count', label: 'Cases', formatter: (v) => v.toLocaleString() }
                              ]}
                              defaultSortKey="count"
                            />
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}