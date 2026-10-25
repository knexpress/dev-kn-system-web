'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useActivityBadges } from '@/hooks/use-activity-badges';
import { useQuotationRequestAlerts } from '@/hooks/use-quotation-request-alerts';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppSidebar from '@/components/app-sidebar';
import AppHeader from '@/components/app-header';
import { ChangePasswordModal } from '@/components/change-password-modal';
import { getFooterLinks, isNavLinkActive } from '@/lib/navigation';
import { cn } from '@/lib/utils';

function DashboardFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hasNew: activityHasNew, markSeen } = useActivityBadges();
  const { userProfile, department } = useAuth();
  const footerLinks = getFooterLinks(department);
  const { pendingCount } = useQuotationRequestAlerts(userProfile?.department?.name === 'Finance');
  const hasNew = useMemo(
    () => ({ ...activityHasNew, quotation_requests: pendingCount > 0 }),
    [activityHasNew, pendingCount]
  );
  const [railOpen, setRailOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex min-h-svh w-full bg-canvas">
        <AppSidebar hasNew={hasNew} markSeen={markSeen} onOpenChange={setRailOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader hasNew={hasNew} markSeen={markSeen} />
          <main
            className={cn(
              'relative flex w-full min-w-0 flex-1 flex-col overflow-x-auto px-[clamp(1rem,2.5vw,2.5rem)] pb-6 pt-2',
              railOpen && 'pointer-events-none'
            )}
          >
            {railOpen && (
              <div
                aria-hidden
                className="absolute inset-0 z-20 bg-white/45 backdrop-blur-md"
              />
            )}
            <div className="w-full max-w-none flex-1 space-y-6">{children}</div>
            {footerLinks.length > 0 && (
              <footer className="mt-10 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-slate-200/70 pt-4 dark:border-white/10">
                {footerLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isNavLinkActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'text-brand-600 dark:text-brand-400'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {link.label}
                    </Link>
                  );
                })}
              </footer>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userProfile, loading, requiresPasswordChange, clearPasswordChangeRequirement } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!userProfile) {
      router.replace('/');
    }
  }, [userProfile, loading, router]);

  if (loading || !userProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <Loader2 className="h-10 w-10 animate-spin text-brand-500" />
      </div>
    );
  }

  const handlePasswordChanged = () => {
    clearPasswordChangeRequirement();
    // Optionally refresh user data
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <NotificationProvider>
      <DashboardFrame>{children}</DashboardFrame>
      <ChangePasswordModal 
        open={requiresPasswordChange} 
        onPasswordChanged={handlePasswordChanged}
      />
    </NotificationProvider>
  );
}
