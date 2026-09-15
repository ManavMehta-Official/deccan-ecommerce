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
import sharp from 'sharp';

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

// ─── Ecommerce — Categories ────────────────────────────────────────────────────

import { categories, productImages, products } from '@/db/schema';
import { toSlug } from '@/db/queries';
import { uploadToR2, deleteFromR2 } from '@/lib/r2';

export async function createCategory(formData: FormData) {
  const currentUser = await requireAdmin();
  const nameRaw = formData.get('name');
  const descriptionRaw = formData.get('description');
  const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
  const description = typeof descriptionRaw === 'string' ? descriptionRaw.trim() : '';

  if (name.length < 2 || name.length > 100) {
    return { success: false, error: 'Category name must be between 2 and 100 characters.' };
  }

  const slug = toSlug(name);
  if (!slug) return { success: false, error: 'Category name must include letters or numbers.' };
  const id = randomBytes(8).toString('hex');

  try {
    await db.insert(categories).values({ id, name, slug, description: description || null });
    await writeAuditEvent({
      action: 'category_created',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: 'category',
      targetId: id,
      metadata: { name },
    });
    revalidatePath('/admin/categories');
    return { success: true, id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('unique')) return { success: false, error: 'A category with that name already exists.' };
    console.error('createCategory error:', error);
    return { success: false, error: 'Failed to create category.' };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  const currentUser = await requireAdmin();
  const nameRaw = formData.get('name');
  const descriptionRaw = formData.get('description');
  const name = typeof nameRaw === 'string' ? nameRaw.trim() : '';
  const description = typeof descriptionRaw === 'string' ? descriptionRaw.trim() : '';

  if (name.length < 2 || name.length > 100) {
    return { success: false, error: 'Category name must be between 2 and 100 characters.' };
  }

  const slug = toSlug(name);
  if (!slug) return { success: false, error: 'Category name must include letters or numbers.' };

  try {
    const [updated] = await db
      .update(categories)
      .set({ name, slug, description: description || null, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning({ id: categories.id });

    if (!updated) return { success: false, error: 'Category not found.' };

    await writeAuditEvent({
      action: 'category_updated',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: 'category',
      targetId: id,
      metadata: { name },
    });
    revalidatePath('/admin/categories');
    revalidatePath(`/admin/categories/${id}`);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('unique')) return { success: false, error: 'A category with that name already exists.' };
    console.error('updateCategory error:', error);
    return { success: false, error: 'Failed to update category.' };
  }
}

export async function deleteCategory(id: string) {
  const currentUser = await requireAdmin();

  // Guard: don't delete a category that still has products assigned
  const [{ productCount }] = await db
    .select({ productCount: sql<number>`count(*)` })
    .from(products)
    .where(eq(products.categoryId, id));

  if (Number(productCount) > 0) {
    return { success: false, error: `Cannot delete: ${productCount} product(s) are still in this category. Reassign them first.` };
  }

  try {
    const [deleted] = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id });

    if (!deleted) return { success: false, error: 'Category not found.' };

    await writeAuditEvent({
      action: 'category_deleted',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: 'category',
      targetId: id,
    });
    revalidatePath('/admin/categories');
    return { success: true };
  } catch (error) {
    console.error('deleteCategory error:', error);
    return { success: false, error: 'Failed to delete category.' };
  }
}

// ─── Ecommerce — Products ──────────────────────────────────────────────────────

function parseProductFormData(formData: FormData) {
  const get = (key: string) => {
    const v = formData.get(key);
    return typeof v === 'string' ? v.trim() : '';
  };
  const getInt = (key: string) => {
    const raw = get(key);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isSafeInteger(value) ? value : null;
  };
  const getBool = (key: string) => get(key) === 'true' || get(key) === '1' ? 1 : 0;

  return {
    name: get('name'),
    description: get('description') || null,
    /** Price in paise — frontend sends value already multiplied by 100 */
    price: getInt('price') ?? 0,
    categoryId: get('categoryId') || null,
    outOfStock: getBool('outOfStock'),
    newArrival: getBool('newArrival'),
    featured: getBool('featured'),
    widthCm: getInt('widthCm'),
    heightCm: getInt('heightCm'),
    depthCm: getInt('depthCm'),
    weightGrams: getInt('weightGrams'),
  };
}

function validateProductData(data: ReturnType<typeof parseProductFormData>) {
  if (data.name.length < 2 || data.name.length > 200) {
    return 'Product name must be between 2 and 200 characters.';
  }
  if (data.description && data.description.length > 5000) {
    return 'Product description must be 5,000 characters or fewer.';
  }
  const values = [data.price, data.widthCm, data.heightCm, data.depthCm, data.weightGrams];
  if (values.some((value) => value !== null && (value < 0 || value > 2_147_483_647))) {
    return 'Price, dimensions, and weight must be non-negative whole numbers within the supported range.';
  }
  return null;
}

