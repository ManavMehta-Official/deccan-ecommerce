'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logoutAdmin } from '@/app/admin/actions';

type UserData = {
  name?: string | null;
  email: string;
  image?: string | null;
  role?: string | null;
};

export function AdminUserMenu({ user }: { user?: UserData }) {
  const router = useRouter();

  const toTitleCase = (str?: string | null) => {
    if (!str) return 'Admin User';
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const name = toTitleCase(user?.name);
  const email = user?.email || 'admin@example.com';
  
  const getInitials = (str: string) => {
    return str
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 1);
  };

  const initials = getInitials(name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/50 border border-border/80 hover:bg-muted/50 transition-all outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="size-9 bg-muted shrink-0">
            <AvatarImage src={user?.image || ''} alt={name} />
            <AvatarFallback className="text-xs font-semibold bg-blue-600 text-white">
              {initials || 'AU'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-left min-w-0">
            <span className="text-sm font-semibold text-foreground truncate leading-tight">
              {name}
            </span>
            <span className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin'}
            </span>
          </div>
        </div>
        <ChevronsUpDown className="size-4 text-muted-foreground shrink-0 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{name}</p>
              <p className="text-xs leading-none text-muted-foreground">{email}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="my-1">
          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/admin/settings')}>
            <Settings className="mr-2 size-4 text-muted-foreground" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => {
              void logoutAdmin();
            }}
            className="cursor-pointer text-destructive hover:text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 size-4" />
            <span className='text-destructive'>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}