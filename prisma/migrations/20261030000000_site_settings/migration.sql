CREATE TABLE "site_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "verification_requests_enabled" BOOLEAN NOT NULL DEFAULT true,
    "maintenance_enabled" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_message" TEXT NOT NULL DEFAULT 'Site under construction. Please check back soon.',
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "site_settings_singleton" CHECK ("id" = 1)
);
