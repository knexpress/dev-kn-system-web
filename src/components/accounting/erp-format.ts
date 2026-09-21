export function money(n: number | string | null | undefined) {
  return Number(n || 0).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtDate(d?: string | Date | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toISOString().slice(0, 10);
}

export function fmtDateTime(d?: string | Date | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type AccountingModule =
  | 'coa'
  | 'journals'
  | 'ledger'
  | 'inventory'
  | 'movements'
  | 'reports';

export type BreadcrumbItem = {
  id: string;
  label: string;
  href?: string;
};

export const ACCOUNTING_ROUTES: Record<
  AccountingModule,
  { href: string; title: string; subtitle: string }
> = {
  coa: {
    href: '/dashboard/accounting/chart-of-accounts',
    title: 'Chart of Accounts',
    subtitle: 'Master ledger accounts',
  },
  journals: {
    href: '/dashboard/accounting/journals',
    title: 'Journal Entries',
    subtitle: 'Posted double-entry journals',
  },
  ledger: {
    href: '/dashboard/accounting/ledger',
    title: 'Account Ledger',
    subtitle: 'Running balance by account',
  },
  inventory: {
    href: '/dashboard/accounting/inventory',
    title: 'Inventory',
    subtitle: 'Products and SKU stock',
  },
  movements: {
    href: '/dashboard/accounting/movements',
    title: 'Stock Movements',
    subtitle: 'Receipts, issues, adjustments',
  },
  reports: {
    href: '/dashboard/accounting/reports',
    title: 'Financial Reports',
    subtitle: 'Trial balance, P&L, balance sheet',
  },
};

export function ledgerHref(accountCode?: string, from?: string) {
  const params = new URLSearchParams();
  if (accountCode) params.set('account', accountCode);
  if (from) params.set('from', from);
  const q = params.toString();
  return `/dashboard/accounting/ledger${q ? `?${q}` : ''}`;
}
