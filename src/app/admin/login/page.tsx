// src/app/admin/login/page.tsx
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/loginForm';
import { authenticateAdmin } from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import {
  accountRateLimitConfig,
  getClientIp,
  isRateLimited,
  loginRateLimitConfig,
  recordRateLimitFailure,
} from '@/lib/rateLimit';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error;

  async function handleLogin(formData: FormData) {
    'use server';

    const email = formData.get('email');
    const password = formData.get('password');
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const clientIp = await getClientIp();
    const loginConfig = loginRateLimitConfig();
    const accountConfig = accountRateLimitConfig();
    const keys = [
      { key: `login:ip:${clientIp}`, config: loginConfig },
      { key: `login:account:${normalizedEmail}`, config: accountConfig },
    ];

    const limited = await isRateLimited(keys);
    if (limited) {
      await writeAuditEvent({ action: 'login_rate_limited', outcome: 'blocked' });
      redirect('/admin/login?error=Too+many+attempts.+Please+try+again+later.');
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      await Promise.all(keys.map(({ key, config }) => recordRateLimitFailure(key, config)));
      await writeAuditEvent({ action: 'login_failure', outcome: 'failure' });
      redirect('/admin/login?error=Invalid credentials or insufficient permissions');
    }

    const authenticationResult = await authenticateAdmin(email, password);
    if (!authenticationResult) {
      await Promise.all(keys.map(({ key, config }) => recordRateLimitFailure(key, config)));
      await writeAuditEvent({ action: 'login_failure', outcome: 'failure' });
      redirect('/admin/login?error=Invalid credentials or insufficient permissions');
    }

    redirect('/admin');
  }

  return <LoginForm action={handleLogin} errorMessage={errorMessage} />;
}