export const DEFAULT_INVOICE_DISCLAIMER =
  'This invoice is issued by Knex Delivery Services L.L.C. Amounts are in AED unless stated otherwise. Please notify us of any discrepancy within 7 days of the invoice date. This is a computer-generated document and does not require a signature.';

export type InvoicePrintOptions = {
  notes?: string;
  disclaimer?: string;
  include_notes?: boolean;
  include_disclaimer?: boolean;
};

export function invoicePrintOptionsFrom(record: any | null | undefined): Required<InvoicePrintOptions> {
  return {
    notes: String(record?.notes || ''),
    disclaimer: String(record?.disclaimer || '') || DEFAULT_INVOICE_DISCLAIMER,
    include_notes: record?.include_notes === true,
    include_disclaimer: record?.include_disclaimer === true,
  };
}

export function resolveInvoiceDisclaimer(disclaimer?: string) {
  const text = String(disclaimer || '').trim();
  return text || DEFAULT_INVOICE_DISCLAIMER;
}
