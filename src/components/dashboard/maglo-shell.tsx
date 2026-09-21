'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ErpBreadcrumb,
  ErpEmptyState,
  ErpGrid,
  ErpStatStrip,
  ErpToolbar,
  erpOutlineControlClass,
  erpPrimaryButtonClass,
  erpTableClasses,
} from '@/components/accounting/erp-shell';
import type { BreadcrumbItem } from '@/components/accounting/erp-format';

export {
  ErpBreadcrumb,
  ErpEmptyState,
  ErpGrid,
  ErpStatStrip,
  ErpToolbar,
  erpOutlineControlClass,
  erpPrimaryButtonClass,
  erpTableClasses,
};

type MagloHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  crumbs?: BreadcrumbItem[];
  className?: string;
};

/** Soft gradient hero used across Maglo dashboard pages */
export function MagloHero({
  eyebrow,
  title,
  subtitle,
  actions,
  backHref,
  backLabel = 'Back',
  crumbs,
  className,
}: MagloHeroProps) {
  return (
    <div
      className={cn(
        'no-print relative overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white via-sky-50/40 to-slate-50 px-5 py-5 sm:px-7 sm:py-6',
        className
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-slate-200/40 blur-3xl" />
      <div className="relative space-y-3">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {eyebrow && (
              <p className="text-[11px] font-semibold tracking-[0.16em] text-sky-600/80 uppercase">
                {eyebrow}
              </p>
            )}
            <h1
              className={cn(
                'font-semibold tracking-tight text-slate-900',
                eyebrow ? 'mt-1 text-3xl' : 'text-2xl sm:text-3xl'
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 max-w-xl text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
          {actions}
        </div>
        {crumbs && crumbs.length > 0 && <ErpBreadcrumb items={crumbs} />}
      </div>
    </div>
  );
}

type MagloPanelProps = {
  children: ReactNode;
  className?: string;
  padded?: boolean;
};

/** Frosted content panel under the hero */
export function MagloPanel({ children, className, padded = false }: MagloPanelProps) {
  return (
    <div
      className={cn(
        'min-h-[420px] flex-1 overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.35)] backdrop-blur-sm',
        padded && 'p-5 sm:p-6',
        className
      )}
    >
      {children}
    </div>
  );
}

type DashboardPageShellProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  crumbs?: BreadcrumbItem[];
  children: ReactNode;
  /** When true, children sit inside the frosted Maglo panel */
  panel?: boolean;
  panelClassName?: string;
  panelPadded?: boolean;
  className?: string;
};

/**
 * Standard Maglo page chrome: gradient hero + optional frosted content panel.
 * Matches the accounting module look used across the dashboard.
 */
export function DashboardPageShell({
  title,
  eyebrow,
  subtitle,
  actions,
  backHref,
  backLabel,
  crumbs,
  children,
  panel = true,
  panelClassName,
  panelPadded = false,
  className,
}: DashboardPageShellProps) {
  return (
    <div className={cn('-mx-2 flex min-h-[calc(100vh-6.5rem)] flex-col gap-5 sm:-mx-1', className)}>
      <MagloHero
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={actions}
        backHref={backHref}
        backLabel={backLabel}
        crumbs={crumbs}
      />
      {panel ? (
        <MagloPanel className={panelClassName} padded={panelPadded}>
          {children}
        </MagloPanel>
      ) : (
        children
      )}
    </div>
  );
}

const WIDGET_ACCENTS = [
  'from-sky-500 to-blue-600',
  'from-cyan-500 to-teal-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-slate-600 to-slate-800',
  'from-indigo-500 to-violet-600',
  'from-teal-500 to-cyan-600',
];

type MagloModuleTileProps = {
  href: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  index?: number;
};

/** Hub-style module tile (same language as Accounting hub) */
export function MagloModuleTile({
  href,
  title,
  description,
  icon: Icon,
  index = 0,
}: MagloModuleTileProps) {
  const accent = WIDGET_ACCENTS[index % WIDGET_ACCENTS.length];
  return (
    <Link
      href={href}
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </span>
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      {description && <p className="mt-1.5 text-sm text-slate-500">{description}</p>}
      <p className="mt-4 text-xs font-medium text-sky-600 opacity-0 transition-opacity group-hover:opacity-100">
        Open →
      </p>
    </Link>
  );
}

export function MagloSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400 uppercase">
      {children}
    </p>
  );
}
