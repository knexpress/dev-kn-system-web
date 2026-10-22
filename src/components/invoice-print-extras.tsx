'use client';

import { resolveInvoiceDisclaimer } from '@/lib/invoice-print-options';

export function InvoicePrintExtras({
  notes,
  disclaimer,
  includeNotes,
  includeDisclaimer,
}: {
  notes?: string;
  disclaimer?: string;
  includeNotes?: boolean;
  includeDisclaimer?: boolean;
}) {
  const notesText = String(notes || '').trim();
  const showNotes = includeNotes === true && Boolean(notesText);
  const showDisclaimer = includeDisclaimer === true;
  if (!showNotes && !showDisclaimer) return null;

  return (
    <div className="mt-6 space-y-4 text-sm">
      {showNotes ? (
        <div>
          <p className="mb-1 font-semibold">NOTES:</p>
          <p className="whitespace-pre-line">{notesText}</p>
        </div>
      ) : null}
      {showDisclaimer ? (
        <div className="border border-red-200 bg-red-50 px-3 py-2">
          <p className="mb-1 font-semibold tracking-wide text-red-700">DISCLAIMER</p>
          <p className="whitespace-pre-line text-red-700">{resolveInvoiceDisclaimer(disclaimer)}</p>
        </div>
      ) : null}
    </div>
  );
}
