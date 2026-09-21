'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import { getNavigationLinks } from '@/lib/navigation';
import { useAuth } from '@/hooks/use-auth';
import DashboardWeather from '@/components/dashboard-weather';
import { ChevronRight } from 'lucide-react';

export default function AppHeader() {
  const pathname = usePathname();
  const { department, userProfile } = useAuth();
  const navLinks = getNavigationLinks(department);
  const currentLink = navLinks.find(
    (link) =>
      link.href === pathname ||
      (link.href !== '/dashboard' && pathname.startsWith(`${link.href}/`))
  );
  const pageTitle = currentLink ? currentLink.label : 'Dashboard';
  const firstName = userProfile?.full_name?.split(' ')[0];

  return (
    <header className="sticky top-0 z-10 flex h-[4.25rem] items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 sm:px-6">
      <SidebarTrigger className="h-10 w-10 rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700" />

      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
            <span>Workspace</span>
            {department?.name && (
              <>
                <ChevronRight className="h-3 w-3 text-slate-300" />
                <span className="truncate text-emerald-700/80">{department.name}</span>
              </>
            )}
          </div>
          <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {pageTitle}
          </h1>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="max-w-[220px]">
            <DashboardWeather variant="compact" />
          </div>
          {firstName && (
            <div className="hidden rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 lg:block">
              Hi, {firstName}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
