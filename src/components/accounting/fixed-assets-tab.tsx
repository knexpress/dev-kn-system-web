'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type TabId = 'overview' | 'register' | 'add' | 'history';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'register', label: 'Register' },
  { id: 'add', label: 'Add asset' },
  { id: 'history', label: 'Depreciation log' },
];

function statusTone(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'FULLY_DEPRECIATED':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'DISPOSED':
      return 'bg-slate-100 text-slate-500 ring-slate-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

export default function FixedAssetsTab() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isFm = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [runningAll, setRunningAll] = useState(false);

  const [disposeOpen, setDisposeOpen] = useState(false);
  const [disposeAsset, setDisposeAsset] = useState<any | null>(null);
  const [disposeForm, setDisposeForm] = useState({
    proceeds: '0',
    disposal_date: new Date().toISOString().slice(0, 10),
    proceeds_account_code: '1100',
  });

  const year = new Date().getFullYear();
  const [form, setForm] = useState({
    asset_tag: `FA-${year}-`,
    name: '',
    category: '',
    location: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    in_service_date: new Date().toISOString().slice(0, 10),
    acquisition_cost: '',
    salvage_value: '0',
    useful_life_months: '36',
    funding_account_code: '1100',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, list, gl] = await Promise.all([
      apiClient.getFixedAssetsOverview(),
      apiClient.getFixedAssets(),
      apiClient.getAccounts(),
    ]);
    if (ov.success) setOverview(ov.data);
    if (list.success) setAssets((list.data as any[]) || []);
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

  const stats = useMemo(
    () => [
      {
        label: 'Assets',
        value: overview?.totals?.count || 0,
        hint: `${overview?.totals?.active || 0} active`,
      },
      {
        label: 'Gross cost',
        value: `AED ${money(overview?.totals?.acquisition_cost)}`,
        hint: 'Excl. disposed',
      },
      {
        label: 'Accum. depr.',
        value: `AED ${money(overview?.totals?.accumulated_depreciation)}`,
        hint: 'To date',
      },
      {
        label: 'Net book value',
        value: `AED ${money(overview?.totals?.book_value)}`,
        hint: 'Carrying amount',
      },
    ],
    [overview]
  );

  const createAsset = async () => {
    if (!form.asset_tag.trim() || !form.name.trim() || !(Number(form.acquisition_cost) > 0)) {
      toast({ variant: 'destructive', title: 'Tag, name, and cost are required' });
      return;
    }
    setSaving(true);
    const result = await apiClient.createFixedAsset({
      asset_tag: form.asset_tag.trim(),
      name: form.name.trim(),
      category: form.category.trim() || undefined,
      location: form.location.trim() || undefined,
      purchase_date: form.purchase_date,
      in_service_date: form.in_service_date,
      acquisition_cost: Number(form.acquisition_cost),
      salvage_value: Number(form.salvage_value) || 0,
      useful_life_months: Number(form.useful_life_months) || 36,
      funding_account_code: form.funding_account_code,
      post_acquisition_journal: true,
      notes: form.notes.trim() || undefined,
    });
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Create failed', description: result.error });
      return;
    }
    toast({
      title: 'Asset registered',
      description: `Journal ${(result.data as any)?.journal?.entry_no || 'posted'} · monthly depr. AED ${money((result.data as any)?.monthly_depreciation)}`,
    });
    setForm({
      asset_tag: `FA-${year}-`,
      name: '',
      category: '',
      location: '',
      purchase_date: new Date().toISOString().slice(0, 10),
      in_service_date: new Date().toISOString().slice(0, 10),
      acquisition_cost: '',
      salvage_value: '0',
      useful_life_months: '36',
      funding_account_code: '1100',
      notes: '',
    });
    setTab('register');
    await load();
  };

  const depreciateOne = async (id: string) => {
    setActingId(id);
    const result = await apiClient.depreciateFixedAsset(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Depreciation failed', description: result.error });
      return;
    }
    toast({
      title: 'Depreciation posted',
      description: `Journal ${(result.data as any)?.journal?.entry_no}`,
    });
    await load();
  };

  const depreciateAll = async () => {
    setRunningAll(true);
    const result = await apiClient.depreciateAllFixedAssets();
    setRunningAll(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Run failed', description: result.error });
      return;
    }
    toast({
      title: 'Mass depreciation complete',
      description: `${(result.data as any)?.posted || 0} of ${(result.data as any)?.processed || 0} posted`,
    });
    await load();
  };

  const openDispose = (asset: any) => {
    setDisposeAsset(asset);
    setDisposeForm({
      proceeds: '0',
      disposal_date: new Date().toISOString().slice(0, 10),
      proceeds_account_code: '1100',
    });
    setDisposeOpen(true);
  };

  const dispose = async () => {
    if (!disposeAsset) return;
    setActingId(disposeAsset._id);
    const result = await apiClient.disposeFixedAsset(disposeAsset._id, {
      proceeds: Number(disposeForm.proceeds) || 0,
      disposal_date: disposeForm.disposal_date,
      proceeds_account_code: disposeForm.proceeds_account_code,
    });
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Disposal failed', description: result.error });
      return;
    }
    toast({
      title: 'Asset disposed',
      description: `Gain/loss AED ${money((result.data as any)?.gain_loss)}`,
    });
    setDisposeOpen(false);
    await load();
  };

  return (
    <div className="space-y-5">
      <ErpToolbar
        title="Fixed Assets"
        description="Register assets, post acquisition journals, run depreciation, and dispose."
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <div className="flex flex-wrap gap-2">
            {isFm ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={runningAll}
                onClick={() => void depreciateAll()}
              >
                {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Run depreciation (all)
              </Button>
            ) : null}
            <Button type="button" className={erpPrimaryButtonClass} onClick={() => setTab('add')}>
              <Plus className="h-4 w-4" />
              Add asset
            </Button>
          </div>
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
        <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
          {(overview?.assets || []).length === 0 ? (
            <div className="p-6">
              <ErpEmptyState message="No fixed assets yet. Add your first asset." />
            </div>
          ) : (
            <Table className={erpTableClasses}>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Book value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(overview?.assets || []).slice(0, 12).map((a: any) => (
                  <TableRow key={a._id}>
                    <TableCell>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-slate-400">{a.asset_tag}</div>
                    </TableCell>
                    <TableCell className="text-slate-500">{a.category || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      AED {money(a.acquisition_cost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      AED {money(a.book_value)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                          statusTone(a.status)
                        )}
                      >
                        {String(a.status || '').replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      {tab === 'register' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
          {assets.length === 0 ? (
            <div className="p-6">
              <ErpEmptyState message="Asset register is empty." />
            </div>
          ) : (
            <Table className={erpTableClasses}>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>In service</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Accum. depr.</TableHead>
                  <TableHead className="text-right">NBV</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => (
                  <TableRow key={a._id}>
                    <TableCell>
                      <div className="font-medium">{a.name}</div>
                      <div className="text-xs text-slate-400">
                        {a.asset_tag}
                        {a.location ? ` · ${a.location}` : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">{fmtDate(a.in_service_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      AED {money(a.acquisition_cost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">
                      AED {money(a.accumulated_depreciation)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      AED {money(a.book_value)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                          statusTone(a.status)
                        )}
                      >
                        {String(a.status || '').replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        {a.status === 'ACTIVE' ? (
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-xl bg-sky-600 hover:bg-sky-700"
                            disabled={actingId === a._id}
                            onClick={() => void depreciateOne(a._id)}
                          >
                            {actingId === a._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            Depreciate
                          </Button>
                        ) : null}
                        {isFm && a.status !== 'DISPOSED' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => openDispose(a)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Dispose
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

      {tab === 'add' ? (
        <div className="max-w-2xl rounded-3xl border border-slate-200/70 bg-white/90 p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Register fixed asset</h3>
            <p className="mt-1 text-sm text-slate-500">
              Posts acquisition journal (Dr Fixed Assets / Cr Bank or AP) and starts the
              straight-line depreciation schedule.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Asset tag</Label>
              <Input
                value={form.asset_tag}
                onChange={(e) => setForm((f) => ({ ...f, asset_tag: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="rounded-xl"
                placeholder="Vehicles, IT, Furniture…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase date</Label>
              <Input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>In-service date</Label>
              <Input
                type="date"
                value={form.in_service_date}
                onChange={(e) => setForm((f) => ({ ...f, in_service_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Acquisition cost</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.acquisition_cost}
                onChange={(e) => setForm((f) => ({ ...f, acquisition_cost: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Salvage value</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.salvage_value}
                onChange={(e) => setForm((f) => ({ ...f, salvage_value: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Useful life (months)</Label>
              <Input
                type="number"
                min="1"
                value={form.useful_life_months}
                onChange={(e) => setForm((f) => ({ ...f, useful_life_months: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Fund from (credit account)</Label>
              <Select
                value={form.funding_account_code}
                onValueChange={(v) => setForm((f) => ({ ...f, funding_account_code: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.type === 'Asset' || a.type === 'Liability')
                    .map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
          <Button
            type="button"
            className={erpPrimaryButtonClass}
            disabled={saving}
            onClick={() => void createAsset()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Register & post acquisition
          </Button>
        </div>
      ) : null}

      {tab === 'history' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
          {(overview?.recent_depreciations || []).length === 0 ? (
            <div className="p-6">
              <ErpEmptyState message="No depreciation runs yet." />
            </div>
          ) : (
            <Table className={erpTableClasses}>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Journal</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">NBV after</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(overview?.recent_depreciations || []).map((d: any) => (
                  <TableRow key={d._id}>
                    <TableCell className="font-medium">{d.asset_tag}</TableCell>
                    <TableCell>{fmtDate(d.period_date)}</TableCell>
                    <TableCell className="text-slate-500">{d.journal_entry_no || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">AED {money(d.amount)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      AED {money(d.book_value_after)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      <Dialog open={disposeOpen} onOpenChange={setDisposeOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Dispose {disposeAsset?.asset_tag}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Book value AED {money(disposeAsset?.book_value)}. Posts disposal journal and removes
            the asset from the active register.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Proceeds</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={disposeForm.proceeds}
                onChange={(e) => setDisposeForm((f) => ({ ...f, proceeds: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={disposeForm.disposal_date}
                onChange={(e) => setDisposeForm((f) => ({ ...f, disposal_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Proceeds account</Label>
              <Select
                value={disposeForm.proceeds_account_code}
                onValueChange={(v) =>
                  setDisposeForm((f) => ({ ...f, proceeds_account_code: v }))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.type === 'Asset')
                    .map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDisposeOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className={erpPrimaryButtonClass}
              disabled={actingId === disposeAsset?._id}
              onClick={() => void dispose()}
            >
              {actingId === disposeAsset?._id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Dispose
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
