CREATE TABLE "ai_chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"owner_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
