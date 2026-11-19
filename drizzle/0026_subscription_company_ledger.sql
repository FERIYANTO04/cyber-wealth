UPDATE "transaction" AS t
SET "ledger" = 'company'
WHERE EXISTS (
  SELECT 1
  FROM "subscription" AS s
  WHERE t."description" = s."plan_name" || ' — ' || s."account_email"
);
