'use client';

import { fmtDate, money } from './erp-format';
import { PrintDocumentDialog } from './print-document-dialog';
import { InvoicePrintExtras } from '@/components/invoice-print-extras';
import { InvoicePrintOptionsPanel } from '@/components/invoice-print-options-panel';
import { invoicePrintOptionsFrom, type InvoicePrintOptions } from '@/lib/invoice-print-options';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

function cell() {
  return 'border border-gray-400 px-3 py-2 text-sm';
}

export function SalesInvoiceDocument({ invoice }: { invoice: any }) {
  const status = String(invoice?.status || '').toUpperCase();
  const watermark =
    status === 'DRAFT' || status === 'PENDING_APPROVAL'
      ? 'DRAFT'
      : status === 'APPROVED' || status === 'PARTIALLY_PAID'
        ? 'UNPAID'
        : '';
  const lines = Array.isArray(invoice?.lines) ? invoice.lines : [];

  return (
    <div className="relative mx-auto max-w-[210mm] bg-white p-8 text-sm leading-snug text-black">
      {watermark ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-20deg] text-7xl font-black tracking-widest text-amber-500/25">{watermark}</span>
        </div>
      ) : null}

      <div className="mb-6 flex items-start justify-between gap-6">
        <img
          src="/Screenshot 2026-06-29 132542.png"
          alt="KNEX logo"
          className="h-20 w-auto shrink-0 object-contain"
        />
        <div className="text-right">
          <p className="font-semibold">Knex Delivery Services L.L.C.</p>
          <p>Rocky Warehouse # 19</p>
          <p>11th Street, Al Qusais, Industrial Area 1</p>
          <p>Dubai, UAE</p>
          <p className="mt-1">
            <span className="font-medium">TRN :</span> 104131637100003
          </p>
        </div>
      </div>

      <div className="mb-5 flex items-end justify-between gap-4 border-b-2 border-black pb-2">
        <h2 className="text-xl font-bold tracking-wide">TAX INVOICE</h2>
        <div className="text-right">
          <p>
            <span className="font-semibold">Invoice No :</span> {invoice.invoice_no}
          </p>
          <p>
            <span className="font-semibold">Date :</span> {fmtDate(invoice.invoice_date)}
          </p>
          <p>
            <span className="font-semibold">Status :</span> {status.replace(/_/g, ' ') || '—'}
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-x-8 gap-y-2">
        <p>
          <span className="inline-block w-36 font-semibold">Bill to :</span>
          {invoice.customer_name}
        </p>
        {invoice.customer_vat_trn ? (
          <p>
            <span className="inline-block w-36 font-semibold">Customer TRN :</span>
            {invoice.customer_vat_trn}
          </p>
        ) : null}
        {invoice.due_date ? (
          <p>
            <span className="inline-block w-36 font-semibold">Due date :</span>
            {fmtDate(invoice.due_date)}
          </p>
        ) : null}
      </div>

      <table className="mb-4 w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className={`${cell()} text-left font-semibold`}>DESCRIPTION</th>
            <th className={`${cell()} text-right font-semibold`}>QTY</th>
            <th className={`${cell()} text-right font-semibold`}>UNIT PRICE</th>
            <th className={`${cell()} text-right font-semibold`}>VAT %</th>
            <th className={`${cell()} text-right font-semibold`}>AMOUNT AED</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line: any, idx: number) => (
            <tr key={String(line._id || idx)}>
              <td className={cell()}>{line.description}</td>
              <td className={`${cell()} text-right tabular-nums`}>{line.quantity}</td>
              <td className={`${cell()} text-right tabular-nums`}>{money(line.unit_price)}</td>
              <td className={`${cell()} text-right tabular-nums`}>{line.vat_rate ?? 0}</td>
              <td className={`${cell()} text-right tabular-nums`}>{money(line.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="tabular-nums">AED {money(invoice.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT</span>
          <span className="tabular-nums">AED {money(invoice.vat_amount)}</span>
        </div>
        <div className="flex justify-between border-t border-black pt-1 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">AED {money(invoice.total_amount)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Paid</span>
          <span className="tabular-nums">AED {money(invoice.amount_paid)}</span>
        </div>
      </div>

      <InvoicePrintExtras
        notes={invoice.notes}
        disclaimer={invoice.disclaimer}
        includeNotes={invoice.include_notes}
        includeDisclaimer={invoice.include_disclaimer}
      />
    </div>
  );
}

export function SalesInvoiceDocumentDialog({
  invoice,
  open,
  onOpenChange,
  onDocumentsChange,
  onInvoiceChange,
}: {
  invoice: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentsChange?: (id: string, docs: any[]) => void;
  onInvoiceChange?: (id: string, patch: Record<string, unknown>) => void;
}) {
  const { toast } = useToast();
  const [options, setOptions] = useState<Required<InvoicePrintOptions>>(() => invoicePrintOptionsFrom(invoice));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOptions(invoicePrintOptionsFrom(invoice));
  }, [invoice?._id, invoice?.notes, invoice?.disclaimer, invoice?.include_notes, invoice?.include_disclaimer]);

  if (!invoice) return null;

  const preview = {
    ...invoice,
    notes: options.notes,
    disclaimer: options.disclaimer,
    include_notes: options.include_notes,
    include_disclaimer: options.include_disclaimer,
  };

  const saveOptions = async () => {
    setSaving(true);
    const result = await apiClient.updateSalesInvoice(String(invoice._id), options);
    setSaving(false);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not save print options', description: result.error });
      return;
    }
    onInvoiceChange?.(String(invoice._id), options);
    toast({ title: 'Print options saved' });
  };

  return (
    <PrintDocumentDialog
      open={open}
      onOpenChange={onOpenChange}
      title={invoice.invoice_no || 'Sales invoice'}
      description={`${invoice.customer_name} · AED ${money(invoice.total_amount)} · ${String(invoice.status || '').replace(/_/g, ' ')}`}
      fileName={invoice.invoice_no || 'sales-invoice'}
      attachmentKind="sales-invoice"
      attachmentId={String(invoice._id)}
      documents={invoice.supporting_documents}
      onDocumentsChange={(docs) => onDocumentsChange?.(String(invoice._id), docs)}
      extra={
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <InvoicePrintOptionsPanel
            value={options}
            onChange={setOptions}
            onSave={() => void saveOptions()}
            saving={saving}
            compact
          />
        </div>
      }
    >
      <SalesInvoiceDocument invoice={preview} />
    </PrintDocumentDialog>
  );
}
