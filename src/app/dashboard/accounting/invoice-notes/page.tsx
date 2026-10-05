'use client';

import { Suspense } from 'react';
import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import InvoiceNotesTab from '@/components/accounting/invoice-notes-tab';

export default function InvoiceNotesPage() {
  return (
    <AccountingSubpageShell
      title="Credit & Debit Notes"
      subtitle="Adjustments to finance invoices, approved by the Finance Manager."
      crumbs={[{ id: 'invoice-notes', label: 'Credit & Debit Notes' }]}
    >
      <Suspense fallback={null}>
        <InvoiceNotesTab />
      </Suspense>
    </AccountingSubpageShell>
  );
}
