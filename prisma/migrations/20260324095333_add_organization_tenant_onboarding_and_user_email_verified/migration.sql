-- CreateEnum
CREATE TYPE "OrganizationTenantType" AS ENUM ('DEMO', 'STANDARD');

-- CreateEnum
CREATE TYPE "OrganizationTenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "activated_at" TIMESTAMPTZ,
ADD COLUMN     "is_self_onboarded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_locations" INTEGER,
ADD COLUMN     "max_schedules" INTEGER,
ADD COLUMN     "max_templates" INTEGER,
ADD COLUMN     "max_users" INTEGER,
ADD COLUMN     "signup_source" TEXT,
ADD COLUMN     "suspended_at" TIMESTAMPTZ,
ADD COLUMN     "tenant_status" "OrganizationTenantStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "tenant_type" "OrganizationTenantType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "trial_ends_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMPTZ;
