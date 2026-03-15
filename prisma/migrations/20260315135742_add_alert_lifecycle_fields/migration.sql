-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- Add new columns
ALTER TABLE "alert_events" ADD COLUMN "acknowledged_by_user_id" UUID;
ALTER TABLE "alert_events" ADD COLUMN "resolution_note" TEXT;
ALTER TABLE "alert_events" ADD COLUMN "resolved_by_user_id" UUID;

-- Migrate status: add new enum column, backfill, drop old, rename
ALTER TABLE "alert_events" ADD COLUMN "status_new" "AlertStatus" DEFAULT 'OPEN';
UPDATE "alert_events" SET "status_new" = CASE
  WHEN "status" = 'ACKNOWLEDGED' THEN 'ACKNOWLEDGED'::"AlertStatus"
  WHEN "status" = 'RESOLVED' THEN 'RESOLVED'::"AlertStatus"
  ELSE 'OPEN'::"AlertStatus"
END;
ALTER TABLE "alert_events" DROP COLUMN "status";
ALTER TABLE "alert_events" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "alert_events" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "alert_events" ALTER COLUMN "status" SET DEFAULT 'OPEN';
