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
import { Loader2, CheckCircle, XCircle, Clock, MapPin, Package, User, CreditCard, Banknote, Smartphone, Truck } from 'lucide-react';

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
  // New fields from CSV/invoice
  receiver_name?: string;
  receiver_address?: string;
  receiver_phone?: string;
}

export default function QRPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const qrCode = params.qrCode as string;

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

  useEffect(() => {
    if (qrCode) {
      fetchAssignment();
    }
  }, [qrCode]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      setError('');
      
      const result = await apiClient.getDeliveryAssignmentByQR(qrCode);
      
      if (result.success && result.data) {
        setAssignment(result.data);
      } else {
        setError(result.error || 'Assignment not found');
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      setError('Failed to load assignment details');
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
        
        // Update local state
        setAssignment(prev => prev ? {
          ...prev,
          payment_collected: true,
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_notes: paymentNotes,
          status: 'DELIVERED',
          qr_used: true
        } : null);
        
        // Redirect after 3 seconds
        setTimeout(() => {
          router.push('/dashboard/delivery-assignments');
        }, 3000);
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

  const handleDriverStatusUpdate = async (newStatus: string) => {
    if (!assignment) return;

    try {
      setUpdatingStatus(true);
      
      const result = await apiClient.updateDeliveryAssignment(assignment._id, { 
        status: newStatus,
        ...(newStatus === 'PICKED_UP' && { pickup_date: new Date() }),
        ...(newStatus === 'DELIVERED' && { delivery_date: new Date() })
      });
      
      if (result.success) {
        toast({
          title: 'Success',
          description: `Status updated to ${newStatus}`
        });
        
        // Update local state
        setAssignment(prev => prev ? {
          ...prev,
          status: newStatus,
          ...(newStatus === 'PICKED_UP' && { pickup_date: new Date().toISOString() }),
          ...(newStatus === 'DELIVERED' && { delivery_date: new Date().toISOString() })
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
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'bg-green-500';
      case 'IN_TRANSIT': return 'bg-blue-500';
      case 'PICKED_UP': return 'bg-yellow-500';
      case 'ASSIGNED': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH': return <Banknote className="h-4 w-4" />;
      case 'BANK_TRANSFER': return <CreditCard className="h-4 w-4" />;
      case 'CARD': return <CreditCard className="h-4 w-4" />;
      case 'CHEQUE': return <CreditCard className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading assignment details...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Assignment Not Found</h2>
              <p className="text-gray-600 mb-4">
                {error || 'This QR code is invalid or has expired.'}
              </p>
              <Button onClick={() => router.push('/dashboard')}>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Payment Already Processed</h2>
              <p className="text-gray-600 mb-4">
                This QR code has already been used for payment processing.
              </p>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Payment Method:</strong> {assignment.payment_method}
                </p>
                {assignment.payment_reference && (
                  <p className="text-sm text-gray-600">
                    <strong>Reference:</strong> {assignment.payment_reference}
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  <strong>Amount:</strong> {formatCurrency(assignment.amount)}
                </p>
              </div>
              <Button onClick={() => router.push('/dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Collection</h1>
          <p className="text-gray-600">Complete the payment for this delivery assignment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Assignment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Assignment ID</Label>
                  <p className="font-mono text-sm">{assignment.assignment_id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Request ID</Label>
                  <p className="font-mono text-sm">{
                    assignment.request_id?.request_id
                      ? assignment.request_id.request_id
                      : typeof assignment.request_id === 'string'
                        ? assignment.request_id
                        : assignment.invoice_id?.invoice_id
                          ? assignment.invoice_id.invoice_id
                          : 'N/A'
                  }</p>
                </div>
              </div>

              <Separator />

              {assignment.request_id && (
                <>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Customer</Label>
                    <p className="font-medium">{assignment.request_id.customer?.name || assignment.client_id?.company_name || 'N/A'}</p>
                    {assignment.request_id.customer?.company && (
                      <p className="text-sm text-gray-600">{assignment.request_id.customer.company}</p>
                    )}
                  </div>

                  {(assignment.request_id?.receiver || assignment.receiver_name) && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Delivery To</Label>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
                        <div>
                          <p className="font-medium">{assignment.receiver_name || assignment.request_id?.receiver?.name}</p>
                          <p className="text-sm text-gray-600">{assignment.receiver_address || assignment.request_id?.receiver?.address || assignment.delivery_address}</p>
                          <p className="text-sm text-gray-600">
                            {assignment.receiver_phone || assignment.request_id?.receiver?.phone || 'N/A'}
                          </p>
                          {assignment.request_id?.receiver?.city && assignment.request_id?.receiver?.country && (
                            <p className="text-sm text-gray-600">
                              {assignment.request_id.receiver.city}, {assignment.request_id.receiver.country}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!assignment.request_id && (
                <>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Customer</Label>
                    <p className="font-medium">{assignment.client_id?.company_name || 'N/A'}</p>
                  </div>
                  {assignment.receiver_name && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Delivery To</Label>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
                        <div>
                          <p className="font-medium">{assignment.receiver_name}</p>
                          <p className="text-sm text-gray-600">{assignment.receiver_address || assignment.delivery_address || 'Address to be confirmed'}</p>
                          <p className="text-sm text-gray-600">{assignment.receiver_phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {!assignment.receiver_name && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Delivery Address</Label>
                      <p className="text-gray-600">{assignment.delivery_address || 'Address to be confirmed'}</p>
                    </div>
                  )}
                </>
              )}

              {assignment.driver_id && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Driver</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium">{assignment.driver_id.name}</p>
                      <p className="text-sm text-gray-600">{assignment.driver_id.phone}</p>
                      <p className="text-sm text-gray-600">
                        {assignment.driver_id.vehicle_type} - {assignment.driver_id.vehicle_number}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!assignment.driver_id && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Driver</Label>
                  <p className="text-gray-400 text-sm">No driver assigned - Anyone can collect payment</p>
                </div>
              )}

              {assignment.delivery_instructions && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Delivery Instructions</Label>
                  <p className="text-sm text-gray-600">{assignment.delivery_instructions}</p>
                </div>
              )}

              <Separator />

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-blue-700">Amount Due</Label>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(assignment.amount)}
                    </p>
                  </div>
                  <Badge className={`${getStatusColor(assignment.status)} text-white`}>
                    {assignment.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>QR Code expires: {new Date(assignment.qr_expires_at).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Collection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium">Payment Method *</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CASH" id="cash" />
                    <Label htmlFor="cash" className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Cash
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BANK_TRANSFER" id="bank" />
                    <Label htmlFor="bank" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Bank Transfer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CARD" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Card Payment
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CHEQUE" id="cheque" />
                    <Label htmlFor="cheque" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Cheque
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="reference">Payment Reference</Label>
                <Input
                  id="reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID, receipt number, etc."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="notes">Payment Notes</Label>
                <Textarea
                  id="notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Additional notes about the payment..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <Button
                onClick={handlePayment}
                disabled={processing || !paymentMethod}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Process Payment - {formatCurrency(assignment.amount)}
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Driver Mode Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Driver Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isDriverMode ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    Are you the delivery driver for this assignment?
                  </p>
                  <Button
                    onClick={() => setIsDriverMode(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    Enter Driver Mode
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="driverName">Driver Name</Label>
                      <Input
                        id="driverName"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="Enter your name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="driverPhone">Phone Number</Label>
                      <Input
                        id="driverPhone"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="Enter your phone"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Update Delivery Status</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Button
                        onClick={() => handleDriverStatusUpdate('PICKED_UP')}
                        disabled={updatingStatus || assignment?.status === 'PICKED_UP' || assignment?.status === 'IN_TRANSIT' || assignment?.status === 'DELIVERED'}
                        variant="outline"
                        size="sm"
                      >
                        <Package className="mr-2 h-4 w-4" />
                        Picked Up
                      </Button>
                      <Button
                        onClick={() => handleDriverStatusUpdate('IN_TRANSIT')}
                        disabled={updatingStatus || assignment?.status === 'IN_TRANSIT' || assignment?.status === 'DELIVERED'}
                        variant="outline"
                        size="sm"
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        In Transit
                      </Button>
                      <Button
                        onClick={() => handleDriverStatusUpdate('DELIVERED')}
                        disabled={updatingStatus || assignment?.status === 'DELIVERED'}
                        variant="outline"
                        size="sm"
                        className="col-span-2"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Delivered
                      </Button>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button
                      variant="outline"
                      onClick={() => setIsDriverMode(false)}
                      className="w-full"
                    >
                      Exit Driver Mode
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
