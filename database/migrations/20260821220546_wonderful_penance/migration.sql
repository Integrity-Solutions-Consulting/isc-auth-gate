ALTER TABLE "sessions" ADD COLUMN "security_level" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "security_level" text DEFAULT 'standard';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_enforced_at" timestamp;