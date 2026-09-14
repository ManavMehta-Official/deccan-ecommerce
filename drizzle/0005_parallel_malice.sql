CREATE TABLE "user_mfa" (
	"user_id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"recovery_code_hashes" jsonb NOT NULL,
	"enabled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD COLUMN "mfa_verified" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;