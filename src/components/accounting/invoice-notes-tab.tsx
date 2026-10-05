'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Ban, CheckCircle2, Eye, FileText, Loader2, Printer, XCircle } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiClient, type InvoiceNote, type InvoiceNoteStatus, type InvoicePaymentMode } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  ErpDialogSection,
  ErpEmptyState,
  ErpMetaGrid,
  ErpModuleBody,
  ErpStatStrip,
  ErpToolbar,
  erpPrimaryButtonClass,
  erpTableClasses,
} from './erp-shell';
import { fmtDate, fmtDateTime, money } from './erp-format';
import {
  NOTE_STATUS_LABEL,
  NoteStatusPill,
  NoteTypePill,
  REFUND_MODES,
  categoryLabel,
  reasonLabel,
  refundModeLabel,
} from '@/components/invoice-notes/invoice-note-shared';
import { InvoiceNoteDocumentDialog } from '@/components/invoice-notes/invoice-note-document';

type TypeFilter = 'ALL' | 'CREDIT' | 'DEBIT';
type StatusFilter = 'ALL' | InvoiceNoteStatus;

const TYPE_TABS: { id: TypeFilter; label: string }[] = [
  { id: 'ALL', label: 'All notes' },
  { id: 'CREDIT', label: 'Credit notes' },
  { id: 'DEBIT', label: 'Debit notes' },
];
const STATUS_FILTERS: StatusFilter[] = ['ALL', 'PENDING_APPROVAL', 'POSTED', 'REJECTED', 'VOID'];

type ActionTarget = { note: InvoiceNote; action: 'reject' | 'void' } | null;

