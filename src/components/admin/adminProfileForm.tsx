'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { updateAdminProfile, changeAdminPassword } from '@/app/admin/actions';
import { User, Lock, Loader2, Eye, EyeOff } from 'lucide-react';

type AdminProfileFormProps = {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
  };
};

export function AdminProfileForm({ user }: AdminProfileFormProps) {
  const [profilePending, setProfilePending] = React.useState(false);
  const [passwordPending, setPasswordPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfilePending(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await updateAdminProfile(formData);
      if (res.success) {
        toast.success('Profile updated successfully');
      } else {
        toast.error(res.error || 'Failed to update profile');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setProfilePending(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordPending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    try {
      const res = await changeAdminPassword(formData);
      if (res.success) {
        toast.success('Password changed successfully');
        form.reset();
      } else {
        toast.error(res.error || 'Failed to change password');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setPasswordPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Details */}
      <Card className="rounded-xl border bg-card text-card-foreground shadow-2xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-3 mb-2">
            <div className="flex size-9 items-center justify-center rounded-lg dark:bg-white dark:text-black bg-black text-white border shadow-2xs shrink-0">
              <User className="size-4.5" />
            </div>
            <div>
              <span>Admin Profile</span>
              <p className="text-xs font-normal text-muted-foreground">
                Update your personal display name and avatar image.
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="admin-name" className="text-xs font-medium">Display Name</Label>
                <Input
                  id="admin-name"
                  name="name"
                  defaultValue={user.name || ''}
                  placeholder="Your Name"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="admin-email" className="text-xs font-medium">Email Address</Label>
                <Input
                  id="admin-email"
                  defaultValue={user.email}
                  disabled
                  className="h-9 text-xs bg-muted/40 cursor-not-allowed opacity-80"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="admin-image" className="text-xs font-medium">Avatar Image URL (optional)</Label>
              <Input
                id="admin-image"
                name="image"
                defaultValue={user.image || ''}
                placeholder="https://example.com/avatar.jpg"
                className="h-9 text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={profilePending}
              className="h-9 text-xs font-medium"
            >
              {profilePending ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card className="rounded-xl border bg-card text-card-foreground shadow-2xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-3 mb-2">
            <div className="flex size-9 items-center justify-center rounded-lg dark:bg-white dark:text-black bg-black text-white border shadow-2xs shrink-0">
              <Lock className="size-4.5" />
            </div>
            <div>
              <span>Change Password</span>
              <p className="text-xs font-normal text-muted-foreground">
                Ensure your account is using a secure password of at least 12 characters.
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="current-pass" className="text-xs font-medium">Current Password</Label>
                <Input
                  id="current-pass"
                  name="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="new-pass" className="text-xs font-medium">New Password</Label>
                <Input
                  id="new-pass"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={12}
                  placeholder="Min 12 characters"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="confirm-pass" className="text-xs font-medium">Confirm New Password</Label>
                <Input
                  id="confirm-pass"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={12}
                  placeholder="Repeat new password"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {showPassword ? 'Hide password characters' : 'Show password characters'}
              </button>

              <Button
                type="submit"
                disabled={passwordPending}
                className="h-9 text-xs font-medium self-end sm:self-auto"
              >
                {passwordPending ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
