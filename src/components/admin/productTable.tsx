'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { MoreHorizontal, Pencil, Trash2, Search, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { deleteProduct } from '@/app/admin/actions';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  outOfStock: number;
  newArrival: number;
  featured: number;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: Date;
};

type ProductWithCover = Product & { coverUrl?: string };

interface Props {
  products: ProductWithCover[];
  categories: { id: string; name: string }[];
  total: number;
  page: number;
  totalPages: number;
}

function formatPrice(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);
}

export function ProductTable({ products, categories, total, page, totalPages }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  function goPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  function confirmDelete(id: string) {
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (result.success) {
        toast.success('Product deleted.');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed to delete product.');
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-muted/60 border border-border w-full"
            placeholder="Search products…"
            defaultValue={searchParams.get('query') ?? ''}
            onChange={(e) => setParam('query', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={searchParams.get('categoryId') ?? 'all'}
            onValueChange={(value) => setParam('categoryId', value === 'all' ? '' : value ?? '')}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All categories">
                {categories.find((c) => c.id === searchParams.get('categoryId'))?.name ?? 'All categories'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { label: 'Featured', param: 'featured' },
            { label: 'New', param: 'newArrival' },
            { label: 'Out of Stock', param: 'outOfStock' },
          ].map(({ label, param }) => {
            const active = searchParams.get(param) === '1';
            return (
              <Button
                key={param}
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => setParam(param, active ? '' : '1')}
                className="whitespace-nowrap"
              >
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border flex flex-col items-center justify-center py-16 text-center gap-2">
          <p className="text-sm text-muted-foreground">No products found.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (< sm) */}
          <div className="grid gap-3 sm:hidden">
            {products.map((product) => (
              <div key={product.id} className="rounded-lg border border-border p-3.5 bg-card space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-md bg-muted overflow-hidden border border-border flex items-center justify-center shrink-0">
                      {product.coverUrl ? (
                        <Image
                          src={product.coverUrl}
                          alt={product.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <ImageIcon className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm truncate">{product.name}</h4>
                      <div className="text-xs text-muted-foreground font-mono truncate">{product.slug}</div>
                      {product.categoryName && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1">
                          {product.categoryName}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger nativeButton={true} render={
                      <Button variant="ghost" size="icon" className="size-8 -mr-1">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    } />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem nativeButton={false} render={<Link href={`/admin/products/${product.id}`} />}>
                        <Pencil className="size-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onClick={() => setDeletingId(product.id)}
                      >
                        <Trash2 className="size-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                  <span className="font-semibold text-sm text-foreground">{formatPrice(product.price)}</span>
                  <div className="flex flex-wrap gap-1">
                    {product.outOfStock === 1 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Out of Stock</Badge>}
                    {product.newArrival === 1 && <Badge className={cn('text-[10px] px-1.5 py-0 bg-blue-500 hover:bg-blue-600 text-white border-0')}>New</Badge>}
                    {product.featured === 1 && <Badge className={cn('text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-600 text-white border-0')}>Featured</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= sm) */}
          <div className="hidden sm:block rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-14" />
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="size-10 rounded-md bg-muted overflow-hidden border border-border flex items-center justify-center shrink-0">
                        {product.coverUrl ? (
                          <Image
                            src={product.coverUrl}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <ImageIcon className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{product.slug}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {product.categoryName
                        ? <Badge variant="outline" className="text-xs">{product.categoryName}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{formatPrice(product.price)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {product.outOfStock === 1 && <Badge variant="destructive" className="text-xs">Out of Stock</Badge>}
                        {product.newArrival === 1 && <Badge className={cn('text-xs bg-blue-500 hover:bg-blue-600 text-white border-0')}>New</Badge>}
                        {product.featured === 1 && <Badge className={cn('text-xs bg-amber-500 hover:bg-amber-600 text-white border-0')}>Featured</Badge>}
                        {product.outOfStock !== 1 && product.newArrival !== 1 && product.featured !== 1 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger nativeButton={true} render={
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        } />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem nativeButton={false} render={<Link href={`/admin/products/${product.id}`} />}>
                            <Pencil className="size-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => setDeletingId(product.id)}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
            <span>{total} product{total !== 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
            <DialogDescription>
              This permanently removes the product and all its images from R2 storage. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => setDeletingId(null)} disabled={isPending}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deletingId && confirmDelete(deletingId)}
              disabled={isPending}
            >
              {isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}