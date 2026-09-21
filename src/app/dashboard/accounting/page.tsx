'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, ArrowUpRight } from 'lucide-react';
import { ACCOUNTING_MODULES } from '@/components/accounting/erp-shell';
import { ACCOUNTING_ROUTES } from '@/components/accounting/erp-format';
import { cn } from '@/lib/utils';

const ALLOWED_DEPARTMENTS = new Set(['Finance', 'Management', 'Auditor', 'IT']);

const WIDGET_ACCENTS = [
  'from-sky-500 to-blue-600',
  'from-cyan-500 to-teal-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-slate-600 to-slate-800',
];

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
    <div className="-mx-2 flex flex-col gap-6 sm:-mx-1">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white via-sky-50/50 to-slate-50 px-6 py-7 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-sky-600/80 uppercase">
            Finance workspace
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Accounting</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Choose a module to open. Each area has its own page for charts, journals, stock, and
            reports.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ACCOUNTING_MODULES.map((m, idx) => {
          const Icon = m.icon;
          const route = ACCOUNTING_ROUTES[m.id];
          const accent = WIDGET_ACCENTS[idx % WIDGET_ACCENTS.length];
          return (
            <Link
              key={m.id}
              href={route.href}
              className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.45)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg',
                    accent
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-sky-50 group-hover:text-sky-600">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
                {route.title}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">{route.subtitle}</p>
              <p className="mt-4 text-xs font-medium text-sky-600 opacity-0 transition-opacity group-hover:opacity-100">
                Open module →
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
