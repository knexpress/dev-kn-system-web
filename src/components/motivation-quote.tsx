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
        'no-print relative overflow-hidden rounded-[28px] bg-brand-500 px-6 py-6 text-white shadow-[0_24px_48px_-24px_rgba(91,78,245,0.8)]',
        className
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-white/5" />
      <div className="relative flex h-full flex-col items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Motivation
          </p>
          {loading && !quote ? (
            <p className="text-sm text-white/70">Loading your spark for this hour…</p>
          ) : (
            <p className="text-[15px] font-semibold leading-6 text-white">
              “{quote}”
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
