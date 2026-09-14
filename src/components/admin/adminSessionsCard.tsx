'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { revokeOtherAdminSessions } from '@/app/admin/actions';
import { Shield, Laptop, Loader2, LogOut, Clock } from 'lucide-react';

type SessionItem = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
};

type AdminSessionsCardProps = {
  sessions: SessionItem[];
};

export function AdminSessionsCard({ sessions }: AdminSessionsCardProps) {
  const [revoking, setRevoking] = React.useState(false);

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  };

  const handleRevokeOther = async () => {
    const confirm = window.confirm('Are you sure you want to log out all other active sessions?');
    if (!confirm) return;

    setRevoking(true);
    try {
      const res = await revokeOtherAdminSessions();
      if (res.success) {
        toast.success('Other sessions revoked successfully');
      } else {
        toast.error(res.error || 'Failed to revoke sessions');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Card className="rounded-xl border bg-card text-card-foreground shadow-2xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-black text-white dark:bg-white dark:text-black border border-amber-500/15 shadow-2xs shrink-0">
            <Shield className="size-4.5" />
          </div>
          <div className="flex flex-col">
            <span>Active Admin Sessions</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              Manage active authentication sessions and devices associated with your admin account.
            </p>
          </div>
        </CardTitle>

        {sessions.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            disabled={revoking}
            onClick={handleRevokeOther}
            className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5 shrink-0 self-start sm:self-auto"
          >
            {revoking ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Revoking...
              </>
            ) : (
              <>
                <LogOut className="size-3.5" />
                Revoke other sessions
              </>
            )}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        <div className="divide-y divide-border/50 rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No active sessions found.
            </div>
          ) : (
            sessions.map((session, index) => {
              const isCurrent = index === 0;

              return (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500 border border-border/60 text-muted-foreground shadow-2xs shrink-0">
                      <Laptop className="size-4 text-foreground/80" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-foreground">
                          Admin Session
                        </p>
                        {isCurrent && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium rounded-full"
                          >
                            Current Session
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Started {formatDate(session.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 self-start sm:self-auto pl-11 sm:pl-0">
                    <Clock className="size-3 shrink-0" />
                    <span>Expires {formatDate(session.expiresAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}