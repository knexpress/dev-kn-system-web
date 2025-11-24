'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Loader2 } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import AppHeader from '@/components/app-header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userProfile) {
      router.push('/');
    }
  }, [userProfile, loading, router]);

  if (loading || !userProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <NotificationProvider>
      <SidebarProvider defaultOpen={true}>
        <Sidebar collapsible="offcanvas">
          <AppSidebar />
        </Sidebar>
        <SidebarInset className="flex flex-col w-full min-w-0">
          <AppHeader />
          <main 
            className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 lg:p-10 w-full min-w-0 scrollbar-hide bg-gradient-to-br from-background via-muted/10 to-background"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
              <div className="max-w-[1600px] mx-auto space-y-6">
                {children}
              </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NotificationProvider>
  );
}