-- Managed production workspace for creative client projects.
-- A lead becomes a project only after the owner confirms the engagement.
CREATE TABLE IF NOT EXISTS "creative_project" (
  "id" text PRIMARY KEY,
  "project_code" text NOT NULL UNIQUE,
  "service_request_id" text NOT NULL UNIQUE REFERENCES "service_request"("id") ON DELETE RESTRICT,
  "client_name" text NOT NULL,
  "client_email" text NOT NULL,
  "service_name" text NOT NULL,
  "brief" text NOT NULL,
  "status" text NOT NULL DEFAULT 'queued'
    CHECK ("status" IN ('queued','assigned','in_production','internal_review','client_review','revision','approved','delivered','cancelled')),
  "priority" text NOT NULL DEFAULT 'normal'
    CHECK ("priority" IN ('low','normal','high','urgent')),
  "assigned_type" text NOT NULL DEFAULT 'unassigned'
    CHECK ("assigned_type" IN ('unassigned','human','ai','hybrid')),
  "assigned_to" text,
  "assigned_role" text,
  "due_at" timestamptz,
  "agreed_price_idr" bigint NOT NULL DEFAULT 0 CHECK ("agreed_price_idr" >= 0),
  "revision_limit" integer NOT NULL DEFAULT 2 CHECK ("revision_limit" BETWEEN 0 AND 20),
  "revisions_used" integer NOT NULL DEFAULT 0 CHECK ("revisions_used" >= 0),
  "quality_checklist" jsonb NOT NULL DEFAULT '{"brief_match":false,"visual_quality":false,"audio_quality":false,"spelling_brand":false,"rights_clearance":false}'::jsonb,
  "deliverable_url" text,
  "client_approved_at" timestamptz,
  "internal_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "creative_project_status_idx" ON "creative_project" ("status", "updated_at" DESC);
CREATE INDEX IF NOT EXISTS "creative_project_due_idx" ON "creative_project" ("due_at") WHERE "status" NOT IN ('delivered','cancelled');
CREATE TABLE IF NOT EXISTS "creative_project_event" (
  "id" text PRIMARY KEY,
  "project_id" text NOT NULL REFERENCES "creative_project"("id") ON DELETE CASCADE,
  "actor" text NOT NULL,
  "event_type" text NOT NULL,
  "detail" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "creative_project_event_project_idx" ON "creative_project_event" ("project_id", "created_at" DESC);
