'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, FileText, Loader2, Printer, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { ErpEmptyState, erpPrimaryButtonClass, erpTableClasses } from './erp-shell';
import { fmtDate, money } from './erp-format';
import { SupplierPaymentVoucherDialog } from './supplier-payment-voucher-document';
import {
  BillWiseStatementDocument,
  fmtBillDate,
  overdueByDays,
  type BillWiseRow,
} from './bill-wise-statement-document';
import { cn } from '@/lib/utils';

const PAY_FILTERS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All invoices' },
  { id: 'PENDING', label: 'Pending / unpaid' },
  { id: 'PARTIAL', label: 'Partially paid' },
  { id: 'AWAITING_CLEARANCE', label: 'Awaiting clearance' },
  { id: 'PAID', label: 'Paid' },
];

function payTone(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'PARTIAL':
      return 'bg-sky-50 text-sky-800 ring-sky-200';
    case 'AWAITING_CLEARANCE':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    default:
      return 'bg-rose-50 text-rose-700 ring-rose-200';
  }
}

function payLabel(status: string) {
  switch (status) {
    case 'PAID':
      return 'Paid';
    case 'PARTIAL':
      return 'Partial';
    case 'AWAITING_CLEARANCE':
      return 'Awaiting clearance';
    default:
      return 'Pending';
  }
}

type Props = {
  suppliers: any[];
  orders?: any[];
};

