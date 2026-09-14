'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getEmailConfig, saveEmailConfig, sendEmail } from '@/lib/email';
import { writeAuditEvent } from '@/lib/audit';

export async function getSettings() {
  await requireAdmin();
  return getEmailConfig();
}

export async function saveEmailSettings(formData: FormData) {
  const currentUser = await requireAdmin();
  if (currentUser.role !== 'superadmin') throw new Error('Only superadmins can change email settings.');

  const provider = formData.get('provider');
  const fromAddress = formData.get('fromAddress');
  const replyTo = formData.get('replyTo');
  const enabled = formData.get('enabled') === 'on';
  if (typeof provider !== 'string' || !['console', 'resend'].includes(provider)) throw new Error('Unsupported email provider.');
  if (typeof fromAddress !== 'string' || !fromAddress.includes('@')) throw new Error('A valid sender address is required.');
  if (replyTo !== null && typeof replyTo !== 'string') throw new Error('Invalid reply-to address.');

  await saveEmailConfig({ provider, fromAddress: fromAddress.trim(), replyTo: typeof replyTo === 'string' && replyTo ? replyTo.trim() : null, enabled });
  await writeAuditEvent({ action: 'email_settings_updated', outcome: 'success', actorUserId: currentUser.id, metadata: { provider, enabled } });
  revalidatePath('/admin/settings');
}

export async function sendTestEmail(formData: FormData) {
  const currentUser = await requireAdmin();
  if (currentUser.role !== 'superadmin') throw new Error('Only superadmins can send test emails.');
  const recipient = formData.get('recipient');
  if (typeof recipient !== 'string' || !/^\S+@\S+\.\S+$/.test(recipient)) throw new Error('Enter a valid test recipient.');
  await sendEmail({ to: recipient.trim().toLowerCase(), subject: 'Admin Portal email test', text: 'Your Admin Portal email configuration is working.' });
  await writeAuditEvent({ action: 'email_test_sent', outcome: 'success', actorUserId: currentUser.id });
}