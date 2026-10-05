'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useActivityBadges } from '@/hooks/use-activity-badges';
import { useQuotationRequestAlerts } from '@/hooks/use-quotation-request-alerts';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppSidebar from '@/components/app-sidebar';
import AppHeader from '@/components/app-header';
import { ChangePasswordModal } from '@/components/change-password-modal';

function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { hasNew: activityHasNew, markSeen } = useActivityBadges();
  const { userProfile } = useAuth();
  const { pendingCount } = useQuotationRequestAlerts(userProfile?.department?.name === 'Finance');
  const hasNew = useMemo(
    () => ({ ...activityHasNew, quotation_requests: pendingCount > 0 }),
    [activityHasNew, pendingCount]
  );

  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex min-h-svh w-full bg-canvas">
        <AppSidebar hasNew={hasNew} markSeen={markSeen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader hasNew={hasNew} markSeen={markSeen} />
          <main className="w-full min-w-0 flex-1 overflow-x-hidden px-4 pb-10 pt-2 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1600px] space-y-6">{children}</div>
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
