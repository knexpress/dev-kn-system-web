'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
  X,
} from 'lucide-react';
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

type TabId = 'overview' | 'vouchers' | 'new-voucher' | 'replenish';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'vouchers', label: 'Vouchers' },
  { id: 'new-voucher', label: 'New voucher' },
  { id: 'replenish', label: 'Replenish' },
];

export default function PettyCashTab() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isFm =
    userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [glAccounts, setGlAccounts] = useState<any[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const [fundOpen, setFundOpen] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundForm, setFundForm] = useState({
    amount: '',
    funding_account_code: '1100',
    entry_date: new Date().toISOString().slice(0, 10),
    memo: 'Petty cash funding',
  });

  const [voucherForm, setVoucherForm] = useState({
    voucher_date: new Date().toISOString().slice(0, 10),
    payee: '',
    category: '',
    description: '',
    amount: '',
    expense_account_code: '5100',
  });
  const [savingVoucher, setSavingVoucher] = useState(false);

  const [reqForm, setReqForm] = useState({ amount: '', reason: '' });
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, gl] = await Promise.all([
      apiClient.getPettyCashOverview(),
      apiClient.getAccounts(),
    ]);
    if (ov.success) setData(ov.data);
    if (gl.success) {
      setGlAccounts(
        ((gl.data as any[]) || []).filter((a) => a.is_active !== false && a.is_postable !== false)
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canManage = Boolean(data?.can_manage ?? isFm);
  const balance = Number(data?.balance || 0);
  const vouchers = data?.vouchers || [];
  const pending = data?.pending_replenishments || [];
  const recentRep = data?.recent_replenishments || [];

  const stats = useMemo(
    () => [
      {
        label: 'Petty cash balance',
        value: `AED ${money(balance)}`,
        hint: data?.account?.name || 'CASH-MAIN',
      },
      {
        label: 'This month spent',
        value: `AED ${money(data?.month_spend)}`,
        hint: `${data?.month_voucher_count || 0} vouchers`,
      },
      {
        label: 'Pending replenish',
        value: String(data?.pending_replenish_count || 0),
        hint: `AED ${money(data?.pending_replenish_amount)}`,
      },
    ],
    [balance, data]
  );

  const fundPettyCash = async () => {
    if (!(Number(fundForm.amount) > 0)) {
      toast({ variant: 'destructive', title: 'Enter a funding amount' });
      return;
    }
    setFunding(true);
    const result = await apiClient.fundPettyCash({
      amount: Number(fundForm.amount),
      funding_account_code: fundForm.funding_account_code,
      entry_date: fundForm.entry_date,
      memo: fundForm.memo,
    });
    setFunding(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Funding failed', description: result.error });
      return;
    }
    toast({
      title: 'Petty cash funded',
      description: `Journal ${(result.data as any)?.journal?.entry_no} posted. Balance updated.`,
    });
    setFundOpen(false);
    setFundForm((f) => ({ ...f, amount: '' }));
    await load();
  };

  const createVoucher = async () => {
    if (!voucherForm.payee.trim() || !(Number(voucherForm.amount) > 0)) {
      toast({ variant: 'destructive', title: 'Payee and amount are required' });
      return;
    }
    setSavingVoucher(true);
    const result = await apiClient.createPettyCashVoucher({
      voucher_date: voucherForm.voucher_date,
      payee: voucherForm.payee.trim(),
      category: voucherForm.category.trim() || undefined,
      description: voucherForm.description.trim() || undefined,
      amount: Number(voucherForm.amount),
      expense_account_code: voucherForm.expense_account_code,
    });
    setSavingVoucher(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Voucher failed', description: result.error });
      return;
    }
    toast({
      title: 'Voucher posted',
      description: `${(result.data as any)?.voucher?.voucher_no} — balance deducted`,
    });
    setVoucherForm({
      voucher_date: new Date().toISOString().slice(0, 10),
      payee: '',
      category: '',
      description: '',
      amount: '',
      expense_account_code: '5100',
    });
    setTab('vouchers');
    await load();
  };

  const requestReplenish = async () => {
    if (!(Number(reqForm.amount) > 0)) {
      toast({ variant: 'destructive', title: 'Enter requested amount' });
      return;
    }
    setRequesting(true);
    const result = await apiClient.requestPettyCashReplenishment({
      requested_amount: Number(reqForm.amount),
      reason: reqForm.reason.trim() || undefined,
    });
    setRequesting(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Request failed', description: result.error });
      return;
    }
    toast({
      title: 'Replenishment requested',
      description: (result.data as any)?.request_no,
    });
    setReqForm({ amount: '', reason: '' });
    await load();
  };

  const approveReplenish = async (id: string) => {
    setActingId(id);
    const result = await apiClient.approvePettyCashReplenishment(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Replenish failed', description: result.error });
      return;
    }
    toast({
      title: 'Petty cash replenished',
      description: `Journal ${(result.data as any)?.journal?.entry_no} posted`,
    });
    await load();
  };

  const rejectReplenish = async (id: string) => {
    const reason = window.prompt('Rejection reason (optional):') || '';
    setActingId(id);
    const result = await apiClient.rejectPettyCashReplenishment(id, reason);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Reject failed', description: result.error });
      return;
    }
    toast({ title: 'Request rejected' });
    await load();
  };

  return (
    <div className="space-y-5">
      <ErpToolbar
        title="Petty Cash"
        description={
          canManage
            ? 'Fund the float, review vouchers, and replenish when juniors request.'
            : 'Create vouchers against the float and request replenishment when low.'
        }
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          canManage ? (
            <Button type="button" className={erpPrimaryButtonClass} onClick={() => setFundOpen(true)}>
              <Plus className="h-4 w-4" />
              Fund / journal
            </Button>
          ) : (
            <Button
              type="button"
              className={erpPrimaryButtonClass}
              onClick={() => setTab('new-voucher')}
            >
              <Plus className="h-4 w-4" />
              New voucher
            </Button>
          )
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
            {t.id === 'replenish' && pending.length > 0 ? (
              <span className="ml-2 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] text-slate-900">
                {pending.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : null}

      {tab === 'overview' && data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">Float summary</h3>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Account</dt>
                <dd className="font-medium">{data.account?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Code</dt>
                <dd className="font-medium">{data.account?.code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">GL</dt>
                <dd className="font-medium">{data.account?.gl_account_code}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <dt className="text-slate-500">Current balance</dt>
                <dd className="text-base font-semibold tabular-nums">AED {money(balance)}</dd>
              </div>
            </dl>
            {!canManage ? (
              <Button
                type="button"
                className={cn(erpPrimaryButtonClass, 'mt-4 w-full')}
                onClick={() => setTab('replenish')}
              >
                <RefreshCw className="h-4 w-4" />
                Request replenishment
              </Button>
            ) : null}
          </section>

          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent vouchers</h3>
            {vouchers.length === 0 ? (
              <ErpEmptyState message="No vouchers yet." />
            ) : (
              <ul className="space-y-2">
                {vouchers.slice(0, 6).map((v: any) => (
                  <li
                    key={v._id}
                    className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{v.payee}</p>
                      <p className="text-xs text-slate-400">
                        {v.voucher_no} · {fmtDate(v.voucher_date)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">AED {money(v.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'vouchers' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
          {vouchers.length === 0 ? (
            <div className="p-6">
              <ErpEmptyState message="No vouchers posted yet." />
            </div>
          ) : (
            <Table className={erpTableClasses}>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Journal</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v: any) => (
                  <TableRow key={v._id}>
                    <TableCell>
                      <div className="font-medium">{v.voucher_no}</div>
                      <div className="text-xs text-slate-400">{fmtDate(v.voucher_date)}</div>
                    </TableCell>
                    <TableCell>
                      <div>{v.payee}</div>
                      {v.description ? (
                        <div className="text-xs text-slate-400">{v.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-slate-500">{v.category || '—'}</TableCell>
                    <TableCell className="text-slate-500">{v.journal_entry_no || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      AED {money(v.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      {tab === 'new-voucher' ? (
        <div className="max-w-xl rounded-3xl border border-slate-200/70 bg-white/90 p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">New petty cash voucher</h3>
            <p className="mt-1 text-sm text-slate-500">
              Posts an expense journal and deducts from the petty cash float immediately.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Payee</Label>
              <Input
                value={voucherForm.payee}
                onChange={(e) => setVoucherForm((f) => ({ ...f, payee: e.target.value }))}
                className="rounded-xl"
                placeholder="Vendor / employee"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={voucherForm.voucher_date}
                onChange={(e) => setVoucherForm((f) => ({ ...f, voucher_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (AED)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={voucherForm.amount}
                onChange={(e) => setVoucherForm((f) => ({ ...f, amount: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={voucherForm.category}
                onChange={(e) => setVoucherForm((f) => ({ ...f, category: e.target.value }))}
                className="rounded-xl"
                placeholder="Transport, supplies…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Expense account</Label>
              <Select
                value={voucherForm.expense_account_code}
                onValueChange={(v) =>
                  setVoucherForm((f) => ({ ...f, expense_account_code: v }))
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {glAccounts
                    .filter((a) => a.type === 'Expense')
                    .map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={voucherForm.description}
                onChange={(e) => setVoucherForm((f) => ({ ...f, description: e.target.value }))}
                className="rounded-xl"
                rows={2}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Available float: <span className="font-semibold text-slate-700">AED {money(balance)}</span>
          </p>
          <Button
            type="button"
            className={erpPrimaryButtonClass}
            disabled={savingVoucher}
            onClick={() => void createVoucher()}
          >
            {savingVoucher ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Post voucher & deduct
          </Button>
        </div>
      ) : null}

      {tab === 'replenish' ? (
        <div className="space-y-5">
          {!canManage ? (
            <div className="max-w-lg rounded-3xl border border-slate-200/70 bg-white/90 p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Request replenishment</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Ask Finance Manager to top up the float. Current balance AED {money(balance)}.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Amount needed</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={reqForm.amount}
                  onChange={(e) => setReqForm((f) => ({ ...f, amount: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={reqForm.reason}
                  onChange={(e) => setReqForm((f) => ({ ...f, reason: e.target.value }))}
                  className="rounded-xl"
                  rows={2}
                />
              </div>
              <Button
                type="button"
                className={erpPrimaryButtonClass}
                disabled={requesting}
                onClick={() => void requestReplenish()}
              >
                {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Submit request
              </Button>
            </div>
          ) : null}

          {canManage ? (
            <section className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
              <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold">
                Pending replenishment requests
              </div>
              {pending.length === 0 ? (
                <div className="p-6">
                  <ErpEmptyState message="No pending replenishment requests." />
                </div>
              ) : (
                <Table className={erpTableClasses}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Requested by</TableHead>
                      <TableHead>Balance then</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((r: any) => (
                      <TableRow key={r._id}>
                        <TableCell>
                          <div className="font-medium">{r.request_no}</div>
                          <div className="text-xs text-slate-400">{r.reason || '—'}</div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {r.requested_by_name || r.requested_by_email}
                        </TableCell>
                        <TableCell className="tabular-nums text-slate-500">
                          AED {money(r.balance_at_request)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          AED {money(r.requested_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                              disabled={actingId === r._id}
                              onClick={() => void approveReplenish(r._id)}
                            >
                              {actingId === r._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Replenish
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              disabled={actingId === r._id}
                              onClick={() => void rejectReplenish(r._id)}
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          ) : null}

          <section className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold">
              Replenishment history
            </div>
            {recentRep.length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No replenishment history yet." />
              </div>
            ) : (
              <Table className={erpTableClasses}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Journal</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRep.map((r: any) => (
                    <TableRow key={r._id}>
                      <TableCell>
                        <div className="font-medium">{r.request_no}</div>
                        <div className="text-xs text-slate-400">
                          {r.requested_by_name || r.requested_by_email}
                        </div>
                      </TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell className="text-slate-500">{r.journal_entry_no || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        AED {money(r.approved_amount || r.requested_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
      ) : null}

      <Dialog open={fundOpen} onOpenChange={setFundOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Fund petty cash (journal)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Posts Dr Petty Cash / Cr Bank and increases the float balance immediately.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={fundForm.amount}
                onChange={(e) => setFundForm((f) => ({ ...f, amount: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Fund from (Bank GL)</Label>
              <Select
                value={fundForm.funding_account_code}
                onValueChange={(v) => setFundForm((f) => ({ ...f, funding_account_code: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {glAccounts
                    .filter((a) => a.type === 'Asset')
                    .map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={fundForm.entry_date}
                onChange={(e) => setFundForm((f) => ({ ...f, entry_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Memo</Label>
              <Input
                value={fundForm.memo}
                onChange={(e) => setFundForm((f) => ({ ...f, memo: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setFundOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className={erpPrimaryButtonClass}
              disabled={funding}
              onClick={() => void fundPettyCash()}
            >
              {funding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Post journal & fund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
