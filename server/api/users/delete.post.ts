/**
 * server/api/users/delete.post.ts
 * NanoFeed — POST /api/users/delete
 *
 * Initiates the 30-day account deletion grace period:
 *   - Sets deletionRequestedAt = now() in the DB
 *   - The account is NOT deleted immediately
 *   - The frontend calls signOut() after success → /auth/login?deleted=pending
 *   - If the user logs in within 30 days, deletion is automatically cancelled
 *     (handled by the signIn callback in server/utils/auth.ts)
 *   - After 30 days, the Vercel Cron Job hard-deletes the account
 *
 * Requires authentication.
 */

import prisma from '../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../utils/responses'

export default defineEventHandler(async (event) => {
  const session = event.context.session

  if (!session?.user?.email) {
    throw createError({
      statusCode: HTTP.UNAUTHORIZED,
      data: errorResponse('Authentication required'),
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true, deletionRequestedAt: true },
    })

    if (!user) {
      throw createError({
        statusCode: HTTP.NOT_FOUND,
        data: errorResponse('User not found'),
      })
    }

    // Prevent the owner from deleting their own account
    if (user.role === 'OWNER') {
      throw createError({
        statusCode: HTTP.FORBIDDEN,
        data: errorResponse('The project owner account cannot be deleted'),
      })
    }

    if (user.deletionRequestedAt) {
      throw createError({
        statusCode: HTTP.BAD_REQUEST,
        data: errorResponse('Account deletion is already pending'),
      })
    }

    const deletionRequestedAt = new Date()

    await prisma.user.update({
      where: { email: session.user.email },
      data: { deletionRequestedAt },
    })

    const deletionDate = new Date(deletionRequestedAt)
    deletionDate.setDate(deletionDate.getDate() + 30)

    return successResponse({
      message: 'Account deletion scheduled. You have 30 days to cancel by logging in.',
      deletionScheduledFor: deletionDate.toISOString(),
    })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error('[POST /api/users/delete]', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to schedule account deletion'),
    })
  }
})
