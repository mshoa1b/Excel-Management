'use client';

import { useState, useEffect } from 'react';
import { Sheet } from '@/types';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Edit, 
  Trash2, 
  Search, 
  Plus, 
  FileSpreadsheet,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

interface SheetsListProps {
  businessId: string;
  onCreateSheet: () => void;
  onEditSheet: (sheet: Sheet) => void;
}

export default function SheetsList({ businessId, onCreateSheet, onEditSheet }: SheetsListProps) {
  const { user } = useAuth();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [filteredSheets, setFilteredSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const canEdit = user?.role.name === 'Superadmin' || user?.role.name === 'Business Admin';

  useEffect(() => {
    loadSheets();
  }, [businessId]);

  useEffect(() => {
    filterSheets();
  }, [sheets, searchTerm, dateFilter]);

  const loadSheets = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSheets(businessId);
      setSheets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sheets');
    } finally {
      setLoading(false);
    }
  };

  const filterSheets = () => {
    let filtered = sheets;

    if (searchTerm) {
      filtered = filtered.filter(sheet =>
        sheet.order_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.platform.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(sheet =>
        sheet.date.startsWith(dateFilter)
      );
    }

    setFilteredSheets(filtered);
  };

  const handleDeleteSheet = async (sheetId: string) => {
    if (!confirm('Are you sure you want to delete this sheet?')) return;

    try {
      await apiClient.deleteSheet(businessId, sheetId);
      await loadSheets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sheet');
    }
  };

  const totalRefunds = filteredSheets.reduce((sum, sheet) => sum + sheet.refund_amount, 0);
  const returnsWithin30Days = filteredSheets.filter(sheet => sheet.return_within_30_days).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sheets</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSheets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRefunds.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returns (30 days)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returnsWithin30Days}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl font-semibold">Sheets</CardTitle>
            {canEdit && (
              <Button 
                onClick={onCreateSheet}
                className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Sheet
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by order number, customer name, or platform..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-auto"
              placeholder="Filter by date"
            />
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50 mb-6">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSheets.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={canEdit ? 8 : 7} 
                      className="text-center py-8 text-muted-foreground"
                    >
                      No sheets found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSheets.map((sheet) => (
                    <TableRow key={sheet.id}>
                      <TableCell>
                        {format(new Date(sheet.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">{sheet.order_no}</TableCell>
                      <TableCell>{sheet.customer_name}</TableCell>
                      <TableCell>{sheet.platform}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={sheet.return_type === 'REFUND' ? 'destructive' : 'default'}
                        >
                          {sheet.return_type}
                        </Badge>
                      </TableCell>
                      <TableCell>${sheet.refund_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {sheet.return_within_30_days && (
                            <Badge variant="secondary" className="text-xs">
                              30d
                            </Badge>
                          )}
                          {sheet.out_of_warranty && (
                            <Badge variant="outline" className="text-xs">
                              OOW
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditSheet(sheet)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSheet(sheet.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}