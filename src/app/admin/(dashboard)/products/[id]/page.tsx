import { notFound } from 'next/navigation';
import { getProductById, getCategories } from '@/db/queries';
import { ProductForm } from '@/components/admin/productForm';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);
  return { title: product ? `${product.name} — Admin` : 'Product not found — Admin' };
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(id),
    getCategories(),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="inline-flex size-8 items-center justify-center rounded-lg bg-muted">
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back to products</span>
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">{product.slug}</p>
        </div>
      </div>

      <ProductForm
        mode="edit"
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        product={product}
      />
    </div>
  );
}
