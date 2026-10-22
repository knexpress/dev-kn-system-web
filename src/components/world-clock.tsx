'use client';

import { useEffect, useMemo, useState } from 'react';
import { Globe2, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type Zone = {
  id: string;
  city: string;
  country: string;
  timeZone: string;
};

const ZONES: Zone[] = [
  { id: 'ae', city: 'Dubai', country: 'UAE', timeZone: 'Asia/Dubai' },
  { id: 'ph', city: 'Manila', country: 'Philippines', timeZone: 'Asia/Manila' },
];

type ZoneTime = {
  hours: number;
  minutes: number;
  seconds: number;
  dateLabel: string;
  timeLabel: string;
  offsetLabel: string;
};

const formatters = new Map<string, { parts: Intl.DateTimeFormat; date: Intl.DateTimeFormat; time: Intl.DateTimeFormat; offset: Intl.DateTimeFormat }>();

function formattersFor(timeZone: string) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = {
      parts: new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }),
      date: new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', day: 'numeric', month: 'short' }),
      time: new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }),
      offset: new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }),
    };
    formatters.set(timeZone, f);
  }
  return f;
}

function readZone(now: Date, timeZone: string): ZoneTime {
  const f = formattersFor(timeZone);
  const parts = f.parts.formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  const offsetLabel =
    f.offset.formatToParts(now).find((p) => p.type === 'timeZoneName')?.value || 'GMT';

  return {
    hours: get('hour') % 24,
    minutes: get('minute'),
    seconds: get('second'),
    dateLabel: f.date.format(now),
    timeLabel: f.time.format(now),
    offsetLabel,
  };
}

/** Offset between the device clock and the server clock, from the HTTP Date header */
function useServerClockOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const started = Date.now();
        const res = await fetch(`/KNEXPRESSGREEN.png?t=${started}`, { method: 'HEAD', cache: 'no-store' });
        const header = res.headers.get('date');
        if (!header || cancelled) return;
        const ended = Date.now();
        const serverNow = new Date(header).getTime() + (ended - started) / 2;
        const diff = serverNow - ended;
        // Date header only has 1s precision; ignore drift smaller than that.
        setOffset(Math.abs(diff) > 1500 ? diff : 0);
      } catch {
        // Fall back to the device clock
      }
    };
    void sync();
    const timer = window.setInterval(sync, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return offset;
}

function useNow(offset: number) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let timeout: number;
    const tick = () => {
      const current = Date.now() + offset;
      setNow(new Date(current));
      timeout = window.setTimeout(tick, 1000 - (current % 1000) + 5);
    };
    tick();
    return () => window.clearTimeout(timeout);
  }, [offset]);

  return now;
}

function AnalogClock({ time, night }: { time: ZoneTime; night: boolean }) {
  const secondAngle = time.seconds * 6;
  const minuteAngle = time.minutes * 6 + time.seconds * 0.1;
  const hourAngle = (time.hours % 12) * 30 + time.minutes * 0.5;

  const face = night ? '#0F172A' : '#FFFFFF';
  const ink = night ? '#E2E8F0' : '#0F172A';
  const muted = night ? '#475569' : '#CBD5E1';

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-[0_12px_20px_rgba(43,38,120,0.18)]" role="img" aria-label={`${time.timeLabel}`}>
      <circle cx="100" cy="100" r="96" fill={night ? '#1E293B' : '#EEF0FB'} />
      <circle cx="100" cy="100" r="88" fill={face} />

      {Array.from({ length: 60 }).map((_, i) => {
        const major = i % 5 === 0;
        return (
          <line
            key={i}
            x1="100"
            y1={major ? 18 : 20}
            x2="100"
            y2={major ? 30 : 25}
            stroke={major ? ink : muted}
            strokeWidth={major ? 3 : 1.2}
            strokeLinecap="round"
            transform={`rotate(${i * 6} 100 100)`}
          />
        );
      })}

      {[12, 3, 6, 9].map((n) => {
        const angle = (n % 12) * 30 * (Math.PI / 180);
        const x = 100 + Math.sin(angle) * 56;
        const y = 100 - Math.cos(angle) * 56;
        return (
          <text
            key={n}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="17"
            fontWeight="700"
            fill={ink}
            fontFamily="'Plus Jakarta Sans', Inter, sans-serif"
          >
            {n}
          </text>
        );
      })}

      <line
        x1="100"
        y1="112"
        x2="100"
        y2="54"
        stroke={ink}
        strokeWidth="6"
        strokeLinecap="round"
        transform={`rotate(${hourAngle} 100 100)`}
      />
      <line
        x1="100"
        y1="116"
        x2="100"
        y2="32"
        stroke={ink}
        strokeWidth="4"
        strokeLinecap="round"
        transform={`rotate(${minuteAngle} 100 100)`}
      />
      <g transform={`rotate(${secondAngle} 100 100)`}>
        <line x1="100" y1="124" x2="100" y2="24" stroke="#5B4EF5" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="100" cy="124" r="3.5" fill="#5B4EF5" />
      </g>
      <circle cx="100" cy="100" r="6" fill="#5B4EF5" />
      <circle cx="100" cy="100" r="2.5" fill={face} />
    </svg>
  );
}

export function WorldClock({ className }: { className?: string }) {
  const offset = useServerClockOffset();
  const now = useNow(offset);

  const times = useMemo(
    () => (now ? ZONES.map((z) => ({ zone: z, time: readZone(now, z.timeZone) })) : []),
    [now]
  );

  return (
    <div
      className={cn(
        'flex h-full min-h-[220px] flex-col rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.03),0_18px_40px_-28px_rgba(43,38,120,0.25)]',
        className
      )}
    >
      <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-500/80">
        <Globe2 className="h-3.5 w-3.5" />
        World clock
      </p>

      <div className="mt-3 grid flex-1 grid-cols-2 gap-4">
        {times.length === 0
          ? ZONES.map((z) => (
              <div key={z.id} className="flex flex-col items-center justify-center gap-3">
                <div className="aspect-square w-full max-w-[128px] animate-pulse rounded-full bg-slate-100" />
                <div className="h-3 w-20 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))
          : times.map(({ zone, time }) => {
              const night = time.hours < 6 || time.hours >= 18;
              return (
                <div key={zone.id} className="flex flex-col items-center gap-2 text-center">
                  <div className="aspect-square w-full max-w-[128px]">
                    <AnalogClock time={time} night={night} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{zone.city}</p>
                    <p className="mt-0.5 text-base font-extrabold tabular-nums tracking-tight text-slate-900">
                      {time.timeLabel}
                    </p>
                    <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
                      {night ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3 text-amber-500" />}
                      {time.dateLabel} · {time.offsetLabel}
                    </p>
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
}
