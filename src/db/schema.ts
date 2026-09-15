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

// ─── Ecommerce ────────────────────────────────────────────────────────────────

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('categories_slug_idx').on(table.slug),
]);

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  /** Price stored in smallest currency unit (paise). Divide by 100 for display. */
  price: integer('price').notNull().default(0),
  outOfStock: integer('out_of_stock').notNull().default(0),
  newArrival: integer('new_arrival').notNull().default(0),
  featured: integer('featured').notNull().default(0),
  /** Dimensions in centimetres */
  widthCm: integer('width_cm'),
  heightCm: integer('height_cm'),
  depthCm: integer('depth_cm'),
  /** Weight in grams */
  weightGrams: integer('weight_grams'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('products_slug_idx').on(table.slug),
  index('products_category_id_idx').on(table.categoryId),
  index('products_featured_idx').on(table.featured),
  index('products_new_arrival_idx').on(table.newArrival),
]);

export const productImages = pgTable('product_images', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  /** Object key in the R2 bucket (used to delete from storage) */
  r2Key: text('r2_key').notNull(),
  /** Public CDN URL for rendering */
  url: text('url').notNull(),
  /** Smaller WebP derivative used by admin listing and editing interfaces. */
  thumbnailR2Key: text('thumbnail_r2_key'),
  thumbnailUrl: text('thumbnail_url'),
  altText: text('alt_text'),
  /** Lower number = shown first */
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
}, (table) => [
  index('product_images_product_id_idx').on(table.productId),
  index('product_images_position_idx').on(table.productId, table.position),
]);
