'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ClipboardList,
  Download,
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
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogDescription,
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
import { SupplierPaymentVoucherDialog } from './supplier-payment-voucher-document';
import { PurchaseOrderDocumentDialog } from './purchase-order-document';
import PurchaseStatementPanel from './purchase-statement-panel';
import { cn } from '@/lib/utils';
import { COA } from '@/lib/coa-codes';

type TabId = 'overview' | 'orders' | 'create' | 'suppliers' | 'statement' | 'approvals';

type LineDraft = {
  key: string;
  description: string;
  sku: string;
  quantity: string;
  unit_cost: string;
  account_code: string;
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'All POs' },
  { id: 'statement', label: 'Statement of purchase' },
  { id: 'create', label: 'New purchase order' },
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
    po_date: todayIso(),
    expected_date: '',
    supplier_reference: '',
    tax_amount: '0',
    notes: '',
    debit_account_code: COA.inventory,
    credit_account_code: COA.ap,
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

function emptyLine(accountCode = COA.inventory): LineDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description: '',
    sku: '',
    quantity: '1',
    unit_cost: '0',
    account_code: accountCode,
  };
}

function uniqueLineDebits(drafts: LineDraft[]) {
  return [...new Set(drafts.map((l) => String(l.account_code || '').trim()).filter(Boolean))];
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
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(COA.inventory)]);
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
    print_voucher: true,
    clear_now: false,
  });
  const [paying, setPaying] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvePoRow, setApprovePoRow] = useState<any | null>(null);
  const [approveVoucher, setApproveVoucher] = useState(false);
  const [approvePayForm, setApprovePayForm] = useState({
    amount: '',
    bank_cash_account_id: '',
    payment_date: new Date().toISOString().slice(0, 10),
    clear_now: true,
  });
  const [approving, setApproving] = useState(false);
  const [voucherPayment, setVoucherPayment] = useState<any | null>(null);
  const [voucherPo, setVoucherPo] = useState<any | null>(null);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [pdfPo, setPdfPo] = useState<any | null>(null);
  const [payables, setPayables] = useState<Record<string, any>>({});

  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivePoRow, setReceivePoRow] = useState<any | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [receiving, setReceiving] = useState(false);

  const [invoicePo, setInvoicePo] = useState<any | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    supplier_invoice_no: '',
    supplier_invoice_date: todayIso(),
    due_date: '',
    due_touched: false,
    tax_amount: '0',
  });
  const [savingInvoice, setSavingInvoice] = useState(false);

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

  const debitAccounts = useMemo(
    () => glAccounts.filter((a) => a.type === 'Asset' || a.type === 'Expense'),
    [glAccounts]
  );

  const lineDebitCodes = useMemo(() => uniqueLineDebits(lines), [lines]);
  const mixedLineDebits = lineDebitCodes.length > 1;
  const lineDebitsOverrideHeader =
    mixedLineDebits ||
    (lineDebitCodes.length === 1 &&
      Boolean(form.debit_account_code) &&
      lineDebitCodes[0] !== form.debit_account_code);

  const totalsByAccount = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of lines) {
      const amount = (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0);
      if (!amount) continue;
      const code = l.account_code || form.debit_account_code;
      if (!code) continue;
      map.set(code, (map.get(code) || 0) + amount);
    }
    return [...map.entries()];
  }, [lines, form.debit_account_code]);

  useEffect(() => {
    if (!form.debit_account_code || !lineDebitsOverrideHeader) return;
    setForm((f) => ({ ...f, debit_account_code: '' }));
  }, [form.debit_account_code, lineDebitsOverrideHeader]);

  const setDefaultDebitAccount = (code: string) => {
    if (mixedLineDebits) return;
    setLines((prev) =>
      prev.map((l) =>
        !l.account_code || l.account_code === form.debit_account_code ? { ...l, account_code: code } : l
      )
    );
    setForm((f) => ({ ...f, debit_account_code: code }));
  };

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
    setForm((f) => ({ ...f, supplier_id: supplier?._id || '' }));
  };

  const onSupplierSaved = (saved: any) => {
    setSuppliers((prev) => {
      const rest = prev.filter((s) => s._id !== saved._id);
      return [...rest, saved].sort((a, b) => String(a.name).localeCompare(String(b.name)));
    });
    if (supplierDialog.forForm) chooseSupplier(saved);
  };

  const createPo = async () => {
    if (!form.supplier_id) {
      toast({ variant: 'destructive', title: 'Pick or add a supplier' });
      return;
    }
    const built = lines
      .map((l) => ({
        description: l.description.trim(),
        sku: l.sku.trim() || undefined,
        quantity: Number(l.quantity) || 0,
        unit_cost: Number(l.unit_cost) || 0,
        account_code: l.account_code || form.debit_account_code,
      }))
      .filter((l) => l.description && l.quantity > 0);
    if (!built.length) {
      toast({ variant: 'destructive', title: 'Add at least one line item' });
      return;
    }
    if (built.some((l) => !l.account_code)) {
      toast({
        variant: 'destructive',
        title: 'Debit account required',
        description: 'Each line item needs a debit GL account.',
      });
      return;
    }

    setSaving(true);
    const result = await apiClient.createPurchaseOrder({
      supplier_id: form.supplier_id,
      po_date: form.po_date,
      expected_date: form.expected_date || undefined,
      supplier_reference: form.supplier_reference.trim() || undefined,
      tax_amount: Number(form.tax_amount) || 0,
      notes: form.notes.trim() || undefined,
      debit_account_code: form.debit_account_code || undefined,
      credit_account_code: form.credit_account_code,
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
      title: 'Draft PO saved',
      description: `${(result.data as any)?.po_no || ''} — open it from All POs to enter the supplier invoice when the delivery arrives.`,
    });
    setForm(emptyForm());
    setLines([emptyLine()]);
    setTab('orders');
    await load();
  };

  const openInvoice = (po: any) => {
    const invoiceDate = todayIso();
    const terms = Number(suppliers.find((s) => s._id === String(po.supplier_id))?.payment_terms_days ?? 30);
    setInvoicePo(po);
    setInvoiceForm({
      supplier_invoice_no: po.supplier_invoice_no || '',
      supplier_invoice_date: invoiceDate,
      due_date: addDaysIso(invoiceDate, terms),
      due_touched: false,
      tax_amount: String(po.tax_amount ?? 0),
    });
  };

  const invoiceTerms = useMemo(
    () => Number(suppliers.find((s) => s._id === String(invoicePo?.supplier_id))?.payment_terms_days ?? 30),
    [suppliers, invoicePo]
  );

  const saveInvoice = async () => {
    if (!invoicePo) return;
    if (!invoiceForm.supplier_invoice_no.trim()) {
      toast({ variant: 'destructive', title: "Enter the supplier's invoice number" });
      return;
    }
    if (!invoiceForm.supplier_invoice_date) {
      toast({ variant: 'destructive', title: 'Enter the invoice date' });
      return;
    }
    setSavingInvoice(true);
    const result = await apiClient.recordPurchaseOrderInvoice(invoicePo._id, {
      supplier_invoice_no: invoiceForm.supplier_invoice_no.trim(),
      supplier_invoice_date: invoiceForm.supplier_invoice_date,
      due_date: invoiceForm.due_date || undefined,
      tax_amount: Number(invoiceForm.tax_amount) || 0,
    });
    setSavingInvoice(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not record invoice', description: result.error });
      return;
    }
    toast({
      title: 'Invoice recorded — sent for approval',
      description: `${invoicePo.po_no} · supplier invoice ${invoiceForm.supplier_invoice_no.trim()}. Approval posts it to the accounts.`,
    });
    setInvoicePo(null);
    setTab('approvals');
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

  const openApprove = (po: any) => {
    setApprovePoRow(po);
    setApproveVoucher(false);
    setApprovePayForm({
      amount: Number(po.total_amount || 0) > 0 ? Number(po.total_amount).toFixed(2) : '',
      bank_cash_account_id: wallets[0]?._id || '',
      payment_date: new Date().toISOString().slice(0, 10),
      clear_now: true,
    });
    setApproveOpen(true);
  };

  const confirmApprovePo = async () => {
    if (!approvePoRow) return;
    if (approveVoucher) {
      if (!approvePayForm.bank_cash_account_id || !(Number(approvePayForm.amount) > 0)) {
        toast({
          variant: 'destructive',
          title: 'Payment voucher details required',
          description: 'Enter amount and bank/cash account, or turn off Create payment voucher.',
        });
        return;
      }
    }

    setApproving(true);
    setActingId(approvePoRow._id);
    const result = await apiClient.approvePurchaseOrder(approvePoRow._id);
    if (!result.success) {
      setApproving(false);
      setActingId(null);
      toast({ variant: 'destructive', title: 'Approve failed', description: result.error });
      return;
    }

    const data = result.data as any;
    const approvedPo = data?.purchase_order || approvePoRow;
    let createdPayment: any = null;

    if (approveVoucher) {
      const payResult = await apiClient.createSupplierPayment({
        payment_date: approvePayForm.payment_date,
        supplier_name: approvedPo.supplier_name,
        supplier_reference: approvedPo.supplier_invoice_no || approvedPo.po_no,
        description: `Payment voucher for ${approvedPo.po_no}${
          approvedPo.supplier_invoice_no ? ` / inv ${approvedPo.supplier_invoice_no}` : ''
        }`,
        amount: Number(approvePayForm.amount),
        bank_cash_account_id: approvePayForm.bank_cash_account_id,
        debit_account_code: approvedPo.credit_account_code || COA.ap,
        purchase_order_id: approvedPo._id,
      });
      if (!payResult.success) {
        setApproving(false);
        setActingId(null);
        toast({
          variant: 'destructive',
          title: 'Approved, but payment voucher failed',
          description: payResult.error || 'Could not create payment draft',
        });
        setApproveOpen(false);
        await load();
        return;
      }
      createdPayment = (payResult.data as any)?.payment || null;
      if (createdPayment && approvePayForm.clear_now && isFm) {
        const clearResult = await apiClient.approveSupplierPayment(createdPayment._id);
        if (clearResult.success) {
          createdPayment =
            (clearResult.data as any)?.payment || {
              ...createdPayment,
              status: 'APPROVED',
              journal_entry_no:
                (clearResult.data as any)?.journal?.entry_no || createdPayment.journal_entry_no,
            };
        } else {
          toast({
            variant: 'destructive',
            title: 'Voucher created, clear failed',
            description: clearResult.error || 'Clear it manually from the statement or Bank & Cash.',
          });
        }
      }
    }

    setApproving(false);
    setActingId(null);
    setApproveOpen(false);

    toast({
      title: data?.posted ? 'Approved and posted to accounts' : 'Approved — awaiting goods',
      description: createdPayment
        ? createdPayment.status === 'APPROVED'
          ? `Payment ${createdPayment.payment_no} cleared — voucher PDF ready.`
          : `Payment voucher ${createdPayment.payment_no} created (draft). Approve it here or under Statement of purchase.`
        : data?.posted
          ? `Journal ${data?.journal?.entry_no || ''} posted: AED ${money(data?.journal?.total_credit)} owed in Accounts Payable.`
          : `Draft journal ${data?.journal?.entry_no || ''} — Accounts Payable posts as goods are received.`,
    });

    if (createdPayment) {
      setVoucherPayment(createdPayment);
      setVoucherPo(approvedPo);
      setVoucherOpen(true);
    }
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
      print_voucher: true,
      clear_now: isFm,
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
      supplier_reference: payPo.supplier_invoice_no || payPo.po_no,
      description: `Payment for ${payPo.po_no}${
        payPo.supplier_invoice_no ? ` / inv ${payPo.supplier_invoice_no}` : ''
      }`,
      amount: Number(payForm.amount),
      bank_cash_account_id: payForm.bank_cash_account_id,
      debit_account_code: payPo.credit_account_code || COA.ap,
      purchase_order_id: payPo._id,
    });
    if (!result.success) {
      setPaying(false);
      toast({ variant: 'destructive', title: 'Payment failed', description: result.error });
      return;
    }
    let payment = (result.data as any)?.payment;
    if (payment && payForm.clear_now && isFm) {
      const clearResult = await apiClient.approveSupplierPayment(payment._id);
      if (clearResult.success) {
        payment =
          (clearResult.data as any)?.payment || {
            ...payment,
            status: 'APPROVED',
            journal_entry_no:
              (clearResult.data as any)?.journal?.entry_no || payment.journal_entry_no,
          };
      } else {
        toast({
          variant: 'destructive',
          title: 'Created, but approve failed',
          description: clearResult.error || 'Approve it from Statement of purchase.',
        });
      }
    }
    setPaying(false);
    toast({
      title: payment?.status === 'APPROVED' ? 'Payment cleared' : 'Payment voucher draft created',
      description:
        payment?.status === 'APPROVED'
          ? `${payment?.payment_no || ''} posted — download the voucher PDF.`
          : `${payment?.payment_no || ''} with DRAFT journal ${
              (result.data as any)?.journal?.entry_no || ''
            }. Approve it here or under Statement of purchase.`,
    });
    setPayOpen(false);
    if ((payForm.print_voucher || payment?.status === 'APPROVED') && payment) {
      setVoucherPayment(payment);
      setVoucherPo(payPo);
      setVoucherOpen(true);
    }
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

        {tab === 'statement' ? (
          <PurchaseStatementPanel suppliers={suppliers} orders={orders} />
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
                    <TableRow
                      key={po._id}
                      className={po.status === 'DRAFT' ? 'cursor-pointer hover:bg-slate-50' : undefined}
                      onClick={po.status === 'DRAFT' ? () => openInvoice(po) : undefined}
                    >
                      <TableCell>
                        <div className="font-medium">{po.po_no}</div>
                        <div className="text-xs text-slate-400">{fmtDate(po.po_date)}</div>
                      </TableCell>
                      <TableCell>
                        <div>{po.supplier_name}</div>
                        {po.supplier_trn ? <div className="text-xs text-slate-400">TRN {po.supplier_trn}</div> : null}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {po.supplier_invoice_no ? (
                          <>
                            {po.supplier_invoice_no}
                            {po.supplier_invoice_date ? (
                              <div className="text-[11px] text-slate-400">{fmtDate(po.supplier_invoice_date)}</div>
                            ) : null}
                          </>
                        ) : po.status === 'DRAFT' ? (
                          <span className="text-[11px] font-semibold text-amber-700">Awaiting delivery</span>
                        ) : (
                          po.supplier_reference || '—'
                        )}
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
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setPdfPo(po)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                          {po.status === 'DRAFT' ? (
                            <Button
                              type="button"
                              size="sm"
                              className="rounded-xl bg-sky-600 hover:bg-sky-700"
                              onClick={() => openInvoice(po)}
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              Delivery received
                            </Button>
                          ) : null}
                          {['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(po.status) &&
                          payInfo(po).available > 0.009 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => openPay(po)}
                            >
                              Pay / voucher
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
              <h3 className="text-base font-semibold text-slate-900">New purchase order</h3>
              <p className="mt-1 text-sm text-slate-500">
                The PO is saved as a draft — nothing posts to the accounts yet. When the delivery arrives,
                open the PO under All POs and enter the supplier&apos;s invoice number and date. A Finance
                Manager then approves it, which posts Inventory/Expense + VAT input against Accounts Payable.
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
                <Label>PO date</Label>
                <Input
                  type="date"
                  value={form.po_date}
                  onChange={(e) => setForm((f) => ({ ...f, po_date: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Expected delivery</Label>
                <Input
                  type="date"
                  value={form.expected_date}
                  onChange={(e) => setForm((f) => ({ ...f, expected_date: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Reference (quotation / LPO)</Label>
                <Input
                  value={form.supplier_reference}
                  onChange={(e) => setForm((f) => ({ ...f, supplier_reference: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Expected VAT (confirm on the invoice)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.tax_amount}
                  onChange={(e) => setForm((f) => ({ ...f, tax_amount: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Default debit account (new lines)</Label>
                <Select
                  value={form.debit_account_code || undefined}
                  onValueChange={setDefaultDebitAccount}
                  disabled={mixedLineDebits}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue
                      placeholder={
                        mixedLineDebits || lineDebitCodes.length
                          ? 'Using line item accounts'
                          : 'Select default debit'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {debitAccounts.map((a) => (
                      <SelectItem key={a.code} value={a.code}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mixedLineDebits || (!form.debit_account_code && lineDebitCodes.length > 0) ? (
                  <p className="text-[11px] text-slate-500">
                    Journal debits come from the line items below. Header default is cleared.
                  </p>
                ) : null}
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
                  onClick={() => setLines((prev) => [...prev, emptyLine(form.debit_account_code)])}
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
                  <div className="sm:col-span-5">
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
                  <div className="sm:col-span-4">
                    <Select
                      value={line.account_code || form.debit_account_code || undefined}
                      onValueChange={(v) =>
                        setLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, account_code: v } : l))
                        )
                      }
                    >
                      <SelectTrigger className="rounded-xl bg-white" title="GL account (Chart of Accounts)">
                        <SelectValue placeholder="GL account" />
                      </SelectTrigger>
                      <SelectContent>
                        {debitAccounts.map((a) => (
                          <SelectItem key={a.code} value={a.code}>
                            {a.code} — {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                                  account_code: item?.asset_account_code || l.account_code,
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
                  <div className="sm:col-span-3">
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
                  <div className="sm:col-span-3">
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
                  <div className="flex items-center justify-end gap-3 sm:col-span-6">
                    <span className="text-xs tabular-nums text-slate-500">
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
              {totalsByAccount.length > 1 ? (
                <div className="ml-auto max-w-sm space-y-0.5 rounded-xl bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                  <div className="font-semibold text-slate-700">Debit by GL account (excl. VAT)</div>
                  {totalsByAccount.map(([code, amount]) => (
                    <div key={code} className="flex justify-between gap-4">
                      <span>
                        {code} — {glAccounts.find((a) => a.code === code)?.name || ''}
                      </span>
                      <span className="tabular-nums">AED {money(amount)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
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
                className={erpPrimaryButtonClass()}
                disabled={saving}
                onClick={() => void createPo()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                Save draft PO
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
                          {po.supplier_invoice_no ? (
                            <>
                              <div className="font-medium text-slate-800">{po.supplier_invoice_no}</div>
                              <div>
                                {fmtDate(po.supplier_invoice_date || po.po_date)}
                                {po.due_date ? ` · due ${fmtDate(po.due_date)}` : ''}
                              </div>
                              <div className={po.receive_later ? 'text-violet-600' : 'text-emerald-700'}>
                                {po.receive_later ? 'AP posts on receipt' : 'Posts to accounts on approval'}
                              </div>
                            </>
                          ) : (
                            <div className="font-semibold text-amber-700">Awaiting delivery — no invoice yet</div>
                          )}
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
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => setPdfPo(po)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF
                            </Button>
                            {po.status === 'DRAFT' && !po.supplier_invoice_no ? (
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-xl bg-sky-600 hover:bg-sky-700"
                                onClick={() => openInvoice(po)}
                              >
                                <PackageCheck className="h-3.5 w-3.5" />
                                Delivery received
                              </Button>
                            ) : po.status === 'DRAFT' ? (
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
                            {isFm && po.supplier_invoice_no ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                                  disabled={actingId === po._id}
                                  onClick={() => openApprove(po)}
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
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => setPdfPo(po)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF
                            </Button>
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
                                Pay / voucher
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

        <Dialog open={approveOpen} onOpenChange={(open) => !approving && setApproveOpen(open)}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Approve invoice — {approvePoRow?.po_no}</DialogTitle>
              <DialogDescription>
                Posts the purchase invoice to accounts. Optionally create a payment voucher draft at the
                same time.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {approvePoRow ? (
                <div className="rounded-2xl bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">{approvePoRow.supplier_name}</p>
                  <p className="mt-1 text-xs">
                    Inv. {approvePoRow.supplier_invoice_no || '—'} · AED{' '}
                    {money(approvePoRow.total_amount)}
                  </p>
                </div>
              ) : null}
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <Checkbox
                  checked={approveVoucher}
                  onCheckedChange={(v) => setApproveVoucher(v === true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">Create payment voucher</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Creates a draft supplier payment and opens a printable voucher. A Finance Manager still
                    clears it under Bank &amp; Cash.
                  </span>
                </span>
              </label>
              {approveVoucher ? (
                <div className="space-y-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={approvePayForm.amount}
                      onChange={(e) =>
                        setApprovePayForm((f) => ({ ...f, amount: e.target.value }))
                      }
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pay from</Label>
                    <Select
                      value={approvePayForm.bank_cash_account_id}
                      onValueChange={(v) =>
                        setApprovePayForm((f) => ({ ...f, bank_cash_account_id: v }))
                      }
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
                      value={approvePayForm.payment_date}
                      onChange={(e) =>
                        setApprovePayForm((f) => ({ ...f, payment_date: e.target.value }))
                      }
                      className="rounded-xl"
                    />
                  </div>
                  {isFm ? (
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                      <Checkbox
                        checked={approvePayForm.clear_now}
                        onCheckedChange={(v) =>
                          setApprovePayForm((f) => ({ ...f, clear_now: v === true }))
                        }
                      />
                      <span className="text-sm text-slate-700">
                        Clear / approve payment now (posts bank JE)
                      </span>
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={approving}
                onClick={() => setApproveOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                disabled={approving}
                onClick={() => void confirmApprovePo()}
              >
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {approveVoucher
                  ? approvePayForm.clear_now
                    ? 'Approve invoice & clear payment'
                    : 'Approve & create voucher'
                  : 'Approve invoice'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Payment voucher — {payPo?.po_no}</DialogTitle>
              <DialogDescription>
                Create a draft supplier payment and printable voucher for this purchase invoice.
              </DialogDescription>
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
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <Checkbox
                  checked={payForm.print_voucher}
                  onCheckedChange={(v) => setPayForm((f) => ({ ...f, print_voucher: v === true }))}
                />
                <span className="text-sm text-slate-700">Open printable / PDF voucher after create</span>
              </label>
              {isFm ? (
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                  <Checkbox
                    checked={payForm.clear_now}
                    onCheckedChange={(v) => setPayForm((f) => ({ ...f, clear_now: v === true }))}
                  />
                  <span className="text-sm text-slate-700">
                    Clear / approve payment now (same place — posts bank JE)
                  </span>
                </label>
              ) : null}
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
                {payForm.clear_now && isFm ? 'Create & approve payment' : 'Create payment voucher'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SupplierPaymentVoucherDialog
          payment={voucherPayment}
          purchaseOrder={voucherPo}
          open={voucherOpen}
          onOpenChange={setVoucherOpen}
          canApprove={isFm}
          onApprove={async (payment) => {
            setActingId(payment._id);
            const result = await apiClient.approveSupplierPayment(payment._id);
            setActingId(null);
            if (!result.success) {
              toast({
                variant: 'destructive',
                title: 'Approve failed',
                description: result.error || 'Could not clear payment',
              });
              return;
            }
            const cleared =
              (result.data as any)?.payment || {
                ...payment,
                status: 'APPROVED',
                journal_entry_no:
                  (result.data as any)?.journal?.entry_no || payment.journal_entry_no,
              };
            setVoucherPayment(cleared);
            toast({
              title: 'Payment cleared',
              description: `${cleared.payment_no || payment.payment_no} — journal ${
                (result.data as any)?.journal?.entry_no || ''
              } posted.`,
            });
            await load();
          }}
        />

        <PurchaseOrderDocumentDialog
          order={pdfPo}
          open={Boolean(pdfPo)}
          onOpenChange={(open) => !open && setPdfPo(null)}
          onDocumentsChange={(id, docs) => {
            setOrders((prev) => prev.map((p) => (p._id === id ? { ...p, supporting_documents: docs } : p)));
            setPdfPo((prev: any) => (prev && prev._id === id ? { ...prev, supporting_documents: docs } : prev));
          }}
        />

        <Dialog open={Boolean(invoicePo)} onOpenChange={(open) => !open && !savingInvoice && setInvoicePo(null)}>
          <DialogContent className="max-w-xl rounded-3xl">
            <DialogHeader>
              <DialogTitle>Delivery received — {invoicePo?.po_no}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-500">
              Enter the invoice {invoicePo?.supplier_name} sent with the delivery. The PO then goes to the
              Finance Manager, whose approval posts it to the accounts.
            </p>
            {invoicePo ? (
              <div className="space-y-1 rounded-2xl bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
                {(invoicePo.lines || []).map((l: any, i: number) => (
                  <div key={l._id || i} className="flex justify-between gap-4">
                    <span>
                      {l.description} × {Number(l.quantity || 0)}
                      <span className="text-slate-400"> · GL {l.account_code || invoicePo.debit_account_code}</span>
                    </span>
                    <span className="tabular-nums">AED {money(l.line_total)}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-slate-200 pt-1 font-semibold text-slate-900">
                  <span>Subtotal</span>
                  <span className="tabular-nums">AED {money(invoicePo.subtotal)}</span>
                </div>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Supplier invoice no. *</Label>
                <Input
                  value={invoiceForm.supplier_invoice_no}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, supplier_invoice_no: e.target.value }))}
                  className="rounded-xl"
                  placeholder="As printed on the invoice"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice date *</Label>
                <Input
                  type="date"
                  value={invoiceForm.supplier_invoice_date}
                  onChange={(e) => {
                    const v = e.target.value;
                    setInvoiceForm((f) => ({
                      ...f,
                      supplier_invoice_date: v,
                      due_date: f.due_touched ? f.due_date : addDaysIso(v, invoiceTerms),
                    }));
                  }}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Due date ({invoiceTerms} days terms)</Label>
                <Input
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, due_date: e.target.value, due_touched: true }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>VAT on invoice (feeds VAT201 input)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={invoiceForm.tax_amount}
                  onChange={(e) => setInvoiceForm((f) => ({ ...f, tax_amount: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="flex items-end justify-end pb-2 text-sm text-slate-500">
                Invoice total{' '}
                <span className="ml-1 font-semibold tabular-nums text-slate-900">
                  AED {money(Number(invoicePo?.subtotal || 0) + (Number(invoiceForm.tax_amount) || 0))}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={savingInvoice}
                onClick={() => setInvoicePo(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={erpPrimaryButtonClass()}
                disabled={savingInvoice}
                onClick={() => void saveInvoice()}
              >
                {savingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save invoice &amp; send for approval
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
                        GL {l.account_code || receivePoRow?.debit_account_code} ·{' '}
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
