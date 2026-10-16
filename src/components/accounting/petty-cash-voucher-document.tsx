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

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function wordsBelowThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

function integerToWords(n: number): string {
  if (n === 0) return 'Zero';
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  const parts: string[] = [];
  let scale = 0;
  while (n > 0 && scale < scales.length) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(`${wordsBelowThousand(chunk)}${scales[scale] ? ` ${scales[scale]}` : ''}`);
    n = Math.floor(n / 1000);
    scale += 1;
  }
  return parts.join(' ');
}

export function aedAmountInWords(amount: number): string {
  const fils = Math.round((Number(amount) || 0) * 100);
  const dirhams = Math.floor(fils / 100);
  const rest = fils % 100;
  return `UAE Dirhams ${integerToWords(dirhams)}${rest ? ` and ${integerToWords(rest)} Fils` : ''} Only`;
}

function cell() {
  return 'border border-gray-400 px-3 py-2 text-sm';
}

/** A4 half-page petty cash payment voucher. */
export function PettyCashVoucherDocument({ voucher }: { voucher: any }) {
  const isVoid = voucher.status === 'VOID';
  return (
    <div className="relative mx-auto max-w-[210mm] bg-white p-8 text-sm leading-snug text-black">
      {isVoid ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-20deg] text-7xl font-black tracking-widest text-red-500/25">VOID</span>
        </div>
      ) : null}

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

      <div className="mb-5 flex items-end justify-between gap-4 border-b-2 border-black pb-2">
        <h2 className="text-xl font-bold tracking-wide">PETTY CASH VOUCHER</h2>
        <div className="text-right">
          <p>
            <span className="font-semibold">Voucher No :</span> {voucher.voucher_no}
          </p>
          <p>
            <span className="font-semibold">Date :</span> {fmtDate(voucher.voucher_date)}
          </p>
        </div>
      </div>

      <div className="mb-5 space-y-2">
        <p>
          <span className="inline-block w-36 font-semibold">Paid to :</span>
          {voucher.payee}
        </p>
        {voucher.category ? (
          <p>
            <span className="inline-block w-36 font-semibold">Category :</span>
            {voucher.category}
          </p>
        ) : null}
        <p>
          <span className="inline-block w-36 font-semibold">Paid from :</span>
          Petty cash ({voucher.petty_cash_account_code || 'CASH-MAIN'})
        </p>
      </div>

      <table className="mb-4 w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className={`${cell()} w-[55%] text-left font-semibold`}>PARTICULARS</th>
            <th className={`${cell()} text-left font-semibold`}>ACCOUNT</th>
            <th className={`${cell()} text-right font-semibold`}>AMOUNT AED</th>
          </tr>
        </thead>
        <tbody>
          {(Array.isArray(voucher.lines) && voucher.lines.length
            ? voucher.lines
            : [
                {
                  description: voucher.description || voucher.category || '—',
                  account_code: voucher.expense_account_code,
                  account_name: voucher.expense_account_name,
                  amount: voucher.amount,
                },
              ]
          ).map((line: any, idx: number) => (
            <tr key={`v-line-${idx}`}>
              <td className={`${cell()} align-top`}>{line.description || voucher.category || '—'}</td>
              <td className={`${cell()} align-top`}>
                {line.account_code}
                {line.account_name ? ` — ${line.account_name}` : ''}
              </td>
              <td className={`${cell()} text-right align-top`}>{money(line.amount)}</td>
            </tr>
          ))}
          <tr>
            <td className={`${cell()} text-right font-bold`} colSpan={2}>
              TOTAL AED
            </td>
            <td className={`${cell()} text-right font-bold`}>{money(voucher.amount)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mb-6">
        <span className="font-semibold">Amount in words :</span> {aedAmountInWords(voucher.amount)}
      </p>

      {voucher.journal_entry_no ? (
        <p className="mb-6 text-xs text-gray-600">Journal entry: {voucher.journal_entry_no}</p>
      ) : null}

      <div className="grid grid-cols-3 gap-8 pt-14 text-xs">
        <p className="border-t border-black pt-1">
          Prepared by{voucher.created_by_name ? `: ${voucher.created_by_name}` : ''}
        </p>
        <p className="border-t border-black pt-1">Approved by</p>
        <p className="border-t border-black pt-1">Received by (signature)</p>
      </div>
    </div>
  );
}

type DialogProps = {
  voucher: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PettyCashVoucherDialog({ voucher, open, onOpenChange }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (!ref.current || !voucher) return;
    setDownloading(true);
    try {
      const mod = await import('html2pdf.js');
      const html2pdf = (mod as any).default || mod;
      await html2pdf()
        .set({
          margin: 0.3,
          filename: `${voucher.voucher_no}.pdf`,
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
    if (!ref.current || !voucher) return;
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
      `<!doctype html><html><head><base href="${window.location.origin}/"><title>${voucher.voucher_no}</title>${styles}</head><body>${ref.current.innerHTML}</body></html>`
    );
    doc.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{voucher?.voucher_no || 'Voucher'}</DialogTitle>
          <DialogDescription>
            {voucher ? `Petty cash voucher — ${voucher.payee}, AED ${money(voucher.amount)}` : ''}
          </DialogDescription>
        </DialogHeader>
        {voucher && (
          <div className="theme-light overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div ref={ref} className="theme-light">
              <PettyCashVoucherDocument voucher={voucher} />
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={print} disabled={!voucher}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button type="button" className="rounded-xl" onClick={() => void download()} disabled={!voucher || downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
