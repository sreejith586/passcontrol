-- AlterTable
ALTER TABLE "alert_events" ADD COLUMN     "assigned_at" TIMESTAMPTZ,
ADD COLUMN     "assigned_by_user_id" UUID,
ADD COLUMN     "assigned_to_user_id" UUID;
