'use client';

import { useState } from 'react';
import { Contact, Fingerprint, PackageSearch, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import PerformanceMetrics from '@/components/performance-metrics';
import DashboardWeather from '@/components/dashboard-weather';
import EmpostPendingWidget from '@/components/empost-pending-widget';
import { MotivationQuote } from '@/components/motivation-quote';
import { WorldClock } from '@/components/world-clock';
import { openCommandPalette } from '@/components/command-palette';
import { MagloModuleTile } from '@/components/dashboard/maglo-shell';
import FinanceOpsOverview from '@/components/dashboard/finance-ops-overview';
import { KnexSkullLottie } from '@/components/dashboard/knex-skull-lottie';
import { KnexAiChat } from '@/components/dashboard/knex-ai-chat';
import { useStarredShortcuts } from '@/hooks/use-starred-shortcuts';
import { CRM_URL, CUSTOMER_TRACKING_URL, TRUEID_BOOKING_URL } from '@/lib/navigation';
import { cn } from '@/lib/utils';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { userProfile, department } = useAuth();
  const { extras, toggle, iconForShortcut } = useStarredShortcuts();
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';
  const [aiOpen, setAiOpen] = useState(false);

  if (!userProfile || !department) {
    return null;
  }

  const firstName = userProfile?.full_name?.split(' ')[0] || 'User';
  const showMetrics =
    department.name !== 'Operations' &&
    department.name !== 'Sales' &&
    department.name !== 'Finance';

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-5 xl:grid-cols-12">
        <div className={cn('flex flex-col justify-center gap-3 px-1', extras.length ? 'xl:col-span-4' : 'xl:col-span-12')}>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="group relative -ml-2 flex w-fit flex-col items-start overflow-visible rounded-[28px] p-1 text-left transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            aria-label="Open KNEX Assistant"
          >
            <KnexSkullLottie
              exploded={aiOpen}
              className="h-[168px] w-[168px] sm:h-[200px] sm:w-[200px] [&_svg]:brightness-0 dark:[&_svg]:brightness-100"
            />
            <span
              className={cn(
                'absolute bottom-3 left-4 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition-opacity group-hover:text-brand-600',
                aiOpen && 'opacity-0'
              )}
            >
              Ask KNEX
            </span>
          </button>
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
              ? 'here is your company-wide overview.'
              : `your ${department.name} workspace is ready.`}
          </p>
          <button
            type="button"
            onClick={openCommandPalette}
            className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-100"
          >
            <Plus className="h-4 w-4" />
            Search or jump to a module
          </button>
        </div>

        {extras.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:col-span-8">
            {extras.map((shortcut) => (
              <MagloModuleTile
                key={shortcut.href}
                href={shortcut.href}
                title={shortcut.title}
                description={shortcut.description}
                icon={iconForShortcut(shortcut.href)}
                starred
                onToggleStar={() => toggle(shortcut)}
              />
            ))}
          </div>
        )}
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

      {department.name === 'Sales' ? (
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 justify-items-stretch gap-4 sm:grid-cols-3">
          <MagloModuleTile
            href={CRM_URL}
            title="CRM"
            description="Open KN Express CRM in a new tab"
            icon={Contact}
          />
          <MagloModuleTile
            href={CUSTOMER_TRACKING_URL}
            title="Customer Tracking"
            description="Open the public tracking page in a new tab"
            icon={PackageSearch}
          />
          <MagloModuleTile
            href={TRUEID_BOOKING_URL}
            title="TrueID Booking"
            description="UAE PASS booking form in a new tab"
            icon={Fingerprint}
          />
        </div>
      ) : (
        <FinanceOpsOverview />
      )}

      {isSuperAdmin && <EmpostPendingWidget />}

      {showMetrics && <PerformanceMetrics department={department.name as any} />}

      <KnexAiChat
        open={aiOpen}
        onOpenChange={setAiOpen}
        firstName={firstName}
        department={department.name}
      />
    </div>
  );
}
