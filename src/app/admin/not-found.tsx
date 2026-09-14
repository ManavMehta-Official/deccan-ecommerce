import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home } from 'lucide-react';

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <FileQuestion className="size-7" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Page Not Found</h2>
        <p className="text-xs text-muted-foreground">
          The requested administrator page or resource does not exist or has been moved.
        </p>
      </div>
      <div className="pt-2">
        <Link
          href="/admin"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs"
        >
          <Home className="size-3.5" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
