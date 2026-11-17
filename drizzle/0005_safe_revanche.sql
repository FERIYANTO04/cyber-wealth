ALTER TABLE "revenue_lead" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "revenue_lead" ADD COLUMN "outreach_body" text;--> statement-breakpoint
ALTER TABLE "revenue_lead" ADD COLUMN "outreach_source" text;--> statement-breakpoint
ALTER TABLE "revenue_lead" ADD COLUMN "last_contacted_at" timestamp;--> statement-breakpoint
ALTER TABLE "revenue_lead" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;