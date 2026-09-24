'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import SalesTab from '@/components/accounting/sales-tab';

export default function SalesPage() {
  return (
    <AccountingSubpageShell
      title="Sales"
      subtitle="Invoices, finance approval journals, receipts, and VAT traders."
      crumbs={[{ id: 'sales', label: 'Sales' }]}
    >
      <SalesTab />
    </AccountingSubpageShell>
  );
}
