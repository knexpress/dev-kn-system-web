'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ClipboardList,
  Loader2,
  PackageCheck,
  Pencil,
  Plus,
  Ban,
  Trash2,
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
  erpPrimaryButtonClass,
  erpTableClasses,
} from './erp-shell';
import { fmtDate, money } from './erp-format';
import { SupplierDialog } from './supplier-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type TabId = 'overview' | 'orders' | 'create' | 'suppliers' | 'approvals';

type LineDraft = {
  key: string;
  description: string;
  sku: string;
  quantity: string;
  unit_cost: string;
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'All POs' },
  { id: 'create', label: 'Enter supplier invoice' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'approvals', label: 'Approve / receive' },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

function addDaysIso(dateIso: string, days: number) {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyForm() {
  return {
    supplier_id: '',
    supplier_invoice_no: '',
    supplier_invoice_date: todayIso(),
    due_date: addDaysIso(todayIso(), 30),
    due_touched: false,
    receive_later: false,
    expected_date: '',
    supplier_reference: '',
    tax_amount: '0',
    notes: '',
    debit_account_code: '1200',
    credit_account_code: '2000',
  };
}

function statusTone(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'bg-slate-50 text-slate-700 ring-slate-200';
    case 'PENDING_APPROVAL':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'APPROVED':
      return 'bg-sky-50 text-sky-800 ring-sky-200';
    case 'PARTIALLY_RECEIVED':
      return 'bg-violet-50 text-violet-800 ring-violet-200';
    case 'RECEIVED':
    case 'CLOSED':
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
    unit_cost: '0',
  };
}

