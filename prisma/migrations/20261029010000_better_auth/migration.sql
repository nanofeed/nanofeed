-- Run the upgrade atomically. Back up the database before applying.
BEGIN;
-- Refuse to silently bind a GitHub identity to the wrong legacy user.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM accounts a JOIN users u ON a.user_id = u.id
    WHERE a.provider = 'github' AND a.provider_account_id <> u.github_id
  ) THEN RAISE EXCEPTION 'Legacy GitHub identity mismatch: repair account bindings before migration'; END IF;
END $$;
-- Auth.js cookies/tokens are deliberately invalidated at cutover.
DELETE FROM sessions;
UPDATE accounts SET access_token = NULL, refresh_token = NULL, id_token = NULL;
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "expires_at",
DROP COLUMN "session_state",
DROP COLUMN "token_type",
DROP COLUMN "type",
ADD COLUMN     "access_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "refresh_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_agent" TEXT;

-- DropTable
DROP TABLE "verification_tokens";

-- CreateTable
CREATE TABLE "auth_verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "last_request" BIGINT NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_snapshots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "posts" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_verifications_identifier_idx" ON "auth_verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_key_key" ON "rate_limits"("key");

-- CreateIndex
CREATE INDEX "recommendation_snapshots_expires_at_idx" ON "recommendation_snapshots"("expires_at");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");


-- The old sign-in callback could create users without adapter accounts.
-- Recover their immutable GitHub binding, including seeded owners.
INSERT INTO accounts (id, user_id, provider, provider_account_id, created_at, updated_at)
SELECT 'github-migration-' || u.id, u.id, 'github', u.github_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.provider = 'github' AND a.provider_account_id = u.github_id);
ALTER TABLE accounts ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE sessions ALTER COLUMN updated_at DROP DEFAULT;
COMMIT;
