'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ClipboardList,
  Loader2,
  PackageCheck,
  Plus,
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

type TabId = 'overview' | 'orders' | 'create' | 'approvals';

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
  { id: 'create', label: 'New PO' },
  { id: 'approvals', label: 'Approve / receive' },
];

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
  const [tab, setTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [glAccounts, setGlAccounts] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    po_date: new Date().toISOString().slice(0, 10),
    expected_date: '',
    supplier_name: '',
    supplier_reference: '',
    tax_amount: '0',
    notes: '',
    debit_account_code: '1200',
    credit_account_code: '2000',
  });
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  const [payOpen, setPayOpen] = useState(false);
  const [payPo, setPayPo] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    bank_cash_account_id: '',
    payment_date: new Date().toISOString().slice(0, 10),
  });
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ov, list, gl, inv, acc] = await Promise.all([
      apiClient.getPurchaseOrdersOverview(),
      apiClient.getPurchaseOrders(),
      apiClient.getAccounts(),
      apiClient.getInventoryItems(),
      apiClient.getBankCashAccounts(),
    ]);
    if (ov.success) setOverview(ov.data);
    if (list.success) setOrders((list.data as any[]) || []);
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

  const createPo = async (submit: boolean) => {
    if (!form.supplier_name.trim()) {
      toast({ variant: 'destructive', title: 'Supplier required' });
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
      po_date: form.po_date,
      expected_date: form.expected_date || undefined,
      supplier_name: form.supplier_name.trim(),
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
      title: submit ? 'PO submitted for approval' : 'Draft PO created',
      description: (result.data as any)?.po_no,
    });
    setForm({
      po_date: new Date().toISOString().slice(0, 10),
      expected_date: '',
      supplier_name: '',
      supplier_reference: '',
      tax_amount: '0',
      notes: '',
      debit_account_code: '1200',
      credit_account_code: '2000',
    });
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
    toast({
      title: 'PO approved',
      description: `Draft journal ${(result.data as any)?.journal?.entry_no || ''} created`,
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

  const receivePo = async (id: string) => {
    setActingId(id);
    const result = await apiClient.receivePurchaseOrder(id);
    setActingId(null);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Receive failed', description: result.error });
      return;
    }
    const journal = (result.data as any)?.journal;
    toast({
      title: 'Goods received',
      description: journal?.status === 'POSTED'
        ? `Journal ${journal.entry_no} posted`
        : 'Partial receipt recorded',
    });
    await load();
  };

  const openPay = (po: any) => {
    const remaining = Math.max(0, Number(po.total_amount || 0) - Number(po.amount_paid || 0));
    setPayPo(po);
    setPayForm({
      amount: String(remaining || po.total_amount || ''),
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
      description: 'Clear it under Bank & Cash → Clear payments',
    });
    setPayOpen(false);
    await load();
  };

  return (
    <div className="space-y-5">
      <ErpToolbar
        title="Purchase Orders"
        description="Create POs, approve, receive goods, and pay suppliers."
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
                  <TableHead>Lines</TableHead>
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
                    <TableCell>{po.supplier_name}</TableCell>
                    <TableCell className="text-slate-500">{po.lines?.length || 0}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      AED {money(po.total_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-500">
                      AED {money(po.amount_paid)}
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
                      {['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(po.status) ? (
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
            <h3 className="text-base font-semibold text-slate-900">New purchase order</h3>
            <p className="mt-1 text-sm text-slate-500">
              Save as draft, or submit for approval. Approving creates a DRAFT journal; receiving
              goods posts debit/credit.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Supplier</Label>
              <Input
                value={form.supplier_name}
                onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))}
                className="rounded-xl"
                placeholder="Supplier name"
              />
            </div>
            <div className="space-y-2">
              <Label>PO date</Label>
              <Input
                type="date"
                value={form.po_date}
                onChange={(e) => setForm((f) => ({ ...f, po_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Expected date</Label>
              <Input
                type="date"
                value={form.expected_date}
                onChange={(e) => setForm((f) => ({ ...f, expected_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Supplier reference</Label>
              <Input
                value={form.supplier_reference}
                onChange={(e) => setForm((f) => ({ ...f, supplier_reference: e.target.value }))}
                className="rounded-xl"
              />
            </div>
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
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((po) => (
                    <TableRow key={po._id}>
                      <TableCell className="font-medium">{po.po_no}</TableCell>
                      <TableCell>{po.supplier_name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        AED {money(po.total_amount)}
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
                        <div>{po.journal_entry_no || '—'}</div>
                        <div className="text-[11px] font-semibold text-amber-700">DRAFT until received</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        AED {money(po.total_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-xl bg-sky-600 hover:bg-sky-700"
                            disabled={actingId === po._id}
                            onClick={() => void receivePo(po._id)}
                          >
                            {actingId === po._id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <PackageCheck className="h-3.5 w-3.5" />
                            )}
                            Receive all
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => openPay(po)}
                          >
                            Pay
                          </Button>
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
              disabled={paying}
              onClick={() => void createPayment()}
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create payment draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
