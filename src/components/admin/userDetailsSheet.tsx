'use client';

import * as React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  CheckCircle2, 
  Mail, 
  Shield, 
  User as UserIcon, 
  XCircle,
  Copy,
  Clock,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { toggleUserVerificationAction } from '@/app/admin/actions';

type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserDetailsSheetProps = {
  user: UserDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UserDetailsSheet({ user, open, onOpenChange }: UserDetailsSheetProps) {
  const [toggling, setToggling] = React.useState(false);

  if (!user) return null;

  const formatDate = (d: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(d));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleToggleVerification = async () => {
    setToggling(true);
    try {
      const res = await toggleUserVerificationAction(user.id);
      if (res.success) {
        toast.success(res.verified ? 'User marked as verified' : 'User marked as unverified');
      } else {
        toast.error(res.error || 'Failed to update verification status');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setToggling(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <div className="p-6 space-y-6">
          <SheetHeader className="p-0 text-left">
            <div className="flex items-center gap-4">
              <Avatar className="size-14 ring-2 ring-border/50">
                <AvatarImage src={user.image || ''} alt={user.name || ''} />
                <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <SheetTitle className="text-lg font-bold truncate">
                  {user.name || 'Unnamed User'}
                </SheetTitle>
                <SheetDescription className="text-xs truncate">
                  {user.email}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize px-2.5 py-1 text-xs">
              <Shield className="mr-1 size-3" />
              {user.role}
            </Badge>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
                user.emailVerified
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
              }`}
            >
              {user.emailVerified ? (
                <>
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  Verified
                </>
              ) : (
                <>
                  <XCircle className="size-3.5 text-amber-500" />
                  Unverified
                </>
              )}
            </span>
          </div>

          <Separator />

          <div className="space-y-4 text-xs">
            <h4 className="font-semibold text-foreground tracking-tight text-sm flex items-center gap-2">
              <UserIcon className="size-4 text-muted-foreground" />
              Account Information
            </h4>

            <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <button
                  onClick={() => copyToClipboard(user.id, 'User ID')}
                  className="font-mono flex items-center gap-1 text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="max-w-[160px] truncate">{user.id}</span>
                  <Copy className="size-3 shrink-0" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email Address</span>
                <span className="font-medium text-foreground truncate max-w-[200px]">{user.email}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role Level</span>
                <span className="font-semibold capitalize text-foreground">{user.role}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registered</span>
                <span className="text-foreground">{formatDate(user.createdAt)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="text-foreground">{formatDate(user.updatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground tracking-tight text-sm flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              Quick Actions
            </h4>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={toggling}
                onClick={handleToggleVerification}
                className="w-full justify-start text-xs h-9"
              >
                {user.emailVerified ? (
                  <>
                    <XCircle className="mr-2 size-3.5 text-amber-500" />
                    Mark as Unverified
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 size-3.5 text-emerald-500" />
                    Mark as Verified
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
