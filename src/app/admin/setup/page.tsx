// src/app/admin/setup/page.tsx
import { db } from '@/db';
import { users } from '@/db/schema';
import { hasSuperAdmin } from '@/db/queries';
import { eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { hash } from 'bcrypt';
import { ShieldAlert } from 'lucide-react';
import { SetupForm } from '@/components/admin/setupForm';
import { writeAuditEvent } from '@/lib/audit';
import {
  getClientIp,
  isRateLimited,
  recordRateLimitFailure,
  setupRateLimitConfig,
} from '@/lib/rateLimit';

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const superAdminExists = await hasSuperAdmin();
  const allowSetup = process.env.ALLOW_SETUP === 'true';

  if (superAdminExists || !allowSetup) {
    redirect('/admin');
  }

  async function createSuperAdmin(formData: FormData) {
    'use server';
    
    const exists = await hasSuperAdmin();
    const envAllow = process.env.ALLOW_SETUP === 'true';
    if (exists || !envAllow) redirect('/admin');

    const setupConfig = setupRateLimitConfig();
    const clientIp = await getClientIp();
    const keys = [
      { key: `setup:ip:${clientIp}`, config: setupConfig },
      { key: 'setup:global', config: setupConfig },
    ];
    const limited = await isRateLimited(keys);
    if (limited) {
      await writeAuditEvent({ action: 'setup_rate_limited', outcome: 'blocked' });
      redirect('/admin/setup?error=Too+many+setup+attempts.+Please+try+again+later.');
    }
    await Promise.all(keys.map(({ key, config }) => recordRateLimitFailure(key, config)));

    const emailValue = formData.get('email');
    const passwordValue = formData.get('password');
    const nameValue = formData.get('name');

    if (typeof emailValue !== 'string' || typeof passwordValue !== 'string' || typeof nameValue !== 'string') {
      await writeAuditEvent({ action: 'setup_failure', outcome: 'failure' });
      throw new Error('Name, email, and password are required.');
    }

    const email = emailValue.trim().toLowerCase();
    const password = passwordValue;
    const name = nameValue.trim();

    if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2 || password.length < 12) {
      await writeAuditEvent({ action: 'setup_failure', outcome: 'failure' });
      throw new Error('Use a valid email, a name, and a password of at least 12 characters.');
    }

    const hashedPassword = await hash(password, 10);

    try {
      await db.transaction(async (transaction) => {
        await transaction.execute(sql`select pg_advisory_xact_lock(81427391)`);
        const [{ count }] = await transaction.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, 'superadmin'));
        if (Number(count) > 0) throw new Error('Setup is already complete.');
        await transaction.insert(users).values({
          id: crypto.randomUUID(),
          name,
          email,
          password: hashedPassword,
          role: 'superadmin',
          emailVerified: new Date(),
        });
      });
    } catch {
      await writeAuditEvent({ action: 'setup_failure', outcome: 'failure' });
      redirect('/admin/setup?error=Setup+could+not+be+completed');
    }

    await writeAuditEvent({
      action: 'setup_success',
      outcome: 'success',
      targetType: 'user',
      metadata: { role: 'superadmin' },
    });
    redirect('/admin');
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md border border-border/60 shadow-xl rounded-2xl backdrop-blur-sm bg-card/95 p-8 space-y-6">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20">
            <ShieldAlert className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Create Superadmin Account</h1>
            <p className="text-xs text-muted-foreground/90">
              Setup your root administration access to initialize the system.
            </p>
          </div>
        </div>

        {params.error && <p className="text-sm text-destructive">{params.error}</p>}
        <SetupForm action={createSuperAdmin} />
      </div>
    </div>
  );
}