# Deccan

A single-tenant administration portal built with Next.js, PostgreSQL, Drizzle ORM, Cloudflare R2, and server-side authentication. It covers administrator access, user operations, catalog management, optimized product media, audit history, exports, and operational cleanup.

> **Readiness:** This is a strong foundation for an internal or single-tenant admin portal, but you should complete an application-specific security review, rotate all local credentials, configure production email/secrets, and add integration or browser tests before handling sensitive production data.

## What It Includes

- Password login with opaque, hashed database sessions.
- `admin` and `superadmin` authorization checks inside server-side mutations.
- First-admin bootstrap flow controlled by `ALLOW_SETUP`.
- User directory with search, role & verification filtering, server-side pagination, and row inspection drawer.
- User create, edit, single/bulk delete, CSV import, and single/bulk CSV export workflows.
- Admin self-service profile editor, password changer, and active sessions manager.
- 14-day user growth & security activity trend charts.
- Preserved `user` records for application-specific accounts.
- Expiring, single-use invitation tokens and password reset tokens with session revocation.
- Console email delivery for development and Resend delivery for configured deployments.
- Superadmin-only email settings and test-email workflow.
- PostgreSQL-backed rate limiting for login, setup, invitations, and password reset requests.
- Append-only audit events with filters, pagination, CSV export, and retention cleanup.
- Full mobile responsiveness (phones, tablets, desktops) with bottom navigation and drawer sheets.
- Toast notifications (`sonner`), loading skeletons (`loading.tsx`), error boundaries, and breadcrumb navigation.
- Database seeder (`pnpm db:seed`) for instantaneous developer onboarding.
- Flat product categories with unique, automatically generated slugs and product counts.
- Product catalog with search, category/flag filters, pagination, price-in-paise storage, dimensions, stock, new-arrival, and featured controls.
- Product image uploads, removal, drag-to-reorder, and cover-image selection.
- Cloudflare R2-backed product media with safe, application-scoped deletion and audit events.
- Automatic image optimization: raw uploads are never persisted; each upload produces a WebP master (maximum 2560px, quality 82) and an admin thumbnail (maximum 480px, quality 72).
- Media Library with R2 image browsing, product-aware search, card/list views, original-image opening, pagination, linked/unlinked status, and safe deletion.

## Architecture

- **UI:** Next.js App Router with server-rendered dashboard pages and responsive client components for dialogs, drawers, charts, and filters.
- **Authentication:** Password hashes use bcrypt. Sessions use random opaque cookies; only SHA-256 token hashes are stored in PostgreSQL.
- **Authorization:** Server actions, route handlers, and protected pages verify the current administrator independently of UI visibility.
- **Database:** PostgreSQL accessed through Drizzle ORM. Schema changes are tracked in `drizzle/` migrations.
- **Email:** `src/lib/email.ts` selects Console or Resend. API keys remain deployment secrets; provider and sender settings are stored as non-secret configuration.
- **Tokens:** Invitation and reset tokens are random, stored only as hashes, expire, and are marked used atomically.
- **Audit:** Events store actor, action, outcome, target, safe metadata, and timestamp. Sensitive values are redacted before persistence.
- **Media:** The server uses `sharp` to process upload buffers, stores master/thumbnail WebP derivatives in Cloudflare R2, and records their object keys and CDN URLs in PostgreSQL.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Redirects to the administrator portal |
| `/admin/login` | Administrator login and password recovery link |
| `/admin/setup` | One-time first-superadmin bootstrap |
| `/admin` | Dashboard summary, metric cards, 14-day trend charts, and recent activity |
| `/admin/users` | User directory with search, filters, pagination, bulk actions, and detail drawer |
| `/admin/users/export` | Filtered CSV export of user directory |
| `/admin/audit` | Filtered audit history with pagination |
| `/admin/audit/export` | Filtered CSV export, capped at 5,000 events |
| `/admin/audit/cleanup` | Superadmin-only retention cleanup POST endpoint |
| `/admin/categories` | Create, edit, count, and safely delete flat product categories |
| `/admin/categories/[id]` | Edit an individual category |
| `/admin/products` | Searchable/filterable, paginated product catalog |
| `/admin/products/new` | Create a product with pricing, flags, category, and dimensions |
| `/admin/products/[id]` | Edit a product and manage/reorder its optimized image assets |
| `/admin/media` | R2 product media library with product search and card/list views |
| `/admin/settings` | Admin profile, password change, active sessions, appearance, and email settings |
| `/admin/forgot-password` | Password reset request |
| `/admin/reset-password` | Password reset completion |
| `/admin/accept-invite` | Invitation acceptance and password setup |


## Requirements

- Node.js 20 or newer.
- pnpm 10 or newer.
- PostgreSQL 14 or newer.
- HTTPS in production.
- A trusted proxy configuration if your deployment uses forwarded client IP headers.
- A verified sender domain for production Resend delivery.
- A Cloudflare R2 bucket and public bucket URL/domain for product media.

## Local Setup

```bash
pnpm install
cp .env.example .env.local
```

Set `DATABASE_URL` and the R2 variables in `.env.local`, then apply migrations:

```bash
pnpm db:migrate
```

Temporarily set `ALLOW_SETUP="true"`, start the app, and open `/admin/setup`:

```bash
pnpm dev
```

