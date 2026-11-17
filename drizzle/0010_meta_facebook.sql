CREATE TABLE "post_track" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"code" text NOT NULL,
	"destination" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_track_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "social_account" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"token_sealed" text NOT NULL,
	"token_expires_at" timestamp,
	"scopes" text,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_checked_at" timestamp,
	"last_error" text,
	"connected_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "ref_code" text;--> statement-breakpoint
ALTER TABLE "social_post" ADD COLUMN "published_at" timestamp;