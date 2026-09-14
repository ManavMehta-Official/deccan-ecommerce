'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function CleanupAuditButton() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function cleanup() {
    const confirm = window.confirm('Are you sure you want to clean up audit events older than the retention threshold?');
    if (!confirm) return;

    setPending(true);

    try {
      const response = await fetch('/admin/audit/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: '{}',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error || 'Cleanup failed.');
      }

      toast.success('Audit log cleanup completed successfully');
      router.refresh();
    } catch (cleanupError) {
      toast.error(cleanupError instanceof Error ? cleanupError.message : 'Cleanup failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={cleanup}
      disabled={pending}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-pointer"
    >
      <Trash2 className="size-3.5" />
      {pending ? 'Cleaning up...' : 'Clean up old events'}
    </button>
  );
}