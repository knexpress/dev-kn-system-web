'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { ErpEmptyState, erpTableClasses } from '@/components/accounting/erp-shell';
import { fmtDate, money } from '@/components/accounting/erp-format';
import { cn } from '@/lib/utils';
import { SalesInvoiceDocumentDialog } from '@/components/accounting/sales-invoice-document';
import {
  RecordPaymentDialog,
  invoiceCanRecordPayment,
  invoiceIsCancelled,
  invoiceStatusHint,
} from '@/components/record-payment-dialog';

const SHIPMENT_PAGE_SIZE = 100;

type Row = {
  key: string;
  kind: 'SHIPMENT' | 'SALES';
  id: string;
  number: string;
  date?: string;
  customer: string;
  reference: string;
  total: number;
  status: string;
  cancellation?: boolean;
  hint?: string | null;
  canPay?: boolean;
};

function num(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'object' && '$numberDecimal' in v) return Number(v.$numberDecimal) || 0;
  return Number(v) || 0;
}

function statusTone(status: string) {
  switch (status) {
    case 'PAID':
    case 'REMITTED':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'COLLECTED_BY_DRIVER':
    case 'PARTIALLY_PAID':
      return 'bg-violet-50 text-violet-800 ring-violet-200';
    case 'APPROVED':
      return 'bg-sky-50 text-sky-800 ring-sky-200';
    case 'UNPAID':
    case 'OVERDUE':
    case 'PENDING_APPROVAL':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'CANCELLED':
    case 'REJECTED':
      return 'bg-rose-50 text-rose-800 ring-rose-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

type Props = {
  salesInvoices: any[];
  onOpenSalesInvoices: () => void;
};

export default function AllInvoicesPanel({ salesInvoices, onOpenSalesInvoices }: Props) {
  const [shipments, setShipments] = useState<any[]>([]);
  const [shipmentTotal, setShipmentTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [kind, setKind] = useState<'ALL' | 'SHIPMENT' | 'SALES'>('ALL');
  const [status, setStatus] = useState('all');
  const [pdfInvoice, setPdfInvoice] = useState<any | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchShipments = useCallback(async (nextPage: number, query: string) => {
    setLoading(true);
    const result = await apiClient.getInvoicesUnified({
      page: nextPage,
      limit: SHIPMENT_PAGE_SIZE,
      search: query || undefined,
      useCache: false,
    });
    if (result.success && Array.isArray(result.data)) {
      const data = result.data as any[];
      setShipments((prev) => (nextPage === 1 ? data : [...prev, ...data]));
      const p = (result as any).pagination;
      setShipmentTotal(Number(p?.total ?? data.length));
      setPages(Number(p?.pages ?? 1));
      setPage(nextPage);
    } else if (nextPage === 1) {
      setShipments([]);
      setShipmentTotal(0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchShipments(1, debounced);
  }, [debounced, fetchShipments]);

  const rows = useMemo<Row[]>(() => {
    const q = debounced.toLowerCase();
    const shipmentRows: Row[] = shipments.map((inv) => ({
      key: `S-${inv._id}`,
      kind: 'SHIPMENT',
      id: String(inv._id),
      number: inv.invoice_id || '—',
      date: inv.issue_date,
      customer: inv.client_id?.company_name || inv.client_id?.contact_name || inv.receiver_name || '—',
      reference: inv.awb_number || '',
      total: num(inv.total_amount_tax_invoice) || num(inv.total_amount),
      status: inv.status || '',
      cancellation: inv.invoice_origin === 'CANCELLATION',
      hint: invoiceStatusHint(inv),
      canPay: invoiceCanRecordPayment(inv),
    }));
    const salesRows: Row[] = salesInvoices
      .filter(
        (inv) =>
          !q ||
          [inv.invoice_no, inv.customer_name, inv.customer_vat_trn].some((v) =>
            String(v || '').toLowerCase().includes(q)
          )
      )
      .map((inv) => ({
        key: `SI-${inv._id}`,
        kind: 'SALES',
        id: String(inv._id),
        number: inv.invoice_no || '—',
        date: inv.invoice_date,
        customer: inv.customer_name || '—',
        reference: inv.customer_vat_trn ? `TRN ${inv.customer_vat_trn}` : '',
        total: num(inv.total_amount),
        status: inv.status || '',
      }));
    return [...shipmentRows, ...salesRows]
      .filter((r) => kind === 'ALL' || r.kind === kind)
      .filter((r) => status === 'all' || r.status === status)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [shipments, salesInvoices, debounced, kind, status]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    shipments.forEach((i) => i.status && set.add(i.status));
    salesInvoices.forEach((i) => i.status && set.add(i.status));
    return [...set].sort();
  }, [shipments, salesInvoices]);

  const totalValue = rows.reduce((s, r) => s + (r.status === 'CANCELLED' ? 0 : r.total), 0);
  const t = erpTableClasses();

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Invoice no, AWB, customer, TRN…"
          className="h-9 max-w-xs rounded-xl"
        />
        <Select value={kind} onValueChange={(v) => setKind(v as any)}>
          <SelectTrigger className="h-9 w-[170px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value="SHIPMENT">Shipment invoices</SelectItem>
            <SelectItem value="SALES">Sales invoices</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[180px] rounded-xl">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-slate-500">
          {rows.length} shown · AED <span className="font-semibold text-slate-800">{money(totalValue)}</span>
          {loading ? <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" /> : null}
        </div>
      </div>

      {rows.length === 0 && !loading ? (
        <div className="p-6">
          <ErpEmptyState message="No invoices match these filters." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className={t.table}>
            <TableHeader>
              <TableRow>
                <TableHead className={t.head}>Type</TableHead>
                <TableHead className={t.head}>Invoice</TableHead>
                <TableHead className={t.head}>Date</TableHead>
                <TableHead className={t.head}>Customer</TableHead>
                <TableHead className={t.head}>AWB / Ref</TableHead>
                <TableHead className={cn(t.head, 'text-right')}>Total</TableHead>
                <TableHead className={t.head}>Status</TableHead>
                <TableHead className={cn(t.head, 'text-right')} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key} className={cn(t.row, t.rowAlt)}>
                  <TableCell className={t.cell}>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1',
                        r.kind === 'SHIPMENT'
                          ? 'bg-sky-50 text-sky-700 ring-sky-200'
                          : 'bg-indigo-50 text-indigo-700 ring-indigo-200'
                      )}
                    >
                      {r.kind === 'SHIPMENT' ? (r.cancellation ? 'Cancellation' : 'Shipment') : 'Sales'}
                    </span>
                  </TableCell>
                  <TableCell className={cn(t.cell, 'font-mono font-medium')}>{r.number}</TableCell>
                  <TableCell className={t.cell}>{r.date ? fmtDate(r.date) : '—'}</TableCell>
                  <TableCell className={cn(t.cell, 'max-w-[220px] truncate')}>{r.customer}</TableCell>
                  <TableCell className={cn(t.cell, 'font-mono text-xs text-slate-500')}>{r.reference || '—'}</TableCell>
                  <TableCell className={cn(t.cell, 'text-right font-semibold tabular-nums')}>
                    AED {money(r.total)}
                  </TableCell>
                  <TableCell className={t.cell}>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                        statusTone(r.status)
                      )}
                    >
                      {invoiceIsCancelled({ status: r.status })
                        ? 'Cancelled'
                        : r.status.replace(/_/g, ' ') || '—'}
                    </span>
                    {r.hint ? (
                      <div
                        className={cn(
                          'mt-1 max-w-[160px] text-[11px] leading-tight',
                          invoiceIsCancelled({ status: r.status }) ? 'text-rose-700' : 'text-amber-700'
                        )}
                      >
                        {r.hint}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className={cn(t.cell, 'text-right')}>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {r.kind === 'SHIPMENT' && r.canPay ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                          onClick={() =>
                            setPaymentInvoice(shipments.find((inv) => String(inv._id) === r.id) || null)
                          }
                        >
                          <Wallet className="mr-1 h-3.5 w-3.5" />
                          Record payment
                        </Button>
                      ) : null}
                      {r.kind === 'SHIPMENT' ? (
                        <Button type="button" size="sm" variant="outline" className="rounded-xl" asChild>
                          <Link href={`/dashboard/invoices/${r.id}`}>View / PDF</Link>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() =>
                            setPdfInvoice(salesInvoices.find((inv) => String(inv._id) === r.id) || null)
                          }
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {page < pages ? (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>
            Loaded {shipments.length} of {shipmentTotal} shipment invoices
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={loading}
            onClick={() => void fetchShipments(page + 1, debounced)}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Load more
          </Button>
        </div>
      ) : null}

      <SalesInvoiceDocumentDialog
        invoice={pdfInvoice}
        open={Boolean(pdfInvoice)}
        onOpenChange={(open) => !open && setPdfInvoice(null)}
        onInvoiceChange={(id, patch) => {
          setPdfInvoice((prev: any) => (prev && String(prev._id) === id ? { ...prev, ...patch } : prev));
        }}
      />

      <RecordPaymentDialog
        invoice={paymentInvoice}
        open={Boolean(paymentInvoice)}
        onOpenChange={(open) => !open && setPaymentInvoice(null)}
        onUpdated={(updated) => {
          if (!updated?._id) return;
          setShipments((prev) =>
            prev.map((inv) => (String(inv._id) === String(updated._id) ? { ...inv, ...updated } : inv))
          );
          setPaymentInvoice((current: any) =>
            current && String(current._id) === String(updated._id) ? { ...current, ...updated } : current
          );
        }}
      />
    </div>
  );
}
