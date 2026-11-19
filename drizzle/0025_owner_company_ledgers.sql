ALTER TABLE "transaction" ADD COLUMN "ledger" text DEFAULT 'owner' NOT NULL;
--> statement-breakpoint
ALTER TABLE "asset" ADD COLUMN "ledger" text DEFAULT 'owner' NOT NULL;
--> statement-breakpoint
UPDATE "transaction" AS t
SET "ledger" = 'company'
WHERE EXISTS (
  SELECT 1 FROM "order" AS o
  WHERE t."description" LIKE '%' || o."code" || '%'
);
