'use client';

import { useRef, useState, type CSSProperties, type FocusEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  activityKeyForHref,
  getNavigationLinks,
  isNavLinkActive,
} from '@/lib/navigation';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type ActivityBadgeProps = {
  hasNew: Record<string, boolean>;
  markSeen: (key: string) => void;
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
type Origin = { x: number; y: number; index: number };

/** Offsets for the droplets that pop out of the cursor when the rail opens */
const POP_BUBBLES = [
  { dx: 26, dy: -34, size: 10, delay: 0, tone: 'bg-brand-300' },
  { dx: 38, dy: 6, size: 7, delay: 40, tone: 'bg-white' },
  { dx: 22, dy: 36, size: 12, delay: 70, tone: 'bg-brand-400' },
  { dx: 48, dy: -12, size: 6, delay: 110, tone: 'bg-brand-200' },
  { dx: 12, dy: -54, size: 8, delay: 150, tone: 'bg-white' },
  { dx: 16, dy: 58, size: 6, delay: 180, tone: 'bg-brand-300' },
];

/** Desktop icon rail - bubbles open from the cursor, icons ripple out from the nearest one */
export default function AppSidebar({ hasNew, markSeen }: ActivityBadgeProps) {
  const { department } = useAuth();
  const pathname = usePathname();
  const navLinks = getNavigationLinks(department);

  const [state, setState] = useState<RailState>('idle');
  const [origin, setOrigin] = useState<Origin>({ x: 0, y: 0, index: 0 });
  const [burst, setBurst] = useState(0);
  const [fromY, setFromY] = useState<number[]>([]);
  const railRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const hovering = useRef(false);
  const magFrame = useRef<number | null>(null);

  const open = state === 'open';

  const pointFor = (clientX: number, clientY: number) => {
    const rect = railRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.min(Math.max(clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(clientY - rect.top, 0), rect.height),
    };
  };

  const nearestIndex = (clientY: number) => {
    let best = 0;
    let bestDist = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - clientY);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  };

  /** Vertical distance from each icon to the cursor, so icons fly out of / back into that point */
  const offsetsTo = (pointY: number) => {
    const scroll = listRef.current?.scrollTop ?? 0;
    return itemRefs.current.map((el) =>
      el ? pointY - (el.offsetTop - scroll + el.offsetHeight / 2) : 0
    );
  };

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

  const openFrom = (clientX: number, clientY: number) => {
    const point = pointFor(clientX, clientY);
    if (!point) return;
    setFromY(offsetsTo(point.y));
    setOrigin({ ...point, index: nearestIndex(clientY) });
    setBurst((b) => b + 1);
    setState('open');
  };

  const closeTo = (clientX: number, clientY: number) => {
    const point = pointFor(clientX, clientY);
    if (point) {
      setFromY(offsetsTo(point.y));
      setOrigin((prev) => ({ ...prev, ...point }));
    }
    setMagnify(null);
    setState((s) => (s === 'open' ? 'closed' : s));
  };

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    if (open) return;
    const r = e.target.getBoundingClientRect();
    openFrom(r.left + r.width / 2, r.top + r.height / 2);
  };

  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (hovering.current || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    const r = e.target.getBoundingClientRect();
    closeTo(r.left + r.width / 2, r.top + r.height / 2);
  };

  return (
    <aside className="no-print sticky top-0 hidden h-svh w-[92px] shrink-0 flex-col md:flex">
      <div className="flex h-[84px] shrink-0 items-center justify-center">
        <BrandMark />
      </div>

      <nav
        aria-label="Main navigation"
        className="flex min-h-0 flex-1 items-center py-3 pr-4"
        onMouseEnter={(e) => {
          hovering.current = true;
          openFrom(e.clientX, e.clientY);
        }}
        onMouseLeave={(e) => {
          hovering.current = false;
          closeTo(e.clientX, e.clientY);
        }}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <div
          className={cn(
            'relative flex max-h-full w-full transition-[filter] duration-500',
            open
              ? '[filter:drop-shadow(0_18px_28px_rgba(91,78,245,0.45))]'
              : '[filter:drop-shadow(0_0_0_rgba(91,78,245,0))]'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 w-3 rounded-r-full bg-brand-500 transition-opacity',
              open ? 'opacity-0 delay-200 duration-200' : 'opacity-100 delay-150 duration-300'
            )}
          >
            <span className="absolute right-[3px] top-1/2 h-10 w-1 -translate-y-1/2 rounded-full bg-white/70" />
          </span>

          <div
            ref={railRef}
            data-state={state}
            style={{ '--rx': `${origin.x}px`, '--ry': `${origin.y}px` } as CSSProperties}
            className="rail-bubble relative flex max-h-full w-full flex-col rounded-r-[40px] bg-brand-500 py-5"
          >
            <ul
              ref={listRef}
              onMouseMove={(e) => onListMove(e.clientY)}
              onMouseLeave={() => setMagnify(null)}
              className="scrollbar-hide flex flex-col items-center gap-2 overflow-y-auto px-3 py-2"
            >
              {navLinks.map((link, index) => {
                const activityKey = activityKeyForHref(link.href);
                const hasNewFlag = activityKey ? hasNew[activityKey] : false;
                const isActive = isNavLinkActive(pathname, link.href);
                const Icon = link.icon;
                const distance = Math.abs(index - origin.index);
                const delay = open ? 90 + distance * 48 : Math.min(distance * 18, 120);

                return (
                  <li
                    key={link.href}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    style={
                      {
                        '--from-y': `${fromY[index] ?? 0}px`,
                        '--spin': `${index % 2 === 0 ? -38 : 32}deg`,
                        animationDelay: `${delay}ms`,
                      } as CSSProperties
                    }
                    className="rail-item"
                  >
                    <div className="rail-mag">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={link.href}
                            aria-label={link.label}
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => {
                              if (activityKey) markSeen(activityKey);
                            }}
                            className={cn(
                              'rail-link relative flex h-11 w-11 items-center justify-center rounded-2xl transition-[background-color,color,box-shadow,transform] duration-200 active:scale-90',
                              isActive
                                ? 'rail-active bg-white text-brand-600 shadow-lg shadow-brand-900/25'
                                : 'text-white/70 hover:bg-white/20 hover:text-white hover:shadow-[0_8px_18px_-6px_rgba(0,0,0,0.35)]'
                            )}
                          >
                            <Icon className="rail-icon h-[18px] w-[18px]" />
                            {hasNewFlag && (
                              <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-emerald-400 ring-2 ring-brand-500" />
                            )}
                          </Link>
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipContent
                            side="right"
                            sideOffset={14}
                            className="z-[100] rounded-xl border-0 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
                          >
                            {link.label}
                          </TooltipContent>
                        </TooltipPortal>
                      </Tooltip>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {open &&
            POP_BUBBLES.map((b, i) => (
              <span
                key={`${burst}-${i}`}
                aria-hidden
                className={cn('rail-pop pointer-events-none absolute rounded-full', b.tone)}
                style={
                  {
                    left: origin.x,
                    top: origin.y,
                    width: b.size,
                    height: b.size,
                    '--dx': `${b.dx}px`,
                    '--dy': `${b.dy}px`,
                    animation: `rail-pop 700ms cubic-bezier(0.22,1,0.36,1) ${b.delay}ms both`,
                  } as CSSProperties
                }
              />
            ))}
        </div>
      </nav>

      <div className="flex h-[64px] shrink-0 items-center justify-center">
        <span className="text-[10px] font-medium tracking-wide text-slate-400">v1.8.1</span>
      </div>
    </aside>
  );
}

