'use server';

import { db } from '@/db';
import { adminSessions, users } from '@/db/schema';
import { hash } from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { logoutAdmin, requireAdmin } from '@/lib/auth';
import { writeAuditEvent } from '@/lib/audit';
import { createAccountToken, TOKEN_TYPES } from '@/lib/accountTokens';
import { sendEmail } from '@/lib/email';
import { isRateLimited, recordRateLimitFailure, setupRateLimitConfig } from '@/lib/rateLimit';

export { logoutAdmin };

export async function inviteUser(formData: FormData) {
  const currentUser = await requireAdmin();
  const emailValue = formData.get('email');
  const nameValue = formData.get('name');
  const roleValue = formData.get('role');
  const email = typeof emailValue === 'string' ? emailValue.trim().toLowerCase() : '';
  const name = typeof nameValue === 'string' ? nameValue.trim() : '';
  const role = typeof roleValue === 'string' ? roleValue : 'user';

  if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2 || !VALID_ROLES.has(role)) {
    throw new Error('Use a valid name, email, and role.');
  }
  if (role === 'superadmin' && currentUser.role !== 'superadmin') {
    throw new Error('Only superadmins can invite superadmin accounts.');
  }

  const key = `invitation:${email}`;
  const config = setupRateLimitConfig();
  if (await isRateLimited([{ key, config }])) {
    throw new Error('Too many invitation attempts. Please try again later.');
  }
  await recordRateLimitFailure(key, config);

  const token = await createAccountToken({
    type: TOKEN_TYPES.invitation,
    email,
    name,
    role,
    expiresInSeconds: 60 * 60 * 24,
  });
  const origin = process.env.APP_ORIGIN || 'http://localhost:3000';
  await sendEmail({
    to: email,
    subject: 'You have been invited to the Admin Portal',
    text: `Complete your account setup: ${origin}/admin/accept-invite?token=${token}`,
  });
  await writeAuditEvent({
    action: 'invitation_created',
    outcome: 'success',
    actorUserId: currentUser.id,
    targetType: 'invitation',
    metadata: { role },
  });
  revalidatePath('/admin/users');
}

type ImportActionState = {
  success?: boolean;
  count?: number;
  error?: string;
} | null;

const VALID_ROLES = new Set(['user', 'admin', 'superadmin']);
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;
const MAX_FIELD_LENGTH = 200;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && nextCharacter === '\n') index += 1;
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function createUser(formData: FormData) {
  const currentUser = await requireAdmin();
  const name = formData.get('name') as string;
  const email = normalizeEmail((formData.get('email') as string) || '');
  const password = formData.get('password') as string;
  const role = (formData.get('role') as string) || 'user';
  const isVerified = formData.get('verified') === 'on';

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || !VALID_ROLES.has(role)) {
    throw new Error('Use a valid email, a password of at least 12 characters, and a valid role.');
  }

  if (role === 'superadmin' && currentUser.role !== 'superadmin') {
    throw new Error('Only superadmins can create superadmin accounts.');
  }

  const hashedPassword = await hash(password, 10);

  await db.insert(users).values({
    id: crypto.randomUUID(),
    name: name || null,
    email,
    password: hashedPassword,
    role,
    emailVerified: isVerified ? new Date() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await writeAuditEvent({
    action: 'user_created',
    outcome: 'success',
    actorUserId: currentUser.id,
    targetType: 'user',
    metadata: { role },
  });

  revalidatePath('/admin/users');
}

export async function updateUser(formData: FormData) {
  const currentUser = await requireAdmin();
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const email = normalizeEmail((formData.get('email') as string) || '');
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;
  const isVerified = formData.get('verified') === 'on';

  if (!id || !email) {
    throw new Error('User ID and email are required.');
  }

  if (!/^\S+@\S+\.\S+$/.test(email) || !VALID_ROLES.has(role)) {
    throw new Error('Use a valid email and role.');
  }

  if (role === 'superadmin' && currentUser.role !== 'superadmin') {
    throw new Error('Only superadmins can assign the superadmin role.');
  }

  if (id === currentUser.id && role !== currentUser.role) {
    throw new Error('You cannot change your own administrator role.');
  }

  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) throw new Error('User not found.');
  if (target.role === 'superadmin' && currentUser.role !== 'superadmin') {
    throw new Error('Only superadmins can modify superadmin accounts.');
  }

  const updateData: Partial<typeof users.$inferInsert> = {
    name: name || null,
    email,
    role,
    emailVerified: isVerified ? new Date() : null,
    updatedAt: new Date(),
  };

  if (password && password.trim() !== '') {
    if (password.length < 12) {
      throw new Error('Passwords must be at least 12 characters.');
    }
    updateData.password = await hash(password, 10);
  }

  await db.update(users)
    .set(updateData)
    .where(eq(users.id, id));

  await writeAuditEvent({
    action: role !== target.role ? 'user_role_changed' : 'user_updated',
    outcome: 'success',
    actorUserId: currentUser.id,
    targetType: 'user',
    targetId: id,
    metadata: role !== target.role ? { fromRole: target.role, toRole: role } : undefined,
  });

  revalidatePath('/admin/users');
}

