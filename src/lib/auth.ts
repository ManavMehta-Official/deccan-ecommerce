import { createHash, randomBytes } from 'node:crypto';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq, gt } from 'drizzle-orm';
import { compare } from 'bcrypt';
import { db } from '@/db';
import { adminSessions, users } from '@/db/schema';
import { writeAuditEvent } from '@/lib/audit';

const SESSION_COOKIE = 'admin_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export type AdminRole = 'admin' | 'superadmin';
export type AdminUser = typeof users.$inferSelect;

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function getCurrentSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  await db.insert(adminSessions).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });

  await setSessionCookie(token);
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [result] = await db
    .select({ user: users })
    .from(adminSessions)
    .innerJoin(users, eq(adminSessions.userId, users.id))
    .where(
      and(
        eq(adminSessions.tokenHash, hashSessionToken(token)),
        gt(adminSessions.expiresAt, new Date()),
        eq(users.role, 'admin'),
      ),
    )
    .limit(1);

  if (result?.user) return result.user;

  const [superadminResult] = await db
    .select({ user: users })
    .from(adminSessions)
    .innerJoin(users, eq(adminSessions.userId, users.id))
    .where(
      and(
        eq(adminSessions.tokenHash, hashSessionToken(token)),
        gt(adminSessions.expiresAt, new Date()),
        eq(users.role, 'superadmin'),
      ),
    )
    .limit(1);

  return superadminResult?.user ?? null;
}

export async function requireAdmin() {
  const user = await getCurrentAdmin();
  if (!user) redirect('/admin/login');
  return user;
}

export async function authenticateAdmin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

  if (
    !user ||
    !user.password ||
    (user.role !== 'admin' && user.role !== 'superadmin') ||
    !(await compare(password, user.password))
  ) {
    return false;
  }

  await createAdminSession(user.id);
  await writeAuditEvent({
    action: 'login_success',
    outcome: 'success',
    actorUserId: user.id,
  });
  return true;
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const currentUser = await getCurrentAdmin();
    await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashSessionToken(token)));
    await writeAuditEvent({
      action: 'logout',
      outcome: 'success',
      actorUserId: currentUser?.id,
    });
  }

  cookieStore.delete(SESSION_COOKIE);
  redirect('/admin/login');
}