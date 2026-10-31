import { randomUUID } from 'node:crypto'
import prisma from '../db/prisma'

// One shared claim limits cleanup across all server instances. Daily cron is
// still the fallback when no one requests a recommended feed.
export const SNAPSHOT_CLEANUP_KEY = 'maintenance:recommendation-snapshots'
export const SNAPSHOT_CLEANUP_INTERVAL = 5 * 60_000

export async function cleanupExpiredSnapshots(now = Date.now()) {
  try {
    const claimed = await prisma.$executeRaw`
      INSERT INTO rate_limits (id, key, count, last_request)
      VALUES (${randomUUID()}, ${SNAPSHOT_CLEANUP_KEY}, 1, ${BigInt(now)})
      ON CONFLICT (key) DO UPDATE SET last_request = EXCLUDED.last_request
      WHERE rate_limits.last_request <= ${BigInt(now - SNAPSHOT_CLEANUP_INTERVAL)}
    `
    if (claimed)
      await prisma.recommendationSnapshot.deleteMany({
        where: { expiresAt: { lte: new Date(now) } },
      })
  } catch (error) {
    console.error('[Feed] Expired snapshot cleanup failed:', error)
  }
}
