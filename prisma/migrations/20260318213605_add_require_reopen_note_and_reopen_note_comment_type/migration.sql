-- AlterEnum
ALTER TYPE "AlertEventCommentType" ADD VALUE 'REOPEN_NOTE';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "require_reopen_note_on_reopen" BOOLEAN NOT NULL DEFAULT false;
