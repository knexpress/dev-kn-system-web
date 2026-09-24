'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import PettyCashTab from '@/components/accounting/petty-cash-tab';

export default function PettyCashPage() {
  return (
    <AccountingSubpageShell
      title="Petty Cash"
      subtitle="Fund the float, post vouchers, and replenish."
      crumbs={[{ id: 'petty-cash', label: 'Petty Cash' }]}
    >
      <PettyCashTab />
    </AccountingSubpageShell>
  );
}