export async function importUsersAction(
  _prevState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const currentUser = await requireAdmin();
  const file = formData.get('file') as File;
  if (!file || file.size === 0) {
    return { error: 'Please select a valid CSV file.' };
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return { error: 'CSV files must be smaller than 5 MB.' };
  }

  if (currentUser.role !== 'superadmin') {
    return { error: 'Only superadmins can import users.' };
  }

  try {
    const text = await file.text();
    const rows = parseCsv(text);

    if (rows.length < 2) {
      return { error: 'The CSV file is empty or missing data rows.' };
    }

    if (rows.length - 1 > MAX_IMPORT_ROWS) {
      return { error: 'CSV imports are limited to 1,000 data rows.' };
    }

    // Parse header row
    const headers = rows[0].map((header) => header.toLowerCase().trim());
    const findIndex = (names: string[]) => headers.findIndex((h) => names.includes(h));

    const idIndex = findIndex(['id', 'user_id', 'userid']);
    const emailIndex = findIndex(['email', 'email_address', 'emailaddress']);
    const nameIndex = findIndex(['name', 'full_name', 'fullname', 'display_name']);
    const roleIndex = findIndex(['role', 'user_role', 'userrole']);
    const imageIndex = findIndex(['image', 'avatar', 'photo', 'picture', 'avatar_url', 'image_url']);
    const verifiedIndex = findIndex(['email_verified', 'emailverified', 'verified', 'is_verified', 'isverified']);
    const passwordIndex = findIndex(['password', 'pass', 'pwd']);
    const createdAtIndex = findIndex(['created_at', 'createdat', 'created']);
    const updatedAtIndex = findIndex(['updated_at', 'updatedat', 'updated']);

    if (emailIndex === -1) {
      return { error: 'CSV header must include an "email" column.' };
    }

    let importedCount = 0;
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      const rawEmail = emailIndex !== -1 ? values[emailIndex] : '';
      if (!rawEmail) continue;

      const email = normalizeEmail(rawEmail);
      if (!/^\S+@\S+\.\S+$/.test(email) || email.length > MAX_FIELD_LENGTH) {
        continue;
      }

      const id = (idIndex !== -1 && values[idIndex]?.trim()) ? values[idIndex].trim() : crypto.randomUUID();
      const name = (nameIndex !== -1 && values[nameIndex]?.trim()) ? values[nameIndex].trim() : null;
      if (name && name.length > MAX_FIELD_LENGTH) continue;

      const rawRole = (roleIndex !== -1 && values[roleIndex]?.trim().toLowerCase()) ? values[roleIndex].trim().toLowerCase() : 'user';
      const role = VALID_ROLES.has(rawRole) ? rawRole : 'user';

      const image = (imageIndex !== -1 && values[imageIndex]?.trim()) ? values[imageIndex].trim() : null;

      let emailVerified: Date | null = null;
      if (verifiedIndex !== -1 && values[verifiedIndex] !== undefined) {
        const rawVerified = values[verifiedIndex].trim().toLowerCase();
        if (['true', '1', 'yes', 'verified', 't', 'y'].includes(rawVerified)) {
          emailVerified = new Date();
        } else if (['false', '0', 'no', 'unverified', 'f', 'n', ''].includes(rawVerified)) {
          emailVerified = null;
        } else {
          const parsed = new Date(values[verifiedIndex].trim());
          if (!isNaN(parsed.getTime())) {
            emailVerified = parsed;
          }
        }
      }

      let passwordHash: string;
      const rawPassword = passwordIndex !== -1 ? values[passwordIndex]?.trim() : '';
      if (rawPassword && rawPassword.length >= 12) {
        passwordHash = await hash(rawPassword, 10);
      } else {
        passwordHash = await hash(randomBytes(32).toString('base64url'), 10);
      }

      let createdAt = new Date();
      if (createdAtIndex !== -1 && values[createdAtIndex]?.trim()) {
        const parsedCreated = new Date(values[createdAtIndex].trim());
        if (!isNaN(parsedCreated.getTime())) {
          createdAt = parsedCreated;
        }
      }

      let updatedAt = new Date();
      if (updatedAtIndex !== -1 && values[updatedAtIndex]?.trim()) {
        const parsedUpdated = new Date(values[updatedAtIndex].trim());
        if (!isNaN(parsedUpdated.getTime())) {
          updatedAt = parsedUpdated;
        }
      }

      try {
        await db.insert(users).values({
          id,
          email,
          name,
          role,
          image,
          emailVerified,
          password: passwordHash,
          createdAt,
          updatedAt,
        }).onConflictDoNothing(); // Skip existing emails gracefully

        importedCount++;
      } catch {
        // Skip malformed rows
      }
    }

    revalidatePath('/admin/users');
    await writeAuditEvent({
      action: 'users_imported',
      outcome: 'success',
      actorUserId: currentUser.id,
      metadata: { count: importedCount },
    });
    return { success: true, count: importedCount };
  } catch {
    return { error: 'Failed to parse CSV file. Ensure proper comma-separated formatting.' };
  }
}


