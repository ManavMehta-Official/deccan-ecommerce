import { getCategories } from '@/db/queries';
import { CategoryTable } from '@/components/admin/categoryTable';
import { CategoryDialog } from '@/components/admin/categoryDialog';

export const metadata = { title: 'Categories — Admin' };

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Total categories: {categories.length > 0 && `${categories.length}`}
          </p>
        </div>
        <CategoryDialog mode="create" />
      </div>

      <CategoryTable categories={categories.map(c => ({ ...c, productCount: Number(c.productCount) }))} />
    </div>
  );
}
