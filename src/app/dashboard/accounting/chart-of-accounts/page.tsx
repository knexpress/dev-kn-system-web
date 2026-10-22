'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import ChartOfAccountsTab from '@/components/accounting/chart-of-accounts-tab';

export default function ChartOfAccountsPage() {
  return (
    <AccountingSubpageShell
      title="Chart of Accounts"
      crumbs={[{ id: 'coa', label: 'Chart of Accounts' }]}
    >
      <ChartOfAccountsTab />
    </AccountingSubpageShell>
  );
}
