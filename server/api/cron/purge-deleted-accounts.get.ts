/**
 * server/api/cron/purge-deleted-accounts.get.ts
 * NanoFeed — GET /api/cron/purge-deleted-accounts
 *
 * Vercel Cron Job — runs daily at 3:00 AM UTC (configured in vercel.json).
 *
 * Finds all users whose 30-day deletion grace period has expired and
 * permanently hard-deletes them along with all their associated data
 * (posts, reactions, follows, sessions, accounts — via onDelete: Cascade).
 *
 * Security: Protected by CRON_SECRET environment variable.
 * Vercel automatically sends this header when calling Cron routes.
 * For manual testing:
 *   curl https://your-app.com/api/cron/purge-deleted-accounts \
 *        -H "Authorization: Bearer $CRON_SECRET"
 */

import prisma from '../../db/prisma'
import { cleanupRootcapClaims } from '../../utils/rootcap'
import { successResponse, errorResponse, HTTP } from '../../utils/responses'

const DELETION_GRACE_PERIOD_DAYS = 30

export default defineEventHandler(async (event) => {
  // Verify the request is from Vercel Cron or an authorized caller
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET is not set — refusing to run purge')
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Server misconfiguration: CRON_SECRET not set'),
    })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    throw createError({
      statusCode: HTTP.FORBIDDEN,
      data: errorResponse('Unauthorized'),
    })
  }

  try {
    try {
      await prisma.recommendationSnapshot.deleteMany({ where: { expiresAt: { lte: new Date() } } })
    } catch (error) {
      console.error('[Cron] Snapshot cleanup failed:', error)
    }
    try {
      await prisma.rateLimit.deleteMany({
        where: { lastRequest: { lt: BigInt(Date.now() - 86400_000) } },
      })
    } catch (error) {
      console.error('[Cron] Rate-limit cleanup failed:', error)
    }
    try {
      await cleanupRootcapClaims()
    } catch (error) {
      console.error('[Cron] RootCap cleanup failed:', error)
    }
    // Calculate the cutoff date: anything requested before this date is expired
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - DELETION_GRACE_PERIOD_DAYS)

    // Find all accounts past the grace period
    const expiredAccounts = await prisma.user.findMany({
      where: {
        deletionRequestedAt: {
          not: null,
          lte: cutoff, // requested 30+ days ago
        },
      },
      select: { id: true, email: true, username: true },
    })

    if (expiredAccounts.length === 0) {
      console.log('[Cron] No expired accounts to purge')
      return successResponse({ deleted: 0, message: 'No expired accounts found' })
    }

    const ids = expiredAccounts.map((u) => u.id)

    // Hard delete — all related records cascade via Prisma schema
    const { count } = await prisma.user.deleteMany({
      where: { id: { in: ids }, deletionRequestedAt: { lte: cutoff } },
    })

    console.log(
      `[Cron] Purged ${count} expired account(s):`,
      expiredAccounts.map((u) => u.username),
    )

    return successResponse({
      deleted: count,
      message: `Successfully purged ${count} expired account(s)`,
    })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error('[Cron] Failed to purge deleted accounts:', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to purge expired accounts'),
    })
  }
})
