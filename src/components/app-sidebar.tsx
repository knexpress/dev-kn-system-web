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
      <SidebarHeader className="border-b border-sidebar-border/50">
        <div className="flex h-12 items-center gap-3 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">KNEX</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarMenu className="space-y-1">
          {navLinks.map((link) => {
            const notificationCount = getNotificationCount(link.href);
            const isActive = pathname === link.href;
            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={{ children: link.label }}
                  className="group relative transition-industrial hover:bg-sidebar-accent/50 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-semibold"
                >
                  <Link 
                    href={link.href} 
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <link.icon className="h-4 w-4 transition-colors group-hover:text-primary" />
                      <span className="text-sm">{link.label}</span>
                    </div>
                    {notificationCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto h-5 min-w-[20px] rounded-full px-1.5 text-xs font-semibold flex items-center justify-center transition-industrial hover:scale-110"
                      >
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Badge>
                    )}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
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
