'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, Loader2, Printer, Search } from 'lucide-react';
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
import { apiClient } from '@/lib/api-client';
import { ErpEmptyState, erpPrimaryButtonClass, erpTableClasses } from './erp-shell';
import {
  BillWiseStatementDocument,
  amountDr,
  fmtBillDate,
  overdueByDays,
  type BillWiseRow,
} from './bill-wise-statement-document';
import { cn } from '@/lib/utils';

const PAY_FILTERS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All invoices' },
  { id: 'UNPAID', label: 'Pending / unpaid' },
  { id: 'PARTIAL', label: 'Partially paid' },
  { id: 'PAID', label: 'Paid' },
];

type Props = {
  customers: any[];
};

export default function CustomerUnpaidSummaryPanel({ customers }: Props) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [customerKey, setCustomerKey] = useState('ALL');
  const [kind, setKind] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [data, setData] = useState<any | null>(null);

  const customerOptions = useMemo(() => {
    const rows = (customers || [])
      .map((c) => ({
        key: String(c._id),
        id: String(c._id),
        name: String(c.legal_name || c.trade_name || '').trim(),
      }))
      .filter((c) => c.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    return [{ key: 'ALL', id: '', name: 'All customers' }, ...rows];
  }, [customers]);

  const selectedLabel =
    customerOptions.find((c) => c.key === customerKey)?.name || 'All customers';

  const load = useCallback(async () => {
    setLoading(true);
    const opt = customerOptions.find((c) => c.key === customerKey);
    // Pass customer name for shipment invoices (matched on receiver_name) when a VAT trader is selected
    const result = await apiClient.getUnpaidInvoiceSummary({
      customer_id: opt?.id || undefined,
      customer_name: opt?.id
        ? opt.name
        : q.trim() || undefined,
      kind,
      payment_status: paymentStatus,
      from: from || undefined,
      to: to || undefined,
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
  }, [customerKey, customerOptions, kind, paymentStatus, from, to, q, toast]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerKey, kind, paymentStatus, from, to]);

  const invoices: BillWiseRow[] = useMemo(() => {
    const rows = (data?.invoices || []) as any[];
    const term = q.trim().toLowerCase();
    const filtered =
      !term || customerKey !== 'ALL'
        ? rows
        : rows.filter((r) =>
            [r.customer_name, r.invoice_no, r.reference]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(term))
          );
    return filtered.map((r) => ({
      invoice_date: r.invoice_date,
      invoice_no: r.invoice_no,
      reference: r.reference,
      total_amount: Number(r.total_amount || 0),
      outstanding: Number(r.outstanding || 0),
      due_date: r.due_date || r.invoice_date,
      customer_name: r.customer_name,
      kind: r.kind,
      status: r.pay_status || r.status,
      pay_status: r.pay_status,
    }));
  }, [data, q, customerKey]);

  const parties = useMemo(() => {
    const map = new Map<string, BillWiseRow[]>();
    for (const r of invoices) {
      const name = r.customer_name || 'Unknown customer';
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(r);
    }
    return [...map.entries()].map(([customer_name, rows]) => ({ customer_name, rows }));
  }, [invoices]);

  const asOf = data?.as_of ? new Date(data.as_of) : new Date();
  const rangeFrom = from || data?.filters?.from || null;
  const rangeTo = to || data?.filters?.to || (asOf.toISOString().slice(0, 10) as string);
  const totals = data?.totals;
  const totalOpening = invoices.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalPending = invoices.reduce((s, r) => s + Number(r.outstanding || 0), 0);

  const fileStub = useMemo(() => {
    const safe = String(selectedLabel)
      .replace(/[^\w\-]+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 36);
    const day = asOf.toISOString().slice(0, 10);
    return `Sales-Statement-${safe || 'All'}-${day}`;
  }, [selectedLabel, asOf]);

  const downloadExcel = async () => {
    if (!data) {
      toast({ variant: 'destructive', title: 'Nothing to export', description: 'Load the summary first.' });
      return;
    }
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const filterLabel =
        PAY_FILTERS.find((f) => f.id === paymentStatus)?.label || paymentStatus;
      const cover = XLSX.utils.aoa_to_sheet([
        ['KNEX DELIVERY SERVICES L.L.C.'],
        ['Rocky Warehouse # 19, Al Qusais Industrial Area 1, Dubai, UAE'],
        ['TRN: 104131637100003'],
        [],
        [selectedLabel === 'All customers' ? 'All customers' : selectedLabel],
        ['Customer statement — Bill-wise Details'],
        [
          `${rangeFrom ? fmtBillDate(rangeFrom) : '…'} to ${fmtBillDate(rangeTo)}`,
        ],
        ['As of', fmtBillDate(asOf)],
        ['Invoice type', kind === 'ALL' ? 'Shipment + Sales' : kind],
        ['Payment filter', filterLabel],
        [],
        ['Total Opening Amount (Dr)', Number(totalOpening.toFixed(2))],
        ['Total Pending Amount (Dr)', Number(totalPending.toFixed(2))],
        ['Invoices', invoices.length],
        ['Paid', totals?.paid_count ?? '—'],
        ['Unpaid / open', totals?.unpaid_count ?? '—'],
        ['Customers', parties.length],
      ]);
      XLSX.utils.book_append_sheet(wb, cover, 'Cover');

      const billRows = invoices.map((r) => [
        r.customer_name || '',
        fmtBillDate(r.invoice_date),
        r.invoice_no || r.reference || '',
        Number(r.total_amount || 0),
        Number(r.outstanding || 0),
        fmtBillDate(r.due_date || r.invoice_date),
        overdueByDays(r.due_date || r.invoice_date, asOf),
        r.kind || '',
        r.pay_status || r.status || '',
      ]);
      const billSheet = XLSX.utils.aoa_to_sheet([
        [
          'Customer',
          'Date',
          'Ref. No.',
          'Opening Amount',
          'Pending Amount',
          'Due on',
          'Overdue by days',
          'Type',
          'Payment status',
        ],
        ...(billRows.length
          ? billRows
          : [['No bills in this filter.', '', '', '', '', '', '', '', '']]),
        [],
        ['', '', 'Total', Number(totalOpening.toFixed(2)), Number(totalPending.toFixed(2)), '', '', '', ''],
      ]);
      XLSX.utils.book_append_sheet(wb, billSheet, 'Bill-wise Details');

      const byCust = (data.by_customer || []).map((c: any) => [
        c.customer_name,
        c.invoice_count,
        c.paid_count ?? '',
        c.unpaid_count ?? '',
        c.total_invoiced,
        c.amount_paid,
        c.outstanding,
        c.overdue_count,
      ]);
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([
          [
            'Customer',
            'Invoices',
            'Paid',
            'Open',
            'Opening / Invoiced',
            'Amount paid',
            'Pending',
            'Overdue count',
          ],
          ...byCust,
        ]),
        'By customer'
      );

      XLSX.writeFile(wb, `${fileStub}.xlsx`);
      toast({
        title: 'Excel downloaded',
        description: 'Complete customer history for the applied filters.',
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
    if (!printRef.current || !invoices.length) {
      toast({
        variant: 'destructive',
        title: 'Nothing to export',
        description: 'No bills for the current filters.',
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
        description: 'Bill-wise customer statement for the applied filters.',
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
            <h3 className="text-base font-semibold text-slate-900">Customer statement</h3>
            <p className="mt-1 text-sm text-slate-500">
              Filter by customer, payment status, and dates — then download the complete bill-wise
              history (paid &amp; unpaid) as PDF or Excel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={!data || loading || !invoices.length}
              onClick={() => setPreviewOpen(true)}
            >
              <FileText className="h-4 w-4" />
              Preview PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={exporting !== null || loading || !invoices.length}
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
              disabled={exporting !== null || loading || !data || !invoices.length}
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
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2 sm:col-span-2">
            <Label>Customer</Label>
            <Select value={customerKey} onValueChange={setCustomerKey}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                {customerOptions.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.name}
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
            <Label>Invoice type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Shipment + Sales</SelectItem>
                <SelectItem value="SHIPMENT">Shipment only</SelectItem>
                <SelectItem value="SALES">Sales only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl" />
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void load();
              }}
              className="rounded-xl pl-9"
              placeholder="Filter by customer / invoice…"
              disabled={customerKey !== 'ALL'}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply filters'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            disabled={!from && !to && !q && paymentStatus === 'ALL' && kind === 'ALL'}
            onClick={() => {
              setFrom('');
              setTo('');
              setQ('');
              setPaymentStatus('ALL');
              setKind('ALL');
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Customers', value: String(parties.length), hint: 'In current filter' },
              {
                label: 'Invoices',
                value: String(invoices.length),
                hint: totals
                  ? `${totals.paid_count ?? 0} paid · ${totals.unpaid_count ?? 0} open`
                  : '—',
              },
              {
                label: 'Opening total',
                value: amountDr(totalOpening),
                hint: 'Invoice amounts',
              },
              {
                label: 'Pending total',
                value: amountDr(totalPending),
                hint: 'Outstanding Dr',
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-3xl border border-slate-200/70 bg-white/90 px-4 py-3"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                  {card.label}
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{card.value}</p>
                <p className="mt-0.5 text-xs text-slate-400">{card.hint}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Bill-wise Details</p>
                <p className="text-xs text-slate-400">
                  {fmtBillDate(rangeFrom)} to {fmtBillDate(rangeTo)} · {selectedLabel}
                </p>
              </div>
            </div>
            {invoices.length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No invoices match these filters." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    {customerKey === 'ALL' ? <TableHead>Customer</TableHead> : null}
                    <TableHead>Date</TableHead>
                    <TableHead>Ref. No.</TableHead>
                    <TableHead className="text-right">Opening Amount</TableHead>
                    <TableHead className="text-right">Pending Amount</TableHead>
                    <TableHead className="text-right">Due on</TableHead>
                    <TableHead className="text-right">Overdue by days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((r, idx) => (
                    <TableRow key={`${r.invoice_no}-${idx}`}>
                      {customerKey === 'ALL' ? (
                        <TableCell className="font-medium">{r.customer_name}</TableCell>
                      ) : null}
                      <TableCell>{fmtBillDate(r.invoice_date)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.invoice_no}</div>
                        {r.kind ? (
                          <div className="text-[11px] text-slate-400">
                            {r.kind === 'SHIPMENT' ? 'Shipment' : 'Sales'}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {amountDr(Number(r.total_amount || 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-rose-700">
                        {amountDr(Number(r.outstanding || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmtBillDate(r.due_date || r.invoice_date)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          overdueByDays(r.due_date || r.invoice_date, asOf) > 0
                            ? 'text-rose-700 font-semibold'
                            : 'text-slate-500'
                        )}
                      >
                        {overdueByDays(r.due_date || r.invoice_date, asOf)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50 font-semibold">
                    <TableCell
                      colSpan={customerKey === 'ALL' ? 3 : 2}
                      className="text-right text-slate-600"
                    >
                      Total
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {amountDr(totalOpening)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-rose-700">
                      {amountDr(totalPending)}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}

      {/* Off-screen / dialog render target for PDF */}
      <div className="fixed left-[-10000px] top-0 w-[210mm]" aria-hidden>
        <div ref={printRef} className="theme-light bg-white">
          <BillWiseStatementDocument
            parties={parties}
            from={rangeFrom}
            to={rangeTo}
            asOf={asOf}
            showCustomerColumn={false}
          />
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Bill-wise Details</DialogTitle>
            <DialogDescription>
              {selectedLabel} · {fmtBillDate(rangeFrom)} to {fmtBillDate(rangeTo)}
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
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setPreviewOpen(false)}>
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
