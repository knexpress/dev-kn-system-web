'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const SESSION_KEY = 'knex-motivation-quote';
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

type StoredQuote = {
  quote: string;
  source: string;
  expiresAt: number;
  windowKey: number;
};

type MotivationQuoteProps = {
  firstName?: string;
  department?: string;
  className?: string;
};

function windowKeyFromMs(ms = DEFAULT_WINDOW_MS) {
  return Math.floor(Date.now() / ms);
}

function readStored(): StoredQuote | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredQuote;
  } catch {
    return null;
  }
}

function writeStored(value: StoredQuote) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  } catch {
    // ignore quota / private mode
  }
}

export function MotivationQuote({ firstName, department, className }: MotivationQuoteProps) {
  const [quote, setQuote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQuote = useCallback(
    async (force = false) => {
      const windowMs = DEFAULT_WINDOW_MS;
      const currentKey = windowKeyFromMs(windowMs);
      const stored = readStored();

      if (
        !force &&
        stored?.quote &&
        stored.windowKey === currentKey &&
        stored.expiresAt > Date.now()
      ) {
        setQuote(stored.quote);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await apiClient.getMotivationQuote({ firstName, department });

      if (result.success && result.data?.quote) {
        const next: StoredQuote = {
          quote: result.data.quote,
          source: result.data.source,
          expiresAt: result.data.expiresAt || (currentKey + 1) * windowMs,
          windowKey: currentKey,
        };
        writeStored(next);
        setQuote(next.quote);
      } else if (stored?.quote) {
        setQuote(stored.quote);
      } else {
        setQuote('Stay focused — every careful action today compounds into tomorrow’s results.');
      }
      setLoading(false);
    },
    [firstName, department]
  );

  useEffect(() => {
    // First load for this login / current 10-minute window
    void loadQuote(false);

    const tick = window.setInterval(() => {
      const stored = readStored();
      const key = windowKeyFromMs();
      if (!stored || stored.windowKey !== key || stored.expiresAt <= Date.now()) {
        void loadQuote(true);
      }
    }, 30_000);

    return () => window.clearInterval(tick);
  }, [loadQuote]);

  if (!quote && !loading) return null;

  return (
    <div
      className={cn(
        'no-print relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 via-white to-sky-50/50 px-5 py-4 sm:px-6',
        className
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-200/25 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/15">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700/80">
            Motivation
          </p>
          {loading && !quote ? (
            <p className="text-sm text-slate-400">Loading your spark for this hour…</p>
          ) : (
            <p className="text-sm leading-6 text-slate-700 sm:text-[15px]">
              <span className="text-emerald-700/70">“</span>
              {quote}
              <span className="text-emerald-700/70">”</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
