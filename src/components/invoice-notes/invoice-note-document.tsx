'use client';

import { useRef, useState } from 'react';
import { Download, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InvoiceNote } from '@/lib/api-client';
import { fmtDate, money } from '@/components/accounting/erp-format';
import { NoteStatusPill, categoryLabel, reasonLabel, refundModeLabel } from './invoice-note-shared';

export function noteDocumentTitle(note: Pick<InvoiceNote, 'note_type' | 'vat_amount'>) {
  if (note.note_type === 'CREDIT') return note.vat_amount > 0 ? 'TAX CREDIT NOTE' : 'CREDIT NOTE';
  return note.vat_amount > 0 ? 'TAX DEBIT NOTE' : 'DEBIT NOTE';
}

/** A4 credit / debit note, styled like the tax invoice it adjusts. */
export function InvoiceNoteDocument({ note }: { note: InvoiceNote }) {
  const isCredit = note.note_type === 'CREDIT';
  return (
    <div className="mx-auto max-w-[210mm] bg-white p-8 text-sm leading-snug text-black">
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

  const download = async () => {
    if (!ref.current || !note) return;
    setDownloading(true);
    try {
      const mod = await import('html2pdf.js');
      const html2pdf = (mod as any).default || mod;
      await html2pdf()
        .set({
          margin: 0.3,
          filename: `${note.note_no}.pdf`,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            {note?.note_no || 'Note'}
            {note && <NoteStatusPill status={note.status} />}
          </DialogTitle>
          <DialogDescription>
            {note ? `${noteDocumentTitle(note)} against invoice ${note.invoice_no}` : ''}
          </DialogDescription>
        </DialogHeader>
        {note && (
          <div className="theme-light overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div ref={ref} className="theme-light">
              <InvoiceNoteDocument note={note} />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
