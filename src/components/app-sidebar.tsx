'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getNavigationLinks } from '@/lib/navigation';
import {
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useActivityBadges } from '@/hooks/use-activity-badges';
import { UserNav } from './user-nav';
import { cn } from '@/lib/utils';

export default function AppSidebar() {
  const { department, userProfile } = useAuth();
  const pathname = usePathname();
  const { hasNew, markSeen } = useActivityBadges();
  const navLinks = getNavigationLinks(department);

  const activityKeyForHref = (href: string): string | undefined => {
    const map: Record<string, string> = {
      '/dashboard/invoices': 'invoices',
      '/dashboard/invoice-requests': 'invoice_requests',
      '/dashboard/requests': 'requests',
      '/dashboard/delivery-assignments': 'delivery_assignments',
      '/dashboard/collections': 'collections',
      '/dashboard/jobs': 'jobs',
      '/dashboard/reports/audit': 'reports',
    };
    return map[href];
  };

  const isLinkActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <SidebarHeader className="border-b border-white/10 bg-gradient-to-b from-emerald-950/40 to-transparent p-4">
        <Link href="/dashboard" className="group flex items-center gap-3 rounded-2xl px-1 py-1 transition-colors">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black ring-1 ring-white/15 shadow-lg shadow-black/30">
            <Image
              src="/KNEXPRESSGREEN.png"
              alt="KN Express"
              width={44}
              height={44}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">
              KN Express
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {department?.name || 'Workspace'}
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Navigation
        </p>
        <SidebarMenu className="gap-1">
          {navLinks.map((link) => {
            const activityKey = activityKeyForHref(link.href);
            const hasNewFlag = activityKey ? hasNew[activityKey] : false;
            const isActive = isLinkActive(link.href);
            const Icon = link.icon;

            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={{ children: link.label }}
                  className={cn(
                    'h-auto rounded-2xl px-0 py-0 transition-all duration-200',
                    'hover:bg-transparent data-[active=true]:bg-transparent'
                  )}
                >
                  <Link
                    href={link.href}
                    onClick={() => {
                      if (activityKey) markSeen(activityKey);
                    }}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-200',
                      isActive
                        ? 'bg-emerald-500/15 text-white'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400" />
                    )}
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                        isActive
                          ? 'bg-emerald-500/25 text-emerald-300'
                          : 'text-slate-500 group-hover:text-slate-300'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm tracking-tight',
                        isActive ? 'font-semibold' : 'font-medium'
                      )}
                    >
                      {link.label}
                    </span>
                    {hasNewFlag && (
                      <span className="flex h-2 w-2 shrink-0 rounded-full bg-rose-400 shadow-[0_0_0_3px_rgba(251,113,133,0.25)]" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-3">
        <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <UserNav variant="sidebar" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {userProfile?.full_name?.split(' ')[0] || 'User'}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {userProfile?.email || 'Signed in'}
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] tracking-wide text-slate-500">
            v1.8.1
          </p>
        </div>
      </SidebarFooter>
    </>
  );
}
