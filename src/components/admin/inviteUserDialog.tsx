// src/components/admin/inviteUserDialog.tsx
'use client';

import { useState } from 'react';
import { MailPlus, Loader2 } from 'lucide-react';
import { inviteUser } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await inviteUser(new FormData(event.currentTarget));
      toast.success('Invitation sent successfully');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted shadow-2xs cursor-pointer transition-colors">
        <MailPlus className="size-3.5" />
        Invite User
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">Invite user</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send an expiring setup link (valid for 24 hours).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="invite-name" className="text-xs font-medium">Name</Label>
              <Input id="invite-name" name="name" required minLength={2} placeholder="Alex Smith" className="h-9 text-xs" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="invite-email" className="text-xs font-medium">Email</Label>
              <Input id="invite-email" name="email" type="email" required placeholder="alex@example.com" className="h-9 text-xs" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="invite-role" className="text-xs font-medium">Role</Label>
              <Select name="role" defaultValue="user">
                <SelectTrigger className="h-9 text-xs">
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

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={pending} className="w-full h-9 text-xs font-medium" size="lg">
              {pending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending invitation...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}