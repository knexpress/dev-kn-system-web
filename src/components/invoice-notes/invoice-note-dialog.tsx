'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Eye, FileMinus2, FilePlus2, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  apiClient,
  type InvoiceNote,
  type InvoiceNoteCategory,
  type InvoiceNoteReason,
  type InvoiceNoteType,
  type InvoicePaymentMode,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { InvoiceNoteDocumentDialog } from './invoice-note-document';
import { NOTE_CATEGORIES, NOTE_REASONS, NoteStatusPill, REFUND_MODES } from './invoice-note-shared';

const num = (v: unknown) => {
  const raw = v && typeof v === 'object' && '$numberDecimal' in v ? (v as { $numberDecimal: string }).$numberDecimal : v;
  const n = parseFloat(String(raw ?? ''));
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const aed = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

type DraftLine = { key: number; category: InvoiceNoteCategory; description: string; amount: string; vat_rate: 0 | 5 };

type Context = {
  notes: InvoiceNote[];
  summary: { total: number; paid: number; balance: number; credit: number };
  net_total: number;
  creditable: number;
  creditable_vat: number;
  gl_status: string | null;
};

type Props = {
  invoice: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
  defaultType?: InvoiceNoteType;
};

let lineKey = 0;
const newLine = (vat: 0 | 5): DraftLine => ({ key: ++lineKey, category: 'SHIPPING', description: '', amount: '', vat_rate: vat });

export function InvoiceNoteDialog({ invoice, open, onOpenChange, onChanged, defaultType = 'CREDIT' }: Props) {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isFm = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const invoiceHasVat = num(invoice?.tax_amount) > 0;
  const defaultVat: 0 | 5 = invoiceHasVat ? 5 : 0;

  const [ctx, setCtx] = useState<Context | null>(null);
  const [loading, setLoading] = useState(false);
  const [noteType, setNoteType] = useState<InvoiceNoteType>(defaultType);
  const [reasonCode, setReasonCode] = useState<InvoiceNoteReason | ''>('');
  const [reason, setReason] = useState('');
  const [noteDate, setNoteDate] = useState(today());
  const [lines, setLines] = useState<DraftLine[]>([newLine(defaultVat)]);
  const [refundMode, setRefundMode] = useState<InvoicePaymentMode | ''>('');
  const [refundReference, setRefundReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<InvoiceNote | null>(null);

  const load = useCallback(async () => {
    if (!invoice?._id) return;
    setLoading(true);
    const result: any = await apiClient.getInvoiceNotesForInvoice(invoice._id);
    setLoading(false);
    if (result.success) setCtx(result.data as Context);
    else toast({ variant: 'destructive', title: 'Could not load notes', description: result.error });
  }, [invoice?._id, toast]);

  useEffect(() => {
    if (!open) return;
    setNoteType(defaultType);
    setReasonCode('');
    setReason('');
    setNoteDate(today());
    setLines([newLine(defaultVat)]);
    setRefundMode('');
    setRefundReference('');
    setCtx(null);
    void load();
  }, [open, invoice?._id, defaultType, defaultVat, load]);

  const isCredit = noteType === 'CREDIT';
  const reasons = NOTE_REASONS.filter((r) => r.types.includes(noteType));
  const vatAllowed = !isCredit || invoiceHasVat;

  useEffect(() => {
    if (reasonCode && !reasons.some((r) => r.value === reasonCode)) setReasonCode('');
    if (!vatAllowed) setLines((prev) => prev.map((l) => ({ ...l, vat_rate: 0 })));
  }, [noteType]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const priced = lines.map((l) => {
      const amount = round2(num(l.amount));
      const vat = round2((amount * l.vat_rate) / 100);
      return { amount, vat, total: round2(amount + vat) };
    });
    const subtotal = round2(priced.reduce((s, l) => s + l.amount, 0));
    const vat = round2(priced.reduce((s, l) => s + l.vat, 0));
    return { priced, subtotal, vat, total: round2(subtotal + vat) };
  }, [lines]);

  const summary = ctx?.summary;
  const dueAfter = summary ? round2(summary.total + (isCredit ? -totals.total : totals.total)) : 0;
  const refundDue = summary && isCredit ? round2(Math.min(Math.max(0, summary.paid - dueAfter), totals.total)) : 0;

  const problem = (() => {
    if (!ctx) return 'Loading…';
    if (ctx.gl_status !== 'POSTED') return 'Post the invoice to the ledger first';
    if (!reasonCode) return 'Choose a reason';
    if (reason.trim().length < 5) return 'Describe the reason (at least 5 characters)';
    if (lines.some((l) => !(num(l.amount) > 0))) return 'Every line needs an amount above zero';
    if (isCredit && totals.total > ctx.creditable + 0.009) return `A credit note can be at most ${aed(ctx.creditable)} on this invoice`;
    if (isCredit && totals.vat > ctx.creditable_vat + 0.009) return `Only ${aed(ctx.creditable_vat)} of VAT is left to credit`;
    return '';
  })();

  const updateLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const save = async () => {
    if (!invoice?._id || problem || !reasonCode) return;
    setSaving(true);
    const result: any = await apiClient.createInvoiceNote({
      invoice_id: invoice._id,
      note_type: noteType,
      reason_code: reasonCode,
      reason: reason.trim(),
      note_date: noteDate || undefined,
      lines: lines.map((l) => ({
        category: l.category,
        description: l.description.trim() || undefined,
        amount: round2(num(l.amount)),
        vat_rate: l.vat_rate,
      })),
      refund_mode: isCredit && refundMode ? refundMode : undefined,
      refund_reference: isCredit && refundReference.trim() ? refundReference.trim() : undefined,
    });
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not raise the note', description: result.error });
      return;
    }
    toast({
      title: `${result.data?.note_no} raised`,
      description: 'Sent to a Finance Manager for approval. It posts to the ledger once approved.',
    });
    onChanged?.();
    onOpenChange(false);
  };

  const notes = ctx?.notes || [];
  const pendingCount = notes.filter((n) => n.status === 'PENDING_APPROVAL').length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Credit / debit note · {invoice?.invoice_id || ''}</DialogTitle>
            <DialogDescription>
              Adjust this invoice without editing it. A credit note lowers what the customer owes, a debit note raises it.
              Notes post to the ledger once a Finance Manager approves them.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Invoice total</p>
                <p className="font-semibold text-slate-900">{aed(num(invoice?.total_amount))}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Amount due now</p>
                <p className="font-semibold text-slate-900">{summary ? aed(summary.total) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Paid so far</p>
                <p className="font-semibold text-slate-900">{summary ? aed(summary.paid) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Can still credit</p>
                <p className="font-semibold text-slate-900">{ctx ? aed(ctx.creditable) : '—'}</p>
              </div>
            </div>

            {loading && !ctx && (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              </div>
            )}

            {ctx && ctx.gl_status !== 'POSTED' && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>This invoice has no posted journal yet. Post it from Accounting before raising a note.</p>
              </div>
            )}

            {ctx && ctx.gl_status === 'POSTED' && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Note type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['CREDIT', 'DEBIT'] as const).map((t) => (
                        <Button
                          key={t}
                          type="button"
                          variant={noteType === t ? 'default' : 'outline'}
                          className="rounded-xl"
                          onClick={() => setNoteType(t)}
                        >
                          {t === 'CREDIT' ? <FileMinus2 className="mr-2 h-4 w-4" /> : <FilePlus2 className="mr-2 h-4 w-4" />}
                          {t === 'CREDIT' ? 'Credit note (reduce)' : 'Debit note (add charge)'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Select value={reasonCode} onValueChange={(v) => setReasonCode(v as InvoiceNoteReason)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {reasons.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Note date</Label>
                    <Input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Details</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      className="rounded-xl"
                      placeholder={isCredit ? 'e.g. Actual weight 12 kg, invoiced at 15 kg' : 'e.g. Extra packing requested by customer'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Lines</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setLines((prev) => [...prev, newLine(vatAllowed ? defaultVat : 0)])}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add line
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {lines.map((l, i) => (
                      <div key={l.key} className="grid grid-cols-12 items-center gap-2 rounded-2xl border border-slate-200 p-2">
                        <div className="col-span-12 sm:col-span-3">
                          <Select value={l.category} onValueChange={(v) => updateLine(l.key, { category: v as InvoiceNoteCategory })}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {NOTE_CATEGORIES.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          className="col-span-12 rounded-xl sm:col-span-4"
                          placeholder="Description (optional)"
                          value={l.description}
                          onChange={(e) => updateLine(l.key, { description: e.target.value })}
                        />
                        <Input
                          className="col-span-5 rounded-xl sm:col-span-2"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Net AED"
                          value={l.amount}
                          onChange={(e) => updateLine(l.key, { amount: e.target.value })}
                        />
                        <div className="col-span-4 sm:col-span-2">
                          <Select
                            value={String(l.vat_rate)}
                            onValueChange={(v) => updateLine(l.key, { vat_rate: v === '5' ? 5 : 0 })}
                            disabled={!vatAllowed}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">VAT 5%</SelectItem>
                              <SelectItem value="0">No VAT</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 flex items-center justify-end gap-1 sm:col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-slate-400 hover:text-rose-600"
                            disabled={lines.length === 1}
                            onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                            aria-label={`Remove line ${i + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!vatAllowed && <p className="text-xs text-slate-500">This invoice has no VAT, so the credit note carries none.</p>}
                </div>

                <div className="space-y-1 rounded-2xl border border-slate-200 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Net amount</span>
                    <span className="font-medium">{aed(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">VAT</span>
                    <span className="font-medium">{aed(totals.vat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isCredit ? 'Total credited' : 'Total debited'}</span>
                    <span className="font-semibold">{aed(totals.total)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1">
                    <span className="text-slate-500">Amount due once approved</span>
                    <span className="font-medium">{aed(Math.max(0, dueAfter))}</span>
                  </div>
                  <p className="pt-1 text-xs text-slate-500">
                    On approval: {isCredit ? 'Dr revenue & VAT output / Cr Accounts Receivable' : 'Dr Accounts Receivable / Cr revenue & VAT output'}.
                  </p>
                  {problem && <p className="pt-1 text-xs font-medium text-rose-600">{problem}</p>}
                </div>

                {isCredit && refundDue > 0.009 && (
                  <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                    <p className="text-sm text-emerald-900">
                      The customer has already paid. <span className="font-semibold">{aed(refundDue)}</span> will be refunded when
                      the note is approved.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Refund via</Label>
                        <Select value={refundMode} onValueChange={(v) => setRefundMode(v as InvoicePaymentMode)}>
                          <SelectTrigger className="rounded-xl bg-white">
                            <SelectValue placeholder="Select refund method" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFUND_MODES.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label} · {m.account}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Reference (optional)</Label>
                        <Input
                          className="rounded-xl bg-white"
                          value={refundReference}
                          onChange={(e) => setRefundReference(e.target.value)}
                          placeholder="Transfer ref, card reversal ID…"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-emerald-800">The approver can change the refund method before posting.</p>
                  </div>
                )}
              </>
            )}

            {notes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Notes on this invoice</p>
                  {isFm && pendingCount > 0 && (
                    <Button asChild variant="link" size="sm" className="h-auto p-0 text-brand-600">
                      <Link href="/dashboard/accounting/invoice-notes?status=PENDING_APPROVAL">Review {pendingCount} pending</Link>
                    </Button>
                  )}
                </div>
                <div className="divide-y rounded-2xl border border-slate-200">
                  {notes.map((n) => (
                    <div key={n._id} className={cn('flex items-center justify-between gap-3 p-3 text-sm', ['VOID', 'REJECTED'].includes(n.status) && 'opacity-60')}>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                          {n.note_no} · {n.note_type === 'CREDIT' ? '−' : '+'}
                          {aed(n.total_amount)}
                          <NoteStatusPill status={n.status} />
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {new Date(n.note_date).toLocaleDateString()} · {n.reason}
                          {n.journal_no ? ` · ${n.journal_no}` : ''}
                          {n.refund_journal_no ? ` · refund ${n.refund_journal_no}` : ''}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setViewing(n)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {ctx?.gl_status === 'POSTED' && (
              <Button className="rounded-xl" disabled={saving || Boolean(problem)} onClick={save}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit for approval
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceNoteDocumentDialog note={viewing} open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </>
  );
}
