'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MoreHorizontal, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { useMarkAsViewed } from '@/hooks/use-mark-viewed';

interface Collection {
  _id: string;
  invoice_id: string;
  client_name: string;
  amount: number;
  due_date: string;
  status: 'not_paid' | 'paid' | 'delayed' | 'cancelled';
  payment_method?: 'bank_transfer' | 'bank_payment';
  paid_at?: string;
  createdAt: string;
  updatedAt: string;
}

interface CollectionsSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  totalCount: number;
  paidCount: number;
  delayedCount: number;
}

export default function CollectionsTable() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [summary, setSummary] = useState<CollectionsSummary>({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    totalCount: 0,
    paidCount: 0,
    delayedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'bank_payment'>('bank_transfer');

  // Mark all collections as viewed when component mounts
  useMarkAsViewed('collection');

  // Fetch collections and summary on component mount
  useEffect(() => {
    fetchCollections();
    fetchSummary();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCollections();
      if (response.success && response.data) {
        setCollections(response.data as Collection[]);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast({
        title: "Error",
        description: "Failed to fetch collections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await apiClient.getCollectionsSummary();
      if (response.success && response.data) {
        setSummary(response.data as CollectionsSummary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const getStatusBadge = (status: Collection['status']) => {
    const statusConfig = {
      not_paid: { variant: 'secondary' as const, label: 'Not Paid', icon: Clock },
      paid: { variant: 'default' as const, label: 'Paid', icon: CheckCircle },
      delayed: { variant: 'destructive' as const, label: 'Delayed', icon: Clock },
      cancelled: { variant: 'outline' as const, label: 'Cancelled', icon: XCircle },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleStatusChange = async (collection: Collection, newStatus: Collection['status']) => {
    if (newStatus === 'paid') {
      setSelectedCollection(collection);
      setPaymentDialogOpen(true);
      return;
    }

    // Update status for non-paid statuses
    await updateCollectionStatus(collection._id, newStatus);
  };

  const handlePaymentConfirm = async () => {
    if (!selectedCollection) return;

    await updateCollectionStatus(selectedCollection._id, 'paid', paymentMethod);
    setPaymentDialogOpen(false);
    setSelectedCollection(null);
    setPaymentMethod('bank_transfer');
  };

  const updateCollectionStatus = async (
    collectionId: string, 
    status: Collection['status'], 
    paymentMethod?: 'bank_transfer' | 'bank_payment'
  ) => {
    try {
      const updateData: any = { status };
      if (paymentMethod) {
        updateData.payment_method = paymentMethod;
      }

      await apiClient.updateCollectionStatus(collectionId, updateData);
      
      // Refresh collections and summary
      await fetchCollections();
      await fetchSummary();

      toast({
        title: "Status Updated",
        description: `Collection status updated to ${status.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating collection status:', error);
      toast({
        title: "Error",
        description: "Failed to update collection status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading collections...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${summary.paidAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${summary.pendingAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Collections</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((collection) => (
                <TableRow key={collection._id}>
                  <TableCell className="font-medium">{collection.invoice_id}</TableCell>
                  <TableCell>{collection.client_name}</TableCell>
                  <TableCell>${collection.amount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(collection.due_date).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(collection.status)}</TableCell>
                  <TableCell>
                    {collection.payment_method ? (
                      <Badge variant="outline">
                        {collection.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(collection, 'paid')}
                          disabled={collection.status === 'paid'}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark as Paid
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(collection, 'delayed')}
                          disabled={collection.status === 'delayed'}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          Mark as Delayed
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(collection, 'cancelled')}
                          disabled={collection.status === 'cancelled'}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Mark as Cancelled
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Method Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Confirmation</DialogTitle>
            <DialogDescription>
              Please select the payment method for invoice {selectedCollection?.invoice_id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={paymentMethod} onValueChange={(value: 'bank_transfer' | 'bank_payment') => setPaymentMethod(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer">Bank Transfer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_payment" id="bank_payment" />
                <Label htmlFor="bank_payment">Bank Payment</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePaymentConfirm}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
