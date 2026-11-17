CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"country" text DEFAULT 'ID' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"access_token" text NOT NULL,
	"product_id" text NOT NULL,
	"product_slug" text NOT NULL,
	"product_name" text NOT NULL,
	"customer_id" text,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"amount_idr" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'xendit' NOT NULL,
	"invoice_id" text,
	"invoice_url" text,
	"paid_at" timestamp,
	"delivery_count" integer DEFAULT 0 NOT NULL,
	"data_source" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_code_unique" UNIQUE("code"),
	CONSTRAINT "order_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'template' NOT NULL,
	"price_idr" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"deliverable_note" text,
	"file_key" text,
	"file_name" text,
	"file_size" integer,
	"data_source" text DEFAULT 'live' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_slug_unique" UNIQUE("slug")
);