export default function PurchaseOrdersTab() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const isFm = userProfile?.role === 'ADMIN' || userProfile?.role === 'SUPERADMIN';
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [glAccounts, setGlAccounts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierDialog, setSupplierDialog] = useState<{ open: boolean; supplier: any | null; forForm: boolean }>({
    open: false,
    supplier: null,
    forForm: false,
  });

  const [payOpen, setPayOpen] = useState(false);
  const [payPo, setPayPo] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    bank_cash_account_id: '',
    payment_date: new Date().toISOString().slice(0, 10),
  });
  const [paying, setPaying] = useState(false);
  const [payables, setPayables] = useState<Record<string, any>>({});

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivePoRow, setReceivePoRow] = useState<any | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [receiving, setReceiving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, list, gl, inv, acc, ap, sup] = await Promise.all([
      apiClient.getPurchaseOrdersOverview(),
      apiClient.getPurchaseOrders(),
      apiClient.getAccounts(),
      apiClient.getInventoryItems(),
      apiClient.getBankCashAccounts(),
      apiClient.getPayablesSummary(),
      apiClient.getSuppliers(),
    ]);
    if (ov.success) setOverview(ov.data);
    if (sup.success) setSuppliers((sup.data as any[]) || []);
    if (list.success) setOrders((list.data as any[]) || []);
    if (ap.success) {
      const map: Record<string, any> = {};
      (((ap.data as any)?.purchase_orders as any[]) || []).forEach((row) => {
        map[String(row._id)] = row;
      });
      setPayables(map);
    }
    if (gl.success) {
      setGlAccounts(
        ((gl.data as any[]) || []).filter((a) => a.is_active !== false && a.is_postable !== false)
      );
    }
    if (inv.success) setInventory((inv.data as any[]) || []);
    if (acc.success) setWallets(((acc.data as any[]) || []).filter((a) => a.is_active !== false));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(
    () => orders.filter((o) => ['DRAFT', 'PENDING_APPROVAL'].includes(o.status)),
    [orders]
  );
  const receivable = useMemo(
    () => orders.filter((o) => ['APPROVED', 'PARTIALLY_RECEIVED'].includes(o.status)),
    [orders]
  );

  const lineTotal = useMemo(
    () =>
      lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0),
    [lines]
  );
  const grandTotal = lineTotal + (Number(form.tax_amount) || 0);

  const stats = [
    { label: 'All POs', value: overview?.totals?.count || orders.length, hint: 'Total orders' },
    { label: 'Pending', value: overview?.totals?.pending || 0, hint: 'Awaiting approval' },
    { label: 'Approved', value: overview?.totals?.approved || 0, hint: 'Ready to receive' },
    {
      label: 'Open value',
      value: `AED ${money(overview?.totals?.open_value)}`,
      hint: 'Unpaid / open',
    },
  ];

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s._id === form.supplier_id) || null,
    [suppliers, form.supplier_id]
  );

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.name, s.code, s.trn, s.email, s.phone].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  const chooseSupplier = (supplier: any) => {
    setForm((f) => ({
      ...f,
      supplier_id: supplier?._id || '',
      due_date: f.due_touched
        ? f.due_date
        : addDaysIso(f.supplier_invoice_date, Number(supplier?.payment_terms_days ?? 30)),
    }));
  };

  const onSupplierSaved = (saved: any) => {
    setSuppliers((prev) => {
      const rest = prev.filter((s) => s._id !== saved._id);
      return [...rest, saved].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    });
    if (supplierDialog.forForm) chooseSupplier(saved);
  };

  const createPo = async (submit: boolean) => {
    if (!form.supplier_id) {
      toast({ variant: 'destructive', title: 'Pick or add a supplier' });
      return;
    }
    if (!form.supplier_invoice_no.trim()) {
      toast({ variant: 'destructive', title: "Enter the supplier's invoice number" });
      return;
    }
    const built = lines
      .map((l) => ({
        description: l.description.trim(),
        sku: l.sku.trim() || undefined,
        quantity: Number(l.quantity) || 0,
        unit_cost: Number(l.unit_cost) || 0,
      }))
      .filter((l) => l.description && l.quantity > 0);
    if (!built.length) {
      toast({ variant: 'destructive', title: 'Add at least one line item' });
      return;
    }

    setSaving(true);
    const result = await apiClient.createPurchaseOrder({
      supplier_id: form.supplier_id,
      supplier_invoice_no: form.supplier_invoice_no.trim(),
      supplier_invoice_date: form.supplier_invoice_date,
      due_date: form.due_date || undefined,
      receive_later: form.receive_later,
      expected_date: form.receive_later && form.expected_date ? form.expected_date : undefined,
      supplier_reference: form.supplier_reference.trim() || undefined,
      tax_amount: Number(form.tax_amount) || 0,
      notes: form.notes.trim() || undefined,
      debit_account_code: form.debit_account_code,
      credit_account_code: form.credit_account_code,
      submit,
      lines: built,
    });
    setSaving(false);

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Could not create PO',
        description: result.error || 'Try again',
      });
      return;
    }

    toast({
      title: submit ? 'Sent to Finance Manager for approval' : 'Draft saved',
      description: `${(result.data as any)?.po_no || ''} — supplier invoice ${form.supplier_invoice_no.trim()}`,
    });
    setForm(emptyForm());
    setLines([emptyLine()]);
    setTab(submit ? 'approvals' : 'orders');
    await load();
  };

  const submitPo = async (id: string) => {
    setActingId(id);
    const result = await apiClient.submitPurchaseOrder(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Submit failed', description: result.error });
      return;
    }
    toast({ title: 'PO submitted' });
    await load();
  };

  const approvePo = async (id: string) => {
    setActingId(id);
    const result = await apiClient.approvePurchaseOrder(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Approve failed', description: result.error });
      return;
    }
    const data = result.data as any;
    toast({
      title: data?.posted ? 'Approved and posted to accounts' : 'Approved — awaiting goods',
      description: data?.posted
        ? `Journal ${data?.journal?.entry_no || ''} posted: AED ${money(data?.journal?.total_credit)} owed in Accounts Payable. It now shows under Bank & Cash → Pay supplier.`
        : `Draft journal ${data?.journal?.entry_no || ''} — Accounts Payable posts as goods are received.`,
    });
    await load();
  };

  const rejectPo = async (id: string) => {
    const reason = window.prompt('Rejection reason (optional):') || '';
    setActingId(id);
    const result = await apiClient.rejectPurchaseOrder(id, reason);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Reject failed', description: result.error });
      return;
    }
    toast({ title: 'PO rejected' });
    await load();
  };

  const payInfo = (po: any) => {
    const row = payables[String(po?._id)];
    const total = Number(po?.total_amount || 0);
    const paid = Number(row?.paid ?? po?.amount_paid ?? 0);
    const pending = Number(row?.pending || 0);
    const billed = Number(row?.billed ?? po?.received_value_posted ?? 0);
    const available = Number(row?.left_to_pay ?? Math.max(0, total - paid - pending));
    return { total, paid, pending, billed, available };
  };

  const canCancel = (po: any) => {
    const info = payInfo(po);
    return (
      po.status === 'APPROVED' &&
      !(po.lines || []).some((l: any) => Number(l.received_qty || 0) > 0) &&
      info.paid <= 0 &&
      info.pending <= 0
    );
  };

  const cancelPo = async (po: any) => {
    const reason = window.prompt(`Cancel ${po.po_no}? Reason (optional):`);
    if (reason === null) return;
    setActingId(po._id);
    const result = await apiClient.cancelPurchaseOrder(po._id, reason);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Cancel failed', description: result.error });
      return;
    }
    toast({ title: 'PO cancelled', description: `${po.po_no} — draft journal ${po.journal_entry_no || ''} voided` });
    await load();
  };

  const openReceive = (po: any) => {
    const qty: Record<string, string> = {};
    (po.lines || []).forEach((l: any) => {
      qty[String(l._id)] = String(Math.max(0, Number(l.quantity || 0) - Number(l.received_qty || 0)));
    });
    setReceivePoRow(po);
    setReceiveQty(qty);
    setReceiveOpen(true);
  };

  const receiveValue = useMemo(() => {
    if (!receivePoRow) return 0;
    return (receivePoRow.lines || []).reduce(
      (s: number, l: any) => s + (Number(receiveQty[String(l._id)]) || 0) * Number(l.unit_cost || 0),
      0
    );
  }, [receivePoRow, receiveQty]);

  const submitReceive = async () => {
    if (!receivePoRow) return;
    const receipts = (receivePoRow.lines || [])
      .map((l: any) => ({ line_id: String(l._id), quantity: Number(receiveQty[String(l._id)]) || 0 }))
      .filter((r: { quantity: number }) => r.quantity > 0);
    if (!receipts.length) {
      toast({ variant: 'destructive', title: 'Enter a quantity to receive' });
      return;
    }
    setReceiving(true);
    const result = await apiClient.receivePurchaseOrder(receivePoRow._id, receipts);
    setReceiving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Receive failed', description: result.error });
      return;
    }
    const data = result.data as any;
    const journal = data?.journal;
    const status = data?.purchase_order?.status;
    toast({
      title: status === 'PARTIALLY_RECEIVED' ? 'Partial receipt posted' : 'Goods received',
      description: journal
        ? `Journal ${journal.entry_no} posted — AP AED ${money(journal.total_credit)} owed to ${receivePoRow.supplier_name}${
            status === 'CLOSED' ? '. PO closed (already paid).' : ''
          }`
        : 'Receipt recorded',
    });
    setReceiveOpen(false);
    await load();
  };

  const openPay = (po: any) => {
    const info = payInfo(po);
    const owedNow = Math.max(0, info.billed - info.paid);
    const suggested = owedNow > 0.009 ? Math.min(owedNow, info.available) : info.available;
    setPayPo(po);
    setPayForm({
      amount: suggested > 0 ? suggested.toFixed(2) : '',
      bank_cash_account_id: wallets[0]?._id || '',
      payment_date: new Date().toISOString().slice(0, 10),
    });
    setPayOpen(true);
  };

  const createPayment = async () => {
    if (!payPo || !payForm.bank_cash_account_id || !(Number(payForm.amount) > 0)) {
      toast({ variant: 'destructive', title: 'Amount and bank/cash account required' });
      return;
    }
    setPaying(true);
    const result = await apiClient.createSupplierPayment({
      payment_date: payForm.payment_date,
      supplier_name: payPo.supplier_name,
      supplier_reference: payPo.po_no,
      description: `Payment for ${payPo.po_no}`,
      amount: Number(payForm.amount),
      bank_cash_account_id: payForm.bank_cash_account_id,
      debit_account_code: payPo.credit_account_code || '2000',
      purchase_order_id: payPo._id,
    });
    setPaying(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Payment failed', description: result.error });
      return;
    }
    toast({
      title: 'Payment draft created',
      description: `${(result.data as any)?.payment?.payment_no || ''} with DRAFT journal ${
        (result.data as any)?.journal?.entry_no || ''
      } — a Finance Manager clears it under Bank & Cash → Clear payments.`,
    });
    setPayOpen(false);
    await load();
  };

  return (
    <div className="flex flex-col">
      <ErpToolbar
        title="Purchases"
        description="Supplier invoices and POs — enter, approve, receive goods, and track payments."
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <Button type="button" className={erpPrimaryButtonClass()} onClick={() => setTab('create')}>
            <Plus className="h-4 w-4" />
            New PO
          </Button>
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
              {t.id === 'approvals' && pending.length + receivable.length > 0 ? (
                <span className="ml-2 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] text-slate-900">
                  {pending.length + receivable.length}
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

        {tab === 'overview' ? (
          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            {(overview?.recent || []).length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No purchase orders yet. Create your first PO." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Journal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overview?.recent || []).map((po: any) => (
                    <TableRow key={po._id}>
                      <TableCell>
                        <div className="font-medium">{po.po_no}</div>
                        <div className="text-xs text-slate-400">{fmtDate(po.po_date)}</div>
                      </TableCell>
                      <TableCell>{po.supplier_name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        AED {money(po.total_amount)}
                      </TableCell>
                      <TableCell className="text-slate-500">{po.journal_entry_no || '—'}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                            statusTone(po.status)
                          )}
                        >
                          {String(po.status || '').replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        ) : null}

        {tab === 'orders' ? (
          <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
            {orders.length === 0 ? (
              <div className="p-6">
                <ErpEmptyState message="No purchase orders." />
              </div>
            ) : (
              <Table className={erpTableClasses().table}>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Supplier invoice</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((po) => (
                    <TableRow key={po._id}>
                      <TableCell>
                        <div className="font-medium">{po.po_no}</div>
                        <div className="text-xs text-slate-400">{fmtDate(po.po_date)}</div>
                      </TableCell>
                      <TableCell>
                        <div>{po.supplier_name}</div>
                        {po.supplier_trn ? <div className="text-xs text-slate-400">TRN {po.supplier_trn}</div> : null}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {po.supplier_invoice_no || po.supplier_reference || '—'}
                        {po.receive_later ? (
                          <div className="text-[11px] text-violet-600">Receive later</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-slate-500">{po.due_date ? fmtDate(po.due_date) : '—'}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        AED {money(po.total_amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-500">
                        AED {money(po.amount_paid)}
                        {payInfo(po).pending > 0 ? (
                          <div className="text-[11px] text-amber-700">+ AED {money(payInfo(po).pending)} pending</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                            statusTone(po.status)
                          )}
                        >
                          {String(po.status || '').replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          {['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(po.status) &&
                          payInfo(po).available > 0.009 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => openPay(po)}
                            >
                              Pay
                            </Button>
                          ) : null}
                          {isFm && canCancel(po) ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="rounded-xl text-rose-600"
                              disabled={actingId === po._id}
                              onClick={() => void cancelPo(po)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Cancel
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
              <h3 className="text-base font-semibold text-slate-900">Enter supplier invoice</h3>
              <p className="mt-1 text-sm text-slate-500">
                Type in the invoice you received. Once a Finance Manager approves it, it posts to the
                accounts (Inventory/Expense + VAT input against Accounts Payable) and appears under Bank
                &amp; Cash → Pay supplier until it is paid.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Supplier</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-lg text-brand-600"
                    onClick={() => setSupplierDialog({ open: true, supplier: null, forForm: true })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New supplier
                  </Button>
                </div>
                <Select value={form.supplier_id} onValueChange={(v) => chooseSupplier(suppliers.find((s) => s._id === v))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={suppliers.length ? 'Select supplier' : 'No suppliers yet — add one'} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                        {s.trn ? ` · TRN ${s.trn}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSupplier ? (
                  <div className="grid gap-x-4 gap-y-1 rounded-2xl bg-slate-50/80 px-4 py-3 text-xs text-slate-600 sm:grid-cols-3">
                    <div>
                      <span className="text-slate-400">TRN </span>
                      {selectedSupplier.trn || '—'}
                    </div>
                    <div>
                      <span className="text-slate-400">Phone </span>
                      {selectedSupplier.phone || '—'}
                    </div>
                    <div>
                      <span className="text-slate-400">Email </span>
                      {selectedSupplier.email || '—'}
                    </div>
                    <div>
                      <span className="text-slate-400">Bank </span>
                      {selectedSupplier.bank_name || '—'}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400">IBAN </span>
                      {selectedSupplier.iban || '—'}
                    </div>
                    <div className="flex items-center justify-between sm:col-span-3">
                      <span>
                        <span className="text-slate-400">Terms </span>
                        {selectedSupplier.payment_terms_days ?? 30} days
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline"
                        onClick={() => setSupplierDialog({ open: true, supplier: selectedSupplier, forForm: true })}
                      >
                        <Pencil className="h-3 w-3" />
                        Edit details
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Supplier invoice no.</Label>
                <Input
                  value={form.supplier_invoice_no}
                  onChange={(e) => setForm((f) => ({ ...f, supplier_invoice_no: e.target.value }))}
                  className="rounded-xl"
                  placeholder="As printed on the invoice"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice date</Label>
                <Input
                  type="date"
                  value={form.supplier_invoice_date}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      supplier_invoice_date: v,
                      due_date: f.due_touched
                        ? f.due_date
                        : addDaysIso(v, Number(selectedSupplier?.payment_terms_days ?? 30)),
                    }));
                  }}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value, due_touched: true }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Other reference (LPO / delivery note)</Label>
                <Input
                  value={form.supplier_reference}
                  onChange={(e) => setForm((f) => ({ ...f, supplier_reference: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/70 px-4 py-3">
                  <Checkbox
                    checked={form.receive_later}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, receive_later: v === true }))}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-slate-900">Goods haven&apos;t arrived yet — receive later</span>
                    <span className="block text-xs text-slate-500">
                      Leave unticked when the goods/services are already in: approval posts the full invoice
                      (and adds stock for SKU lines). Tick it to post Accounts Payable only as goods are received.
                    </span>
                  </span>
                </label>
              </div>
              {form.receive_later ? (
                <div className="space-y-2">
                  <Label>Expected delivery</Label>
                  <Input
                    type="date"
                    value={form.expected_date}
                    onChange={(e) => setForm((f) => ({ ...f, expected_date: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>VAT / tax amount (feeds VAT201 input)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.tax_amount}
                  onChange={(e) => setForm((f) => ({ ...f, tax_amount: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Debit account (Inventory / Expense)</Label>
                <Select
                  value={form.debit_account_code}
                  onValueChange={(v) => setForm((f) => ({ ...f, debit_account_code: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {glAccounts
                      .filter((a) => a.type === 'Asset' || a.type === 'Expense')
                      .map((a) => (
                        <SelectItem key={a.code} value={a.code}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Credit account (AP)</Label>
                <Select
                  value={form.credit_account_code}
                  onValueChange={(v) => setForm((f) => ({ ...f, credit_account_code: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {glAccounts
                      .filter((a) => a.type === 'Liability')
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">Line items</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
                  className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-12"
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
                  <div className="sm:col-span-3">
                    <Select
                      value={line.sku || '__none__'}
                      onValueChange={(v) => {
                        const sku = v === '__none__' ? '' : v;
                        const item = inventory.find((it) => it.sku === sku);
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx
                              ? {
                                  ...l,
                                  sku,
                                  description: l.description || item?.name || '',
                                  unit_cost:
                                    l.unit_cost === '0' && item?.avg_cost
                                      ? String(item.avg_cost)
                                      : l.unit_cost,
                                }
                              : l
                          )
                        );
                      }}
                    >
                      <SelectTrigger className="rounded-xl bg-white">
                        <SelectValue placeholder="SKU (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No SKU</SelectItem>
                        {inventory.map((it) => (
                          <SelectItem key={it.sku} value={it.sku}>
                            {it.sku} — {it.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
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
                      placeholder="Unit cost"
                      value={line.unit_cost}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, unit_cost: e.target.value } : l))
                        )
                      }
                      className="rounded-xl bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:col-span-1">
                    <span className="text-xs tabular-nums text-slate-500 sm:hidden">
                      AED {money((Number(line.quantity) || 0) * (Number(line.unit_cost) || 0))}
                    </span>
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
              <div className="flex justify-end gap-6 text-sm">
                <div className="text-slate-500">
                  Subtotal <span className="font-semibold text-slate-900">AED {money(lineTotal)}</span>
                </div>
                <div className="text-slate-500">
                  Total <span className="font-semibold text-slate-900">AED {money(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={saving}
                onClick={() => void createPo(false)}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save draft
              </Button>
              <Button
                type="button"
                className={erpPrimaryButtonClass()}
                disabled={saving}
                onClick={() => void createPo(true)}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                Submit for approval
              </Button>
            </div>
          </div>
        ) : null}

        {tab === 'suppliers' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="Search name, TRN, email, phone"
                className="max-w-xs rounded-xl"
              />
              <Button
                type="button"
                className={erpPrimaryButtonClass()}
                onClick={() => setSupplierDialog({ open: true, supplier: null, forForm: false })}
              >
                <Plus className="h-4 w-4" />
                Add supplier
              </Button>
            </div>
            <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
              {filteredSuppliers.length === 0 ? (
                <div className="p-6">
                  <ErpEmptyState message="No suppliers yet. Add one here or while entering an invoice." />
                </div>
              ) : (
                <Table className={erpTableClasses().table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>TRN</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Bank / IBAN</TableHead>
                      <TableHead className="text-right">Terms</TableHead>
                      <TableHead className="text-right" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-slate-400">{s.code}</div>
                        </TableCell>
                        <TableCell className="text-slate-600">{s.trn || '—'}</TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <div>{s.contact_person || '—'}</div>
                          <div className="text-slate-400">{[s.phone, s.email].filter(Boolean).join(' · ')}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <div>{s.bank_name || '—'}</div>
                          <div className="text-slate-400">{s.iban || ''}</div>
                        </TableCell>
                        <TableCell className="text-right text-slate-600">{s.payment_terms_days ?? 30} days</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setSupplierDialog({ open: true, supplier: s, forForm: false })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        ) : null}

        <SupplierDialog
          open={supplierDialog.open}
          supplier={supplierDialog.supplier}
          onOpenChange={(open) => setSupplierDialog((d) => ({ ...d, open }))}
          onSaved={onSupplierSaved}
        />

        {tab === 'approvals' ? (
          <div className="space-y-5">
            <section className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
              <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
                Pending approval
              </div>
              {pending.length === 0 ? (
                <div className="p-6">
                  <ErpEmptyState message="No POs waiting for approval." />
                </div>
              ) : (
                <Table className={erpTableClasses().table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Supplier invoice</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((po) => (
                      <TableRow key={po._id}>
                        <TableCell className="font-medium">{po.po_no}</TableCell>
                        <TableCell>
                          <div>{po.supplier_name}</div>
                          {po.supplier_trn ? <div className="text-xs text-slate-400">TRN {po.supplier_trn}</div> : null}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          <div className="font-medium text-slate-800">{po.supplier_invoice_no || po.supplier_reference || '—'}</div>
                          <div>
                            {fmtDate(po.supplier_invoice_date || po.po_date)}
                            {po.due_date ? ` · due ${fmtDate(po.due_date)}` : ''}
                          </div>
                          <div className={po.receive_later ? 'text-violet-600' : 'text-emerald-700'}>
                            {po.receive_later ? 'AP posts on receipt' : 'Posts to accounts on approval'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          AED {money(po.total_amount)}
                          {Number(po.tax_amount) > 0 ? (
                            <div className="text-[11px] text-slate-400">incl. VAT {money(po.tax_amount)}</div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                              statusTone(po.status)
                            )}
                          >
                            {String(po.status || '').replace(/_/g, ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            {po.status === 'DRAFT' ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                disabled={actingId === po._id}
                                onClick={() => void submitPo(po._id)}
                              >
                                Submit
                              </Button>
                            ) : null}
                            {isFm ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                  disabled={actingId === po._id}
                                  onClick={() => void approvePo(po._id)}
                                >
                                  {actingId === po._id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl"
                                  disabled={actingId === po._id}
                                  onClick={() => void rejectPo(po._id)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </>
                            ) : po.status === 'PENDING_APPROVAL' ? (
                              <span className="text-xs text-slate-400">Awaiting Finance Manager</span>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

            <section className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white/90">
              <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
                Receive goods
              </div>
              {receivable.length === 0 ? (
                <div className="p-6">
                  <ErpEmptyState message="No approved POs ready to receive." />
                </div>
              ) : (
                <Table className={erpTableClasses().table}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Journal</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivable.map((po) => (
                      <TableRow key={po._id}>
                        <TableCell className="font-medium">{po.po_no}</TableCell>
                        <TableCell>{po.supplier_name}</TableCell>
                        <TableCell>
                          {(po.receipt_journals || []).length ? (
                            <>
                              <div>{po.receipt_journals.map((j: any) => j.journal_entry_no).join(', ')}</div>
                              <div className="text-[11px] font-semibold text-violet-700">
                                AP posted AED {money(po.received_value_posted)} of {money(po.total_amount)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div>{po.journal_entry_no || '—'}</div>
                              <div className="text-[11px] font-semibold text-amber-700">
                                DRAFT — AP posts as goods arrive
                              </div>
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          AED {money(po.total_amount)}
                          {Number(po.amount_paid) > 0 ? (
                            <div className="text-[11px] text-slate-400">paid AED {money(po.amount_paid)}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-xl bg-sky-600 hover:bg-sky-700"
                              disabled={actingId === po._id}
                              onClick={() => openReceive(po)}
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              Receive
                            </Button>
                            {payInfo(po).available > 0.009 ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => openPay(po)}
                              >
                                Pay
                              </Button>
                            ) : null}
                            {isFm && canCancel(po) ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="rounded-xl text-rose-600"
                                disabled={actingId === po._id}
                                onClick={() => void cancelPo(po)}
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Cancel
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          </div>
        ) : null}

        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Pay supplier for {payPo?.po_no}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {payPo ? (
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
                  <div>
                    <p className="text-slate-400">PO total</p>
                    <p className="font-semibold tabular-nums text-slate-900">AED {money(payInfo(payPo).total)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Billed (received)</p>
                    <p className="font-semibold tabular-nums text-slate-900">AED {money(payInfo(payPo).billed)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Paid / awaiting clearance</p>
                    <p className="font-semibold tabular-nums text-slate-900">
                      AED {money(payInfo(payPo).paid)} / {money(payInfo(payPo).pending)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Max payable now</p>
                    <p className="font-semibold tabular-nums text-emerald-700">AED {money(payInfo(payPo).available)}</p>
                  </div>
                  {Number(payForm.amount) > payInfo(payPo).available + 0.009 ? (
                    <p className="col-span-2 text-rose-600">Amount is more than is left to pay on this PO.</p>
                  ) : Number(payForm.amount) > payInfo(payPo).billed - payInfo(payPo).paid + 0.009 ? (
                    <p className="col-span-2 text-amber-700">
                      Paying ahead of goods received — the excess sits in AP as a supplier advance.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={payForm.amount}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Pay from</Label>
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
                        {w.account_type} · {w.name} (AED {money(w.current_balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setPayOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className={erpPrimaryButtonClass()}
                disabled={paying || (payPo ? Number(payForm.amount) > payInfo(payPo).available + 0.009 : false)}
                onClick={() => void createPayment()}
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create payment draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
          <DialogContent className="max-w-xl rounded-3xl">
            <DialogHeader>
              <DialogTitle>Receive goods — {receivePoRow?.po_no}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-500">
              Enter what actually arrived. Each receipt posts its value (plus proportional VAT input) to
              Accounts Payable for {receivePoRow?.supplier_name}.
            </p>
            <div className="space-y-2">
              {(receivePoRow?.lines || []).map((l: any) => {
                const remaining = Math.max(0, Number(l.quantity || 0) - Number(l.received_qty || 0));
                const key = String(l._id);
                return (
                  <div
                    key={key}
                    className="grid grid-cols-12 items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                  >
                    <div className="col-span-7">
                      <p className="text-sm font-medium text-slate-900">{l.description}</p>
                      <p className="text-[11px] text-slate-400">
                        {l.sku ? `${l.sku} · ` : ''}
                        {Number(l.received_qty || 0)} of {Number(l.quantity || 0)} received · AED {money(l.unit_cost)} each
                      </p>
                    </div>
                    <div className="col-span-5">
                      <Input
                        type="number"
                        min="0"
                        max={remaining}
                        step="0.01"
                        disabled={remaining <= 0}
                        value={receiveQty[key] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setReceiveQty((q) => ({
                            ...q,
                            [key]: v === '' ? '' : String(Math.min(remaining, Math.max(0, Number(v) || 0))),
                          }));
                        }}
                        className="rounded-xl bg-white text-right"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end text-sm text-slate-500">
              Receiving <span className="ml-1 font-semibold text-slate-900">AED {money(receiveValue)}</span>
              <span className="ml-1">excl. VAT</span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setReceiveOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-sky-600 hover:bg-sky-700"
                disabled={receiving || !Object.values(receiveQty).some((v) => Number(v) > 0)}
                onClick={() => void submitReceive()}
              >
                {receiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                Post receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ErpModuleBody>
    </div>
  );
}
