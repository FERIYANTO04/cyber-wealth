CREATE TABLE "ai_usage_event" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "agent_name" text,
  "task" text,
  "input_tokens" bigint DEFAULT 0 NOT NULL,
  "output_tokens" bigint DEFAULT 0 NOT NULL,
  "total_tokens" bigint DEFAULT 0 NOT NULL,
  "estimated_cost_idr" bigint,
  "cost_currency" text DEFAULT 'IDR' NOT NULL,
  "cost_source" text DEFAULT 'unpriced' NOT NULL,
  "request_status" text NOT NULL,
  "occurred_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_usage_event_occurred_at_idx" ON "ai_usage_event" USING btree ("occurred_at");
--> statement-breakpoint
CREATE INDEX "ai_usage_event_provider_idx" ON "ai_usage_event" USING btree ("provider","occurred_at");
--> statement-breakpoint
CREATE TABLE "ai_provider_payment" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "payment_method" text NOT NULL,
  "amount_idr" bigint NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "external_invoice_id" text,
  "external_payment_id" text,
  "receipt_url" text,
  "paid_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_allocation_policy" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_percent" integer DEFAULT 70 NOT NULL,
  "operations_percent" integer DEFAULT 20 NOT NULL,
  "reserve_percent" integer DEFAULT 10 NOT NULL,
  "auto_pay_enabled" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "money_allocation_policy_total_100" CHECK ("money_allocation_policy"."owner_percent" + "money_allocation_policy"."operations_percent" + "money_allocation_policy"."reserve_percent" = 100),
  CONSTRAINT "money_allocation_policy_nonnegative" CHECK ("money_allocation_policy"."owner_percent" >= 0 AND "money_allocation_policy"."operations_percent" >= 0 AND "money_allocation_policy"."reserve_percent" >= 0)
);
--> statement-breakpoint
INSERT INTO "money_allocation_policy" ("id", "owner_percent", "operations_percent", "reserve_percent", "auto_pay_enabled")
VALUES ('default', 70, 20, 10, false)
ON CONFLICT ("id") DO NOTHING;