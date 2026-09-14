import { NextResponse } from 'next/server';
import { getAllUsersForExport, type UserQueryOptions } from '@/db/queries';
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
  const options: UserQueryOptions = {
    query: url.searchParams.get('query') || undefined,
    role: url.searchParams.get('role') || undefined,
    status: url.searchParams.get('status') || undefined,
  };

  const usersList = await getAllUsersForExport(options);
  const header = ['id', 'name', 'email', 'role', 'image', 'email_verified', 'created_at', 'updated_at'];
  const rows = usersList.map((u) => [
    u.id,
    u.name || '',
    u.email,
    u.role,
    u.image || '',
    u.emailVerified ? 'true' : 'false',
    u.createdAt,
    u.updatedAt,
  ].map(csvCell).join(','));

  await writeAuditEvent({
    action: 'users_exported',
    outcome: 'success',
    actorUserId: admin.id,
    metadata: { count: usersList.length },
  });

  return new NextResponse([header.map(csvCell).join(','), ...rows].join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="users-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
