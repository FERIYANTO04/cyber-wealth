-- Real workforce roster: a candidate becomes a team member only after explicit owner action.
CREATE TABLE IF NOT EXISTS "team_member" (
  "id" text PRIMARY KEY,
  "talent_application_id" text NOT NULL UNIQUE REFERENCES "talent_application"("id") ON DELETE RESTRICT,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "portfolio" text,
  "employment_type" text NOT NULL DEFAULT 'freelance' CHECK ("employment_type" IN ('employee','contractor','freelance')),
  "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','paused','offboarded')),
  "notes" text,
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_member_status_role_idx" ON "team_member" ("status","role");
