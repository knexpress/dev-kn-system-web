'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import {
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  THEME_STORAGE_KEY,
  isAccentId,
  type AccentId,
  type ResolvedTheme,
  type ThemeMode,
} from '@/lib/theme';

type Origin = { x: number; y: number };

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  accent: AccentId;
  mounted: boolean;
  setMode: (mode: ThemeMode, origin?: Origin) => void;
  toggle: (origin?: Origin) => void;
  setAccent: (accent: AccentId, origin?: Origin) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolveMode = (mode: ThemeMode): ResolvedTheme =>
  mode === 'dark' || (mode === 'system' && systemPrefersDark()) ? 'dark' : 'light';

const applyToDocument = (resolved: ResolvedTheme, accent: AccentId) => {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  root.setAttribute('data-accent', accent);
};

const runThemeTransition = (update: () => void, origin?: Origin) => {
  const root = document.documentElement;
  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? 0;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  root.style.setProperty('--theme-x', `${x}px`);
  root.style.setProperty('--theme-y', `${y}px`);
  root.style.setProperty('--theme-r', `${radius}px`);

  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(() => flushSync(update));
    return;
  }
  root.classList.add('theme-fade');
  update();
  window.setTimeout(() => root.classList.remove('theme-fade'), 400);
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedMode = localStorage.getItem(THEME_STORAGE_KEY);
    const storedAccent = localStorage.getItem(ACCENT_STORAGE_KEY);
    const nextMode: ThemeMode =
      storedMode === 'dark' || storedMode === 'system' || storedMode === 'light' ? storedMode : 'light';
    const nextAccent = isAccentId(storedAccent) ? storedAccent : DEFAULT_ACCENT;
    const nextResolved = resolveMode(nextMode);
    setModeState(nextMode);
    setAccentState(nextAccent);
    setResolved(nextResolved);
    applyToDocument(nextResolved, nextAccent);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mode !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = resolveMode('system');
      runThemeTransition(() => {
        setResolved(next);
        applyToDocument(next, accent);
      });
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [mode, accent]);

  const setMode = useCallback(
    (nextMode: ThemeMode, origin?: Origin) => {
      const nextResolved = resolveMode(nextMode);
      localStorage.setItem(THEME_STORAGE_KEY, nextMode);
      const update = () => {
        setModeState(nextMode);
        setResolved(nextResolved);
        applyToDocument(nextResolved, accent);
      };
      if (nextResolved === resolved) update();
      else runThemeTransition(update, origin);
    },
    [accent, resolved]
  );

  const toggle = useCallback(
    (origin?: Origin) => setMode(resolved === 'dark' ? 'light' : 'dark', origin),
    [resolved, setMode]
  );

  const setAccent = useCallback(
    (nextAccent: AccentId, origin?: Origin) => {
      if (nextAccent === accent) return;
      localStorage.setItem(ACCENT_STORAGE_KEY, nextAccent);
      runThemeTransition(() => {
        setAccentState(nextAccent);
        applyToDocument(resolved, nextAccent);
      }, origin);
    },
    [accent, resolved]
  );

  const value = useMemo(
    () => ({ mode, resolved, accent, mounted, setMode, toggle, setAccent }),
    [mode, resolved, accent, mounted, setMode, toggle, setAccent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
