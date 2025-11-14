'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, XCircle, Clock, MapPin, User, CreditCard, Banknote, Smartphone, ArrowLeft } from 'lucide-react';

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
  
  // Driver mode states
  const [isDriverMode, setIsDriverMode] = useState(false);
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingDriverInfo, setSavingDriverInfo] = useState(false);

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
          
          if (driverName || driverPhone) {
            setDriverName(driverName);
            setDriverPhone(driverPhone);
            setIsDriverMode(true); // Auto-enable driver mode if info exists
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

  const handlePayment = async () => {
    if (!paymentMethod) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a payment method'
      });
      return;
    }

    try {
      setProcessing(true);
      
      const paymentData = {
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_notes: paymentNotes
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

  // Auto-save driver information when both fields are filled (only if not already saved)
  useEffect(() => {
    // Don't auto-save if driver info already exists
    const driverInfoExists = assignment?.driver_id?.name && assignment?.driver_id?.phone;
    
    if (isDriverMode && driverName && driverPhone && assignment && qrCode && !driverInfoExists) {
      const saveDriverInfo = async () => {
        try {
          setSavingDriverInfo(true);
          
          const result = await apiClient.updateDeliveryAssignmentByQR(qrCode, { 
            driver_name: driverName,
            driver_phone: driverPhone,
            status: normalizeAssignmentStatus(assignment.status)
          });
          
          if (result.success) {
            // Update local state with driver info
            setAssignment(prev => prev ? {
              ...prev,
              driver_id: {
                ...prev.driver_id,
                name: driverName,
                phone: driverPhone
              }
            } : null);
          }
        } catch (error) {
          console.error('Error saving driver info:', error);
        } finally {
          setSavingDriverInfo(false);
        }
      };

      // Debounce the save to avoid too many API calls
      const timeoutId = setTimeout(saveDriverInfo, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [driverName, driverPhone, isDriverMode, assignment, qrCode]);

  const handleDriverStatusUpdate = async (newStatus: 'DELIVERED' | 'NOT_DELIVERED') => {
    if (!assignment) return;

    // Validate driver information is required
    if (!driverName || !driverPhone) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter your name and phone number before updating status'
      });
      return;
    }

    try {
      setUpdatingStatus(true);
      
      // Update assignment with driver information and status using QR code route (no auth required)
      const result = await apiClient.updateDeliveryAssignmentByQR(qrCode, { 
        status: newStatus,
        driver_name: driverName,
        driver_phone: driverPhone,
        ...(newStatus === 'DELIVERED' && { delivery_date: new Date() })
      });
      
      if (result.success) {
        toast({
          title: 'Success',
          description: `Status updated to ${newStatus.replace('_', ' ')}`
        });
        
        // Update local state with driver info
        setAssignment(prev => prev ? {
          ...prev,
          status: newStatus,
          driver_id: {
            ...prev.driver_id,
            name: driverName,
            phone: driverPhone
          },
          ...(newStatus === 'DELIVERED' && { delivery_date: new Date().toISOString() }),
          ...(newStatus !== 'DELIVERED' && { delivery_date: undefined })
        } : null);
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
      setUpdatingStatus(false);
    }
  };

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

  const getStatusColor = (status: string) => {
    return status === 'DELIVERED' ? 'bg-green-500' : 'bg-red-500';
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
  const receiverName = assignment.receiver_name || 
                       assignment.request_id?.receiver?.name || 
                       'N/A';
  const receiverAddress = assignment.receiver_address || 
                          assignment.request_id?.receiver?.address || 
                          assignment.delivery_address || 
                          'N/A';
  const receiverPhone = assignment.receiver_phone || 
                        assignment.request_id?.receiver?.phone || 
                        'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
            <p className="text-gray-600">Scan QR code to collect payment for delivery</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Assignment Info */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Assignment Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-500">Assignment ID</Label>
                  <p className="font-mono text-sm font-medium">{assignment.assignment_id}</p>
                </div>
                
                <Separator />

                <div>
                  <Label className="text-xs text-gray-500">Customer</Label>
                  <p className="font-medium">{customerName}</p>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Delivery Address
                  </Label>
                  <p className="text-sm text-gray-700 mt-1">{receiverName}</p>
                  <p className="text-xs text-gray-600">{receiverAddress}</p>
                  <p className="text-xs text-gray-500 mt-1">{receiverPhone}</p>
                </div>

                {assignment.driver_id && (
                  <div>
                    <Label className="text-xs text-gray-500 flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Driver
                    </Label>
                    <p className="text-sm font-medium">{assignment.driver_id.name}</p>
                    <p className="text-xs text-gray-600">{assignment.driver_id.phone}</p>
                  </div>
                )}

                <Separator />

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires
                  </span>
                  <span>{new Date(assignment.qr_expires_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Driver Section */}
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Driver Information & Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {!isDriverMode ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Are you the delivery driver? Update your information and delivery status.
                    </p>
                    <Button
                      onClick={() => setIsDriverMode(true)}
                      variant="outline"
                      className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      Enter Driver Mode
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Check if driver info already exists */}
                    {assignment?.driver_id?.name && assignment?.driver_id?.phone ? (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700 font-medium mb-2">✓ Driver Information Saved</p>
                        <p className="text-xs text-green-600">Your information has been saved and cannot be changed.</p>
                      </div>
                    ) : (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700 font-medium mb-2">⚠️ Required Information</p>
                        <p className="text-xs text-blue-600">Please enter your name and phone number to update delivery status</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="driverName" className="text-sm font-medium">
                          Driver Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="driverName"
                          value={driverName}
                          onChange={(e) => {
                            // Don't allow changes if driver info already exists
                            if (!(assignment?.driver_id?.name && assignment?.driver_id?.phone)) {
                              setDriverName(e.target.value);
                            }
                          }}
                          placeholder="Enter your name"
                          className="mt-1"
                          required
                          disabled={!!(assignment?.driver_id?.name && assignment?.driver_id?.phone)}
                          readOnly={!!(assignment?.driver_id?.name && assignment?.driver_id?.phone)}
                        />
                        {!driverName && !(assignment?.driver_id?.name && assignment?.driver_id?.phone) && (
                          <p className="text-xs text-red-500 mt-1">Name is required</p>
                        )}
                        {assignment?.driver_id?.name && assignment?.driver_id?.phone && (
                          <p className="text-xs text-gray-500 mt-1">This information is locked and cannot be changed</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="driverPhone" className="text-sm font-medium">
                          Phone Number <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="driverPhone"
                            value={driverPhone}
                            onChange={(e) => {
                              // Don't allow changes if driver info already exists
                              if (!(assignment?.driver_id?.name && assignment?.driver_id?.phone)) {
                                setDriverPhone(e.target.value);
                              }
                            }}
                            placeholder="Enter your phone"
                            className="mt-1"
                            required
                            disabled={!!(assignment?.driver_id?.name && assignment?.driver_id?.phone)}
                            readOnly={!!(assignment?.driver_id?.name && assignment?.driver_id?.phone)}
                          />
                          {savingDriverInfo && driverName && driverPhone && !(assignment?.driver_id?.name && assignment?.driver_id?.phone) && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                            </div>
                          )}
                          {!savingDriverInfo && driverName && driverPhone && !(assignment?.driver_id?.name && assignment?.driver_id?.phone) && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            </div>
                          )}
                          {assignment?.driver_id?.name && assignment?.driver_id?.phone && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            </div>
                          )}
                        </div>
                        {!driverPhone && !(assignment?.driver_id?.name && assignment?.driver_id?.phone) && (
                          <p className="text-xs text-red-500 mt-1">Phone number is required</p>
                        )}
                        {driverName && driverPhone && !savingDriverInfo && !(assignment?.driver_id?.name && assignment?.driver_id?.phone) && (
                          <p className="text-xs text-green-600 mt-1">✓ Information saved</p>
                        )}
                        {assignment?.driver_id?.name && assignment?.driver_id?.phone && (
                          <p className="text-xs text-gray-500 mt-1">This information is locked and cannot be changed</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-sm font-semibold mb-3 block">Update Delivery Status</Label>
                      {(!driverName || !driverPhone) && !(assignment?.driver_id?.name && assignment?.driver_id?.phone) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                          <p className="text-xs text-yellow-700">
                            ⚠️ Please enter your name and phone number above before updating status
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          onClick={() => handleDriverStatusUpdate('NOT_DELIVERED')}
                          disabled={updatingStatus || (!driverName || !driverPhone) || normalizeAssignmentStatus(assignment.status) === 'NOT_DELIVERED'}
                          variant="outline"
                          size="sm"
                          className="h-auto py-3 w-full border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          <div className="text-left">
                            <div className="font-medium">Not Delivered</div>
                            <div className="text-xs text-gray-500">Marked as failed / pending</div>
                          </div>
                        </Button>
                        <Button
                          onClick={() => handleDriverStatusUpdate('DELIVERED')}
                          disabled={updatingStatus || (!driverName || !driverPhone) || normalizeAssignmentStatus(assignment.status) === 'DELIVERED'}
                          variant="outline"
                          size="sm"
                          className="h-auto py-3 w-full border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          <div className="text-left">
                            <div className="font-medium">Delivered</div>
                            <div className="text-xs text-gray-500">Package delivered to customer</div>
                          </div>
                        </Button>
                      </div>
                      {updatingStatus && (
                        <div className="flex items-center justify-center mt-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-gray-600">Updating status...</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <Button
                      variant="ghost"
                      onClick={() => setIsDriverMode(false)}
                      className="w-full"
                      size="sm"
                    >
                      Exit Driver Mode
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment Form */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-primary/20">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <CreditCard className="h-6 w-6" />
                    Collect Payment
                  </CardTitle>
                  <Badge className={`${getStatusColor(normalizeAssignmentStatus(assignment.status))} text-white text-sm px-3 py-1`}>
                    {normalizeAssignmentStatus(assignment.status) === 'DELIVERED' ? 'Delivered' : 'Not Delivered'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Amount Display */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg text-center border-2 border-primary/20">
                  <Label className="text-sm text-gray-600 mb-2 block">Amount Due</Label>
                  <p className="text-4xl font-bold text-primary">{formatCurrency(assignment.amount)}</p>
                </div>

                {/* Payment Method */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Payment Method *</Label>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="CASH" id="cash" />
                      <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Banknote className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Cash</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="CARD" id="card" />
                      <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Smartphone className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Card Payment</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="BANK_TRANSFER" id="bank" />
                      <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer flex-1">
                        <CreditCard className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">Bank Transfer</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value="CHEQUE" id="cheque" />
                      <Label htmlFor="cheque" className="flex items-center gap-2 cursor-pointer flex-1">
                        <CreditCard className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">Cheque</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Payment Reference */}
                <div>
                  <Label htmlFor="reference" className="text-base font-semibold">Payment Reference</Label>
                  <Input
                    id="reference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction ID, receipt number, etc. (optional)"
                    className="mt-2"
                  />
                </div>

                {/* Payment Notes */}
                <div>
                  <Label htmlFor="notes" className="text-base font-semibold">Notes</Label>
                  <Textarea
                    id="notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Additional notes about the payment (optional)"
                    className="mt-2"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handlePayment}
                  disabled={processing || !paymentMethod}
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Confirm Payment - {formatCurrency(assignment.amount)}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-gray-500">
                  By confirming, you acknowledge that payment has been received
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
