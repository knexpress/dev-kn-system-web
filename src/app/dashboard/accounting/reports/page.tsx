'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import FinancialReportsTab from '@/components/accounting/financial-reports-tab';

export default function ReportsPage() {
  return (
    <AccountingSubpageShell
      title="Financial Reports"
      crumbs={[{ id: 'reports', label: 'Reports' }]}
    >
      <FinancialReportsTab />
    </AccountingSubpageShell>
  );
}
