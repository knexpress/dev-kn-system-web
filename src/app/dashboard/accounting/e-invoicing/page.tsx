'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import EInvoicingTab from '@/components/accounting/e-invoicing-tab';

export default function EInvoicingPage() {
  return (
    <AccountingSubpageShell
      title="E-Invoicing"
      subtitle="UAE e-invoices from approved Sales, exchanged via your ASP."
      crumbs={[{ id: 'e-invoicing', label: 'E-Invoicing' }]}
    >
      <EInvoicingTab />
    </AccountingSubpageShell>
  );
}
