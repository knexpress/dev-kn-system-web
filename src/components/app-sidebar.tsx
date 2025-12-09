'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/contexts/NotificationContext';
import { getNavigationLinks } from '@/lib/navigation';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Truck } from 'lucide-react';

export default function AppSidebar() {
  const { department } = useAuth();
  const pathname = usePathname();
  const { counts } = useNotifications();
  const navLinks = getNavigationLinks(department);

  // Debug logging
  console.log('📊 Sidebar notification counts:', counts);

  // Function to get notification count for a specific route
  const getNotificationCount = (href: string): number => {
    const routeMap: { [key: string]: keyof typeof counts } = {
      '/dashboard/invoices': 'invoices',
      '/dashboard/chat': 'chat',
      '/dashboard/tickets': 'tickets',
      '/dashboard/invoice-requests': 'invoiceRequests',
      '/dashboard/requests': 'requests',
    };
    
    const notificationType = routeMap[href];
    const count = notificationType ? counts[notificationType] : 0;
    
    if (href === '/dashboard/invoice-requests') {
      console.log(`🔍 Invoice Requests notification count: ${count} (type: ${notificationType})`);
    }
    
    return count;
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
            const notificationCount = getNotificationCount(link.href);
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
                    {notificationCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto h-6 min-w-[24px] rounded-full px-2 text-xs font-bold flex items-center justify-center transition-industrial hover:scale-110 shadow-sm"
                      >
                        {notificationCount > 99 ? '99+' : notificationCount}
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
    </>
  );
}
