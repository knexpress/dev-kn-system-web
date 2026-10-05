'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowRight, BellRing, ChevronDown, ChevronUp, Download, FileSignature, Pencil, PlusCircle, Printer, Send, Trash2 } from 'lucide-react';

type RouteCode = 'PH_TO_UAE' | 'UAE_TO_PH';

type QuoteItem = {
  id: string;
  boxNumber: string;
  name: string;
  quantity: number;
};

type SavedQuotation = {
  _id: string;
  quotation_number: string;
  sender_name?: string;
  sender_phone?: string;
  sender_address?: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  route: RouteCode;
  actual_weight_kg: number;
  volumetric_weight_kg: number;
  chargeable_weight_kg: number;
  weight_type: 'ACTUAL' | 'VOLUMETRIC';
  items: { box_number?: string; name: string; quantity: number }[];
  rate_per_kg: number;
  rate_bracket?: string;
  shipping_amount: number;
  pickup_location?: 'INSIDE_DUBAI' | 'OUTSIDE_DUBAI' | 'DROP_OFF';
  pickup_charge?: number;
  pickup_vat?: number;
  delivery_charge?: number;
  insurance_charge?: number;
  total_amount?: number;
  currency?: string;
  notes?: string;
  invoice_request_id?: string;
  awb?: string;
  createdAt?: string;
};

const ROUTE_LABELS: Record<RouteCode, string> = {
  PH_TO_UAE: 'Philippines to UAE',
  UAE_TO_PH: 'UAE to Philippines',
};

function money(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const HIDDEN_BOOKING_KEYS = new Set([
  '_id', '__v', 'identityDocuments', 'customerImage', 'customerImages', 'images', 'otp', 'otpVerification',
]);

function bookingOf(request: any) {
  return request?.booking_snapshot || request?.booking_data || {};
}

function displayValue(value: any): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object' && value.$numberDecimal) return String(value.$numberDecimal);
  if (typeof value === 'object') return '';
  const text = String(value);
  if (text.startsWith('data:') || text.length > 300) return '';
  return text;
}

function labelFor(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function flatEntries(obj: any): [string, string][] {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj)
    .filter(([key]) => !HIDDEN_BOOKING_KEYS.has(key))
    .map(([key, value]) => [labelFor(key), displayValue(value)] as [string, string])
    .filter(([, value]) => value);
}

function personName(person: any) {
  if (!person) return '';
  return (
    person.fullName ||
    person.name ||
    [person.firstName, person.lastName].filter(Boolean).join(' ')
  );
}

function senderOf(request: any) {
  const sender = bookingOf(request).sender || {};
  return {
    name: personName(sender) || request.customer_name || '',
    phone: sender.contactNo || sender.phone || sender.phoneNumber || request.customer_phone || '',
    address: sender.completeAddress || sender.addressLine1 || sender.address || request.origin_place || '',
  };
}

function receiverOf(request: any) {
  const receiver = bookingOf(request).receiver || {};
  return {
    name: request.receiver_name || personName(receiver) || '',
    phone: request.receiver_phone || receiver.contactNo || receiver.phone || receiver.phoneNumber || '',
    address: request.receiver_address || receiver.completeAddress || receiver.addressLine1 || receiver.address || request.destination_place || '',
  };
}

function routeOf(request: any): RouteCode | '' {
  const code = `${request.service_code || ''} ${bookingOf(request).service || ''}`.toUpperCase().replace(/-/g, '_');
  if (code.includes('PH_TO_UAE') || code.includes('PH_TO_PINAS')) return 'PH_TO_UAE';
  if (code.includes('UAE_TO_PH') || code.includes('UAE_TO_PINAS')) return 'UAE_TO_PH';
  return '';
}

function canGenerateQuotation(userProfile: any) {
  const role = String(userProfile?.role || '').toUpperCase();
  const dept = userProfile?.department?.name;
  return role === 'SUPERADMIN' || role === 'ADMIN' || dept === 'Finance' || dept === 'IT';
}

