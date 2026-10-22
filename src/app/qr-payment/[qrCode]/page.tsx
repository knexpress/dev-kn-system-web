'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Banknote,
  Camera,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  Package,
  Truck,
  User,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

type AssignmentStatus = 'DELIVERED' | 'NOT_DELIVERED';

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
      phone?: string;
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
    tax_amount?: number | string;
    tax_rate?: number;
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

type ActionChoice = 'DELIVERED' | 'CANCELLED' | '';
type PaymentChoice = 'CASH' | 'BANK_TRANSFER' | 'TABBY' | '';

export default function QRPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const qrCode = params?.qrCode as string;

  const [assignment, setAssignment] = useState<DeliveryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  // Step flow
  const [currentStep, setCurrentStep] = useState(1);

  // Driver identity
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [savingDriverInfo, setSavingDriverInfo] = useState(false);

  // Action + payment
  const [actionChoice, setActionChoice] = useState<ActionChoice>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentChoice>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [financeAgentName, setFinanceAgentName] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  // Bank transfer proof
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!qrCode) {
      setError('QR code is required');
      setLoading(false);
      return;
    }

    fetchAssignment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrCode]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await apiClient.getDeliveryAssignmentByQR(qrCode);
      if (result.success && result.data) {
        const assignmentData = result.data as DeliveryAssignment;
        setAssignment(assignmentData);

        // Pre-fill if driver info already exists
        if (assignmentData.driver_id?.name || assignmentData.driver_id?.phone) {
          setDriverName(assignmentData.driver_id?.name || '');
          setDriverPhone(assignmentData.driver_id?.phone || '');
          setCurrentStep(2);
        }
      } else {
        setError(result.error || 'Assignment not found. Please check the QR code.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load assignment details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const normalizeAssignmentStatus = (status?: string): AssignmentStatus =>
    status === 'DELIVERED' ? 'DELIVERED' : 'NOT_DELIVERED';

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (Number.isNaN(numAmount) || !Number.isFinite(numAmount)) return 'AED 0.00';
    return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(numAmount);
  };

  const driverInfoSaved = useMemo(
    () => Boolean(assignment?.driver_id?.name && assignment?.driver_id?.phone),
    [assignment],
  );

  const customerName =
    assignment?.request_id?.customer?.name ||
    assignment?.client_id?.company_name ||
    assignment?.client_id?.contact_name ||
    'N/A';
  const receiverName = assignment?.receiver_name || assignment?.request_id?.receiver?.name || 'N/A';
  const receiverAddress =
    assignment?.receiver_address ||
    assignment?.request_id?.receiver?.address ||
    assignment?.delivery_address ||
    'N/A';
  const receiverPhone =
    assignment?.receiver_phone || assignment?.request_id?.receiver?.phone || 'N/A';
  // Only show "Inclusive of tax" if there's actually a tax amount
  const taxAmount = assignment?.invoice_id?.tax_amount;
  const hasTaxAmount = taxAmount !== undefined && taxAmount !== null
    ? (typeof taxAmount === 'string' ? parseFloat(taxAmount) > 0 : taxAmount > 0)
    : false;
  const showInclusiveTaxNote = hasTaxAmount;
  const amountLabel = showInclusiveTaxNote ? 'Total Amount' : 'Amount Due';

  const stepDisabledClass = (step: number) =>
    currentStep < step ? 'opacity-50 pointer-events-none select-none' : '';

  const handleDriverInfoSave = async () => {
    if (!driverName || !driverPhone) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please enter your full name and phone number to continue.',
      });
      return;
    }

    try {
      setSavingDriverInfo(true);
      const result = await apiClient.updateDeliveryAssignmentByQR(qrCode, {
        driver_name: driverName,
        driver_phone: driverPhone,
        status: normalizeAssignmentStatus(assignment?.status),
      });

      if (result.success) {
        setAssignment((prev) =>
          prev
            ? {
                ...prev,
                driver_id: {
                  ...prev.driver_id,
                  name: driverName,
                  phone: driverPhone,
                },
              }
            : prev,
        );
        toast({
          title: 'Driver verified',
          description: 'Details saved. Review the delivery before completing.',
        });
        setCurrentStep(2);
      } else {
        toast({
          variant: 'destructive',
          title: 'Unable to save',
          description: result.error || 'Please try again.',
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Network error',
        description: 'Could not save driver details. Please retry.',
      });
    } finally {
      setSavingDriverInfo(false);
    }
  };

  const handleProceedToAction = () => {
    if (!driverName || !driverPhone) {
      toast({
        variant: 'destructive',
        title: 'Driver details required',
        description: 'Enter and save driver details first.',
      });
      return;
    }
    setCurrentStep(3);
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmitAction = async () => {
    if (!assignment) return;
    if (!driverName || !driverPhone) {
      toast({
        variant: 'destructive',
        title: 'Driver details required',
        description: 'Please provide your name and phone first.',
      });
      return;
    }

    if (!actionChoice) {
      toast({
        variant: 'destructive',
        title: 'Select an action',
        description: 'Choose Delivered or Cancelled to proceed.',
      });
      return;
    }

    setProcessing(true);

    try {
      // Cancellation flow
      if (actionChoice === 'CANCELLED') {
        const result = await apiClient.updateDeliveryAssignmentByQR(qrCode, {
          status: 'NOT_DELIVERED',
          driver_name: driverName,
          driver_phone: driverPhone,
          cancellation_reason: cancellationReason || 'Cancelled at doorstep',
        });

        if (!result.success) {
          throw new Error(result.error || 'Failed to update status');
        }

        setAssignment((prev) =>
          prev
            ? {
                ...prev,
                status: 'NOT_DELIVERED',
                driver_id: { ...prev.driver_id, name: driverName, phone: driverPhone },
              }
            : prev,
        );

        toast({ title: 'Marked as cancelled', description: 'Status updated successfully.' });
        return;
      }

      // Delivered flow
      if (actionChoice === 'DELIVERED') {
        if (!paymentMethod) {
          toast({
            variant: 'destructive',
            title: 'Payment method required',
            description: 'Choose Cash, Bank Transfer or Tabby.',
          });
          return;
        }

        if (paymentMethod === 'BANK_TRANSFER' && !paymentReference && !proofFile) {
          toast({
            variant: 'destructive',
            title: 'Transfer proof missing',
            description: 'Add a transaction number or capture a receipt photo.',
          });
          return;
        }

        if (paymentMethod === 'TABBY' && !financeAgentName) {
          toast({
            variant: 'destructive',
            title: 'Finance confirmation needed',
            description: 'Enter the finance agent name who approved Tabby.',
          });
          return;
        }

        let encodedProof: string | undefined;
        if (proofFile) {
          encodedProof = await fileToBase64(proofFile);
        }

        const paymentData = {
          payment_method: paymentMethod,
          payment_reference: paymentReference || undefined,
          payment_notes: paymentNotes || undefined,
          driver_name: driverName,
          driver_phone: driverPhone,
          finance_agent_name: financeAgentName || undefined,
          payment_proof: encodedProof,
        };

        const result = await apiClient.processQRPayment(qrCode, paymentData);

        if (!result.success) {
          throw new Error(result.error || 'Payment failed');
        }

        setAssignment((prev) =>
          prev
            ? {
                ...prev,
                payment_collected: true,
                payment_method: paymentMethod,
                payment_reference: paymentReference,
                payment_notes: paymentNotes,
                status: 'DELIVERED',
                qr_used: true,
                driver_id: { ...prev.driver_id, name: driverName, phone: driverPhone },
              }
            : prev,
        );

        toast({
          title: 'Payment recorded',
          description: `${paymentMethod === 'CASH' ? 'Cash received' : 'Payment submitted'}.`,
        });

        setTimeout(() => router.push('/dashboard/delivery-assignments'), 1500);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err?.message || 'Please try again.',
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
          <p className="text-gray-600">Loading assignment...</p>
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
              <p className="text-gray-600 mb-6">This payment has already been collected.</p>
              <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payment Method:</span>
                  <span className="text-sm font-medium">{assignment.payment_method}</span>
                </div>
                {assignment.payment_reference && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reference:</span>
                    <span className="text-sm font-medium font-mono">
                      {assignment.payment_reference}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(assignment.amount)}
                  </span>
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

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <Badge className="bg-slate-900 text-white">Secure Driver Flow</Badge>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm text-slate-500 font-medium uppercase tracking-[0.15em]">
            QR Payment
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Complete Delivery & Collect Payment</h1>
          <p className="text-slate-600">
            Industrial-grade guided flow for doorstep collection. Finish each step in order.
          </p>
        </div>

        {/* Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: 1, title: 'Verify Driver', desc: 'Identify yourself' },
            { id: 2, title: 'Review Delivery', desc: 'Confirm assignment details' },
            { id: 3, title: 'Complete', desc: 'Deliver or cancel with proof' },
          ].map((step) => (
            <div
              key={step.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                currentStep >= step.id ? 'border-primary/50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                    currentStep >= step.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step.id}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="text-xs text-slate-500">{step.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Step content rendered one-at-a-time for phone-first clarity */}
        <div className="space-y-4">
          {/* Step 1: Driver (always visible first) */}
          <Card className="border-2 border-blue-100 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="h-5 w-5 text-blue-600" />
                Step 1 · Driver Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                Enter your details first. Delivery actions unlock after saving.
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="driver-name">
                    Driver Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="driver-name"
                    value={driverName}
                    onChange={(e) => !driverInfoSaved && setDriverName(e.target.value)}
                    placeholder="Full name"
                    disabled={driverInfoSaved}
                  />
                  {driverInfoSaved && (
                    <p className="text-xs text-green-600 mt-1">Locked after verification</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="driver-phone">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="driver-phone"
                    value={driverPhone}
                    onChange={(e) => !driverInfoSaved && setDriverPhone(e.target.value)}
                    placeholder="05x xxx xxxx"
                    disabled={driverInfoSaved}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Your details are attached to this delivery record.
                </p>
                <Button
                  size="sm"
                  onClick={handleDriverInfoSave}
                  disabled={savingDriverInfo || driverInfoSaved}
                >
                  {savingDriverInfo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving
                    </>
                  ) : driverInfoSaved ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    'Save & Continue'
                  )}
                </Button>
              </div>

              <Button
                className="w-full"
                variant="outline"
                disabled={!driverInfoSaved}
                onClick={() => setCurrentStep(2)}
              >
                Go to Step 2
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Delivery details (hidden until step >= 2) */}
          {currentStep >= 2 && (
            <Card className="border-2 border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5 text-emerald-600" />
                  Step 2 · Delivery Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-3 bg-slate-50">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Assignment</p>
                    <p className="font-mono text-sm font-semibold">{assignment.assignment_id}</p>
                  </div>
                  <div className="rounded-lg border p-3 bg-slate-50">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{amountLabel}</p>
                    <p className="text-xl font-bold text-emerald-700">
                      {formatCurrency(assignment.amount)}
                    </p>
                    {showInclusiveTaxNote && (
                      <p className="text-[11px] text-slate-500 mt-1">Inclusive of tax</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <User className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Customer</p>
                      <p className="font-semibold">{customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700">
                    <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Delivery To</p>
                      <p className="font-semibold">{receiverName}</p>
                      <p className="text-sm text-slate-600">{receiverAddress}</p>
                      <p className="text-xs text-slate-500">{receiverPhone}</p>
                    </div>
                  </div>
                  {assignment.delivery_instructions && (
                    <div className="flex items-start gap-2 text-slate-700">
                      <FileText className="h-4 w-4 text-slate-500 mt-0.5" />
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Notes</p>
                        <p className="text-sm text-slate-700">{assignment.delivery_instructions}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      QR Expires
                    </span>
                    <span>{new Date(assignment.qr_expires_at).toLocaleString()}</span>
                  </div>
                </div>

                <Button className="w-full" onClick={() => setCurrentStep(3)}>
                  Go to Step 3
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Actions + payment (hidden until step >= 3) */}
          {currentStep >= 3 && (
            <Card className="border-2 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="h-5 w-5 text-amber-600" />
                  Step 3 · Finish Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={actionChoice === 'DELIVERED' ? 'default' : 'outline'}
                    className={`h-auto py-4 flex flex-col items-start ${actionChoice === 'DELIVERED' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : ''}`}
                    onClick={() => setActionChoice('DELIVERED')}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-semibold">Delivered</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Proceed to payment options</p>
                  </Button>
                  <Button
                    variant={actionChoice === 'CANCELLED' ? 'destructive' : 'outline'}
                    className="h-auto py-4 flex flex-col items-start"
                    onClick={() => setActionChoice('CANCELLED')}
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      <span className="font-semibold">Cancelled</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">No delivery completed</p>
                  </Button>
                </div>

                {actionChoice === 'CANCELLED' && (
                  <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <Label htmlFor="cancel-reason">Cancellation reason</Label>
                    <Textarea
                      id="cancel-reason"
                      placeholder="Customer not available, wrong address, etc."
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                    />
                  </div>
                )}

                {actionChoice === 'DELIVERED' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Payment method</Label>
                    <div className="grid gap-3">
                      <Button
                        variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                        className={`justify-start ${paymentMethod === 'CASH' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                        onClick={() => {
                          setPaymentMethod('CASH');
                          setPaymentReference('');
                          setFinanceAgentName('');
                          setProofFile(null);
                          setProofPreview(null);
                        }}
                      >
                        <Banknote className="mr-2 h-4 w-4" />
                        Cash collected
                      </Button>

                      <Button
                        variant={paymentMethod === 'BANK_TRANSFER' ? 'default' : 'outline'}
                        className={`justify-start ${paymentMethod === 'BANK_TRANSFER' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                        onClick={() => {
                          setPaymentMethod('BANK_TRANSFER');
                          setFinanceAgentName('');
                        }}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        Bank Transfer
                      </Button>

                      <Button
                        variant={paymentMethod === 'TABBY' ? 'default' : 'outline'}
                        className={`justify-start ${paymentMethod === 'TABBY' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                        onClick={() => {
                          setPaymentMethod('TABBY');
                          setProofFile(null);
                          setProofPreview(null);
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Tabby (Finance confirmation)
                      </Button>
                    </div>

                    {paymentMethod === 'BANK_TRANSFER' && (
                      <div className="space-y-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                        <Label htmlFor="transaction-number">
                          Transaction number or reference (required if no photo)
                        </Label>
                        <Input
                          id="transaction-number"
                          placeholder="e.g. TRX123456"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                        />
                        <div className="space-y-2">
                          <Label>Attach receipt (photo)</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setProofFile(file);
                                setProofPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                          {proofPreview && (
                            <img
                              src={proofPreview}
                              alt="Payment proof preview"
                              className="h-32 w-full object-cover rounded-lg border"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'TABBY' && (
                      <div className="space-y-2 rounded-lg border border-amber-100 bg-amber-50 p-3">
                        <Label htmlFor="finance-agent">
                          Finance agent name (who confirmed Tabby)
                        </Label>
                        <Input
                          id="finance-agent"
                          placeholder="Finance agent full name"
                          value={financeAgentName}
                          onChange={(e) => setFinanceAgentName(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add delivery or payment notes"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <Separator />

                <Button
                  className="w-full h-12 text-lg font-semibold"
                  onClick={handleSubmitAction}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Updating...
                    </>
                  ) : actionChoice === 'DELIVERED' ? (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Confirm Delivery & Payment
                    </>
                  ) : actionChoice === 'CANCELLED' ? (
                    <>
                      <XCircle className="mr-2 h-5 w-5" />
                      Mark as Cancelled
                    </>
                  ) : (
                    'Select an action'
                  )}
                </Button>

                <p className="text-xs text-center text-slate-500">
                  All actions are timestamped and synced to backend instantly.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
