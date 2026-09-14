import { index, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  password: text('password'),
  role: text('role').default('user').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const adminSessions = pgTable('admin_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const rateLimitBuckets = pgTable('rate_limit_buckets', {
  keyHash: text('key_hash').primaryKey(),
  windowStartedAt: timestamp('window_started_at', { mode: 'date' }).notNull(),
  attemptCount: integer('attempt_count').notNull().default(0),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
});

export const auditEvents = pgTable('audit_events', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  outcome: text('outcome').notNull(),
  metadata: jsonb('metadata').$type<Record<string, string | number | boolean | null>>(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('audit_events_created_at_idx').on(table.createdAt),
  index('audit_events_actor_user_id_idx').on(table.actorUserId),
  index('audit_events_action_idx').on(table.action),
]);

export const accountTokens = pgTable('account_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role'),
  type: text('type').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('account_tokens_email_idx').on(table.email),
  index('account_tokens_expires_at_idx').on(table.expiresAt),
]);

export const emailSettings = pgTable('email_settings', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull().default('console'),
  fromAddress: text('from_address').notNull().default('Admin Portal <noreply@example.com>'),
  replyTo: text('reply_to'),
  enabled: integer('enabled').notNull().default(0),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});