export default function PurchaseStatementPanel({ suppliers, orders = [] }: Props) {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isFm = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const [supplierKey, setSupplierKey] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [voucherPayment, setVoucherPayment] = useState<any | null>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const supplierOptions = useMemo(() => {
    const seen = new Set<string>();
    const rows: { key: string; id?: string; name: string }[] = [];
    const add = (id: string | undefined, nameRaw: string) => {
      const name = String(nameRaw || '').trim();
      if (!name) return;
      const key = id ? `id:${id}` : `name:${name.toLowerCase()}`;
      const nameKey = `name:${name.toLowerCase()}`;
      if (seen.has(key) || seen.has(nameKey)) return;
      seen.add(key);
      seen.add(nameKey);
      rows.push({ key, id, name });
    };
    for (const s of suppliers || []) add(s._id, s.name);
    for (const po of orders || []) add(po.supplier_id, po.supplier_name);
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers, orders]);

  const loadStatement = useCallback(async () => {
    if (!supplierKey) {
      setData(null);
      return;
    }
    const opt = supplierOptions.find((s) => s.key === supplierKey);
    if (!opt) return;

    setLoading(true);
    const result = await apiClient.getPurchaseStatement({
      supplier_id: opt.id,
      supplier_name: opt.name,
      payment_status: paymentStatus,
      from: from || undefined,
      to: to || undefined,
      q: q.trim() || undefined,
    });
    setLoading(false);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Could not load statement',
        description: result.error || 'Try again',
      });
      return;
    }
    setData(result.data);
  }, [supplierKey, supplierOptions, paymentStatus, from, to, q, toast]);

  useEffect(() => {
    if (!supplierKey) {
      setData(null);
      return;
    }
    void loadStatement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierKey, paymentStatus, from, to]);

  const approvePayment = async (payment: any) => {
    setActingId(payment._id);
    const result = await apiClient.approveSupplierPayment(payment._id);
    setActingId(null);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Approve failed',
        description: result.error || 'Could not clear payment',
      });
      return;
    }
    const cleared = (result.data as any)?.payment || {
      ...payment,
      status: 'APPROVED',
      journal_entry_no: (result.data as any)?.journal?.entry_no || payment.journal_entry_no,
    };
    toast({
      title: 'Payment cleared',
      description: `${cleared.payment_no || payment.payment_no} — journal ${
        (result.data as any)?.journal?.entry_no || cleared.journal_entry_no || ''
      } posted.`,
    });
    setVoucherPayment(cleared);
    await loadStatement();
  };

  const openVoucher = (payment: any) => {
    setVoucherPayment(payment);
    setVoucherOpen(true);
  };

  const summary = data?.summary;
  const invoices = data?.invoices || [];
  const payments = data?.payments || [];
  const supplier = data?.supplier;
  const asOfDate = useMemo(() => new Date(), [data]);
  const asOf = asOfDate;
  const rangeFrom = from || null;
  const rangeTo = to || asOfDate.toISOString().slice(0, 10);

  const billRows: BillWiseRow[] = useMemo(
    () =>
      invoices.map((inv: any) => ({
        invoice_date: inv.supplier_invoice_date || inv.po_date,
        invoice_no: inv.supplier_invoice_no || inv.po_no,
        reference: inv.po_no,
        total_amount: Number(inv.total_amount || 0),
        // Pending = still owed (0 when fully paid)
        outstanding: Number(inv.owed_now ?? inv.left_to_pay ?? 0),
        due_date: inv.due_date || inv.supplier_invoice_date || inv.po_date,
        customer_name: supplier?.name || '',
        kind: inv.pay_status,
        status: inv.pay_status,
      })),
    [invoices, supplier?.name]
  );

  const parties = useMemo(
    () => [
      {
        customer_name: supplier?.name || 'Supplier',
        rows: billRows,
      },
    ],
    [supplier?.name, billRows]
  );

  const totalOpening = billRows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalPending = billRows.reduce((s, r) => s + Number(r.outstanding || 0), 0);

  const fileStub = useMemo(() => {
    const safe = String(supplier?.name || 'Supplier')
      .replace(/[^\w\-]+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 36);
    return `Purchase-Statement-${safe}-${asOfDate.toISOString().slice(0, 10)}`;
  }, [supplier?.name, asOfDate]);

  const downloadExcel = async () => {
    if (!data || !billRows.length) {
      toast({
        variant: 'destructive',
        title: 'Nothing to export',
        description: 'Apply filters so the statement has invoices.',
      });
      return;
    }
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const filterLabel =
        PAY_FILTERS.find((f) => f.id === paymentStatus)?.label || paymentStatus;

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ['KNEX DELIVERY SERVICES L.L.C.'],
          ['Rocky Warehouse # 19, Al Qusais Industrial Area 1, Dubai, UAE'],
          ['TRN: 104131637100003'],
          [],
          [supplier?.name || 'Supplier'],
          ['Statement of purchase — Bill-wise Details'],
          [`${fmtBillDate(rangeFrom)} to ${fmtBillDate(rangeTo)}`],
          ['Payment filter', filterLabel],
          ['Search', q.trim() || '—'],
          ['As of', fmtBillDate(asOf)],
          [],
          ['Invoices', summary?.invoice_count || billRows.length],
          ['Opening total (Dr)', Number(totalOpening.toFixed(2))],
          ['Pending total (Dr)', Number(totalPending.toFixed(2))],
          ['Paid (cleared)', Number(summary?.paid || 0)],
          ['Outstanding', Number(summary?.outstanding || 0)],
        ]),
        'Cover'
      );

      const detail = billRows.map((r) => [
        fmtBillDate(r.invoice_date),
        r.invoice_no || '',
        r.reference || '',
        Number(r.total_amount || 0),
        Number(r.outstanding || 0),
        fmtBillDate(r.due_date),
        overdueByDays(r.due_date, asOf),
        r.status || '',
      ]);
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          [
            'Date',
            'Ref. No.',
            'PO',
            'Opening Amount',
            'Pending Amount',
            'Due on',
            'Overdue by days',
            'Payment status',
          ],
          ...detail,
          [],
          ['', '', 'Total', Number(totalOpening.toFixed(2)), Number(totalPending.toFixed(2)), '', '', ''],
        ]),
        'Bill-wise Details'
      );

      const payRows = payments.map((p: any) => [
        p.payment_no,
        fmtBillDate(p.payment_date),
        p.purchase_order_no || p.supplier_reference || '',
        Number(p.amount || 0),
        p.status,
        p.bank_cash_account_name || '',
        p.journal_entry_no || '',
      ]);
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          ['Payment No', 'Date', 'PO / Ref', 'Amount', 'Status', 'Paid from', 'Journal'],
          ...(payRows.length ? payRows : [['No payments in this statement.', '', '', '', '', '', '']]),
        ]),
        'Payments'
      );

      XLSX.writeFile(wb, `${fileStub}.xlsx`);
      toast({
        title: 'Excel downloaded',
        description: 'Complete supplier history for the applied filters.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Excel export failed',
        description: e?.message || 'Could not build Excel file',
      });
    } finally {
      setExporting(null);
    }
  };

  const downloadPdf = async () => {
    if (!printRef.current || !billRows.length) {
      toast({
        variant: 'destructive',
        title: 'Nothing to export',
        description: 'Apply filters so the statement has invoices.',
      });
      return;
    }
    setExporting('pdf');
    try {
      const mod = await import('html2pdf.js');
      const html2pdf = (mod as any).default || mod;
      await html2pdf()
        .set({
          margin: 0.35,
          filename: `${fileStub}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(printRef.current)
        .save();
      toast({
        title: 'PDF downloaded',
        description: 'Bill-wise purchase statement for the applied filters.',
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'PDF export failed',
        description: e?.message || 'Could not build PDF',
      });
    } finally {
      setExporting(null);
    }
  };

  const printStatement = () => {
    if (!printRef.current) return;
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) return;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('');
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    };
    doc.open();
    doc.write(
      `<!doctype html><html><head><base href="${window.location.origin}/"><title>${fileStub}</title>${styles}</head><body>${printRef.current.innerHTML}</body></html>`
    );
    doc.close();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Statement of purchase</h3>
            <p className="mt-1 text-sm text-slate-500">
              Select a supplier and filters, then download the complete bill-wise history (paid &amp;
              unpaid) as PDF or Excel.
            </p>
          </div>
          {supplierKey && data ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={!billRows.length}
                onClick={() => setPreviewOpen(true)}
              >
                <FileText className="h-4 w-4" />
                Preview PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={exporting !== null || !billRows.length}
                onClick={() => void downloadPdf()}
              >
                {exporting === 'pdf' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PDF
              </Button>
              <Button
                type="button"
                className={erpPrimaryButtonClass()}
                disabled={exporting !== null || !billRows.length}
                onClick={() => void downloadExcel()}
              >
                {exporting === 'excel' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download Excel
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2 sm:col-span-2 lg:col-span-2">
            <Label>Supplier</Label>
            <Select value={supplierKey} onValueChange={setSupplierKey}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Choose supplier" />
              </SelectTrigger>
              <SelectContent>
                {supplierOptions.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Payment status</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_FILTERS.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadStatement();
              }}
              className="rounded-xl pl-9"
              placeholder="Search PO / invoice / journal…"
              disabled={!supplierKey}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={!supplierKey || loading}
            onClick={() => void loadStatement()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply filters'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            disabled={!from && !to && !q && paymentStatus === 'ALL'}
            onClick={() => {
              setFrom('');
              setTo('');
              setQ('');
              setPaymentStatus('ALL');
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {!supplierKey ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-8">
          <ErpEmptyState message="Select a supplier to open their statement of purchase." />
        </div>
      ) : loading && !data ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {supplier ? (
            <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-5 py-4 sm:px-6">
              <p className="text-lg font-semibold tracking-tight text-slate-900">{supplier.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {[
                  supplier.trn ? `TRN ${supplier.trn}` : null,
                  supplier.phone,
                  supplier.email,
                  supplier.payment_terms_days != null
                    ? `${supplier.payment_terms_days} day terms`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No contact details on file'}
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Invoices',
                value: String(summary?.invoice_count || 0),
                hint: `${summary?.pending_count || 0} open · ${summary?.paid_count || 0} paid`,
              },
              {
                label: 'Invoiced',
                value: `AED ${money(summary?.total_invoiced)}`,
                hint: 'PO totals in filter',
              },
              {
                label: 'Paid',
                value: `AED ${money(summary?.paid)}`,
                hint: `+ AED ${money(summary?.pending_clearance)} awaiting`,
              },
              {
                label: 'Outstanding',
                value: `AED ${money(summary?.outstanding)}`,
                hint: 'Billed less cleared',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                  {card.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{card.value}</p>
                <p className="mt-0.5 text-xs text-slate-400">{card.hint}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
              Invoices
            </div>
            {invoices.length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No invoices match these filters for this supplier." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice / PO</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Linked payments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv._id}>
                      <TableCell>
                        <div className="font-medium">{inv.supplier_invoice_no || inv.po_no}</div>
                        <div className="text-xs text-slate-400">
                          {inv.po_no}
                          {inv.supplier_invoice_date
                            ? ` · ${fmtDate(inv.supplier_invoice_date)}`
                            : inv.po_date
                              ? ` · ${fmtDate(inv.po_date)}`
                              : ''}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {inv.due_date ? fmtDate(inv.due_date) : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        AED {money(inv.total_amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-600">
                        AED {money(inv.paid)}
                        {inv.pending > 0.009 ? (
                          <div className="text-[11px] text-amber-700">
                            + {money(inv.pending)} pending
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums font-semibold',
                          inv.owed_now > 0.009 ? 'text-rose-700' : 'text-emerald-700'
                        )}
                      >
                        AED {money(inv.owed_now)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                            payTone(inv.pay_status)
                          )}
                        >
                          {payLabel(inv.pay_status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {(inv.payments || []).length === 0 ? (
                          '—'
                        ) : (
                          <ul className="space-y-1">
                            {inv.payments.map((p: any) => (
                              <li key={p._id} className="flex flex-wrap items-center gap-2">
                                <span>
                                  {p.payment_no} · AED {money(p.amount)}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 rounded-lg px-2 text-xs"
                                  onClick={() => openVoucher(p)}
                                >
                                  <FileText className="h-3 w-3" />
                                  PDF
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
              Payments — approve &amp; download vouchers
            </div>
            {payments.length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No supplier payments for this statement yet." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>PO / ref</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any) => {
                    const pending = p.status === 'PENDING_APPROVAL';
                    return (
                      <TableRow key={p._id}>
                        <TableCell>
                          <div className="font-medium">{p.payment_no}</div>
                          <div className="text-xs text-slate-400">{fmtDate(p.payment_date)}</div>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {p.purchase_order_no || p.supplier_reference || '—'}
                          {p.journal_entry_no ? (
                            <div className="text-xs text-slate-400">{p.journal_entry_no}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {p.bank_cash_account_name || '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          AED {money(p.amount)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                              pending
                                ? 'bg-amber-50 text-amber-800 ring-amber-200'
                                : p.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                                  : 'bg-slate-50 text-slate-600 ring-slate-200'
                            )}
                          >
                            {pending ? 'Draft / awaiting' : String(p.status || '').replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => openVoucher(p)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF / print
                            </Button>
                            {isFm && pending ? (
                              <Button
                                type="button"
                                size="sm"
                                className={cn(erpPrimaryButtonClass(), 'bg-emerald-600 hover:bg-emerald-700')}
                                disabled={actingId === p._id}
                                onClick={() => void approvePayment(p)}
                              >
                                {actingId === p._id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Approve
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}

      <SupplierPaymentVoucherDialog
        payment={voucherPayment}
        open={voucherOpen}
        onOpenChange={setVoucherOpen}
        canApprove={isFm}
        onApprove={async (payment) => {
          await approvePayment(payment);
        }}
      />

      {/* Off-screen render target for PDF */}
      <div className="fixed left-[-10000px] top-0 w-[210mm]" aria-hidden>
        <div ref={printRef} className="theme-light bg-white">
          <BillWiseStatementDocument
            parties={parties}
            from={rangeFrom}
            to={rangeTo}
            asOf={asOf}
            reportTitle="Bill-wise Details"
          />
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Bill-wise Details</DialogTitle>
            <DialogDescription>
              {supplier?.name || 'Supplier'} · {fmtBillDate(rangeFrom)} to {fmtBillDate(rangeTo)}
              {paymentStatus !== 'ALL'
                ? ` · ${PAY_FILTERS.find((f) => f.id === paymentStatus)?.label || paymentStatus}`
                : ' · All invoices (paid & unpaid)'}
            </DialogDescription>
          </DialogHeader>
          <div className="theme-light overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <BillWiseStatementDocument
              parties={parties}
              from={rangeFrom}
              to={rangeTo}
              asOf={asOf}
              reportTitle="Bill-wise Details"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={printStatement}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={exporting !== null}
              onClick={() => void downloadPdf()}
            >
              {exporting === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>
            <Button
              type="button"
              className={erpPrimaryButtonClass()}
              disabled={exporting !== null}
              onClick={() => void downloadExcel()}
            >
              {exporting === 'excel' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
