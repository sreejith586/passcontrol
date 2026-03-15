-- AlterTable
ALTER TABLE "checklist_schedules" ADD COLUMN     "last_generation_attempt_at" TIMESTAMPTZ,
ADD COLUMN     "last_generation_error" TEXT,
ADD COLUMN     "last_generation_status" TEXT;

-- CreateIndex
CREATE INDEX "attachments_checklist_run_item_snapshot_id_idx" ON "attachments"("checklist_run_item_snapshot_id");
