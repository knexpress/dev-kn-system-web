'use client';

import type { MouseEvent } from 'react';
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme/theme-provider';
import { ACCENT_OPTIONS, type ThemeMode } from '@/lib/theme';
import { cn } from '@/lib/utils';

const originOf = (event: MouseEvent<HTMLElement>) => {
  if (event.clientX || event.clientY) return { x: event.clientX, y: event.clientY };
  const rect = event.currentTarget.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle, mounted } = useTheme();
  const dark = mounted && resolved === 'dark';

  return (
    <button
      type="button"
      onClick={(event) => toggle(originOf(event))}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      className={cn(
        'group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-slate-500 transition-colors hover:bg-white hover:text-brand-600',
        className
      )}
    >
      <Sun
        className={cn(
          'absolute h-[18px] w-[18px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100 group-hover:rotate-45'
        )}
      />
      <Moon
        className={cn(
          'absolute h-[18px] w-[18px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          dark ? 'rotate-0 scale-100 opacity-100 group-hover:-rotate-12' : '-rotate-90 scale-0 opacity-0'
        )}
      />
    </button>
  );
}

export function AccentPicker({ className }: { className?: string }) {
  const { mode, accent, setMode, setAccent, mounted } = useTheme();
  const current = ACCENT_OPTIONS.find((option) => option.id === accent) ?? ACCENT_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Appearance and accent colour"
          title="Appearance"
          className={cn(
            'relative flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-brand-600',
            className
          )}
        >
          <Palette className="h-[18px] w-[18px]" />
          <span
            className="absolute bottom-2.5 right-2.5 h-2.5 w-2.5 rounded-full ring-2 ring-canvas transition-colors duration-500"
            style={{ backgroundColor: mounted ? current.swatch : undefined }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-2xl border-slate-200/70 p-3">
        <DropdownMenuLabel className="px-1 pb-2 pt-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          Appearance
        </DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
          {MODES.map(({ id, label, icon: Icon }) => {
            const active = mounted && mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={(event) => setMode(id, originOf(event))}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-all',
                  active
                    ? 'bg-white text-brand-600 shadow-sm ring-1 ring-slate-200/70'
                    : 'text-slate-500 hover:text-slate-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        <DropdownMenuSeparator className="my-3" />

        <DropdownMenuLabel className="px-1 pb-2 pt-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          Accent colour
        </DropdownMenuLabel>
        <div className="grid grid-cols-6 gap-2 px-1">
          {ACCENT_OPTIONS.map((option) => {
            const active = mounted && accent === option.id;
            return (
              <button
                key={option.id}
                type="button"
                title={option.label}
                aria-label={`${option.label} accent`}
                onClick={(event) => setAccent(option.id, originOf(event))}
                className={cn(
                  'group relative flex aspect-square items-center justify-center rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-110',
                  active && 'scale-110'
                )}
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${option.swatch}cc, ${option.swatch})`,
                  boxShadow: active ? `0 0 0 2px hsl(var(--popover)), 0 0 0 4px ${option.swatch}, 0 8px 18px -6px ${option.swatch}` : `0 6px 14px -8px ${option.swatch}`,
                }}
              >
                <Check
                  className={cn(
                    'h-3.5 w-3.5 text-white transition-all duration-300',
                    active ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  )}
                  strokeWidth={3}
                />
              </button>
            );
          })}
        </div>
        <p className="mt-3 px-1 text-[11px] leading-4 text-slate-400">
          {current.label} is applied to buttons, highlights, charts and the sidebar across the system.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeControls({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center', className)}>
      <AccentPicker />
      <ThemeToggle />
    </div>
  );
}
