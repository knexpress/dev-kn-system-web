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
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 sm:px-6 industrial-shadow">
      <SidebarTrigger className="transition-industrial hover:bg-accent/10" />
      <div className="flex items-center gap-3">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{pageTitle}</h1>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <UserNav />
      </div>
    </header>
  );
}
