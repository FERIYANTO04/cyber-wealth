ALTER TABLE "money_allocation_policy" ALTER COLUMN "owner_percent" SET DEFAULT 50;
ALTER TABLE "money_allocation_policy" ALTER COLUMN "operations_percent" SET DEFAULT 40;
UPDATE "money_allocation_policy"
SET "owner_percent" = 50, "operations_percent" = 40, "reserve_percent" = 10, "updated_at" = now()
WHERE "id" = 'default' AND "owner_percent" = 70 AND "operations_percent" = 20 AND "reserve_percent" = 10;
