-- Remove expired ownership references before enforcing lifecycle cleanup.
DELETE FROM recommendation_snapshots s WHERE s.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = s.user_id);
CREATE INDEX "recommendation_snapshots_user_id_idx" ON "recommendation_snapshots"("user_id");
ALTER TABLE "recommendation_snapshots" ADD CONSTRAINT "recommendation_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
