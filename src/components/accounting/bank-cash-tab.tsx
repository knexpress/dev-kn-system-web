'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Building2,
  Check,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  Scale,
  Undo2,
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
  ErpModuleBody,
  ErpStatStrip,
  ErpToolbar,
  erpOutlineControlClass,
  erpPrimaryButtonClass,
  erpTableClasses,
} from './erp-shell';
import { fmtDate, money } from './erp-format';
import { cn } from '@/lib/utils';
import { COA } from '@/lib/coa-codes';
import BankReconciliationPanel from './bank-reconciliation-panel';
import { SupplierPaymentVoucherDialog } from './supplier-payment-voucher-document';

type TabId =
  | 'overview'
  | 'accounts'
  | 'entries'
  | 'payables'
  | 'pay'
  | 'approvals'
  | 'clearance'
  | 'history'
  | 'reconcile';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'entries', label: 'Entries' },
  { id: 'payables', label: 'Payables' },
  { id: 'pay', label: 'Pay supplier' },
  { id: 'approvals', label: 'Clear payments' },
  { id: 'clearance', label: 'Card & Tabby' },
  { id: 'history', label: 'Payment history' },
  { id: 'reconcile', label: 'Reconciliation' },
];

const PAYABLE_PO_STATUSES = ['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'];

