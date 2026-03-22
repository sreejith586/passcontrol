-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "temperature_unit" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "default_temperature_unit" TEXT,
ADD COLUMN     "default_timezone" TEXT;

-- AddForeignKey
ALTER TABLE "checklist_runs" ADD CONSTRAINT "checklist_runs_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
