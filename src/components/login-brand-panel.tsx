'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const SLIDES = [
  {
    src: '/KNEXPRESSGREEN.png',
    alt: 'KN Express logo',
    fit: 'contain' as const,
    caption: 'KN Express',
  },
  {
    src: '/getshipping-help.png',
    alt: 'Get shipping help',
    fit: 'cover' as const,
    caption: 'Get shipping help',
  },
  {
    src: '/shipmentwithoutstress1.png',
    alt: 'Shipment without stress',
    fit: 'cover' as const,
    caption: 'Shipment without stress',
  },
  {
    src: '/shipping-you-deserve.png',
    alt: 'Shipping you deserve',
    fit: 'cover' as const,
    caption: 'Shipping you deserve',
  },
];

const INTERVAL_MS = 5000;

export function LoginBrandPanel({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <aside
      className={cn(
        'relative isolate flex min-h-[42vh] flex-col overflow-hidden bg-black lg:min-h-screen',
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="KN Express brand showcase"
    >
      {/* Slideshow */}
      <div className="absolute inset-0">
        {SLIDES.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.src}
              className={cn(
                'absolute inset-0 transition-opacity duration-700 ease-out',
                active ? 'opacity-100' : 'opacity-0'
              )}
              aria-hidden={!active}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={i === 0}
                sizes="(max-width: 1024px) 100vw, 58vw"
                className={cn(
                  'transition-transform duration-[5s] ease-out',
                  slide.fit === 'cover' ? 'object-cover' : 'object-contain p-10 sm:p-16',
                  active && slide.fit === 'cover' ? 'scale-105' : 'scale-100'
                )}
              />
              {slide.fit === 'cover' && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/35" />
              )}
            </div>
          );
        })}
      </div>

      {/* Persistent logo mark */}
      <div className="relative z-10 flex items-start justify-between p-5 sm:p-7">
        <div className="rounded-2xl bg-black/45 px-3 py-2.5 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md ring-1 ring-white/10">
          <Image
            src="/KNEXPRESSGREEN.png"
            alt="KN Express"
            width={140}
            height={140}
            className="h-12 w-auto sm:h-14"
            priority
          />
        </div>
      </div>

      <div className="relative z-10 mt-auto space-y-4 p-5 sm:p-7">
        <div className="max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/90">
            KN Express
          </p>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {SLIDES[index].caption}
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Finance & logistics workspace for bookings, invoices, and operations.
          </p>
        </div>

        <div className="flex items-center gap-2" role="tablist" aria-label="Slideshow">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show slide ${i + 1}: ${slide.caption}`}
              onClick={() => setIndex(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === index
                  ? 'w-8 bg-emerald-400'
                  : 'w-1.5 bg-white/35 hover:bg-white/60'
              )}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
