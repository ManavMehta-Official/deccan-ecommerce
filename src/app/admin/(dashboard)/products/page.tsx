import { getPaginatedProducts, getCategories } from '@/db/queries';
import { ProductTable } from '@/components/admin/productTable';
import Link from 'next/link';
import { ShoppingBag, Plus } from 'lucide-react';
import { db } from '@/db';
import { productImages } from '@/db/schema';
import { inArray } from 'drizzle-orm';
import { asc } from 'drizzle-orm';

export const metadata = { title: 'Products — Admin' };

interface Props {
  searchParams: Promise<{ query?: string; categoryId?: string; featured?: string; newArrival?: string; outOfStock?: string; page?: string; }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = parseInt(sp.page ?? '1', 10) || 1;

  const [{ products: productList, total, totalPages }, categories] = await Promise.all([
    getPaginatedProducts({
      query: sp.query,
      categoryId: sp.categoryId,
      featured: sp.featured === '1' ? true : undefined,
      newArrival: sp.newArrival === '1' ? true : undefined,
      outOfStock: sp.outOfStock === '1' ? true : undefined,
      page,
    }),
    getCategories(),
  ]);

  // Fetch cover images (position = 0) for listed products
  const coverMap: Record<string, string> = {};
  if (productList.length > 0) {
    const ids = productList.map((p) => p.id);
    const covers = await db
      .select({ productId: productImages.productId, url: productImages.url })
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(asc(productImages.position));

    // Use the first (lowest-position) image per product as cover
    for (const c of covers) {
      if (!coverMap[c.productId]) coverMap[c.productId] = c.url;
    }
  }

  const productsWithCover = productList.map((p) => ({
    ...p,
    coverUrl: coverMap[p.id],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          </div>
            <p className="text-sm text-muted-foreground">Total products: {total}</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex h-8 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/80"
        >
            <Plus className="size-4 mr-1.5" /> New Product
        </Link>
      </div>

      <ProductTable
        products={productsWithCover}
        categories={categories.map(({ id, name }) => ({ id, name }))}
        total={total}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
