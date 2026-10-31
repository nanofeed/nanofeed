/**
 * server/api/users/cancel-deletion.post.ts
 * NanoFeed — POST /api/users/cancel-deletion
 *
 * Cancels a pending account deletion while the user is still logged in:
 *   - Clears deletionRequestedAt = null
 *   - Used by the "Cancel Deletion" button in the Settings > Account tab
 *
 * Note: Logging in via GitHub OAuth ALSO cancels deletion automatically
 * (handled in server/utils/auth.ts signIn callback). This endpoint
 * handles the case where the user still has an active session.
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
      select: { id: true, deletionRequestedAt: true },
    })

    if (!user) {
      throw createError({
        statusCode: HTTP.NOT_FOUND,
        data: errorResponse('User not found'),
      })
    }

    if (!user.deletionRequestedAt) {
      throw createError({
        statusCode: HTTP.BAD_REQUEST,
        data: errorResponse('No pending deletion found for this account'),
      })
    }

    if (user.deletionRequestedAt.getTime() <= Date.now() - 30 * 86400_000)
      throw createError({ statusCode: 403, statusMessage: 'Deletion grace period has expired' })

    await prisma.user.update({
      where: { email: session.user.email },
      data: { deletionRequestedAt: null },
    })

    return successResponse({ message: 'Account deletion cancelled. Your account is safe.' })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error('[POST /api/users/cancel-deletion]', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to cancel account deletion'),
    })
  }
})
