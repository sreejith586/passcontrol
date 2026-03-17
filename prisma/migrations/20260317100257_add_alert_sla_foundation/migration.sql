-- AlterTable
ALTER TABLE "alert_events" ADD COLUMN     "acknowledge_within_minutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "resolve_within_minutes" INTEGER NOT NULL DEFAULT 240;

-- CreateTable
CREATE TABLE "alert_sla_policies" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "brand_id" UUID,
    "location_id" UUID,
    "zone_id" UUID,
    "severity" TEXT NOT NULL,
    "acknowledge_within_minutes" INTEGER NOT NULL,
    "resolve_within_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "alert_sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_sla_policies_organization_id_severity_is_active_idx" ON "alert_sla_policies"("organization_id", "severity", "is_active");

-- CreateIndex
CREATE INDEX "alert_sla_policies_organization_id_location_id_severity_is__idx" ON "alert_sla_policies"("organization_id", "location_id", "severity", "is_active");

-- CreateIndex
CREATE INDEX "alert_sla_policies_organization_id_brand_id_severity_is_act_idx" ON "alert_sla_policies"("organization_id", "brand_id", "severity", "is_active");

-- AddForeignKey
ALTER TABLE "alert_sla_policies" ADD CONSTRAINT "alert_sla_policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
