CREATE TABLE "revenue_offer" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "model" text NOT NULL,
  "market" text DEFAULT 'both' NOT NULL,
  "description" text NOT NULL,
  "price_idr" bigint DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_lead" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "market" text DEFAULT 'Indonesia' NOT NULL,
  "interest" text NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "source" text DEFAULT 'owner-entry' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
