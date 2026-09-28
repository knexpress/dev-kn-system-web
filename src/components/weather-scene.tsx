'use client';

import type { CSSProperties } from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WeatherKind = 'clear' | 'partly' | 'cloudy' | 'humid' | 'rain' | 'snow' | 'sleet' | 'storm';
export type WeatherIntensity = 1 | 2 | 3;

export type WeatherProfile = {
  kind: WeatherKind;
  intensity: WeatherIntensity;
  night: boolean;
  intensityLabel: string;
  gradient: string;
};

const KIND_BY_CODE: Record<string, [WeatherKind, WeatherIntensity]> = {
  clear: ['clear', 1],
  pcloudy: ['partly', 1],
  mcloudy: ['partly', 2],
  cloudy: ['cloudy', 3],
  humid: ['humid', 2],
  lightrain: ['rain', 1],
  ishower: ['rain', 1],
  oshower: ['rain', 2],
  rain: ['rain', 3],
  lightsnow: ['snow', 1],
  snow: ['snow', 3],
  rainsnow: ['sleet', 2],
  ts: ['storm', 2],
  tsrain: ['storm', 3],
};

const INTENSITY_LABELS: Record<WeatherKind, [string, string, string]> = {
  clear: ['Mild', 'Warm', 'Extreme heat'],
  partly: ['Few clouds', 'Mostly cloudy', 'Overcast'],
  cloudy: ['Light clouds', 'Cloudy', 'Overcast'],
  humid: ['Slightly humid', 'Humid', 'Very humid'],
  rain: ['Light rain', 'Moderate rain', 'Heavy rain'],
  snow: ['Light snow', 'Snowfall', 'Heavy snow'],
  sleet: ['Light sleet', 'Sleet', 'Heavy sleet'],
  storm: ['Distant storm', 'Thunderstorm', 'Severe storm'],
};

function gradientFor(kind: WeatherKind, intensity: WeatherIntensity, night: boolean) {
  if (night && (kind === 'clear' || kind === 'partly')) return 'from-slate-900 via-brand-900 to-brand-700';
  switch (kind) {
    case 'clear':
      return intensity === 3
        ? 'from-amber-400 via-orange-500 to-rose-500'
        : intensity === 2
          ? 'from-sky-400 via-sky-500 to-amber-400'
          : 'from-sky-300 via-sky-500 to-brand-500';
    case 'partly':
      return 'from-sky-400 via-brand-400 to-brand-600';
    case 'cloudy':
      return 'from-slate-400 via-slate-500 to-brand-600';
    case 'humid':
      return 'from-teal-400 via-cyan-500 to-brand-500';
    case 'rain':
      return intensity === 3
        ? 'from-slate-700 via-slate-800 to-brand-900'
        : 'from-slate-500 via-slate-600 to-brand-700';
    case 'snow':
    case 'sleet':
      return 'from-sky-300 via-slate-400 to-brand-500';
    case 'storm':
      return 'from-slate-800 via-slate-900 to-brand-900';
  }
}

export function profileWeather(code: string, tempC: number | null): WeatherProfile {
  const raw = (code || '').toLowerCase();
  const key = raw.replace(/day|night/g, '');
  const hour = new Date().getHours();
  const night = raw.includes('night') || (!raw.includes('day') && (hour < 6 || hour >= 19));
  const [kind, base] = KIND_BY_CODE[key] || ['partly', 1];

  let intensity: WeatherIntensity = base;
  if (kind === 'clear' && tempC !== null) {
    intensity = tempC >= 38 ? 3 : tempC >= 30 ? 2 : 1;
  }

  return {
    kind,
    intensity,
    night,
    intensityLabel: INTENSITY_LABELS[kind][intensity - 1],
    gradient: gradientFor(kind, intensity, night),
  };
}

const anim = (value: string): CSSProperties => ({ animation: value });

function Sun({ intensity, className }: { intensity: WeatherIntensity; className?: string }) {
  const spin = [36, 24, 14][intensity - 1];
  const glow = [
    '0 0 36px 8px rgba(253,224,71,0.45)',
    '0 0 48px 14px rgba(253,224,71,0.55)',
    '0 0 64px 22px rgba(251,146,60,0.65)',
  ][intensity - 1];
  return (
    <div className={cn('absolute h-28 w-28', className)}>
      <div className="wx-anim absolute inset-0" style={anim(`wx-spin ${spin}s linear infinite`)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-0 h-full w-[3px] rounded-full bg-gradient-to-b from-amber-100 via-transparent to-amber-100 opacity-80"
            style={{ transform: `translateX(-50%) rotate(${i * 30}deg)` }}
          />
        ))}
      </div>
      <div
        className="wx-anim absolute inset-5 rounded-full bg-gradient-to-br from-amber-100 via-amber-300 to-orange-400"
        style={{ boxShadow: glow, ...anim(`wx-pulse ${[5, 4, 2.6][intensity - 1]}s ease-in-out infinite`) }}
      />
    </div>
  );
}

function Moon({ className }: { className?: string }) {
  return (
    <div className={cn('absolute h-20 w-20', className)}>
      <div
        className="wx-anim absolute inset-2 rounded-full"
        style={{
          boxShadow: 'inset -14px 8px 0 0 #FDE68A, 0 0 40px 6px rgba(253,230,138,0.25)',
          ...anim('wx-pulse 6s ease-in-out infinite'),
        }}
      />
    </div>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="wx-anim absolute h-1 w-1 rounded-full bg-white"
          style={{
            left: `${(i * 53) % 100}%`,
            top: `${(i * 29) % 70}%`,
            ...anim(`wx-twinkle ${2 + (i % 4) * 0.7}s ease-in-out ${(i * 0.4) % 3}s infinite`),
          }}
        />
      ))}
    </>
  );
}

