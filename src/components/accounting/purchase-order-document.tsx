'use client';

import { fmtDate, money } from './erp-format';
import { aedAmountInWords } from './petty-cash-voucher-document';
import { PrintDocumentDialog } from './print-document-dialog';

function cell() {
  return 'border border-gray-400 px-3 py-2 text-sm';
}

export function PurchaseOrderDocument({ order }: { order: any }) {
  const status = String(order?.status || '').replace(/_/g, ' ');
  const showDraft = ['DRAFT', 'PENDING_APPROVAL'].includes(String(order?.status || '').toUpperCase());
  const hasInvoice = Boolean(order?.supplier_invoice_no);
  const title = hasInvoice ? 'INVOICE VOUCHER' : 'PURCHASE ORDER';
  const particulars = hasInvoice
    ? `Lump-sum purchase as per supplier invoice ${order.supplier_invoice_no}${
        order.po_no ? ` · ${order.po_no}` : ''
      }`
    : `Lump-sum purchase order ${order.po_no || ''}`;
  const tax = Number(order?.tax_amount || 0);
  const subtotal = Number(order?.subtotal || 0);
  const total = Number(order?.total_amount || 0);

  return (
    <div className="relative mx-auto max-w-[210mm] bg-white p-8 text-sm leading-snug text-black">
      {showDraft ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-20deg] text-7xl font-black tracking-widest text-amber-500/25">DRAFT</span>
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
        <h2 className="text-xl font-bold tracking-wide">{title}</h2>
        <div className="text-right">
          <p>
            <span className="font-semibold">{hasInvoice ? 'Voucher / PO :' : 'PO No :'}</span> {order.po_no}
          </p>
          <p>
            <span className="font-semibold">Date :</span>{' '}
            {fmtDate(order.supplier_invoice_date || order.po_date)}
          </p>
          <p>
            <span className="font-semibold">Status :</span> {status || '—'}
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-x-8 gap-y-2">
        <p>
          <span className="inline-block w-36 font-semibold">Supplier :</span>
          {order.supplier_name}
        </p>
        {order.supplier_trn ? (
          <p>
            <span className="inline-block w-36 font-semibold">Supplier TRN :</span>
            {order.supplier_trn}
          </p>
        ) : null}
        {hasInvoice ? (
          <p>
            <span className="inline-block w-36 font-semibold">Supplier invoice :</span>
            {order.supplier_invoice_no}
          </p>
        ) : null}
        {order.due_date ? (
          <p>
            <span className="inline-block w-36 font-semibold">Due date :</span>
            {fmtDate(order.due_date)}
          </p>
        ) : null}
      </div>

      <table className="mb-4 w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className={`${cell()} w-[70%] text-left font-semibold`}>PARTICULARS</th>
            <th className={`${cell()} text-right font-semibold`}>AMOUNT AED</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${cell()} h-16 align-top`}>{particulars}</td>
            <td className={`${cell()} text-right align-top tabular-nums`}>
              {money(tax > 0 ? subtotal : total)}
            </td>
          </tr>
          {tax > 0 ? (
            <tr>
              <td className={cell()}>VAT</td>
              <td className={`${cell()} text-right tabular-nums`}>{money(tax)}</td>
            </tr>
          ) : null}
          <tr>
            <td className={`${cell()} text-right font-bold`}>TOTAL AED</td>
            <td className={`${cell()} text-right font-bold tabular-nums`}>{money(total)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mb-4">
        <span className="font-semibold">Amount in words :</span> {aedAmountInWords(total)}
      </p>

      {Number(order.amount_paid) > 0 ? (
        <p className="mb-4 text-xs text-gray-600">Paid to date: AED {money(order.amount_paid)}</p>
      ) : null}

      {order.notes ? <p className="mt-4 text-xs">Notes: {order.notes}</p> : null}
    </div>
  );
}

export function PurchaseOrderDocumentDialog({
  order,
  open,
  onOpenChange,
  onDocumentsChange,
}: {
  order: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentsChange?: (id: string, docs: any[]) => void;
}) {
  if (!order) return null;
  return (
    <PrintDocumentDialog
      open={open}
      onOpenChange={onOpenChange}
      title={order.po_no || 'Purchase order'}
      description={`${order.supplier_name} · AED ${money(order.total_amount)} · ${String(order.status || '').replace(/_/g, ' ')}`}
      fileName={order.po_no || 'purchase-order'}
      attachmentKind="purchase-order"
      attachmentId={String(order._id)}
      documents={order.supporting_documents}
      onDocumentsChange={(docs) => onDocumentsChange?.(String(order._id), docs)}
    >
      <PurchaseOrderDocument order={order} />
    </PrintDocumentDialog>
  );
}
