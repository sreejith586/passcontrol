/*
  Warnings:

  - You are about to drop the column `checklist_run_response_id` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `checklist_run_response_id` on the `temperature_readings` table. All the data in the column will be lost.
  - You are about to drop the `checklist_run_responses` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[organization_id,run_number]` on the table `checklist_runs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `run_number` to the `checklist_runs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `template_key_snapshot` to the `checklist_runs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "checklist_run_responses" DROP CONSTRAINT "checklist_run_responses_checklist_run_id_fkey";

-- DropForeignKey
ALTER TABLE "checklist_run_responses" DROP CONSTRAINT "checklist_run_responses_organization_id_fkey";

-- AlterTable
ALTER TABLE "attachments" DROP COLUMN "checklist_run_response_id",
ADD COLUMN     "checklist_run_item_snapshot_id" UUID;

-- AlterTable
ALTER TABLE "checklist_runs" ADD COLUMN     "brand_id" UUID,
ADD COLUMN     "checklist_schedule_id" UUID,
ADD COLUMN     "completed_at" TIMESTAMPTZ,
ADD COLUMN     "due_at" TIMESTAMPTZ,
ADD COLUMN     "performed_by_user_id" UUID,
ADD COLUMN     "run_number" INTEGER NOT NULL,
ADD COLUMN     "run_source" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "started_at" TIMESTAMPTZ,
ADD COLUMN     "template_key_snapshot" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "temperature_readings" DROP COLUMN "checklist_run_response_id",
ADD COLUMN     "checklist_run_item_snapshot_id" UUID;

-- DropTable
DROP TABLE "checklist_run_responses";

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "template_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand_id" UUID,
    "location_id" UUID,
    "zone_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "is_latest" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ,
    "archived_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_template_sections" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "checklist_template_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "checklist_template_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_template_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "checklist_template_id" UUID NOT NULL,
    "checklist_template_section_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "help_text" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "requires_evidence_on_fail" BOOLEAN NOT NULL DEFAULT false,
    "failure_creates_incident" BOOLEAN NOT NULL DEFAULT false,
    "config_json" JSONB,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "checklist_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_schedules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "checklist_template_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand_id" UUID,
    "location_id" UUID,
    "zone_id" UUID,
    "timezone" TEXT NOT NULL,
    "rrule" TEXT NOT NULL,
    "next_run_at" TIMESTAMPTZ,
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "checklist_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_run_section_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "checklist_run_id" UUID NOT NULL,
    "checklist_template_section_id" UUID,
    "title_snapshot" TEXT NOT NULL,
    "description_snapshot" TEXT,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_run_section_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_run_item_snapshots" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "checklist_run_id" UUID NOT NULL,
    "checklist_run_section_snapshot_id" UUID NOT NULL,
    "checklist_template_item_id" UUID,
    "item_type_snapshot" TEXT NOT NULL,
    "label_snapshot" TEXT NOT NULL,
    "help_text_snapshot" TEXT,
    "is_required_snapshot" BOOLEAN NOT NULL,
    "requires_evidence_on_fail_snapshot" BOOLEAN NOT NULL,
    "failure_creates_incident_snapshot" BOOLEAN NOT NULL,
    "config_snapshot_json" JSONB,
    "sort_order" INTEGER NOT NULL,
    "result" TEXT,
    "value_json" JSONB,
    "comment" TEXT,
    "responded_at" TIMESTAMPTZ,
    "responded_by_user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "checklist_run_item_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_templates_organization_id_template_key_is_latest_idx" ON "checklist_templates"("organization_id", "template_key", "is_latest");

-- CreateIndex
CREATE INDEX "checklist_templates_organization_id_status_idx" ON "checklist_templates"("organization_id", "status");

-- CreateIndex
CREATE INDEX "checklist_templates_organization_id_brand_id_location_id_zo_idx" ON "checklist_templates"("organization_id", "brand_id", "location_id", "zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_templates_organization_id_template_key_version_key" ON "checklist_templates"("organization_id", "template_key", "version");

-- CreateIndex
CREATE INDEX "checklist_template_sections_organization_id_checklist_templ_idx" ON "checklist_template_sections"("organization_id", "checklist_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_sections_checklist_template_id_sort_orde_key" ON "checklist_template_sections"("checklist_template_id", "sort_order");

-- CreateIndex
CREATE INDEX "checklist_template_items_organization_id_checklist_template_idx" ON "checklist_template_items"("organization_id", "checklist_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_items_checklist_template_section_id_sort_key" ON "checklist_template_items"("checklist_template_section_id", "sort_order");

-- CreateIndex
CREATE INDEX "checklist_schedules_organization_id_is_active_next_run_at_idx" ON "checklist_schedules"("organization_id", "is_active", "next_run_at");

-- CreateIndex
CREATE INDEX "checklist_schedules_organization_id_brand_id_location_id_zo_idx" ON "checklist_schedules"("organization_id", "brand_id", "location_id", "zone_id", "is_active");

-- CreateIndex
CREATE INDEX "checklist_run_section_snapshots_organization_id_checklist_r_idx" ON "checklist_run_section_snapshots"("organization_id", "checklist_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_run_section_snapshots_checklist_run_id_sort_order_key" ON "checklist_run_section_snapshots"("checklist_run_id", "sort_order");

-- CreateIndex
CREATE INDEX "checklist_run_item_snapshots_org_run_result_idx" ON "checklist_run_item_snapshots"("organization_id", "checklist_run_id", "result");

-- CreateIndex
CREATE INDEX "checklist_run_item_snapshots_org_run_resp_at_idx" ON "checklist_run_item_snapshots"("organization_id", "checklist_run_id", "responded_at");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_run_item_snapshots_checklist_run_section_snapshot_key" ON "checklist_run_item_snapshots"("checklist_run_section_snapshot_id", "sort_order");

-- CreateIndex
CREATE INDEX "checklist_runs_organization_id_status_due_at_idx" ON "checklist_runs"("organization_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "checklist_runs_organization_id_location_id_zone_id_created__idx" ON "checklist_runs"("organization_id", "location_id", "zone_id", "created_at");

-- CreateIndex
CREATE INDEX "checklist_runs_organization_id_checklist_template_id_create_idx" ON "checklist_runs"("organization_id", "checklist_template_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_runs_organization_id_run_number_key" ON "checklist_runs"("organization_id", "run_number");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_checklist_run_item_snapshot_id_fkey" FOREIGN KEY ("checklist_run_item_snapshot_id") REFERENCES "checklist_run_item_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_template_sections" ADD CONSTRAINT "checklist_template_sections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_template_sections" ADD CONSTRAINT "checklist_template_sections_checklist_template_id_fkey" FOREIGN KEY ("checklist_template_id") REFERENCES "checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_checklist_template_id_fkey" FOREIGN KEY ("checklist_template_id") REFERENCES "checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_checklist_template_section_id_fkey" FOREIGN KEY ("checklist_template_section_id") REFERENCES "checklist_template_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_schedules" ADD CONSTRAINT "checklist_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_schedules" ADD CONSTRAINT "checklist_schedules_checklist_template_id_fkey" FOREIGN KEY ("checklist_template_id") REFERENCES "checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_run_section_snapshots" ADD CONSTRAINT "checklist_run_section_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_run_section_snapshots" ADD CONSTRAINT "checklist_run_section_snapshots_checklist_run_id_fkey" FOREIGN KEY ("checklist_run_id") REFERENCES "checklist_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_run_item_snapshots" ADD CONSTRAINT "checklist_run_item_snapshots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_run_item_snapshots" ADD CONSTRAINT "checklist_run_item_snapshots_checklist_run_id_fkey" FOREIGN KEY ("checklist_run_id") REFERENCES "checklist_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_run_item_snapshots" ADD CONSTRAINT "checklist_run_item_snapshots_checklist_run_section_snapsho_fkey" FOREIGN KEY ("checklist_run_section_snapshot_id") REFERENCES "checklist_run_section_snapshots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
