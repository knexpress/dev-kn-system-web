'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import BudgetsTab from '@/components/accounting/budgets-tab';

export default function BudgetsPage() {
  return (
    <AccountingSubpageShell
      title="Budgets"
      subtitle="Plan by account and track budget vs actual."
      crumbs={[{ id: 'budgets', label: 'Budgets' }]}
    >
      <BudgetsTab />
    </AccountingSubpageShell>
  );
}
