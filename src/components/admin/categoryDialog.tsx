'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { createCategory, updateCategory } from '@/app/admin/actions';

function toSlugPreview(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

interface CommonProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface CategoryDialogProps extends CommonProps {
  mode: 'create';
}

interface EditCategoryDialogProps extends CommonProps {
  mode: 'edit';
  category: { id: string; name: string; description: string | null };
  trigger?: React.ReactElement;
  defaultOpen?: boolean;
}

type Props = CategoryDialogProps | EditCategoryDialogProps;

export function CategoryDialog(props: Props) {
  const isEdit = props.mode === 'edit';
  const initial = isEdit ? (props as EditCategoryDialogProps).category : null;

  const [internalOpen, setInternalOpen] = useState(isEdit && Boolean((props as EditCategoryDialogProps).defaultOpen));
  const isControlled = props.open !== undefined;
  const open = isControlled ? props.open : internalOpen;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const slugPreview = toSlugPreview(name);

  function handleOpenChange(val: boolean) {
    if (props.onOpenChange) {
      props.onOpenChange(val);
    }
    if (!isControlled) {
      setInternalOpen(val);
    }
    if (!val) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEdit
        ? await updateCategory((props as EditCategoryDialogProps).category.id, formData)
        : await createCategory(formData);

      if (result.success) {
        toast.success(isEdit ? 'Category updated.' : 'Category created.');
        handleOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Something went wrong.');
      }
    });
  }

  const trigger: React.ReactElement = isEdit
    ? ((props as EditCategoryDialogProps).trigger ?? (
        <Button variant="outline" size="sm">
          <Pencil className="size-3.5 mr-1.5" /> Edit
        </Button>
      ))
    : (
        <Button size="lg" className="text-xs py-3">
          <Plus className="size-4" /> New Category
        </Button>
      );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && <DialogTrigger nativeButton={true} render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              name="name"
              placeholder="e.g. Decor, Textiles…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
            />
            {name && (
              <p className="text-xs text-muted-foreground">
                Slug: <span className="font-mono">{slugPreview}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="cat-desc"
              name="description"
              rows={3}
              placeholder="Short description of this category…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || name.trim().length < 2}>
              {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}