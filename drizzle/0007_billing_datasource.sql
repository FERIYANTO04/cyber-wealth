ALTER TABLE "billing_cycle" ADD COLUMN "data_source" text DEFAULT 'live' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "data_source" text DEFAULT 'live' NOT NULL;