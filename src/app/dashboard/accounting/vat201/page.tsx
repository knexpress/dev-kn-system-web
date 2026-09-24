'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import Vat201Tab from '@/components/accounting/vat201-tab';

export default function Vat201Page() {
  return (
    <AccountingSubpageShell
      title="VAT201"
      subtitle="UAE VAT return from Sales, Purchases, and GL."
      crumbs={[{ id: 'vat201', label: 'VAT201' }]}
    >
      <Vat201Tab />
    </AccountingSubpageShell>
  );
}
