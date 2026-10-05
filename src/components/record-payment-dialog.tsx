'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiClient, type InvoicePaymentMode } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export const PAYMENT_MODES: { value: InvoicePaymentMode; label: string; rate: number }[] = [
  { value: 'TABBY', label: 'Tabby', rate: 0.1 },
  { value: 'CARD', label: 'Card payment', rate: 0.04 },
  { value: 'CASH', label: 'Cash', rate: 0 },
  { value: 'BANK_TRANSFER', label: 'Bank transfer', rate: 0 },
];
const GATEWAY_VAT_RATE = 0.05;

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').toString());
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const aed = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

export function activeInvoicePayments(invoice: any): any[] {
  return (invoice?.payments || []).filter((p: any) => p.status !== 'VOID');
}

/** Amount due after credit / debit notes; the backend sends payment_summary with every invoice. */
export function invoiceBalance(invoice: any) {
  const summary = invoice?.payment_summary;
  if (summary && Number.isFinite(Number(summary.total))) {
    return {
      total: num(summary.total),
      paid: num(summary.paid),
      balance: num(summary.balance),
      credit: num(summary.credit),
    };
  }
  const total = round2(
    num(invoice?.total_amount) - num(invoice?.credit_notes_total) + num(invoice?.debit_notes_total)
  );
  const paid = round2(
    activeInvoicePayments(invoice).reduce((s, p) => s + num(p.amount_applied), 0) - num(invoice?.refunds_total)
  );
  return { total, paid, balance: round2(Math.max(0, total - paid)), credit: round2(Math.max(0, paid - total)) };
}

export function invoiceHasNotes(invoice: any) {
  return num(invoice?.credit_notes_total) > 0 || num(invoice?.debit_notes_total) > 0;
}

type Props = {
  invoice: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (invoice: any) => void;
};

