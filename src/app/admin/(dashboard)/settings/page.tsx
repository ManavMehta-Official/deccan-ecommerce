import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/themeToggle';
import { saveEmailSettings, sendTestEmail } from '@/app/admin/settings/actions';
import { getEmailConfig } from '@/lib/email';
import { requireAdmin } from '@/lib/auth';
import { getAdminSessions } from '@/db/queries';
import { AdminProfileForm } from '@/components/admin/adminProfileForm';
import { AdminSessionsCard } from '@/components/admin/adminSessionsCard';
import { SystemHealthCard } from '@/components/admin/systemHealthCard';
import { Mail, Palette } from 'lucide-react';

export default async function SettingsPage() {
  const currentUser = await requireAdmin();
  const [emailConfig, sessions] = await Promise.all([
    getEmailConfig(),
    getAdminSessions(currentUser.id),
  ]);

  return (
    <div className="space-y-10 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings & System</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your administrator profile, security sessions, appearance, and platform services.
        </p>
      </div>

      <div className="space-y-10">
        {/* Profile & Security */}
        <AdminProfileForm user={currentUser} />

        {/* Active Sessions */}
        <AdminSessionsCard sessions={sessions} />

        {/* System Diagnostics */}
        <SystemHealthCard
          emailProvider={emailConfig.provider}
          emailEnabled={emailConfig.enabled}
        />

        {/* Appearance */}
        <Card className="rounded-xl border bg-card text-card-foreground shadow-2xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="flex size-9 items-center mb-2 justify-center rounded-lg dark:bg-white dark:text-black bg-black text-white border border-purple-500/15 shadow-2xs shrink-0">
                <Palette className="size-4.5" />
              </div>
              <div className="flex flex-col">
                <span>Appearance</span>
                <p className="text-xs font-normal text-muted-foreground">
                  Customize how the portal appears on your screen.
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Toggle between clean light and sleek dark mode.</p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Email Delivery Configuration */}
        <Card className="rounded-xl border bg-card text-card-foreground shadow-2xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-3 mb-2">
              <div className="flex size-9 items-center justify-center rounded-lg dark:bg-white dark:text-black bg-black text-white border border-blue-500/15 shadow-2xs shrink-0">
                <Mail className="size-4.5" />
              </div>
              <div>
                <span>Email Delivery</span>
                <p className="text-xs font-normal text-muted-foreground">
                  Configure invitation and password recovery emails. API keys are safely managed in deployment secrets.
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentUser.role === 'superadmin' ? (
              <>
                <form action={saveEmailSettings} className="grid gap-5">
                  <div className="grid gap-1.5">
                    <Label htmlFor="provider" className="text-xs font-medium">Email Provider</Label>
                    <select
                      id="provider"
                      name="provider"
                      defaultValue={emailConfig.provider}
                      className="h-9 rounded-lg border border-input bg-transparent px-3 text-xs"
                    >
                      <option value="console">Console (Development only)</option>
                      <option value="resend">Resend (Production)</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="fromAddress" className="text-xs font-medium">From Address</Label>
                    <Input
                      id="fromAddress"
                      name="fromAddress"
                      defaultValue={emailConfig.fromAddress}
                      required
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="replyTo" className="text-xs font-medium">Reply-To Address</Label>
                    <Input
                      id="replyTo"
                      name="replyTo"
                      type="email"
                      defaultValue={emailConfig.replyTo ?? ''}
                      placeholder="support@example.com"
                      className="h-9 text-xs"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      name="enabled"
                      defaultChecked={emailConfig.enabled}
                      className="rounded border-input text-primary focus:ring-ring"
                    />
                    Enable live email delivery
                  </label>
                  <Button type="submit" className="w-fit h-9 text-xs font-medium">
                    Save email settings
                  </Button>
                </form>
                <Separator />
                <form action={sendTestEmail} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="grid gap-1.5">
                    <Label htmlFor="recipient" className="text-xs font-medium">Send test email to</Label>
                    <Input
                      id="recipient"
                      name="recipient"
                      type="email"
                      placeholder="you@example.com"
                      required
                      className="h-9 text-xs"
                    />
                  </div>
                  <Button type="submit" variant="outline" className="h-9 text-xs font-medium">
                    Send test email
                  </Button>
                </form>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Only superadmins can configure email delivery.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}