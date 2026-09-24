'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus, Trash2 } from 'lucide-react';
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

type TabId = 'overview' | 'budgets' | 'create' | 'detail';

type LineDraft = {
  key: string;
  account_code: string;
  budgeted_amount: string;
  notes: string;
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'budgets', label: 'All budgets' },
  { id: 'create', label: 'New budget' },
  { id: 'detail', label: 'Variance' },
];

function statusTone(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-50 text-slate-700 ring-slate-200';
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'CLOSED':
      return 'bg-slate-100 text-slate-500 ring-slate-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

function emptyLine(): LineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    account_code: '',
    budgeted_amount: '0',
    notes: '',
  };
}

export default function BudgetsTab() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isFm = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const year = new Date().getFullYear();
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: `FY ${year} Operating Budget`,
    code: `BUD-${year}`,
    fiscal_year: String(year),
    period_type: 'ANNUAL',
    start_date: `${year}-01-01`,
    end_date: `${year}-12-31`,
    notes: '',
  });
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, list, gl] = await Promise.all([
      apiClient.getBudgetsOverview(),
      apiClient.getBudgets(),
      apiClient.getAccounts(),
    ]);
    if (ov.success) setOverview(ov.data);
    if (list.success) setBudgets((list.data as any[]) || []);
    if (gl.success) {
      setAccounts(
        ((gl.data as any[]) || []).filter((a) => a.is_active !== false && a.is_postable !== false)
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadDetail = useCallback(async (id: string) => {
    const result = await apiClient.getBudget(id);
    if (result.success) {
      setDetail(result.data);
      setSelectedId(id);
      setTab('detail');
    }
  }, []);

  const plAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'Revenue' || a.type === 'Expense'),
    [accounts]
  );

  const active = overview?.active_budget;
  const activeTotals = active?.variance?.totals;

  const stats = [
    { label: 'Budgets', value: overview?.totals?.count || 0, hint: 'All periods' },
    { label: 'Active', value: overview?.totals?.active || 0, hint: 'In force' },
    {
      label: 'Active budgeted',
      value: `AED ${money(activeTotals?.budgeted ?? active?.total_budgeted)}`,
      hint: active?.name || '—',
    },
    {
      label: 'Actual / variance',
      value: `AED ${money(activeTotals?.actual)}`,
      hint: `Var AED ${money(activeTotals?.variance)} · ${activeTotals?.percent_used || 0}% used`,
    },
  ];

  const createBudget = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast({ variant: 'destructive', title: 'Name and code are required' });
      return;
    }
    const built = lines
      .filter((l) => l.account_code && Number(l.budgeted_amount) >= 0)
      .map((l) => ({
        account_code: l.account_code,
        budgeted_amount: Number(l.budgeted_amount) || 0,
        notes: l.notes.trim() || undefined,
      }));

    setSaving(true);
    const result = await apiClient.createBudget({
      name: form.name.trim(),
      code: form.code.trim(),
      fiscal_year: Number(form.fiscal_year) || year,
      period_type: form.period_type,
      start_date: form.start_date,
      end_date: form.end_date,
      notes: form.notes.trim() || undefined,
      lines: built,
    });
    setSaving(false);

    if (!result.success) {
      toast({ variant: 'destructive', title: 'Create failed', description: result.error });
      return;
    }

    toast({ title: 'Budget created', description: (result.data as any)?.code });
    setLines([emptyLine()]);
    setTab('budgets');
    await load();
    if ((result.data as any)?._id) {
      await loadDetail((result.data as any)._id);
    }
  };

  const activate = async (id: string) => {
    setActingId(id);
    const result = await apiClient.activateBudget(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Activate failed', description: result.error });
      return;
    }
    toast({ title: 'Budget activated' });
    await load();
    await loadDetail(id);
  };

  const closeBudget = async (id: string) => {
    setActingId(id);
    const result = await apiClient.closeBudget(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Close failed', description: result.error });
      return;
    }
    toast({ title: 'Budget closed' });
    await load();
    if (selectedId === id) await loadDetail(id);
  };

  const varianceRows = detail?.variance?.lines || [];

  return (
    <div className="space-y-5">
      <ErpToolbar
        title="Budgets"
        description="Plan by account, track actuals from posted journals, and monitor variance."
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <Button type="button" className={erpPrimaryButtonClass()} onClick={() => setTab('create')}>
            <Plus className="h-4 w-4" />
            New budget
          </Button>
        }
      />

      <ErpStatStrip items={stats} />

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

      {loading && !overview ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : null}

      {tab === 'overview' ? (
        <div className="space-y-4">
          {active ? (
            <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700/80">
                    Active budget
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">{active.name}</h3>
                  <p className="text-sm text-slate-500">
                    {active.code} · FY {active.fiscal_year} · {fmtDate(active.start_date)} →{' '}
                    {fmtDate(active.end_date)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void loadDetail(active._id)}
                >
                  Open variance
                </Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] text-slate-400">Budgeted</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    AED {money(activeTotals?.budgeted ?? active.total_budgeted)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] text-slate-400">Actual</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    AED {money(activeTotals?.actual)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[11px] text-slate-400">Variance</p>
                  <p
                    className={cn(
                      'mt-1 font-semibold tabular-nums',
                      Number(activeTotals?.variance) < 0 ? 'text-rose-600' : 'text-emerald-700'
                    )}
                  >
                    AED {money(activeTotals?.variance)}
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <ErpEmptyState message="No budgets yet. Create and activate one to track variance." />
          )}

          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            <Table className={erpTableClasses().table}>
              <TableHeader>
                <TableRow>
                  <TableHead>Budget</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(overview?.budgets || []).slice(0, 8).map((b: any) => (
                  <TableRow
                    key={b._id}
                    className="cursor-pointer"
                    onClick={() => void loadDetail(b._id)}
                  >
                    <TableCell>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-slate-400">{b.code}</div>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      FY {b.fiscal_year} · {b.period_type}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      AED {money(b.total_budgeted)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                          statusTone(b.status)
                        )}
                      >
                        {b.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {tab === 'budgets' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
          {budgets.length === 0 ? (
            <div className="p-6">
              <ErpEmptyState message="No budgets created." />
            </div>
          ) : (
            <Table className={erpTableClasses().table}>
              <TableHeader>
                <TableRow>
                  <TableHead>Budget</TableHead>
                  <TableHead>Lines</TableHead>
                  <TableHead className="text-right">Budgeted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((b) => (
                  <TableRow key={b._id}>
                    <TableCell>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-slate-400">
                        {b.code} · {fmtDate(b.start_date)} → {fmtDate(b.end_date)}
                      </div>
                    </TableCell>
                    <TableCell>{b.lines?.length || 0}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      AED {money(b.total_budgeted)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                          statusTone(b.status)
                        )}
                      >
                        {b.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => void loadDetail(b._id)}
                        >
                          Variance
                        </Button>
                        {isFm && b.status !== 'ACTIVE' && b.status !== 'CLOSED' ? (
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                            disabled={actingId === b._id}
                            onClick={() => void activate(b._id)}
                          >
                            {actingId === b._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Activate
                          </Button>
                        ) : null}
                        {isFm && b.status === 'ACTIVE' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            disabled={actingId === b._id}
                            onClick={() => void closeBudget(b._id)}
                          >
                            Close
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

      {tab === 'create' ? (
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 sm:p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Create budget</h3>
            <p className="mt-1 text-sm text-slate-500">
              Set the period and allocate amounts by GL account. Activate later to make it the live
              budget for variance tracking.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Fiscal year</Label>
              <Input
                type="number"
                value={form.fiscal_year}
                onChange={(e) => setForm((f) => ({ ...f, fiscal_year: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Period type</Label>
              <Select
                value={form.period_type}
                onValueChange={(v) => setForm((f) => ({ ...f, period_type: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="rounded-xl"
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Budget lines</h4>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                <Plus className="h-3.5 w-3.5" />
                Add line
              </Button>
            </div>
            {lines.map((line, idx) => (
              <div
                key={line.key}
                className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-6">
                  <Select
                    value={line.account_code || undefined}
                    onValueChange={(v) =>
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, account_code: v } : l))
                      )
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {plAccounts.map((a) => (
                        <SelectItem key={a.code} value={a.code}>
                          {a.code} — {a.name} ({a.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Budgeted"
                    value={line.budgeted_amount}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx ? { ...l, budgeted_amount: e.target.value } : l
                        )
                      )
                    }
                    className="rounded-xl bg-white"
                  />
                </div>
                <div className="flex gap-2 sm:col-span-3">
                  <Input
                    placeholder="Notes"
                    value={line.notes}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, notes: e.target.value } : l))
                      )
                    }
                    className="rounded-xl bg-white"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            className={erpPrimaryButtonClass()}
            disabled={saving}
            onClick={() => void createBudget()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save draft budget
          </Button>
        </div>
      ) : null}

      {tab === 'detail' ? (
        <div className="space-y-4">
          {!detail ? (
            <ErpEmptyState message="Select a budget from All budgets to view variance." />
          ) : (
            <>
              <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{detail.name}</h3>
                    <p className="text-sm text-slate-500">
                      {detail.code} · {fmtDate(detail.start_date)} → {fmtDate(detail.end_date)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                      statusTone(detail.status)
                    )}
                  >
                    {detail.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] text-slate-400">Budgeted</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      AED {money(detail.variance?.totals?.budgeted)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] text-slate-400">Actual</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      AED {money(detail.variance?.totals?.actual)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] text-slate-400">Variance</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      AED {money(detail.variance?.totals?.variance)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] text-slate-400">% used</p>
                    <p className="mt-1 font-semibold tabular-nums">
                      {detail.variance?.totals?.percent_used || 0}%
                    </p>
                  </div>
                </div>
              </section>

              <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
                {varianceRows.length === 0 ? (
                  <div className="p-6">
                    <ErpEmptyState message="No lines in this budget." />
                  </div>
                ) : (
                  <Table className={erpTableClasses().table}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Budgeted</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-right">% used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {varianceRows.map((row: any) => (
                        <TableRow key={row.account_code}>
                          <TableCell>
                            <div className="font-medium">{row.account_code}</div>
                            <div className="text-xs text-slate-400">{row.account_name}</div>
                          </TableCell>
                          <TableCell className="text-slate-500">{row.account_type}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            AED {money(row.budgeted_amount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            AED {money(row.actual_amount)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right tabular-nums font-semibold',
                              row.variance < 0 ? 'text-rose-600' : 'text-emerald-700'
                            )}
                          >
                            AED {money(row.variance)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-slate-600">
                            {row.percent_used}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