function Cloud({
  className,
  scale = 1,
  duration = 12,
  delay = 0,
  tone = 'text-white/90',
}: {
  className?: string;
  scale?: number;
  duration?: number;
  delay?: number;
  tone?: string;
}) {
  return (
    <div
      className={cn('wx-anim absolute', tone, className)}
      style={anim(`wx-drift ${duration}s ease-in-out ${delay}s infinite`)}
    >
      <div className="relative h-12 w-28 origin-top-right" style={{ transform: `scale(${scale})` }}>
        <span className="absolute bottom-0 left-0 h-8 w-28 rounded-full bg-current" />
        <span className="absolute bottom-4 left-4 h-10 w-10 rounded-full bg-current" />
        <span className="absolute bottom-3 left-11 h-12 w-12 rounded-full bg-current" />
      </div>
    </div>
  );
}

function Rain({ intensity }: { intensity: WeatherIntensity }) {
  const count = [12, 22, 36][intensity - 1];
  const duration = [1.2, 0.85, 0.55][intensity - 1];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'wx-anim absolute top-0 w-[2px] rounded-full bg-gradient-to-b from-transparent to-white/80',
            intensity === 3 ? 'h-6' : 'h-4'
          )}
          style={{
            left: `${(i * 37 + 7) % 100}%`,
            ...anim(`wx-rain ${duration}s linear ${((i * 0.173) % duration).toFixed(2)}s infinite`),
          }}
        />
      ))}
    </>
  );
}

function Snow({ intensity }: { intensity: WeatherIntensity }) {
  const count = [12, 20, 32][intensity - 1];
  const duration = [7, 5.5, 4][intensity - 1];
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const size = 3 + (i % 3) * 2;
        return (
          <span
            key={i}
            className="wx-anim absolute top-0 rounded-full bg-white/90"
            style={{
              width: size,
              height: size,
              left: `${(i * 41 + 3) % 100}%`,
              ...anim(`wx-snow ${duration}s linear ${((i * 0.37) % duration).toFixed(2)}s infinite`),
            }}
          />
        );
      })}
    </>
  );
}

function Haze({ intensity }: { intensity: WeatherIntensity }) {
  return (
    <>
      {Array.from({ length: intensity + 2 }).map((_, i) => (
        <span
          key={i}
          className="wx-anim absolute left-[-10%] h-3 w-[120%] rounded-full bg-white/40 blur-md"
          style={{
            top: `${35 + i * 14}%`,
            ...anim(`wx-haze ${7 + i * 1.5}s ease-in-out ${i * 0.8}s infinite`),
          }}
        />
      ))}
    </>
  );
}

function HeatShimmer() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className="wx-anim absolute bottom-3 h-10 w-16 rounded-full bg-white/30 blur-lg"
          style={{
            left: `${10 + i * 22}%`,
            ...anim(`wx-shimmer ${2.2 + i * 0.4}s ease-in-out ${i * 0.3}s infinite`),
          }}
        />
      ))}
    </>
  );
}

/** Animated backdrop for the weather card; density and speed follow intensity */
export function WeatherScene({ profile }: { profile: WeatherProfile }) {
  const { kind, intensity, night } = profile;
  const darkCloud = kind === 'storm' || (kind === 'rain' && intensity === 3);
  const cloudTone = darkCloud ? 'text-slate-500/90' : kind === 'rain' ? 'text-slate-200/90' : 'text-white/90';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {night && <Stars count={kind === 'clear' ? 18 : 8} />}

      {(kind === 'clear' || kind === 'partly' || kind === 'humid') &&
        (night ? (
          <Moon className="right-8 top-6" />
        ) : (
          <Sun intensity={kind === 'clear' ? intensity : 1} className="right-6 top-4" />
        ))}

      {kind === 'clear' && intensity === 3 && !night && <HeatShimmer />}

      {kind === 'partly' && (
        <>
          <Cloud className="right-4 top-16" scale={0.9} duration={11} />
          {intensity >= 2 && <Cloud className="right-28 top-8" scale={0.7} duration={14} delay={1.5} tone="text-white/75" />}
        </>
      )}

      {(kind === 'cloudy' || kind === 'rain' || kind === 'snow' || kind === 'sleet' || kind === 'storm') && (
        <>
          <Cloud className="right-6 top-5" scale={1.1} duration={13} tone={cloudTone} />
          <Cloud className="right-32 top-2" scale={0.8} duration={16} delay={2} tone={cloudTone} />
          {(intensity === 3 || kind === 'cloudy') && (
            <Cloud className="right-16 top-14" scale={0.9} duration={10} delay={1} tone={cloudTone} />
          )}
        </>
      )}

      {(kind === 'rain' || kind === 'sleet' || kind === 'storm') && (
        <Rain intensity={kind === 'sleet' ? 1 : intensity} />
      )}
      {(kind === 'snow' || kind === 'sleet') && <Snow intensity={kind === 'sleet' ? 1 : intensity} />}

      {kind === 'humid' && <Haze intensity={intensity} />}

      {kind === 'storm' && (
        <>
          <span
            className="wx-anim absolute inset-0 bg-white"
            style={anim(`wx-flash ${intensity === 3 ? 3.5 : 6}s linear infinite`)}
          />
          <Zap
            className="wx-anim absolute right-20 top-20 h-10 w-10 fill-amber-300 text-amber-300"
            style={anim(`wx-flash ${intensity === 3 ? 3.5 : 6}s linear infinite`)}
          />
        </>
      )}
    </div>
  );
}
