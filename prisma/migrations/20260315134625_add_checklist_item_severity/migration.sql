-- CreateEnum
CREATE TYPE "ChecklistItemSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable: add with DEFAULT for existing rows (backfill)
ALTER TABLE "checklist_run_item_snapshots" ADD COLUMN "severity_snapshot" "ChecklistItemSeverity" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "checklist_template_items" ADD COLUMN     "severity" "ChecklistItemSeverity" NOT NULL DEFAULT 'MEDIUM';
