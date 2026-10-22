'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import PeriodsTab from '@/components/accounting/periods-tab';

export default function PeriodsPage() {
  return (
    <AccountingSubpageShell
      title="Period Lock"
      subtitle="Lock closed months. Edits in a locked period post as adjustments in the next open month."
      crumbs={[{ id: 'periods', label: 'Period Lock' }]}
    >
      <PeriodsTab />
    </AccountingSubpageShell>
  );
}
