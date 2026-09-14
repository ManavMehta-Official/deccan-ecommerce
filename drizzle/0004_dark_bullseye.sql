CREATE TABLE "email_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'console' NOT NULL,
	"from_address" text DEFAULT 'Admin Portal <noreply@example.com>' NOT NULL,
	"reply_to" text,
	"enabled" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
