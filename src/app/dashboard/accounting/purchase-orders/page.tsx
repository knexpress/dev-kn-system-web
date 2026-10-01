'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import PurchaseOrdersTab from '@/components/accounting/purchase-orders-tab';

export default function PurchaseOrdersPage() {
  return (
    <AccountingSubpageShell
      title="Purchases"
      subtitle="Enter supplier invoices and POs, approve them, and manage suppliers."
      crumbs={[{ id: 'purchase-orders', label: 'Purchases' }]}
    >
      <PurchaseOrdersTab />
    </AccountingSubpageShell>
  );
}