export default function QuotationsPage() {
  const { toast } = useToast();
  const [quotations, setQuotations] = useState<SavedQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printTarget, setPrintTarget] = useState<SavedQuotation | null>(null);
  const [downloadQueued, setDownloadQueued] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [route, setRoute] = useState<RouteCode | ''>('');
  const [actualWeight, setActualWeight] = useState('');
  const [volumetricWeight, setVolumetricWeight] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');
  const [notes, setNotes] = useState('');
  const [pickupLocation, setPickupLocation] = useState<'INSIDE_DUBAI' | 'OUTSIDE_DUBAI' | 'DROP_OFF' | ''>('');
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [insuranceCharge, setInsuranceCharge] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([{ id: '1', boxNumber: '1', name: '', quantity: 1 }]);
  const [numberQuery, setNumberQuery] = useState('');
  const [senderQuery, setSenderQuery] = useState('');
  const [receiverQuery, setReceiverQuery] = useState('');
  const [routeQuery, setRouteQuery] = useState<'ALL' | RouteCode>('ALL');
  const { userProfile } = useAuth();
  const canQuote = canGenerateQuotation(userProfile);
  const [quoteRequests, setQuoteRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [linkedRequest, setLinkedRequest] = useState<any | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [movingRequestId, setMovingRequestId] = useState<string | null>(null);
  const [sendTarget, setSendTarget] = useState<any | null>(null);

  const loadQuoteRequests = useCallback(async () => {
    const result = await apiClient.getQuotationRequests({ stage: 'REQUESTED,QUOTED' });
    if (result.success && Array.isArray(result.data)) {
      setQuoteRequests(result.data as any[]);
    }
    setRequestsLoading(false);
  }, []);

  useEffect(() => {
    loadQuoteRequests();
    const timer = window.setInterval(loadQuoteRequests, 15000);
    const onUpdated = () => loadQuoteRequests();
    window.addEventListener('quotation-requests:updated', onUpdated);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('quotation-requests:updated', onUpdated);
    };
  }, [loadQuoteRequests]);

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    const result = await apiClient.getQuotations({ limit: 100 });
    if (result.success && Array.isArray(result.data)) {
      setQuotations(result.data as SavedQuotation[]);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error || 'Failed to load quotations' });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  const filteredQuotations = quotations.filter((quote) => {
    const number = (quote.quotation_number || '').toLowerCase();
    const sender = `${quote.sender_name || ''} ${quote.sender_phone || ''}`.toLowerCase();
    const receiver = `${quote.customer_name || ''} ${quote.customer_phone || ''}`.toLowerCase();
    if (numberQuery.trim() && !number.includes(numberQuery.trim().toLowerCase())) return false;
    if (senderQuery.trim() && !sender.includes(senderQuery.trim().toLowerCase())) return false;
    if (receiverQuery.trim() && !receiver.includes(receiverQuery.trim().toLowerCase())) return false;
    if (routeQuery !== 'ALL' && quote.route !== routeQuery) return false;
    return true;
  });

  const actual = parseFloat(actualWeight) || 0;
  const volumetric = parseFloat(volumetricWeight) || 0;
  const chargeable = actual > 0 || volumetric > 0 ? Math.max(actual, volumetric) : 0;
  const weightType = actual >= volumetric ? 'ACTUAL' : 'VOLUMETRIC';
  const rate = Math.max(parseFloat(ratePerKg) || 0, 0);
  const shippingAmount = chargeable > 0 && rate > 0 ? Math.round(chargeable * rate * 100) / 100 : 0;
  const pickupCharge = pickupLocation === 'INSIDE_DUBAI' ? 20 : pickupLocation === 'OUTSIDE_DUBAI' ? 25.71 : 0;
  const pickupVat = Math.round(pickupCharge * 0.05 * 100) / 100;
  const delivery = Math.max(parseFloat(deliveryCharge) || 0, 0);
  const insurance = Math.max(parseFloat(insuranceCharge) || 0, 0);
  const finalAmount = Math.round((shippingAmount + pickupCharge + pickupVat + delivery + insurance) * 100) / 100;

  const resetForm = () => {
    setSenderName('');
    setSenderPhone('');
    setSenderAddress('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setRoute('');
    setActualWeight('');
    setVolumetricWeight('');
    setRatePerKg('');
    setNotes('');
    setPickupLocation('');
    setDeliveryCharge('');
    setInsuranceCharge('');
    setItems([{ id: '1', boxNumber: '1', name: '', quantity: 1 }]);
    setEditingId(null);
    setLinkedRequest(null);
  };

  const startFromRequest = (request: any) => {
    resetForm();
    const sender = senderOf(request);
    const receiver = receiverOf(request);
    const qr = request.quotation_request || {};
    setSenderName(sender.name);
    setSenderPhone(sender.phone);
    setSenderAddress(sender.address);
    setCustomerName(receiver.name);
    setCustomerPhone(receiver.phone);
    setCustomerAddress(receiver.address);
    setRoute(routeOf(request));
    setActualWeight(qr.actual_weight ? String(qr.actual_weight) : '');
    setVolumetricWeight(qr.volumetric_weight ? String(qr.volumetric_weight) : '');
    setItems(
      Array.isArray(qr.items) && qr.items.length
        ? qr.items.map((item: any, index: number) => ({
            id: `${request._id}-${index}`,
            boxNumber: item.box_number || String(index + 1),
            name: item.name || '',
            quantity: Number(item.quantity) || 1,
          }))
        : [{ id: '1', boxNumber: '1', name: '', quantity: 1 }]
    );
    setNotes(qr.notes || '');
    setLinkedRequest(request);
    setShowForm(true);
    window.setTimeout(() => document.getElementById('quotation-form')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // Same calls Operations used for the IN_PROGRESS move (status endpoint incl. EMPOST sync,
  // then booking shipment history), so that flow is unchanged
  const moveRequestToInProgress = async (request: any) => {
    setMovingRequestId(request._id);
    const result = await apiClient.updateInvoiceRequestStatus(request._id, { status: 'IN_PROGRESS' });
    const bookingId = typeof request.booking_id === 'object' ? request.booking_id?._id : request.booking_id;
    if (result.success && bookingId) {
      await apiClient.updateBookingShipmentStatusHistory(String(bookingId), 'Shipment Processing');
    }
    setMovingRequestId(null);
    apiClient.invalidateCache('/invoice-requests');
    loadQuoteRequests();
    return result;
  };

  const findLinkedQuote = async (request: any): Promise<SavedQuotation | null> => {
    const quotationId = request.quotation_request?.quotation_id;
    if (!quotationId) return null;
    const loaded = quotations.find((quote) => quote._id === String(quotationId));
    if (loaded) return loaded;
    const result = await apiClient.getQuotation(String(quotationId));
    if (result.success && result.data) return result.data as SavedQuotation;
    toast({ variant: 'destructive', title: 'Quotation not found', description: result.error || 'Could not load the linked quotation.' });
    return null;
  };

  const sendToOperations = async (request: any) => {
    const awb = request.tracking_code || request.awb_number || request._id;
    setSendTarget(null);
    const result = await moveRequestToInProgress(request);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not update', description: 'Failed to move the request to IN_PROGRESS.' });
      return;
    }
    const draft = (result.data as any)?.draft_journal as { status?: string; journal_no?: string; error?: string; reason?: string } | undefined;
    toast({
      title: 'Sent to Operations',
      description: `AWB ${awb} is now IN_PROGRESS.${
        draft?.status === 'DRAFT' && draft.journal_no
          ? ` Draft journal ${draft.journal_no} raised — it posts when the invoice is generated.`
          : ''
      }`,
    });
    if (draft?.status === 'FAILED') {
      toast({
        variant: 'destructive',
        title: 'Draft journal not created',
        description: draft.error || 'The quotation journal could not be drafted. The invoice will still post its own journal.',
      });
    }
  };

  const startEdit = (quote: SavedQuotation) => {
    setLinkedRequest(null);
    setEditingId(quote._id);
    setSenderName(quote.sender_name || '');
    setSenderPhone(quote.sender_phone || '');
    setSenderAddress(quote.sender_address || '');
    setCustomerName(quote.customer_name || '');
    setCustomerPhone(quote.customer_phone || '');
    setCustomerAddress(quote.customer_address || '');
    setRoute(quote.route || '');
    setActualWeight(String(quote.actual_weight_kg ?? ''));
    setVolumetricWeight(String(quote.volumetric_weight_kg ?? ''));
    setRatePerKg(String(quote.rate_per_kg ?? ''));
    setNotes(quote.notes || '');
    setPickupLocation(quote.pickup_location || '');
    setDeliveryCharge(quote.delivery_charge ? String(quote.delivery_charge) : '');
    setInsuranceCharge(quote.insurance_charge ? String(quote.insurance_charge) : '');
    setItems(
      (quote.items || []).length
        ? quote.items.map((item, index) => ({
            id: `${quote._id}-${index}`,
            boxNumber: item.box_number || String(index + 1),
            name: item.name,
            quantity: item.quantity,
          }))
        : [{ id: '1', boxNumber: '1', name: '', quantity: 1 }]
    );
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validItems = items.filter((item) => item.name.trim() && item.quantity > 0);
    if (!route) {
      toast({ variant: 'destructive', title: 'Route required', description: 'Select PH to UAE or UAE to PH.' });
      return;
    }
    if (actual <= 0 || volumetric <= 0) {
      toast({ variant: 'destructive', title: 'Weights required', description: 'Enter both actual and volumetric weight in kg.' });
      return;
    }
    if (rate <= 0) {
      toast({ variant: 'destructive', title: 'Rate required', description: 'Enter the rate per kg.' });
      return;
    }
    if (!validItems.length) {
      toast({ variant: 'destructive', title: 'Items required', description: 'Add at least one item.' });
      return;
    }
    if (!pickupLocation) {
      toast({ variant: 'destructive', title: 'Pickup required', description: 'Choose inside Dubai, outside Dubai, or drop off.' });
      return;
    }

    const payload = {
      sender_name: senderName.trim(),
      sender_phone: senderPhone.trim(),
      sender_address: senderAddress.trim(),
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_address: customerAddress.trim(),
      route,
      actual_weight_kg: actual,
      volumetric_weight_kg: volumetric,
      rate_per_kg: rate,
      items: validItems.map((item, index) => ({
        box_number: item.boxNumber.trim() || String(index + 1),
        name: item.name.trim(),
        quantity: item.quantity,
      })),
      pickup_location: pickupLocation,
      delivery_charge: delivery,
      insurance_charge: insurance,
      notes: notes.trim(),
    };

    if (linkedRequest && !editingId) {
      setSubmitting(true);
      const result = await apiClient.generateQuotationFromRequest(linkedRequest._id, payload);
      if (!result.success) {
        setSubmitting(false);
        toast({ variant: 'destructive', title: 'Could not generate', description: result.error || 'Failed to generate quotation' });
        loadQuoteRequests();
        return;
      }
      const createdQuote = (result.data as any)?.quotation as SavedQuotation | undefined;
      setSubmitting(false);
      toast({
        title: 'Quotation created',
        description: `${createdQuote?.quotation_number || 'Quotation'} is ready. Download it for the customer, edit if needed, then use "Send to Operations".`,
      });
      setShowForm(false);
      resetForm();
      loadQuotations();
      loadQuoteRequests();
      if (createdQuote) setPrintTarget(createdQuote);
      return;
    }

    setSubmitting(true);
    const result = editingId
      ? await apiClient.updateQuotation(editingId, payload)
      : await apiClient.createQuotation(payload);
    setSubmitting(false);

    if (result.success) {
      const linkedUpdated = Boolean((result as any).linked_request_updated ?? (result.data as any)?.linked_request_updated);
      const savedQuote = result.data as SavedQuotation | undefined;
      toast({
        title: editingId ? 'Quotation updated' : 'Quotation saved',
        description: savedQuote?.awb
          ? `Prices for AWB ${savedQuote.awb} were updated${linkedUpdated ? '' : ' on the quotation only (the request is already invoiced)'}.`
          : 'Saved for the client on this page only.',
      });
      setShowForm(false);
      resetForm();
      loadQuotations();
      if (savedQuote?.invoice_request_id) loadQuoteRequests();
    } else {
      toast({ variant: 'destructive', title: 'Could not save', description: result.error || 'Failed to create quotation' });
    }
  };

  const downloadQuotationPdf = async () => {
    const element = document.getElementById('quotation-sheet');
    if (!element || !printTarget) return;
    setDownloadingPdf(true);
    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;
      const opt = {
        margin: [6, 6, 6, 6] as [number, number, number, number],
        filename: `${printTarget.quotation_number || 'quotation'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: 'css' as const },
      };
      await html2pdf().set(opt).from(element).save();
    } catch {
      toast({ variant: 'destructive', title: 'Download failed', description: 'Could not save the quotation PDF.' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  useEffect(() => {
    if (!downloadQueued || !printTarget) return;
    const timer = window.setTimeout(() => {
      setDownloadQueued(false);
      downloadQuotationPdf().then(() => setPrintTarget(null));
    }, 80);
    return () => window.clearTimeout(timer);
  }, [downloadQueued, printTarget]);

  const handleDelete = async (id: string) => {
    const result = await apiClient.deleteQuotation(id);
    if (result.success) {
      setQuotations((current) => current.filter((quote) => quote._id !== id));
      if (printTarget?._id === id) setPrintTarget(null);
    } else {
      toast({ variant: 'destructive', title: 'Could not delete', description: result.error || 'Failed to delete quotation' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Quotations</h1>
          <p className="text-sm text-muted-foreground">
            Client quotations, and quotation requests sent by Operations before processing.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Quotation
        </Button>
      </div>

      <Card className={quoteRequests.some((r) => r.quotation_request?.stage === 'REQUESTED') ? 'border-orange-400' : undefined}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-orange-500" />
            Quotation requests from Operations
            {quoteRequests.length > 0 && (
              <Badge className="bg-orange-500 text-white">{quoteRequests.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {requestsLoading ? (
            <p className="text-sm text-muted-foreground">Loading requests...</p>
          ) : quoteRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotation requests waiting.</p>
          ) : (
            quoteRequests.map((request) => {
              const qr = request.quotation_request || {};
              const sender = senderOf(request);
              const receiver = receiverOf(request);
              const booking = bookingOf(request);
              const awb = request.tracking_code || request.awb_number || request.invoice_number || '—';
              const expanded = expandedRequestId === request._id;
              const quoted = qr.stage === 'QUOTED';
              const bookingItems: any[] = Array.isArray(booking.items) ? booking.items : [];
              const otherEntries = flatEntries(booking).filter(([label]) => !['Sender', 'Receiver', 'Items', 'Boxes'].includes(label));

              return (
                <div key={request._id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold">{awb}</span>
                        <Badge variant="outline">{ROUTE_LABELS[routeOf(request) as RouteCode] || request.service_code || 'Route not set'}</Badge>
                        {quoted ? (
                          <Badge className="bg-green-600 text-white">
                            Quoted {qr.quotation_number} · AED {money(Number(qr.quotation_total || 0))} · not sent yet
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-500 text-white">Awaiting quotation</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requested by {qr.requested_by_name || 'Operations'}
                        {qr.requested_at ? ` · ${new Date(qr.requested_at).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setExpandedRequestId(expanded ? null : request._id)}>
                        {expanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                        Booking form
                      </Button>
                      {canQuote && !quoted && (
                        <Button size="sm" onClick={() => startFromRequest(request)}>
                          <FileSignature className="mr-2 h-4 w-4" />
                          Generate Quotation
                        </Button>
                      )}
                      {canQuote && quoted && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={downloadingPdf}
                            onClick={async () => {
                              const quote = await findLinkedQuote(request);
                              if (quote) setPrintTarget(quote);
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download / Print
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const quote = await findLinkedQuote(request);
                              if (!quote) return;
                              startEdit(quote);
                              window.setTimeout(() => document.getElementById('quotation-form')?.scrollIntoView({ behavior: 'smooth' }), 50);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Quotation
                          </Button>
                          <Button
                            size="sm"
                            disabled={movingRequestId === request._id}
                            onClick={() => setSendTarget(request)}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {movingRequestId === request._id ? 'Sending...' : 'Send to Operations'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Sender</p>
                      <p className="font-medium">{sender.name || '—'}</p>
                      <p className="text-muted-foreground">{sender.phone}</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{sender.address}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Receiver</p>
                      <p className="font-medium">{receiver.name || '—'}</p>
                      <p className="text-muted-foreground">{receiver.phone}</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{receiver.address}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Weights</p>
                      <p>Actual: <span className="font-medium">{qr.actual_weight ?? '—'} kg</span></p>
                      <p>Volumetric: <span className="font-medium">{qr.volumetric_weight ?? '—'} kg</span></p>
                      <p>Boxes: <span className="font-medium">{qr.number_of_boxes ?? '—'}</span></p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Items</p>
                      {(qr.items || []).map((item: any, index: number) => (
                        <p key={index}>
                          Box {item.box_number || index + 1}: <span className="font-medium">{item.name}</span> × {item.quantity}
                        </p>
                      ))}
                      {qr.notes ? <p className="mt-1 text-xs text-muted-foreground">Note: {qr.notes}</p> : null}
                    </div>
                  </div>

                  {expanded && (
                    <div className="grid gap-4 rounded-lg bg-muted/40 p-3 text-sm md:grid-cols-3">
                      {[
                        { title: 'Sender (booking form)', entries: flatEntries(booking.sender) },
                        { title: 'Receiver (booking form)', entries: flatEntries(booking.receiver) },
                        { title: 'Shipment', entries: otherEntries },
                      ].map((section) => (
                        <div key={section.title}>
                          <p className="mb-1 font-semibold">{section.title}</p>
                          {section.entries.length ? (
                            section.entries.map(([label, value]) => (
                              <p key={label}>
                                <span className="text-muted-foreground">{label}:</span> {value}
                              </p>
                            ))
                          ) : (
                            <p className="text-muted-foreground">No details</p>
                          )}
                        </div>
                      ))}
                      <div className="md:col-span-3">
                        <p className="mb-1 font-semibold">Items (booking form)</p>
                        {bookingItems.length ? (
                          bookingItems.map((item, index) => (
                            <p key={index}>
                              {index + 1}. {item.commodity || item.name || item.description || 'Item'} × {item.qty ?? item.quantity ?? 1}
                            </p>
                          ))
                        ) : (
                          <p className="text-muted-foreground">No items on the booking form</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {showForm && (
        <Card id="quotation-form">
          <CardHeader>
            <CardTitle>
              {editingId
                ? 'Edit quotation'
                : linkedRequest
                  ? `Quotation for AWB ${linkedRequest.tracking_code || linkedRequest.awb_number || linkedRequest._id}`
                  : 'New manual quotation'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Sender</h3>
                  <div>
                    <Label htmlFor="sender_name">Name *</Label>
                    <Input id="sender_name" value={senderName} onChange={(e) => setSenderName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="sender_phone">Phone *</Label>
                    <Input id="sender_phone" type="tel" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="sender_address">Address *</Label>
                    <Textarea id="sender_address" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} required rows={2} />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Receiver</h3>
                  <div>
                    <Label htmlFor="customer_name">Name *</Label>
                    <Input id="customer_name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="customer_phone">Phone *</Label>
                    <Input id="customer_phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="customer_address">Address *</Label>
                    <Textarea id="customer_address" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} required rows={2} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Route</h3>
                <div className="max-w-md">
                  <Label>Route *</Label>
                  <Select value={route} onValueChange={(value) => setRoute(value as RouteCode)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PH_TO_UAE">Philippines to UAE</SelectItem>
                      <SelectItem value="UAE_TO_PH">UAE to Philippines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Weight (kg)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="actual_weight">Actual weight (kg) *</Label>
                    <Input id="actual_weight" type="number" min="0.01" step="0.01" value={actualWeight} onChange={(e) => setActualWeight(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="volumetric_weight">Volumetric weight (kg) *</Label>
                    <Input id="volumetric_weight" type="number" min="0.01" step="0.01" value={volumetricWeight} onChange={(e) => setVolumetricWeight(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="rate_per_kg">Rate per kg (AED) *</Label>
                    <Input id="rate_per_kg" type="number" min="0.01" step="0.01" placeholder="Enter rate" value={ratePerKg} onChange={(e) => setRatePerKg(e.target.value)} required />
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground">Chargeable weight</p>
                    <p className="font-semibold">{chargeable > 0 ? `${chargeable.toFixed(2)} kg` : '—'}</p>
                    <p className="text-xs text-muted-foreground">{chargeable > 0 ? weightType : 'Higher of actual and volumetric'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quoted shipping</p>
                    <p className="font-semibold">{shippingAmount > 0 ? `AED ${money(shippingAmount)}` : '—'}</p>
                    <p className="text-xs text-muted-foreground">Chargeable weight × the rate you enter</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Items</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setItems([...items, { id: Date.now().toString(), boxNumber: String(items.length + 1), name: '', quantity: 1 }])}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add item
                  </Button>
                </div>
                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-1">
                      <Label>S.No</Label>
                      <Input value={String(index + 1)} readOnly />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Box number *</Label>
                      <Input
                        value={item.boxNumber}
                        placeholder={String(index + 1)}
                        onChange={(e) => setItems(items.map((row) => row.id === item.id ? { ...row, boxNumber: e.target.value } : row))}
                        required
                      />
                    </div>
                    <div className="md:col-span-5">
                      <Label>Item {index + 1} *</Label>
                      <Input
                        value={item.name}
                        placeholder="Item name"
                        onChange={(e) => setItems(items.map((row) => row.id === item.id ? { ...row, name: e.target.value } : row))}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => setItems(items.map((row) => row.id === item.id ? { ...row, quantity: parseInt(e.target.value, 10) || 1 } : row))}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      {items.length > 1 && (
                        <Button type="button" variant="outline" onClick={() => setItems(items.filter((row) => row.id !== item.id))}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Charges</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Pickup *</Label>
                    <Select value={pickupLocation} onValueChange={(value) => setPickupLocation(value as 'INSIDE_DUBAI' | 'OUTSIDE_DUBAI' | 'DROP_OFF')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Inside Dubai, outside Dubai, or drop off" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INSIDE_DUBAI">Inside Dubai — 20.00 AED</SelectItem>
                        <SelectItem value="OUTSIDE_DUBAI">Outside Dubai — 25.71 AED</SelectItem>
                        <SelectItem value="DROP_OFF">Drop off — 0.00 AED</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">VAT 5% is added on the pickup charge only.</p>
                  </div>
                  <div>
                    <Label htmlFor="delivery_charge">Delivery charge (AED)</Label>
                    <Input id="delivery_charge" type="number" min="0" step="0.01" placeholder="0.00" value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="insurance_charge">Insurance charge (AED)</Label>
                    <Input id="insurance_charge" type="number" min="0" step="0.01" placeholder="0.00" value={insuranceCharge} onChange={(e) => setInsuranceCharge(e.target.value)} />
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
                  <div className="flex justify-between"><span>Shipping</span><span>AED {money(shippingAmount)}</span></div>
                  <div className="flex justify-between"><span>Pickup</span><span>AED {money(pickupCharge)}</span></div>
                  <div className="flex justify-between"><span>VAT 5% on pickup</span><span>AED {money(pickupVat)}</span></div>
                  <div className="flex justify-between"><span>Delivery</span><span>AED {money(delivery)}</span></div>
                  <div className="flex justify-between"><span>Insurance</span><span>AED {money(insurance)}</span></div>
                  <div className="flex justify-between font-semibold pt-1"><span>Final price</span><span>AED {money(finalAmount)}</span></div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional note for the client" />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting
                    ? 'Saving...'
                    : editingId
                      ? 'Save changes'
                      : linkedRequest
                        ? 'Generate quotation'
                        : 'Save quotation'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Saved quotations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label htmlFor="search_number">Number</Label>
              <Input id="search_number" value={numberQuery} onChange={(e) => setNumberQuery(e.target.value)} placeholder="Quotation number" />
            </div>
            <div>
              <Label htmlFor="search_sender">Sender</Label>
              <Input id="search_sender" value={senderQuery} onChange={(e) => setSenderQuery(e.target.value)} placeholder="Name or phone" />
            </div>
            <div>
              <Label htmlFor="search_receiver">Receiver</Label>
              <Input id="search_receiver" value={receiverQuery} onChange={(e) => setReceiverQuery(e.target.value)} placeholder="Name or phone" />
            </div>
            <div>
              <Label>Route</Label>
              <Select value={routeQuery} onValueChange={(value) => setRouteQuery(value as 'ALL' | RouteCode)}>
                <SelectTrigger>
                  <SelectValue placeholder="All routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All routes</SelectItem>
                  <SelectItem value="PH_TO_UAE">Philippines to UAE</SelectItem>
                  <SelectItem value="UAE_TO_PH">UAE to Philippines</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading quotations...</p>
          ) : quotations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotations yet.</p>
          ) : filteredQuotations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotations match this search.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Chargeable</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.map((quote) => (
                  <TableRow key={quote._id}>
                    <TableCell className="font-medium">
                      <div>{quote.quotation_number}</div>
                      {quote.awb ? <div className="text-xs font-normal text-muted-foreground">AWB {quote.awb}</div> : null}
                    </TableCell>
                    <TableCell>
                      <div>{quote.sender_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{quote.sender_phone}</div>
                    </TableCell>
                    <TableCell>
                      <div>{quote.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{quote.customer_phone}</div>
                    </TableCell>
                    <TableCell>{ROUTE_LABELS[quote.route] || quote.route}</TableCell>
                    <TableCell>{Number(quote.chargeable_weight_kg).toFixed(2)} kg</TableCell>
                    <TableCell>AED {money(Number(quote.total_amount ?? quote.shipping_amount))}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(quote)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setPrintTarget(quote); setDownloadQueued(true); }} disabled={downloadingPdf}>
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPrintTarget(quote)}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(quote._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {printTarget && (
        <div id="quotation-print" className="theme-light fixed inset-0 z-50 overflow-y-auto bg-neutral-200 text-black">
          <style>{`
            @page { size: A4 portrait; margin: 8mm; }
            .quote-sheet { width: 190mm; font-family: Arial, Helvetica, sans-serif; line-height: 1.45; }
            .quote-sheet, .quote-sheet * { font-family: Arial, Helvetica, sans-serif; letter-spacing: 0; }
            .quote-sheet p, .quote-sheet h1, .quote-sheet h2, .quote-sheet h3, .quote-sheet h4 { margin: 0; line-height: 1.45; }
            .quote-sheet table { font-size: 11px; border-collapse: collapse; width: 100%; }
            .quote-sheet th, .quote-sheet td { padding: 5px 8px; vertical-align: top; line-height: 1.45; }
            @media print {
              html, body { background: white !important; }
              body * { visibility: hidden; }
              #quotation-print, #quotation-print * { visibility: visible; }
              #quotation-print { position: absolute; left: 0; top: 0; width: 100%; background: white !important; overflow: visible; }
              .no-print { display: none !important; }
              .quote-sheet { width: 100%; box-shadow: none !important; margin: 0 !important; page-break-after: avoid; }
            }
          `}</style>
          <div className="no-print sticky top-0 z-10 flex items-center justify-end gap-2 border-b bg-white px-6 py-3">
            <Button variant="outline" onClick={() => setPrintTarget(null)}>Close</Button>
            <Button variant="outline" onClick={() => downloadQuotationPdf()} disabled={downloadingPdf}>
              <Download className="mr-2 h-4 w-4" />
              {downloadingPdf ? 'Downloading...' : 'Download PDF'}
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
          <div id="quotation-sheet" className="quote-sheet mx-auto my-6 bg-white px-6 py-5 shadow-lg text-[12px] text-black">
            <table className="mb-4" style={{ border: 'none' }}>
              <tbody>
                <tr>
                  <td style={{ width: '58%', border: 'none', padding: '0 12px 0 0' }}>
                    <h1 className="text-lg font-bold text-green-600">Knex Delivery Services L.L.C.</h1>
                    <p className="text-green-600">www.knexpress.ae</p>
                    <p>Dubai, United Arab Emirates</p>
                    <p className="text-[11px] text-gray-600">TRN: 104131637100003</p>
                  </td>
                  <td style={{ width: '42%', border: 'none', padding: 0, textAlign: 'right' }}>
                    <h2 className="text-2xl font-bold">QUOTATION</h2>
                    <p style={{ marginTop: 6 }}><span className="font-semibold">QUOTATION #</span> {printTarget.quotation_number}</p>
                    <p><span className="font-semibold">ROUTE</span> {ROUTE_LABELS[printTarget.route] || printTarget.route}</p>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="mb-4" style={{ border: 'none' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', border: 'none', padding: '0 16px 0 0' }}>
                    <h3 className="font-bold uppercase" style={{ marginBottom: 6 }}>Sender information</h3>
                    <p className="font-semibold">{printTarget.sender_name || '—'}</p>
                    <p className="text-[11px] uppercase text-gray-500">
                      {printTarget.createdAt
                        ? new Date(printTarget.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : ''}
                    </p>
                    <p className="whitespace-pre-wrap">{printTarget.sender_address}</p>
                    <p>{printTarget.sender_phone}</p>
                  </td>
                  <td style={{ width: '50%', border: 'none', padding: 0, textAlign: 'right' }}>
                    <h3 className="font-bold uppercase" style={{ marginBottom: 6 }}>Receiver information</h3>
                    <p className="font-semibold">{printTarget.customer_name || '—'}</p>
                    <p className="whitespace-pre-wrap">{printTarget.customer_address}</p>
                    <p>{printTarget.customer_phone}</p>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="border border-gray-300 mb-4">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 text-left font-semibold" style={{ width: '22%' }}>No of Boxes</th>
                  <th className="border border-gray-300 text-left font-semibold">Weight</th>
                  <th className="border border-gray-300 text-left font-semibold" style={{ width: '18%' }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300">{printTarget.items.length}</td>
                  <td className="border border-gray-300">
                    <div className="font-semibold">{Number(printTarget.chargeable_weight_kg).toFixed(2)} kg</div>
                    <div className="text-[11px] text-gray-600">
                      Weight Base: {printTarget.weight_type === 'ACTUAL' ? 'Actual Weight' : 'Volumetric Weight'}
                    </div>
                    <div className="text-[11px] text-gray-600">
                      Actual {Number(printTarget.actual_weight_kg).toFixed(2)} kg · Volumetric {Number(printTarget.volumetric_weight_kg).toFixed(2)} kg
                    </div>
                  </td>
                  <td className="border border-gray-300">{Number(printTarget.rate_per_kg).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <table style={{ border: 'none', marginBottom: 16 }}>
              <tbody>
                <tr>
                  <td style={{ border: 'none', width: '42%' }} />
                  <td style={{ border: 'none', width: '58%', padding: 0 }}>
                    <table className="border border-gray-300">
                      <tbody>
                        <tr>
                          <td className="border border-gray-300">Shipping Charge</td>
                          <td className="border border-gray-300 text-right" style={{ width: '32%' }}>{Number(printTarget.shipping_amount).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300">
                            Pickup Charge {printTarget.pickup_location === 'OUTSIDE_DUBAI' ? '(Outside Dubai)' : printTarget.pickup_location === 'INSIDE_DUBAI' ? '(Inside Dubai)' : '(Drop off)'}
                          </td>
                          <td className="border border-gray-300 text-right">{Number(printTarget.pickup_charge || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300">VAT 5% on Pickup</td>
                          <td className="border border-gray-300 text-right">{Number(printTarget.pickup_vat || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300">Delivery Charge</td>
                          <td className="border border-gray-300 text-right">{Number(printTarget.delivery_charge || 0).toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300">Insurance Charge</td>
                          <td className="border border-gray-300 text-right">{Number(printTarget.insurance_charge || 0).toFixed(2)}</td>
                        </tr>
                        <tr className="bg-gray-100">
                          <td className="border border-gray-300 font-bold">Total Amount</td>
                          <td className="border border-gray-300 text-right font-bold">{Number(printTarget.total_amount ?? printTarget.shipping_amount).toFixed(2)} AED</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="mb-3" style={{ border: 'none' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', border: 'none', padding: '0 12px 0 0' }}>
                    <h4 className="font-semibold" style={{ marginBottom: 4 }}>REMARKS:</h4>
                    <p>BOX# {printTarget.items.map((item, index) => item.box_number || String(index + 1)).join(', ')}</p>
                    <p>ITEMS: {printTarget.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}</p>
                    {printTarget.notes ? <p>{printTarget.notes}</p> : null}
                  </td>
                  <td style={{ width: '50%', border: 'none', padding: 0, textAlign: 'right' }}>
                    <h4 className="font-semibold" style={{ marginBottom: 4 }}>TERMS AND CONDITIONS:</h4>
                    <p>Client quotation only.</p>
                    <p>VAT 5% applies to the pickup charge only.</p>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="text-[11px]" style={{ border: 'none', borderTop: '1px solid #d1d5db' }}>
              <tbody>
                <tr>
                  <td style={{ width: '100%', border: 'none', padding: '8px 0 0 0', textAlign: 'right' }}>
                    <p className="font-semibold">UAE BANK DETAILS</p>
                    <p>RAK BANK (National Bank of Ras Al Khaimah)</p>
                    <p>KNEX DELIVERY SERVICES LLC</p>
                    <p>Card 5467 5077 4522 5002</p>
                    <p>IBAN AE26 0400 0003 7322 0098 001</p>
                    <p>Account 0373220098001</p>
                    <p>Swift NRAKAEAK</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={Boolean(sendTarget)} onOpenChange={(open) => !open && setSendTarget(null)}>
        <AlertDialogContent className="max-w-md">
          {sendTarget && (() => {
            const qr = sendTarget.quotation_request || {};
            const awb = sendTarget.tracking_code || sendTarget.awb_number || sendTarget._id;
            const route = routeOf(sendTarget);
            const sender = senderOf(sendTarget);
            const receiver = receiverOf(sendTarget);
            return (
              <>
                <AlertDialogHeader>
                  <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Send className="h-5 w-5" />
                  </div>
                  <AlertDialogTitle>Send to Operations?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Operations will pick this shipment up for processing with the quoted prices.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono font-semibold">{awb}</span>
                    <Badge variant="outline">{route ? ROUTE_LABELS[route] : sendTarget.service_code || 'Route not set'}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <span className="text-muted-foreground">Quotation</span>
                    <span className="text-right font-medium">{qr.quotation_number || '—'}</span>
                    <span className="text-muted-foreground">Sender</span>
                    <span className="truncate text-right">{sender.name || '—'}</span>
                    <span className="text-muted-foreground">Receiver</span>
                    <span className="truncate text-right">{receiver.name || '—'}</span>
                    <span className="text-muted-foreground">Quoted total</span>
                    <span className="text-right text-base font-semibold">AED {money(Number(qr.quotation_total || 0))}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs font-medium">
                  <Badge variant="secondary">QUOTATION REQUEST</Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge className="bg-blue-600 text-white hover:bg-blue-600">IN PROGRESS</Badge>
                </div>

                {route === 'UAE_TO_PH' && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                    A draft journal entry is raised from this quotation. It posts when the invoice is generated and the
                    customer&apos;s payment is recorded.
                  </p>
                )}

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button onClick={() => sendToOperations(sendTarget)} disabled={movingRequestId === sendTarget._id}>
                    <Send className="mr-2 h-4 w-4" />
                    Send to Operations
                  </Button>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
