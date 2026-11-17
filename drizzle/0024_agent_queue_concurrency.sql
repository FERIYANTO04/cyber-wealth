CREATE UNIQUE INDEX "agent_task_queue_one_active_role_idx"
  ON "agent_task_queue" ("agent_role")
  WHERE "status" IN ('queued', 'running');

CREATE UNIQUE INDEX "agent_run_one_ceo_running_idx"
  ON "agent_run" ("task")
  WHERE "task" = 'ceo' AND "status" = 'running';