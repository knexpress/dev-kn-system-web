'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import InventoryTab from '@/components/accounting/inventory-tab';

export default function InventoryPage() {
  return (
    <AccountingSubpageShell
      title="Inventory"
      crumbs={[{ id: 'inventory', label: 'Inventory' }]}
    >
      <InventoryTab mode="items" />
    </AccountingSubpageShell>
  );
}
