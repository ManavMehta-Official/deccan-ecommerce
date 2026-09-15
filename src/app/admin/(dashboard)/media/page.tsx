import Link from 'next/link';
import { ImageIcon, RefreshCcw } from 'lucide-react';
import { db } from '@/db';
import { productImages, products } from '@/db/schema';
import { inArray, eq, ilike } from 'drizzle-orm';
import { listR2Images, publicUrlForR2Key } from '@/lib/r2';
import { MediaLibrary } from '@/components/admin/mediaLibrary';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Media Library — Admin' };

interface Props {
  searchParams: Promise<{ cursor?: string; query?: string }>;
}

export default async function MediaPage({ searchParams }: Props) {
  const { cursor, query: rawQuery } = await searchParams;
  const query = rawQuery?.trim().slice(0, 100) ?? '';

  // Product searches are database-backed, so results cover every matching product
  // rather than only objects in the currently loaded R2 page.
  if (query) {
    const matches = await db
      .select({ r2Key: productImages.r2Key, thumbnailUrl: productImages.thumbnailUrl, productId: products.id, productName: products.name })
      .from(productImages)
      .innerJoin(products, eq(productImages.productId, products.id))
      .where(ilike(products.name, `%${query}%`))
      .limit(100);
    const items = matches.map((image) => ({
      key: image.r2Key,
      url: publicUrlForR2Key(image.r2Key),
      thumbnailUrl: image.thumbnailUrl,
      size: 0,
      lastModified: null,
      product: { id: image.productId, name: image.productName },
    }));
    return <MediaPageContent items={items} query={query} />;
  }

  let listing: Awaited<ReturnType<typeof listR2Images>>;
  try {
    listing = await listR2Images('products/', cursor);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not connect to R2.';
    return <MediaUnavailable message={message} />;
  }

  const keys = listing.images.map((image) => image.key);
  const linkedImages = keys.length
    ? await db
      .select({ r2Key: productImages.r2Key, thumbnailUrl: productImages.thumbnailUrl, productId: products.id, productName: products.name })
      .from(productImages)
      .innerJoin(products, eq(productImages.productId, products.id))
      .where(inArray(productImages.r2Key, keys))
    : [];
  const linkedByKey = new Map(linkedImages.map((image) => [image.r2Key, { id: image.productId, name: image.productName, thumbnailUrl: image.thumbnailUrl }]));
  const items = listing.images.map((image) => ({
    ...image,
    thumbnailUrl: linkedByKey.get(image.key)?.thumbnailUrl ?? null,
    product: linkedByKey.get(image.key) ? { id: linkedByKey.get(image.key)!.id, name: linkedByKey.get(image.key)!.name } : null,
  }));

  return <MediaPageContent items={items} query="" nextCursor={listing.nextCursor} />;
}

function MediaPageContent({ items, query, nextCursor }: { items: React.ComponentProps<typeof MediaLibrary>['initialItems']; query: string; nextCursor?: string | null }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2"><h1 className="text-2xl font-bold tracking-tight">Media Library</h1></div>
          <p className="text-sm text-muted-foreground">Browse and manage image files.</p>
        </div>
        <Button render={<Link href="/admin/media" />}  nativeButton={false} className="bg-background border border-border hover:bg-muted/40 hover:text-primary text-primary"><RefreshCcw className='size-3 mr-0.5' /> Refresh</Button>
      </div>
      <MediaLibrary initialItems={items} initialQuery={query} />
      {nextCursor && (
        <div className="flex justify-end"><Button render={<Link href={`/admin/media?cursor=${encodeURIComponent(nextCursor)}`} />} variant="outline">Next page</Button></div>
      )}
    </div>
  );
}

function MediaUnavailable({ message }: { message: string }) {
  return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6"><h1 className="font-semibold">Media Library is unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{message}</p></div>;
}
