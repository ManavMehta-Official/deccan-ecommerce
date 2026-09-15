import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Tag } from 'lucide-react';
import { getCategoryById } from '@/db/queries';
import { CategoryDialog } from '@/components/admin/categoryDialog';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const category = await getCategoryById((await params).id);
  return { title: category ? `${category.name} — Admin` : 'Category not found — Admin' };
}

export default async function EditCategoryPage({ params }: Props) {
  const category = await getCategoryById((await params).id);
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/categories" className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back to categories</span>
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Tag className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Edit category</h1>
          </div>
          <p className="text-sm text-muted-foreground">Update {category.name}.</p>
        </div>
      </div>
      <CategoryDialog mode="edit" category={category} defaultOpen />
    </div>
  );
}
