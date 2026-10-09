'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, ExternalLink, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient, type InvoiceNote } from '@/lib/api-client';
import { fmtDate, money } from '@/components/accounting/erp-format';
import { NoteStatusPill, categoryLabel, reasonLabel, refundModeLabel } from './invoice-note-shared';

export function noteDocumentTitle(note: Pick<InvoiceNote, 'note_type' | 'vat_amount'>) {
  if (note.note_type === 'CREDIT') return note.vat_amount > 0 ? 'TAX CREDIT NOTE' : 'CREDIT NOTE';
  return note.vat_amount > 0 ? 'TAX DEBIT NOTE' : 'DEBIT NOTE';
}

const num = (v: unknown) => {
  const raw =
    v && typeof v === 'object' && '$numberDecimal' in (v as object)
      ? (v as { $numberDecimal: string }).$numberDecimal
      : v;
  const n = parseFloat(String(raw ?? ''));
  return Number.isFinite(n) ? n : 0;
};

function KnexLetterhead() {
  return (
    <div className="mb-6 flex items-start justify-between gap-6">
      <img src="/Screenshot 2026-06-29 132542.png" alt="KNEX logo" className="h-20 w-auto shrink-0 object-contain" />
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
  );
}

/** Original invoice issued to the customer — printed with the credit / debit note. */
export function OriginalInvoiceDocument({ invoice, note }: { invoice: any; note: InvoiceNote }) {
  const taxAmount = num(invoice?.tax_amount);
  const taxRate = num(invoice?.tax_rate);
  const total = num(invoice?.total_amount);
  const shipping = num(invoice?.amount);
  const pickup = num(invoice?.pickup_charge);
  const delivery = num(invoice?.delivery_charge);
  const insurance = num(invoice?.insurance_charge);
  const subtotal = num(invoice?.subtotal) || shipping + pickup + delivery + insurance;
  const client = invoice?.client_id || {};
  const customerName =
    invoice?.customer_name || client.company_name || client.contact_name || note.customer_name || '—';
  const customerTrn = invoice?.customer_trn || client.trn || note.customer_trn;
  const invoiceNo = invoice?.invoice_id || note.invoice_no;
  const title = taxAmount > 0 ? 'TAX INVOICE' : 'INVOICE';
  const lineItems = Array.isArray(invoice?.line_items) ? invoice.line_items.filter(Boolean) : [];
  const chargeRows =
    lineItems.length > 0
      ? lineItems.map((line: any, i: number) => ({
          key: String(line._id || i),
          description: line.description || line.item || 'Charge',
          amount: num(line.total ?? line.unit_price ?? line.amount),
        }))
      : [
          shipping ? { key: 'ship', description: 'Shipping Charge', amount: shipping } : null,
          pickup ? { key: 'pick', description: 'Pickup Charge', amount: pickup } : null,
          delivery ? { key: 'del', description: 'Delivery Charge', amount: delivery } : null,
          insurance ? { key: 'ins', description: 'Insurance', amount: insurance } : null,
        ].filter(Boolean) as { key: string; description: string; amount: number }[];

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-sm leading-snug text-black">
      <KnexLetterhead />
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-wide">{title}</h2>
        <span className="rounded border border-slate-400 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
          Original invoice
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-8">
        <div>
          <p className="mb-2 font-semibold">Billed To :</p>
          <p className="font-medium">{customerName}</p>
          {customerTrn ? (
            <p className="mt-1">
              <span className="font-medium">TRN :</span> {customerTrn}
            </p>
          ) : null}
          {invoice?.receiver_name ? <p className="mt-2">Receiver: {invoice.receiver_name}</p> : null}
          {invoice?.receiver_address ? <p>{invoice.receiver_address}</p> : null}
        </div>
        <div className="space-y-1">
          <p>
            <span className="font-semibold">Invoice No :</span> {invoiceNo}
          </p>
          <p>
            <span className="font-semibold">Date :</span> {fmtDate(invoice?.issue_date || note.invoice_date)}
          </p>
          {invoice?.awb_number || note.awb_number ? (
            <p>
              <span className="font-semibold">AIR WAYBILL NO :</span> {invoice?.awb_number || note.awb_number}
            </p>
          ) : null}
          {invoice?.batch_number ? (
            <p>
              <span className="font-semibold">Batch :</span> {invoice.batch_number}
            </p>
          ) : null}
          {invoice?.service_code ? (
            <p>
              <span className="font-semibold">Service :</span> {String(invoice.service_code).replace(/_/g, ' ')}
            </p>
          ) : null}
        </div>
      </div>

      <table className="mb-4 w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-black">
            <th className="py-2 text-left">#</th>
            <th className="py-2 text-left">Description</th>
            <th className="py-2 text-right">Amount (AED)</th>
          </tr>
        </thead>
        <tbody>
          {chargeRows.map((row, i) => (
            <tr key={row.key} className="border-b border-slate-300">
              <td className="py-2">{i + 1}</td>
              <td className="py-2">{row.description}</td>
              <td className="py-2 text-right tabular-nums">{money(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-72 space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="tabular-nums">AED {money(subtotal)}</span>
        </div>
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span>VAT {taxRate > 0 ? `${taxRate}%` : ''}</span>
            <span className="tabular-nums">AED {money(taxAmount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-black pt-1 font-bold">
          <span>Invoice total</span>
          <span className="tabular-nums">AED {money(total)}</span>
        </div>
      </div>

      <div className="mt-6 space-y-1 text-xs text-slate-700">
        <p>
          This is the original invoice {invoiceNo}. It is adjusted by {note.note_type === 'CREDIT' ? 'credit' : 'debit'}{' '}
          note {note.note_no} for AED {money(note.total_amount)} (see previous page).
        </p>
      </div>
    </div>
  );
}

/** A4 credit / debit note, styled like the tax invoice it adjusts. */
export function InvoiceNoteDocument({ note }: { note: InvoiceNote }) {
  const isCredit = note.note_type === 'CREDIT';
  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-sm leading-snug text-black">
      <KnexLetterhead />

      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-wide">{noteDocumentTitle(note)}</h2>
        {note.status !== 'POSTED' && (
          <span className="rounded border border-slate-400 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
            {note.status === 'PENDING_APPROVAL' ? 'Draft — awaiting approval' : note.status}
          </span>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-8">
        <div>
          <p className="mb-2 font-semibold">Issued To :</p>
          <p className="font-medium">{note.customer_name || '—'}</p>
          {note.customer_trn ? (
            <p className="mt-1">
              <span className="font-medium">TRN :</span> {note.customer_trn}
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <p>
            <span className="font-semibold">{isCredit ? 'Credit' : 'Debit'} Note No :</span> {note.note_no}
          </p>
          <p>
            <span className="font-semibold">Date :</span> {fmtDate(note.note_date)}
          </p>
          <p>
            <span className="font-semibold">Original Invoice :</span> {note.invoice_no}
          </p>
          <p>
            <span className="font-semibold">Invoice Date :</span> {fmtDate(note.invoice_date)}
          </p>
          {note.awb_number ? (
            <p>
              <span className="font-semibold">AIR WAYBILL NO :</span> {note.awb_number}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mb-4">
        <p className="font-semibold">Reason :</p>
        <p>
          {reasonLabel(note.reason_code)} — {note.reason}
        </p>
      </div>

      <table className="mb-4 w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-black">
            <th className="py-2 text-left">#</th>
            <th className="py-2 text-left">Description</th>
            <th className="py-2 text-right">Taxable amount (AED)</th>
            <th className="py-2 text-right">VAT %</th>
            <th className="py-2 text-right">VAT (AED)</th>
            <th className="py-2 text-right">Total (AED)</th>
          </tr>
        </thead>
        <tbody>
          {note.lines.map((line, i) => (
            <tr key={i} className="border-b border-slate-300">
              <td className="py-2">{i + 1}</td>
              <td className="py-2">
                <span className="font-medium">{categoryLabel(line.category)}</span>
                {line.description && line.description !== categoryLabel(line.category) ? ` — ${line.description}` : ''}
              </td>
              <td className="py-2 text-right tabular-nums">{money(line.amount)}</td>
              <td className="py-2 text-right tabular-nums">{line.vat_rate}%</td>
              <td className="py-2 text-right tabular-nums">{money(line.vat_amount)}</td>
              <td className="py-2 text-right tabular-nums">{money(line.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-72 space-y-1">
        <div className="flex justify-between">
          <span>Total taxable amount</span>
          <span className="tabular-nums">AED {money(note.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total VAT</span>
          <span className="tabular-nums">AED {money(note.vat_amount)}</span>
        </div>
        <div className="flex justify-between border-t border-black pt-1 font-bold">
          <span>{isCredit ? 'Total credited' : 'Total debited'}</span>
          <span className="tabular-nums">AED {money(note.total_amount)}</span>
        </div>
      </div>

      <div className="mt-6 space-y-1 text-xs text-slate-700">
        <p>
          This {isCredit ? 'credit' : 'debit'} note {isCredit ? 'reduces' : 'increases'} the amount payable on invoice{' '}
          {note.invoice_no}
          {note.invoice_total ? ` (original total AED ${money(note.invoice_total)})` : ''} by AED {money(note.total_amount)}.
        </p>
        {isCredit && (note.refund_amount || 0) > 0 && (
          <p>
            AED {money(note.refund_amount)} refunded via {refundModeLabel(note.refund_mode)}
            {note.refund_reference ? ` (ref. ${note.refund_reference})` : ''}.
          </p>
        )}
      </div>

      <div className="mt-16 grid grid-cols-2 gap-10 text-xs">
        <div>
          <p className="border-t border-black pt-1">Prepared by: {note.created_by_name || '—'}</p>
        </div>
        <div>
          <p className="border-t border-black pt-1">
            Approved by: {note.approved_by_name || '—'}
            {note.approved_at ? ` · ${fmtDate(note.approved_at)}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

type DialogProps = {
  note: InvoiceNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InvoiceNoteDocumentDialog({ note, open, onOpenChange }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    const invoiceId =
      note?.invoice_id && typeof note.invoice_id === 'object'
        ? String((note.invoice_id as { _id?: string })._id || note.invoice_id)
        : String(note?.invoice_id || '');
    if (!open || !invoiceId) {
      setInvoice(null);
      return;
    }
    let cancelled = false;
    setInvoiceLoading(true);
    apiClient.getInvoiceUnified(invoiceId).then((result: any) => {
      if (cancelled) return;
      setInvoice(result?.success ? result.data : null);
      setInvoiceLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, note?.invoice_id, note?._id]);

  const download = async () => {
    if (!ref.current || !note) return;
    setDownloading(true);
    try {
      const mod = await import('html2pdf.js');
      const html2pdf = (mod as any).default || mod;
      await html2pdf()
        .set({
          margin: 0.3,
          filename: invoice
            ? `${note.note_no}-${note.invoice_no || invoice.invoice_id}.pdf`
            : `${note.note_no}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(ref.current)
        .save();
    } finally {
      setDownloading(false);
    }
  };

  const print = () => {
    if (!ref.current || !note) return;
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) return;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('');
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    };
    doc.open();
    doc.write(
      `<!doctype html><html><head><base href="${window.location.origin}/"><title>${note.note_no}</title>${styles}<style>@media print{.note-print-break{page-break-before:always;break-before:page}}</style></head><body>${ref.current.innerHTML}</body></html>`
    );
    doc.close();
  };

  const invoiceHref = note?.invoice_id ? `/dashboard/invoices/${note.invoice_id}` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            {note?.note_no || 'Note'}
            {note && <NoteStatusPill status={note.status} />}
          </DialogTitle>
          <DialogDescription>
            {note
              ? `${noteDocumentTitle(note)} plus original invoice ${note.invoice_no}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        {note && (
          <div className="theme-light overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div ref={ref} className="theme-light space-y-4">
              <InvoiceNoteDocument note={note} />
              {invoice && (
                <>
                  <div className="html2pdf__page-break note-print-break" />
                  <OriginalInvoiceDocument invoice={invoice} note={note} />
                </>
              )}
            </div>
            {invoiceLoading && (
              <p className="mt-2 flex items-center gap-2 px-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading original invoice…
              </p>
            )}
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          {invoiceHref ? (
            <Button type="button" variant="ghost" className="rounded-xl" asChild>
              <Link href={invoiceHref}>
                <ExternalLink className="h-4 w-4" />
                Open invoice
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={print} disabled={!note}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button type="button" className="rounded-xl" onClick={() => void download()} disabled={!note || downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
