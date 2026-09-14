import { redirect } from 'next/navigation';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { adminSessions, users } from '@/db/schema';
import { consumeAccountToken, getValidAccountToken, TOKEN_TYPES } from '@/lib/accountTokens';
import { writeAuditEvent } from '@/lib/audit';

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token || '';
  async function resetPassword(formData: FormData) {
    'use server';
    const password = formData.get('password');
    const confirmation = formData.get('confirmation');
    if (typeof password !== 'string' || password.length < 12 || password !== confirmation) throw new Error('Passwords must match and be at least 12 characters.');
    const accountToken = await getValidAccountToken(token, TOKEN_TYPES.passwordReset);
    if (!accountToken?.userId) redirect('/admin/forgot-password?error=invalid-token');
    const consumed = await consumeAccountToken(accountToken.id);
    if (!consumed) redirect('/admin/forgot-password?error=invalid-token');
    await db.update(users).set({ password: await hash(password, 10), updatedAt: new Date() }).where(eq(users.id, accountToken.userId));
    await db.delete(adminSessions).where(eq(adminSessions.userId, accountToken.userId));
    await writeAuditEvent({ action: 'password_reset_completed', outcome: 'success', actorUserId: accountToken.userId });
    redirect('/admin/login?reset=success');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form action={resetPassword} className="w-full max-w-md space-y-5 rounded-2xl border border-border/60 bg-card p-8 shadow-xl">
        <div><h1 className="text-2xl font-semibold">Choose a new password</h1><p className="text-sm text-muted-foreground">Use at least 12 characters.</p></div>
        <input name="password" type="password" required minLength={12} placeholder="New password" className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm" />
        <input name="confirmation" type="password" required minLength={12} placeholder="Confirm password" className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm" />
        <button type="submit" className="h-10 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground">Update password</button>
      </form>
    </main>
  );
}