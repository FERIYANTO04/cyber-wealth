CREATE TABLE IF NOT EXISTS "creative_asset_access" (
  "id" text PRIMARY KEY,
  "project_id" text NOT NULL REFERENCES "creative_project"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creative_asset_access_project_idx" ON "creative_asset_access" ("project_id","created_at" DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creative_asset" (
  "id" text PRIMARY KEY,
  "project_id" text NOT NULL REFERENCES "creative_project"("id") ON DELETE CASCADE,
  "access_id" text NOT NULL REFERENCES "creative_asset_access"("id") ON DELETE RESTRICT,
  "object_key" text NOT NULL UNIQUE,
  "file_name" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" bigint NOT NULL CHECK ("size_bytes" > 0),
  "status" text NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','ready','deleted')),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creative_asset_project_status_idx" ON "creative_asset" ("project_id","status","created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creative_asset_access_status_idx" ON "creative_asset" ("access_id","status");
