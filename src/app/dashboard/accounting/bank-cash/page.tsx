'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import BankCashTab from '@/components/accounting/bank-cash-tab';

export default function BankCashPage() {
  return (
    <AccountingSubpageShell
      title="Bank & Cash"
      subtitle="Overview of bank and cash, pay suppliers, and approve payments."
      crumbs={[{ id: 'bank-cash', label: 'Bank & Cash' }]}
    >
      <BankCashTab />
    </AccountingSubpageShell>
  );
}
