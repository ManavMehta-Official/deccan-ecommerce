import { db } from '@/db';
import { adminSessions, auditEvents, emailSettings, users } from '@/db/schema';
import { and, asc, count, desc, eq, gte, ilike, isNotNull, isNull, lt, lte, or } from 'drizzle-orm';

export async function hasSuperAdmin(): Promise<boolean> {
  const [result] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.role, 'superadmin'));
  
  return Number(result.count) > 0;
}

export async function getAllUsers() {
  return await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    emailVerified: users.emailVerified,
    image: users.image,
    role: users.role,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  }).from(users);
}

export type UserQueryOptions = {
  query?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

const DEFAULT_USER_PAGE_SIZE = 10;

function userConditions(options: UserQueryOptions) {
  const conditions = [];

  if (options.role && options.role !== 'all') {
    conditions.push(eq(users.role, options.role));
  }

  if (options.status === 'verified') {
    conditions.push(isNotNull(users.emailVerified));
  } else if (options.status === 'unverified') {
    conditions.push(isNull(users.emailVerified));
  }

  if (options.query) {
    const q = `%${options.query.trim().slice(0, 100)}%`;
    conditions.push(or(ilike(users.name, q), ilike(users.email, q)));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getPaginatedUsers(options: UserQueryOptions = {}) {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const pageSize = Math.max(1, Math.min(100, Math.floor(options.pageSize ?? DEFAULT_USER_PAGE_SIZE)));
  const where = userConditions(options);

  const [userList, [{ total }]] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(users).where(where),
  ]);

  const totalCount = Number(total);

  return {
    users: userList,
    page,
    pageSize,
    total: totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

export async function getAllUsersForExport(options: UserQueryOptions = {}) {
  const where = userConditions(options);
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    image: users.image,
    emailVerified: users.emailVerified,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(10000);
}

export async function getUserWithAudit(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const recentAudit = await db
    .select(auditEventSelection)
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorUserId, users.id))
    .where(or(eq(auditEvents.actorUserId, userId), and(eq(auditEvents.targetType, 'user'), eq(auditEvents.targetId, userId))))
    .orderBy(desc(auditEvents.createdAt))
    .limit(10);

  return {
    ...user,
    recentAudit,
  };
}

export async function getAdminSessions(userId: string) {
  return db
    .select({
      id: adminSessions.id,
      createdAt: adminSessions.createdAt,
      expiresAt: adminSessions.expiresAt,
    })
    .from(adminSessions)
    .where(eq(adminSessions.userId, userId))
    .orderBy(desc(adminSessions.createdAt));
}

export async function getDashboardSummary() {
  const [[userCount], [adminCount], [auditCount], recentEvents, [emailConfig]] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(or(eq(users.role, 'admin'), eq(users.role, 'superadmin'))),
    db.select({ count: count() }).from(auditEvents),
    db.select(auditEventSelection).from(auditEvents).leftJoin(users, eq(auditEvents.actorUserId, users.id)).orderBy(desc(auditEvents.createdAt)).limit(6),
    db.select({ provider: emailSettings.provider, enabled: emailSettings.enabled }).from(emailSettings).limit(1),
  ]);

  return {
    userCount: Number(userCount.count),
    adminCount: Number(adminCount.count),
    auditCount: Number(auditCount.count),
    recentEvents,
    emailProvider: emailConfig?.provider ?? 'console',
    emailEnabled: emailConfig?.enabled === 1,
  };
}

