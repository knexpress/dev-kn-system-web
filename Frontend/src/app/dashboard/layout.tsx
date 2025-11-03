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
      <SidebarProvider>
        <Sidebar>
          <AppSidebar />
        </Sidebar>
        <SidebarInset className="flex flex-col">
          <AppHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NotificationProvider>
  );
}