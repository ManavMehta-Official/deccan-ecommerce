// src/components/admin/deleteUserDialog.tsx
'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type DeleteActionState = {
  success?: boolean;
  error?: string;
} | null;

interface DeleteUserDialogProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  action: (prevState: DeleteActionState, formData: FormData) => Promise<DeleteActionState>;
}

export function DeleteUserDialog({ user, action }: DeleteUserDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState('');
  const [state, formAction, isPending] = useActionState(action, null);

  const targetName = user.name || user.email;
  const isMatch = confirmText === targetName;

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setConfirmText('');
    }
  };

  const prevSuccessRef = React.useRef(state?.success);
  React.useEffect(() => {
    if (state?.success && !prevSuccessRef.current) {
      toast.success('User deleted successfully');
      setOpen(false);
      setConfirmText('');
    } else if (state?.error && !prevSuccessRef.current) {
      toast.error(state.error);
    }
    prevSuccessRef.current = state?.success;
  }, [state?.success, state?.error]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-lg size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 border border-border/70 cursor-pointer transition-colors" title="Delete user">
        <Trash2 className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Delete User</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{targetName}</span>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4 pt-2">
          <input type="hidden" name="id" value={user.id} />

          {state?.error && (
            <div className="flex items-center gap-2.5 p-3 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertCircle className="size-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm-name" className="text-xs font-medium text-foreground/80">
              Type <span className="font-semibold text-foreground">{targetName}</span> to confirm
            </Label>
            <Input
              id="confirm-name"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={targetName}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-3 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setConfirmText('');
              }}
              className="h-9 text-xs font-medium rounded-lg cursor-pointer w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={isPending || !isMatch}
              className="h-9 text-xs font-medium rounded-lg w-full sm:w-auto disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}