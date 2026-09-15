'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { deleteCategory } from '@/app/admin/actions';
import { CategoryDialog } from './categoryDialog';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
  createdAt: Date;
};

interface Props {
  categories: Category[];
}

export function CategoryTable({ categories }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function confirmDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.success) {
        toast.success('Category deleted.');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Failed to delete category.');
      }
      setDeletingId(null);
    });
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border flex flex-col items-center justify-center py-16 text-center gap-3">
        <p className="text-sm text-muted-foreground">No categories yet.</p>
        <CategoryDialog mode="create" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{cat.slug}</code>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{cat.productCount}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                  {cat.description ?? <span className="italic text-muted-foreground/60">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <CategoryDialog
                      mode="edit"
                      category={cat}
                      trigger={
                        <Button variant="ghost" size="icon" className="size-8">
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit category</span>
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(cat.id)}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete category</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Categories with assigned products cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
    </>
  );
}