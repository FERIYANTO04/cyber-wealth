CREATE TABLE "affiliate_commission" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"link_id" text,
	"amount_idr" bigint NOT NULL,
	"period_label" text NOT NULL,
	"status" text DEFAULT 'reported' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "affiliate_link" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"destination_url" text NOT NULL,
	"channel" text DEFAULT 'konten' NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_link_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

CREATE TABLE "affiliate_program" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"network" text NOT NULL,
	"signup_url" text NOT NULL,
	"commission_note" text NOT NULL,
	"commission_rate" text,
	"market" text DEFAULT 'International' NOT NULL,
	"status" text DEFAULT 'candidate' NOT NULL,
	"data_source" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "agent_run" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text,
	"agent_name" text NOT NULL,
	"task" text NOT NULL,
	"trigger" text DEFAULT 'owner' NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"summary" text,
	"detail" text,
	"items_created" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint

CREATE TABLE "campaign_draft" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"channel" text NOT NULL,
	"audience" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source" text DEFAULT 'template' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "market_signal" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"market" text NOT NULL,
	"evidence" text NOT NULL,
	"metric" text NOT NULL,
	"confidence" text DEFAULT 'measured' NOT NULL,
	"data_source" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "plan" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"features" text NOT NULL,
	"price_idr" bigint NOT NULL,
	"interval" text DEFAULT 'month' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plan_code_unique" UNIQUE("code")
);
--> statement-breakpoint

CREATE TABLE "service_request" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"service_id" text,
	"service_name" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"market" text DEFAULT 'Indonesia' NOT NULL,
	"brief" text NOT NULL,
	"budget_idr" bigint,
	"status" text DEFAULT 'new' NOT NULL,
	"proposal_body" text,
	"proposal_amount_idr" bigint,
	"proposal_source" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_request_code_unique" UNIQUE("code")
);
--> statement-breakpoint

CREATE TABLE "service" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"detail" text NOT NULL,
	"category" text DEFAULT 'website' NOT NULL,
	"price_from_idr" bigint DEFAULT 0 NOT NULL,
	"delivery_days" integer DEFAULT 7 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"data_source" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "service_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"plan_id" text NOT NULL,
	"plan_name" text NOT NULL,
	"account_email" text NOT NULL,
	"account_name" text NOT NULL,
	"amount_idr" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invoice_id" text,
	"invoice_url" text,
	"paid_at" timestamp,
	"period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_access_token_unique" UNIQUE("access_token")
);
