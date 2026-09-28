'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Download,
  Eye,
  FileCode,
  Loader2,
  Receipt,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { fmtDate, money } from './erp-format';
import { cn } from '@/lib/utils';

type TabId = 'documents' | 'eligible' | 'setup';

const TABS: { id: TabId; label: string }[] = [
  { id: 'documents', label: 'E-invoices' },
  { id: 'eligible', label: 'Ready to issue' },
  { id: 'setup', label: 'Setup & flow' },
];

const STATUS_FILTERS = ['ALL', 'VALIDATED', 'INVALID', 'SUBMITTED', 'DELIVERED', 'ACCEPTED', 'REJECTED', 'CANCELLED'];

const EDITABLE = ['DRAFT', 'INVALID', 'VALIDATED', 'REJECTED'];

function statusTone(status: string) {
  switch (status) {
    case 'VALIDATED':
      return 'bg-brand-50 text-brand-700 ring-brand-200';
    case 'INVALID':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'SUBMITTED':
      return 'bg-sky-50 text-sky-800 ring-sky-200';
    case 'DELIVERED':
      return 'bg-cyan-50 text-cyan-800 ring-cyan-200';
    case 'ACCEPTED':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', statusTone(status))}>
      {status}
    </span>
  );
}

export default function EInvoicingTab() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isFm = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const [tab, setTab] = useState<TabId>('documents');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [eligible, setEligible] = useState<any[]>([]);

  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejectFor, setRejectFor] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, docs, elig] = await Promise.all([
      apiClient.getEInvoicingOverview(),
      apiClient.getEInvoices(),
      apiClient.getEInvoiceEligible(),
    ]);
    if (ov.success) setOverview(ov.data);
    if (docs.success) setDocuments((docs.data as any[]) || []);
    if (elig.success) setEligible((elig.data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (!q) return true;
      return [d.einvoice_no, d.sales_invoice_no, d.buyer?.name, d.buyer?.trn]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q));
    });
  }, [documents, statusFilter, search]);

  const run = async (
    id: string,
    action: () => Promise<{ success: boolean; error?: string; data?: any }>,
    okTitle: string | ((data: any) => string)
  ) => {
    setActingId(id);
    const result = await action();
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Action failed', description: result.error });
      return null;
    }
    toast({ title: typeof okTitle === 'function' ? okTitle(result.data) : okTitle });
    await load();
    if (detail?._id === id && result.data?._id) setDetail(result.data);
    return result.data;
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail({ _id: id });
    const result = await apiClient.getEInvoice(id);
    setDetailLoading(false);
    if (!result.success) {
      setDetail(null);
      toast({ variant: 'destructive', title: 'Could not load e-invoice', description: result.error });
      return;
    }
    setDetail(result.data);
  };

  const generate = (salesInvoiceId: string) =>
    run(salesInvoiceId, () => apiClient.generateEInvoice(salesInvoiceId), (d) =>
      d?.status === 'VALIDATED' ? `${d.einvoice_no} generated and validated` : `${d?.einvoice_no} needs fixes`
    );

  const generateAll = () =>
    run('all', () => apiClient.generateAllEInvoices(), (d) =>
      `${d?.created || 0} generated · ${d?.valid || 0} valid · ${d?.invalid || 0} need fixes`
    );

  const downloadXml = async (doc: any) => {
    const result = await apiClient.downloadEInvoiceXml(doc._id, `${doc.einvoice_no}.xml`);
    if (!result.success) toast({ variant: 'destructive', title: 'Download failed', description: result.error });
  };

  const confirmReject = async () => {
    if (!rejectFor) return;
    const data = await run(
      rejectFor._id,
      () => apiClient.updateEInvoiceStatus(rejectFor._id, { status: 'REJECTED', note: rejectNote.trim() }),
      'Rejection recorded — fix the sales data and revalidate'
    );
    if (data) {
      setRejectFor(null);
      setRejectNote('');
    }
  };

  const counts = overview?.counts || {};
  const asp = overview?.asp;
  const seller = overview?.seller;

  const stats = [
    {
      label: 'Exchanged value',
      value: `AED ${money(overview?.exchanged?.total)}`,
      hint: `${overview?.exchanged?.count || 0} submitted · VAT AED ${money(overview?.exchanged?.vat)}`,
    },
    {
      label: 'Ready to issue',
      value: overview?.eligible_count ?? 0,
      hint: 'Approved sales without e-invoice',
    },
    {
      label: 'Validated',
      value: counts.VALIDATED || 0,
      hint: 'Awaiting submission',
    },
    {
      label: 'Needs attention',
      value: (counts.INVALID || 0) + (counts.REJECTED || 0),
      hint: `${counts.INVALID || 0} invalid · ${counts.REJECTED || 0} rejected`,
    },
  ];

  const actionsFor = (d: any, compact = false) => {
    const busy = actingId === d._id;
    const size = compact ? 'sm' : 'default';
    return (
      <div className="inline-flex flex-wrap justify-end gap-2">
        {!compact && (
          <Button type="button" size={size} variant="outline" className="rounded-xl" onClick={() => void downloadXml(d)}>
            <Download className="h-3.5 w-3.5" />
            XML
          </Button>
        )}
        {EDITABLE.includes(d.status) && (
          <Button
            type="button"
            size={size}
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={() => void run(d._id, () => apiClient.revalidateEInvoice(d._id), (r) =>
              r?.status === 'VALIDATED' ? 'Revalidated — ready to submit' : 'Still has validation errors'
            )}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
            Revalidate
          </Button>
        )}
        {isFm && d.status === 'VALIDATED' && d.transaction_type === 'B2B' && (
          <Button
            type="button"
            size={size}
            className={cn(erpPrimaryButtonClass(), compact && 'h-9 px-3')}
            disabled={busy}
            onClick={() => void run(d._id, () => apiClient.submitEInvoice(d._id), (r) =>
              r?.transmission_mode === 'ASP' ? `Sent to ASP · ${r?.asp_reference || ''}` : 'Recorded in sandbox (no ASP configured)'
            )}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit
          </Button>
        )}
        {isFm && ['SUBMITTED', 'DELIVERED'].includes(d.status) && (
          <>
            {d.status === 'SUBMITTED' && (
              <Button
                type="button"
                size={size}
                variant="outline"
                className="rounded-xl"
                disabled={busy}
                onClick={() => void run(d._id, () => apiClient.updateEInvoiceStatus(d._id, { status: 'DELIVERED' }), 'Marked delivered to buyer')}
              >
                Delivered
              </Button>
            )}
            <Button
              type="button"
              size={size}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              disabled={busy}
              onClick={() => void run(d._id, () => apiClient.updateEInvoiceStatus(d._id, { status: 'ACCEPTED' }), 'Marked accepted')}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Accepted
            </Button>
            <Button
              type="button"
              size={size}
              variant="outline"
              className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
              disabled={busy}
              onClick={() => {
                setRejectFor(d);
                setRejectNote('');
              }}
            >
              <XCircle className="h-3.5 w-3.5" />
              Rejected
            </Button>
          </>
        )}
        {isFm && EDITABLE.includes(d.status) && !compact && (
          <Button
            type="button"
            size={size}
            variant="ghost"
            className="rounded-xl text-slate-500 hover:text-rose-700"
            disabled={busy}
            onClick={() => void run(d._id, () => apiClient.cancelEInvoice(d._id), 'E-invoice cancelled')}
          >
            <Ban className="h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      <ErpToolbar
        title="E-Invoicing"
        description="Structured UAE e-invoices (Peppol PINT AE) generated from finance-approved Sales invoices, validated, and exchanged through your Accredited Service Provider."
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="E-invoice, invoice, buyer, TRN…"
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-xl" asChild>
              <Link href="/dashboard/accounting/sales">
                <ShoppingCart className="h-4 w-4" />
                Sales
              </Link>
            </Button>
            <Button
              type="button"
              className={erpPrimaryButtonClass()}
              disabled={actingId === 'all' || !(overview?.eligible_count > 0)}
              onClick={() => void generateAll()}
            >
              {actingId === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />}
              Generate all ({overview?.eligible_count || 0})
            </Button>
          </div>
        }
      />

      <ErpStatStrip items={stats} />

      <ErpModuleBody>
        {asp && !asp.configured && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-semibold">Sandbox mode.</span> No Accredited Service Provider is connected, so
              submissions are recorded here but <span className="font-semibold">not transmitted to the FTA</span>.
              Set <code className="rounded bg-amber-100 px-1">EINVOICE_ASP_URL</code> and{' '}
              <code className="rounded bg-amber-100 px-1">EINVOICE_ASP_API_KEY</code> on the backend to go live.
            </p>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all',
                tab === t.id
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                  : 'bg-canvas text-slate-500 ring-1 ring-slate-200/70 hover:text-brand-600'
              )}
            >
              {t.label}
              {t.id === 'eligible' && eligible.length > 0 && (
                <span className="ml-1.5 rounded-full bg-white/25 px-1.5">{eligible.length}</span>
              )}
            </button>
          ))}
        </div>

        {loading && !overview ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : null}

        {tab === 'documents' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                    statusFilter === s ? 'bg-slate-900 text-white dark:bg-brand-500' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-800'
                  )}
                >
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  {s !== 'ALL' && counts[s] ? ` · ${counts[s]}` : ''}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
              {filtered.length === 0 ? (
                <div className="p-6">
                  <ErpEmptyState
                    message={
                      documents.length === 0
                        ? 'No e-invoices yet. Approve a sales invoice or use “Ready to issue”.'
                        : 'No e-invoices match this filter.'
                    }
                  />
                </div>
              ) : (
                <Table className={erpTableClasses().table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>E-invoice</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => (
                      <TableRow key={d._id}>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left font-semibold text-slate-900 hover:text-brand-600"
                            onClick={() => void openDetail(d._id)}
                          >
                            {d.einvoice_no}
                          </button>
                          <div className="text-xs text-slate-400">
                            {d.sales_invoice_no} · {fmtDate(d.issue_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800">{d.buyer?.name || '—'}</div>
                          <div className="text-xs text-slate-400">{d.buyer?.trn ? `TRN ${d.buyer.trn}` : 'No TRN'}</div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                              d.transaction_type === 'B2B' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            {d.transaction_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className="font-semibold">
                            {d.currency} {money(d.total_amount)}
                          </div>
                          <div className="text-xs text-slate-400">VAT {money(d.vat_amount)}</div>
                        </TableCell>
                        <TableCell>
                          <StatusPill status={d.status} />
                          {d.status === 'INVALID' && d.validation_errors?.length ? (
                            <div className="mt-1 text-[11px] text-amber-700">
                              {d.validation_errors.length} error{d.validation_errors.length > 1 ? 's' : ''}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="rounded-xl"
                              onClick={() => void openDetail(d._id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {actionsFor(d, true)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}

        {tab === 'eligible' && (
          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            {eligible.length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="Every approved sales invoice already has an e-invoice." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sales invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Sales status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligible.map((s) => (
                    <TableRow key={s._id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{s.invoice_no}</div>
                        <div className="text-xs text-slate-400">{fmtDate(s.invoice_date)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-800">{s.customer_name}</div>
                        <div className="text-xs text-slate-400">
                          {s.customer_vat_trn ? `TRN ${s.customer_vat_trn}` : 'No TRN — will be B2C'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-slate-600">{s.status}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {s.currency || 'AED'} {money(s.total_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          className={cn(erpPrimaryButtonClass(), 'h-9 px-3')}
                          disabled={actingId === s._id}
                          onClick={() => void generate(s._id)}
                        >
                          {actingId === s._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileCode className="h-3.5 w-3.5" />
                          )}
                          Generate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {tab === 'setup' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-brand-500" />
                Seller profile (Corner 1)
              </p>
              <div className="mt-4">
                <ErpMetaGrid
                  items={[
                    { label: 'Legal name', value: seller?.name || '—' },
                    { label: 'TRN', value: seller?.trn || '—' },
                    { label: 'City / Emirate', value: [seller?.city, seller?.emirate].filter(Boolean).join(', ') || '—' },
                    { label: 'Street', value: seller?.street || '—' },
                    { label: 'Area', value: seller?.additional_street || '—' },
                    { label: 'Country', value: seller?.country || 'AE' },
                  ]}
                />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Override with EINVOICE_SELLER_* variables on the backend if company details change.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Send className="h-4 w-4 text-brand-500" />
                Accredited Service Provider (Corner 2)
              </p>
              <div className="mt-4">
                <ErpMetaGrid
                  items={[
                    { label: 'Mode', value: asp?.mode || '—' },
                    { label: 'Provider', value: asp?.provider || '—' },
                    { label: 'Format', value: 'UBL 2.1 · PINT AE' },
                  ]}
                />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                The ASP validates the XML, delivers it to the buyer’s ASP (Corner 3/4), and reports tax data to the
                FTA (Corner 5). Record its responses here.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 lg:col-span-2">
              <p className="text-sm font-bold text-slate-900">How it connects</p>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { icon: ShoppingCart, title: 'Sales approval', text: 'Finance approves a sales invoice — JE posts and an e-invoice is generated automatically.' },
                  { icon: ShieldCheck, title: 'Validate', text: 'TRNs, 5% / 0% VAT, line maths and totals are checked; XML is built.' },
                  { icon: Send, title: 'Submit', text: 'Finance Manager submits B2B e-invoices to the ASP.' },
                  { icon: CheckCircle2, title: 'Delivered / Accepted', text: 'Record ASP responses; rejected ones are fixed in Sales and revalidated.' },
                  { icon: Receipt, title: 'VAT201', text: 'The same approved invoices drive output VAT boxes 1–4 on the return.' },
                ].map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.title} className="rounded-2xl bg-canvas p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-500 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <Icon className="h-4 w-4 text-brand-500" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.text}</p>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-xl" asChild>
                  <Link href="/dashboard/accounting/sales">
                    <ShoppingCart className="h-4 w-4" />
                    Open Sales
                  </Link>
                </Button>
                <Button type="button" variant="outline" className="rounded-xl" asChild>
                  <Link href="/dashboard/accounting/vat201">
                    <Receipt className="h-4 w-4" />
                    Open VAT201
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </ErpModuleBody>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-3">
              {detail?.einvoice_no || 'E-invoice'}
              {detail?.status && <StatusPill status={detail.status} />}
            </DialogTitle>
            <DialogDescription>
              {detail?.sales_invoice_no ? `From sales invoice ${detail.sales_invoice_no}` : 'Loading…'}
              {detail?.uuid ? ` · UUID ${detail.uuid}` : ''}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detail?.einvoice_no ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : (
            <div className="space-y-5">
              {detail.validation_errors?.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">Fix before submitting</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                    {detail.validation_errors.map((e: string) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {detail.validation_warnings?.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Warnings</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                    {detail.validation_warnings.map((w: string) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <ErpDialogSection title="Seller">
                  <ErpMetaGrid
                    items={[
                      { label: 'Name', value: detail.seller?.name },
                      { label: 'TRN', value: detail.seller?.trn },
                      { label: 'City', value: detail.seller?.city },
                    ]}
                  />
                </ErpDialogSection>
                <ErpDialogSection title={`Buyer · ${detail.transaction_type}`}>
                  <ErpMetaGrid
                    items={[
                      { label: 'Name', value: detail.buyer?.name },
                      { label: 'TRN', value: detail.buyer?.trn || '—' },
                      { label: 'City', value: detail.buyer?.city || '—' },
                    ]}
                  />
                </ErpDialogSection>
              </div>

              <ErpDialogSection title="Lines">
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <Table className={erpTableClasses().table}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">VAT</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detail.lines || []).map((l: any) => (
                        <TableRow key={l.line_no}>
                          <TableCell className="text-slate-400">{l.line_no}</TableCell>
                          <TableCell>{l.description}</TableCell>
                          <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(l.unit_price)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {l.vat_rate}% · {money(l.line_vat)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{money(l.line_subtotal)}</TableCell>
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
                    Total{' '}
                    <span className="font-bold text-slate-900">
                      {detail.currency} {money(detail.total_amount)}
                    </span>
                  </span>
                </div>
              </ErpDialogSection>

              {(detail.transmission_mode || detail.asp_reference) && (
                <ErpDialogSection title="Transmission">
                  <ErpMetaGrid
                    items={[
                      { label: 'Mode', value: detail.transmission_mode || '—' },
                      { label: 'ASP reference', value: detail.asp_reference || '—' },
                      { label: 'Submitted', value: detail.submitted_at ? fmtDate(detail.submitted_at) : '—' },
                    ]}
                  />
                </ErpDialogSection>
              )}

              <ErpDialogSection title="History">
                <ol className="space-y-2">
                  {(detail.status_history || [])
                    .slice()
                    .reverse()
                    .map((h: any, i: number) => (
                      <li key={`${h.at}-${i}`} className="flex flex-wrap items-center gap-2 text-sm">
                        <StatusPill status={h.status} />
                        <span className="text-slate-500">{fmtDate(h.at)}</span>
                        <span className="text-slate-400">{h.by_name}</span>
                        {h.note && <span className="text-slate-600">— {h.note}</span>}
                      </li>
                    ))}
                </ol>
              </ErpDialogSection>

              {detail.xml && (
                <ErpDialogSection title="UBL XML (PINT AE)">
                  <pre className="max-h-64 overflow-auto rounded-2xl bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-200">
                    {detail.xml}
                  </pre>
                  <p className="text-[11px] text-slate-400">SHA-256 {detail.xml_sha256}</p>
                </ErpDialogSection>
              )}
            </div>
          )}

          {detail?.einvoice_no && (
            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => void downloadXml(detail)}>
                <Download className="h-4 w-4" />
                Download XML
              </Button>
              {actionsFor(detail)}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Record rejection</DialogTitle>
            <DialogDescription>
              {rejectFor?.einvoice_no} — paste the reason returned by the ASP or buyer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Reason</Label>
            <Textarea
              id="reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Buyer TRN does not match Peppol participant"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setRejectFor(null)}>
              Close
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-rose-600 hover:bg-rose-700"
              disabled={!rejectNote.trim() || actingId === rejectFor?._id}
              onClick={() => void confirmReject()}
            >
              Record rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
