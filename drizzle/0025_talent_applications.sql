CREATE TABLE IF NOT EXISTS "talent_application" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "portfolio" text,
  "experience" text NOT NULL,
  "message" text NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "talent_application_created_at_idx" ON "talent_application" ("created_at");
