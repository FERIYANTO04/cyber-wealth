CREATE TABLE IF NOT EXISTS "member_account" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "password_hash" text NOT NULL,
  "referral_code" text NOT NULL UNIQUE,
  "referred_by" text,
  "phone" text,
  "bank_name" text,
  "bank_account_name" text,
  "bank_account_number" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "member_commission" (
  "id" text PRIMARY KEY NOT NULL,
  "member_id" text NOT NULL,
  "source_type" text NOT NULL,
  "source_ref" text,
  "description" text NOT NULL,
  "amount_idr" bigint NOT NULL,
  "status" text DEFAULT 'approved' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "member_withdrawal" (
  "id" text PRIMARY KEY NOT NULL,
  "member_id" text NOT NULL,
  "amount_idr" bigint NOT NULL,
  "bank_name" text NOT NULL,
  "bank_account_name" text NOT NULL,
  "bank_account_number" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "admin_note" text,
  "decided_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "member_commission_member_idx" ON "member_commission" ("member_id");
CREATE INDEX IF NOT EXISTS "member_withdrawal_member_idx" ON "member_withdrawal" ("member_id");
