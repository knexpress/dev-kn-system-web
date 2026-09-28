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

/** Page heading that sits directly on the canvas */
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
    <div className={cn('no-print space-y-3 px-1 pt-1', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-slate-200/70 transition-all hover:text-brand-600 hover:ring-brand-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-brand-600">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {eyebrow}
            </span>
          )}
          <h1
            className={cn(
              'font-extrabold leading-tight tracking-tight text-slate-900',
              eyebrow ? 'mt-2 text-[28px] sm:text-[32px]' : 'text-2xl sm:text-[28px]'
            )}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 max-w-xl text-sm text-slate-400">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {crumbs && crumbs.length > 0 && <ErpBreadcrumb items={crumbs} />}
    </div>
  );
}

/** White rounded card used for dashboard widgets */
export const magloCardClass =
  'rounded-[28px] border border-slate-100 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03),0_18px_40px_-28px_rgba(43,38,120,0.25)]';

type MagloPanelProps = {
  children: ReactNode;
  className?: string;
  padded?: boolean;
};

/** White content card under the heading */
export function MagloPanel({ children, className, padded = false }: MagloPanelProps) {
  return (
    <div
      className={cn(
        magloCardClass,
        'min-h-[420px] flex-1 overflow-hidden',
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
    <div className={cn('flex min-h-[calc(100vh-7.5rem)] flex-col gap-5', className)}>
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

type MagloModuleTileProps = {
  href: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  index?: number;
};

/** Centered quick-access card with a line icon */
export function MagloModuleTile({ href, title, description, icon: Icon }: MagloModuleTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        magloCardClass,
        'group flex flex-col items-center px-5 py-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand-100 hover:shadow-[0_24px_48px_-28px_rgba(91,78,245,0.45)]'
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-800/80 text-slate-800 transition-colors group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-white">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-[15px] font-bold tracking-tight text-slate-900">{title}</h2>
      {description && (
        <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-slate-400">{description}</p>
      )}
    </Link>
  );
}

export function MagloSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.14em] text-brand-500/80 uppercase">
      {children}
    </p>
  );
}