export function RecordPaymentDialog({ invoice, open, onOpenChange, onUpdated }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<InvoicePaymentMode | ''>('');
  const [paymentType, setPaymentType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [collectedAt, setCollectedAt] = useState(today());
  const [saving, setSaving] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);

  const { total, paid, balance } = invoiceBalance(invoice);
  const modeConfig = PAYMENT_MODES.find((m) => m.value === mode);
  const rate = modeConfig?.rate ?? 0;

  useEffect(() => {
    if (!open) return;
    setMode('');
    setPaymentType('FULL');
    setAmount('');
    setReference('');
    setCollectedAt(today());
  }, [open, invoice?._id]);

  useEffect(() => {
    if (paymentType === 'FULL' && mode) setAmount(round2(balance * (1 + rate)).toFixed(2));
    if (paymentType === 'PARTIAL') setAmount('');
  }, [mode, paymentType, balance, rate]);

  const preview = useMemo(() => {
    const collected = round2(num(amount));
    const applied = paymentType === 'FULL' ? balance : round2(collected / (1 + rate));
    const gateway = round2(Math.max(0, collected - applied));
    const gatewayNet = round2(gateway / (1 + GATEWAY_VAT_RATE));
    const gatewayVat = round2(gateway - gatewayNet);
    let problem = '';
    if (!mode) problem = 'Choose the mode of payment';
    else if (!(collected > 0)) problem = 'Enter the amount collected';
    else if (paymentType === 'FULL' && collected < balance - 0.009) problem = 'Less than the balance — choose Partial';
    else if (paymentType === 'FULL' && rate === 0 && collected > balance + 0.009) problem = `${modeConfig?.label} has no charges — amount should equal the balance`;
    else if (paymentType === 'PARTIAL' && applied >= balance - 0.009) problem = 'This covers the full balance — choose Full';
    return {
      collected,
      applied,
      gateway,
      gatewayNet,
      gatewayVat,
      remaining: round2(Math.max(0, balance - applied)),
      problem,
    };
  }, [amount, paymentType, balance, rate, mode, modeConfig?.label]);

  const save = async () => {
    if (!invoice?._id || !mode || preview.problem) return;
    setSaving(true);
    const result: any = await apiClient.recordInvoicePayment(invoice._id, {
      mode,
      payment_type: paymentType,
      amount_collected: preview.collected,
      reference: reference.trim() || undefined,
      collected_at: collectedAt || undefined,
    });
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not record payment', description: result.error });
      return;
    }
    toast({
      title: 'Payment recorded',
      description: `${result.message || ''}${result.journal_no ? ` · Finance JE ${result.journal_no} posted` : ''}`,
    });
    onUpdated(result.data);
    onOpenChange(false);
  };

  const voidPayment = async (payment: any) => {
    const reason = window.prompt('Reason for voiding this payment entry?');
    if (reason === null) return;
    setVoidingId(payment._id);
    const result: any = await apiClient.voidInvoicePayment(invoice._id, payment._id, reason);
    setVoidingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not void payment', description: result.error });
      return;
    }
    toast({
      title: 'Payment voided',
      description: result.reversal_journal_no ? `Reversal JE ${result.reversal_journal_no} posted` : undefined,
    });
    onUpdated(result.data);
  };

  const payments: any[] = invoice?.payments || [];
  const canRecord = balance > 0.009 && invoice?.status !== 'CANCELLED';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle>Record payment · {invoice?.invoice_id || ''}</DialogTitle>
          <DialogDescription>
            Enter what was actually collected. Anything above the invoice amount is booked as payment gateway
            revenue (VAT-inclusive).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">{invoiceHasNotes(invoice) ? 'Amount due (after notes)' : 'Invoice total'}</p>
              <p className="font-semibold text-slate-900">{aed(total)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Paid so far</p>
              <p className="font-semibold text-slate-900">{aed(paid)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Balance due</p>
              <p className={cn('font-semibold', balance > 0.009 ? 'text-rose-600' : 'text-emerald-600')}>{aed(balance)}</p>
            </div>
          </div>

          {canRecord && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mode of payment</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as InvoicePaymentMode)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                        {m.rate ? ` (${Math.round(m.rate * 100)}% charges)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['FULL', 'PARTIAL'] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={paymentType === t ? 'default' : 'outline'}
                      className="rounded-xl"
                      onClick={() => setPaymentType(t)}
                    >
                      {t === 'FULL' ? 'Full payment' : 'Partial'}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Amount collected (AED)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-xl"
                  placeholder={paymentType === 'PARTIAL' ? 'Amount received now' : ''}
                />
                {mode && rate > 0 && paymentType === 'FULL' && (
                  <p className="text-xs text-slate-500">
                    Expected with {Math.round(rate * 100)}% charges: {aed(round2(balance * (1 + rate)))}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Date collected</Label>
                <Input type="date" value={collectedAt} onChange={(e) => setCollectedAt(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Reference (optional)</Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="rounded-xl"
                  placeholder="Tabby order ID, card approval code, transfer ref…"
                />
              </div>

              {mode && preview.collected > 0 && (
                <div className="space-y-1 rounded-2xl border border-slate-200 p-3 text-sm sm:col-span-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Applied to invoice (clears AR)</span>
                    <span className="font-medium">{aed(preview.applied)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment gateway charge</span>
                    <span className="font-medium">{aed(preview.gateway)}</span>
                  </div>
                  {preview.gateway > 0 && (
                    <div className="flex justify-between pl-3 text-xs text-slate-500">
                      <span>Gateway revenue {aed(preview.gatewayNet)} + VAT 5% {aed(preview.gatewayVat)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Balance after this payment</span>
                    <span className="font-medium">{aed(preview.remaining)}</span>
                  </div>
                  {preview.problem && <p className="pt-1 text-xs font-medium text-rose-600">{preview.problem}</p>}
                </div>
              )}
            </div>
          )}

          {payments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">Payments on this invoice</p>
              <div className="divide-y rounded-2xl border border-slate-200">
                {payments.map((p) => {
                  const label = PAYMENT_MODES.find((m) => m.value === p.mode)?.label || p.mode;
                  const isVoid = p.status === 'VOID';
                  return (
                    <div key={p._id} className={cn('flex items-center justify-between gap-3 p-3 text-sm', isVoid && 'opacity-50')}>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">
                          {label} · {p.payment_type === 'FULL' ? 'Full' : 'Partial'} · {aed(num(p.amount_collected))}
                          {isVoid && <Badge variant="secondary" className="ml-2">VOID</Badge>}
                          {p.mode === 'CASH' && !isVoid && (
                            <Badge variant="secondary" className="ml-2">{p.remitted ? 'Remitted' : 'With driver'}</Badge>
                          )}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {p.collected_at ? new Date(p.collected_at).toLocaleDateString() : ''} · applied {aed(num(p.amount_applied))}
                          {num(p.gateway_charge) > 0 ? ` · gateway ${aed(num(p.gateway_charge))}` : ''}
                          {p.journal_no ? ` · ${p.journal_no}` : ''}
                          {p.void_journal_no ? ` · reversed ${p.void_journal_no}` : ''}
                          {p.reference ? ` · ${p.reference}` : ''}
                        </p>
                      </div>
                      {!isVoid && !p.remitted && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={voidingId === p._id}
                          onClick={() => voidPayment(p)}
                        >
                          {voidingId === p._id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Void'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canRecord && (
            <Button className="rounded-xl" disabled={saving || Boolean(preview.problem)} onClick={save}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
