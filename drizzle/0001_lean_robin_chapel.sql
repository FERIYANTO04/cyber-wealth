CREATE TABLE "activity_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"agent_name" text,
	"action" text NOT NULL,
	"detail" text NOT NULL,
	"data_source" text DEFAULT 'demo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"mandate" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"data_source" text DEFAULT 'demo' NOT NULL,
	"last_run_at" timestamp,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"value_idr" bigint NOT NULL,
	"data_source" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempt" (
	"email" text PRIMARY KEY NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"locked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "owner_account" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "owner_account_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "proposal" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"category" text NOT NULL,
	"amount_idr" bigint,
	"risk" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decision_note" text,
	"decided_at" timestamp,
	"data_source" text DEFAULT 'demo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"ai_paused" boolean DEFAULT false NOT NULL,
	"net_worth_target_idr" bigint DEFAULT 500000000000 NOT NULL,
	"paused_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount_idr" bigint NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"data_source" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
