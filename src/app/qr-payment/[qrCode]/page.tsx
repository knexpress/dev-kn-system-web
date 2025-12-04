'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, XCircle, User, CreditCard, Banknote, Smartphone, ArrowLeft, ArrowRight, Package } from 'lucide-react';

interface DeliveryAssignment {
  _id: string;
  assignment_id: string;
  request_id?: {
    request_id?: string;
    customer?: {
      name?: string;
      company?: string;
    };
    receiver?: {
      name?: string;
      address?: string;
      city?: string;
      country?: string;
    };
  };
  driver_id?: {
    name?: string;
    phone?: string;
    vehicle_type?: string;
    vehicle_number?: string;
  };
  invoice_id?: {
    invoice_id?: string;
    total_amount?: string;
  };
  client_id?: {
    company_name?: string;
    contact_name?: string;
  };
  amount: string | number;
  delivery_type: string;
  status: string;
  delivery_address: string;
  delivery_instructions?: string;
  qr_code: string;
  qr_url: string;
  qr_expires_at: string;
  qr_used: boolean;
  payment_collected: boolean;
  payment_method?: string;
  payment_reference?: string;
  payment_notes?: string;
  receiver_name?: string;
  receiver_address?: string;
  receiver_phone?: string;
}

export default function QRPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const qrCode = params?.qrCode as string;

  const [assignment, setAssignment] = useState<DeliveryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // Step-based flow states
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Driver info, 2: Status, 3: Payment method, 4: Payment details
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [deliveryStatus, setDeliveryStatus] = useState<'DELIVERED' | 'NOT_DELIVERED' | ''>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [savingDriverInfo, setSavingDriverInfo] = useState(false);

  // Helper functions
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount) || !isFinite(numAmount)) {
      return 'AED 0.00';
    }
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
    }).format(numAmount);
  };

  const normalizeAssignmentStatus = (status?: string) => status === 'DELIVERED' ? 'DELIVERED' : 'NOT_DELIVERED';

  useEffect(() => {
    if (!qrCode) {
      setError('QR code is required');
      setLoading(false);
      return;
    }
    
    console.log('🔍 Fetching assignment for QR code:', qrCode);
    fetchAssignment();
  }, [qrCode]);

  const fetchAssignment = async () => {
    if (!qrCode) {
      setError('QR code is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('📡 Calling API with QR code:', qrCode);
      const result = await apiClient.getDeliveryAssignmentByQR(qrCode);
      console.log('📦 API result:', result);
      
      if (result.success && result.data) {
        setAssignment(result.data);
        
        // Pre-fill driver information if it already exists
        if (result.data.driver_id) {
          const driverName = result.data.driver_id.name || '';
          const driverPhone = result.data.driver_id.phone || '';
          
          if (driverName && driverPhone) {
            setDriverName(driverName);
            setDriverPhone(driverPhone);
            // If driver info exists, skip to step 2
            setCurrentStep(2);
          }
        }
      } else {
        console.error('❌ Assignment not found:', result.error);
        setError(result.error || 'Assignment not found. Please check the QR code.');
      }
    } catch (error: any) {
      console.error('❌ Error fetching assignment:', error);
      setError(error.message || 'Failed to load assignment details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save driver info and proceed to next step
  const handleDriverInfoSubmit = async () => {
    if (!driverName.trim() || !driverPhone.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter both name and phone number'
      });
      return;
    }

    try {
      setSavingDriverInfo(true);
      
      // Save driver info to assignment
      const result = await apiClient.updateDeliveryAssignmentByQR(qrCode, { 
        driver_name: driverName.trim(),
        driver_phone: driverPhone.trim(),
        status: normalizeAssignmentStatus(assignment?.status)
      });
      
      if (result.success) {
        setAssignment(prev => prev ? {
          ...prev,
          driver_id: {
            ...prev.driver_id,
            name: driverName.trim(),
            phone: driverPhone.trim()
          }
        } : null);
        
        // Proceed to status selection step
        setCurrentStep(2);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to save driver information'
        });
      }
    } catch (error) {
      console.error('Error saving driver info:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save driver information'
      });
    } finally {
      setSavingDriverInfo(false);
    }
  };

  // Handle status selection
  const handleStatusSelect = async (status: 'DELIVERED' | 'NOT_DELIVERED') => {
    try {
      setProcessing(true);
      
      const result = await apiClient.updateDeliveryAssignmentByQR(qrCode, { 
        status: status,
        driver_name: driverName,
        driver_phone: driverPhone,
        ...(status === 'DELIVERED' && { delivery_date: new Date() })
      });
      
      if (result.success) {
        setDeliveryStatus(status);
        setAssignment(prev => prev ? {
          ...prev,
          status: status
        } : null);
        
        if (status === 'DELIVERED') {
          // Proceed to payment method selection
          setCurrentStep(3);
        } else {
          // If not delivered, just show success and redirect
          toast({
            title: 'Status Updated',
            description: 'Delivery status updated to Not Delivered'
          });
          setTimeout(() => {
            router.push('/dashboard/delivery-assignments');
          }, 2000);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update status'
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update status'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method);
    
    if (method === 'ALREADY_PAID') {
      // If already paid, process immediately
      handleAlreadyPaid();
    } else {
      // Proceed to payment details step
      setCurrentStep(4);
    }
  };

  // Handle already paid in advance
  const handleAlreadyPaid = async () => {
    try {
      setProcessing(true);
      
      const paymentData = {
        payment_method: 'ALREADY_PAID',
        payment_reference: 'PAID_IN_ADVANCE',
        payment_notes: 'Payment received in advance'
      };

      const result = await apiClient.processQRPayment(qrCode, paymentData);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Payment confirmed as already paid in advance!'
        });
        
        setAssignment(prev => prev ? {
          ...prev,
          payment_collected: true,
          payment_method: 'ALREADY_PAID',
          status: 'DELIVERED',
          qr_used: true
        } : null);
        
        setTimeout(() => {
          router.push('/dashboard/delivery-assignments');
        }, 2000);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to process payment'
        });
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process payment'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle final payment submission
  const handlePayment = async () => {
    if (!paymentMethod) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a payment method'
      });
      return;
    }

    // Validate amount for cash and card
    if ((paymentMethod === 'CASH' || paymentMethod === 'CARD') && !paymentAmount.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter the payment amount'
      });
      return;
    }

    // Validate reference for bank transfer
    if (paymentMethod === 'BANK_TRANSFER' && !paymentReference.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter transaction ID or reference code'
      });
      return;
    }

    try {
      setProcessing(true);
      
      const paymentData = {
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim(),
        payment_notes: paymentNotes.trim() || (paymentMethod === 'CASH' || paymentMethod === 'CARD' ? `Amount: ${paymentAmount}` : '')
      };

      const result = await apiClient.processQRPayment(qrCode, paymentData);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Payment processed successfully!'
        });
        
        setAssignment(prev => prev ? {
          ...prev,
          payment_collected: true,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_notes: paymentNotes,
          status: 'DELIVERED',
          qr_used: true
        } : null);
        
        setTimeout(() => {
          router.push('/dashboard/delivery-assignments');
        }, 2000);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to process payment'
        });
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to process payment'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Invalid QR Code</h2>
              <p className="text-gray-600 mb-6">
                {error || 'This QR code is invalid or has expired.'}
              </p>
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (assignment.qr_used || assignment.payment_collected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Payment Already Processed</h2>
              <p className="text-gray-600 mb-6">
                This payment has already been collected.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payment Method:</span>
                  <span className="text-sm font-medium">{assignment.payment_method}</span>
                </div>
                {assignment.payment_reference && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reference:</span>
                    <span className="text-sm font-medium font-mono">{assignment.payment_reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(assignment.amount)}</span>
                </div>
              </div>
              <Button onClick={() => router.push('/dashboard')} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get customer and receiver info
  const customerName = assignment.request_id?.customer?.name || 
                       assignment.client_id?.company_name || 
                       assignment.client_id?.contact_name || 
                       'N/A';
  const receiverAddress = assignment.receiver_address || 
                          assignment.request_id?.receiver?.address || 
                          assignment.delivery_address || 
                          'N/A';

  // Render step-based interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Collection</h1>
            <p className="text-gray-600">Assignment ID: {assignment.assignment_id}</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-white text-gray-400 border-gray-300'
                }`}>
                  {currentStep > step ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold">{step}</span>
                  )}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-0.5 ${
                    currentStep > step ? 'bg-primary' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2 text-xs text-gray-600">
            <span className={currentStep === 1 ? 'font-semibold' : ''}>Driver Info</span>
            <span className="mx-2">•</span>
            <span className={currentStep === 2 ? 'font-semibold' : ''}>Status</span>
            <span className="mx-2">•</span>
            <span className={currentStep === 3 ? 'font-semibold' : ''}>Payment Method</span>
            <span className="mx-2">•</span>
            <span className={currentStep === 4 ? 'font-semibold' : ''}>Details</span>
          </div>
        </div>

        {/* Step 1: Driver Information */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="h-5 w-5" />
                Step 1: Driver Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="driverName" className="text-base font-semibold">
                  Driver Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="driverName"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-2"
                  required
                  disabled={!!(assignment?.driver_id?.name && assignment?.driver_id?.phone)}
                />
              </div>
              <div>
                <Label htmlFor="driverPhone" className="text-base font-semibold">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="driverPhone"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="mt-2"
                  required
                  disabled={!!(assignment?.driver_id?.name && assignment?.driver_id?.phone)}
                />
              </div>
              <Button
                onClick={handleDriverInfoSubmit}
                disabled={savingDriverInfo || !driverName.trim() || !driverPhone.trim() || !!(assignment?.driver_id?.name && assignment?.driver_id?.phone)}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {savingDriverInfo ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Delivery Status */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Package className="h-5 w-5" />
                Step 2: Delivery Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Customer:</strong> {customerName}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  <strong>Delivery Address:</strong> {receiverAddress}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  <strong>Amount Due:</strong> {formatCurrency(assignment.amount)}
                </p>
              </div>
              
              <div className="space-y-3">
                <Button
                  onClick={() => handleStatusSelect('DELIVERED')}
                  disabled={processing}
                  variant="outline"
                  className="w-full h-auto py-4 border-green-300 text-green-700 hover:bg-green-50"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold text-lg">Delivered</div>
                    <div className="text-sm text-gray-600">Package successfully delivered to customer</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleStatusSelect('NOT_DELIVERED')}
                  disabled={processing}
                  variant="outline"
                  className="w-full h-auto py-4 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="mr-2 h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold text-lg">Not Delivered</div>
                    <div className="text-sm text-gray-600">Mark as failed or pending delivery</div>
                  </div>
                </Button>
              </div>
              
              {processing && (
                <div className="flex items-center justify-center mt-4">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Updating status...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Payment Method Selection */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Step 3: Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg text-center border-2 border-primary/20 mb-6">
                <Label className="text-sm text-gray-600 mb-2 block">Amount Due</Label>
                <p className="text-4xl font-bold text-primary">{formatCurrency(assignment.amount)}</p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => handlePaymentMethodSelect('CASH')}
                  variant="outline"
                  className="w-full h-auto py-4 border-2 hover:bg-green-50"
                >
                  <Banknote className="mr-3 h-6 w-6 text-green-600" />
                  <span className="font-semibold text-lg">Cash</span>
                </Button>
                
                <Button
                  onClick={() => handlePaymentMethodSelect('CARD')}
                  variant="outline"
                  className="w-full h-auto py-4 border-2 hover:bg-blue-50"
                >
                  <Smartphone className="mr-3 h-6 w-6 text-blue-600" />
                  <span className="font-semibold text-lg">Card Payment</span>
                </Button>
                
                <Button
                  onClick={() => handlePaymentMethodSelect('BANK_TRANSFER')}
                  variant="outline"
                  className="w-full h-auto py-4 border-2 hover:bg-purple-50"
                >
                  <CreditCard className="mr-3 h-6 w-6 text-purple-600" />
                  <span className="font-semibold text-lg">Online Payment / Bank Transfer</span>
                </Button>
                
                <Button
                  onClick={() => handlePaymentMethodSelect('CHEQUE')}
                  variant="outline"
                  className="w-full h-auto py-4 border-2 hover:bg-orange-50"
                >
                  <CreditCard className="mr-3 h-6 w-6 text-orange-600" />
                  <span className="font-semibold text-lg">Cheque</span>
                </Button>
                
                <Button
                  onClick={() => handlePaymentMethodSelect('ALREADY_PAID')}
                  variant="outline"
                  className="w-full h-auto py-4 border-2 border-green-500 hover:bg-green-50"
                >
                  <CheckCircle className="mr-3 h-6 w-6 text-green-600" />
                  <span className="font-semibold text-lg">Already Paid in Advance</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Payment Details */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Step 4: Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Payment Method:</span>
                  <span className="font-semibold">{paymentMethod.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Amount Due:</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(assignment.amount)}</span>
                </div>
              </div>

              {/* Cash: Ask for amount */}
              {paymentMethod === 'CASH' && (
                <div>
                  <Label htmlFor="paymentAmount" className="text-base font-semibold">
                    Amount Received <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter the amount received"
                    className="mt-2"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the exact amount received in cash</p>
                </div>
              )}

              {/* Card Payment: Ask for amount */}
              {paymentMethod === 'CARD' && (
                <div>
                  <Label htmlFor="paymentAmount" className="text-base font-semibold">
                    Amount Received <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter the amount received"
                    className="mt-2"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the amount processed via card</p>
                </div>
              )}

              {/* Bank Transfer: Ask for transaction ID/reference */}
              {paymentMethod === 'BANK_TRANSFER' && (
                <div>
                  <Label htmlFor="paymentReference" className="text-base font-semibold">
                    Transaction ID / Reference Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="paymentReference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Enter transaction ID, reference code, or proof of payment"
                    className="mt-2"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">This will be used by Finance to verify the transaction</p>
                </div>
              )}

              {/* Cheque: No additional fields needed */}
              {paymentMethod === 'CHEQUE' && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    No additional information required for cheque payment. Proceed to confirm.
                  </p>
                </div>
              )}

              {/* Optional Notes for all methods except cheque */}
              {paymentMethod !== 'CHEQUE' && paymentMethod !== 'ALREADY_PAID' && (
                <div>
                  <Label htmlFor="paymentNotes" className="text-base font-semibold">Additional Notes (Optional)</Label>
                  <Textarea
                    id="paymentNotes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Any additional notes about the payment"
                    className="mt-2"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => setCurrentStep(3)}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={processing || 
                    (paymentMethod === 'CASH' && !paymentAmount.trim()) ||
                    (paymentMethod === 'CARD' && !paymentAmount.trim()) ||
                    (paymentMethod === 'BANK_TRANSFER' && !paymentReference.trim())
                  }
                  className="flex-1 h-12 text-lg font-semibold"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-gray-500">
                By confirming, you acknowledge that payment has been received
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
