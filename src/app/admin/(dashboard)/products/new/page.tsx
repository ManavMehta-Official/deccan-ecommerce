import { getCategories } from '@/db/queries';
import { ProductForm } from '@/components/admin/productForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'New Product — Admin' };

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="inline-flex size-8 items-center justify-center rounded-lg bg-muted">
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back to products</span>
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-bold tracking-tight">New Product</h1>
          </div>
          <p className="text-sm text-muted-foreground">Fill in the details, then save to add images.</p>
        </div>
      </div>

      <ProductForm
        mode="create"
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
