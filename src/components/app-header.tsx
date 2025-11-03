'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from './user-nav';
import { usePathname } from 'next/navigation';
import { getNavigationLinks } from '@/lib/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function AppHeader() {
  const pathname = usePathname();
  const { department } = useAuth();
  const navLinks = getNavigationLinks(department);
  const currentLink = navLinks.find(link => link.href === pathname);
  const pageTitle = currentLink ? currentLink.label : 'Dashboard';

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <SidebarTrigger className="sm:hidden" />
      <h1 className="text-xl font-semibold">{pageTitle}</h1>
      <div className="ml-auto flex items-center gap-2">
        <UserNav />
      </div>
    </header>
  );
}
