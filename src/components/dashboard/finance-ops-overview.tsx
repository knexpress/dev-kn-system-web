'use client';

import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Package,
  Receipt,
  Server,
  ShieldAlert,
  Sparkles,
  Wifi,
  XCircle,
} from 'lucide-react';
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type TrendPoint = {
  day: string;
  invoices: number;
  quotations: number;
  cancelled: number;
};

type ApprovalItem = {
  kind: string;
  href: string;
  title: string;
  subtitle: string;
  createdAt?: string;
  amount?: number;
};

type HealthItem = {
  name: string;
  key: string;
  ok: boolean | null;
  status: 'up' | 'down' | 'unknown';
  detail: string;
  latencyMs?: number;
  dashboardUrl?: string | null;
};

type OverviewData = {
  totals: {
    pendingInvoices: number;
    quotationRequests: number;
    cancelledRequests: number;
    pendingApprovals: number;
  };
  trend: TrendPoint[];
  approvals: ApprovalItem[];
  health: HealthItem[];
};

const easeOut = [0.22, 1, 0.36, 1] as const;

const container = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: easeOut, staggerChildren: 0.08 },
  },
};

const itemVariant = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: easeOut } },
};

function formatDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function formatWhen(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(value?: number) {
  if (!value) return '';
  return `AED ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AnimatedNumber({ value }: { value?: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (latest) => Math.round(latest).toLocaleString());
  const [display, setDisplay] = useState('—');

  useEffect(() => rounded.on('change', setDisplay), [rounded]);

  useEffect(() => {
    if (value == null) {
      setDisplay('—');
      return;
    }
    setDisplay(Math.round(value).toLocaleString());
    const controls = animate(motionVal, value, { duration: 1.15, ease: 'easeOut' });
    return controls.stop;
  }, [motionVal, value]);

  return <motion.span>{display}</motion.span>;
}

function MiniSpark({ values, color }: { values: number[]; color: string }) {
  const path = useMemo(() => {
    if (!values.length) return '';
    const max = Math.max(...values, 1);
    return values
      .map((v, i) => {
        const x = values.length === 1 ? 50 : (i / (values.length - 1)) * 100;
        const y = 26 - (v / max) * 22;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [values]);

  return (
    <svg viewBox="0 0 100 28" className="h-8 w-full overflow-visible" aria-hidden>
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: easeOut }}
      />
    </svg>
  );
}

export default function FinanceOpsOverview() {
  const reduceMotion = useReducedMotion();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mouseX = useMotionValue(240);
  const mouseY = useMotionValue(80);
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${mouseX}px ${mouseY}px, rgba(91,78,245,0.16), transparent 55%)`;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const result = await apiClient.getDashboardOverview();
      if (cancelled) return;
      if (!result.success || !result.data) {
        setError(result.error || 'Could not load operations snapshot');
        return;
      }
      setError(null);
      setData(result.data as OverviewData);
    };

    load();
    const timer = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const totals = data?.totals;
  const chart = (data?.trend || []).map((row) => ({
    ...row,
    label: formatDay(row.day),
  }));
  const invoicesSpark = chart.map((row) => row.invoices);
  const quotesSpark = chart.map((row) => row.quotations);
  const cancelledSpark = chart.map((row) => row.cancelled);

  const onMove = (event: MouseEvent<HTMLElement>) => {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left);
    mouseY.set(event.clientY - rect.top);
  };

  return (
    <motion.section
      variants={reduceMotion ? undefined : container}
      initial={reduceMotion ? false : 'hidden'}
      animate="show"
      onMouseMove={onMove}
      className="relative isolate overflow-hidden rounded-[36px] border border-white/80 bg-white/80 p-5 shadow-[0_24px_80px_-40px_rgba(43,38,120,0.45)] sm:p-7"
    >
      <motion.div
        aria-hidden
        style={{ backgroundImage: spotlight }}
        className="pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="ops-live-shimmer pointer-events-none absolute -left-1/3 top-0 h-40 w-[160%] opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(90deg, transparent, rgba(91,78,245,0.08), rgba(14,165,233,0.08), transparent)',
        }}
      />

      <motion.div variants={itemVariant} className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-500">
            <Sparkles className="h-3.5 w-3.5" />
            Operations snapshot
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
            Approvals, queues, and system health
          </h2>
        </div>
        <motion.span
          animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-600"
        >
          <span className="relative flex h-2 w-2">
            <span className="ops-pulse-ring absolute inset-0 rounded-full bg-emerald-400" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live feed
        </motion.span>
      </motion.div>

      {error && (
        <motion.p variants={itemVariant} className="relative mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </motion.p>
      )}

      <div className="relative grid gap-4 md:grid-cols-3">
        <StatCard
          href="/dashboard/invoice-requests"
          icon={Package}
          label="Pending invoices"
          hint="Verified shipments waiting for invoice generation"
          value={totals?.pendingInvoices}
          spark={invoicesSpark}
          color="#5B4EF5"
        />
        <StatCard
          href="/dashboard/quotations"
          icon={Receipt}
          label="Quotation requests"
          hint="Requested by Operations and waiting on Finance"
          value={totals?.quotationRequests}
          spark={quotesSpark}
          color="#0EA5E9"
        />
        <StatCard
          href="/dashboard/quotations"
          icon={XCircle}
          label="Cancelled requests"
          hint="Shipments and quotation jobs marked cancelled"
          value={totals?.cancelledRequests}
          spark={cancelledSpark}
          color="#F43F5E"
        />
      </div>

      <div className="relative mt-4 grid gap-4 xl:grid-cols-12">
        <motion.div
          variants={itemVariant}
          whileHover={reduceMotion ? undefined : { y: -4 }}
          className="overflow-hidden rounded-[28px] border border-slate-100 bg-white/90 p-5 shadow-[0_18px_40px_-28px_rgba(43,38,120,0.35)] xl:col-span-8"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Last 14 days</p>
              <h3 className="text-base font-bold text-slate-900">New work by type</h3>
            </div>
            <motion.span
              animate={reduceMotion ? undefined : { rotate: [0, 12, -8, 0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"
            >
              <Activity className="h-4 w-4" />
            </motion.span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="invFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5B4EF5" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#5B4EF5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="quoteFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cancelFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: 'none' }} />
                <Area type="monotone" dataKey="invoices" name="Invoices" stroke="#5B4EF5" fill="url(#invFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="quotations" name="Quotations" stroke="#0EA5E9" fill="url(#quoteFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="cancelled" name="Cancelled" stroke="#F43F5E" fill="url(#cancelFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariant}
          className="flex flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white/90 p-5 shadow-[0_18px_40px_-28px_rgba(43,38,120,0.35)] xl:col-span-4"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Needs approval</p>
              <h3 className="text-base font-bold text-slate-900">
                <AnimatedNumber value={totals?.pendingApprovals} /> pending
              </h3>
            </div>
            <motion.span
              animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-500"
            >
              <ShieldAlert className="h-4 w-4" />
            </motion.span>
          </div>
          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
            className="flex min-h-0 flex-1 flex-col gap-2"
          >
            {(data?.approvals || []).length === 0 ? (
              <p className="rounded-2xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
                Nothing waiting for approval.
              </p>
            ) : (
              data?.approvals.map((approval) => (
                <motion.div
                  key={`${approval.kind}-${approval.title}-${approval.createdAt}`}
                  variants={itemVariant}
                  whileHover={reduceMotion ? undefined : { x: 6, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Link
                    href={approval.href}
                    className="group block rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 transition-colors hover:border-brand-200 hover:bg-brand-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-slate-900">{approval.title}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600">
                        {approval.kind}
                        <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {approval.subtitle}
                      {approval.amount ? ` · ${formatAmount(approval.amount)}` : ''}
                      {approval.createdAt ? ` · ${formatWhen(approval.createdAt)}` : ''}
                    </p>
                  </Link>
                </motion.div>
              ))
            )}
          </motion.div>
        </motion.div>
      </div>

      <div className="relative mt-4 grid gap-4 md:grid-cols-2">
        {(data?.health || [
          { name: 'Finance Backend', key: 'finance_backend', ok: null, status: 'unknown' as const, detail: 'Checking…' },
          { name: 'Booking Form', key: 'booking_form', ok: null, status: 'unknown' as const, detail: 'Checking…' },
        ]).map((healthItem) => (
          <HealthCard key={healthItem.key} item={healthItem} />
        ))}
      </div>
    </motion.section>
  );
}

function StatCard({
  href,
  icon: Icon,
  label,
  hint,
  value,
  spark,
  color,
}: {
  href: string;
  icon: typeof Package;
  label: string;
  hint: string;
  value?: number;
  spark: number[];
  color: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div variants={itemVariant} whileHover={reduceMotion ? undefined : { y: -8, rotate: -0.4 }} whileTap={{ scale: 0.98 }}>
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-[28px] border border-slate-100 bg-white/95 p-5 shadow-[0_18px_40px_-28px_rgba(43,38,120,0.35)]"
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20"
          style={{ background: color }}
          animate={reduceMotion ? undefined : { scale: [1, 1.15, 1], x: [0, 6, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">
              <AnimatedNumber value={value} />
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{hint}</p>
          </div>
          <motion.span
            whileHover={{ rotate: 12, scale: 1.1 }}
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ backgroundColor: color, boxShadow: `0 12px 24px -12px ${color}` }}
          >
            <Icon className="h-5 w-5" />
          </motion.span>
        </div>
        <div className="relative mt-4">
          <MiniSpark values={spark} color={color} />
        </div>
      </Link>
    </motion.div>
  );
}

function HealthCard({ item }: { item: HealthItem }) {
  const reduceMotion = useReducedMotion();
  const up = item.status === 'up';
  const down = item.status === 'down';
  const Icon = item.key === 'booking_form' ? Wifi : Server;
  const inner = (
    <motion.div
      variants={itemVariant}
      whileHover={reduceMotion ? undefined : { y: -5, scale: 1.01 }}
      className="flex items-center gap-4 rounded-[28px] border border-slate-100 bg-white/95 p-5 shadow-[0_18px_40px_-28px_rgba(43,38,120,0.35)]"
    >
      <span className="relative flex h-12 w-12 items-center justify-center">
        {(up || down) && (
          <span
            className={cn(
              'ops-pulse-ring absolute inset-1 rounded-full',
              up ? 'bg-emerald-400' : 'bg-rose-400'
            )}
          />
        )}
        <span
          className={cn(
            'relative flex h-12 w-12 items-center justify-center rounded-2xl',
            up && 'bg-emerald-50 text-emerald-600',
            down && 'bg-rose-50 text-rose-600',
            !up && !down && 'bg-amber-50 text-amber-600'
          )}
        >
          {up ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{item.name}</p>
        <p className="truncate text-xs text-slate-400">{item.detail}</p>
      </div>
      <motion.span
        animate={reduceMotion || !up ? undefined : { boxShadow: ['0 0 0 0 rgba(16,185,129,0.35)', '0 0 0 10px rgba(16,185,129,0)'] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        className={cn(
          'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
          up && 'bg-emerald-50 text-emerald-700',
          down && 'bg-rose-50 text-rose-700',
          !up && !down && 'bg-amber-50 text-amber-700'
        )}
      >
        {item.status}
      </motion.span>
    </motion.div>
  );

  if (item.dashboardUrl) {
    return (
      <a href={item.dashboardUrl} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  }
  return inner;
}
