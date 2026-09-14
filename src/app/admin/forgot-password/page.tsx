import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { createAccountToken, TOKEN_TYPES } from '@/lib/accountTokens';
import { sendEmail } from '@/lib/email';
import { writeAuditEvent } from '@/lib/audit';
import { accountRateLimitConfig, getClientIp, isRateLimited, recordRateLimitFailure } from '@/lib/rateLimit';

export default function ForgotPasswordPage() {
  async function requestReset(formData: FormData) {
    'use server';
    const value = formData.get('email');
    const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (/^\S+@\S+\.\S+$/.test(email)) {
      const config = accountRateLimitConfig();
      const keys = [
        { key: `password-reset:ip:${await getClientIp()}`, config },
        { key: `password-reset:account:${email}`, config },
      ];
      if (await isRateLimited(keys)) redirect('/admin/forgot-password?sent=1');
      await Promise.all(keys.map(({ key, config: keyConfig }) => recordRateLimitFailure(key, keyConfig)));
      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (user) {
        const token = await createAccountToken({ type: TOKEN_TYPES.passwordReset, email, userId: user.id, expiresInSeconds: 60 * 60 });
        await sendEmail({
          to: email,
          subject: 'Reset your Admin Portal password',
          text: `Reset your password: ${(process.env.APP_ORIGIN || 'http://localhost:3000')}/admin/reset-password?token=${token}`,
        });
        await writeAuditEvent({ action: 'password_reset_requested', outcome: 'success', actorUserId: user.id });
      } else {
        await writeAuditEvent({ action: 'password_reset_requested', outcome: 'success' });
      }
    }
    redirect('/admin/forgot-password?sent=1');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form action={requestReset} className="w-full max-w-md space-y-5 rounded-2xl border border-border/60 bg-card p-8 shadow-xl">
        <div><h1 className="text-2xl font-semibold">Reset password</h1><p className="text-sm text-muted-foreground">Enter your email and we will send a reset link if an account exists.</p></div>
        <input name="email" type="email" required placeholder="admin@example.com" className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm" />
        <button type="submit" className="h-10 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground">Send reset link</button>
      </form>
    </main>
  );
}