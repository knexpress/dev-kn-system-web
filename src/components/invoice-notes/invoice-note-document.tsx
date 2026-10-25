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

export function noteDocumentTitle(note: Pick<InvoiceNote, 'note_type'>) {
  return note.note_type === 'CREDIT' ? 'TAX CREDIT NOTE' : 'DEBIT NOTE';
}

function cellBorder() {
  return 'border border-gray-400 px-2 py-1.5 text-sm';
}

/** A4 tax credit / debit note, laid out like the tax invoice it adjusts. */
export function InvoiceNoteDocument({ note, invoice }: { note: InvoiceNote; invoice?: any }) {
  const isCredit = note.note_type === 'CREDIT';
  const client = invoice?.client_id && typeof invoice.client_id === 'object' ? invoice.client_id : {};
  const customerName = note.customer_name || client.company_name || client.contact_name || '—';
  const customerAddress = client.address || '';
  const customerTrn = note.customer_trn || invoice?.customer_trn;
  const vatRates = Array.from(new Set(note.lines.map((l) => l.vat_rate).filter((r) => r > 0)));
  const taxSummaryLabel =
    note.vat_amount > 0 ? `TOTAL TAX ON SALES ${vatRates.length === 1 ? vatRates[0] : 5}%` : 'TOTAL SALES TAX 0%';

  return (
    <div className="mx-auto flex min-h-[277mm] max-w-[210mm] flex-col bg-white p-8 text-sm leading-snug text-black">
      <div className="mb-6 flex items-start justify-between gap-6">
        <img src="/Screenshot 2026-06-29 132542.png" alt="KNEX logo" className="h-24 w-auto shrink-0 object-contain" />
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
          <p className="mb-2 font-semibold">Bill To :</p>
          <p className="font-medium">{customerName}</p>
          {customerAddress ? <p className="whitespace-pre-line leading-relaxed">{customerAddress}</p> : null}
          <p>UAE</p>
          {customerTrn ? (
            <p className="mt-2">
              <span className="font-medium">TRN :</span> {customerTrn}
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <p>
            <span className="font-semibold">{isCredit ? 'Credit' : 'Debit'} Note No :</span> {note.note_no}
          </p>
          <p>
            <span className="font-semibold">{isCredit ? 'Credit' : 'Debit'} Note Date :</span> {fmtDate(note.note_date)}
          </p>
          <p>
            <span className="font-semibold">Tax Invoice No :</span> {note.invoice_no}
          </p>
          <p>
            <span className="font-semibold">Tax Invoice Date :</span> {fmtDate(note.invoice_date)}
          </p>
          {note.awb_number ? (
            <p>
              <span className="font-semibold">AIR WAYBILL NO :</span> {note.awb_number}
            </p>
          ) : null}
          {note.chargeable_weight || note.actual_weight ? (
            <p>
              <span className="font-semibold">Weight :</span>{' '}
              {note.chargeable_weight ? `${note.chargeable_weight} kg chargeable` : '—'}
              {note.actual_weight || note.volumetric_weight
                ? ` (Actual ${note.actual_weight ?? '—'} kg · Volumetric ${note.volumetric_weight ?? '—'} kg)`
                : ''}
            </p>
          ) : null}
          {note.rate_per_kg ? (
            <p>
              <span className="font-semibold">Rate :</span> AED {money(note.rate_per_kg)} / kg
            </p>
          ) : null}
        </div>
      </div>

      <table className="mb-4 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className={`${cellBorder()} w-[40%] text-left font-semibold`}>DESCRIPTION</th>
            <th className={`${cellBorder()} text-center font-semibold`}>QUANTITY</th>
            <th className={`${cellBorder()} text-right font-semibold`}>UNIT PRICE</th>
            <th className={`${cellBorder()} text-center font-semibold`}>Tax</th>
            <th className={`${cellBorder()} text-right font-semibold`}>Amount AED</th>
          </tr>
        </thead>
        <tbody>
          {note.lines.map((line, i) => (
            <tr key={i}>
              <td className={cellBorder()}>
                {line.description || categoryLabel(line.category)}
                {line.weight_kg || line.rate_per_kg
                  ? ` · ${line.weight_kg || '—'} kg × AED ${money(line.rate_per_kg || 0)}/kg`
                  : ''}
              </td>
              <td className={`${cellBorder()} text-center`}>{line.weight_kg || 1}</td>
              <td className={`${cellBorder()} text-right`}>{money(line.rate_per_kg || line.amount)}</td>
              <td className={`${cellBorder()} text-center`}>{line.vat_rate}%</td>
              <td className={`${cellBorder()} text-right`}>{money(line.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mb-6 flex justify-end">
        <table className="w-72 border-collapse text-sm">
          <tbody>
            <tr>
              <td className={`${cellBorder()} text-right font-semibold`}>Subtotal</td>
              <td className={`${cellBorder()} text-right`}>{money(note.subtotal)}</td>
            </tr>
            <tr>
              <td className={`${cellBorder()} text-right font-semibold`}>{taxSummaryLabel}</td>
              <td className={`${cellBorder()} text-right`}>{money(note.vat_amount)}</td>
            </tr>
            <tr>
              <td className={`${cellBorder()} text-right font-bold`}>
                {isCredit ? 'TOTAL CREDIT AED' : 'TOTAL DEBIT AED'}
              </td>
              <td className={`${cellBorder()} text-right font-bold`}>{money(note.total_amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <span className="font-semibold">Reason :</span> {reasonLabel(note.reason_code)} — {note.reason}
        </p>
        <p>
          This {isCredit ? 'credit' : 'debit'} note {isCredit ? 'reduces' : 'increases'} tax invoice {note.invoice_no}
          {note.invoice_total ? ` (AED ${money(note.invoice_total)})` : ''} by AED {money(note.total_amount)}
          {note.vat_amount > 0 ? `, including VAT of AED ${money(note.vat_amount)}` : ''}.
        </p>
        {isCredit && (note.refund_amount || 0) > 0 && (
          <p>
            AED {money(note.refund_amount)} refunded via {refundModeLabel(note.refund_mode)}
            {note.refund_reference ? ` (ref. ${note.refund_reference})` : ''}.
          </p>
        )}
      </div>

      <div className="mt-auto pt-12">
        <div className="grid grid-cols-2 gap-10 text-xs">
          <p className="border-t border-black pt-1">Prepared by: {note.created_by_name || '—'}</p>
          <p className="border-t border-black pt-1">
            Approved by: {note.approved_by_name || '—'}
            {note.approved_at ? ` · ${fmtDate(note.approved_at)}` : ''}
          </p>
        </div>
        <p className="pt-6 text-center text-base font-bold">
          This is a computer generated document and does not require a signature
        </p>
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
    apiClient.getInvoiceUnified(invoiceId).then((result: any) => {
      if (!cancelled) setInvoice(result?.success ? result.data : null);
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
          filename: `${note.note_no}-${note.invoice_no}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
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
      `<!doctype html><html><head><base href="${window.location.origin}/"><title>${note.note_no}</title>${styles}</head><body>${ref.current.innerHTML}</body></html>`
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
            {note ? `${noteDocumentTitle(note)} against tax invoice ${note.invoice_no}` : ''}
          </DialogDescription>
        </DialogHeader>
        {note && (
          <div className="theme-light overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div ref={ref} className="theme-light">
              <InvoiceNoteDocument note={note} invoice={invoice} />
            </div>
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
