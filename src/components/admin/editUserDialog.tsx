// src/components/admin/editUserDialog.tsx
'use client';

import { useState } from 'react';
import { Pencil, Loader2, User, Mail, Lock, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { updateUser } from '@/app/admin/actions';
import { toast } from 'sonner';

type User = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  role: string;
};

export function EditUserDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.append('id', user.id);
    try {
      await updateUser(formData);
      toast.success('User updated successfully');
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to update this user.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border/70 cursor-pointer transition-colors">
        <Pencil className="size-3" />
        Edit
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">Edit User</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update profile details, role, verification status, or reset password for {user.email}.
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="name" className="text-xs font-medium">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={user.name || ''} 
                  placeholder="John Doe" 
                  className="pl-9 h-9 text-xs" 
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-xs font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  defaultValue={user.email} 
                  required 
                  className="pl-9 h-9 text-xs" 
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="password" className="text-xs font-medium">New Password (optional)</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  name="password" 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Leave blank to keep current" 
                  minLength={12}
                  className="pl-9 pr-9 h-9 text-xs" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="grid gap-1.5">
                <Label htmlFor="role" className="text-xs font-medium">Role</Label>
                <div className="relative">
                  <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10 pointer-events-none" />
                  <Select name="role" defaultValue={user.role}>
                    <SelectTrigger className="pl-9 h-9 text-xs">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user" className="text-xs">User</SelectItem>
                      <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                      <SelectItem value="superadmin" className="text-xs">Superadmin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1 sm:pt-5">
                <Checkbox id="verified" name="verified" defaultChecked={!!user.emailVerified} />
                <Label htmlFor="verified" className="text-xs font-medium leading-none cursor-pointer">
                  Mark email verified
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-9 text-xs font-medium"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}