'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Admin Dashboard Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="size-7" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Something went wrong</h2>
        <p className="text-xs text-muted-foreground">
          {error?.message || 'An unexpected error occurred while loading the administrator workspace.'}
        </p>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={() => reset()}
          className="h-9 text-xs font-medium gap-2"
        >
          <RotateCcw className="size-3.5" />
          Try Again
        </Button>
        <Link
          href="/admin"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted transition-colors text-foreground"
        >
          <Home className="size-3.5" />
          Dashboard Home
        </Link>
      </div>
    </div>
  );
}
