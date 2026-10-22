'use client';

import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { getNavigationLinks } from '@/lib/navigation';
import PerformanceMetrics from '@/components/performance-metrics';
import DashboardWeather from '@/components/dashboard-weather';
import EmpostPendingWidget from '@/components/empost-pending-widget';
import { MotivationQuote } from '@/components/motivation-quote';
import { WorldClock } from '@/components/world-clock';
import { openCommandPalette } from '@/components/command-palette';
import {
  MagloModuleTile,
  MagloSectionLabel,
} from '@/components/dashboard/maglo-shell';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { userProfile, department } = useAuth();

  const quickLinks = getNavigationLinks(department).filter((link) => link.href !== '/dashboard');
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';

  if (!userProfile || !department) {
    return null;
  }

  const firstName = userProfile?.full_name?.split(' ')[0] || 'User';
  const featured = quickLinks.slice(0, 3);
  const showMetrics =
    department.name !== 'Operations' &&
    department.name !== 'Sales' &&
    department.name !== 'Finance';

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-5 xl:grid-cols-12">
        <div className="flex flex-col justify-center gap-3 px-1 xl:col-span-4">
          <p className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
            Hi, {firstName}!
            <span className="inline-flex -space-x-1.5">
              <span className="h-5 w-5 rounded-full border-[3px] border-brand-500 bg-white" />
              <span className="h-5 w-5 rounded-full border-[3px] border-brand-300 bg-white" />
            </span>
          </p>
          <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-[36px]">
            What are your plans for today?
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-slate-400">
            {greetingForHour(new Date().getHours())} —{' '}
            {department.name === 'Management'
              ? 'here is your company-wide overview and quick access to every module.'
              : `your ${department.name} workspace is ready. Jump into a module below.`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:col-span-8">
          <button
            type="button"
            onClick={openCommandPalette}
            className="group flex min-h-[170px] items-center justify-center rounded-[28px] bg-brand-50 transition-colors hover:bg-brand-100"
            aria-label="Open search"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/40 transition-transform group-hover:scale-105">
              <Plus className="h-5 w-5" />
            </span>
          </button>
          {featured.map((link) => (
            <MagloModuleTile
              key={link.href}
              href={link.href}
              title={link.label}
              description={`Open ${link.label.toLowerCase()}`}
              icon={link.icon}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-12">
        <MotivationQuote
          firstName={firstName}
          department={department.name}
          className="md:col-span-2 xl:col-span-4"
        />
        <WorldClock className="xl:col-span-4" />
        <div className="flex flex-col xl:col-span-4">
          <DashboardWeather variant="large" />
        </div>
      </section>

      {isSuperAdmin && <EmpostPendingWidget />}

      {showMetrics && <PerformanceMetrics department={department.name as any} />}

      <section className="space-y-4">
        <div className="px-1">
          <MagloSectionLabel>Quick access</MagloSectionLabel>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">All modules</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {quickLinks.map((link) => (
            <MagloModuleTile
              key={link.href}
              href={link.href}
              title={link.label}
              description={`Open ${link.label.toLowerCase()}`}
              icon={link.icon}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
