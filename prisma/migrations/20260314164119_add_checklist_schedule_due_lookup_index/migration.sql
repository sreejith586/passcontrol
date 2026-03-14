-- CreateIndex
CREATE INDEX "checklist_schedules_is_active_next_run_at_idx" ON "checklist_schedules"("is_active", "next_run_at");
