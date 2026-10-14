'use client';

import { useEffect, useState } from 'react';
import { apiClient, type InvoicePaymentMode } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';

const PAY_MODES: { value: InvoicePaymentMode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CARD', label: 'Card payment' },
  { value: 'TABBY', label: 'Tabby' },
];

function money(n: number) {
  return (Number(n) || 0).toFixed(2);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Candidate = {
  _id: string;
  awb: string;
  customer_name: string;
  customer_phone?: string;
  receiver_name?: string;
  service_code?: string;
  quotation_number?: string;
  quotation_total?: number;
  has_advance?: boolean;
  advance_amount?: number;
};

export function CancellationInvoiceDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [awb, setAwb] = useState('');
  const [amount, setAmount] = useState('');
  const [vat, setVat] = useState<'0' | '5'>('5');
  const [reason, setReason] = useState('');
  const [paid, setPaid] = useState(false);
  const [payMode, setPayMode] = useState<InvoicePaymentMode | ''>('');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(today);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSearch('');
    setSelected(null);
    setCustomerName('');
    setCustomerPhone('');
    setAwb('');
    setAmount('');
    setVat('5');
    setReason('');
    setPaid(false);
    setPayMode('');
    setPayRef('');
    setPayDate(today());
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoadingList(true);
      const result = await apiClient.getCancellationInvoiceCandidates(search.trim() || undefined);
      if (cancelled) return;
      setLoadingList(false);
      if (result.success) setCandidates(Array.isArray(result.data) ? (result.data as Candidate[]) : []);
      else setCandidates([]);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, search]);

  const pick = (row: Candidate) => {
    setSelected(row);
    setCustomerName(row.customer_name || '');
    setCustomerPhone(row.customer_phone || '');
    setAwb(row.awb || '');
    if (row.has_advance && Number(row.advance_amount) > 0) {
      const adv = Number(row.advance_amount);
      setAmount(vat === '5' ? (Math.round((adv / 1.05) * 100) / 100).toFixed(2) : adv.toFixed(2));
      setPaid(true);
    }
  };

  const net = Math.round((parseFloat(amount) || 0) * 100) / 100;
  const vatAmt = vat === '5' ? Math.round(net * 0.05 * 100) / 100 : 0;
  const total = Math.round((net + vatAmt) * 100) / 100;

  const submit = async () => {
    if (!(net > 0)) {
      toast({ variant: 'destructive', title: 'Fee required', description: 'Enter the cancellation fee.' });
      return;
    }
    if (!selected && !customerName.trim()) {
      toast({ variant: 'destructive', title: 'Customer required', description: 'Choose a cancelled shipment or enter the customer name.' });
      return;
    }
    if (paid && !selected?.has_advance && !payMode) {
      toast({ variant: 'destructive', title: 'Payment method required', description: 'Choose how the customer paid, or leave unpaid and record it later.' });
      return;
    }
    setSaving(true);
    const result = await apiClient.createCancellationInvoice({
      request_id: selected?._id,
      amount: net,
      vat_rate: 5,
      reason: reason.trim() || undefined,
      awb_number: awb.trim() || undefined,
      customer_name: customerName.trim() || undefined,
      customer_phone: customerPhone.trim() || undefined,
      paid: paid || Boolean(selected?.has_advance),
      payment: paid && payMode
        ? { mode: payMode, reference: payRef.trim() || undefined, collected_at: payDate || undefined }
        : undefined,
    });
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not create invoice', description: result.error || 'Failed to raise the cancellation invoice.' });
      return;
    }
    const invoiceNo = (result.data as any)?.invoice?.invoice_id;
    const pay = (result.data as any)?.payment;
    toast({
      title: 'Cancellation invoice created',
      description: `${invoiceNo || 'Invoice'} for AED ${total.toFixed(2)}${
        pay?.status === 'PAID' && pay.journal_no ? ` · payment ${pay.journal_no}` : ' · unpaid until you record payment'
      }.`,
    });
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancellation invoice</AlertDialogTitle>
          <AlertDialogDescription>
            Raise a fee invoice for a cancelled shipment or quotation. This is not sent to EMPOST.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Cancelled shipment (optional)</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search AWB, customer, quotation…"
            />
            <div className="max-h-36 overflow-y-auto rounded-md border bg-white text-sm">
              {loadingList ? (
                <p className="px-3 py-2 text-slate-500">Loading…</p>
              ) : candidates.length === 0 ? (
                <p className="px-3 py-2 text-slate-500">No cancelled shipments without a fee invoice. You can still enter details below.</p>
              ) : (
                candidates.map((row) => (
                  <button
                    key={row._id}
                    type="button"
                    onClick={() => pick(row)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50 ${
                      selected?._id === row._id ? 'bg-brand-50' : ''
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono font-medium">{row.awb || 'No AWB'}</span>
                      <span className="text-slate-500"> · {row.customer_name || 'Customer'}</span>
                    </span>
                    {row.quotation_number ? (
                      <span className="shrink-0 text-xs text-slate-500">{row.quotation_number}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Customer *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>AWB</Label>
              <Input value={awb} onChange={(e) => setAwb(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fee (AED, before VAT) *</Label>
              <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>VAT</Label>
              <p className="flex h-10 items-center rounded-md border px-3 text-sm">5% — tax invoice</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 text-sm">
            <span className="text-slate-500">Invoice total</span>
            <span className="text-right font-semibold">AED {money(total)}</span>
          </div>

          {selected?.has_advance ? (
            <p className="text-xs text-emerald-800">
              Quotation advance AED {money(Number(selected.advance_amount || 0))} will apply to this invoice on the original paid date.
            </p>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={paid} onCheckedChange={(checked) => setPaid(Boolean(checked))} />
                Customer already paid
              </label>
              {paid && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Mode *</Label>
                    <Select value={payMode} onValueChange={(value) => setPayMode(value as InvoicePaymentMode)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAY_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Date paid</Label>
                    <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label>Reference</Label>
                    <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-1">
            <Label>Reason</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer cancelled after quoting" />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>Close</AlertDialogCancel>
          <Button onClick={submit} disabled={saving || !(net > 0)}>
            {saving ? 'Creating…' : 'Create invoice'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
