import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { accountTokens } from '@/db/schema';

export const TOKEN_TYPES = {
  invitation: 'invitation',
  passwordReset: 'password_reset',
} as const;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createAccountToken(input: {
  type: string;
  email: string;
  userId?: string;
  name?: string | null;
  role?: string | null;
  expiresInSeconds: number;
}) {
  const token = randomBytes(32).toString('base64url');
  await db.insert(accountTokens).values({
    id: crypto.randomUUID(),
    userId: input.userId ?? null,
    email: input.email,
    name: input.name ?? null,
    role: input.role ?? null,
    type: input.type,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
  });
  return token;
}

export async function getValidAccountToken(token: string, type: string) {
  const [record] = await db.select().from(accountTokens).where(and(
    eq(accountTokens.tokenHash, hashToken(token)),
    eq(accountTokens.type, type),
    isNull(accountTokens.usedAt),
    gt(accountTokens.expiresAt, new Date()),
  )).limit(1);
  return record ?? null;
}

export async function consumeAccountToken(id: string) {
  const [record] = await db.update(accountTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(accountTokens.id, id), isNull(accountTokens.usedAt)))
    .returning();
  return record ?? null;
}