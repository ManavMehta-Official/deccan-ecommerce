import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toSlug } from '@/db/queries';

describe('ecommerce utilities', () => {
  it('creates stable URL slugs from names', () => {
    expect(toSlug('  Hand-Woven_Cotton Throw!  ')).toBe('hand-woven-cotton-throw');
    expect(toSlug('A   B---C')).toBe('a-b-c');
  });
});

const send = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = send;
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: unknown) {}
  },
}));

describe('R2 storage', () => {
  beforeEach(() => {
    vi.resetModules();
    send.mockReset().mockResolvedValue({});
    process.env.R2_ACCOUNT_ID = 'account';
    process.env.R2_ACCESS_KEY_ID = 'key';
    process.env.R2_SECRET_ACCESS_KEY = 'secret';
    process.env.R2_BUCKET_NAME = 'catalogue';
    process.env.R2_PUBLIC_URL = 'https://images.example.test/';
  });

  it('uploads to the configured bucket and returns the canonical public URL', async () => {
    const { uploadToR2 } = await import('@/lib/r2');
    await expect(uploadToR2('products/p1/cover.webp', Buffer.from('image'), 'image/webp'))
      .resolves.toBe('https://images.example.test/products/p1/cover.webp');
    expect(send).toHaveBeenCalledTimes(1);
  });
});
