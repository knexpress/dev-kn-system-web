'use client';

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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Truck } from 'lucide-react';
import { useActivityBadges } from '@/hooks/use-activity-badges';
import { UserNav } from './user-nav';

export default function AppSidebar() {
  const { department } = useAuth();
  const pathname = usePathname();
  const { hasNew, markSeen } = useActivityBadges();
  const navLinks = getNavigationLinks(department);

  // Map sidebar links to activity keys
  const activityKeyForHref = (href: string): string | undefined => {
    const map: Record<string, string> = {
      '/dashboard/invoices': 'invoices',
      '/dashboard/invoice-requests': 'invoice_requests',
      '/dashboard/requests': 'requests',
      '/dashboard/delivery-assignments': 'delivery_assignments',
      '/dashboard/tickets': 'tickets',
      '/dashboard/collections': 'collections',
      '/dashboard/jobs': 'jobs',
      '/dashboard/cash-flow': 'cash_flow',
      '/dashboard/reports/audit': 'reports',
    };
    return map[href];
  };

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border/50 bg-gradient-to-r from-sidebar-background to-sidebar-accent/10">
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-primary/20 shadow-lg">
            <Truck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-sidebar-foreground">KNEX</span>
            <span className="text-xs text-sidebar-foreground/60 font-medium">Logistics System</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-5">
        <SidebarMenu className="space-y-1.5">
          {navLinks.map((link) => {
            const activityKey = activityKeyForHref(link.href);
            const hasNewFlag = activityKey ? hasNew[activityKey] : false;
            const isActive = pathname === link.href;
            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={{ children: link.label }}
                  className="group relative transition-industrial hover:bg-sidebar-accent/60 data-[active=true]:bg-gradient-to-r data-[active=true]:from-sidebar-accent data-[active=true]:to-sidebar-accent/80 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-semibold data-[active=true]:shadow-md"
                >
                  <Link 
                    href={link.href} 
                    className="flex items-center justify-between w-full px-3 py-3 rounded-lg"
                    onClick={() => {
                      if (activityKey) markSeen(activityKey);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                        isActive 
                          ? 'bg-primary/20 text-primary shadow-sm' 
                          : 'bg-sidebar-accent/30 text-sidebar-foreground/70 group-hover:bg-primary/20 group-hover:text-primary'
                      }`}>
                        <link.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{link.label}</span>
                    </div>
                    {hasNewFlag && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto h-6 min-w-[10px] rounded-full px-2 text-[10px] font-bold flex items-center justify-center transition-industrial hover:scale-110 shadow-sm"
                      >
                        •
                      </Badge>
                    )}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1.5 rounded-r-full bg-primary shadow-lg" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 px-3 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-center">
          <UserNav />
        </div>
        <div className="flex items-center justify-center">
          <span className="text-xs text-sidebar-foreground/60 font-medium">
            Version 1.8.1
          </span>
        </div>
      </SidebarFooter>
    </>
  );
}
