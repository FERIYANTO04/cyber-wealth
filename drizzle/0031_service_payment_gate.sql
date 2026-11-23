CREATE TABLE IF NOT EXISTS "service_payment" (
  "id" text PRIMARY KEY NOT NULL,
  "code" text NOT NULL UNIQUE,
  "service_request_id" text NOT NULL,
  "amount_idr" bigint NOT NULL,
  "buyer_name" text NOT NULL,
  "buyer_email" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "provider" text NOT NULL DEFAULT 'midtrans',
  "invoice_id" text,
  "invoice_url" text,
  "paid_at" timestamp,
  "data_source" text NOT NULL DEFAULT 'live',
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "service_payment_request_status_idx" ON "service_payment" ("service_request_id", "status");
