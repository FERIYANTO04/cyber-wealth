CREATE TABLE "agent_task_queue" (
  "id" text PRIMARY KEY,
  "workflow_id" text NOT NULL,
  "task" text NOT NULL,
  "agent_role" text NOT NULL,
  "directive" text NOT NULL,
  "status" text NOT NULL DEFAULT 'queued',
  "priority" integer NOT NULL DEFAULT 100,
  "attempts" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 2,
  "available_at" timestamp NOT NULL DEFAULT now(),
  "locked_at" timestamp,
  "locked_by" text,
  "last_error" text,
  "result_summary" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "finished_at" timestamp
);
CREATE INDEX "agent_task_queue_ready_idx" ON "agent_task_queue" ("status", "available_at", "priority", "created_at");
CREATE INDEX "agent_task_queue_workflow_idx" ON "agent_task_queue" ("workflow_id", "created_at");