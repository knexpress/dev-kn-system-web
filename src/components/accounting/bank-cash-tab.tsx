'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Building2,
  Check,
  Loader2,
  Plus,
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

type TabId = 'overview' | 'accounts' | 'pay' | 'approvals';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'pay', label: 'Pay supplier' },
  { id: 'approvals', label: 'Clear payments' },
];

function statusTone(status: string) {
  switch (status) {
    case 'PENDING_APPROVAL':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-800 ring-rose-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

export default function BankCashTab() {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [glAccounts, setGlAccounts] = useState<any[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    code: '',
    name: '',
    account_type: 'BANK',
    bank_name: '',
    account_number_masked: '',
    gl_account_code: '',
    opening_balance: '0',
    notes: '',
  });

  const [payForm, setPayForm] = useState({
    payment_date: new Date().toISOString().slice(0, 10),
    supplier_name: '',
    supplier_reference: '',
    description: '',
    amount: '',
    bank_cash_account_id: '',
    debit_account_code: '2000',
  });
  const [submittingPay, setSubmittingPay] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, acc, pay, gl] = await Promise.all([
      apiClient.getBankCashOverview(),
      apiClient.getBankCashAccounts(),
      apiClient.getSupplierPayments(),
      apiClient.getAccounts(),
    ]);

    if (ov.success) setOverview(ov.data);
    if (acc.success) setAccounts((acc.data as any[]) || []);
    if (pay.success) setPayments((pay.data as any[]) || []);
    if (gl.success) {
      const list = ((gl.data as any[]) || []).filter((a) => a.is_active !== false && a.is_postable !== false);
      setGlAccounts(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(
    () => payments.filter((p) => p.status === 'PENDING_APPROVAL'),
    [payments]
  );

  const activeWallets = useMemo(
    () => accounts.filter((a) => a.is_active !== false),
    [accounts]
  );

  const stats = [
    {
      label: 'Bank total',
      value: `AED ${money(overview?.totals?.bank)}`,
      hint: `${overview?.bank_accounts?.length || 0} accounts`,
    },
    {
      label: 'Cash total',
      value: `AED ${money(overview?.totals?.cash)}`,
      hint: `${overview?.cash_accounts?.length || 0} accounts`,
    },
    {
      label: 'Combined',
      value: `AED ${money(overview?.totals?.combined)}`,
      hint: 'Available liquidity',
    },
    {
      label: 'Awaiting approval',
      value: String(overview?.totals?.pending_approval_count || pending.length || 0),
      hint: `AED ${money(overview?.totals?.pending_approval_amount)}`,
    },
  ];

  const createAccount = async () => {
    if (!accountForm.code.trim() || !accountForm.name.trim() || !accountForm.gl_account_code) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Code, name, and GL account are required.',
      });
      return;
    }
    setSavingAccount(true);
    const result = await apiClient.createBankCashAccount({
      code: accountForm.code.trim(),
      name: accountForm.name.trim(),
      account_type: accountForm.account_type,
      bank_name: accountForm.bank_name.trim() || undefined,
      account_number_masked: accountForm.account_number_masked.trim() || undefined,
      gl_account_code: accountForm.gl_account_code,
      opening_balance: Number(accountForm.opening_balance) || 0,
      notes: accountForm.notes.trim() || undefined,
    });
    setSavingAccount(false);

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Could not create account',
        description: result.error || 'Try again',
      });
      return;
    }

    toast({ title: 'Account created', description: accountForm.name });
    setAddOpen(false);
    setAccountForm({
      code: '',
      name: '',
      account_type: 'BANK',
      bank_name: '',
      account_number_masked: '',
      gl_account_code: '',
      opening_balance: '0',
      notes: '',
    });
    await load();
  };

  const submitPayment = async () => {
    if (!payForm.supplier_name.trim() || !payForm.amount || !payForm.bank_cash_account_id) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Supplier, amount, and pay-from account are required.',
      });
      return;
    }
    setSubmittingPay(true);
    const result = await apiClient.createSupplierPayment({
      payment_date: payForm.payment_date,
      supplier_name: payForm.supplier_name.trim(),
      supplier_reference: payForm.supplier_reference.trim() || undefined,
      description: payForm.description.trim() || undefined,
      amount: Number(payForm.amount),
      bank_cash_account_id: payForm.bank_cash_account_id,
      debit_account_code: payForm.debit_account_code || '2000',
    });
    setSubmittingPay(false);

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Payment not submitted',
        description: result.error || 'Try again',
      });
      return;
    }

    toast({
      title: 'Draft payment created',
      description: `Journal ${(result.data as any)?.journal?.entry_no || (result.data as any)?.payment?.journal_entry_no || ''} saved as DRAFT. Clear it to post debit/credit.`,
    });
    setPayForm((f) => ({
      ...f,
      supplier_name: '',
      supplier_reference: '',
      description: '',
      amount: '',
    }));
    setTab('approvals');
    await load();
  };

  const approvePayment = async (id: string) => {
    setActingId(id);
    const result = await apiClient.approveSupplierPayment(id);
    setActingId(null);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Approval failed',
        description: result.error || 'Try again',
      });
      return;
    }
    toast({
      title: 'Payment cleared',
      description: `Journal ${(result.data as any)?.journal?.entry_no || ''} posted — debit/credit now active.`,
    });
    await load();
  };

  const rejectPayment = async (id: string) => {
    const reason = window.prompt('Rejection reason (optional):') || '';
    setActingId(id);
    const result = await apiClient.rejectSupplierPayment(id, reason);
    setActingId(null);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Reject failed',
        description: result.error || 'Try again',
      });
      return;
    }
    toast({ title: 'Payment rejected' });
    await load();
  };

  return (
    <div className="space-y-5">
      <ErpToolbar
        title="Bank & Cash"
        description="Liquidity overview, supplier payments, and payment approvals."
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <Button
            type="button"
            className={erpPrimaryButtonClass()}
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add account
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
            {t.id === 'approvals' && pending.length > 0 ? (
              <span className="ml-2 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] text-slate-900">
                {pending.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading && !overview ? (
        <div className="flex h-40 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : null}

      {tab === 'overview' && overview ? (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-900">Bank accounts</h3>
              </div>
              {(overview.bank_accounts || []).length === 0 ? (
                <ErpEmptyState message="No bank accounts yet. Add a bank account to track balances." />
              ) : (
                <ul className="space-y-3">
                  {(overview.bank_accounts || []).map((a: any) => (
                    <li
                      key={a._id}
                      className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                        <p className="text-xs text-slate-500">
                          {a.code}
                          {a.bank_name ? ` · ${a.bank_name}` : ''}
                          {a.account_number_masked ? ` · ${a.account_number_masked}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-slate-900">
                        AED {money(a.current_balance)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5">
              <div className="mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Cash accounts</h3>
              </div>
              {(overview.cash_accounts || []).length === 0 ? (
                <ErpEmptyState message="No cash accounts yet. Add a cash account for petty cash." />
              ) : (
                <ul className="space-y-3">
                  {(overview.cash_accounts || []).map((a: any) => (
                    <li
                      key={a._id}
                      className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                        <p className="text-xs text-slate-500">{a.code}</p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-slate-900">
                        AED {money(a.current_balance)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-slate-900">Recent payments</h3>
            </div>
            {(overview.recent_payments || []).length === 0 ? (
              <ErpEmptyState message="No payments yet. Use Pay supplier to request a payment for approval." />
            ) : (
              <div className="overflow-x-auto">
                <Table className={erpTableClasses().table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Journal</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(overview.recent_payments || []).map((p: any) => (
                      <TableRow key={p._id}>
                        <TableCell>
                          <div className="font-medium">{p.payment_no}</div>
                          <div className="text-xs text-slate-400">{fmtDate(p.payment_date)}</div>
                        </TableCell>
                        <TableCell>{p.supplier_name}</TableCell>
                        <TableCell className="text-slate-500">{p.bank_cash_account_name}</TableCell>
                        <TableCell className="text-slate-500">{p.journal_entry_no || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          AED {money(p.amount)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                              statusTone(p.status)
                            )}
                          >
                            {p.status === 'PENDING_APPROVAL'
                              ? 'DRAFT'
                              : p.status === 'APPROVED'
                                ? 'CLEARED'
                                : String(p.status || '').replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'accounts' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
          {accounts.length === 0 ? (
            <div className="p-6">
              <ErpEmptyState message="No accounts yet. Create a bank or cash account." />
            </div>
          ) : (
            <Table className={erpTableClasses().table}>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>GL</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a._id}>
                    <TableCell className="font-medium">{a.code}</TableCell>
                    <TableCell>
                      <div>{a.name}</div>
                      {a.bank_name ? (
                        <div className="text-xs text-slate-400">
                          {a.bank_name}
                          {a.account_number_masked ? ` · ${a.account_number_masked}` : ''}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{a.account_type}</TableCell>
                    <TableCell className="text-slate-500">{a.gl_account_code}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      AED {money(a.current_balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      {tab === 'pay' ? (
        <div className="max-w-2xl rounded-3xl border border-slate-200/70 bg-white/90 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Pay supplier</h3>
          <p className="mt-1 text-sm text-slate-500">
            Creating a draft immediately opens a DRAFT journal with debit and credit lines. Clearing
            the payment posts that journal and updates the bank/cash balance.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Supplier name</Label>
              <Input
                value={payForm.supplier_name}
                onChange={(e) => setPayForm((f) => ({ ...f, supplier_name: e.target.value }))}
                placeholder="Supplier / vendor"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment date</Label>
              <Input
                type="date"
                value={payForm.payment_date}
                onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (AED)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Pay from</Label>
              <Select
                value={payForm.bank_cash_account_id}
                onValueChange={(v) => setPayForm((f) => ({ ...f, bank_cash_account_id: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select bank or cash account" />
                </SelectTrigger>
                <SelectContent>
                  {activeWallets.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.account_type} · {a.name} (AED {money(a.current_balance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Debit account (usually AP)</Label>
              <Select
                value={payForm.debit_account_code}
                onValueChange={(v) => setPayForm((f) => ({ ...f, debit_account_code: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select GL account" />
                </SelectTrigger>
                <SelectContent>
                  {glAccounts.map((a) => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.code} — {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Supplier reference</Label>
              <Input
                value={payForm.supplier_reference}
                onChange={(e) => setPayForm((f) => ({ ...f, supplier_reference: e.target.value }))}
                placeholder="Invoice / bill ref"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={payForm.description}
                onChange={(e) => setPayForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="mt-5">
            <Button
              type="button"
              className={erpPrimaryButtonClass()}
              disabled={submittingPay}
              onClick={() => void submitPayment()}
            >
              {submittingPay ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create draft payment
            </Button>
          </div>
        </div>
      ) : null}

      {tab === 'approvals' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
          {pending.length === 0 ? (
            <div className="p-6">
              <ErpEmptyState message="Nothing to clear. Draft supplier payments will appear here with DRAFT journals." />
            </div>
          ) : (
            <Table className={erpTableClasses().table}>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Journal</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell>
                      <div className="font-medium">{p.payment_no}</div>
                      <div className="text-xs text-slate-400">{fmtDate(p.payment_date)}</div>
                    </TableCell>
                    <TableCell>
                      <div>{p.supplier_name}</div>
                      {p.supplier_reference ? (
                        <div className="text-xs text-slate-400">{p.supplier_reference}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>{p.bank_cash_account_name}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">{p.journal_entry_no || '—'}</div>
                      <div className="text-[11px] font-semibold text-amber-700">DRAFT</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      AED {money(p.amount)}
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {p.requested_by_name || p.requested_by_email || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                          disabled={actingId === p._id}
                          onClick={() => void approvePayment(p._id)}
                        >
                          {actingId === p._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Clear / post
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={actingId === p._id}
                          onClick={() => void rejectPayment(p._id)}
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
        </div>
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add bank or cash account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={accountForm.code}
                onChange={(e) => setAccountForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="BANK-2"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={accountForm.account_type}
                onValueChange={(v) => setAccountForm((f) => ({ ...f, account_type: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK">Bank</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={accountForm.name}
                onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Emirates NBD operating"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Bank name</Label>
              <Input
                value={accountForm.bank_name}
                onChange={(e) => setAccountForm((f) => ({ ...f, bank_name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Masked account no.</Label>
              <Input
                value={accountForm.account_number_masked}
                onChange={(e) =>
                  setAccountForm((f) => ({ ...f, account_number_masked: e.target.value }))
                }
                placeholder="****1234"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Linked GL account</Label>
              <Select
                value={accountForm.gl_account_code}
                onValueChange={(v) => setAccountForm((f) => ({ ...f, gl_account_code: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select asset account" />
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
              <Label>Opening balance</Label>
              <Input
                type="number"
                step="0.01"
                value={accountForm.opening_balance}
                onChange={(e) =>
                  setAccountForm((f) => ({ ...f, opening_balance: e.target.value }))
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={accountForm.notes}
                onChange={(e) => setAccountForm((f) => ({ ...f, notes: e.target.value }))}
                className="rounded-xl"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className={erpPrimaryButtonClass()}
              disabled={savingAccount}
              onClick={() => void createAccount()}
            >
              {savingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
