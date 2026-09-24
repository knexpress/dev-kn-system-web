'use client';

import { AccountingSubpageShell } from '@/components/accounting/accounting-subpage-shell';
import PurchaseOrdersTab from '@/components/accounting/purchase-orders-tab';

export default function PurchaseOrdersPage() {
  return (
    <AccountingSubpageShell
      title="Purchase Orders"
      subtitle="Create, approve, receive, and pay purchase orders."
      crumbs={[{ id: 'purchase-orders', label: 'Purchase Orders' }]}
    >
      <PurchaseOrdersTab />
    </AccountingSubpageShell>
  );
}
