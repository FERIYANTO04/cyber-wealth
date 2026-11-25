ALTER TABLE "service_request" ADD COLUMN IF NOT EXISTS "proposal_token" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "service_request_proposal_token_unique" ON "service_request" ("proposal_token");