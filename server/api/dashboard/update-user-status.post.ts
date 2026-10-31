/**
 * server/api/dashboard/update-user-status.post.ts
 * NanoFeed — POST /api/dashboard/update-user-status
 *
 * Allows admins to toggle verification, roles, and restrictions for users.
 * Body: { userId: string, verified?: boolean, role?: 'USER' | 'OWNER', isRestricted?: boolean, restrictionNote?: string }
 * Owner only (enforced by server/middleware/owner.ts)
 */

import prisma from '../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../utils/responses'
import { createNotification } from '../../services/notificationService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    userId?: string
    verified?: boolean
    role?: 'USER' | 'OWNER'
    isRestricted?: boolean
    restrictionNote?: string
  }>(event)

  const userId = String(body?.userId ?? '').trim()

  if (!userId) {
    throw createError({ statusCode: HTTP.BAD_REQUEST, data: errorResponse('userId is required') })
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw createError({ statusCode: HTTP.NOT_FOUND, data: errorResponse('User not found') })
    }

    // If verified is being set to false from true, set verificationRemovedAt
    const isRevoking = body.verified === false && user.verified === true
    const verificationRemovedAt = isRevoking ? new Date() : user.verificationRemovedAt

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        verified: body.verified !== undefined ? body.verified : user.verified,
        role: body.role !== undefined ? body.role : user.role,
        isRestricted: body.isRestricted !== undefined ? body.isRestricted : user.isRestricted,
        restrictionNote:
          body.restrictionNote !== undefined ? body.restrictionNote : user.restrictionNote,
        verificationRemovedAt: verificationRemovedAt,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        verified: true,
        role: true,
        isRestricted: true,
        restrictionNote: true,
      },
    })

    // Asynchronous notification triggers
    await Promise.resolve()
      .then(async () => {
        if (isRevoking) {
          await createNotification({
            userId: userId,
            type: 'VERIFICATION_UPDATE',
            message: 'Your verified badge has been removed.',
          })
        }

        if (body.isRestricted === true && user.isRestricted !== true) {
          await createNotification({
            userId: userId,
            type: 'ACCOUNT_STATUS',
            message: `Your account has been restricted. Reason: ${body.restrictionNote || 'Violations of terms of service.'}`,
          })
        } else if (body.isRestricted === false && user.isRestricted === true) {
          await createNotification({
            userId: userId,
            type: 'ACCOUNT_STATUS',
            message: 'Your account restriction has been lifted.',
          })
        }
      })
      .catch((e) => console.error('Notification error:', e))

    return successResponse(updatedUser)
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error('[POST /api/dashboard/update-user-status]', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to update user status'),
    })
  }
})
