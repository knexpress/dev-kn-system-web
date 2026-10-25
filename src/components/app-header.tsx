'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, LayoutDashboard, Menu, Search } from 'lucide-react';
import { ThemeControls } from '@/components/theme/theme-controls';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  activityKeyForHref,
  getNavigationLinks,
  getRailLinks,
  isNavLinkActive,
  type NavLink,
} from '@/lib/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { CommandPalette, OPEN_SEARCH_EVENT } from '@/components/command-palette';
import { BrandMark, type ActivityBadgeProps } from '@/components/app-sidebar';
import { UserNav } from './user-nav';
import { cn } from '@/lib/utils';

function HeaderTab({ link, active }: { link: Pick<NavLink, 'href' | 'label' | 'icon'>; active: boolean }) {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      className={cn(
        'relative flex items-center gap-2 px-1 py-2 text-sm transition-colors',
        active ? 'font-semibold text-slate-900' : 'font-medium text-slate-400 hover:text-slate-700'
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="max-w-[180px] truncate">{link.label}</span>
      {active && (
        <span className="absolute inset-x-1 -bottom-0.5 h-[2px] rounded-full bg-slate-900 dark:bg-brand-400" />
      )}
    </Link>
  );
}

function timeAgo(iso?: string) {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AppHeader({ hasNew, markSeen }: ActivityBadgeProps) {
  const pathname = usePathname();
  const { department, userProfile } = useAuth();
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const navLinks = getNavigationLinks(department);
  const railLinks = getRailLinks(department);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentLink = navLinks.find(
    (link) => link.href !== '/dashboard' && isNavLinkActive(pathname, link.href)
  );
  const onDashboard = pathname === '/dashboard';
  const firstName = userProfile?.full_name?.split(' ')[0];

  const activity = navLinks
    .map((link) => ({ link, key: activityKeyForHref(link.href) }))
    .filter((a): a is { link: NavLink; key: string } => !!a.key && !!hasNew[a.key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    const onOpen = () => setSearchOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="no-print sticky top-0 z-30 bg-canvas/85 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/70">
      <div className="flex h-[clamp(4.5rem,10vh,5.25rem)] w-full min-w-0 items-center gap-2 px-[clamp(0.75rem,2.5vw,2rem)] sm:gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/70 md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav className="hidden min-w-0 items-center gap-5 lg:flex" aria-label="Current location">
          <HeaderTab
            link={{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }}
            active={onDashboard}
          />
          {currentLink && <HeaderTab link={currentLink} active />}
        </nav>

        <p className="min-w-0 truncate text-base font-semibold text-slate-900 lg:hidden">
          {currentLink?.label || 'Dashboard'}
        </p>

        <span className="shrink-0 text-[11px] font-medium tracking-wide text-slate-400">v2.0.0</span>

        <div className="flex flex-1 justify-end lg:justify-center">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group flex h-11 w-11 items-center justify-center gap-3 rounded-full bg-white text-sm text-slate-400 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-slate-200/70 transition-all hover:ring-brand-200 sm:w-full sm:max-w-[min(26rem,42vw)] sm:justify-start sm:px-4"
            aria-label="Search"
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-500" />
            <span className="hidden flex-1 text-left sm:block">Search or type command</span>
            <kbd className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:block">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {department?.name && (
            <span className="hidden items-center gap-1.5 rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/30 xl:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              {department.name}
            </span>
          )}

          <ThemeControls className="-mr-1 sm:-mr-2" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                {(unreadCount > 0 || activity.length > 0) && (
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-canvas" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-2xl border-slate-200/70 p-2">
              <div className="flex items-center justify-between px-2">
                <DropdownMenuLabel className="px-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Notifications
                </DropdownMenuLabel>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllRead()}
                    className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              {items.length === 0 && activity.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-slate-400">You’re all caught up</p>
              ) : (
                <>
                  {items.slice(0, 8).map((item) => (
                    <DropdownMenuItem key={item._id} asChild className="cursor-pointer rounded-xl p-2">
                      <Link href={item.href || '/dashboard'} onClick={() => markRead(item._id)}>
                        <span className="flex w-full items-start gap-3">
                          <span
                            className={cn(
                              'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                              item.is_read ? 'bg-slate-200' : 'bg-rose-500'
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-slate-800">{item.title}</span>
                            <span className="block text-xs text-slate-400">{item.message}</span>
                            <span className="mt-0.5 block text-[11px] text-slate-300">{timeAgo(item.createdAt)}</span>
                          </span>
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  {activity.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Activity
                      </DropdownMenuLabel>
                      {activity.map(({ link, key }) => {
                        const Icon = link.icon;
                        return (
                          <DropdownMenuItem key={link.href} asChild className="rounded-xl p-2">
                            <Link href={link.href} onClick={() => markSeen(key)}>
                              <span className="mr-3 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="flex-1">
                                <span className="block text-sm font-medium text-slate-800">{link.label}</span>
                                <span className="block text-xs text-slate-400">New updates</span>
                              </span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2.5 rounded-full bg-white py-1 pl-1 pr-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ring-1 ring-slate-200/70 sm:pr-4">
            <UserNav />
            {firstName && (
              <span className="hidden text-sm font-semibold text-slate-800 sm:block">{firstName}</span>
            )}
          </div>
        </div>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} links={navLinks} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[290px] border-0 bg-canvas p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex items-center gap-3 px-5 py-5">
            <BrandMark className="h-11 w-11" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">KN Express</p>
              <p className="truncate text-xs text-slate-400">{department?.name || 'Workspace'}</p>
            </div>
          </div>
          <nav className="mx-3 rounded-[28px] bg-brand-500 p-3 shadow-[0_24px_48px_-20px_rgba(91,78,245,0.65)]">
            <ul className="flex max-h-[calc(100svh-140px)] flex-col gap-1 overflow-y-auto scrollbar-hide">
              {railLinks.map((link) => {
                const Icon = link.icon;
                const active = isNavLinkActive(pathname, link.href);
                const key = activityKeyForHref(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => key && markSeen(key)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors',
                        active
                          ? 'bg-white font-semibold text-brand-600'
                          : 'font-medium text-white/80 hover:bg-white/15 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 truncate">{link.label}</span>
                      {key && hasNew[key] && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
