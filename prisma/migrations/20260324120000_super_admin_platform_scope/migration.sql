-- Platform-only roles must not be tenant-assignable; super_admin is internal / cross-tenant.
UPDATE "roles"
SET "scope" = 'PLATFORM'
WHERE "key" = 'super_admin'
  AND "organization_id" IS NULL;
