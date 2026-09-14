import { redirect } from 'next/navigation';
import { hash } from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { consumeAccountToken, getValidAccountToken, TOKEN_TYPES } from '@/lib/accountTokens';
import { writeAuditEvent } from '@/lib/audit';

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token || '';
  async function acceptInvitation(formData: FormData) {
    'use server';
    const password = formData.get('password');
    const confirmation = formData.get('confirmation');
    if (typeof password !== 'string' || password.length < 12 || password !== confirmation) throw new Error('Passwords must match and be at least 12 characters.');
    const invitation = await getValidAccountToken(token, TOKEN_TYPES.invitation);
    if (!invitation || !invitation.role) redirect('/admin/login?error=invalid-invitation');
    const consumed = await consumeAccountToken(invitation.id);
    if (!consumed) redirect('/admin/login?error=invalid-invitation');

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, invitation.email)).limit(1);
    if (existing) redirect('/admin/login?error=account-already-exists');

    const [user] = await db.insert(users).values({
      id: crypto.randomUUID(),
      name: invitation.name,
      email: invitation.email,
      password: await hash(password, 10),
      role: invitation.role,
      emailVerified: new Date(),
    }).returning({ id: users.id });
    await writeAuditEvent({ action: 'invitation_accepted', outcome: 'success', actorUserId: user.id, targetType: 'user', targetId: user.id });
    redirect('/admin/login?invited=success');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form action={acceptInvitation} className="w-full max-w-md space-y-5 rounded-2xl border border-border/60 bg-card p-8 shadow-xl">
        <div><h1 className="text-2xl font-semibold">Accept invitation</h1><p className="text-sm text-muted-foreground">Choose a password of at least 12 characters.</p></div>
        <input name="password" type="password" required minLength={12} placeholder="Password" className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm" />
        <input name="confirmation" type="password" required minLength={12} placeholder="Confirm password" className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm" />
        <button type="submit" className="h-10 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground">Create account</button>
      </form>
    </main>
  );
}