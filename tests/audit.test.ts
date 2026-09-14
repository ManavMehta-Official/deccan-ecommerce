import { describe, expect, it } from 'vitest';
import { redactMetadata } from '@/lib/audit';

describe('audit metadata redaction', () => {
  it('removes credentials, tokens, contact identifiers, and raw request data', () => {
    expect(redactMetadata({
      password: 'secret',
      sessionToken: 'token',
      email: 'admin@example.com',
      ip: '203.0.113.10',
      file: 'users.csv',
      role: 'admin',
      count: 3,
    })).toEqual({ role: 'admin', count: 3 });
  });

  it('preserves safe nullable and boolean metadata', () => {
    expect(redactMetadata({ verified: true, previousRole: null })).toEqual({
      verified: true,
      previousRole: null,
    });
  });
});