After creating the first superadmin, set `ALLOW_SETUP="false"` and restart the server. Do not leave setup enabled in a deployed environment.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ALLOW_SETUP` | Bootstrap only | Enables first-admin setup temporarily |
| `APP_ORIGIN` | Production | Canonical public origin for state-changing browser requests |
| `RATE_LIMIT_SECRET` | Production | HMAC secret for rate-limit keys |
| `TRUST_PROXY` | Deployment-specific | Trusts `x-forwarded-for`/`x-real-ip` only when set to `true` |
| `LOGIN_RATE_LIMIT` | No | Login attempts per IP window; default `10` |
| `LOGIN_RATE_WINDOW_SECONDS` | No | Login IP window; default `600` |
| `ACCOUNT_RATE_LIMIT` | No | Login/reset attempts per account; default `5` |
| `ACCOUNT_RATE_WINDOW_SECONDS` | No | Account window; default `900` |
| `SETUP_RATE_LIMIT` | No | Setup/invitation attempts; default `3` |
| `SETUP_RATE_WINDOW_SECONDS` | No | Setup window; default `3600` |
| `AUDIT_RETENTION_DAYS` | No | Manual cleanup threshold; default `365`, range `30` to `3650` |
| `EMAIL_PROVIDER` | No | `console` for development or `resend` |
| `EMAIL_FROM` | Resend | Default sender fallback |
| `EMAIL_REPLY_TO` | No | Default reply-to fallback |
| `EMAIL_ENABLED` | No | Default email enabled state before database settings exist |
| `RESEND_API_KEY` | Resend production | Server-only Resend API key |
| `R2_ACCOUNT_ID` | Product media | Cloudflare account ID used for the S3-compatible R2 endpoint |
| `R2_ACCESS_KEY_ID` | Product media | R2 API-token access key ID |
| `R2_SECRET_ACCESS_KEY` | Product media | R2 API-token secret access key; server-only |
| `R2_BUCKET_NAME` | Product media | Bucket that stores optimized product images |
| `R2_PUBLIC_URL` | Product media | Public R2 development URL or custom media domain, e.g. `https://media.example.com` |

Never commit `.env`, `.env.local`, database URLs, API keys, or replacement secrets.

## Product Media and Cloudflare R2

Create an R2 API token with object read/write access limited to the configured bucket, and expose that bucket through an R2 public-development URL or custom domain. Configure the five `R2_*` variables above; the same public URL is used by Next.js image configuration and the site CSP.

From a product edit page, upload JPEG, PNG, WebP, AVIF, or GIF files up to 10 MB. The server validates the upload, applies EXIF orientation, limits decoded input to 40 megapixels, and writes only these two files to R2:

| Derivative | Purpose | Settings |
| --- | --- | --- |
| Master WebP | Storefront/full-size display | Max 2560 × 2560px, quality 82 |
| Thumbnail WebP | Product editor and Media Library | Max 480 × 480px, quality 72 |

The original upload remains only in server memory during processing. Existing pre-optimization product images remain readable and fall back to their master URL until they are replaced. The Media Library intentionally manages only the `products/` prefix, protecting unrelated R2 bucket objects from portal deletion.

## Email Configuration

For local development, use Console delivery. Invitation and reset links are written to the server log.

For Resend:

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM="Admin Portal <noreply@yourdomain.com>"
```

Then open **Settings**, select **Resend**, configure the sender, enable delivery, and send a test email. Verify the sender domain in Resend first. The API key is never stored in the database or sent to the browser.

## Database Workflow

```bash
pnpm db:generate   # Generate a migration after schema changes
pnpm db:migrate    # Apply migrations
```

The repository includes migrations for sessions, rate limits, audit events, account tokens, email settings, product categories, products, product images, and image-thumbnail metadata. Back up production before applying migrations and test migrations against a clean database during releases.

## Security Model

- Sessions are HttpOnly, SameSite=Lax, Secure in production, and expire after seven days.
- Passwords are hashed with bcrypt and require at least 12 characters for new/reset passwords.
- Login, setup, invitation, and reset paths have PostgreSQL-backed fixed-window throttling.
- Rate-limit keys are HMAC-hashed; do not enable proxy trust unless the proxy is controlled and configured.
- Audit cleanup is POST-only, same-origin protected, authenticated, and superadmin-only.
- Audit metadata excludes passwords, tokens, emails, IP addresses, files, and CSV contents.
- Security headers are configured in `next.config.ts`.
- Product-media actions require an authenticated administrator, validate file type/size, restrict Media Library deletion to the `products/` R2 prefix, and audit mutations.

## Commands

```bash
pnpm dev          # Start development server
pnpm db:seed      # Seed sample users, admins, and audit activity
pnpm typecheck    # TypeScript validation
pnpm lint         # ESLint
pnpm test         # Unit tests
pnpm build        # Production build
pnpm start        # Start production build
```


## Production Checklist

- Rotate any credential present in local `.env` files.
- Store all secrets in the hosting platform's secret manager.
- Set `ALLOW_SETUP=false` after bootstrap.
- Set a unique `APP_ORIGIN` and `RATE_LIMIT_SECRET`.
- Configure HTTPS and trusted proxy behavior.
- Configure and test Resend with a verified domain.
- Create a least-privilege R2 API token, set all `R2_*` variables, and verify the public media domain is reachable.
- Run the catalog/media migrations before deploying the product-management interface.
- Verify a product upload creates a WebP master and `-thumb.webp` derivative, and confirm Media Library deletion removes both.
- Run migrations with a database backup available.
- Configure audit retention and archival operations.
- Add application-specific integration/browser tests.
- Review CSP and deployment headers for your exact hosting environment.
- Confirm database backups and restore procedures.

## Scope and Limitations

This is intentionally a single-tenant administrator console. It does not include tenant isolation, billing, granular permissions, a user-facing storefront for products, scheduled retention jobs, built-in observability, or MFA. Console email is for development only. Audit writes are best-effort and should be monitored in production. Image processing is intentionally synchronous for the 10 MB upload limit; use a queue/worker service if future workloads require much larger source files or bulk reprocessing. Before publishing for general reuse, add integration/E2E tests and perform a security review for your deployment and application-specific data model.
