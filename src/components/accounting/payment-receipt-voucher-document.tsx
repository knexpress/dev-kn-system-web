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
import { fmtDate, money } from './erp-format';
import { aedAmountInWords } from './petty-cash-voucher-document';

function cell() {
  return 'border border-gray-400 px-3 py-2 text-sm';
}

/** Normalize invoice + embedded payment into a receipt voucher payload. */
export function buildReceiptFromInvoicePayment(invoice: any, payment: any) {
  if (!invoice || !payment) return null;
  return {
    ...payment,
    invoice_id: invoice._id,
    invoice_no: invoice.invoice_no,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    customer_id: invoice.customer_id,
    customer_name: invoice.customer_name,
    customer_vat_trn: invoice.customer_vat_trn,
    invoice_total: invoice.total_amount,
    invoice_amount_paid: invoice.amount_paid,
    invoice_status: invoice.status,
  };
}

/** A4 customer payment receipt voucher (mirror of supplier payment voucher). */
export function PaymentReceiptVoucherDocument({ receipt }: { receipt: any }) {
  const voucherNo =
    receipt.receipt_no ||
    receipt.journal_entry_no ||
    `RCP-${String(receipt._id || '').slice(-6).toUpperCase() || '—'}`;
  const depositTo =
    receipt.bank_cash_account_name ||
    receipt.bank_cash_account_code ||
    receipt.receipt_account_name ||
    receipt.receipt_account_code ||
    '—';
  const arLabel = [
    receipt.ar_account_code || '1300',
    receipt.ar_account_name || 'Accounts Receivable',
  ]
    .filter(Boolean)
    .join(' — ');

  return (
    <div
      className="theme-light relative mx-auto max-w-[210mm] bg-white p-8 text-sm leading-snug text-black"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
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
        <h2 className="text-xl font-bold tracking-wide">PAYMENT RECEIPT VOUCHER</h2>
        <div className="text-right">
          <p>
            <span className="font-semibold">Receipt No :</span> {voucherNo}
          </p>
          <p>
            <span className="font-semibold">Date :</span> {fmtDate(receipt.payment_date)}
          </p>
          <p>
            <span className="font-semibold">Status :</span>{' '}
            {String(receipt.invoice_status || 'POSTED').replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-x-8 gap-y-2">
        <p>
          <span className="inline-block w-36 font-semibold">Received from :</span>
          {receipt.customer_name || '—'}
        </p>
        <p>
          <span className="inline-block w-36 font-semibold">Sales invoice :</span>
          {receipt.invoice_no || '—'}
        </p>
        {receipt.customer_vat_trn ? (
          <p>
            <span className="inline-block w-36 font-semibold">Customer TRN :</span>
            {receipt.customer_vat_trn}
          </p>
        ) : null}
        {(receipt.invoice_date || receipt.due_date) && (
          <p>
            <span className="inline-block w-36 font-semibold">Invoice / due :</span>
            {receipt.invoice_date ? fmtDate(receipt.invoice_date) : '—'}
            {receipt.due_date ? ` / ${fmtDate(receipt.due_date)}` : ''}
          </p>
        )}
        <p>
          <span className="inline-block w-36 font-semibold">Deposited to :</span>
          {depositTo}
        </p>
        {receipt.invoice_total != null ? (
          <p>
            <span className="inline-block w-36 font-semibold">Invoice total :</span>
            AED {money(receipt.invoice_total)}
          </p>
        ) : null}
      </div>

      <table className="mb-4 w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className={`${cell()} w-[50%] text-left font-semibold`}>PARTICULARS</th>
            <th className={`${cell()} text-left font-semibold`}>ACCOUNT</th>
            <th className={`${cell()} text-right font-semibold`}>AMOUNT AED</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${cell()} h-20 align-top`}>
              {receipt.notes ||
                `Payment received against invoice ${receipt.invoice_no || ''}`}
              <span className="mt-1 block text-xs text-gray-600">
                Dr Bank/Cash · Cr Accounts Receivable
              </span>
            </td>
            <td className={`${cell()} align-top`}>
              <div>{depositTo}</div>
              <div className="mt-1 text-xs text-gray-600">{arLabel}</div>
            </td>
            <td className={`${cell()} text-right align-top whitespace-nowrap`}>
              {money(receipt.amount)}
            </td>
          </tr>
          <tr>
            <td className={`${cell()} text-right font-bold`} colSpan={2}>
              TOTAL AED
            </td>
            <td className={`${cell()} text-right font-bold whitespace-nowrap`}>
              {money(receipt.amount)}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mb-6">
        <span className="font-semibold">Amount in words :</span>{' '}
        {aedAmountInWords(Number(receipt.amount || 0))}
      </p>

      {receipt.journal_entry_no ? (
        <p className="mb-6 text-xs text-gray-600">Journal entry: {receipt.journal_entry_no}</p>
      ) : null}

      <div className="grid grid-cols-3 gap-8 pt-14 text-xs">
        <p className="border-t border-black pt-1">
          Received by
          {receipt.recorded_by_name ? `: ${receipt.recorded_by_name}` : ''}
        </p>
        <p className="border-t border-black pt-1">Checked by</p>
        <p className="border-t border-black pt-1">Customer acknowledgement</p>
      </div>
    </div>
  );
}

type DialogProps = {
  receipt: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PaymentReceiptVoucherDialog({ receipt, open, onOpenChange }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const fileName =
    receipt?.receipt_no ||
    receipt?.journal_entry_no ||
    `Receipt-${receipt?.invoice_no || 'payment'}`;

  const download = async () => {
    if (!ref.current || !receipt) return;
    setDownloading(true);
    try {
      const mod = await import('html2pdf.js');
      const html2pdf = (mod as any).default || mod;
      await html2pdf()
        .set({
          margin: 0.3,
          filename: `${fileName}.pdf`,
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
    if (!ref.current || !receipt) return;
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
      `<!doctype html><html><head><base href="${window.location.origin}/"><title>${fileName}</title>${styles}</head><body>${ref.current.innerHTML}</body></html>`
    );
    doc.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{receipt?.receipt_no || 'Payment receipt voucher'}</DialogTitle>
          <DialogDescription>
            {receipt
              ? `Receipt from ${receipt.customer_name} — invoice ${receipt.invoice_no}, AED ${money(receipt.amount)}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        {receipt ? (
          <div className="theme-light overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div ref={ref} className="theme-light">
              <PaymentReceiptVoucherDocument receipt={receipt} />
            </div>
          </div>
        ) : null}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={print} disabled={!receipt}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => void download()}
            disabled={!receipt || downloading}
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
