import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { deleteAuditEventsBefore } from '@/db/queries';
import { getCurrentAdmin } from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const configuredOrigin = process.env.APP_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
  if (!origin || !configuredOrigin) return false;

  try {
    return new URL(origin).origin === new URL(configuredOrigin).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const currentUser = await getCurrentAdmin();
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (currentUser.role !== 'superadmin') {
    return NextResponse.json({ error: 'Only superadmins can clean up audit events.' }, { status: 403 });
  }

  const retentionDays = Number(process.env.AUDIT_RETENTION_DAYS ?? 365);
  if (!Number.isInteger(retentionDays) || retentionDays < 30 || retentionDays > 3650) {
    return NextResponse.json({ error: 'Invalid audit retention configuration.' }, { status: 500 });
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const deleted = await deleteAuditEventsBefore(cutoff);
  await writeAuditEvent({
    action: 'audit_retention_cleanup',
    outcome: 'success',
    actorUserId: currentUser.id,
    metadata: { count: deleted.length, retentionDays },
  });
  revalidatePath('/admin/audit');

  return NextResponse.json({ deleted: deleted.length }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed.' }, { status: 405 });
}