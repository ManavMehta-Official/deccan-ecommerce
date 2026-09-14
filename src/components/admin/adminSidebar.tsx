// src/components/admin/adminSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, LayoutDashboard, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminUserMenu } from '@/components/admin/adminUserMenu';
import logo from "../../../public/logo.svg";
import Image from 'next/image';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/audit', label: 'Audit Log', icon: ClipboardList },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar({ user }: React.ComponentProps<typeof AdminUserMenu>) {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-border/60 bg-muted/30 text-card-foreground hidden md:flex flex-col justify-between p-4 shrink-0 transition-all duration-300 sticky top-0 h-screen">
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white text-primary shadow-xs ring-1 ring-primary/20 shrink-0">
            <Image src={logo} alt="Deccan Logo" className="size-6" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-xl font-black tracking-tight text-foreground truncate">Deccan</h2>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-border/40">
        <AdminUserMenu user={user} />
      </div>
    </aside>
  );
}