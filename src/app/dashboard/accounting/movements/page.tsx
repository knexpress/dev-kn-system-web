'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import InventoryTab from '@/components/accounting/inventory-tab';

export default function MovementsPage() {
  return (
    <AccountingSubpageShell
      title="Stock Movements"
      crumbs={[{ id: 'movements', label: 'Movements' }]}
    >
      <InventoryTab mode="movements" />
    </AccountingSubpageShell>
  );
}
