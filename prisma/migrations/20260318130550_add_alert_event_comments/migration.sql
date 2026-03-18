-- CreateEnum
CREATE TYPE "AlertEventCommentType" AS ENUM ('COMMENT', 'RESOLUTION_NOTE');

-- CreateTable
CREATE TABLE "alert_event_comments" (
    "id" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "alert_event_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "type" "AlertEventCommentType" NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_event_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_event_comments_organization_id_alert_event_id_created_idx" ON "alert_event_comments"("organization_id", "alert_event_id", "created_at");

-- CreateIndex
CREATE INDEX "alert_event_comments_alert_event_id_created_at_idx" ON "alert_event_comments"("alert_event_id", "created_at");

-- AddForeignKey
ALTER TABLE "alert_event_comments" ADD CONSTRAINT "alert_event_comments_alert_event_id_fkey" FOREIGN KEY ("alert_event_id") REFERENCES "alert_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_event_comments" ADD CONSTRAINT "alert_event_comments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
