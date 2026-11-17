-- Make manual bank transfer the default for all newly created orders.
-- Historical migrations are intentionally preserved for existing installations.
ALTER TABLE IF EXISTS "order" ALTER COLUMN provider SET DEFAULT 'manual_transfer';
