'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Grid2X2, ImageIcon, List, Loader2, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteMediaObject } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type MediaItem = {
  key: string;
  url: string;
  thumbnailUrl?: string | null;
  size: number;
  lastModified: string | null;
  product: { id: string; name: string } | null;
};

function formatSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibrary({ initialItems, initialQuery = '' }: { initialItems: MediaItem[]; initialQuery?: string }) {
  const [items, setItems] = useState(initialItems);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [, startTransition] = useTransition();

  function removeItem(item: MediaItem) {
    if (!window.confirm(`Delete ${item.key}? This cannot be undone.`)) return;
    setDeletingKey(item.key);
    startTransition(async () => {
      const result = await deleteMediaObject(item.key);
      if (result.success) {
        setItems((current) => current.filter((candidate) => candidate.key !== item.key));
        toast.success(item.product ? 'Image and its product record were deleted.' : 'Image deleted.');
      } else {
        toast.error(result.error ?? 'Failed to delete image.');
      }
      setDeletingKey(null);
    });
  }

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <form action="/admin/media" className="relative min-w-56 flex-1 sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input name="query" defaultValue={initialQuery} placeholder="Search by product name" className="h-9 w-full rounded-lg border border-border py-1 pl-9 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 bg-muted/60" />
      </form>
      <div className="flex rounded-lg border border-border p-0.5">
        <Button type="button" size="icon-sm" variant={view === 'grid' ? 'secondary' : 'ghost'} onClick={() => setView('grid')} aria-label="Card view"><Grid2X2 className="size-3.5" /></Button>
        <Button type="button" size="icon-sm" variant={view === 'list' ? 'secondary' : 'ghost'} onClick={() => setView('list')} aria-label="List view"><List className="size-3.5" /></Button>
      </div>
    </div>
  );

  if (items.length === 0) {
    return <>
      {toolbar}
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
        <ImageIcon className="size-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{initialQuery ? 'No images match that product' : 'No product images found'}</p>
          <p className="mt-1 text-xs text-muted-foreground">{initialQuery ? 'Try a different product name.' : 'Upload images from a product’s edit page to see them here.'}</p>
        </div>
      </div>
    </>;
  }

  return (
    <div className="space-y-4">
      {toolbar}
      {view === 'grid' ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => {
        const isDeleting = deletingKey === item.key;
        return (
          <article key={item.key} className="group overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative aspect-square bg-muted">
              <Image src={item.thumbnailUrl ?? item.url} alt={item.key} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                <Button type="button" size="icon-sm" variant="secondary" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')} aria-label="Open full image">
                  <ExternalLink className="size-3.5" />
                </Button>
                <Button type="button" size="icon-sm" variant="destructive" disabled={isDeleting} onClick={() => removeItem(item)} aria-label="Delete image">
                  {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2 p-3">
              <p className="truncate font-mono text-[11px] text-muted-foreground" title={item.key}>{item.key.replace('products/', '')}</p>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{formatSize(item.size)}</span>
                {item.product ? (
                  <Link href={`/admin/products/${item.product.id}`} className="truncate text-primary hover:underline" title={item.product.name}>{item.product.name}</Link>
                ) : <Badge variant="outline" className="text-[10px]">Unlinked</Badge>}
              </div>
            </div>
          </article>
        );
      })}
      </div> : <div className="overflow-hidden rounded-xl border border-border bg-card">
        {items.map((item) => {
          const isDeleting = deletingKey === item.key;
          return <div key={item.key} className="flex items-center gap-3 border-b border-border p-3 last:border-b-0">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-md bg-muted"><Image src={item.thumbnailUrl ?? item.url} alt={item.key} fill className="object-cover" sizes="48px" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs" title={item.key}>{item.key.replace('products/', '')}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {item.size > 0 && <span>{formatSize(item.size)}</span>}
                {item.product ? <Link href={`/admin/products/${item.product.id}`} className="truncate text-primary hover:underline">{item.product.name}</Link> : <Badge variant="outline" className="text-[10px]">Unlinked</Badge>}
              </div>
            </div>
            <Button type="button" size="icon-sm" variant="ghost" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')} aria-label="Open full image"><ExternalLink className="size-3.5" /></Button>
            <Button type="button" size="icon-sm" variant="destructive" disabled={isDeleting} onClick={() => removeItem(item)} aria-label="Delete image">{isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</Button>
          </div>;
        })}
      </div>}
    </div>
  );
}
