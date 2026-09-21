'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import GeneralLedgerTab from '@/components/accounting/general-ledger-tab';

export default function JournalsPage() {
  return (
    <AccountingSubpageShell
      title="Journal Entries"
      crumbs={[{ id: 'journals', label: 'Journals' }]}
    >
      <GeneralLedgerTab mode="journals" />
    </AccountingSubpageShell>
  );
}
