-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ESCALATION_ASSIGNED');

-- CreateEnum
CREATE TYPE "NotificationSourceType" AS ENUM ('CHECKLIST_RUN', 'ALERT_EVENT');

-- CreateTable
CREATE TABLE "checklist_schedule_watchers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "checklist_schedule_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_schedule_watchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "source_type" "NotificationSourceType" NOT NULL,
    "source_id" UUID NOT NULL,
    "payload_json" JSONB NOT NULL,
    "dedupe_key" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_schedule_watchers_user_id_idx" ON "checklist_schedule_watchers"("user_id");

-- CreateIndex
CREATE INDEX "checklist_schedule_watchers_checklist_schedule_id_idx" ON "checklist_schedule_watchers"("checklist_schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_schedule_watchers_checklist_schedule_id_user_id_key" ON "checklist_schedule_watchers"("checklist_schedule_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_organization_id_user_id_created_at_idx" ON "notifications"("organization_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "checklist_schedule_watchers" ADD CONSTRAINT "checklist_schedule_watchers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_schedule_watchers" ADD CONSTRAINT "checklist_schedule_watchers_checklist_schedule_id_fkey" FOREIGN KEY ("checklist_schedule_id") REFERENCES "checklist_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_schedule_watchers" ADD CONSTRAINT "checklist_schedule_watchers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
