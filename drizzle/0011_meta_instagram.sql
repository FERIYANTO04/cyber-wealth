ALTER TABLE "social_account" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "social_post" ADD COLUMN "media_key" text;--> statement-breakpoint
ALTER TABLE "social_post" ADD COLUMN "media_type" text;