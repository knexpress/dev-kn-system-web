'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ACCOUNTING_MODULES } from '@/components/accounting/erp-shell';
import { ACCOUNTING_ROUTES } from '@/components/accounting/erp-format';
import type { NavLink } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export const OPEN_SEARCH_EVENT = 'knex:open-search';

export const openCommandPalette = () => {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
};

type PaletteItem = {
  href: string;
  label: string;
  group: string;
  icon: ComponentType<{ className?: string }>;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: NavLink[];
};

export function CommandPalette({ open, onOpenChange, links }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const items = useMemo<PaletteItem[]>(() => {
    const pages = links.map((l) => ({ href: l.href, label: l.label, group: 'Pages', icon: l.icon }));
    const hasAccounting = links.some((l) => l.href === '/dashboard/accounting');
    const accounting = hasAccounting
      ? ACCOUNTING_MODULES.map((m) => ({
          href: ACCOUNTING_ROUTES[m.id].href,
          label: m.label,
          group: 'Accounting',
          icon: m.icon,
        }))
      : [];
    return [...pages, ...accounting];
  }, [links]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    setCursor(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const go = (item?: PaletteItem) => {
    if (!item) return;
    onOpenChange(false);
    router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[cursor]);
    }
  };

  let lastGroup = '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-3xl border-slate-200/70 bg-white p-0 shadow-[0_40px_80px_-30px_rgba(43,38,120,0.45)] [&>button]:hidden">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages and modules…"
            className="h-14 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            ESC
          </kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">No matches for “{query}”</p>
          ) : (
            results.map((item, idx) => {
              const Icon = item.icon;
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              const active = idx === cursor;
              return (
                <div key={`${item.group}-${item.href}`}>
                  {showGroup && (
                    <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {item.group}
                    </p>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => go(item)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors',
                      active ? 'bg-brand-50 text-brand-700' : 'text-slate-700'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-xl',
                        active ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {active && <CornerDownLeft className="h-3.5 w-3.5 text-brand-400" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
