'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import FixedAssetsTab from '@/components/accounting/fixed-assets-tab';

export default function FixedAssetsPage() {
  return (
    <AccountingSubpageShell
      title="Fixed Assets"
      subtitle="Register, depreciate, and dispose capital assets."
      crumbs={[{ id: 'fixed-assets', label: 'Fixed Assets' }]}
    >
      <FixedAssetsTab />
    </AccountingSubpageShell>
  );
}
