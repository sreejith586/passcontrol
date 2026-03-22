-- AlterTable
ALTER TABLE "checklist_schedules" ADD COLUMN     "owner_user_id" UUID;

-- AddForeignKey
ALTER TABLE "checklist_schedules" ADD CONSTRAINT "checklist_schedules_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
