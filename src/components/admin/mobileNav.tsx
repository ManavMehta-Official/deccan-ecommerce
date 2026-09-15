'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, Users, Tag, ShoppingBag, Images } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  ['/admin', 'Dashboard', LayoutDashboard, true],
  ['/admin/users', 'Users', Users, false],
  ['/admin/categories', 'Categories', Tag, false],
  ['/admin/products', 'Products', ShoppingBag, false],
  ['/admin/media', 'Media', Images, false],
  ['/admin/settings', 'Settings', Settings, false],
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-6 border-t border-border/70 bg-background/90 backdrop-blur-lg px-1 py-1.5 pb-safe md:hidden shadow-lg">
      {items.map(([href, label, Icon, exact]) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors',
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
