'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, LayoutDashboard, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  ['/admin', 'Dashboard', LayoutDashboard],
  ['/admin/users', 'Users', Users],
  ['/admin/audit', 'Audit', ClipboardList],
  ['/admin/settings', 'Settings', Settings],
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-4 border-t border-border/70 bg-background/90 backdrop-blur-lg px-2 py-1.5 pb-safe md:hidden shadow-lg">
      {items.map(([href, label, Icon]) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors',
              isActive
                ? 'text-primary bg-primary/10 font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('size-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}