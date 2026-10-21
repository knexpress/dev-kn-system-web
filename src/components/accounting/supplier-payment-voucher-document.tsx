'use client';

import { useRef, useState } from 'react';
import { Check, Download, Loader2, Printer } from 'lucide-react';
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

/** A4 supplier / purchase payment voucher. */
export function SupplierPaymentVoucherDocument({
  payment,
  purchaseOrder,
}: {
  payment: any;
  purchaseOrder?: any | null;
}) {
  const po = purchaseOrder || null;
  const invoiceNo =
    payment.supplier_reference || po?.supplier_invoice_no || po?.po_no || '—';
  const isRejected = payment.status === 'REJECTED' || payment.status === 'CANCELLED';
  const isReversed = payment.status === 'REVERSED';

  return (
    <div className="relative mx-auto max-w-[210mm] bg-white p-8 text-sm leading-snug text-black">
      {isRejected || isReversed ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-20deg] text-7xl font-black tracking-widest text-red-500/25">
            {isReversed ? 'REVERSED' : 'VOID'}
          </span>
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
        <h2 className="text-xl font-bold tracking-wide">PAYMENT VOUCHER</h2>
        <div className="text-right">
          <p>
            <span className="font-semibold">Voucher No :</span> {payment.payment_no}
          </p>
          <p>
            <span className="font-semibold">Date :</span> {fmtDate(payment.payment_date)}
          </p>
          <p>
            <span className="font-semibold">Status :</span>{' '}
            {String(payment.status || '').replace(/_/g, ' ') || '—'}
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-x-8 gap-y-2">
        <p>
          <span className="inline-block w-36 font-semibold">Paid to :</span>
          {payment.supplier_name}
        </p>
        <p>
          <span className="inline-block w-36 font-semibold">Supplier invoice :</span>
          {invoiceNo}
        </p>
        {(payment.purchase_order_no || po?.po_no) && (
          <p>
            <span className="inline-block w-36 font-semibold">Purchase order :</span>
            {payment.purchase_order_no || po?.po_no}
          </p>
        )}
        {(po?.supplier_invoice_date || po?.due_date) && (
          <p>
            <span className="inline-block w-36 font-semibold">Invoice / due :</span>
            {po?.supplier_invoice_date ? fmtDate(po.supplier_invoice_date) : '—'}
            {po?.due_date ? ` / ${fmtDate(po.due_date)}` : ''}
          </p>
        )}
        <p>
          <span className="inline-block w-36 font-semibold">Paid from :</span>
          {payment.bank_cash_account_name || payment.bank_cash_account_code || '—'}
        </p>
        {(po?.supplier_iban || po?.supplier_bank_name) && (
          <p>
            <span className="inline-block w-36 font-semibold">Supplier bank :</span>
            {[po?.supplier_bank_name, po?.supplier_iban].filter(Boolean).join(' · ')}
          </p>
        )}
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
              {payment.description ||
                (payment.purchase_order_no
                  ? `Payment for ${payment.purchase_order_no}`
                  : `Payment to ${payment.supplier_name}`)}
              {po?.supplier_invoice_no ? (
                <span className="mt-1 block text-xs text-gray-600">
                  Inv. {po.supplier_invoice_no}
                </span>
              ) : null}
            </td>
            <td className={`${cell()} align-top`}>
              {payment.debit_account_code || '21010'}
              {payment.debit_account_name ? ` — ${payment.debit_account_name}` : ' — Accounts Payable'}
            </td>
            <td className={`${cell()} text-right align-top`}>{money(payment.amount)}</td>
          </tr>
          <tr>
            <td className={`${cell()} text-right font-bold`} colSpan={2}>
              TOTAL AED
            </td>
            <td className={`${cell()} text-right font-bold`}>{money(payment.amount)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mb-6">
        <span className="font-semibold">Amount in words :</span> {aedAmountInWords(payment.amount)}
      </p>

      {payment.journal_entry_no ? (
        <p className="mb-6 text-xs text-gray-600">Journal entry: {payment.journal_entry_no}</p>
      ) : null}

      <div className="grid grid-cols-3 gap-8 pt-14 text-xs">
        <p className="border-t border-black pt-1">
          Prepared by
          {payment.requested_by_name ? `: ${payment.requested_by_name}` : ''}
        </p>
        <p className="border-t border-black pt-1">
          Approved by
          {payment.approved_by_name ? `: ${payment.approved_by_name}` : ''}
        </p>
        <p className="border-t border-black pt-1">Received by (signature)</p>
      </div>
    </div>
  );
}

type DialogProps = {
  payment: any | null;
  purchaseOrder?: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Finance Manager: clear / approve this draft payment from the voucher dialog */
  canApprove?: boolean;
  onApprove?: (payment: any) => Promise<void> | void;
};

export function SupplierPaymentVoucherDialog({
  payment,
  purchaseOrder,
  open,
  onOpenChange,
  canApprove = false,
  onApprove,
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [approving, setApproving] = useState(false);
  const pending = String(payment?.status || '').toUpperCase() === 'PENDING_APPROVAL';

  const download = async () => {
    if (!ref.current || !payment) return;
    setDownloading(true);
    try {
      const mod = await import('html2pdf.js');
      const html2pdf = (mod as any).default || mod;
      await html2pdf()
        .set({
          margin: 0.3,
          filename: `${payment.payment_no}.pdf`,
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
    if (!ref.current || !payment) return;
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
      `<!doctype html><html><head><base href="${window.location.origin}/"><title>${payment.payment_no}</title>${styles}</head><body>${ref.current.innerHTML}</body></html>`
    );
    doc.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{payment?.payment_no || 'Payment voucher'}</DialogTitle>
          <DialogDescription>
            {payment
              ? `Supplier payment voucher — ${payment.supplier_name}, AED ${money(payment.amount)}`
              : ''}
          </DialogDescription>
        </DialogHeader>
        {payment && (
          <div className="theme-light overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div ref={ref} className="theme-light">
              <SupplierPaymentVoucherDocument payment={payment} purchaseOrder={purchaseOrder} />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex flex-wrap gap-2">
            {canApprove && pending && onApprove ? (
              <Button
                type="button"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                disabled={approving}
                onClick={async () => {
                  if (!payment) return;
                  setApproving(true);
                  try {
                    await onApprove(payment);
                  } finally {
                    setApproving(false);
                  }
                }}
              >
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Clear / approve
              </Button>
            ) : null}
            <Button type="button" variant="outline" className="rounded-xl" onClick={print} disabled={!payment}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => void download()}
              disabled={!payment || downloading}
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
