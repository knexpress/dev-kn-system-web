'use client';

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Star } from 'lucide-react';
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
  starred?: boolean;
  onToggleStar?: () => void;
};

/** Centered quick-access card with a line icon */
export function MagloModuleTile({
  href,
  title,
  description,
  icon: Icon,
  starred,
  onToggleStar,
}: MagloModuleTileProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const onContextMenu = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onToggleStar) return;
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY });
  };

  return (
    <>
      <Link
        href={href}
        onContextMenu={onContextMenu}
        className={cn(
          magloCardClass,
          'group relative flex flex-col items-center px-5 py-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-brand-100 hover:shadow-[0_24px_48px_-28px_rgba(91,78,245,0.45)]'
        )}
      >
        {starred && (
          <span className="absolute right-4 top-4 text-amber-400">
            <Star className="h-4 w-4 fill-current" />
          </span>
        )}
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-slate-800/80 text-slate-800 transition-colors group-hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-white">
          <Icon className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-[15px] font-bold tracking-tight text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-slate-400">{description}</p>
        )}
      </Link>
      {menu &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="menu"
            style={{ left: menu.x, top: menu.y }}
            className="fixed z-[80] min-w-[220px] overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-[0_18px_40px_-20px_rgba(43,38,120,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
              onClick={() => {
                onToggleStar?.();
                setMenu(null);
              }}
            >
              <Star className={cn('h-4 w-4', starred ? 'fill-amber-400 text-amber-400' : 'text-slate-400')} />
              {starred ? 'Remove highlight' : 'Highlight with star'}
            </button>
          </div>,
          document.body
        )}
    </>
  );
}

export function MagloSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.14em] text-brand-500/80 uppercase">
      {children}
    </p>
  );
}

const magloDateFieldClass =
  'h-8 min-w-[9.75rem] w-[9.75rem] cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-slate-700 outline-none [color-scheme:light] focus-visible:ring-0';

type MagloDateRangeProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
};

/** Compact From–To date filter that stays readable on Maglo cards in dark mode. */
export function MagloDateRange({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = 'From',
  toLabel = 'To',
  className,
}: MagloDateRangeProps) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]',
        className
      )}
    >
      <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <label className="flex min-w-0 items-center gap-1.5">
        <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:inline">
          {fromLabel}
        </span>
        <input
          type="date"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
          aria-label="Date from"
          className={magloDateFieldClass}
        />
      </label>
      <span className="text-slate-300" aria-hidden>
        –
      </span>
      <label className="flex min-w-0 items-center gap-1.5">
        <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:inline">
          {toLabel}
        </span>
        <input
          type="date"
          value={to}
          onChange={(event) => onToChange(event.target.value)}
          aria-label="Date to"
          min={from || undefined}
          className={magloDateFieldClass}
        />
      </label>
    </div>
  );
}
