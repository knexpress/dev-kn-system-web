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
  | 'bank-cash'
  | 'purchase-orders'
  | 'petty-cash'
  | 'budgets'
  | 'fixed-assets'
  | 'sales'
  | 'vat201'
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
  'bank-cash': {
    href: '/dashboard/accounting/bank-cash',
    title: 'Bank & Cash',
    subtitle: 'Liquidity, supplier payments, approvals',
  },
  'purchase-orders': {
    href: '/dashboard/accounting/purchase-orders',
    title: 'Purchase Orders',
    subtitle: 'Order, receive, and pay suppliers',
  },
  'petty-cash': {
    href: '/dashboard/accounting/petty-cash',
    title: 'Petty Cash',
    subtitle: 'Float, vouchers, and replenishment',
  },
  budgets: {
    href: '/dashboard/accounting/budgets',
    title: 'Budgets',
    subtitle: 'Plan vs actual by account',
  },
  'fixed-assets': {
    href: '/dashboard/accounting/fixed-assets',
    title: 'Fixed Assets',
    subtitle: 'Register, depreciate, dispose',
  },
  sales: {
    href: '/dashboard/accounting/sales',
    title: 'Sales',
    subtitle: 'Invoices, AR journals, VAT traders',
  },
  vat201: {
    href: '/dashboard/accounting/vat201',
    title: 'VAT201',
    subtitle: 'UAE VAT return · Sales + POs',
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