export default function InvoiceNotesTab() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isFm = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const searchParams = useSearchParams();
  const initialStatus = (searchParams?.get('status') || 'ALL') as StatusFilter;

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    STATUS_FILTERS.includes(initialStatus) ? initialStatus : 'ALL'
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<InvoiceNote[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [detail, setDetail] = useState<InvoiceNote | null>(null);
  const [documentFor, setDocumentFor] = useState<InvoiceNote | null>(null);
  const [approveFor, setApproveFor] = useState<InvoiceNote | null>(null);
  const [approveCtx, setApproveCtx] = useState<any>(null);
  const [refundMode, setRefundMode] = useState<InvoicePaymentMode | ''>('');
  const [refundReference, setRefundReference] = useState('');
  const [actionFor, setActionFor] = useState<ActionTarget>(null);
  const [actionReason, setActionReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const result: any = await apiClient.getInvoiceNotes();
    setLoading(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not load notes', description: result.error });
      return;
    }
    setNotes((result.data as InvoiceNote[]) || []);
    setSummary(result.summary || null);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (typeFilter !== 'ALL' && n.note_type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && n.status !== statusFilter) return false;
      if (!q) return true;
      return [n.note_no, n.invoice_no, n.awb_number, n.customer_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [notes, typeFilter, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) {
      if (typeFilter !== 'ALL' && n.note_type !== typeFilter) continue;
      counts[n.status] = (counts[n.status] || 0) + 1;
    }
    return counts;
  }, [notes, typeFilter]);

  const stats = [
    {
      label: 'Credit notes posted',
      value: `AED ${money(summary?.credit_total)}`,
      hint: `${summary?.credit_count || 0} notes · reduce receivables`,
    },
    {
      label: 'Debit notes posted',
      value: `AED ${money(summary?.debit_total)}`,
      hint: `${summary?.debit_count || 0} notes · add receivables`,
    },
    {
      label: 'Awaiting approval',
      value: summary?.pending ?? 0,
      hint: isFm ? 'Review and post to the ledger' : 'With the Finance Manager',
    },
    {
      label: 'Rejected / void',
      value: (summary?.rejected || 0) + (summary?.void || 0),
      hint: `${summary?.rejected || 0} rejected · ${summary?.void || 0} void`,
    },
  ];

  const openApprove = async (note: InvoiceNote) => {
    setApproveFor(note);
    setRefundMode((note.refund_mode as InvoicePaymentMode) || '');
    setRefundReference(note.refund_reference || '');
    setApproveCtx(null);
    const result: any = await apiClient.getInvoiceNotesForInvoice(note.invoice_id);
    if (result.success) setApproveCtx(result.data);
  };

  const approveRefundDue = useMemo(() => {
    if (!approveFor || approveFor.note_type !== 'CREDIT' || !approveCtx?.summary) return 0;
    const { total, paid } = approveCtx.summary;
    const after = total - approveFor.total_amount;
    return Math.round(Math.min(Math.max(0, paid - after), approveFor.total_amount) * 100) / 100;
  }, [approveFor, approveCtx]);

  const confirmApprove = async () => {
    if (!approveFor) return;
    setActingId(approveFor._id);
    const result: any = await apiClient.approveInvoiceNote(approveFor._id, {
      refund_mode: refundMode || undefined,
      refund_reference: refundReference.trim() || undefined,
    });
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not approve', description: result.error });
      return;
    }
    const parts = [`Journal ${result.journal_no} posted`];
    if (result.refund_journal_no) parts.push(`refund ${result.refund_journal_no}`);
    if (result.invoice_status) parts.push(`invoice now ${result.invoice_status}`);
    toast({
      title: `${result.data?.note_no} approved`,
      description: parts.join(' · '),
    });
    if (result.refund_failed) {
      toast({ variant: 'destructive', title: 'Refund not posted', description: 'The note posted but the refund journal failed — check the GL accounts.' });
    }
    setApproveFor(null);
    if (detail?._id === approveFor._id) setDetail(result.data);
    await load();
  };

  const confirmAction = async () => {
    if (!actionFor) return;
    const { note, action } = actionFor;
    setActingId(note._id);
    const result: any =
      action === 'reject'
        ? await apiClient.rejectInvoiceNote(note._id, actionReason.trim())
        : await apiClient.voidInvoiceNote(note._id, actionReason.trim());
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: `Could not ${action}`, description: result.error });
      return;
    }
    toast({
      title: `${note.note_no} ${action === 'reject' ? 'rejected' : 'voided'}`,
      description:
        action === 'void'
          ? [result.data?.void_journal_no && `Reversal ${result.data.void_journal_no}`, result.data?.void_refund_journal_no && `refund reversed ${result.data.void_refund_journal_no}`]
              .filter(Boolean)
              .join(' · ') || undefined
          : undefined,
    });
    setActionFor(null);
    setActionReason('');
    if (detail?._id === note._id) setDetail(result.data);
    await load();
  };

  const actionsFor = (n: InvoiceNote, compact = false) => {
    const busy = actingId === n._id;
    const size = compact ? 'sm' : 'default';
    return (
      <div className="inline-flex flex-wrap items-center justify-end gap-2">
        {isFm && n.status === 'PENDING_APPROVAL' && (
          <>
            <Button
              type="button"
              size={size}
              className={cn('rounded-xl bg-emerald-600 hover:bg-emerald-700', compact && 'h-9 px-3')}
              disabled={busy}
              onClick={() => void openApprove(n)}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve
            </Button>
            <Button
              type="button"
              size={size}
              variant="outline"
              className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
              disabled={busy}
              onClick={() => {
                setActionFor({ note: n, action: 'reject' });
                setActionReason('');
              }}
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
          </>
        )}
        {isFm && n.status === 'POSTED' && (
          <Button
            type="button"
            size={size}
            variant="ghost"
            className="rounded-xl text-slate-500 hover:text-rose-700"
            disabled={busy}
            onClick={() => {
              setActionFor({ note: n, action: 'void' });
              setActionReason('');
            }}
          >
            <Ban className="h-3.5 w-3.5" />
            Void
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <ErpToolbar
        title="Credit & Debit Notes"
        description="Adjustments to finance invoices after they are issued. Finance raises a note from the invoice; a Finance Manager approves it to post the journal, refund any overpayment and update the invoice balance."
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Note, invoice, AWB, customer…"
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <Button type="button" variant="outline" className="rounded-xl" asChild>
            <Link href="/dashboard/invoices">
              <FileText className="h-4 w-4" />
              Invoices
            </Link>
          </Button>
        }
      />

      <ErpStatStrip items={stats} />

      <ErpModuleBody>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TYPE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeFilter(t.id)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all',
                typeFilter === t.id
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                  : 'bg-canvas text-slate-500 ring-1 ring-slate-200/70 hover:text-brand-600'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                statusFilter === s
                  ? 'bg-slate-900 text-white dark:bg-brand-500'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-800'
              )}
            >
              {s === 'ALL' ? 'All' : NOTE_STATUS_LABEL[s]}
              {s !== 'ALL' && statusCounts[s] ? ` · ${statusCounts[s]}` : ''}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
          {loading && notes.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <ErpEmptyState
                message={
                  notes.length === 0
                    ? 'No notes yet. Open an invoice and choose “Credit / debit note”.'
                    : 'No notes match this filter.'
                }
              />
            </div>
          ) : (
            <Table className={erpTableClasses().table}>
              <TableHeader>
                <TableRow>
                  <TableHead>Note</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n) => (
                  <TableRow key={n._id}>
                    <TableCell>
                      <button
                        type="button"
                        className="flex items-center gap-2 whitespace-nowrap text-left font-semibold text-slate-900 hover:text-brand-600"
                        onClick={() => setDetail(n)}
                      >
                        {n.note_no}
                        <NoteTypePill type={n.note_type} />
                      </button>
                      <div className="text-xs text-slate-400">{fmtDate(n.note_date)}</div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/invoices/${n.invoice_id}`} className="font-medium text-slate-800 hover:text-brand-600">
                        {n.invoice_no}
                      </Link>
                      <div className="text-xs text-slate-400">{n.awb_number || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">{n.customer_name || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-slate-700">{reasonLabel(n.reason_code)}</div>
                      <div className="max-w-[220px] truncate text-xs text-slate-400">{n.reason}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className={cn('whitespace-nowrap font-semibold', n.note_type === 'CREDIT' ? 'text-sky-700' : 'text-violet-700')}>
                        {n.note_type === 'CREDIT' ? '−' : '+'}AED {money(n.total_amount)}
                      </div>
                      <div className="text-xs text-slate-400">VAT {money(n.vat_amount)}</div>
                    </TableCell>
                    <TableCell>
                      <NoteStatusPill status={n.status} />
                      {n.journal_no && <div className="mt-1 text-[11px] text-slate-400">{n.journal_no}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-2">
                        <Button type="button" size="sm" variant="ghost" className="rounded-xl" onClick={() => setDetail(n)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {actionsFor(n, true)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </ErpModuleBody>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3">
              {detail?.note_no}
              {detail && <NoteTypePill type={detail.note_type} />}
              {detail && <NoteStatusPill status={detail.status} />}
            </DialogTitle>
            <DialogDescription>
              {detail ? `Against invoice ${detail.invoice_no} · ${reasonLabel(detail.reason_code)}` : ''}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-5">
              <div className="space-y-4">
                <ErpDialogSection title="Invoice">
                  <ErpMetaGrid
                    items={[
                      { label: 'Invoice', value: detail.invoice_no },
                      { label: 'AWB', value: detail.awb_number || '—' },
                      { label: 'Customer', value: detail.customer_name || '—' },
                      { label: 'Invoice total', value: `AED ${money(detail.invoice_total)}` },
                    ]}
                  />
                </ErpDialogSection>
                <ErpDialogSection title="Ledger">
                  <ErpMetaGrid
                    items={[
                      { label: 'Journal', value: detail.journal_no || '—' },
                      { label: 'Refund', value: detail.refund_amount ? `AED ${money(detail.refund_amount)} · ${refundModeLabel(detail.refund_mode)}` : '—' },
                      { label: 'Refund journal', value: detail.refund_journal_no || '—' },
                      { label: 'Reversal', value: [detail.void_journal_no, detail.void_refund_journal_no].filter(Boolean).join(' · ') || '—' },
                    ]}
                  />
                </ErpDialogSection>
              </div>

              <ErpDialogSection title="Reason">
                <p className="text-sm text-slate-700">{detail.reason}</p>
              </ErpDialogSection>

              <ErpDialogSection title="Lines">
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <Table className={erpTableClasses().table}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Charge</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead className="text-right">VAT</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.lines.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{categoryLabel(l.category)}</TableCell>
                          <TableCell className="text-slate-600">{l.description}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(l.amount)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {l.vat_rate}% · {money(l.vat_amount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{money(l.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-6 text-sm">
                  <span className="text-slate-500">
                    Net <span className="font-semibold text-slate-900">{money(detail.subtotal)}</span>
                  </span>
                  <span className="text-slate-500">
                    VAT <span className="font-semibold text-slate-900">{money(detail.vat_amount)}</span>
                  </span>
                  <span className="text-slate-500">
                    Total <span className="font-bold text-slate-900">AED {money(detail.total_amount)}</span>
                  </span>
                </div>
              </ErpDialogSection>

              <ErpDialogSection title="History">
                <ol className="space-y-2 text-sm">
                  <li className="flex flex-wrap gap-2">
                    <span className="font-medium text-slate-800">Raised</span>
                    <span className="text-slate-500">{fmtDateTime(detail.createdAt)}</span>
                    <span className="text-slate-400">{detail.created_by_name}</span>
                  </li>
                  {detail.approved_at && (
                    <li className="flex flex-wrap gap-2">
                      <span className="font-medium text-emerald-700">Approved & posted</span>
                      <span className="text-slate-500">{fmtDateTime(detail.approved_at)}</span>
                      <span className="text-slate-400">{detail.approved_by_name}</span>
                    </li>
                  )}
                  {detail.rejected_at && (
                    <li className="flex flex-wrap gap-2">
                      <span className="font-medium text-rose-700">Rejected</span>
                      <span className="text-slate-500">{fmtDateTime(detail.rejected_at)}</span>
                      <span className="text-slate-400">{detail.rejected_by_name}</span>
                      <span className="text-slate-600">— {detail.rejection_reason}</span>
                    </li>
                  )}
                  {detail.voided_at && (
                    <li className="flex flex-wrap gap-2">
                      <span className="font-medium text-slate-700">Voided</span>
                      <span className="text-slate-500">{fmtDateTime(detail.voided_at)}</span>
                      <span className="text-slate-400">{detail.voided_by_name}</span>
                      <span className="text-slate-600">— {detail.void_reason}</span>
                    </li>
                  )}
                </ol>
              </ErpDialogSection>
            </div>
          )}

          {detail && (
            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDocumentFor(detail)}>
                <Printer className="h-4 w-4" />
                View document
              </Button>
              {actionsFor(detail)}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveFor} onOpenChange={(o) => !o && setApproveFor(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Approve {approveFor?.note_no}</DialogTitle>
            <DialogDescription>
              Posts the journal now and updates invoice {approveFor?.invoice_no}.
            </DialogDescription>
          </DialogHeader>
          {approveFor && (
            <div className="space-y-4">
              <div className="space-y-1 rounded-2xl bg-slate-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{approveFor.note_type === 'CREDIT' ? 'Credit' : 'Debit'} amount</span>
                  <span className="font-semibold">AED {money(approveFor.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount due now</span>
                  <span className="font-medium">{approveCtx ? `AED ${money(approveCtx.summary.total)}` : '…'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid so far</span>
                  <span className="font-medium">{approveCtx ? `AED ${money(approveCtx.summary.paid)}` : '…'}</span>
                </div>
                <p className="pt-1 text-xs text-slate-500">
                  {approveFor.note_type === 'CREDIT'
                    ? 'Dr revenue & VAT output / Cr Accounts Receivable'
                    : 'Dr Accounts Receivable / Cr revenue & VAT output'}
                </p>
              </div>
              {approveRefundDue > 0.009 && (
                <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <p className="text-sm text-emerald-900">
                    Customer already paid — <span className="font-semibold">AED {money(approveRefundDue)}</span> will be refunded
                    (Dr Accounts Receivable / Cr the refund account).
                  </p>
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
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setApproveFor(null)}>
              Close
            </Button>
            <Button
              type="button"
              className={erpPrimaryButtonClass()}
              disabled={!approveCtx || actingId === approveFor?._id || (approveRefundDue > 0.009 && !refundMode)}
              onClick={() => void confirmApprove()}
            >
              {actingId === approveFor?._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Approve & post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionFor} onOpenChange={(o) => !o && setActionFor(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{actionFor?.action === 'reject' ? 'Reject' : 'Void'} {actionFor?.note.note_no}</DialogTitle>
            <DialogDescription>
              {actionFor?.action === 'reject'
                ? 'Nothing has been posted yet. The note is closed and Finance can raise a corrected one.'
                : 'Reverses the note journal (and any refund journal) and restores the invoice balance.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="note-action-reason">Reason</Label>
            <Textarea
              id="note-action-reason"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={3}
              placeholder={actionFor?.action === 'reject' ? 'e.g. Weight was correct — no adjustment due' : 'e.g. Raised against the wrong invoice'}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setActionFor(null)}>
              Close
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-rose-600 hover:bg-rose-700"
              disabled={actionReason.trim().length < 3 || actingId === actionFor?.note._id}
              onClick={() => void confirmAction()}
            >
              {actionFor?.action === 'reject' ? 'Reject note' : 'Void note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceNoteDocumentDialog note={documentFor} open={!!documentFor} onOpenChange={(o) => !o && setDocumentFor(null)} />
    </div>
  );
}
