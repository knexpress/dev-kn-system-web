'use client';

import { DashboardPageShell } from '@/components/dashboard/maglo-shell';
import type { BreadcrumbItem } from './erp-format';

type AccountingSubpageShellProps = {
  title: string;
  subtitle?: string;
  crumbs?: BreadcrumbItem[];
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export function AccountingSubpageShell({
  title,
  subtitle,
  crumbs = [],
  children,
  actions,
}: AccountingSubpageShellProps) {
  const trail: BreadcrumbItem[] = [
    { id: 'hub', label: 'Accounting', href: '/dashboard/accounting' },
    ...crumbs,
  ];

  return (
    <DashboardPageShell
      title={title}
      subtitle={subtitle}
      actions={actions}
      backHref="/dashboard/accounting"
      backLabel="Back to Accounting"
      crumbs={trail}
    >
      {children}
    </DashboardPageShell>
  );
}
