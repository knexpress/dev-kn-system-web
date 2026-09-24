'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Loader2,
  RefreshCw,
  Landmark,
  ShoppingCart,
  ClipboardList,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ErpEmptyState,
  ErpStatStrip,
  ErpToolbar,
  erpPrimaryButtonClass,
  erpTableClasses,
} from './erp-shell';
import { fmtDate, money } from './erp-format';
import { cn } from '@/lib/utils';

type TabId = 'compute' | 'boxes' | 'sources' | 'returns';

const TABS: { id: TabId; label: string }[] = [
  { id: 'compute', label: 'Period compute' },
  { id: 'boxes', label: 'VAT201 boxes' },
  { id: 'sources', label: 'Source docs' },
  { id: 'returns', label: 'Filed returns' },
];

function statusTone(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-50 text-slate-700 ring-slate-200';
    case 'READY':
      return 'bg-sky-50 text-sky-800 ring-sky-200';
    case 'FILED':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'SETTLED':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

function quarterDefaults() {
  const now = new Date();
  const start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`,
  };
}

const BOX_ROWS: { key: string; label: string; section: string }[] = [
  { key: '1a_abu_dhabi', label: '1a — Abu Dhabi standard rated supplies', section: 'Output' },
  { key: '1b_dubai', label: '1b — Dubai standard rated supplies', section: 'Output' },
  { key: '1c_sharjah', label: '1c — Sharjah standard rated supplies', section: 'Output' },
  { key: '1d_ajman', label: '1d — Ajman standard rated supplies', section: 'Output' },
  { key: '1e_uaq', label: '1e — Umm Al Quwain standard rated supplies', section: 'Output' },
  { key: '1f_rak', label: '1f — Ras Al Khaimah standard rated supplies', section: 'Output' },
  { key: '1g_fujairah', label: '1g — Fujairah standard rated supplies', section: 'Output' },
  { key: 'box2_tourist_refunds', label: '2 — Tax refunds provided', section: 'Output' },
  { key: 'box3_total_supplies', label: '3 — Total supplies (1a–1g + 2)', section: 'Output' },
  { key: 'box4_output_vat', label: '4 — VAT due on supplies (output)', section: 'Output' },
  { key: 'box5_rcm_supplies', label: '5 — Expenses subject to reverse charge', section: 'Output' },
  { key: 'box6_rcm_vat', label: '6 — Reverse charge VAT', section: 'Output' },
  { key: 'box7_zero_rated_goods', label: '7 — Zero-rated supplies', section: 'Output' },
  { key: 'box8_exempt', label: '8 — Exempt supplies', section: 'Output' },
  { key: 'box9_imports', label: '9 — Goods imported into the UAE', section: 'Output' },
  { key: 'box10_adjustments_output', label: '10 — Adjustments to output tax', section: 'Output' },
  { key: 'box11_total_output_vat', label: '11 — Total output VAT due', section: 'Output' },
  { key: 'box12_expenses_ex_vat', label: '12 — Standard rated expenses (excl. VAT)', section: 'Input' },
  { key: 'box13_input_vat', label: '13 — VAT paid / recoverable (input)', section: 'Input' },
  { key: 'box14_adjustments_input', label: '14 — Adjustments to input tax', section: 'Input' },
  { key: 'box15_total_recoverable', label: '15 — Total recoverable VAT', section: 'Input' },
  { key: 'box16_net_vat', label: '16 — Net VAT payable / (refundable)', section: 'Net' },
];

export default function Vat201Tab() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isFm = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const defaults = useMemo(() => quarterDefaults(), []);
  const [tab, setTab] = useState<TabId>('compute');
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [periodLabel, setPeriodLabel] = useState(defaults.label);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [overview, setOverview] = useState<any>(null);
  const [computed, setComputed] = useState<any>(null);
  const [returns, setReturns] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, list] = await Promise.all([
      apiClient.getVat201Overview(),
      apiClient.getVat201Returns(),
    ]);
    if (ov.success) {
      setOverview(ov.data);
      setComputed((prev: any) => {
        if (prev) return prev;
        const cq = (ov.data as any)?.current_quarter;
        if (cq) {
          if (cq.period_start) setFrom(String(cq.period_start).slice(0, 10));
          if (cq.period_end) setTo(String(cq.period_end).slice(0, 10));
          if (cq.label) setPeriodLabel(cq.label);
          return cq;
        }
        return prev;
      });
    }
    if (list.success) setReturns((list.data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runCompute = async () => {
    setComputing(true);
    const result = await apiClient.computeVat201(from, to);
    setComputing(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Compute failed', description: result.error });
      return;
    }
    setComputed(result.data);
    setTab('boxes');
    toast({ title: 'VAT201 computed from Sales + POs + GL' });
  };

  const saveReturn = async () => {
    setActingId('save');
    const result = await apiClient.createVat201Return({
      period_start: from,
      period_end: to,
      period_label: periodLabel,
    });
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Save failed', description: result.error });
      return;
    }
    toast({
      title: 'VAT201 return saved',
      description: (result.data as any)?.return_no,
    });
    setTab('returns');
    await load();
  };

  const refreshReturn = async (id: string) => {
    setActingId(id);
    const result = await apiClient.refreshVat201Return(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Refresh failed', description: result.error });
      return;
    }
    toast({ title: 'Return refreshed from modules' });
    await load();
  };

  const fileReturn = async (id: string) => {
    setActingId(id);
    const result = await apiClient.fileVat201Return(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'File failed', description: result.error });
      return;
    }
    toast({ title: 'VAT201 marked as filed' });
    await load();
  };

  const settleReturn = async (id: string) => {
    setActingId(id);
    const result = await apiClient.settleVat201Return(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Settle failed', description: result.error });
      return;
    }
    toast({
      title: 'VAT settled — JE posted',
      description: (result.data as any)?.journal?.entry_no || 'Cleared VAT Output / Input',
    });
    await load();
  };

  const boxes = computed?.boxes || {};
  const sources = computed?.sources || {};
  const gl = computed?.gl_reconciliation || {};
  const net = Number(computed?.net_vat_payable ?? boxes.box16_net_vat ?? 0);

  const stats = [
    {
      label: 'Output VAT',
      value: `AED ${money(boxes.box11_total_output_vat ?? boxes.box4_output_vat)}`,
      hint: 'From sales invoices',
    },
    {
      label: 'Input VAT',
      value: `AED ${money(boxes.box15_total_recoverable ?? boxes.box13_input_vat)}`,
      hint: 'From purchase tax',
    },
    {
      label: 'Net VAT',
      value: `AED ${money(net)}`,
      hint: net >= 0 ? 'Payable to FTA' : 'Refundable',
    },
    {
      label: 'Source docs',
      value: (sources.sales_count || 0) + (sources.purchase_count || 0),
      hint: `${sources.sales_count || 0} sales · ${sources.purchase_count || 0} POs`,
    },
  ];

  return (
    <div className="space-y-5">
      <ErpToolbar
        title="VAT201"
        description="UAE VAT return — auto-built from Sales invoices (output), Purchase Orders (input), and GL VAT accounts."
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
            <Button type="button" variant="outline" className="rounded-xl" asChild>
              <Link href="/dashboard/accounting/purchase-orders">
                <ClipboardList className="h-4 w-4" />
                POs
              </Link>
            </Button>
            <Button
              type="button"
              className={erpPrimaryButtonClass()}
              disabled={computing}
              onClick={() => void runCompute()}
            >
              {computing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Compute period
            </Button>
          </div>
        }
      />

      <ErpStatStrip items={stats} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/accounting/sales"
          className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 transition hover:border-sky-200 hover:shadow-sm"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShoppingCart className="h-4 w-4 text-sky-600" />
            Sales → Box 1–4
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Approved invoices feed standard-rated supplies by emirate and output VAT (GL 2200).
          </p>
        </Link>
        <Link
          href="/dashboard/accounting/purchase-orders"
          className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 transition hover:border-sky-200 hover:shadow-sm"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ClipboardList className="h-4 w-4 text-amber-600" />
            POs → Box 12–13
          </div>
          <p className="mt-1 text-xs text-slate-500">
            PO tax posts Dr VAT Input 1310 on approve — recoverable input for the period.
          </p>
        </Link>
        <Link
          href="/dashboard/accounting/journals"
          className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 transition hover:border-sky-200 hover:shadow-sm"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            GL reconcile
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Posted journals on 2200 / 1310 are checked against document totals.
          </p>
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all',
              tab === t.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'compute' ? (
        <div className="max-w-xl rounded-3xl border border-slate-200/70 bg-white/90 p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Compute VAT201 period</h3>
            <p className="mt-1 text-sm text-slate-500">
              Pulls approved Sales invoices and taxed Purchase Orders in range, then reconciles to GL.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Period label</Label>
              <Input
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                className="rounded-xl"
                placeholder="Q1 2026"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className={erpPrimaryButtonClass()}
              disabled={computing}
              onClick={() => void runCompute()}
            >
              {computing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Compute
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={actingId === 'save' || !computed}
              onClick={() => void saveReturn()}
            >
              {actingId === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
              Save as return
            </Button>
          </div>

          {gl && (gl.doc_output_vat != null || gl.gl_output_vat_net != null) ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">GL reconciliation</p>
              <p>
                Output docs AED {money(gl.doc_output_vat)} vs GL 2200 AED {money(gl.gl_output_vat_net)}
                {Number(gl.output_variance) !== 0 ? (
                  <span className="text-amber-700"> · variance {money(gl.output_variance)}</span>
                ) : (
                  <span className="text-emerald-700"> · matched</span>
                )}
              </p>
              <p>
                Input docs AED {money(gl.doc_input_vat)} vs GL 1310 AED {money(gl.gl_input_vat_net)}
                {Number(gl.input_variance) !== 0 ? (
                  <span className="text-amber-700"> · variance {money(gl.input_variance)}</span>
                ) : (
                  <span className="text-emerald-700"> · matched</span>
                )}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'boxes' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
          {!computed ? (
            <div className="p-6">
              <ErpEmptyState message="Compute a period first." />
            </div>
          ) : (
            <Table className={erpTableClasses().table}>
              <TableHeader>
                <TableRow>
                  <TableHead>Box</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead className="text-right">Amount (AED)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {BOX_ROWS.map((row) => {
                  const val = Number(boxes[row.key] || 0);
                  const isNet = row.key === 'box16_net_vat';
                  return (
                    <TableRow key={row.key}>
                      <TableCell className={cn('text-sm', isNet && 'font-semibold')}>
                        {row.label}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
                            row.section === 'Output'
                              ? 'bg-sky-50 text-sky-700 ring-sky-200'
                              : row.section === 'Input'
                                ? 'bg-amber-50 text-amber-800 ring-amber-200'
                                : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                          )}
                        >
                          {row.section}
                        </span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          isNet && 'font-bold text-base',
                          isNet && val < 0 && 'text-emerald-700',
                          isNet && val > 0 && 'text-rose-700'
                        )}
                      >
                        {money(val)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      {tab === 'sources' ? (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
              Sales invoices (output) · {sources.sales_count || 0}
            </div>
            {(sources.sales_invoices || []).length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No approved sales invoices in this period." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer / TRN</TableHead>
                    <TableHead>Box</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">Output VAT</TableHead>
                    <TableHead>JE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sources.sales_invoices || []).map((s: any) => (
                    <TableRow key={s.id || s.ref}>
                      <TableCell>
                        <div className="font-medium">{s.ref}</div>
                        <div className="text-xs text-slate-400">{fmtDate(s.date)}</div>
                      </TableCell>
                      <TableCell>
                        <div>{s.customer}</div>
                        {s.customer_trn ? (
                          <div className="text-xs text-slate-400">TRN {s.customer_trn}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="uppercase text-slate-500">{s.emirate_box}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(s.taxable_supplies)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {money(s.output_vat)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{s.journal_no || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
              Purchase orders (input) · {sources.purchase_count || 0}
            </div>
            {(sources.purchase_orders || []).length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No taxed purchase orders in this period." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Excl. VAT</TableHead>
                    <TableHead className="text-right">Input VAT</TableHead>
                    <TableHead>JE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sources.purchase_orders || []).map((p: any) => (
                    <TableRow key={p.id || p.ref}>
                      <TableCell>
                        <div className="font-medium">{p.ref}</div>
                        <div className="text-xs text-slate-400">{fmtDate(p.date)}</div>
                      </TableCell>
                      <TableCell>{p.supplier}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(p.expenses_ex_vat)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {money(p.input_vat)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{p.journal_no || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'returns' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
          {returns.length === 0 ? (
            <div className="p-6">
              <ErpEmptyState message="No saved VAT201 returns yet. Compute a period and save." />
            </div>
          ) : (
            <Table className={erpTableClasses().table}>
              <TableHeader>
                <TableRow>
                  <TableHead>Return</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Net VAT</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Settlement JE</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r._id}>
                    <TableCell className="font-medium">{r.return_no}</TableCell>
                    <TableCell>
                      <div>{r.period_label}</div>
                      <div className="text-xs text-slate-400">
                        {fmtDate(r.period_start)} → {fmtDate(r.period_end)}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums font-semibold',
                        Number(r.net_vat_payable) > 0 && 'text-rose-700',
                        Number(r.net_vat_payable) < 0 && 'text-emerald-700'
                      )}
                    >
                      AED {money(r.net_vat_payable)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                          statusTone(r.status)
                        )}
                      >
                        {r.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {r.settlement_journal_no || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        {['DRAFT', 'READY'].includes(r.status) ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            disabled={actingId === r._id}
                            onClick={() => void refreshReturn(r._id)}
                          >
                            Refresh
                          </Button>
                        ) : null}
                        {isFm && ['DRAFT', 'READY'].includes(r.status) ? (
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-xl bg-amber-600 hover:bg-amber-700"
                            disabled={actingId === r._id}
                            onClick={() => void fileReturn(r._id)}
                          >
                            {actingId === r._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileCheck2 className="h-3.5 w-3.5" />
                            )}
                            File
                          </Button>
                        ) : null}
                        {isFm && r.status === 'FILED' ? (
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                            disabled={actingId === r._id}
                            onClick={() => void settleReturn(r._id)}
                          >
                            {actingId === r._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Landmark className="h-3.5 w-3.5" />
                            )}
                            Settle → JE
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      {overview?.connections ? (
        <p className="text-xs text-slate-400">
          Connected GL: Output {overview.connections.output_gl} · Input{' '}
          {overview.connections.input_gl}. VAT traders registered in Sales feed TRN on source rows.
        </p>
      ) : null}
    </div>
  );
}
