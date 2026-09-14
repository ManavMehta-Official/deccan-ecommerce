import { describe, expect, it } from 'vitest';
import {
  calculateRateLimitStatus,
  resolveClientIp,
  type RateLimitConfig,
} from '@/lib/rateLimit';

const config: RateLimitConfig = {
  limit: 3,
  windowSeconds: 60,
};

function headers(values: Record<string, string>) {
  return {
    get(name: string) {
      return values[name] ?? null;
    },
  };
}

describe('resolveClientIp', () => {
  it('ignores forwarded headers unless the proxy is trusted', () => {
    expect(resolveClientIp(headers({ 'x-forwarded-for': '203.0.113.10' }), false)).toBe('shared-client-key');
  });

  it('uses the first forwarded address when the proxy is trusted', () => {
    expect(resolveClientIp(headers({ 'x-forwarded-for': '203.0.113.10, 10.0.0.2' }), true)).toBe('203.0.113.10');
  });

  it('falls back to x-real-ip for trusted proxies', () => {
    expect(resolveClientIp(headers({ 'x-real-ip': '203.0.113.11' }), true)).toBe('203.0.113.11');
  });
});

describe('calculateRateLimitStatus', () => {
  const now = Date.parse('2026-09-08T12:00:00.000Z');

  it('allows a new bucket with the full limit remaining', () => {
    const status = calculateRateLimitStatus(0, new Date(now + 60_000), config, now);
    expect(status).toEqual({ allowed: true, remaining: 3, retryAfterSeconds: 60 });
  });

  it('blocks a bucket at the configured limit', () => {
    const status = calculateRateLimitStatus(3, new Date(now + 30_000), config, now);
    expect(status).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 30 });
  });

  it('never reports negative remaining attempts', () => {
    const status = calculateRateLimitStatus(8, new Date(now + 30_000), config, now);
    expect(status.allowed).toBe(false);
    expect(status.remaining).toBe(0);
  });

  it('resets an expired bucket', () => {
    const status = calculateRateLimitStatus(3, new Date(now - 1), config, now);
    expect(status).toEqual({ allowed: true, remaining: 3, retryAfterSeconds: 0 });
  });
});