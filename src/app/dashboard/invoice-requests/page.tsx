'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/contexts/NotificationContext';
import InvoiceRequestForm from '@/components/invoice-request-form';
import VerificationForm from '@/components/verification-form';
import InvoiceTemplate from '@/components/invoice-template';
import TaxInvoiceTemplate from '@/components/tax-invoice-template';
import { Edit, Trash2, Package, Truck, CheckCircle, XCircle, FileText } from 'lucide-react';

export default function InvoiceRequestsPage() {
  const [invoiceRequests, setInvoiceRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDeliveryStatus, setFilterDeliveryStatus] = useState('all');
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [selectedRequestForInvoice, setSelectedRequestForInvoice] = useState(null);
  const [showTaxInputDialog, setShowTaxInputDialog] = useState(false);
  const [taxRate, setTaxRate] = useState(5); // Default 5% VAT
  const [showTaxInvoice, setShowTaxInvoice] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<any>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const { clearCount } = useNotifications();

  // Determine which requests to show based on department
  const getVisibleRequests = () => {
    if (!userProfile) return [];
    
    // Ensure invoiceRequests is always an array
    const safeInvoiceRequests = Array.isArray(invoiceRequests) ? invoiceRequests : [];
    
    const department = userProfile.department.name;
    
    switch (department) {
      case 'Sales':
        // Sales can see all their requests regardless of status
        return safeInvoiceRequests.filter(request => 
          request.created_by_employee_id?._id === (userProfile as any).employee_id ||
          request.status === 'COMPLETED' // Can see completed requests
        );
      
      case 'Operations':
        // Operations can see SUBMITTED, IN_PROGRESS, and VERIFIED requests
        return safeInvoiceRequests.filter(request => 
          request.status === 'SUBMITTED' || 
          request.status === 'IN_PROGRESS' || 
          request.status === 'VERIFIED'
        );
      
      case 'Finance':
        // Finance can see VERIFIED requests ready for invoicing
        return safeInvoiceRequests.filter(request => 
          request.status === 'VERIFIED'
        );
      
      default:
        return [];
    }
  };

  useEffect(() => {
    // Clear invoice requests notification count when page is visited
    clearCount('invoiceRequests');
    fetchInvoiceRequests();
    
    // Set up interval to refresh data every 30 seconds
    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing invoice requests...');
      fetchInvoiceRequests();
    }, 30000); // 30 seconds
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  const fetchInvoiceRequests = async () => {
    try {
      const result = await apiClient.getInvoiceRequests();
      if (result.success) {
        setInvoiceRequests((result.data as any[]) || []);
      } else {
        // Handle rate limiting gracefully
        if (result.error === 'Rate limited') {
          console.log('Rate limited, will retry later');
          setInvoiceRequests([]); // Set empty array instead of showing error
        } else {
          console.error('Error fetching invoice requests:', result.error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to fetch invoice requests',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching invoice requests:', error);
      // Ensure invoiceRequests is always an array even on error
      setInvoiceRequests([]);
      // Don't show toast for rate limiting errors
      if (!(error as any)?.message?.includes('429')) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch invoice requests',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const result = await apiClient.updateInvoiceRequestStatus(id, { status: newStatus });
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Status updated successfully',
        });
        fetchInvoiceRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update status',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update status',
      });
    }
  };

  const handleDeliveryStatusUpdate = async (id: string, newDeliveryStatus: string) => {
    try {
      const result = await apiClient.updateDeliveryStatus(id, { delivery_status: newDeliveryStatus });
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Delivery status updated successfully',
        });
        fetchInvoiceRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update delivery status',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update delivery status',
      });
    }
  };

  const handleWeightUpdate = async (id: string, weight: number) => {
    try {
      const result = await apiClient.updateWeight(id, { weight });
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Weight updated successfully',
        });
        fetchInvoiceRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update weight',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update weight',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to cancel and delete this invoice request? This action cannot be undone.')) return;

    try {
      const result = await apiClient.deleteInvoiceRequest(id);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Invoice request cancelled and deleted successfully',
        });
        fetchInvoiceRequests();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete invoice request',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete invoice request',
      });
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-500 text-white';
      case 'SUBMITTED':
        return 'bg-blue-500 text-white';
      case 'IN_PROGRESS':
        return 'bg-yellow-500 text-white';
      case 'VERIFIED':
        return 'bg-purple-500 text-white';
      case 'COMPLETED':
        return 'bg-green-500 text-white';
      case 'CANCELLED':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getDeliveryStatusBadgeColor = (deliveryStatus: string) => {
    switch (deliveryStatus) {
      case 'PENDING':
        return 'bg-gray-500 text-white';
      case 'PICKED_UP':
        return 'bg-blue-500 text-white';
      case 'IN_TRANSIT':
        return 'bg-yellow-500 text-white';
      case 'DELIVERED':
        return 'bg-green-500 text-white';
      case 'FAILED':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const visibleRequests = getVisibleRequests();
  
  // Ensure visibleRequests is always an array
  const safeVisibleRequests = Array.isArray(visibleRequests) ? visibleRequests : [];
  
  const filteredRequests = safeVisibleRequests.filter(request => {
    const statusMatch = filterStatus === 'all' || request.status === filterStatus;
    const deliveryStatusMatch = filterDeliveryStatus === 'all' || request.delivery_status === filterDeliveryStatus;
    return statusMatch && deliveryStatusMatch;
  });

  // Department-specific actions
  const handleOperationsAction = async (id: string, action: string) => {
    try {
      let result;
      if (action === 'start') {
        result = await apiClient.updateInvoiceRequestStatus(id, { status: 'IN_PROGRESS' });
      } else if (action === 'complete') {
        result = await apiClient.updateInvoiceRequestStatus(id, { status: 'IN_PROGRESS' });
        await apiClient.updateDeliveryStatus(id, { delivery_status: 'DELIVERED' });
      }
      
      if (result?.success) {
        toast({
          title: 'Success',
          description: 'Request updated successfully',
        });
        fetchInvoiceRequests();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update request',
      });
    }
  };

  const handleFinanceAction = async (id: string) => {
    try {
      // Find the request first
      const request = invoiceRequests.find((req: any) => req._id === id);
      if (request) {
        setSelectedRequestForInvoice(request);
        setShowTaxInputDialog(true);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to prepare invoice generation',
      });
    }
  };

  const handleGenerateInvoices = async () => {
    if (!selectedRequestForInvoice) return;

    try {
      // Convert request to invoice data
      const invoiceData = convertRequestToInvoiceData(selectedRequestForInvoice, taxRate);
      
      // Validate invoice data
      if (!invoiceData) {
        throw new Error('Failed to convert request to invoice data');
      }
      
      if (!invoiceData.lineItems || !Array.isArray(invoiceData.lineItems)) {
        throw new Error('Invoice data line items are missing or invalid');
      }
      
      // Create invoice in database
      console.log('Selected request for invoice:', selectedRequestForInvoice);
      console.log('Client ID from request:', (selectedRequestForInvoice as any).client_id);
      
      // For now, we'll create a client record from the customer information
      // In the future, you might want to add client_id to the InvoiceRequest schema
      const clientData = {
        company_name: (selectedRequestForInvoice as any).customer_name,
        contact_name: (selectedRequestForInvoice as any).customer_name,
        email: (selectedRequestForInvoice as any).customer_email || 'customer@example.com',
        phone: (selectedRequestForInvoice as any).customer_phone || '+971XXXXXXXXX',
        address: (selectedRequestForInvoice as any).origin_place || 'Address not provided',
        city: (selectedRequestForInvoice as any).origin_place || 'Dubai', // Use origin place as city
        country: 'UAE' // Default to UAE since this is a UAE-based company
      };
      
      // Create client first
      console.log('Creating client with data:', clientData);
      const clientResult = await apiClient.createClient(clientData);
      console.log('Client creation result:', clientResult);
      
      if (!clientResult.success) {
        console.error('Client creation failed:', clientResult.error);
        toast({
          variant: 'destructive',
          title: 'Client Creation Failed',
          description: clientResult.error || 'Failed to create client'
        });
        throw new Error('Failed to create client: ' + clientResult.error);
      }
      
      // Extract client ID from the result
      const clientId = clientResult.data?.data?._id || clientResult.data?._id || clientResult.data?.id;
      console.log('Extracted client ID:', clientId);
      console.log('Full client result structure:', clientResult);
      
      if (!clientId) {
        console.error('No client ID found in result:', clientResult);
        toast({
          variant: 'destructive',
          title: 'Client Creation Failed',
          description: 'Client was created but no ID was returned'
        });
        throw new Error('Client was created but no ID was returned');
      }
      
      console.log('Client created successfully with ID:', clientId);
      
      const invoiceResult = await apiClient.createInvoiceUnified({
        request_id: (selectedRequestForInvoice as any)._id,
        client_id: clientId,
        amount: invoiceData.baseAmount || invoiceData.charges.subtotal, // Use base amount WITHOUT tax
        line_items: invoiceData.lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total
        })),
        tax_rate: taxRate,
        notes: invoiceData.notes,
        created_by: userProfile?.employee_id || userProfile?.uid,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
      
      console.log('Invoice creation result:', invoiceResult);
      
      if (invoiceResult.success) {
        // Automatically create delivery assignment with QR code for the invoice
        console.log('🎫 Creating delivery assignment with QR code...');
        
        // Extract IDs properly
        const invoiceId = invoiceResult.data._id || invoiceResult.data.invoice_id;
        
        // Get request_id from the invoice request (which links to shipment request)
        let requestId = (selectedRequestForInvoice as any).request_id;
        
        // If request_id doesn't exist, use invoice request _id as fallback
        // Some invoice requests may not have an associated shipment request
        if (!requestId) {
          console.warn('⚠️ No shipment request_id found, using invoice request _id as fallback');
          requestId = (selectedRequestForInvoice as any)._id;
        }
        
        console.log('🔍 Invoice data:', invoiceResult.data);
        console.log('🔍 Invoice ID:', invoiceId);
        console.log('🔍 Full invoice request:', selectedRequestForInvoice);
        console.log('🔍 Request ID:', requestId);
        console.log('🔍 Client ID:', clientId);
        console.log('🔍 Amount:', invoiceData.totalAmount);
        
        // Validate IDs
        if (!invoiceId) {
          console.error('❌ Invoice ID is missing');
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Invoice ID not found in response'
          });
          return;
        }
        
        if (!clientId) {
          console.error('❌ Client ID is missing');
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Client information missing'
          });
          return;
        }
        
        // Get the actual total amount from the created invoice
        const invoiceTotalAmount = invoiceResult.data.total_amount || invoiceResult.data.amount || invoiceData.totalAmount;
        
        const deliveryAssignmentData = {
          request_id: requestId,
          driver_id: '', // No driver assigned - anyone can collect payment
          invoice_id: invoiceId,
          client_id: clientId,
          amount: invoiceTotalAmount,
          delivery_type: 'COD',
          delivery_address: (selectedRequestForInvoice as any).receiver?.address || 'Address to be confirmed',
          delivery_instructions: 'Deliver to customer address. Driver will use QR code for payment verification.'
        };

        console.log('📤 Sending delivery assignment data:', JSON.stringify(deliveryAssignmentData, null, 2));
        
        const assignmentResult = await apiClient.createDeliveryAssignment(deliveryAssignmentData);
        
        console.log('📥 Assignment result:', assignmentResult);
        
        if (assignmentResult.success) {
          console.log('✅ Delivery assignment created with QR code:', assignmentResult.data.qr_url);
          console.log('📊 Full assignment data:', assignmentResult.data);
          setQrCodeData(assignmentResult.data); // Store QR code data for invoice template
          console.log('🔗 QR Code data set:', assignmentResult.data);

          // Create collection entry for payment tracking
          console.log('💰 Creating collection entry...');
          try {
            const collectionResult = await apiClient.createCollection({
              invoice_id: invoiceResult.data._id,
              client_name: invoiceResult.data.client_id?.company_name || 'Unknown Client',
              amount: invoiceData.totalAmount,
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
              invoice_request_id: (selectedRequestForInvoice as any)._id
            });
            
            if (collectionResult.success) {
              console.log('✅ Collection entry created');
            }
          } catch (collectionError) {
            console.error('❌ Failed to create collection entry:', collectionError);
          }

          // Update shipment status
          console.log('📦 Updating shipment status...');
          try {
            await apiClient.updateShipmentStatus((selectedRequestForInvoice as any).request_id, {
              delivery_status: 'DELIVERED'
            });
            console.log('✅ Shipment status updated');
          } catch (statusError) {
            console.error('❌ Failed to update shipment status:', statusError);
          }
        } else {
          console.error('❌ Failed to create delivery assignment:', assignmentResult);
          console.error('❌ Error details:', assignmentResult.error);
          console.error('❌ Full response:', JSON.stringify(assignmentResult, null, 2));
          
          toast({
            variant: 'destructive',
            title: 'Warning',
            description: `Invoice created but QR code generation failed: ${assignmentResult.error || 'Unknown error'}. You can generate QR code later.`,
          });
        }

        // Update invoice request status to completed (delivery status stays as is)
        const result = await apiClient.updateInvoiceRequestStatus((selectedRequestForInvoice as any)._id, { 
          status: 'COMPLETED'
        });
        if (result.success) {
          toast({
            title: 'Success',
            description: 'Invoice created with QR code and request completed successfully',
          });
          
          setShowTaxInputDialog(false);
          setShowInvoicePreview(true);
          fetchInvoiceRequests();
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to create invoice in database',
        });
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
      
      let errorMessage = 'Failed to complete request';
      
      // Check if it's a duplicate invoice error
      if (error instanceof Error && (error.message.includes('duplicate') || error.message.includes('already exists'))) {
        errorMessage = 'An invoice for this request already exists';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    }
  };

  const convertRequestToInvoiceData = (request: any, taxRate: number = 0, qrCodeData?: any) => {
    console.log('🔄 Converting request to invoice data...');
    console.log('📋 Request data:', request);
    console.log('💰 Tax rate:', taxRate);
    console.log('🔗 QR Code data:', qrCodeData);
    // Generate invoice number (you might want to implement proper invoice numbering)
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const awbNumber = `AWB-${request._id.slice(-6)}`;
    const trackingNumber = `TRK${request._id.slice(-8).toUpperCase()}`;
    
    // Calculate charges based on weight and rate
    // Convert Decimal128 to number if needed
    const weight = request.weight ? 
      (typeof request.weight === 'object' && request.weight.$numberDecimal ? 
        parseFloat(request.weight.$numberDecimal) : 
        parseFloat(request.weight.toString())) : 0;
    const rate = 31.00; // Default rate, you might want to make this configurable
    const shippingCharge = weight * rate;
    const deliveryCharge = 0; // Default delivery charge
    const subtotal = shippingCharge + deliveryCharge;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    
    return {
      invoiceNumber,
      awbNumber,
      trackingNumber,
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      receiverInfo: {
        name: request.receiver_name?.toUpperCase() || 'N/A',
        address: `${request.destination_place || 'N/A'}`,
        emirate: request.destination_place || 'N/A',
        mobile: '+971XXXXXXXXX' // You might want to store this in the request
      },
      senderInfo: {
        address: '11th Street Warehouse No. 19, Rocky Warehouses Al Qusais Industrial 1, Dubai - UAE',
        email: 'customercare@knexpress.ae',
        phone: '+971 56 864 3473'
      },
      shipmentDetails: {
        numberOfBoxes: request.verification?.number_of_boxes || 1,
        weight: weight,
        weightType: request.verification?.weight_type || 'ACTUAL',
        rate: rate
      },
      charges: {
        shippingCharge: shippingCharge,
        deliveryCharge: deliveryCharge,
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        total: total
      },
      remarks: {
        boxNumbers: request.verification?.listed_commodities || 'N/A',
        agent: request.verification?.agents_name || 'N/A'
      },
      termsAndConditions: 'Cash Upon Receipt of Goods',
      qrCode: qrCodeData ? {
        url: qrCodeData.qr_url,
        code: qrCodeData.qr_code
      } : undefined,
      
      // Debug log
      _debugQR: qrCodeData ? 'QR data available' : 'QR data missing',
      // Additional properties for invoice creation
      lineItems: [{
        description: `Shipping - ${request.verification?.weight_type || 'ACTUAL'} weight`,
        quantity: 1,
        unitPrice: shippingCharge,
        total: shippingCharge
      }],
      baseAmount: subtotal, // Base amount without tax (for invoice.amount field)
      totalAmount: total, // Total amount with tax (for display and total_amount field)
      notes: `Invoice for request ${request.request_id || request._id}`
    };
  };

  if (!userProfile) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading invoice requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice Requests</h1>
          <p className="text-muted-foreground">
            {userProfile.department.name === 'Sales' && 'Create and track your invoice requests'}
            {userProfile.department.name === 'Operations' && 'Process submitted invoice requests'}
            {userProfile.department.name === 'Finance' && 'Generate invoices for completed requests'}
          </p>
        </div>
        {userProfile.department.name === 'Sales' && (
          <InvoiceRequestForm 
            onRequestCreated={fetchInvoiceRequests}
            currentUser={userProfile}
          />
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="delivery-status-filter">Delivery Status</Label>
              <Select value={filterDeliveryStatus} onValueChange={setFilterDeliveryStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by delivery status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Delivery Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Requests ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-lg">Loading invoice requests...</div>
            </div>
          ) : (
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Receiver</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Array.isArray(filteredRequests) ? filteredRequests : []).map((request) => (
                <TableRow key={request._id}>
                  <TableCell className="font-mono text-xs">
                    {request._id.slice(-8)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.customer_name}</div>
                      {request.customer_phone && (
                        <div className="text-sm text-muted-foreground">
                          {request.customer_phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.receiver_name}</div>
                      {request.receiver_company && (
                        <div className="text-sm text-muted-foreground">
                          {request.receiver_company}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{request.origin_place}</div>
                      <div className="text-muted-foreground">→</div>
                      <div>{request.destination_place}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {request.shipment_type === 'DOCUMENT' ? 'Document' : 'Non-Document'}
                    </Badge>
                    {request.is_leviable && (
                      <Badge variant="secondary" className="ml-1">Taxable</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {request.weight ? (
                      <span>
                        {(() => {
                          try {
                            let weightValue;
                            
                            // Handle Decimal128 from MongoDB
                            if (typeof request.weight === 'object' && request.weight !== null) {
                              // Try to get the value from Decimal128 object
                              if ('$numberDecimal' in request.weight) {
                                weightValue = parseFloat(request.weight.$numberDecimal);
                              } else if (request.weight.toString) {
                                weightValue = parseFloat(request.weight.toString());
                              } else {
                                // Try to access common Decimal128 fields
                                weightValue = parseFloat(String(request.weight));
                              }
                            } else {
                              weightValue = parseFloat(String(request.weight));
                            }
                            
                            // Check if parsing resulted in a valid number
                            if (!isNaN(weightValue) && isFinite(weightValue)) {
                              return weightValue.toFixed(2);
                            } else {
                              return '0.00';
                            }
                          } catch (error) {
                            console.error('Error parsing weight:', error);
                            return 'N/A';
                          }
                        })()} kg
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(request.status)}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getDeliveryStatusBadgeColor(request.delivery_status)}>
                      {request.delivery_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {/* Department-specific actions */}
                      {userProfile.department.name === 'Sales' && (
                        <>
                          {/* Sales can only view and cancel their requests */}
                          {request.status === 'DRAFT' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(request._id, 'SUBMITTED')}
                            >
                              Submit
                            </Button>
                          )}
                          {request.status !== 'COMPLETED' && request.status !== 'CANCELLED' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(request._id)}
                            >
                              Cancel & Delete
                            </Button>
                          )}
                        </>
                      )}

                      {userProfile.department.name === 'Operations' && (
                        <>
                          {/* Operations can start processing submitted requests */}
                          {request.status === 'SUBMITTED' && (
                            <Button
                              size="sm"
                              onClick={() => handleOperationsAction(request._id, 'start')}
                            >
                              Start Processing
                            </Button>
                          )}
                          
                          {/* Delivery Status Update */}
                          <Select
                            value={request.delivery_status}
                            onValueChange={(value) => handleDeliveryStatusUpdate(request._id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                              <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                              <SelectItem value="DELIVERED">Delivered</SelectItem>
                              <SelectItem value="FAILED">Failed</SelectItem>
                            </SelectContent>
                          </Select>


                          {/* Verification Form - Required before sending to Finance */}
                          {request.status === 'IN_PROGRESS' && (
                            <div className="flex flex-col gap-2">
                              <div className="text-xs text-orange-600 font-semibold">
                                ⚠️ Complete 6-point verification required
                              </div>
                              <VerificationForm
                                request={request}
                                onVerificationComplete={fetchInvoiceRequests}
                                currentUser={userProfile}
                              />
                            </div>
                          )}
                        </>
                      )}

                      {userProfile.department.name === 'Finance' && (
                        <>
                          {/* Finance can generate invoices */}
                          {request.status === 'VERIFIED' && (
                            <Button
                              size="sm"
                              onClick={() => handleFinanceAction(request._id)}
                            >
                              Generate Invoice
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!Array.isArray(filteredRequests) || filteredRequests.length === 0) && !loading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No invoice requests right now</p>
                      {userProfile.department.name === 'Sales' && (
                        <p className="text-sm text-muted-foreground">
                          Create your first invoice request using the button above
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Tax Input Dialog */}
      {showTaxInputDialog && selectedRequestForInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Invoice Generation</h2>
            <p className="text-gray-600 mb-4">
              Enter the tax rate for invoice generation. Both normal and tax invoices will be created.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter tax rate (e.g., 5 for 5%)"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTaxInputDialog(false);
                  setSelectedRequestForInvoice(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateInvoices}
                className="bg-green-600 hover:bg-green-700"
              >
                Generate Both Invoices
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {showInvoicePreview && selectedRequestForInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Invoice Preview</h2>
              <div className="space-x-2">
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Print
                </Button>
                <Button
                  onClick={() => setShowInvoicePreview(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex space-x-4 mb-4">
                <button
                  className={`px-4 py-2 rounded-md font-medium ${
                    !showTaxInvoice ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => setShowTaxInvoice(false)}
                >
                  Regular Invoice
                </button>
                <button
                  className={`px-4 py-2 rounded-md font-medium ${
                    showTaxInvoice ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => setShowTaxInvoice(true)}
                >
                  Tax Invoice ({taxRate}% VAT)
                </button>
              </div>
              
              {!showTaxInvoice ? (
                <InvoiceTemplate data={convertRequestToInvoiceData(selectedRequestForInvoice, 0, qrCodeData)} />
              ) : (
                <TaxInvoiceTemplate data={convertRequestToInvoiceData(selectedRequestForInvoice, taxRate, qrCodeData)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
