-- AlterTable: add with DEFAULT for existing rows (backfill)
ALTER TABLE "checklist_run_item_snapshots" ADD COLUMN "requires_comment_on_fail_snapshot" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "checklist_template_items" ADD COLUMN     "requires_comment_on_fail" BOOLEAN NOT NULL DEFAULT false;
