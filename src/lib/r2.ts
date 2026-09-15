/**
 * Cloudflare R2 storage helpers.
 *
 * R2 exposes an S3-compatible API, so we use @aws-sdk/client-s3.
 * Required env vars:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in your environment.'
    );
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucketName() {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('Missing R2_BUCKET_NAME env var.');
  return bucket;
}

function getPublicUrl() {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) throw new Error('Missing R2_PUBLIC_URL env var.');
  return url.replace(/\/$/, ''); // strip trailing slash
}

export function publicUrlForR2Key(key: string) {
  return `${getPublicUrl()}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/**
 * Upload a file buffer to R2.
 * @param key     Object key (path) inside the bucket, e.g. "products/abc/cover.webp"
 * @param body    File contents as a Buffer
 * @param contentType  MIME type, e.g. "image/webp"
 * @returns The public CDN URL for the uploaded object
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const client = getR2Client();
  const bucket = getBucketName();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return publicUrlForR2Key(key);
}

/**
 * Delete an object from R2 by its key.
 * Silently succeeds if the object doesn't exist.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = getBucketName();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

export type R2ImageObject = {
  key: string;
  url: string;
  size: number;
  lastModified: string | null;
};

/** List image objects beneath a safe, application-owned R2 prefix. */
export async function listR2Images(prefix = 'products/', cursor?: string) {
  if (!prefix.startsWith('products/')) throw new Error('Only product media can be listed.');

  const result = await getR2Client().send(new ListObjectsV2Command({
    Bucket: getBucketName(),
    Prefix: prefix,
    ContinuationToken: cursor,
    MaxKeys: 48,
  }));
  const imageExtension = /\.(avif|gif|jpe?g|png|webp)$/i;
  const images = (result.Contents ?? [])
    // Thumbnails are derivatives of a master and are not separate library assets.
    .filter((object) => object.Key && imageExtension.test(object.Key) && !object.Key.endsWith('-thumb.webp'))
    .map((object) => ({
      key: object.Key!,
      url: publicUrlForR2Key(object.Key!),
      size: object.Size ?? 0,
      lastModified: object.LastModified?.toISOString() ?? null,
    }));

  return { images, nextCursor: result.NextContinuationToken ?? null };
}
