CREATE TABLE "billing_cycle" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"due_at" timestamp NOT NULL,
	"amount_idr" bigint NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"invoice_id" text,
	"invoice_url" text,
	"reminder_stage" integer DEFAULT 0 NOT NULL,
	"reminder_at" timestamp,
	"paid_at" timestamp,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_request" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"subscription_id" text,
	"cycle_id" text,
	"email" text NOT NULL,
	"reason" text NOT NULL,
	"amount_idr" bigint,
	"status" text DEFAULT 'pending' NOT NULL,
	"proposal_id" text,
	"decision_note" text,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_message" (
	"id" text PRIMARY KEY NOT NULL,
	"to_email" text NOT NULL,
	"kind" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"detail" text,
	"related_type" text,
	"related_id" text,
	"data_source" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "interval" text DEFAULT 'month' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "auto_renew" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "auto_renew_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "label" text;