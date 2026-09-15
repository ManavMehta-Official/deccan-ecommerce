import { db } from '@/db';
import { auditEvents } from '@/db/schema';

export const AUDIT_ACTIONS = [
  'login_success',
  'login_failure',
  'login_rate_limited',
  'logout',
  'setup_success',
  'setup_failure',
  'setup_rate_limited',
  'portal_setup',
  'user_created',
  'user_updated',
  'user_role_changed',
  'user_verified',
  'user_unverified',
  'users_imported',
  'users_exported',
  'user_deleted',
  'profile_updated',
  'password_changed',
  'password_change_failed',
  'other_sessions_revoked',
  'audit_exported',
  'audit_retention_cleanup',
  'invitation_created',
  'invitation_accepted',
  'password_reset_requested',
  'password_reset_completed',
  'email_settings_updated',
  'settings_updated',
  'email_test_sent',
  'category_created',
  'category_updated',
  'category_deleted',
  'product_created',
  'product_updated',
  'product_deleted',
  'product_image_uploaded',
  'product_image_deleted',
  'product_images_reordered',
  'media_object_deleted',
] as const;


export type AuditAction = typeof AUDIT_ACTIONS[number];
export type AuditOutcome = 'success' | 'failure' | 'blocked';
export type AuditMetadata = Record<string, string | number | boolean | null>;

type AuditEvent = {
  action: AuditAction;
  outcome: AuditOutcome;
  actorUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: AuditMetadata;
};

const sensitiveKeys = new Set([
  'password',
  'passwordHash',
  'session',
  'sessionToken',
  'token',
  'ip',
  'email',
  'file',
  'csv',
]);

export function redactMetadata(metadata?: AuditMetadata): AuditMetadata | undefined {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !sensitiveKeys.has(key)),
  ) as AuditMetadata;
}

export async function writeAuditEvent(event: AuditEvent) {
  try {
    await db.insert(auditEvents).values({
      id: crypto.randomUUID(),
      actorUserId: event.actorUserId ?? null,
      action: event.action,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      outcome: event.outcome,
      metadata: redactMetadata(event.metadata),
    });
  } catch (error) {
    console.error('Failed to write audit event:', error instanceof Error ? error.message : 'unknown error');
  }
}
