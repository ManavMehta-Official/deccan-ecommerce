'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  admin: 'Dashboard',
  users: 'Users',
  settings: 'Settings',
  audit: 'Audit Log',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  // If at root /admin, only show Dashboard
  if (segments.length <= 1) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Home className="size-3.5 text-primary" />
        <span className="text-foreground font-semibold">Dashboard</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium overflow-hidden">
      <Link
        href="/admin"
        className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
      >
        <Home className="size-3.5 text-muted-foreground hover:text-foreground" />
        <span className="hidden sm:inline">Admin</span>
      </Link>

      {segments.slice(1).map((segment, index) => {
        const isLast = index === segments.length - 2;
        const href = `/${segments.slice(0, index + 2).join('/')}`;
        const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

        return (
          <React.Fragment key={href}>
            <ChevronRight className="size-3 text-muted-foreground/60 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
                {label}
              </span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors truncate max-w-[100px] sm:max-w-none">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
