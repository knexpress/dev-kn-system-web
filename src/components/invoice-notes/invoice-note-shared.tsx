'use client';

import type {
  InvoiceNoteCategory,
  InvoiceNoteReason,
  InvoiceNoteStatus,
  InvoiceNoteType,
  InvoicePaymentMode,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

export const NOTE_REASONS: { value: InvoiceNoteReason; label: string; types: InvoiceNoteType[] }[] = [
  { value: 'PRICING_ERROR', label: 'Pricing error', types: ['CREDIT', 'DEBIT'] },
  { value: 'WEIGHT_CORRECTION', label: 'Weight correction', types: ['CREDIT', 'DEBIT'] },
  { value: 'SERVICE_CANCELLED', label: 'Service cancelled / not delivered', types: ['CREDIT'] },
  { value: 'DISCOUNT', label: 'Discount after invoicing', types: ['CREDIT'] },
  { value: 'DAMAGE_OR_LOSS', label: 'Damage or loss compensation', types: ['CREDIT'] },
  { value: 'ADDITIONAL_SERVICE', label: 'Additional service / charge', types: ['DEBIT'] },
  { value: 'OTHER', label: 'Other', types: ['CREDIT', 'DEBIT'] },
];

export const NOTE_CATEGORIES: { value: InvoiceNoteCategory; label: string }[] = [
  { value: 'SHIPPING', label: 'Shipping charge' },
  { value: 'PICKUP', label: 'Pickup charge' },
  { value: 'DELIVERY', label: 'Delivery fee' },
  { value: 'INSURANCE', label: 'Insurance' },
];

export const REFUND_MODES: { value: InvoicePaymentMode; label: string; account: string }[] = [
  { value: 'CASH', label: 'Cash', account: 'Cash on Hand' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer', account: 'Cash at Bank' },
  { value: 'CARD', label: 'Card reversal', account: 'Card Payments Clearing' },
  { value: 'TABBY', label: 'Tabby refund', account: 'Tabby clearing' },
];

export const reasonLabel = (code?: string) => NOTE_REASONS.find((r) => r.value === code)?.label || code || '—';
export const categoryLabel = (code?: string) => NOTE_CATEGORIES.find((c) => c.value === code)?.label || code || '—';
export const refundModeLabel = (code?: string) => REFUND_MODES.find((m) => m.value === code)?.label || code || '—';

export const NOTE_STATUS_LABEL: Record<InvoiceNoteStatus, string> = {
  PENDING_APPROVAL: 'Awaiting approval',
  POSTED: 'Posted',
  REJECTED: 'Rejected',
  VOID: 'Void',
};

function statusTone(status: string) {
  switch (status) {
    case 'PENDING_APPROVAL':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'POSTED':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-slate-200';
  }
}

export function NoteStatusPill({ status }: { status: InvoiceNoteStatus }) {
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', statusTone(status))}>
      {NOTE_STATUS_LABEL[status] || status}
    </span>
  );
}

export function NoteTypePill({ type }: { type: InvoiceNoteType }) {
  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 text-[10px] font-bold',
        type === 'CREDIT' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'
      )}
    >
      {type === 'CREDIT' ? 'CREDIT' : 'DEBIT'}
    </span>
  );
}

/** Credit notes reduce what the customer owes; shown negative in lists. */
export const signedNoteAmount = (type: InvoiceNoteType, amount: number) => (type === 'CREDIT' ? -amount : amount);
