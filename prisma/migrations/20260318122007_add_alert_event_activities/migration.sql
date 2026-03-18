-- CreateEnum
CREATE TYPE "AlertEventActivityType" AS ENUM ('CREATED', 'ACKNOWLEDGED', 'RESOLVED', 'ASSIGNED', 'UNASSIGNED', 'REASSIGNED');

-- CreateTable
CREATE TABLE "alert_event_activities" (
    "id" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "alert_event_id" UUID NOT NULL,
    "type" "AlertEventActivityType" NOT NULL,
    "actor_user_id" UUID,
    "from_status" "AlertStatus",
    "to_status" "AlertStatus",
    "from_assigned_to_user_id" UUID,
    "to_assigned_to_user_id" UUID,
    "comment" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_event_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_event_activities_organization_id_alert_event_id_creat_idx" ON "alert_event_activities"("organization_id", "alert_event_id", "created_at");

-- CreateIndex
CREATE INDEX "alert_event_activities_alert_event_id_created_at_idx" ON "alert_event_activities"("alert_event_id", "created_at");

-- AddForeignKey
ALTER TABLE "alert_event_activities" ADD CONSTRAINT "alert_event_activities_alert_event_id_fkey" FOREIGN KEY ("alert_event_id") REFERENCES "alert_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_event_activities" ADD CONSTRAINT "alert_event_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
