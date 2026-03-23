-- CreateTable
CREATE TABLE "organization_email_settings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "smtp_host" TEXT NOT NULL,
    "smtp_port" INTEGER NOT NULL,
    "smtp_user" TEXT,
    "smtp_password_encrypted" TEXT,
    "from_email" TEXT NOT NULL,
    "from_name" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organization_email_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_email_settings_organization_id_key" ON "organization_email_settings"("organization_id");

-- AddForeignKey
ALTER TABLE "organization_email_settings" ADD CONSTRAINT "organization_email_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
