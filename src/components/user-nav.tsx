'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type UserNavProps = {
  variant?: 'default' | 'sidebar';
};

export function UserNav({ variant = 'default' }: UserNavProps) {
  const { userProfile, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    logout();
    router.push('/');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (!userProfile) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'relative rounded-full p-0',
            variant === 'sidebar'
              ? 'h-10 w-10 ring-4 ring-white hover:bg-transparent'
              : 'h-9 w-9 hover:bg-transparent'
          )}
        >
          <Avatar className={cn(variant === 'sidebar' ? 'h-10 w-10' : 'h-9 w-9')}>
            <AvatarFallback
              className={cn(
                'text-xs font-bold',
                variant === 'sidebar'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'
              )}
            >
              {getInitials(userProfile.full_name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-2xl border-slate-200/80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-slate-900">
              {userProfile.full_name}
            </p>
            <p className="text-xs leading-none text-slate-500">{userProfile.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-700">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