const MASTER_MAX_DIMENSION = 2560;
const THUMBNAIL_MAX_DIMENSION = 480;

async function createImageDerivatives(source: Buffer) {
  const image = sharp(source, { limitInputPixels: 40_000_000, animated: false }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error('Invalid image data.');

  const resize = { width: MASTER_MAX_DIMENSION, height: MASTER_MAX_DIMENSION, fit: 'inside' as const, withoutEnlargement: true };
  const thumbnailResize = { width: THUMBNAIL_MAX_DIMENSION, height: THUMBNAIL_MAX_DIMENSION, fit: 'inside' as const, withoutEnlargement: true };
  const [master, thumbnail] = await Promise.all([
    image.clone().resize(resize).webp({ quality: 82, effort: 4 }).toBuffer(),
    image.clone().resize(thumbnailResize).webp({ quality: 72, effort: 4 }).toBuffer(),
  ]);
  return { master, thumbnail };
}

async function ensureCategoryExists(categoryId: string | null) {
  if (!categoryId) return true;
  const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1);
  return Boolean(category);
}

export async function createProduct(formData: FormData) {
  const currentUser = await requireAdmin();
  const data = parseProductFormData(formData);

  const validationError = validateProductData(data);
  if (validationError) return { success: false, error: validationError };
  if (!/^\d+$/.test(String(formData.get('price') ?? ''))) return { success: false, error: 'Price is required and must be in whole paise.' };
  if (!await ensureCategoryExists(data.categoryId)) return { success: false, error: 'Selected category no longer exists.' };

  const slug = toSlug(data.name);
  if (!slug) return { success: false, error: 'Product name must include letters or numbers.' };
  const id = randomBytes(8).toString('hex');

  try {
    await db.insert(products).values({ id, slug, ...data });
    await writeAuditEvent({
      action: 'product_created',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: 'product',
      targetId: id,
      metadata: { name: data.name },
    });
    revalidatePath('/admin/products');
    return { success: true, id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('unique')) return { success: false, error: 'A product with that name/slug already exists.' };
    console.error('createProduct error:', error);
    return { success: false, error: 'Failed to create product.' };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  const currentUser = await requireAdmin();
  const data = parseProductFormData(formData);

  const validationError = validateProductData(data);
  if (validationError) return { success: false, error: validationError };
  if (!/^\d+$/.test(String(formData.get('price') ?? ''))) return { success: false, error: 'Price is required and must be in whole paise.' };
  if (!await ensureCategoryExists(data.categoryId)) return { success: false, error: 'Selected category no longer exists.' };

  const slug = toSlug(data.name);
  if (!slug) return { success: false, error: 'Product name must include letters or numbers.' };

  try {
    const [updated] = await db
      .update(products)
      .set({ slug, ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning({ id: products.id });

    if (!updated) return { success: false, error: 'Product not found.' };

    await writeAuditEvent({
      action: 'product_updated',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: 'product',
      targetId: id,
      metadata: { name: data.name },
    });
    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${id}`);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('unique')) return { success: false, error: 'A product with that name/slug already exists.' };
    console.error('updateProduct error:', error);
    return { success: false, error: 'Failed to update product.' };
  }
}

export async function deleteProduct(id: string) {
  const currentUser = await requireAdmin();

  // Delete all R2 images for this product before removing the DB row
  const images = await db
    .select({ r2Key: productImages.r2Key, thumbnailR2Key: productImages.thumbnailR2Key })
    .from(productImages)
    .where(eq(productImages.productId, id));

  try {
    await Promise.all(images.flatMap((image) => [image.r2Key, image.thumbnailR2Key].filter((key): key is string => Boolean(key))).map(deleteFromR2));

    const [deleted] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });

    if (!deleted) return { success: false, error: 'Product not found.' };

    await writeAuditEvent({
      action: 'product_deleted',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: 'product',
      targetId: id,
    });
    revalidatePath('/admin/products');
    return { success: true };
  } catch (error) {
    console.error('deleteProduct error:', error);
    return { success: false, error: 'Failed to delete product.' };
  }
}

// ─── Ecommerce — Product Images ────────────────────────────────────────────────

export async function uploadProductImage(formData: FormData) {
  const currentUser = await requireAdmin();

  const productId = formData.get('productId');
  const file = formData.get('file');
  const altText = formData.get('altText');

  if (typeof productId !== 'string' || !productId) {
    return { success: false, error: 'Missing productId.' };
  }
  if (!(file instanceof File)) {
    return { success: false, error: 'No file provided.' };
  }

  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return { success: false, error: 'Product not found.' };

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Only JPEG, PNG, WebP, AVIF and GIF images are allowed.' };
  }
  if (file.size > MAX_SIZE) {
    return { success: false, error: 'File exceeds 10 MB limit.' };
  }

  // Determine the next position index
  const [{ maxPos }] = await db
    .select({ maxPos: sql<number>`coalesce(max(position), -1)` })
    .from(productImages)
    .where(eq(productImages.productId, productId));

  const position = Number(maxPos) + 1;
  const imageId = randomBytes(8).toString('hex');
  const r2Key = `products/${productId}/${imageId}.webp`;
  const thumbnailR2Key = `products/${productId}/${imageId}-thumb.webp`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { master, thumbnail } = await createImageDerivatives(buffer);
    const [url, thumbnailUrl] = await Promise.all([
      uploadToR2(r2Key, master, 'image/webp'),
      uploadToR2(thumbnailR2Key, thumbnail, 'image/webp'),
    ]);

    await db.insert(productImages).values({
      id: imageId,
      productId,
      r2Key,
      url,
      thumbnailR2Key,
      thumbnailUrl,
      altText: typeof altText === 'string' ? altText.trim() || null : null,
      position,
    });

    await writeAuditEvent({
      action: 'product_image_uploaded',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: 'product',
      targetId: productId,
    });
    revalidatePath(`/admin/products/${productId}`);
    return { success: true, image: { id: imageId, url, thumbnailUrl, position } };
  } catch (error) {
    // If inserting metadata fails after a successful upload, avoid leaving an orphaned object.
    await Promise.all([deleteFromR2(r2Key), deleteFromR2(thumbnailR2Key)].map((operation) => operation.catch(() => undefined)));
    console.error('uploadProductImage error:', error);
    return { success: false, error: 'Failed to upload image.' };
  }
}

export async function deleteProductImage(imageId: string) {
  const currentUser = await requireAdmin();

  const [image] = await db
    .select({ r2Key: productImages.r2Key, thumbnailR2Key: productImages.thumbnailR2Key, productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);

  if (!image) return { success: false, error: 'Image not found.' };

  try {
    await Promise.all([image.r2Key, image.thumbnailR2Key].filter((key): key is string => Boolean(key)).map(deleteFromR2));
    await db.delete(productImages).where(eq(productImages.id, imageId));
    await writeAuditEvent({
      action: 'product_image_deleted',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: 'product',
      targetId: image.productId,
    });
    revalidatePath(`/admin/products/${image.productId}`);
    return { success: true };
  } catch (error) {
    console.error('deleteProductImage error:', error);
    return { success: false, error: 'Failed to delete image.' };
  }
}

export async function reorderProductImages(productId: string, orderedIds: string[]) {
  const currentUser = await requireAdmin();

  if (new Set(orderedIds).size !== orderedIds.length) {
    return { success: false, error: 'Image order contains duplicate images.' };
  }

  try {
    const existing = await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, productId));
    if (existing.length !== orderedIds.length || existing.some((image) => !orderedIds.includes(image.id))) {
      return { success: false, error: 'Image list does not match this product.' };
    }
    await Promise.all(
      orderedIds.map((id, position) =>
        db
          .update(productImages)
          .set({ position })
          .where(and(eq(productImages.id, id), eq(productImages.productId, productId)))
      )
    );
    await writeAuditEvent({
      action: 'product_images_reordered',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: 'product',
      targetId: productId,
    });
    revalidatePath(`/admin/products/${productId}`);
    return { success: true };
  } catch (error) {
    console.error('reorderProductImages error:', error);
    return { success: false, error: 'Failed to reorder images.' };
  }
}

/** Delete an object shown in the Media Library. Only application product media is in scope. */
export async function deleteMediaObject(key: string) {
  const currentUser = await requireAdmin();
  if (!key.startsWith('products/') || key.includes('..') || key.length > 500) {
    return { success: false, error: 'Invalid media object.' };
  }

  const [linkedImage] = await db
    .select({ id: productImages.id, productId: productImages.productId, thumbnailR2Key: productImages.thumbnailR2Key })
    .from(productImages)
    .where(eq(productImages.r2Key, key))
    .limit(1);

  try {
    await Promise.all([key, linkedImage?.thumbnailR2Key].filter((candidate): candidate is string => Boolean(candidate)).map(deleteFromR2));
    if (linkedImage) await db.delete(productImages).where(eq(productImages.id, linkedImage.id));
    await writeAuditEvent({
      action: 'media_object_deleted',
      outcome: 'success',
      actorUserId: currentUser.id,
      targetType: linkedImage ? 'product_image' : 'media_object',
      targetId: linkedImage?.id,
      metadata: { linked: Boolean(linkedImage) },
    });
    revalidatePath('/admin/media');
    if (linkedImage) revalidatePath(`/admin/products/${linkedImage.productId}`);
    return { success: true };
  } catch (error) {
    console.error('deleteMediaObject error:', error);
    return { success: false, error: 'Failed to delete media object.' };
  }
}
