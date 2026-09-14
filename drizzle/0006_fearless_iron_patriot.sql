DROP TABLE "user_mfa" CASCADE;--> statement-breakpoint
ALTER TABLE "admin_sessions" DROP COLUMN "mfa_verified";