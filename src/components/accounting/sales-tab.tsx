'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Loader2,
  Plus,
  Trash2,
  X,
  Building2,
  Banknote,
  Receipt,
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

type TabId = 'overview' | 'invoices' | 'create' | 'approvals' | 'traders';

type LineDraft = {
  key: string;
  description: string;
  sku: string;
  quantity: string;
  unit_price: string;
  vat_rate: string;
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'create', label: 'New invoice' },
  { id: 'approvals', label: 'Approve / collect' },
  { id: 'traders', label: 'VAT traders' },
];

function statusTone(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-50 text-slate-700 ring-slate-200';
    case 'PENDING_APPROVAL':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'APPROVED':
      return 'bg-sky-50 text-sky-800 ring-sky-200';
    case 'PARTIALLY_PAID':
      return 'bg-violet-50 text-violet-800 ring-violet-200';
    case 'PAID':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'REJECTED':
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-800 ring-rose-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

function emptyLine(): LineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: '',
    sku: '',
    quantity: '1',
    unit_price: '0',
    vat_rate: '5',
  };
}

export default function SalesTab() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isFm = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';

  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vatTraders, setVatTraders] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    customer_id: '',
    customer_name: '',
    notes: '',
  });
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);

  const [customerForm, setCustomerForm] = useState({
    legal_name: '',
    trade_name: '',
    vat_trn: '',
    is_vat_registered: true,
    is_official_trader: true,
    contact_name: '',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    emirate: '',
    payment_terms_days: '30',
    notes: '',
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payInv, setPayInv] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    bank_cash_account_id: '',
    payment_date: new Date().toISOString().slice(0, 10),
  });
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, inv, cus, traders, acc] = await Promise.all([
      apiClient.getSalesOverview(),
      apiClient.getSalesInvoices(),
      apiClient.getSalesCustomers(),
      apiClient.getSalesCustomers({ vat_traders: true }),
      apiClient.getBankCashAccounts(),
    ]);
    if (ov.success) setOverview(ov.data);
    if (inv.success) setInvoices((inv.data as any[]) || []);
    if (cus.success) setCustomers((cus.data as any[]) || []);
    if (traders.success) setVatTraders((traders.data as any[]) || []);
    if (acc.success) setWallets(((acc.data as any[]) || []).filter((a) => a.is_active !== false));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(
    () => invoices.filter((i) => ['DRAFT', 'PENDING_APPROVAL'].includes(i.status)),
    [invoices]
  );
  const collectible = useMemo(
    () => invoices.filter((i) => ['APPROVED', 'PARTIALLY_PAID'].includes(i.status)),
    [invoices]
  );

  const lineCalc = useMemo(() => {
    let subtotal = 0;
    let vat = 0;
    for (const l of lines) {
      const s = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
      const v = (s * (Number(l.vat_rate) || 0)) / 100;
      subtotal += s;
      vat += v;
    }
    return {
      subtotal: Number(subtotal.toFixed(2)),
      vat: Number(vat.toFixed(2)),
      total: Number((subtotal + vat).toFixed(2)),
    };
  }, [lines]);

  const stats = [
    {
      label: 'Invoices',
      value: overview?.totals?.invoices || invoices.length,
      hint: `${overview?.totals?.pending || 0} pending`,
    },
    {
      label: 'Open AR',
      value: `AED ${money(overview?.totals?.open_receivable)}`,
      hint: 'Approved unpaid',
    },
    {
      label: 'Collected',
      value: overview?.totals?.paid || 0,
      hint: 'Fully paid',
    },
    {
      label: 'VAT traders',
      value: overview?.totals?.vat_traders || vatTraders.length,
      hint: 'Registered customers',
    },
  ];

  const selectCustomer = (id: string) => {
    if (id === '__manual__') {
      setForm((f) => ({ ...f, customer_id: '', customer_name: '' }));
      return;
    }
    const c = customers.find((x) => x._id === id);
    setForm((f) => ({
      ...f,
      customer_id: id,
      customer_name: c?.legal_name || '',
    }));
  };

  const createInvoice = async (submit: boolean) => {
    if (!form.customer_id && !form.customer_name.trim()) {
      toast({ variant: 'destructive', title: 'Select or enter a customer' });
      return;
    }
    const built = lines
      .map((l) => ({
        description: l.description.trim(),
        sku: l.sku.trim() || undefined,
        quantity: Number(l.quantity) || 0,
        unit_price: Number(l.unit_price) || 0,
        vat_rate: Number(l.vat_rate) || 0,
      }))
      .filter((l) => l.description && l.quantity > 0);
    if (!built.length) {
      toast({ variant: 'destructive', title: 'Add at least one line item' });
      return;
    }

    setSaving(true);
    const result = await apiClient.createSalesInvoice({
      invoice_date: form.invoice_date,
      due_date: form.due_date || undefined,
      customer_id: form.customer_id || undefined,
      customer_name: form.customer_name.trim() || undefined,
      notes: form.notes.trim() || undefined,
      submit,
      lines: built,
    });
    setSaving(false);

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Could not create invoice',
        description: result.error || 'Try again',
      });
      return;
    }

    toast({
      title: submit ? 'Invoice submitted for finance approval' : 'Draft invoice created',
      description: (result.data as any)?.invoice_no,
    });
    setForm({
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: '',
      customer_id: '',
      customer_name: '',
      notes: '',
    });
    setLines([emptyLine()]);
    setTab(submit ? 'approvals' : 'invoices');
    await load();
  };

  const submitInvoice = async (id: string) => {
    setActingId(id);
    const result = await apiClient.submitSalesInvoice(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Submit failed', description: result.error });
      return;
    }
    toast({ title: 'Submitted for finance approval' });
    await load();
  };

  const approveInvoice = async (id: string) => {
    setActingId(id);
    const result = await apiClient.approveSalesInvoice(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Approve failed', description: result.error });
      return;
    }
    toast({
      title: 'Invoice approved — JE posted',
      description: `Journal ${(result.data as any)?.journal?.entry_no} · Dr AR / Cr Sales + VAT`,
    });
    await load();
  };

  const rejectInvoice = async (id: string) => {
    setActingId(id);
    const result = await apiClient.rejectSalesInvoice(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Reject failed', description: result.error });
      return;
    }
    toast({ title: 'Invoice rejected' });
    await load();
  };

  const openPay = (inv: any) => {
    const outstanding = Number(inv.total_amount || 0) - Number(inv.amount_paid || 0);
    setPayInv(inv);
    setPayForm({
      amount: String(outstanding.toFixed(2)),
      bank_cash_account_id: wallets[0]?._id || '',
      payment_date: new Date().toISOString().slice(0, 10),
    });
    setPayOpen(true);
  };

  const recordPay = async () => {
    if (!payInv) return;
    if (!payForm.bank_cash_account_id) {
      toast({ variant: 'destructive', title: 'Select a bank / cash account' });
      return;
    }
    setPaying(true);
    const result = await apiClient.paySalesInvoice(payInv._id, {
      amount: Number(payForm.amount) || 0,
      bank_cash_account_id: payForm.bank_cash_account_id,
      payment_date: payForm.payment_date,
    });
    setPaying(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Payment failed', description: result.error });
      return;
    }
    toast({
      title: 'Payment recorded — JE posted',
      description: `Journal ${(result.data as any)?.journal?.entry_no} · Dr Bank / Cr AR`,
    });
    setPayOpen(false);
    await load();
  };

  const createCustomer = async () => {
    if (!customerForm.legal_name.trim()) {
      toast({ variant: 'destructive', title: 'Legal name is required' });
      return;
    }
    if (
      (customerForm.is_vat_registered || customerForm.is_official_trader) &&
      !customerForm.vat_trn.trim()
    ) {
      toast({ variant: 'destructive', title: 'VAT TRN is required for traders' });
      return;
    }
    setSavingCustomer(true);
    const result = await apiClient.createSalesCustomer({
      legal_name: customerForm.legal_name.trim(),
      trade_name: customerForm.trade_name.trim() || undefined,
      vat_trn: customerForm.vat_trn.trim() || undefined,
      is_vat_registered: customerForm.is_vat_registered,
      is_official_trader: customerForm.is_official_trader,
      contact_name: customerForm.contact_name.trim() || undefined,
      email: customerForm.email.trim() || undefined,
      phone: customerForm.phone.trim() || undefined,
      address_line1: customerForm.address_line1.trim() || undefined,
      city: customerForm.city.trim() || undefined,
      emirate: customerForm.emirate.trim() || undefined,
      payment_terms_days: Number(customerForm.payment_terms_days) || 30,
      notes: customerForm.notes.trim() || undefined,
    });
    setSavingCustomer(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not save customer', description: result.error });
      return;
    }
    toast({
      title: 'VAT trader registered',
      description: (result.data as any)?.code,
    });
    setCustomerForm({
      legal_name: '',
      trade_name: '',
      vat_trn: '',
      is_vat_registered: true,
      is_official_trader: true,
      contact_name: '',
      email: '',
      phone: '',
      address_line1: '',
      city: '',
      emirate: '',
      payment_terms_days: '30',
      notes: '',
    });
    await load();
  };

  return (
    <div className="space-y-5">
      <ErpToolbar
        title="Sales"
        description="Raise invoices, finance posts AR/Sales/VAT journals, then clear AR on receipt. Manage VAT-registered traders."
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-xl" asChild>
              <Link href="/dashboard/accounting/vat201">
                <Receipt className="h-4 w-4" />
                VAT201
              </Link>
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setTab('traders')}>
              <Building2 className="h-4 w-4" />
              VAT traders
            </Button>
            <Button type="button" className={erpPrimaryButtonClass()} onClick={() => setTab('create')}>
              <Plus className="h-4 w-4" />
              New invoice
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
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
              Recent invoices
            </div>
            {(overview?.recent_invoices || []).length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No invoices yet." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overview?.recent_invoices || []).map((inv: any) => (
                    <TableRow key={inv._id}>
                      <TableCell>
                        <div className="font-medium">{inv.invoice_no}</div>
                        <div className="text-xs text-slate-400">{fmtDate(inv.invoice_date)}</div>
                      </TableCell>
                      <TableCell className="text-slate-600">{inv.customer_name}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        AED {money(inv.total_amount)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                            statusTone(inv.status)
                          )}
                        >
                          {String(inv.status || '').replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">How journals work</h3>
            <ol className="space-y-2 text-sm text-slate-600 list-decimal pl-4">
              <li>
                Create invoice → draft or submit for finance.
              </li>
              <li>
                Finance approves → <span className="font-medium text-slate-800">Dr AR / Cr Sales + VAT</span> (posted JE).
              </li>
              <li>
                Customer pays → <span className="font-medium text-slate-800">Dr Bank / Cr AR</span> — receivable clears.
              </li>
            </ol>
            <div className="rounded-2xl bg-sky-50 px-4 py-3 text-xs text-sky-900">
              VAT traders live in the dedicated tab — register official TRN customers and pick them on
              invoices. Approved invoice VAT rolls into{' '}
              <Link href="/dashboard/accounting/vat201" className="font-semibold underline underline-offset-2">
                VAT201
              </Link>{' '}
              boxes 1–4.
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'invoices' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
          {invoices.length === 0 ? (
            <div className="p-6">
              <ErpEmptyState message="No sales invoices yet." />
            </div>
          ) : (
            <Table className={erpTableClasses().table}>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead>JE</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv._id}>
                    <TableCell>
                      <div className="font-medium">{inv.invoice_no}</div>
                      <div className="text-xs text-slate-400">
                        {fmtDate(inv.invoice_date)}
                        {inv.due_date ? ` · due ${fmtDate(inv.due_date)}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-slate-700">{inv.customer_name}</div>
                      {inv.customer_vat_trn ? (
                        <div className="text-xs text-slate-400">TRN {inv.customer_vat_trn}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">AED {money(inv.subtotal)}</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">
                      AED {money(inv.vat_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      AED {money(inv.total_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">
                      AED {money(inv.amount_paid)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {inv.invoice_journal_no || '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                          statusTone(inv.status)
                        )}
                      >
                        {String(inv.status || '').replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      {tab === 'create' ? (
        <div className="max-w-3xl rounded-3xl border border-slate-200/70 bg-white/90 p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">New sales invoice</h3>
            <p className="mt-1 text-sm text-slate-500">
              Line VAT defaults to 5%. Finance approval posts the receivable journal.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Invoice date</Label>
              <Input
                type="date"
                value={form.invoice_date}
                onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Due date (optional)</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Customer</Label>
              <Select
                value={form.customer_id || '__manual__'}
                onValueChange={selectCustomer}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__manual__">Manual name (not in register)</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.legal_name}
                      {c.vat_trn ? ` · TRN ${c.vat_trn}` : ''}
                      {c.is_official_trader ? ' · Trader' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!form.customer_id ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>Customer name</Label>
                <Input
                  value={form.customer_name}
                  onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                  className="rounded-xl"
                  placeholder="Walk-in or one-off customer"
                />
              </div>
            ) : null}
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
              <Label>Line items</Label>
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
                className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-4">
                  <Input
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, description: e.target.value } : l))
                      )
                    }
                    className="rounded-xl bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="SKU"
                    value={line.sku}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, sku: e.target.value } : l))
                      )
                    }
                    className="rounded-xl bg-white"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Qty"
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, quantity: e.target.value } : l))
                      )
                    }
                    className="rounded-xl bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Unit price"
                    value={line.unit_price}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, unit_price: e.target.value } : l))
                      )
                    }
                    className="rounded-xl bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="VAT %"
                    value={line.vat_rate}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, vat_rate: e.target.value } : l))
                      )
                    }
                    className="rounded-xl bg-white"
                  />
                </div>
                <div className="flex items-center justify-end sm:col-span-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="rounded-xl text-slate-400 hover:text-rose-600"
                    disabled={lines.length <= 1}
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap justify-end gap-4 text-sm tabular-nums text-slate-600">
              <span>Subtotal AED {money(lineCalc.subtotal)}</span>
              <span>VAT AED {money(lineCalc.vat)}</span>
              <span className="font-semibold text-slate-900">Total AED {money(lineCalc.total)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={saving}
              onClick={() => void createInvoice(false)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save draft
            </Button>
            <Button
              type="button"
              className={erpPrimaryButtonClass()}
              disabled={saving}
              onClick={() => void createInvoice(true)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit for finance
            </Button>
          </div>
        </div>
      ) : null}

      {tab === 'approvals' ? (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
              Awaiting finance approval
            </div>
            {pending.length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="Nothing pending." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((inv) => (
                    <TableRow key={inv._id}>
                      <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                      <TableCell>{inv.customer_name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        AED {money(inv.total_amount)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                            statusTone(inv.status)
                          )}
                        >
                          {String(inv.status || '').replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          {inv.status === 'DRAFT' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              disabled={actingId === inv._id}
                              onClick={() => void submitInvoice(inv._id)}
                            >
                              Submit
                            </Button>
                          ) : null}
                          {isFm && ['DRAFT', 'PENDING_APPROVAL'].includes(inv.status) ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                disabled={actingId === inv._id}
                                onClick={() => void approveInvoice(inv._id)}
                              >
                                {actingId === inv._id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Approve → JE
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-xl text-rose-600"
                                disabled={actingId === inv._id}
                                onClick={() => void rejectInvoice(inv._id)}
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
              Collect payment (clear AR)
            </div>
            {collectible.length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No open receivables." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Invoice JE</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectible.map((inv) => {
                    const outstanding =
                      Number(inv.total_amount || 0) - Number(inv.amount_paid || 0);
                    return (
                      <TableRow key={inv._id}>
                        <TableCell className="font-medium">{inv.invoice_no}</TableCell>
                        <TableCell>{inv.customer_name}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          AED {money(outstanding)}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {inv.invoice_journal_no || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-xl bg-sky-600 hover:bg-sky-700"
                            onClick={() => openPay(inv)}
                          >
                            <Banknote className="h-3.5 w-3.5" />
                            Record receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'traders' ? (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/70 bg-white/90 p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Register VAT trader</h3>
              <p className="mt-1 text-sm text-slate-500">
                Official traders with UAE VAT TRN for B2B invoicing.
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Legal name</Label>
                <Input
                  value={customerForm.legal_name}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, legal_name: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Trade name</Label>
                <Input
                  value={customerForm.trade_name}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, trade_name: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>VAT TRN</Label>
                <Input
                  value={customerForm.vat_trn}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, vat_trn: e.target.value }))}
                  className="rounded-xl"
                  placeholder="100XXXXXXXXXX"
                />
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={customerForm.is_vat_registered}
                    onChange={(e) =>
                      setCustomerForm((f) => ({ ...f, is_vat_registered: e.target.checked }))
                    }
                  />
                  VAT registered
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={customerForm.is_official_trader}
                    onChange={(e) =>
                      setCustomerForm((f) => ({
                        ...f,
                        is_official_trader: e.target.checked,
                        is_vat_registered: e.target.checked ? true : f.is_vat_registered,
                      }))
                    }
                  />
                  Official trader
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input
                    value={customerForm.contact_name}
                    onChange={(e) =>
                      setCustomerForm((f) => ({ ...f, contact_name: e.target.value }))
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm((f) => ({ ...f, phone: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={customerForm.address_line1}
                    onChange={(e) =>
                      setCustomerForm((f) => ({ ...f, address_line1: e.target.value }))
                    }
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm((f) => ({ ...f, city: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emirate</Label>
                  <Input
                    value={customerForm.emirate}
                    onChange={(e) => setCustomerForm((f) => ({ ...f, emirate: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment terms (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={customerForm.payment_terms_days}
                    onChange={(e) =>
                      setCustomerForm((f) => ({ ...f, payment_terms_days: e.target.value }))
                    }
                    className="rounded-xl"
                  />
                </div>
              </div>
              <Button
                type="button"
                className={erpPrimaryButtonClass()}
                disabled={savingCustomer}
                onClick={() => void createCustomer()}
              >
                {savingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save trader
              </Button>
            </div>
          </div>

          <div className="lg:col-span-3 overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-800">
              VAT-registered / official traders
            </div>
            {vatTraders.length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No VAT traders registered yet." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Legal name</TableHead>
                    <TableHead>TRN</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Terms</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vatTraders.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="font-medium text-slate-500">{c.code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{c.legal_name}</div>
                        {c.trade_name ? (
                          <div className="text-xs text-slate-400">{c.trade_name}</div>
                        ) : null}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {c.is_vat_registered ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              VAT
                            </span>
                          ) : null}
                          {c.is_official_trader ? (
                            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200">
                              Trader
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums text-slate-600">{c.vat_trn || '—'}</TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        <div>{c.contact_name || '—'}</div>
                        <div className="text-xs">{c.phone || c.email || ''}</div>
                      </TableCell>
                      <TableCell className="text-slate-500">{c.payment_terms_days ?? 30}d</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      ) : null}

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Record receipt — {payInv?.invoice_no}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Posts <span className="font-medium text-slate-700">Dr Bank / Cr AR</span> and updates
            paid status.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={payForm.payment_date}
                onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Deposit to</Label>
              <Select
                value={payForm.bank_cash_account_id}
                onValueChange={(v) => setPayForm((f) => ({ ...f, bank_cash_account_id: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Bank / cash" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w._id} value={w._id}>
                      {w.code} — {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className={erpPrimaryButtonClass()}
              disabled={paying}
              onClick={() => void recordPay()}
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Post receipt JE
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
