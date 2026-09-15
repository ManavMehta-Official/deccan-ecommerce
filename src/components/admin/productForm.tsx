'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { createProduct, updateProduct } from '@/app/admin/actions';
import { ImageUploader } from './imageUploader';
import { Info } from 'lucide-react';

function toSlugPreview(str: string) {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

type Category = { id: string; name: string };

type ProductImage = { id: string; url: string; thumbnailUrl: string | null; altText: string | null; position: number };

interface ProductFormProps {
  mode: 'create';
  categories: Category[];
}

interface EditProductFormProps {
  mode: 'edit';
  categories: Category[];
  product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    categoryId: string | null;
    outOfStock: number;
    newArrival: number;
    featured: number;
    widthCm: number | null;
    heightCm: number | null;
    depthCm: number | null;
    weightGrams: number | null;
    images: ProductImage[];
  };
}

type Props = ProductFormProps | EditProductFormProps;

export function ProductForm(props: Props) {
  const isEdit = props.mode === 'edit';
  const p = isEdit ? (props as EditProductFormProps).product : null;

  const [name, setName] = useState(p?.name ?? '');
  const [description, setDescription] = useState(p?.description ?? '');
  const [priceDisplay, setPriceDisplay] = useState(p ? String(p.price / 100) : '');
  const [categoryId, setCategoryId] = useState(p?.categoryId ?? '');
  const [outOfStock, setOutOfStock] = useState(p ? p.outOfStock === 1 : false);
  const [newArrival, setNewArrival] = useState(p ? p.newArrival === 1 : false);
  const [featured, setFeatured] = useState(p ? p.featured === 1 : false);
  const [widthCm, setWidthCm] = useState(p?.widthCm ? String(p.widthCm) : '');
  const [heightCm, setHeightCm] = useState(p?.heightCm ? String(p.heightCm) : '');
  const [depthCm, setDepthCm] = useState(p?.depthCm ? String(p.depthCm) : '');
  const [weightGrams, setWeightGrams] = useState(p?.weightGrams ? String(p.weightGrams) : '');

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const slugPreview = toSlugPreview(name);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set('name', name);
    formData.set('description', description);
    formData.set('price', String(Math.round(parseFloat(priceDisplay || '0') * 100)));
    formData.set('categoryId', categoryId);
    formData.set('outOfStock', outOfStock ? '1' : '0');
    formData.set('newArrival', newArrival ? '1' : '0');
    formData.set('featured', featured ? '1' : '0');
    formData.set('widthCm', widthCm);
    formData.set('heightCm', heightCm);
    formData.set('depthCm', depthCm);
    formData.set('weightGrams', weightGrams);

    startTransition(async () => {
      const result = isEdit
        ? await updateProduct(p!.id, formData)
        : await createProduct(formData);

      if (result.success) {
        toast.success(isEdit ? 'Product saved.' : 'Product created!');
        if (!isEdit && 'id' in result && result.id) {
          router.push(`/admin/products/${result.id}`);
        }
      } else {
        toast.error(result.error ?? 'Something went wrong.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Details (Left 2 Columns) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Product Information</h3>
              <p className="text-xs text-muted-foreground">Title, pricing, and category organization.</p>
            </div>
            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="product-name">Name *</Label>
                <Input
                  id="product-name"
                  placeholder="e.g. Handmade Ceramic Mug"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={200}
                />
                {name && (
                  <p className="text-xs text-muted-foreground">
                    URL Slug: <span className="font-mono text-foreground/80">{slugPreview}</span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-category">Category</Label>
                <Select
                  value={categoryId || 'uncategorised'}
                  onValueChange={(value) => setCategoryId(value === 'uncategorised' ? '' : value ?? '')}
                >
                  <SelectTrigger id="product-category" className="w-full">
                    <SelectValue placeholder="Select category">
                      {props.categories.find((c) => c.id === categoryId)?.name ?? 'Uncategorised'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncategorised">Uncategorised</SelectItem>
                    {props.categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-price">Price (₹) *</Label>
                <Input
                  id="product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={priceDisplay}
                  onChange={(e) => setPriceDisplay(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="product-desc">Description</Label>
                <Textarea
                  id="product-desc"
                  rows={5}
                  placeholder="Detail materials, dimensions, or instructions…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                  className="resize-y"
                />
              </div>
            </div>
          </div>

          {/* Media / Images Section */}
          <div className="space-y-4 pt-2">
            <div>
              <h3 className="text-base font-semibold">Product Images</h3>
              <p className="text-xs text-muted-foreground">Manage gallery order and primary cover photo.</p>
            </div>
            <Separator />

            {isEdit && p ? (
              <ImageUploader productId={p.id} initialImages={p.images} />
            ) : (
              <div className="flex items-center gap-2.5 rounded-lg border border-blue-500/40 bg-blue-500/20 p-4 text-xs text-muted-foreground">
                <Info className="size-4 shrink-0 text-primary" />
                <span>Save this product first to enable image uploads.</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls (Right 1 Column) */}
        <div className="space-y-6">
          {/* Status & Visibility Flags */}
          <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold tracking-tight">Visibility & Flags</h3>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Out of Stock</Label>
                  <p className="text-xs text-muted-foreground">Disables purchasing</p>
                </div>
                <Switch checked={outOfStock} onCheckedChange={setOutOfStock} />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">New Arrival</Label>
                  <p className="text-xs text-muted-foreground">Badge on catalog</p>
                </div>
                <Switch checked={newArrival} onCheckedChange={setNewArrival} />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Featured</Label>
                  <p className="text-xs text-muted-foreground">Display on storefront</p>
                </div>
                <Switch checked={featured} onCheckedChange={setFeatured} />
              </div>
            </div>
          </div>

          {/* Shipping & Specs */}
          <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold tracking-tight">Dimensions & Specs</h3>
            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="widthCm" className="text-xs">Width (cm)</Label>
                <Input
                  id="widthCm"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="heightCm" className="text-xs">Height (cm)</Label>
                <Input
                  id="heightCm"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="depthCm" className="text-xs">Depth (cm)</Label>
                <Input
                  id="depthCm"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={depthCm}
                  onChange={(e) => setDepthCm(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="weightGrams" className="text-xs">Weight (g)</Label>
                <Input
                  id="weightGrams"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Form Action Controls */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/products')}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || name.trim().length < 2}>
          {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}