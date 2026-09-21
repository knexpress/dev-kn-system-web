'use client';

import type { ReactNode } from 'react';
import {
  BookOpen,
  Boxes,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Layers,
  Package,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AccountingModule, BreadcrumbItem } from './erp-format';

export const ACCOUNTING_MODULES: {
  id: AccountingModule;
  label: string;
  short: string;
  hint: string;
  icon: typeof BookOpen;
}[] = [
  { id: 'coa', label: 'Chart of Accounts', short: 'CoA', hint: 'Master ledger', icon: Layers },
  { id: 'journals', label: 'Journals', short: 'Journals', hint: 'Entries & posts', icon: FileText },
  { id: 'ledger', label: 'Ledger', short: 'Ledger', hint: 'Account activity', icon: BookOpen },
  { id: 'inventory', label: 'Inventory', short: 'Inventory', hint: 'SKU master', icon: Package },
  { id: 'movements', label: 'Movements', short: 'Movements', hint: 'Stock flow', icon: Boxes },
  { id: 'reports', label: 'Reports', short: 'Reports', hint: 'P&L · BS · TB', icon: FileSpreadsheet },
];

type ErpModuleRailProps = {
  active: AccountingModule;
  onChange: (id: AccountingModule) => void;
};

export function ErpModuleRail({ active, onChange }: ErpModuleRailProps) {
  return (
    <>
      <nav
        className="hidden lg:flex w-[232px] shrink-0 flex-col gap-1 p-3"
        aria-label="Accounting modules"
      >
        <p className="px-3 pb-2 pt-1 text-[11px] font-medium tracking-[0.14em] text-slate-400 uppercase">
          Workspace
        </p>
        <ul className="flex flex-col gap-1">
          {ACCOUNTING_MODULES.map((m) => {
            const Icon = m.icon;
            const isActive = active === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onChange(m.id)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-200',
                    isActive
                      ? 'bg-white text-slate-900 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80'
                      : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                      isActive
                        ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-sky-50 group-hover:text-sky-600'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold tracking-tight">
                      {m.label}
                    </span>
                    <span className="block truncate text-[11px] text-slate-400">{m.hint}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="lg:hidden px-4 pb-2 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {ACCOUNTING_MODULES.map((m) => {
            const Icon = m.icon;
            const isActive = active === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange(m.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-all',
                  isActive
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                    : 'bg-white/80 text-slate-600 ring-1 ring-slate-200/80 hover:bg-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.short}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

type ErpBreadcrumbProps = {
  items: BreadcrumbItem[];
  onNavigate?: (item: BreadcrumbItem, index: number) => void;
};

export function ErpBreadcrumb({ items, onNavigate }: ErpBreadcrumbProps) {
  if (!items.length) return null;
  return (
    <nav className="flex flex-wrap items-center gap-1.5" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const content = (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs',
              isLast
                ? 'bg-sky-50 font-medium text-sky-700 ring-1 ring-sky-100'
                : 'text-slate-500'
            )}
          >
            {item.label}
          </span>
        );
        return (
          <span key={item.id} className="inline-flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
            {isLast ? (
              content
            ) : item.href ? (
              <a
                href={item.href}
                className="rounded-full px-2.5 py-1 text-xs text-slate-500 transition-colors hover:bg-white hover:text-sky-700"
              >
                {item.label}
              </a>
            ) : onNavigate ? (
              <button
                type="button"
                className="rounded-full px-2.5 py-1 text-xs text-slate-500 transition-colors hover:bg-white hover:text-sky-700"
                onClick={() => onNavigate(item, i)}
              >
                {item.label}
              </button>
            ) : (
              content
            )}
          </span>
        );
      })}
    </nav>
  );
}

type ErpToolbarProps = {
  title: string;
  description?: string;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function ErpToolbar({
  title,
  description,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  actions,
  onRefresh,
  refreshing,
}: ErpToolbarProps) {
  return (
    <div className="px-5 pt-5 pb-4 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h2>
          {description && (
            <p className="max-w-xl text-sm text-slate-500">{description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onSearchChange && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-[180px] rounded-xl border-slate-200/80 bg-slate-50/80 pl-9 text-sm shadow-none focus-visible:bg-white sm:w-[220px]"
              />
            </div>
          )}
          {filters}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}

type StatItem = {
  label: string;
  value: string | number;
  hint?: string;
};

export function ErpStatStrip({ items }: { items: StatItem[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 px-5 pb-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-5">
      {items.map((item, idx) => (
        <div
          key={item.label}
          className={cn(
            'rounded-2xl border border-white/80 bg-gradient-to-br from-white to-slate-50/80 p-3.5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]',
            idx === 0 && 'from-sky-50 to-white ring-1 ring-sky-100/80'
          )}
        >
          <p className="text-[11px] font-medium tracking-wide text-slate-400">{item.label}</p>
          <p className="mt-1.5 font-semibold tabular-nums tracking-tight text-slate-900 text-[15px] sm:text-base">
            {item.value}
          </p>
          {item.hint && <p className="mt-0.5 text-[11px] text-slate-400">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}

type ErpGridProps = {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
};

export function ErpGrid({ children, className, maxHeight = 'min(58vh, 620px)' }: ErpGridProps) {
  return (
    <div className={cn('px-5 pb-5 sm:px-6', className)}>
      <div
        className="overflow-auto rounded-2xl border border-slate-200/70 bg-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.35)]"
        style={{ maxHeight }}
      >
        <div className="min-w-[640px]">{children}</div>
      </div>
    </div>
  );
}

export function erpTableClasses() {
  return {
    table: 'text-sm',
    head: 'h-11 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 bg-slate-50/90 sticky top-0 z-10 border-b border-slate-100',
    cell: 'px-4 py-3 align-middle',
    row: 'border-b border-slate-100/80 transition-colors hover:bg-sky-50/40 data-[clickable=true]:cursor-pointer',
    rowAlt: '',
  };
}

export function AccountTypeBadge({ type }: { type?: string }) {
  const t = type || '—';
  const tone: Record<string, string> = {
    Asset: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    Liability: 'bg-amber-50 text-amber-700 ring-amber-100',
    Equity: 'bg-sky-50 text-sky-700 ring-sky-100',
    Revenue: 'bg-teal-50 text-teal-700 ring-teal-100',
    Expense: 'bg-rose-50 text-rose-700 ring-rose-100',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        tone[t] || 'bg-slate-50 text-slate-600 ring-slate-100'
      )}
    >
      {t}
    </span>
  );
}

export function JournalStatusBadge({ status }: { status?: string }) {
  const s = status || '—';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        s === 'POSTED'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
          : 'bg-slate-50 text-slate-600 ring-slate-100'
      )}
    >
      {s}
    </span>
  );
}

export function SourceBadge({ source }: { source?: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-100">
      {source || '—'}
    </span>
  );
}

export function MovementTypeBadge({ type }: { type?: string }) {
  const t = type || '—';
  const tone: Record<string, string> = {
    RECEIPT: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    ISSUE: 'bg-rose-50 text-rose-700 ring-rose-100',
    ADJUSTMENT: 'bg-amber-50 text-amber-700 ring-amber-100',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        tone[t] || 'bg-slate-50 text-slate-600 ring-slate-100'
      )}
    >
      {t}
    </span>
  );
}

export function ErpEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-36 flex-col items-center justify-center gap-1 px-6 text-center">
      <p className="text-sm font-medium text-slate-600">{message}</p>
      <p className="text-xs text-slate-400">Try adjusting filters or refresh the view</p>
    </div>
  );
}

export function ErpDialogSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

export function ErpMetaGrid({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="text-[11px] text-slate-400">{item.label}</p>
          <div className="mt-1 font-medium text-slate-800 truncate">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

/** Soft primary action styling for ERP toolbars */
export function erpPrimaryButtonClass() {
  return 'h-10 rounded-xl bg-sky-500 px-4 text-sm font-medium text-white shadow-md shadow-sky-500/25 hover:bg-sky-600';
}

export function erpOutlineControlClass() {
  return 'h-10 rounded-xl border-slate-200 bg-white text-sm';
}