export async function getDashboardAnalytics() {
  const [allUsers, allAudit, verifiedCount, unverifiedCount] = await Promise.all([
    db.select({
      id: users.id,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users),
    db.select({
      id: auditEvents.id,
      createdAt: auditEvents.createdAt,
    }).from(auditEvents).where(gte(auditEvents.createdAt, new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))),
    db.select({ count: count() }).from(users).where(isNotNull(users.emailVerified)),
    db.select({ count: count() }).from(users).where(isNull(users.emailVerified)),
  ]);

  // Build 14-day history buckets
  const days: { date: string; label: string; signups: number; activity: number }[] = [];
  const now = new Date();
  
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    const dayNum = d.getDate();
    const label = `${monthName} ${dayNum}`;

    const signups = allUsers.filter((u) => {
      const uDate = new Date(u.createdAt).toISOString().split('T')[0];
      return uDate === dateStr;
    }).length;

    const activity = allAudit.filter((a) => {
      const aDate = new Date(a.createdAt).toISOString().split('T')[0];
      return aDate === dateStr;
    }).length;

    days.push({ date: dateStr, label, signups, activity });
  }

  // Role Breakdown
  const roleBreakdown = {
    users: allUsers.filter((u) => u.role === 'user').length,
    admins: allUsers.filter((u) => u.role === 'admin').length,
    superadmins: allUsers.filter((u) => u.role === 'superadmin').length,
  };

  return {
    history: days,
    roleBreakdown,
    verification: {
      verified: Number(verifiedCount[0]?.count ?? 0),
      unverified: Number(unverifiedCount[0]?.count ?? 0),
    },
  };
}

const AUDIT_PAGE_SIZE = 25;
export const AUDIT_EXPORT_LIMIT = 5000;

export type AuditQueryOptions = {
  action?: string;
  outcome?: string;
  query?: string;
  actorId?: string;
  from?: string;
  to?: string;
  page?: number;
};

function auditConditions(options: AuditQueryOptions) {
  const conditions = [];

  if (options.action) conditions.push(eq(auditEvents.action, options.action));
  if (options.outcome) conditions.push(eq(auditEvents.outcome, options.outcome));
  if (options.actorId) conditions.push(eq(auditEvents.actorUserId, options.actorId));
  if (options.from) conditions.push(gte(auditEvents.createdAt, new Date(`${options.from}T00:00:00.000Z`)));
  if (options.to) conditions.push(lte(auditEvents.createdAt, new Date(`${options.to}T23:59:59.999Z`)));
  if (options.query) {
    const query = `%${options.query.slice(0, 100)}%`;
    conditions.push(or(
      ilike(auditEvents.action, query),
      ilike(auditEvents.targetId, query),
      ilike(users.name, query),
      ilike(users.email, query),
    ));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

const auditEventSelection = {
  id: auditEvents.id,
  action: auditEvents.action,
  outcome: auditEvents.outcome,
  targetType: auditEvents.targetType,
  targetId: auditEvents.targetId,
  metadata: auditEvents.metadata,
  createdAt: auditEvents.createdAt,
  actorId: auditEvents.actorUserId,
  actorName: users.name,
  actorEmail: users.email,
};

export async function getAuditEvents(options: AuditQueryOptions = {}) {
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const where = auditConditions(options);
  const [events, [{ total }]] = await Promise.all([
    db.select(auditEventSelection)
      .from(auditEvents)
      .leftJoin(users, eq(auditEvents.actorUserId, users.id))
      .where(where)
      .orderBy(desc(auditEvents.createdAt), asc(auditEvents.id))
      .limit(AUDIT_PAGE_SIZE)
      .offset((page - 1) * AUDIT_PAGE_SIZE),
    db.select({ total: count() })
      .from(auditEvents)
      .leftJoin(users, eq(auditEvents.actorUserId, users.id))
      .where(where),
  ]);

  return {
    events,
    page,
    pageSize: AUDIT_PAGE_SIZE,
    total: Number(total),
    totalPages: Math.max(1, Math.ceil(Number(total) / AUDIT_PAGE_SIZE)),
  };
}

export async function getAuditEventsForExport(options: AuditQueryOptions = {}) {
  return db.select(auditEventSelection)
    .from(auditEvents)
    .leftJoin(users, eq(auditEvents.actorUserId, users.id))
    .where(auditConditions(options))
    .orderBy(desc(auditEvents.createdAt), asc(auditEvents.id))
    .limit(AUDIT_EXPORT_LIMIT);
}

export async function deleteAuditEventsBefore(date: Date) {
  return db.delete(auditEvents)
    .where(lt(auditEvents.createdAt, date))
    .returning({ id: auditEvents.id });
}