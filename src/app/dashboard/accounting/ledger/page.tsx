'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import GeneralLedgerTab from '@/components/accounting/general-ledger-tab';

function LedgerContent() {
  const searchParams = useSearchParams();
  const account = searchParams.get('account');
  const from = searchParams.get('from');

  const crumbs = [
    ...(from
      ? [
          {
            id: 'from',
            label: from === 'coa' ? 'Chart of Accounts' : from,
            href:
              from === 'coa'
                ? '/dashboard/accounting/chart-of-accounts'
                : from.toLowerCase().includes('trial') ||
                    from.toLowerCase().includes('profit') ||
                    from.toLowerCase().includes('balance')
                  ? '/dashboard/accounting/reports'
                  : undefined,
          },
        ]
      : []),
    {
      id: 'ledger',
      label: account ? `Ledger · ${account}` : 'Account Ledger',
    },
  ];

  return (
    <AccountingSubpageShell
      title="Account Ledger"
      crumbs={crumbs}
    >
      <GeneralLedgerTab mode="ledger" selectedAccountCode={account} />
    </AccountingSubpageShell>
  );
}

export default function LedgerPage() {
  return (
    <Suspense
      fallback={
        <AccountingSubpageShell title="Account Ledger">
          <div className="p-8 text-sm text-slate-500">Loading ledger…</div>
        </AccountingSubpageShell>
      }
    >
      <LedgerContent />
    </Suspense>
  );
}