function statusTone(status: string) {
  switch (status) {
    case 'PENDING_APPROVAL':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-800 ring-rose-200';
    case 'REVERSED':
      return 'bg-violet-50 text-violet-800 ring-violet-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

function daysUntil(date?: string | null) {
  if (!date) return null;
  const due = new Date(date);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function DueBadge({ days }: { days: number | null }) {
  if (days == null) return <span className="text-xs text-slate-400">No due date</span>;
  const tone =
    days < 0
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : days <= 7
        ? 'bg-amber-50 text-amber-800 ring-amber-200'
        : 'bg-slate-50 text-slate-600 ring-slate-200';
  const text = days < 0 ? `${-days}d overdue` : days === 0 ? 'Due today' : `Due in ${days}d`;
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', tone)}>{text}</span>
  );
}

function invoicePayState(po: any) {
  if (po.left_to_pay <= 0.009 && po.pending > 0.009) {
    return { label: 'Awaiting clearance', tone: 'bg-amber-50 text-amber-800 ring-amber-200' };
  }
  if (po.paid > 0.009 || po.pending > 0.009) {
    return { label: 'Partially paid', tone: 'bg-sky-50 text-sky-800 ring-sky-200' };
  }
  return { label: 'Unpaid', tone: 'bg-rose-50 text-rose-700 ring-rose-200' };
}

function statusLabel(status: string) {
  if (status === 'PENDING_APPROVAL') return 'DRAFT';
  if (status === 'APPROVED') return 'CLEARED';
  return String(status || '').replace(/_/g, ' ');
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
        statusTone(status)
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

type EntryDirection = 'IN' | 'OUT' | 'TRANSFER';

const ENTRY_KINDS: { id: EntryDirection; label: string; hint: string }[] = [
  { id: 'IN', label: 'Money in', hint: 'Deposit into a wallet' },
  { id: 'OUT', label: 'Money out', hint: 'Pay from a wallet' },
  { id: 'TRANSFER', label: 'Transfer', hint: 'Move between wallets' },
];

function entryKindFromMemo(memo: string): EntryDirection {
  const text = String(memo || '');
  if (/^Transfer\b/i.test(text)) return 'TRANSFER';
  if (/^Money out\b/i.test(text)) return 'OUT';
  return 'IN';
}

function entryKindTone(kind: EntryDirection) {
  if (kind === 'IN') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (kind === 'OUT') return 'bg-rose-50 text-rose-700 ring-rose-200';
  return 'bg-sky-50 text-sky-800 ring-sky-200';
}

export default function BankCashTab() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isFm = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [glAccounts, setGlAccounts] = useState<any[]>([]);
  const [payables, setPayables] = useState<any>(null);
  const [clearance, setClearance] = useState<any>(null);
  const [clearanceFilter, setClearanceFilter] = useState<'open' | 'settled' | 'all'>('open');
  const [settleTarget, setSettleTarget] = useState<any>(null);
  const [settleBankId, setSettleBankId] = useState('');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().slice(0, 10));
  const [historyFilter, setHistoryFilter] = useState('ALL');

  const [entries, setEntries] = useState<any[]>([]);
  const [entryOpen, setEntryOpen] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryForm, setEntryForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    direction: 'IN' as EntryDirection,
    amount: '',
    bank_cash_account_id: '',
    to_bank_cash_account_id: '',
    counter_account_code: '',
    reference: '',
    memo: '',
  });

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
    debit_account_code: COA.ap,
    purchase_order_id: '',
  });
  const [submittingPay, setSubmittingPay] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reverseTarget, setReverseTarget] = useState<any>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [voucherPayment, setVoucherPayment] = useState<any | null>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [directPay, setDirectPay] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<'OUTSTANDING' | 'OVERDUE' | 'PENDING'>('OUTSTANDING');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, acc, pay, gl, ap, gw, en] = await Promise.all([
      apiClient.getBankCashOverview(),
      apiClient.getBankCashAccounts(),
      apiClient.getSupplierPayments(),
      apiClient.getAccounts(),
      apiClient.getPayablesSummary(),
      apiClient.getGatewayClearance(clearanceFilter),
      apiClient.getBankCashEntries(),
    ]);

    if (ov.success) setOverview(ov.data);
    if (acc.success) setAccounts((acc.data as any[]) || []);
    if (pay.success) setPayments((pay.data as any[]) || []);
    if (ap.success) setPayables(ap.data);
    if (gw.success) setClearance(gw.data);
    if (en.success) setEntries((en.data as any[]) || []);
    if (gl.success) {
      const list = ((gl.data as any[]) || []).filter((a) => a.is_active !== false && a.is_postable !== false);
      setGlAccounts(list);
    }
    setLoading(false);
  }, [clearanceFilter]);

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
  const bankWallets = useMemo(
    () => activeWallets.filter((a) => String(a.account_type).toUpperCase() === 'BANK'),
    [activeWallets]
  );

  const openInvoices = useMemo(
    () =>
      ((payables?.purchase_orders as any[]) || [])
        .filter(
          (po) => PAYABLE_PO_STATUSES.includes(po.status) && (po.left_to_pay > 0.009 || po.pending > 0.009)
        )
        .map((po) => ({ ...po, days_to_due: daysUntil(po.due_date) }))
        .sort((a, b) => (a.days_to_due ?? 9999) - (b.days_to_due ?? 9999)),
    [payables]
  );

  const visibleInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    return openInvoices.filter((po) => {
      if (invoiceFilter === 'OVERDUE' && !(po.days_to_due != null && po.days_to_due < 0 && po.left_to_pay > 0.009)) {
        return false;
      }
      if (invoiceFilter === 'PENDING' && !(po.pending > 0.009)) return false;
      if (!q) return true;
      return [po.supplier_name, po.supplier_invoice_no, po.po_no, po.supplier_trn].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [openInvoices, invoiceFilter, invoiceSearch]);

  const invoiceTotals = useMemo(
    () => ({
      outstanding: openInvoices.reduce((s, po) => s + po.left_to_pay, 0),
      overdue: openInvoices
        .filter((po) => po.days_to_due != null && po.days_to_due < 0)
        .reduce((s, po) => s + po.left_to_pay, 0),
      overdueCount: openInvoices.filter((po) => po.days_to_due != null && po.days_to_due < 0 && po.left_to_pay > 0.009)
        .length,
      pending: openInvoices.reduce((s, po) => s + po.pending, 0),
      pendingCount: openInvoices.filter((po) => po.pending > 0.009).length,
    }),
    [openInvoices]
  );

  const selectedPo = useMemo(
    () => openInvoices.find((po) => po._id === payForm.purchase_order_id) || null,
    [openInvoices, payForm.purchase_order_id]
  );

  const selectedPoPayments = useMemo(
    () => (selectedPo ? payments.filter((p) => String(p.purchase_order_id) === String(selectedPo._id)) : []),
    [payments, selectedPo]
  );

  const history = useMemo(
    () =>
      payments.filter((p) =>
        historyFilter === 'ALL' ? p.status !== 'PENDING_APPROVAL' : p.status === historyFilter
      ),
    [payments, historyFilter]
  );

  const selectPo = (poId: string) => {
    const po = openInvoices.find((p) => p._id === poId);
    if (!po) {
      setPayForm((f) => ({ ...f, purchase_order_id: '' }));
      return;
    }
    const suggested = po.owed_now > 0.009 ? Math.min(po.owed_now, po.left_to_pay) : po.left_to_pay;
    setDirectPay(false);
    setPayForm((f) => ({
      ...f,
      purchase_order_id: po._id,
      supplier_name: po.supplier_name,
      supplier_reference: po.supplier_invoice_no || po.po_no,
      description: `Payment for invoice ${po.supplier_invoice_no || po.po_no}`,
      amount: suggested > 0 ? suggested.toFixed(2) : '',
      debit_account_code: COA.ap,
      bank_cash_account_id: f.bank_cash_account_id || activeWallets[0]?._id || '',
    }));
  };

  const startDirectPayment = () => {
    setDirectPay(true);
    setPayForm((f) => ({
      ...f,
      purchase_order_id: '',
      supplier_name: '',
      supplier_reference: '',
      description: '',
      amount: '',
      debit_account_code: COA.ap,
    }));
  };

  const showSupplierInvoices = (name: string) => {
    setInvoiceSearch(name);
    setInvoiceFilter('OUTSTANDING');
    setTab('pay');
  };

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
    {
      label: 'Card & Tabby',
      value: `AED ${money(clearance?.totals?.open_amount)}`,
      hint:
        clearance?.totals?.overdue_count > 0
          ? `${clearance.totals.open_count || 0} open · ${clearance.totals.overdue_count} overdue`
          : `${clearance?.totals?.open_count || 0} waiting on merchant`,
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

  const openEntry = (direction: EntryDirection = 'IN') => {
    setEntryForm({
      entry_date: new Date().toISOString().slice(0, 10),
      direction,
      amount: '',
      bank_cash_account_id: activeWallets[0]?._id || '',
      to_bank_cash_account_id: '',
      counter_account_code: '',
      reference: '',
      memo: '',
    });
    setEntryOpen(true);
  };

  const submitEntry = async () => {
    const amount = Number(entryForm.amount);
    if (!entryForm.bank_cash_account_id || !(amount > 0)) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Choose an account and enter an amount greater than 0.',
      });
      return;
    }
    if (entryForm.direction === 'TRANSFER' && !entryForm.to_bank_cash_account_id) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Choose the account to transfer into.',
      });
      return;
    }
    if (entryForm.direction !== 'TRANSFER' && !entryForm.counter_account_code) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Choose a counterpart GL account.',
      });
      return;
    }
    if (activeWallets.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No wallets',
        description: 'Add a bank or cash account first.',
      });
      return;
    }

    setSavingEntry(true);
    const result = await apiClient.createBankCashEntry({
      entry_date: entryForm.entry_date,
      direction: entryForm.direction,
      amount,
      bank_cash_account_id: entryForm.bank_cash_account_id,
      to_bank_cash_account_id:
        entryForm.direction === 'TRANSFER' ? entryForm.to_bank_cash_account_id : undefined,
      counter_account_code:
        entryForm.direction === 'TRANSFER' ? undefined : entryForm.counter_account_code,
      reference: entryForm.reference.trim() || undefined,
      memo: entryForm.memo.trim() || undefined,
    });
    setSavingEntry(false);

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Could not post entry',
        description: result.error || 'Try again',
      });
      return;
    }

    const kind = ENTRY_KINDS.find((k) => k.id === entryForm.direction)?.label || 'Entry';
    toast({ title: `${kind} posted`, description: `AED ${money(amount)}` });
    setEntryOpen(false);
    setTab('entries');
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
      debit_account_code: payForm.debit_account_code || COA.ap,
      purchase_order_id: payForm.purchase_order_id || undefined,
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

    const created = result.data as any;
    toast({
      title: 'Draft payment voucher created',
      description: `${created?.payment?.payment_no || ''} — journal ${
        created?.journal?.entry_no || created?.payment?.journal_entry_no || ''
      } saved as DRAFT. ${isFm ? 'Clear it to post the payment.' : 'A Finance Manager will clear it.'}`,
    });
    setPayForm((f) => ({
      ...f,
      supplier_name: '',
      supplier_reference: '',
      description: '',
      amount: '',
      purchase_order_id: '',
    }));
    setDirectPay(false);
    if (created?.payment) {
      setVoucherPayment(created.payment);
      setVoucherOpen(true);
    }
    if (isFm) setTab('approvals');
    await load();
  };

  const reversePayment = async () => {
    if (!reverseTarget) return;
    setActingId(reverseTarget._id);
    const result = await apiClient.reverseSupplierPayment(reverseTarget._id, reverseReason.trim());
    setActingId(null);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Reversal failed',
        description: result.error || 'Try again',
      });
      return;
    }
    const data = result.data as any;
    toast({
      title: 'Payment reversed',
      description: `Journal ${data?.journal?.entry_no || ''} posted — AED ${money(reverseTarget.amount)} returned to ${reverseTarget.bank_cash_account_name}${
        data?.purchase_order?.po_no ? ` and ${data.purchase_order.po_no} reopened for payment` : ''
      }.`,
    });
    setReverseTarget(null);
    setReverseReason('');
    await load();
  };

  const openSettle = (item: any) => {
    const adcb = bankWallets.find((a) => a.code === 'ADCB');
    setSettleBankId(adcb?._id || bankWallets[0]?._id || '');
    setSettleDate(new Date().toISOString().slice(0, 10));
    setSettleTarget(item);
  };

  const settleClearance = async () => {
    if (!settleTarget) return;
    setActingId(settleTarget.id);
    const result: any = await apiClient.settleGatewayClearance({
      id: settleTarget.id,
      bank_cash_account_id: settleBankId || undefined,
      settled_at: settleDate || undefined,
    });
    setActingId(null);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Could not close remittance',
        description: result.error || 'Try again',
      });
      return;
    }
    const bankName =
      bankWallets.find((a) => a._id === settleBankId)?.name || settleTarget.settle_bank_name || 'bank';
    toast({
      title: `${settleTarget.mode_label} closed`,
      description: `AED ${money(settleTarget.amount)} moved from ${settleTarget.clearing_code} into ${bankName}${
        result.data?.journal_no ? ` · ${result.data.journal_no}` : ''
      }.`,
    });
    setSettleTarget(null);
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
    <div className="flex flex-col">
      <ErpToolbar
        title="Bank & Cash"
        description="Liquidity overview, supplier payments, approvals, and bank reconciliation."
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className={erpOutlineControlClass()}
              onClick={() => openEntry('IN')}
            >
              <Banknote className="h-4 w-4" />
              Add entry
            </Button>
            <Button
              type="button"
              className={erpPrimaryButtonClass()}
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add account
            </Button>
          </>
        }
      />

      <ErpStatStrip items={stats} />

      <ErpModuleBody>
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
              {t.id === 'approvals' && pending.length > 0 ? (
                <span className="ml-2 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] text-slate-900">
                  {pending.length}
                </span>
              ) : null}
              {t.id === 'clearance' && (clearance?.totals?.open_count || 0) > 0 ? (
                <span className="ml-2 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] text-slate-900">
                  {clearance.totals.open_count}
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
                            <StatusPill status={p.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-brand-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Recent entries</h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 text-xs text-brand-600"
                  onClick={() => setTab('entries')}
                >
                  View all
                </Button>
              </div>
              {entries.length === 0 ? (
                <ErpEmptyState message="No manual entries yet. Use Add entry to post money in, money out, or a transfer." />
              ) : (
                <ul className="space-y-2">
                  {entries.slice(0, 6).map((entry) => {
                    const kind = entryKindFromMemo(entry.memo);
                    return (
                      <li
                        key={entry._id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                                entryKindTone(kind)
                              )}
                            >
                              {ENTRY_KINDS.find((k) => k.id === kind)?.label}
                            </span>
                            <span className="truncate text-sm font-medium text-slate-900">
                              {entry.memo || entry.entry_no}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {fmtDate(entry.entry_date)}
                            {entry.entry_no ? ` · ${entry.entry_no}` : ''}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                          AED {money(entry.total_debit)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
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

        {tab === 'entries' ? (
          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            {entries.length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No posted entries yet. Add a money in, money out, or transfer against a bank or cash account." />
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    className={erpPrimaryButtonClass()}
                    onClick={() => openEntry('IN')}
                  >
                    <Banknote className="h-4 w-4" />
                    Add entry
                  </Button>
                </div>
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Journal</TableHead>
                    <TableHead>Memo</TableHead>
                    <TableHead>Accounts</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const kind = entryKindFromMemo(entry.memo);
                    const debit = (entry.lines || []).find((l: any) => Number(l.debit) > 0);
                    const credit = (entry.lines || []).find((l: any) => Number(l.credit) > 0);
                    return (
                      <TableRow key={entry._id}>
                        <TableCell className="whitespace-nowrap text-slate-600">
                          {fmtDate(entry.entry_date)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                              entryKindTone(kind)
                            )}
                          >
                            {ENTRY_KINDS.find((k) => k.id === kind)?.label}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{entry.entry_no || '—'}</TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">{entry.memo || '—'}</div>
                          {entry.source_reference ? (
                            <div className="text-xs text-slate-400">{entry.source_reference}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          <div>
                            Dr {debit?.account_code} {debit?.account_name}
                          </div>
                          <div>
                            Cr {credit?.account_code} {credit?.account_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          AED {money(entry.total_debit)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        ) : null}

        {tab === 'payables' ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                { label: 'Billed (goods received)', value: payables?.totals?.billed },
                { label: 'Paid (cleared)', value: payables?.totals?.paid },
                { label: 'Awaiting clearance', value: payables?.totals?.pending },
                { label: 'Outstanding', value: payables?.totals?.outstanding },
                { label: 'AP ledger (2000)', value: payables?.totals?.ap_gl_balance },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-200/70 bg-white/90 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">AED {money(s.value)}</p>
                </div>
              ))}
            </div>
            {payables?.totals &&
            Math.abs((payables.totals.outstanding || 0) - (payables.totals.ap_gl_balance || 0)) > 0.01 ? (
              <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
                <Scale className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Supplier balances differ from the AP ledger by AED{' '}
                  {money((payables.totals.ap_gl_balance || 0) - (payables.totals.outstanding || 0))}. This usually
                  comes from manual journals to 2000 or payments made without a purchase order.
                </span>
              </div>
            ) : null}

            <section className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
              <div className="flex items-center gap-2 px-5 pt-5">
                <Building2 className="h-4 w-4 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-900">Supplier balances</h3>
              </div>
              {((payables?.suppliers as any[]) || []).length === 0 ? (
                <div className="p-6">
                  <ErpEmptyState message="No supplier activity yet. Approved purchase orders and supplier payments appear here." />
                </div>
              ) : (
                <Table className={erpTableClasses().table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Awaiting clearance</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payables.suppliers as any[]).map((s) => (
                      <TableRow key={s.supplier_name}>
                        <TableCell>
                          <div className="font-medium">{s.supplier_name}</div>
                          <div className="text-xs text-slate-400">{s.open_pos} open PO{s.open_pos === 1 ? '' : 's'}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">AED {money(s.ordered)}</TableCell>
                        <TableCell className="text-right tabular-nums">AED {money(s.billed)}</TableCell>
                        <TableCell className="text-right tabular-nums">AED {money(s.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums text-amber-700">
                          {s.pending > 0 ? `AED ${money(s.pending)}` : '—'}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right tabular-nums font-semibold',
                            s.outstanding < -0.009 ? 'text-sky-700' : 'text-slate-900'
                          )}
                        >
                          AED {money(s.outstanding)}
                          {s.outstanding < -0.009 ? (
                            <div className="text-[11px] font-normal text-sky-600">Advance paid</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.open_pos > 0 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => showSupplierInvoices(s.supplier_name)}
                            >
                              Invoices
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

          </div>
        ) : null}

        {tab === 'pay' ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  key: 'OUTSTANDING' as const,
                  label: 'Unpaid invoices',
                  value: invoiceTotals.outstanding,
                  hint: `${openInvoices.filter((po) => po.left_to_pay > 0.009).length} invoices`,
                },
                {
                  key: 'OVERDUE' as const,
                  label: 'Overdue',
                  value: invoiceTotals.overdue,
                  hint: `${invoiceTotals.overdueCount} past due date`,
                },
                {
                  key: 'PENDING' as const,
                  label: 'Pending clearance',
                  value: invoiceTotals.pending,
                  hint: `${invoiceTotals.pendingCount} awaiting Finance Manager`,
                },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setInvoiceFilter(c.key)}
                  className={cn(
                    'rounded-2xl border bg-white/90 px-4 py-3 text-left transition-all',
                    invoiceFilter === c.key
                      ? 'border-brand-400 ring-2 ring-brand-200'
                      : 'border-slate-200/70 hover:border-slate-300'
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{c.label}</p>
                  <p
                    className={cn(
                      'mt-1 text-lg font-semibold tabular-nums',
                      c.key === 'OVERDUE' && c.value > 0 ? 'text-rose-700' : 'text-slate-900'
                    )}
                  >
                    AED {money(c.value)}
                  </p>
                  <p className="text-xs text-slate-400">{c.hint}</p>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Search supplier, invoice no., PO, TRN"
                className="max-w-xs rounded-xl"
              />
              {invoiceSearch ? (
                <Button type="button" size="sm" variant="ghost" className="rounded-xl" onClick={() => setInvoiceSearch('')}>
                  Clear
                </Button>
              ) : null}
              <div className="ml-auto">
                <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={startDirectPayment}>
                  Pay without an invoice
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
              {visibleInvoices.length === 0 ? (
                <div className="p-6">
                  <ErpEmptyState
                    message={
                      openInvoices.length === 0
                        ? 'No unpaid supplier invoices. Approved invoices from the Purchase module appear here.'
                        : 'No invoices match this filter.'
                    }
                  />
                </div>
              ) : (
                <Table className={erpTableClasses().table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier invoice</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead className="text-right">Invoice total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleInvoices.map((po) => {
                      const state = invoicePayState(po);
                      const active = selectedPo?._id === po._id;
                      return (
                        <TableRow
                          key={po._id}
                          className={cn('cursor-pointer', active && 'bg-brand-50/60')}
                          onClick={() => selectPo(po._id)}
                        >
                          <TableCell>
                            <div className="font-medium">{po.supplier_invoice_no || '—'}</div>
                            <div className="text-xs text-slate-400">{po.po_no}</div>
                          </TableCell>
                          <TableCell>
                            <div>{po.supplier_name}</div>
                            {po.supplier_trn ? <div className="text-xs text-slate-400">TRN {po.supplier_trn}</div> : null}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">
                            <div>Inv {fmtDate(po.supplier_invoice_date)}</div>
                            <div className="mt-1">
                              {po.due_date ? <>{fmtDate(po.due_date)} </> : null}
                              {po.left_to_pay > 0.009 ? <DueBadge days={po.days_to_due} /> : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">AED {money(po.total_amount)}</TableCell>
                          <TableCell className="text-right tabular-nums">AED {money(po.paid)}</TableCell>
                          <TableCell className="text-right tabular-nums text-amber-700">
                            {po.pending > 0 ? `AED ${money(po.pending)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">AED {money(po.left_to_pay)}</TableCell>
                          <TableCell>
                            <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', state.tone)}>
                              {state.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {po.left_to_pay > 0.009 ? (
                              <Button
                                type="button"
                                size="sm"
                                className={cn('rounded-xl', active ? 'bg-brand-600 text-white' : '')}
                                variant={active ? 'default' : 'outline'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectPo(po._id);
                                }}
                              >
                                {active ? 'Selected' : 'Pay'}
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {selectedPo || directPay ? (
          <div className={cn('grid gap-5', selectedPo && 'lg:grid-cols-5')}>
            {selectedPo ? (
              <section className="space-y-4 rounded-3xl border border-slate-200/70 bg-white/90 p-5 sm:p-6 lg:col-span-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Invoice {selectedPo.supplier_invoice_no || selectedPo.po_no}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedPo.po_no} · invoice date {fmtDate(selectedPo.supplier_invoice_date)}
                      {selectedPo.due_date ? ` · due ${fmtDate(selectedPo.due_date)}` : ''}
                    </p>
                  </div>
                  {selectedPo.left_to_pay > 0.009 ? <DueBadge days={selectedPo.days_to_due} /> : null}
                </div>

                <div className="grid gap-x-6 gap-y-2 rounded-2xl bg-slate-50/80 px-4 py-3 text-xs text-slate-600 sm:grid-cols-2">
                  <div>
                    <p className="text-slate-400">Supplier</p>
                    <p className="font-medium text-slate-900">{selectedPo.supplier_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">TRN</p>
                    <p className="font-medium text-slate-900">{selectedPo.supplier_trn || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Phone / email</p>
                    <p className="font-medium text-slate-900">
                      {[selectedPo.supplier_phone, selectedPo.supplier_email].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Address</p>
                    <p className="font-medium text-slate-900">{selectedPo.supplier_address || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Bank</p>
                    <p className="font-medium text-slate-900">{selectedPo.supplier_bank_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">IBAN</p>
                    <p className="font-mono font-medium text-slate-900">{selectedPo.supplier_iban || '—'}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table className={erpTableClasses().table}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedPo.lines || []).map((l: any, i: number) => (
                        <TableRow key={`${l.description}-${i}`}>
                          <TableCell>
                            <div>{l.description}</div>
                            <div className="text-[11px] text-slate-400">
                              GL {l.account_code || selectedPo.debit_account_code}
                              {l.account_name ? ` — ${l.account_name}` : ''}
                            </div>
                            {selectedPo.receive_later ? (
                              <div className="text-[11px] text-slate-400">
                                {l.received_qty} of {l.quantity} received
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(l.unit_cost)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(l.line_total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="ml-auto grid max-w-xs grid-cols-2 gap-y-1 text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-right tabular-nums">AED {money(selectedPo.subtotal)}</span>
                  <span className="text-slate-500">VAT</span>
                  <span className="text-right tabular-nums">AED {money(selectedPo.tax_amount)}</span>
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="text-right font-semibold tabular-nums">AED {money(selectedPo.total_amount)}</span>
                  <span className="text-slate-500">Paid</span>
                  <span className="text-right tabular-nums">− AED {money(selectedPo.paid)}</span>
                  {selectedPo.pending > 0 ? (
                    <>
                      <span className="text-amber-700">Pending clearance</span>
                      <span className="text-right tabular-nums text-amber-700">− AED {money(selectedPo.pending)}</span>
                    </>
                  ) : null}
                  <span className="font-semibold text-emerald-700">Balance to pay</span>
                  <span className="text-right font-semibold tabular-nums text-emerald-700">
                    AED {money(selectedPo.left_to_pay)}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <p>
                    <span className="text-slate-400">Accounts entries: </span>
                    {[selectedPo.journal_entry_no, ...(selectedPo.receipt_journal_nos || [])]
                      .filter((v, i, arr) => v && arr.indexOf(v) === i)
                      .join(', ') || '—'}
                  </p>
                  {selectedPoPayments.length ? (
                    <div className="space-y-1 pt-1">
                      <p className="text-slate-400">Payments on this invoice</p>
                      {selectedPoPayments.map((p) => (
                        <div key={p._id} className="flex items-center justify-between gap-2">
                          <span>
                            {p.payment_no} · {fmtDate(p.payment_date)} · {p.bank_cash_account_name}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums">AED {money(p.amount)}</span>
                            <StatusPill status={p.status} />
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

          <div
            className={cn(
              'rounded-3xl border border-slate-200/70 bg-white/90 p-5 sm:p-6',
              selectedPo ? 'lg:col-span-2' : 'max-w-2xl'
            )}
          >
            <h3 className="text-base font-semibold text-slate-900">
              {selectedPo ? 'Make payment' : 'Pay without an invoice'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              This creates a DRAFT payment and journal. A Finance Manager clears it under Clear payments,
              which posts the journal and takes the money out of the bank/cash account.
            </p>
            {selectedPo && selectedPo.left_to_pay <= 0.009 ? (
              <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
                The full balance already has payments awaiting clearance.
              </p>
            ) : null}
            {selectedPo && Number(payForm.amount) > selectedPo.left_to_pay + 0.009 ? (
              <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-xs text-rose-700 ring-1 ring-rose-200">
                Amount is more than the AED {money(selectedPo.left_to_pay)} balance.
              </p>
            ) : selectedPo && Number(payForm.amount) > selectedPo.billed - selectedPo.paid + 0.009 ? (
              <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
                Paying more than the goods received so far — the excess sits in AP as a supplier advance.
              </p>
            ) : null}
            <div className={cn('mt-5 grid gap-4', !selectedPo && 'sm:grid-cols-2')}>
              {!selectedPo ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Supplier name</Label>
                  <Input
                    value={payForm.supplier_name}
                    onChange={(e) => setPayForm((f) => ({ ...f, supplier_name: e.target.value }))}
                    placeholder="Supplier / vendor"
                    className="rounded-xl"
                  />
                </div>
              ) : null}
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
              {!selectedPo ? (
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
              ) : null}
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
                disabled={
                  submittingPay ||
                  (selectedPo ? Number(payForm.amount) > selectedPo.left_to_pay + 0.009 || selectedPo.left_to_pay <= 0.009 : false)
                }
                onClick={() => void submitPayment()}
              >
                {submittingPay ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create draft payment
              </Button>
            </div>
          </div>
          </div>
            ) : (
              <p className="text-center text-xs text-slate-400">
                Select an invoice above to see its full details and pay it.
              </p>
            )}
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
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              setVoucherPayment(p);
                              setVoucherOpen(true);
                            }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Voucher
                          </Button>
                          {!isFm ? (
                            <span className="self-center text-xs text-slate-400">Awaiting Finance Manager</span>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ) : null}

        {tab === 'clearance' ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-4 text-sm text-slate-600">
              <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                <CreditCard className="h-4 w-4 text-sky-600" />
                Merchant remittances
              </div>
              Card collections sit in {clearance?.items?.find((i: any) => i.mode === 'CARD')?.clearing_code || '11020'}{' '}
              and are due the next day. Tabby sits in{' '}
              {clearance?.items?.find((i: any) => i.mode === 'TABBY')?.clearing_code || '11030'} and is due in 10 days.
              Close a line when that payment hits the bank — Dr ADCB / Cr clearance.
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Open in clearance</p>
                <p className="text-lg font-semibold text-slate-900">AED {money(clearance?.totals?.open_amount)}</p>
                <p className="text-xs text-slate-500">{clearance?.totals?.open_count || 0} payments</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Card (1 day)</p>
                <p className="text-lg font-semibold text-slate-900">AED {money(clearance?.totals?.card_open_amount)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tabby (10 days)</p>
                <p className="text-lg font-semibold text-slate-900">AED {money(clearance?.totals?.tabby_open_amount)}</p>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {(['open', 'settled', 'all'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setClearanceFilter(s)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 transition-all',
                    clearanceFilter === s
                      ? 'bg-slate-900 text-white ring-slate-900'
                      : 'bg-white text-slate-500 ring-slate-200 hover:text-slate-800'
                  )}
                >
                  {s === 'open' ? 'Waiting on merchant' : s === 'settled' ? 'Closed' : 'All'}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
              {(clearance?.items || []).length === 0 ? (
                <div className="p-6">
                  <ErpEmptyState message="No Tabby or card payments in this view. Record a card/Tabby receipt on an invoice and it will appear here until the merchant remits." />
                </div>
              ) : (
                <Table className={erpTableClasses().table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Expected in bank</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(clearance.items as any[]).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-semibold text-slate-900">{item.ref}</div>
                          <div className="text-xs text-slate-500">
                            {item.mode_label}
                            {item.source === 'advance' || item.source === 'quotation' ? ' advance' : ''}
                            {item.payment_reference ? ` · ${item.payment_reference}` : ''}
                            {item.journal_no ? ` · ${item.journal_no}` : ''}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.clearing_code} {item.clearing_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-800">{item.customer_name || '—'}</div>
                          {item.awb_number ? <div className="text-xs text-slate-400">{item.awb_number}</div> : null}
                        </TableCell>
                        <TableCell>{fmtDate(item.collected_at)}</TableCell>
                        <TableCell>
                          {item.status === 'SETTLED' ? (
                            <div>
                              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                                Closed {fmtDate(item.settled_at)}
                              </span>
                              <div className="mt-1 text-[11px] text-slate-400">
                                {item.settle_bank_name}
                                {item.settle_journal_no ? ` · ${item.settle_journal_no}` : ''}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <DueBadge days={item.days_until_due} />
                              <div className="mt-1 text-[11px] text-slate-400">{fmtDate(item.expected_settlement_at)}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          AED {money(item.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.status === 'OPEN' ? (
                            isFm ? (
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                disabled={actingId === item.id}
                                onClick={() => openSettle(item)}
                              >
                                Close
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">Awaiting Finance Manager</span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">Settled</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        ) : null}

        {tab === 'history' ? (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto">
              {['ALL', 'APPROVED', 'REVERSED', 'REJECTED'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setHistoryFilter(s)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1 transition-all',
                    historyFilter === s
                      ? 'bg-slate-900 text-white ring-slate-900'
                      : 'bg-white text-slate-500 ring-slate-200 hover:text-slate-800'
                  )}
                >
                  {s === 'ALL' ? 'All processed' : statusLabel(s)}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
              {history.length === 0 ? (
                <div className="p-6">
                  <ErpEmptyState message="No processed payments yet. Cleared, rejected and reversed payments are listed here." />
                </div>
              ) : (
                <Table className={erpTableClasses().table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Journals</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell>
                          <div className="font-medium">{p.payment_no}</div>
                          <div className="text-xs text-slate-400">{fmtDate(p.payment_date)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{p.supplier_name}</div>
                          {p.purchase_order_no || p.supplier_reference ? (
                            <div className="text-xs text-slate-400">{p.purchase_order_no || p.supplier_reference}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-slate-500">{p.bank_cash_account_name}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          <div>{p.journal_entry_no || '—'}</div>
                          {p.reversal_journal_no ? (
                            <div className="text-violet-700">Reversal {p.reversal_journal_no}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">AED {money(p.amount)}</TableCell>
                        <TableCell>
                          <StatusPill status={p.status} />
                          {p.reversal_reason || p.rejection_reason ? (
                            <div className="mt-1 max-w-[200px] truncate text-[11px] text-slate-400">
                              {p.reversal_reason || p.rejection_reason}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              setVoucherPayment(p);
                              setVoucherOpen(true);
                            }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Voucher
                          </Button>
                          {isFm && p.status === 'APPROVED' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-violet-700"
                              disabled={actingId === p._id}
                              onClick={() => {
                                setReverseReason('');
                                setReverseTarget(p);
                              }}
                            >
                              <Undo2 className="h-3.5 w-3.5" />
                              Reverse
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
          </div>
        ) : null}

        {tab === 'reconcile' ? <BankReconciliationPanel accounts={accounts} /> : null}

        <SupplierPaymentVoucherDialog
          payment={voucherPayment}
          open={voucherOpen}
          onOpenChange={setVoucherOpen}
          canApprove={isFm}
          onApprove={async (payment) => {
            await approvePayment(payment._id);
            const refreshed = payments.find((p) => p._id === payment._id);
            if (refreshed) setVoucherPayment({ ...refreshed, status: 'APPROVED' });
            else setVoucherPayment({ ...payment, status: 'APPROVED' });
          }}
        />

        <Dialog open={Boolean(settleTarget)} onOpenChange={(open) => !open && setSettleTarget(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Close {settleTarget?.mode_label} remittance</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              {settleTarget?.ref} — AED {money(settleTarget?.amount)} leaves {settleTarget?.clearing_code}{' '}
              {settleTarget?.clearing_name} and posts into the bank you choose. Use this after the merchant has
              remitted that specific payment.
            </p>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Bank received</Label>
                <Select value={settleBankId} onValueChange={setSettleBankId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankWallets.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name} ({a.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date received in bank</Label>
                <Input
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setSettleTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                disabled={!settleTarget || !settleBankId || actingId === settleTarget?.id}
                onClick={() => void settleClearance()}
              >
                {actingId === settleTarget?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Close to bank
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(reverseTarget)} onOpenChange={(open) => !open && setReverseTarget(null)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Reverse {reverseTarget?.payment_no}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              Posts a reversing journal for {reverseTarget?.journal_entry_no}, returns AED{' '}
              {money(reverseTarget?.amount)} to {reverseTarget?.bank_cash_account_name}
              {reverseTarget?.purchase_order_no
                ? ` and puts it back on ${reverseTarget.purchase_order_no} as unpaid`
                : ''}
              . The original entry stays in the ledger for audit.
            </p>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                rows={2}
                placeholder="e.g. Cheque bounced, paid wrong supplier"
                className="rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setReverseTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-violet-600 hover:bg-violet-700"
                disabled={!reverseTarget || actingId === reverseTarget?._id}
                onClick={() => void reversePayment()}
              >
                {actingId === reverseTarget?._id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Reverse payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
          <DialogContent className="max-w-lg rounded-3xl">
            <DialogHeader>
              <DialogTitle>Add bank & cash entry</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-2">
                {ENTRY_KINDS.map((kind) => {
                  const Icon =
                    kind.id === 'IN' ? ArrowDownLeft : kind.id === 'OUT' ? ArrowUpRight : ArrowLeftRight;
                  const active = entryForm.direction === kind.id;
                  return (
                    <button
                      key={kind.id}
                      type="button"
                      onClick={() =>
                        setEntryForm((f) => ({
                          ...f,
                          direction: kind.id,
                          to_bank_cash_account_id:
                            kind.id === 'TRANSFER' ? f.to_bank_cash_account_id : '',
                          counter_account_code: kind.id === 'TRANSFER' ? '' : f.counter_account_code,
                        }))
                      }
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center text-xs font-semibold ring-1 transition',
                        active
                          ? 'bg-brand-50 text-brand-700 ring-brand-200'
                          : 'bg-white text-slate-500 ring-slate-200 hover:text-brand-600'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {kind.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={entryForm.entry_date}
                    onChange={(e) => setEntryForm((f) => ({ ...f, entry_date: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (AED)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryForm.amount}
                    onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    {entryForm.direction === 'IN'
                      ? 'Deposit into'
                      : entryForm.direction === 'OUT'
                        ? 'Pay from'
                        : 'Transfer from'}
                  </Label>
                  <Select
                    value={entryForm.bank_cash_account_id}
                    onValueChange={(v) =>
                      setEntryForm((f) => ({
                        ...f,
                        bank_cash_account_id: v,
                        to_bank_cash_account_id:
                          f.to_bank_cash_account_id === v ? '' : f.to_bank_cash_account_id,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select bank or cash account" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeWallets.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name} · AED {money(a.current_balance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {entryForm.direction === 'TRANSFER' ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Transfer into</Label>
                    <Select
                      value={entryForm.to_bank_cash_account_id}
                      onValueChange={(v) =>
                        setEntryForm((f) => ({ ...f, to_bank_cash_account_id: v }))
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select destination account" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeWallets
                          .filter((a) => a._id !== entryForm.bank_cash_account_id)
                          .map((a) => (
                            <SelectItem key={a._id} value={a._id}>
                              {a.name} · AED {money(a.current_balance)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>
                      {entryForm.direction === 'IN' ? 'Credit from (source)' : 'Debit to (paid for)'}
                    </Label>
                    <Select
                      value={entryForm.counter_account_code}
                      onValueChange={(v) =>
                        setEntryForm((f) => ({ ...f, counter_account_code: v }))
                      }
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select counterpart GL" />
                      </SelectTrigger>
                      <SelectContent>
                        {glAccounts
                          .filter((a) => {
                            const wallet = activeWallets.find(
                              (w) => w._id === entryForm.bank_cash_account_id
                            );
                            return !wallet || a.code !== wallet.gl_account_code;
                          })
                          .map((a) => (
                            <SelectItem key={a.code} value={a.code}>
                              {a.code} — {a.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Reference</Label>
                  <Input
                    value={entryForm.reference}
                    onChange={(e) => setEntryForm((f) => ({ ...f, reference: e.target.value }))}
                    placeholder="Cheque, receipt no."
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Memo</Label>
                  <Textarea
                    value={entryForm.memo}
                    onChange={(e) => setEntryForm((f) => ({ ...f, memo: e.target.value }))}
                    placeholder="Optional note"
                    className="rounded-xl"
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setEntryOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={erpPrimaryButtonClass()}
                disabled={savingEntry}
                onClick={() => void submitEntry()}
              >
                {savingEntry ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Post entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
      </ErpModuleBody>
    </div>
  );
}
