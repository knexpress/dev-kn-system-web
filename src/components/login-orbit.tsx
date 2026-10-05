import type { CSSProperties } from 'react';
import Image from 'next/image';
import {
  Banknote,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CloudSun,
  DollarSign,
  FileCheck2,
  FileCode,
  FileDown,
  FileSearch,
  FileSpreadsheet,
  FileText,
  History,
  Layers,
  LayoutDashboard,
  MapPin,
  Package,
  PieChart,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UserCircle,
  Users,
  Wallet,
  Workflow,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SYSTEM_ICONS: LucideIcon[] = [
  LayoutDashboard,
  Users,
  Package,
  FileText,
  UserCircle,
  FileCheck2,
  FileSearch,
  Truck,
  ClipboardCheck,
  XCircle,
  DollarSign,
  History,
  FileDown,
  BookOpen,
  Receipt,
  Layers,
  Boxes,
  Banknote,
  ClipboardList,
  Wallet,
  PieChart,
  Building2,
  ShoppingCart,
  FileCode,
  FileSpreadsheet,
  ShieldCheck,
  Workflow,
  Bell,
  Search,
  CloudSun,
  MapPin,
  CalendarDays,
];

const TONES = [
  'bg-slate-900 text-white shadow-slate-900/30',
  'bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-emerald-700/30',
  'bg-gradient-to-br from-[#8B83FF] to-[#4A3FE0] text-white shadow-indigo-600/30',
  'bg-white/90 text-slate-700 ring-1 ring-slate-200/80 shadow-slate-400/20',
  'bg-gradient-to-br from-amber-200 via-rose-300 to-sky-300 text-white shadow-rose-400/30',
  'bg-gradient-to-br from-sky-100 to-blue-300 text-blue-900 shadow-blue-400/25',
  'bg-gradient-to-br from-fuchsia-300 to-pink-500 text-white shadow-pink-500/30',
  'bg-gradient-to-br from-slate-100 to-slate-300 text-slate-600 shadow-slate-400/20',
  'bg-gradient-to-br from-zinc-700 to-zinc-950 text-emerald-300 shadow-zinc-900/30',
] as const;

/** Deterministic PRNG so the server and client render the same scramble. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Tile = {
  Icon: LucideIcon;
  tone: string;
  size: number;
  tilt: number;
  far: boolean;
  bob: number;
  delay: number;
};

function scrambleTiles(total: number, seed: number): Tile[] {
  const rand = mulberry32(seed);
  const shuffle = <T,>(items: readonly T[]) => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const icons = shuffle(SYSTEM_ICONS);
  const tones = shuffle(TONES);
  return Array.from({ length: total }, (_, i) => {
    const far = rand() < 0.28;
    return {
      Icon: icons[i % icons.length],
      tone: tones[i % tones.length],
      size: Math.round((far ? 40 : 54) + rand() * (far ? 14 : 30)),
      tilt: Math.round(-28 + rand() * 56),
      far,
      bob: 2.5 + rand() * 2.5,
      delay: rand() * 4,
    };
  });
}

const TILES = scrambleTiles(30, 20260928);
const INNER = TILES.slice(0, 12);
const OUTER = TILES.slice(12);

function Ring({
  tiles,
  radius,
  duration,
  clockwise,
  offset,
}: {
  tiles: Tile[];
  radius: string;
  duration: number;
  clockwise: boolean;
  offset: number;
}) {
  const spin = clockwise ? 'normal' : 'reverse';
  const counter = clockwise ? 'reverse' : 'normal';

  return (
    <div
      className="orbit-ring"
      style={{ '--orbit-dur': `${duration}s`, animationDirection: spin } as CSSProperties}
    >
      {tiles.map((tile, i) => {
        const angle = offset + (360 / tiles.length) * i;
        const { Icon } = tile;
        return (
          <div
            key={i}
            className="orbit-slot"
            style={{ transform: `rotate(${angle}deg) translateX(${radius}) rotate(${-angle}deg)` }}
          >
            <div
              className="orbit-upright"
              style={{ '--orbit-dur': `${duration}s`, animationDirection: counter } as CSSProperties}
            >
              <div
                className="orbit-bob"
                style={
                  {
                    '--bob-dur': `${tile.bob}s`,
                    animationDelay: `-${tile.delay}s`,
                  } as CSSProperties
                }
              >
                <div
                  className={cn(
                    'orbit-tile flex items-center justify-center rounded-[22%] shadow-xl',
                    tile.tone,
                    tile.far && 'blur-[1.5px]'
                  )}
                  style={
                    {
                      width: tile.size,
                      height: tile.size,
                      '--tilt': `${tile.tilt}deg`,
                      '--tile-opacity': tile.far ? 0.5 : 1,
                      animationDelay: `${0.15 + i * 0.06}s`,
                    } as CSSProperties
                  }
                >
                  <Icon className="h-[44%] w-[44%]" strokeWidth={1.75} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LoginOrbit() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <Image
        src="/Global Airfreight Operations at Dusk.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-45 saturate-[0.85] dark:opacity-50 [mask-image:linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.85)_40%,rgba(0,0,0,0.25)_75%,transparent_95%)]"
      />
      <Ring tiles={OUTER} radius="clamp(520px, 46vw, 860px)" duration={90} clockwise={false} offset={10} />
      <Ring tiles={INNER} radius="clamp(340px, 30vw, 540px)" duration={55} clockwise offset={0} />
      <div className="absolute left-1/2 top-1/2 h-[860px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(247,246,244,0.96),rgba(247,246,244,0.75)_62%,rgba(247,246,244,0))] dark:bg-[radial-gradient(closest-side,rgba(14,16,22,0.94),rgba(14,16,22,0.7)_62%,rgba(14,16,22,0))]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F7F6F4] to-transparent dark:from-canvas" />
    </div>
  );
}
