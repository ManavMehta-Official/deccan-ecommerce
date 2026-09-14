import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { rateLimitBuckets } from '@/db/schema';

const DEFAULT_WINDOW_SECONDS = 10 * 60;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

export type RateLimitStatus = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type HeaderReader = {
  get(name: string): string | null;
};

function getSecret() {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('RATE_LIMIT_SECRET must be configured in production.');
  }
  return 'development-only-rate-limit-secret';
}

function hashKey(key: string) {
  return createHmac('sha256', getSecret()).update(key).digest('hex');
}

export function resolveClientIp(requestHeaders: HeaderReader, trustProxy: boolean) {
  if (trustProxy) {
    const forwardedFor = requestHeaders.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0].trim();

    const realIp = requestHeaders.get('x-real-ip');
    if (realIp) return realIp.trim();
  }

  return 'shared-client-key';
}

export async function getClientIp() {
  if (process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY !== 'true') {
    throw new Error('TRUST_PROXY must be enabled behind a configured production proxy.');
  }
  return resolveClientIp(await headers(), process.env.TRUST_PROXY === 'true');
}

export function loginRateLimitConfig(): RateLimitConfig {
  return {
    limit: positiveInteger(process.env.LOGIN_RATE_LIMIT, 10),
    windowSeconds: positiveInteger(process.env.LOGIN_RATE_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS),
  };
}

export function accountRateLimitConfig(): RateLimitConfig {
  return {
    limit: positiveInteger(process.env.ACCOUNT_RATE_LIMIT, 5),
    windowSeconds: positiveInteger(process.env.ACCOUNT_RATE_WINDOW_SECONDS, 15 * 60),
  };
}

export function setupRateLimitConfig(): RateLimitConfig {
  return {
    limit: positiveInteger(process.env.SETUP_RATE_LIMIT, 3),
    windowSeconds: positiveInteger(process.env.SETUP_RATE_WINDOW_SECONDS, 60 * 60),
  };
}

export function calculateRateLimitStatus(
  attemptCount: number,
  expiresAt: Date,
  config: RateLimitConfig,
  now = Date.now(),
): RateLimitStatus {
  if (expiresAt.getTime() <= now) {
    return { allowed: true, remaining: config.limit, retryAfterSeconds: 0 };
  }

  return {
    allowed: attemptCount < config.limit,
    remaining: Math.max(0, config.limit - attemptCount),
    retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)),
  };
}

async function getBucket(key: string) {
  const [bucket] = await db
    .select()
    .from(rateLimitBuckets)
    .where(and(eq(rateLimitBuckets.keyHash, hashKey(key)), gt(rateLimitBuckets.expiresAt, new Date())))
    .limit(1);
  return bucket;
}

export async function getRateLimitStatus(key: string, config: RateLimitConfig): Promise<RateLimitStatus> {
  const bucket = await getBucket(key);
  if (!bucket) {
    return { allowed: true, remaining: config.limit, retryAfterSeconds: 0 };
  }

  return calculateRateLimitStatus(bucket.attemptCount, bucket.expiresAt, config);
}

export async function recordRateLimitFailure(key: string, config: RateLimitConfig) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.windowSeconds * 1000);
  const keyHash = hashKey(key);

  await db
    .insert(rateLimitBuckets)
    .values({ keyHash, windowStartedAt: now, attemptCount: 1, expiresAt })
    .onConflictDoUpdate({
      target: rateLimitBuckets.keyHash,
      set: {
        windowStartedAt: sql`case when ${rateLimitBuckets.expiresAt} <= now() then excluded.window_started_at else ${rateLimitBuckets.windowStartedAt} end`,
        attemptCount: sql`case when ${rateLimitBuckets.expiresAt} <= now() then 1 else ${rateLimitBuckets.attemptCount} + 1 end`,
        expiresAt: sql`case when ${rateLimitBuckets.expiresAt} <= now() then excluded.expires_at else ${rateLimitBuckets.expiresAt} end`,
      },
    });
}

export async function isRateLimited(keys: Array<{ key: string; config: RateLimitConfig }>) {
  const statuses = await Promise.all(keys.map(({ key, config }) => getRateLimitStatus(key, config)));
  const blocked = statuses.find((status) => !status.allowed);
  return blocked ?? null;
}

export async function cleanupExpiredRateLimitBuckets() {
  await db.delete(rateLimitBuckets).where(lt(rateLimitBuckets.expiresAt, new Date()));
}