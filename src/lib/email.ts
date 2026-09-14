import { Resend } from 'resend';
import { db } from '@/db';
import { emailSettings } from '@/db/schema';

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type EmailConfig = {
  provider: string;
  fromAddress: string;
  replyTo: string | null;
  enabled: boolean;
};

const DEFAULT_CONFIG: EmailConfig = {
  provider: process.env.EMAIL_PROVIDER || 'console',
  fromAddress: process.env.EMAIL_FROM || 'Admin Portal <noreply@example.com>',
  replyTo: process.env.EMAIL_REPLY_TO || null,
  enabled: process.env.EMAIL_ENABLED === 'true',
};

export async function getEmailConfig(): Promise<EmailConfig> {
  const [settings] = await db.select().from(emailSettings).limit(1);
  if (!settings) return DEFAULT_CONFIG;
  return {
    provider: settings.provider,
    fromAddress: settings.fromAddress,
    replyTo: settings.replyTo,
    enabled: settings.enabled === 1,
  };
}

export async function saveEmailConfig(config: EmailConfig) {
  const values = {
    id: 'default',
    provider: config.provider,
    fromAddress: config.fromAddress,
    replyTo: config.replyTo || null,
    enabled: config.enabled ? 1 : 0,
    updatedAt: new Date(),
  };
  await db.insert(emailSettings).values(values).onConflictDoUpdate({ target: emailSettings.id, set: values });
}

export async function sendEmail(message: EmailMessage) {
  const config = await getEmailConfig();
  if (!config.enabled || config.provider === 'console') {
    console.info(`[email:${message.to}] ${message.subject}\n${message.text}`);
    return;
  }

  if (config.provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured.');
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: config.fromAddress,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    });
    if (result.error) throw new Error(result.error.message);
    return;
  }

  throw new Error(`Unsupported email provider: ${config.provider}`);
}