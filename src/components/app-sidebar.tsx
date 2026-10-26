'use client';

import { useRef, useState, type FocusEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  activityKeyForHref,
  getRailLinks,
  isNavLinkActive,
  navLinkExtra,
} from '@/lib/navigation';
import { cn } from '@/lib/utils';

export type ActivityBadgeProps = {
  hasNew: Record<string, boolean>;
  markSeen: (key: string) => void;
  onOpenChange?: (open: boolean) => void;
};

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      aria-label="KN Express dashboard"
      className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black shadow-lg shadow-brand-500/20 ring-4 ring-white',
        className
      )}
    >
      <Image
        src="/KNEXPRESSGREEN.png"
        alt="KN Express"
        width={48}
        height={48}
        className="h-full w-full object-contain"
        priority
      />
    </Link>
  );
}

type RailState = 'idle' | 'open' | 'closed';

/** Desktop icon rail */
export default function AppSidebar({ hasNew, markSeen, onOpenChange }: ActivityBadgeProps) {
  const { department } = useAuth();
  const pathname = usePathname();
  const navLinks = getRailLinks(department);

  const [state, setState] = useState<RailState>('idle');
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const hovering = useRef(false);
  const magFrame = useRef<number | null>(null);

  const open = state === 'open';

  const setMagnify = (clientY: number | null) => {
    itemRefs.current.forEach((el) => {
      if (!el) return;
      let mag = 0;
      if (clientY !== null) {
        const r = el.getBoundingClientRect();
        mag = Math.max(0, 1 - Math.abs(r.top + r.height / 2 - clientY) / 96);
      }
      el.style.setProperty('--mag', mag.toFixed(3));
    });
  };

  const onListMove = (clientY: number) => {
    if (magFrame.current !== null) cancelAnimationFrame(magFrame.current);
    magFrame.current = requestAnimationFrame(() => setMagnify(clientY));
  };

  const openRail = () => {
    setState('open');
    onOpenChange?.(true);
  };

  const closeRail = () => {
    setMagnify(null);
    setState((s) => (s === 'open' ? 'closed' : s));
    onOpenChange?.(false);
  };

  const onFocus = () => {
    if (!open) openRail();
  };

  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (hovering.current || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    closeRail();
  };

  return (
    <aside className="no-print sticky top-0 z-30 hidden h-svh w-[92px] shrink-0 flex-col overflow-visible md:flex">
      <div className="flex h-[clamp(4.5rem,10vh,5.25rem)] shrink-0 items-center justify-center">
        <BrandMark />
      </div>

      <nav
        aria-label="Main navigation"
        className="flex min-h-0 flex-1 items-center py-3 pr-4"
        onMouseEnter={() => {
          hovering.current = true;
          openRail();
        }}
        onMouseLeave={() => {
          hovering.current = false;
          closeRail();
        }}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <div
          className={cn(
            'relative flex max-h-full w-full',
            open && '[filter:drop-shadow(0_18px_28px_rgba(91,78,245,0.45))]'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 w-3 rounded-r-full bg-brand-500',
              open ? 'opacity-0' : 'opacity-100'
            )}
          >
            <span className="absolute right-[3px] top-1/2 h-10 w-1 -translate-y-1/2 rounded-full bg-white/70" />
          </span>

          <div
            data-state={state}
            className={cn(
              'rail-bubble relative flex max-h-full flex-col rounded-r-[40px] bg-brand-500 py-5',
              open ? 'w-[236px]' : 'w-full'
            )}
          >
            <ul
              onMouseMove={(e) => onListMove(e.clientY)}
              onMouseLeave={() => setMagnify(null)}
              className={cn(
                'scrollbar-hide flex flex-col gap-2 overflow-y-auto py-2',
                open ? 'items-stretch px-3' : 'items-center px-3'
              )}
            >
              {navLinks.map((link, index) => {
                const activityKey = activityKeyForHref(link.href);
                const hasNewFlag = activityKey ? hasNew[activityKey] : false;
                const isActive = isNavLinkActive(pathname, link.href);
                const Icon = link.icon;

                return (
                  <li
                    key={link.href}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    className="rail-item"
                  >
                    <div className="rail-mag">
                      <Link
                        href={link.href}
                        {...navLinkExtra(link)}
                        aria-label={link.label}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          if (activityKey) markSeen(activityKey);
                        }}
                        className={cn(
                          'rail-link relative flex h-11 items-center rounded-2xl transition-[background-color,color,box-shadow,transform] duration-200 active:scale-90',
                          open ? 'w-full justify-start gap-3 px-3' : 'w-11 justify-center',
                          isActive
                            ? 'rail-active bg-white text-brand-600 shadow-lg shadow-brand-900/25'
                            : 'text-white/70 hover:bg-white/20 hover:text-white hover:shadow-[0_8px_18px_-6px_rgba(0,0,0,0.35)]'
                        )}
                      >
                        <Icon className="rail-icon h-[18px] w-[18px] shrink-0" />
                        {open && (
                          <span className="truncate text-[12px] font-medium leading-none">
                            {link.label}
                          </span>
                        )}
                        {hasNewFlag && (
                          <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-emerald-400 ring-2 ring-brand-500" />
                        )}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </nav>
    </aside>
  );
}

