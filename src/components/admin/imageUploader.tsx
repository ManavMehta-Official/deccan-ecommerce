'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { Upload, X, GripVertical, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { uploadProductImage, deleteProductImage, reorderProductImages } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

type ImageItem = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  altText: string | null;
  position: number;
};

interface Props {
  productId: string;
  initialImages: ImageItem[];
}

export function ImageUploader({ productId, initialImages }: Props) {
  const [images, setImages] = useState<ImageItem[]>(
    [...initialImages].sort((a, b) => a.position - b.position)
  );
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('file', file);
      formData.append('altText', '');

      const result = await uploadProductImage(formData);
      if (result.success && result.image) {
        setImages((prev) => [
          ...prev,
          { id: result.image!.id, url: result.image!.url, thumbnailUrl: result.image!.thumbnailUrl, position: result.image!.position, altText: null },
        ]);
        toast.success(`Uploaded ${file.name}`);
      } else {
        toast.error(result.error ?? `Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleDeleteImage(imageId: string) {
    startTransition(async () => {
      const result = await deleteProductImage(imageId);
      if (result.success) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        toast.success('Image removed.');
      } else {
        toast.error(result.error ?? 'Failed to remove image.');
      }
    });
  }

  // ── Reordering Logic ────────────────────────────────────────────────────────
  function moveItem(fromId: string, targetId: string) {
    if (fromId === targetId) return;
    const reordered = [...images];
    const fromIdx = reordered.findIndex((i) => i.id === fromId);
    const toIdx = reordered.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [item] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, item);
    const updated = reordered.map((img, pos) => ({ ...img, position: pos }));
    setImages(updated);
    startTransition(async () => {
      const result = await reorderProductImages(productId, updated.map((i) => i.id));
      if (!result.success) toast.error('Failed to save new order.');
    });
  }

  // ── Desktop Drag & Drop ───────────────────────────────────────────────────
  function handleDragStart(id: string) { 
    setDraggingId(id); 
  }

  function handleDropOnItem(targetId: string) {
    if (!draggingId) return;
    moveItem(draggingId, targetId);
    setDraggingId(null);
  }

  // ── Mobile Touch Drag & Drop ──────────────────────────────────────────────
  function handleTouchStart(id: string) {
    setDraggingId(id);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!draggingId) return;
    const touch = e.touches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!targetElement) return;

    for (const [id, element] of itemRefs.current.entries()) {
      if (element.contains(targetElement) && id !== draggingId) {
        moveItem(draggingId, id);
        break;
      }
    }
  }

  function handleTouchEnd() {
    setDraggingId(null);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
          uploading && 'pointer-events-none opacity-60'
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload className="size-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">{uploading ? 'Uploading…' : 'Drop images here or click to browse'}</p>
        <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, AVIF, GIF · max 10 MB each</p>
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              ref={(el) => {
                if (el) itemRefs.current.set(img.id, el);
                else itemRefs.current.delete(img.id);
              }}
              draggable
              onDragStart={() => handleDragStart(img.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOnItem(img.id)}
              className={cn(
                'group relative rounded-lg overflow-hidden border border-border bg-muted aspect-square select-none touch-none',
                draggingId === img.id && 'opacity-40 ring-2 ring-primary'
              )}
            >
              <Image
                src={img.thumbnailUrl ?? img.url}
                alt={img.altText ?? `Product image ${idx + 1}`}
                fill
                className="object-cover pointer-events-none"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <div
                  className="cursor-grab active:cursor-grabbing p-2.5 rounded-lg bg-black/50 sm:bg-white/20 hover:bg-white/30 touch-none"
                  onTouchStart={() => handleTouchStart(img.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <GripVertical className="size-5 sm:size-4 text-white" />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="size-8 sm:size-7"
                  onClick={() => handleDeleteImage(img.id)}
                >
                  <X className="size-4 sm:size-3.5" />
                </Button>
              </div>
              {/* Position badge */}
              {idx === 0 && (
                <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded shadow">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && !uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="size-4" />
          No images uploaded yet. The first image will be used as the cover.
        </div>
      )}
    </div>
  );
}