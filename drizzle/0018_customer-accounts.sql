CREATE TABLE "customer_account" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_account_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "customer_token" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"kind" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_token_token_hash_unique" UNIQUE("token_hash")
);
