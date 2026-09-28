'use client';

import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ACCOUNTING_MODULES } from '@/components/accounting/erp-shell';
import { ACCOUNTING_ROUTES } from '@/components/accounting/erp-format';
import { MagloHero, MagloModuleTile } from '@/components/dashboard/maglo-shell';

const ALLOWED_DEPARTMENTS = new Set(['Finance', 'Management', 'Auditor', 'IT']);

export default function AccountingHubPage() {
  const { userProfile } = useAuth();
  const departmentName = userProfile?.department?.name;

  if (departmentName && !ALLOWED_DEPARTMENTS.has(departmentName)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Accounting is available to Finance, Management, Auditor, and IT users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <MagloHero
        eyebrow="Finance workspace"
        title="Accounting"
        subtitle="Choose a module to open. Each area has its own page for charts, journals, stock, and reports."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {ACCOUNTING_MODULES.map((m) => {
          const route = ACCOUNTING_ROUTES[m.id];
          return (
            <MagloModuleTile
              key={m.id}
              href={route.href}
              title={route.title}
              description={route.subtitle}
              icon={m.icon}
            />
          );
        })}
      </div>
    </div>
  );
}
