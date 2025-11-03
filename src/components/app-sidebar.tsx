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
      <SidebarHeader>
        <div className="flex h-8 items-center gap-2 px-2">
            <Truck className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-white">KNEX</span>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarMenu>
          {navLinks.map((link) => {
            const notificationCount = getNotificationCount(link.href);
            return (
              <SidebarMenuItem key={link.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === link.href}
                  tooltip={{ children: link.label }}
                >
                  <Link href={link.href} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <link.icon />
                      <span>{link.label}</span>
                    </div>
                    {notificationCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 w-5 rounded-full p-0 text-xs">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Badge>
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
