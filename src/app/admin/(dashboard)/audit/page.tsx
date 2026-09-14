import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AuditFilters } from '@/components/admin/auditFilters';
import { getAuditEvents } from '@/db/queries';
import { requireAdmin } from '@/lib/auth';
import { CleanupAuditButton } from '@/components/admin/cleanupAuditButton';
import { Download } from 'lucide-react';

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function label(value: string) {
  return value.replaceAll('_', ' ');
}

function outcomeClass(outcome: string) {
  if (outcome === 'success') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600';
  if (outcome === 'blocked') return 'border-amber-500/20 bg-amber-500/10 text-amber-600';
  return 'border-destructive/20 bg-destructive/10 text-destructive';
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await requireAdmin();
  const params = await searchParams;
  const pageValue = typeof params.page === 'string' ? Number(params.page) : 1;
  const result = await getAuditEvents({
    action: typeof params.action === 'string' ? params.action : undefined,
    outcome: typeof params.outcome === 'string' ? params.outcome : undefined,
    query: typeof params.query === 'string' ? params.query : undefined,
    from: typeof params.from === 'string' ? params.from : undefined,
    to: typeof params.to === 'string' ? params.to : undefined,
    page: Number.isFinite(pageValue) ? pageValue : 1,
  });

  function pageUrl(page: number) {
    const next = new URLSearchParams();
    for (const key of ['query', 'action', 'outcome', 'from', 'to']) {
      const value = params[key];
      if (typeof value === 'string' && value) next.set(key, value);
    }
    next.set('page', String(page));
    return `/admin/audit?${next.toString()}`;
  }

  const exportParams = new URLSearchParams();
  for (const key of ['query', 'action', 'outcome', 'from', 'to']) {
    const value = params[key];
    if (typeof value === 'string' && value) exportParams.set(key, value);
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-row justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
          <p className="text-sm text-muted-foreground">Review authentication and privileged account activity.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={`/admin/audit/export?${exportParams.toString()}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-50 transition-colors cursor-pointer">
            <Download className="size-4" />
            Export CSV
          </a>
          {currentUser.role === 'superadmin' && (
            <CleanupAuditButton />
          )}
        </div>
      </div>

      <AuditFilters />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="px-6">Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="px-6">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.events.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No audit events found.</TableCell></TableRow>
            ) : result.events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="px-6 text-xs text-muted-foreground">{formatDate(event.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{event.actorName || 'System / Unknown'}</span>
                    {event.actorEmail && <span className="text-xs text-muted-foreground">{event.actorEmail}</span>}
                  </div>
                </TableCell>
                <TableCell className="text-sm capitalize">{label(event.action)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{event.targetType ? `${event.targetType}${event.targetId ? `: ${event.targetId}` : ''}` : '—'}</TableCell>
                <TableCell><Badge variant="outline" className={`capitalize ${outcomeClass(event.outcome)}`}>{event.outcome}</Badge></TableCell>
                <TableCell className="max-w-xs truncate px-6 text-xs text-muted-foreground">{event.metadata ? JSON.stringify(event.metadata) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {result.page} of {result.totalPages} · {result.total} events</span>
        <div className="flex gap-2">
          {result.page > 1 && <Link className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted" href={pageUrl(result.page - 1)}>Previous</Link>}
          {result.page < result.totalPages && <Link className="inline-flex h-7 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted" href={pageUrl(result.page + 1)}>Next</Link>}
        </div>
      </div>
    </div>
  );
}