type DeleteActionState = {
  success?: boolean;
  error?: string;
} | null;

export async function deleteUserAction(
  prevState: DeleteActionState,
  formData: FormData
): Promise<DeleteActionState> {
  try {
    const currentUser = await requireAdmin();
    const id = formData.get('id');

    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Invalid user ID.' };
    }

    if (id === currentUser.id) {
      return { success: false, error: 'You cannot delete your own account.' };
    }

    const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
    if (!target) return { success: false, error: 'User not found.' };

    if (target.role === 'superadmin' && currentUser.role !== 'superadmin') {
      return { success: false, error: 'Only superadmins can delete superadmin accounts.' };
    }

    if (target.role === 'admin' || target.role === 'superadmin') {
      const [{ count: administratorCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.role} in ('admin', 'superadmin')`);

      if (Number(administratorCount) <= 1) {
        return { success: false, error: 'The final administrator cannot be deleted.' };
      }
    }

    // Perform the database deletion
    await db.delete(users).where(eq(users.id, id));

    await writeAuditEvent({
      action: 'user_deleted',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: 'user',
      targetId: id,
      metadata: { role: target.role },
    });

    // Revalidate the users page cache
    revalidatePath('/admin/users');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete user:', error);
    return { success: false, error: 'Failed to delete user. Please try again.' };
  }
}

export async function bulkDeleteUsersAction(userIds: string[]): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const currentUser = await requireAdmin();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { success: false, error: 'No users selected.' };
    }

    // Filter out current user's own ID
    const safeIds = userIds.filter((id) => id !== currentUser.id);
    if (safeIds.length === 0) {
      return { success: false, error: 'You cannot delete your own account.' };
    }

    // Check if any are superadmins when actor is not superadmin
    const targets = await db.select({ id: users.id, role: users.role }).from(users).where(inArray(users.id, safeIds));
    
    if (currentUser.role !== 'superadmin' && targets.some((t) => t.role === 'superadmin')) {
      return { success: false, error: 'Only superadmins can delete superadmin accounts.' };
    }

    // Check remaining admins
    const deletingAdminCount = targets.filter((t) => t.role === 'admin' || t.role === 'superadmin').length;
    if (deletingAdminCount > 0) {
      const [{ count: totalAdmins }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(sql`${users.role} in ('admin', 'superadmin')`);

      if (Number(totalAdmins) - deletingAdminCount < 1) {
        return { success: false, error: 'Cannot delete all administrator accounts.' };
      }
    }

    for (const target of targets) {
      await db.delete(users).where(eq(users.id, target.id));
      await writeAuditEvent({
        action: 'user_deleted',
        outcome: 'success',
        actorUserId: currentUser.id,
        targetType: 'user',
        targetId: target.id,
        metadata: { bulk: true, role: target.role },
      });
    }

    revalidatePath('/admin/users');
    return { success: true, count: targets.length };
  } catch (error) {
    console.error('Bulk delete failed:', error);
    return { success: false, error: 'Failed to complete bulk deletion.' };
  }
}

export async function toggleUserVerificationAction(userId: string): Promise<{ success: boolean; verified?: boolean; error?: string }> {
  try {
    const currentUser = await requireAdmin();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return { success: false, error: 'User not found.' };

    const newVerified = user.emailVerified ? null : new Date();
    await db.update(users).set({ emailVerified: newVerified, updatedAt: new Date() }).where(eq(users.id, userId));

    await writeAuditEvent({
      action: newVerified ? 'user_verified' : 'user_unverified',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: 'user',
      targetId: userId,
    });

    revalidatePath('/admin/users');
    return { success: true, verified: Boolean(newVerified) };
  } catch (error) {
    console.error('Toggle verification failed:', error);
    return { success: false, error: 'Failed to update user verification.' };
  }
}

export async function updateAdminProfile(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdmin();
    const name = formData.get('name') as string;
    const image = formData.get('image') as string;

    if (!name || name.trim().length < 2) {
      return { success: false, error: 'Display name must be at least 2 characters.' };
    }

    await db.update(users).set({
      name: name.trim(),
      image: image?.trim() || null,
      updatedAt: new Date(),
    }).where(eq(users.id, currentUser.id));

    await writeAuditEvent({
      action: 'profile_updated',
      outcome: 'success',
      actorUserId: currentUser.id,
    });

    revalidatePath('/admin');
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: 'Failed to update profile.' };
  }
}

export async function changeAdminPassword(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdmin();
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { success: false, error: 'All password fields are required.' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'New passwords do not match.' };
    }

    if (newPassword.length < 12) {
      return { success: false, error: 'New password must be at least 12 characters long.' };
    }

    const [user] = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
    if (!user || !user.password) {
      return { success: false, error: 'User record not found.' };
    }

    const { compare } = await import('bcrypt');
    const isValid = await compare(currentPassword, user.password);
    if (!isValid) {
      await writeAuditEvent({
        action: 'password_change_failed',
        outcome: 'failure',
        actorUserId: currentUser.id,
      });
      return { success: false, error: 'Current password is incorrect.' };
    }

    const hashedPassword = await hash(newPassword, 10);
    await db.update(users).set({
      password: hashedPassword,
      updatedAt: new Date(),
    }).where(eq(users.id, currentUser.id));

    await writeAuditEvent({
      action: 'password_changed',
      outcome: 'success',
      actorUserId: currentUser.id,
    });

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Password change error:', error);
    return { success: false, error: 'Failed to change password.' };
  }
}

export async function revokeOtherAdminSessions(): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdmin();
    const { getCurrentSessionToken, hashSessionToken } = await import('@/lib/auth');
    const currentToken = await getCurrentSessionToken();

    if (currentToken) {
      const currentHash = hashSessionToken(currentToken);
      await db.delete(adminSessions).where(
        and(
          eq(adminSessions.userId, currentUser.id),
          sql`${adminSessions.tokenHash} != ${currentHash}`
        )
      );
    } else {
      await db.delete(adminSessions).where(eq(adminSessions.userId, currentUser.id));
    }

    await writeAuditEvent({
      action: 'other_sessions_revoked',
      outcome: 'success',
      actorUserId: currentUser.id,
    });

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (error) {
    console.error('Revoke sessions error:', error);
    return { success: false, error: 'Failed to revoke other sessions.' };
  }
}