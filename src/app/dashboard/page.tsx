'use client';

import { useAuth } from '@/hooks/use-auth';
import { getNavigationLinks } from '@/lib/navigation';
import PerformanceMetrics from '@/components/performance-metrics';
import DashboardWeather from '@/components/dashboard-weather';
import EmpostPendingWidget from '@/components/empost-pending-widget';
import { MotivationQuote } from '@/components/motivation-quote';
import {
  MagloHero,
  MagloModuleTile,
  MagloSectionLabel,
} from '@/components/dashboard/maglo-shell';

export default function Dashboard() {
  const { userProfile, department } = useAuth();

  const quickLinks = getNavigationLinks(department).filter((link) => link.href !== '/dashboard');
  const isSuperAdmin = userProfile?.role === 'SUPERADMIN';

  if (!userProfile || !department) {
    return null;
  }

  const firstName = userProfile?.full_name?.split(' ')[0] || 'User';

  return (
    <div className="-mx-2 flex flex-col gap-6 sm:-mx-1">
      <MagloHero
        eyebrow="Workspace"
        title={`Welcome back, ${firstName}`}
        subtitle={
          department.name === 'Management'
            ? 'Company-wide performance overview and strategic insights.'
            : `Performance overview for the ${department.name} department.`
        }
        actions={
          <div className="w-full max-w-md sm:w-auto">
            <DashboardWeather variant="large" />
          </div>
        }
      />

      <MotivationQuote firstName={firstName} department={department.name} />

      {isSuperAdmin && <EmpostPendingWidget />}

      {department.name !== 'Operations' &&
        department.name !== 'Sales' &&
        department.name !== 'Finance' && (
          <PerformanceMetrics department={department.name as any} />
        )}

      <div className="space-y-4">
        <div>
          <MagloSectionLabel>Quick access</MagloSectionLabel>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Modules</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {quickLinks.map((link, idx) => (
            <MagloModuleTile
              key={link.href}
              href={link.href}
              title={link.label}
              description={`Open ${link.label.toLowerCase()}`}
              icon={link.icon}
              index={idx}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
