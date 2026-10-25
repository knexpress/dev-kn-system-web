'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type KnexSkullLottieProps = {
  className?: string;
  exploded?: boolean;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  dx: number;
  dy: number;
  rotate: number;
  delay: number;
};

type LottieHandle = {
  destroy: () => void;
  play: () => void;
  pause: () => void;
  addEventListener: (name: string, cb: () => void) => void;
  renderer?: {
    elements?: Array<{
      data?: { nm?: string };
      layerElement?: SVGGElement | null;
      baseElement?: SVGGElement | null;
    }>;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isEyeLayer(name: string) {
  return /\[(pupil|core)\]/i.test(name);
}

function collectEyeNodes(animation: LottieHandle, host: HTMLDivElement) {
  const nodes = new Set<SVGGElement>();
  for (const element of animation.renderer?.elements ?? []) {
    if (!isEyeLayer(element.data?.nm ?? '')) continue;
    const node = element.layerElement ?? element.baseElement;
    if (node) nodes.add(node);
  }
  if (!nodes.size) {
    host.querySelectorAll<SVGGElement>('g[clip-path], g').forEach((group) => {
      const label = group.getAttribute('aria-label') ?? group.getAttribute('class') ?? '';
      if (isEyeLayer(label)) nodes.add(group);
    });
  }
  return [...nodes];
}

async function sampleParticles(svg: SVGSVGElement): Promise<Particle[]> {
  const box = svg.getBoundingClientRect();
  const width = Math.max(32, Math.round(box.width));
  const height = Math.max(32, Math.round(box.height));
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const xml = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  const image = new Image();
  image.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('skull snapshot failed'));
    image.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(image, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  const hits: Array<{ x: number; y: number; a: number }> = [];
  const step = 3;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 28) hits.push({ x, y, a: alpha });
    }
  }

  const max = 420;
  const stride = hits.length > max ? Math.ceil(hits.length / max) : 1;
  return hits
    .filter((_, index) => index % stride === 0)
    .slice(0, max)
    .map((hit, id) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 140 + Math.random() * 340;
      return {
        id,
        x: box.left + hit.x,
        y: box.top + hit.y,
        size: 2.4 + (hit.a / 255) * 2.2,
        dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance,
        rotate: (Math.random() - 0.5) * 420,
        delay: Math.random() * 0.12,
      };
    });
}

/** Looping public Lottie. Eyes track the cursor; the skull stays put. Click explodes every painted dot. */
export function KnexSkullLottie({ className, exploded = false }: KnexSkullLottieProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<LottieHandle | null>(null);
  const eyeNodesRef = useRef<SVGGElement[]>([]);
  const lookTargetRef = useRef({ x: 0, y: 0 });
  const lookCurrentRef = useRef({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bursting, setBursting] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    void import('lottie-web').then((mod) => {
      if (destroyed || !hostRef.current) return;
      const animation = mod.default.loadAnimation({
        container: hostRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/flowing-3d-skull.lottie.json',
      }) as LottieHandle;
      animationRef.current = animation;
      animation.addEventListener('DOMLoaded', () => {
        if (destroyed) return;
        eyeNodesRef.current = collectEyeNodes(animation, hostRef.current ?? host);
      });
    });

    return () => {
      destroyed = true;
      animationRef.current?.destroy();
      animationRef.current = null;
      eyeNodesRef.current = [];
      host.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const LOOK_MAX = 9;
    const EASE = 0.13;

    const applyLook = (x: number, y: number) => {
      if (!eyeNodesRef.current.length && animationRef.current && hostRef.current) {
        eyeNodesRef.current = collectEyeNodes(animationRef.current, hostRef.current);
      }
      const transform = `translate(${x}px, ${y}px)`;
      for (const node of eyeNodesRef.current) {
        node.style.transform = transform;
        node.style.transformBox = 'fill-box';
        node.style.transformOrigin = 'center';
      }
    };

    const tick = () => {
      const current = lookCurrentRef.current;
      const target = bursting ? { x: 0, y: 0 } : lookTargetRef.current;
      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;
      if (Math.abs(current.x) < 0.02) current.x = 0;
      if (Math.abs(current.y) < 0.02) current.y = 0;
      applyLook(current.x, current.y);
      raf = window.requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const host = hostRef.current;
      if (!host || bursting) {
        lookTargetRef.current = { x: 0, y: 0 };
        return;
      }
      const box = host.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(LOOK_MAX, dist * 0.045);
      lookTargetRef.current = {
        x: clamp((dx / dist) * reach, -LOOK_MAX, LOOK_MAX),
        y: clamp((dy / dist) * reach, -LOOK_MAX, LOOK_MAX),
      };
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.cancelAnimationFrame(raf);
    };
  }, [bursting]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const svg = hostRef.current?.querySelector('svg');
      if (exploded) {
        animationRef.current?.pause();
        if (svg) {
          try {
            const next = await sampleParticles(svg);
            if (cancelled) return;
            if (next.length) {
              setParticles(next);
              setBursting(true);
              return;
            }
          } catch {
            // keep the looping skull if we cannot snapshot it
          }
        }
        if (!cancelled) animationRef.current?.play();
        return;
      }

      setBursting(false);
      window.setTimeout(() => {
        if (cancelled) return;
        setParticles([]);
        animationRef.current?.play();
      }, 820);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [exploded]);

  const hideSource = exploded || bursting;

  return (
    <>
      <div ref={hostRef} className={cn(className, hideSource && 'opacity-0')} aria-hidden />
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-[60] overflow-visible">
            <AnimatePresence>
              {particles.map((particle) => (
                <motion.span
                  key={particle.id}
                  className="absolute rounded-full bg-[#020617]"
                  style={{
                    left: particle.x,
                    top: particle.y,
                    width: particle.size,
                    height: particle.size,
                    boxShadow: '0 0 0 1.25px #000, 0 0 0 2px rgba(15,23,42,0.35)',
                  }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                  animate={
                    bursting
                      ? {
                          x: particle.dx,
                          y: particle.dy,
                          opacity: 0.95,
                          scale: 0.85,
                          rotate: particle.rotate,
                        }
                      : { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }
                  }
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    duration: bursting ? 0.78 : 0.82,
                    delay: particle.delay,
                    ease: bursting ? [0.16, 1, 0.3, 1] : [0.22, 1, 0.36, 1],
                  }}
                />
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </>
  );
}
