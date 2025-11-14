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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/contexts/NotificationContext';
import InvoiceRequestForm from '@/components/invoice-request-form';
import VerificationForm from '@/components/verification-form';
import InvoiceTemplate from '@/components/invoice-template';
import TaxInvoiceTemplate from '@/components/tax-invoice-template';
import { Edit, Trash2, Package, Truck, CheckCircle, XCircle, FileText, ArrowRight, Phone, MapPin, AlertTriangle } from 'lucide-react';

const normalizeServiceCode = (code?: string | null) =>
  (code || '')
    .toString()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

const isPhToUaeService = (code?: string | null) => {
  const normalized = normalizeServiceCode(code);
  return normalized === 'PH_TO_UAE' || normalized.startsWith('PH_TO_UAE_');
};

const isUaeToPhService = (code?: string | null) => {
  const normalized = normalizeServiceCode(code);
  return normalized === 'UAE_TO_PH' || normalized.startsWith('UAE_TO_PH_');
};

export default function InvoiceRequestsPage() {
  const [invoiceRequests, setInvoiceRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDeliveryStatus, setFilterDeliveryStatus] = useState('all');
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [selectedRequestForInvoice, setSelectedRequestForInvoice] = useState(null);
  const [showTaxInputDialog, setShowTaxInputDialog] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false); // Delivery required flag
  const [customerTRN, setCustomerTRN] = useState(''); // Optional customer TRN
  const [batchNumber, setBatchNumber] = useState(''); // Optional batch number
  const [customDeliveryCharge, setCustomDeliveryCharge] = useState(''); // Manual delivery charge for UAE->PH
  const [showTaxInvoice, setShowTaxInvoice] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<any>(null);
  const getRequestServiceCode = (request?: any) =>
    request?.service_code ||
    request?.verification?.service_code ||
    request?.shipment?.service_code ||
    '';

  const { toast } = useToast();
  const { userProfile } = useAuth();
  const { clearCount } = useNotifications();
  const getAutoTaxRate = (request?: any) => {
    if (!request || !hasDelivery) return 0;
    const serviceCode = getRequestServiceCode(request);
    return isPhToUaeService(serviceCode) ? 5 : 0;
  };
  const selectedRequestTaxRate = getAutoTaxRate(selectedRequestForInvoice || undefined);
  const selectedServiceCode = getRequestServiceCode(selectedRequestForInvoice || undefined);
  const isUaeToPhSelected = isUaeToPhService(selectedServiceCode);
  const generateDisabled =
    !batchNumber.trim() ||
    (isUaeToPhSelected && hasDelivery && !customDeliveryCharge.trim());
  const manualChargeForPreview = (() => {
    if (!isUaeToPhSelected || !customDeliveryCharge.trim()) return undefined;
    const parsed = parseFloat(customDeliveryCharge);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  })();

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
        const existingBatch =
          request.batch_number ||
          request.invoice_number ||
          request.request_id?.batch_number ||
          '';
        setSelectedRequestForInvoice(request);
        setShowTaxInputDialog(true);
        setCustomerTRN('');
        setBatchNumber(existingBatch);
        setHasDelivery(false);
        setCustomDeliveryCharge('');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to prepare invoice generation',
      });
    }
  };

  const handleDeliveryToggle = (checked: boolean) => {
    setHasDelivery(checked);
    if (!checked) {
      setCustomDeliveryCharge('');
    }
  };

  const formatWeightValue = (weight: any) => {
    if (weight === null || weight === undefined) return null;
    try {
      let parsed;
      if (typeof weight === 'object') {
        if ('$numberDecimal' in weight) {
          parsed = parseFloat(weight.$numberDecimal);
        } else if (typeof weight.toString === 'function') {
          parsed = parseFloat(weight.toString());
        } else {
          parsed = parseFloat(String(weight));
        }
      } else {
        parsed = parseFloat(String(weight));
      }
      if (!isFinite(parsed) || isNaN(parsed)) {
        return null;
      }
      return parsed.toFixed(2);
    } catch (error) {
      console.error('Error parsing weight:', error);
      return null;
    }
  };

  const formatDateLabel = (value?: string) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return value;
    }
  };

  const formatServiceCode = (code?: string | null) => {
    if (!code) return 'N/A';
    return code
      .toString()
      .trim()
      .replace(/_/g, ' → ')
      .replace(/\s+/g, ' ');
  };

  const renderActionControls = (request: any) => {
    const departmentName = userProfile.department.name;

    if (departmentName === 'Sales') {
      return (
        <>
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
      );
    }

    if (departmentName === 'Operations') {
      return (
        <>
          {request.status === 'SUBMITTED' && (
            <Button
              size="sm"
              onClick={() => handleOperationsAction(request._id, 'start')}
            >
              Start Processing
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Delivery</span>
            <Select
              value={request.delivery_status}
              onValueChange={(value) => handleDeliveryStatusUpdate(request._id, value)}
            >
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    }

    if (departmentName === 'Finance' && request.status === 'VERIFIED') {
      return (
        <Button size="sm" onClick={() => handleFinanceAction(request._id)}>
          Generate Invoice
        </Button>
      );
    }

    return null;
  };

  const handleGenerateInvoices = async () => {
    if (!selectedRequestForInvoice) return;
    if (!batchNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Batch Number Required',
        description: 'Please enter a batch number before generating the invoice.',
      });
      return;
    }

    try {
      const serviceCode = getRequestServiceCode(selectedRequestForInvoice);
      const isUaeToPh = isUaeToPhService(serviceCode);
      const taxRateForRequest = getAutoTaxRate(selectedRequestForInvoice);

      let manualDeliveryChargeValue: number | undefined;
      if (isUaeToPh && hasDelivery) {
        const parsed = parseFloat(customDeliveryCharge);
        if (!customDeliveryCharge.trim() || isNaN(parsed) || parsed <= 0) {
          toast({
            variant: 'destructive',
            title: 'Delivery Charge Required',
            description: 'Enter a positive delivery charge amount for UAE → PH shipments or disable delivery.',
          });
          return;
        }
        manualDeliveryChargeValue = parsed;
      }
      // Convert request to invoice data
      const invoiceData = convertRequestToInvoiceData(
        selectedRequestForInvoice,
        taxRateForRequest,
        undefined,
        { batchNumber, manualDeliveryCharge: manualDeliveryChargeValue }
      );
      
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
        tax_rate: taxRateForRequest,
        has_delivery: hasDelivery, // Pass delivery flag
        customer_trn: customerTRN || undefined,
        batch_number: batchNumber || undefined,
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
          setCustomerTRN('');
          setBatchNumber('');
        setCustomDeliveryCharge('');
        setHasDelivery(false);
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

  const convertRequestToInvoiceData = (
    request: any,
    taxRateOverride?: number,
    qrCodeData?: any,
    options: { mode?: 'normal' | 'tax'; batchNumber?: string; manualDeliveryCharge?: number } = {}
  ) => {
    console.log('🔄 Converting request to invoice data...');
    console.log('📋 Request data:', request);
    console.log('💰 Tax rate override:', taxRateOverride);
    console.log('🔗 QR Code data:', qrCodeData);
    console.log('🧾 Options:', options);
    const fallbackId = (request._id || Date.now().toString()).toString();
    const invoiceNumber =
      request.invoice_number ||
      request.invoice_id ||
      request.request_id ||
      `INV-${fallbackId.slice(-6).padStart(6, '0')}`;
    const awbNumber =
      request.tracking_code ||
      request.awb_number ||
      request.request_id?.tracking_code ||
      `AWB-${fallbackId.slice(-6)}`;
    const trackingNumber = awbNumber;
    const senderName =
      request.customer_name ||
      request.sender_name ||
      request.client_id?.company_name ||
      'N/A';
    const senderAddress =
      request.origin_place ||
      request.sender_address ||
      request.verification?.sender_address ||
      'N/A';
    const senderPhone =
      request.customer_phone ||
      request.sender_phone ||
      request.client_id?.contact_phone ||
      request.client_id?.phone ||
      '+971XXXXXXXXX';
    const senderEmail =
      request.customer_email ||
      request.sender_email ||
      request.client_id?.contact_email ||
      request.client_id?.email ||
      '';
    
    // Calculate charges based on weight and rate
    // Convert Decimal128 to number if needed
    const weight = request.weight ? 
      (typeof request.weight === 'object' && request.weight.$numberDecimal ? 
        parseFloat(request.weight.$numberDecimal) : 
        parseFloat(request.weight.toString())) : 0;
    const serviceCode = getRequestServiceCode(request);
    const isPhToUae = isPhToUaeService(serviceCode);
    const isUaeToPh = isUaeToPhService(serviceCode);
    const mode = options.mode || 'normal';
    const providedBatchNumber = options.batchNumber;
    const isTaxMode = mode === 'tax';
    const rate = 31.00; // Default rate, you might want to make this configurable
    const shippingCharge = weight * rate;
    let numberOfBoxes = request.verification?.number_of_boxes || request.shipment?.number_of_boxes || request.number_of_boxes || 1;
    numberOfBoxes = parseInt(numberOfBoxes, 10);
    if (!Number.isFinite(numberOfBoxes) || numberOfBoxes < 1) numberOfBoxes = 1;
    let deliveryCharge = 0;
    if (hasDelivery) {
      if (isUaeToPh && typeof options.manualDeliveryCharge === 'number' && options.manualDeliveryCharge > 0) {
        deliveryCharge = parseFloat(options.manualDeliveryCharge.toFixed(2));
      } else if (!isUaeToPh) {
        deliveryCharge = weight > 30 ? 0 : (numberOfBoxes <= 1 ? 20 : 20 + ((numberOfBoxes - 1) * 5));
      }
    }
    const subtotal = shippingCharge + deliveryCharge;
    const fallbackTaxRate = isPhToUae ? 5 : 0;
    const effectiveTaxRate = typeof taxRateOverride === 'number' ? taxRateOverride : fallbackTaxRate;
    const taxRateForDelivery = deliveryCharge > 0 ? effectiveTaxRate : 0;
    const taxAmount = deliveryCharge > 0 && taxRateForDelivery > 0 ? (deliveryCharge * taxRateForDelivery) / 100 : 0;
    const total = subtotal + taxAmount;

    const shouldShowDeliveryOnly = isTaxMode && isPhToUae;
    const displayShippingCharge = shouldShowDeliveryOnly ? 0 : shippingCharge;
    const displaySubtotal = shouldShowDeliveryOnly ? deliveryCharge : subtotal;
    const displayTaxAmount = shouldShowDeliveryOnly ? (deliveryCharge > 0 ? (deliveryCharge * taxRateForDelivery) / 100 : 0) : taxAmount;
    const displayTotal = shouldShowDeliveryOnly ? deliveryCharge + displayTaxAmount : total;
    
    return {
      invoiceNumber,
      awbNumber,
      batchNumber: providedBatchNumber || request.batch_number || request.request_id?.batch_number || '',
      trackingNumber,
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      receiverInfo: {
        name: request.receiver_name?.toUpperCase() || 'N/A',
        address: `${request.destination_place || request.verification?.receiver_address || 'N/A'}`,
        emirate: (() => {
          const destination = request.destination_place || request.verification?.receiver_address || '';
          const parts = destination.split(',').map((p: string) => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            return parts[parts.length - 2];
          }
          if (parts.length === 1) return parts[0];
          return 'N/A';
        })(),
        mobile: request.receiver_phone || request.verification?.receiver_phone || request.customer_phone || '+971XXXXXXXXX'
      },
      senderInfo: {
        name: senderName,
        address: senderAddress,
        email: senderEmail || undefined,
        phone: senderPhone
      },
      shipmentDetails: {
        numberOfBoxes: numberOfBoxes,
        weight: weight,
        weightType: request.verification?.weight_type || 'ACTUAL',
        rate: rate
      },
      charges: {
        shippingCharge: displayShippingCharge,
        deliveryCharge: deliveryCharge,
        subtotal: displaySubtotal,
        taxRate: taxRateForDelivery,
        taxAmount: displayTaxAmount,
        total: displayTotal
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
      lineItems: [
        {
          description: `Shipping - ${request.verification?.weight_type || 'ACTUAL'} weight`,
          quantity: 1,
          unitPrice: shippingCharge,
          total: shippingCharge
        },
        ...(deliveryCharge > 0 ? [{
          description: 'Delivery Charge',
          quantity: isUaeToPh ? 1 : numberOfBoxes,
          unitPrice: isUaeToPh ? deliveryCharge : parseFloat((deliveryCharge / numberOfBoxes).toFixed(2)),
          total: deliveryCharge
        }] : [])
      ],
      baseAmount: shippingCharge, // Base shipping amount (for invoice.amount field)
      totalAmount: shouldShowDeliveryOnly ? displayTotal : total, // Total amount with tax (for display)
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
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center space-y-2 py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No invoice requests right now</p>
              {userProfile.department.name === 'Sales' && (
                <p className="text-sm text-muted-foreground">
                  Create your first invoice request using the button above
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const shortId =
                  request.invoice_number ||
                  request.tracking_code ||
                  (request._id ? request._id.slice(-8) : 'REQUEST');
                const weightDisplay =
                  formatWeightValue(request.weight) ||
                  formatWeightValue(request.weight_kg) ||
                  formatWeightValue(request.verification?.actual_weight);
                const routeFrom = request.origin_place || 'Not set';
                const routeTo = request.destination_place || 'Not set';
                const createdLabel = formatDateLabel(request.createdAt);
                const totalBoxes =
                  request.verification?.number_of_boxes ||
                  request.number_of_boxes ||
                  request.verification?.boxes?.length;
                const actions = renderActionControls(request);

                return (
                  <div
                    key={request._id}
                    className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary/40"
                  >
                    <div className="flex flex-col gap-3 border-b border-dashed pb-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs uppercase">
                          {shortId}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Created {createdLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getStatusBadgeColor(request.status)}>
                          {request.status}
                        </Badge>
                        <Badge className={getDeliveryStatusBadgeColor(request.delivery_status)}>
                          {request.delivery_status}
                        </Badge>
                        {request.has_delivery && (
                          <Badge variant="secondary">Delivery</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 pt-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
                        <p className="font-semibold text-foreground">{request.customer_name}</p>
                        {request.customer_phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{request.customer_phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Receiver</p>
                        <p className="font-semibold text-foreground">{request.receiver_name}</p>
                        {request.receiver_company && (
                          <p className="text-sm text-muted-foreground">{request.receiver_company}</p>
                        )}
                        {request.receiver_phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{request.receiver_phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Route</p>
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start gap-1 font-medium text-foreground">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 text-primary" />
                              <span className="break-words">{routeFrom}</span>
                            </div>
                            <p className="text-xs uppercase tracking-wide opacity-80">Origin</p>
                          </div>
                          <ArrowRight className="mt-1 h-4 w-4 text-primary" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start gap-1 font-medium text-foreground">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 text-orange-500" />
                              <span className="break-words">{routeTo}</span>
                            </div>
                            <p className="text-xs uppercase tracking-wide opacity-80">Destination</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Shipment</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {request.shipment_type === 'DOCUMENT' ? 'Document' : 'Non-Document'}
                          </Badge>
                          {request.is_leviable && <Badge variant="secondary">Taxable</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Weight:{' '}
                          {weightDisplay ? (
                            <span className="font-semibold text-foreground">{weightDisplay} kg</span>
                          ) : (
                            'Not set'
                          )}
                        </p>
                        {totalBoxes && (
                          <p className="text-sm text-muted-foreground">
                            Boxes:{' '}
                            <span className="font-semibold text-foreground">{totalBoxes}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {userProfile.department.name === 'Operations' && request.status === 'IN_PROGRESS' && (
                      <div className="mt-4 rounded-lg border border-dashed border-orange-200 bg-orange-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-orange-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Complete the 6-point verification before sending to Finance</span>
                        </div>
                        <div className="mt-3">
                          <VerificationForm
                            request={request}
                            onVerificationComplete={fetchInvoiceRequests}
                            currentUser={userProfile}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Service:</span>
                        <Badge variant="outline">{formatServiceCode(request.service_code)}</Badge>
                        {request.has_delivery && <Badge variant="secondary">Delivery Required</Badge>}
                        {request.is_leviable && <Badge variant="outline">VAT applicable</Badge>}
                      </div>
                      {actions ? (
                        <div className="flex flex-wrap gap-2">{actions}</div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No actions available</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Input Dialog */}
      {showTaxInputDialog && selectedRequestForInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Invoice Generation</h2>
            <p className="text-gray-600 mb-4">
              Confirm whether delivery is required. VAT will be calculated automatically based on the service route.
            </p>

            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasDelivery}
                  onChange={(e) => handleDeliveryToggle(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Delivery Required
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                {hasDelivery 
                  ? "Delivery charge will be calculated based on weight and number of boxes (FREE if weight > 30kg, otherwise 20 AED + 5 AED per additional box)"
                  : "No delivery charge will be applied"}
              </p>
            </div>

            <div className="mb-4">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Customer TRN (optional)
              </Label>
              <Input
                value={customerTRN}
                onChange={(e) => setCustomerTRN(e.target.value.trim())}
                placeholder="Enter customer's TRN"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                If provided, this TRN will be stored on the generated invoice.
              </p>
            </div>

            <div className="mb-4">
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Number (required)
              </Label>
              <Input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value.trim())}
                placeholder="Enter batch number"
                required
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                This value is mandatory and appears beneath the invoice number on previews/PDFs.
              </p>
            </div>

            {isUaeToPhSelected && (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                UAE → PH shipments always use 0% VAT. Delivery charges must be entered manually when required.
              </div>
            )}

            {isUaeToPhSelected && hasDelivery && (
              <div className="mb-4">
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Charge (AED) *
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customDeliveryCharge}
                  onChange={(e) => setCustomDeliveryCharge(e.target.value)}
                  placeholder="Enter delivery charge amount"
                  className="w-full"
                />
                <p className="text-xs text-amber-600 mt-1">
                  Required when delivery is enabled for UAE → PH. Leave blank to exclude the charge.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTaxInputDialog(false);
                  setSelectedRequestForInvoice(null);
                  setHasDelivery(false); // Reset delivery flag
                  setCustomerTRN('');
                  setBatchNumber('');
                  setCustomDeliveryCharge('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateInvoices}
                className="bg-green-600 hover:bg-green-700"
                disabled={generateDisabled}
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
                  Tax Invoice ({selectedRequestTaxRate}% VAT)
                </button>
              </div>
              
              {!showTaxInvoice ? (
                <InvoiceTemplate
                  data={convertRequestToInvoiceData(selectedRequestForInvoice, 0, qrCodeData, {
                    batchNumber,
                    manualDeliveryCharge:
                      manualChargeForPreview && manualChargeForPreview > 0 ? manualChargeForPreview : undefined,
                  })}
                />
              ) : (
                <TaxInvoiceTemplate
                  data={convertRequestToInvoiceData(selectedRequestForInvoice, selectedRequestTaxRate, qrCodeData, {
                    mode: 'tax',
                    batchNumber,
                    manualDeliveryCharge:
                      manualChargeForPreview && manualChargeForPreview > 0 ? manualChargeForPreview : undefined,
                  })}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
