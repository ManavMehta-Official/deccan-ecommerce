import { NextResponse } from 'next/server';
import { getAuditEventsForExport, type AuditQueryOptions } from '@/db/queries';
import { requireAdmin } from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';

function csvCell(value: unknown) {
  const text = value instanceof Date
    ? value.toISOString()
    : typeof value === 'string'
      ? value
      : value == null
        ? ''
        : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  const url = new URL(request.url);
  const options: AuditQueryOptions = {
    action: url.searchParams.get('action') || undefined,
    outcome: url.searchParams.get('outcome') || undefined,
    query: url.searchParams.get('query') || undefined,
    from: url.searchParams.get('from') || undefined,
    to: url.searchParams.get('to') || undefined,
  };
  const events = await getAuditEventsForExport(options);
  const header = ['timestamp', 'actor', 'actor_email', 'action', 'outcome', 'target_type', 'target_id', 'metadata'];
  const rows = events.map((event) => [
    event.createdAt,
    event.actorName || 'System / Unknown',
    event.actorEmail,
    event.action,
    event.outcome,
    event.targetType,
    event.targetId,
    event.metadata,
  ].map(csvCell).join(','));

  await writeAuditEvent({
    action: 'audit_exported',
    outcome: 'success',
    actorUserId: admin.id,
    metadata: { count: events.length },
  });

  return new NextResponse([header.map(csvCell).join(','), ...rows].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}