/**
 * server/api/dashboard/verify-user.post.ts
 * NanoFeed — POST /api/dashboard/verify-user
 *
 * Accepts a verification request and marks the user as verified.
 * Body: { requestId: string }
 * Owner only (enforced by server/middleware/owner.ts)
 */

import prisma from '../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../utils/responses'
import { createNotification } from '../../services/notificationService'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ requestId?: string }>(event)
  const requestId = String(body?.requestId ?? '').trim()

  if (!requestId) {
    throw createError({
      statusCode: HTTP.BAD_REQUEST,
      data: errorResponse('requestId is required'),
    })
  }

  try {
    // Find the pending request
    const request = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { user: { select: { id: true } } },
    })

    if (!request) {
      throw createError({
        statusCode: HTTP.NOT_FOUND,
        data: errorResponse('Verification request not found'),
      })
    }

    if (request.status !== 'PENDING') {
      throw createError({
        statusCode: HTTP.CONFLICT,
        data: errorResponse(`Request is already ${request.status.toLowerCase()}`),
      })
    }

    // Only one reviewer can transition a pending request. The verification and
    // request status commit together, including when approve/reject race.
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const result = await tx.verificationRequest.updateMany({
        where: { id: requestId, status: 'PENDING' },
        data: { status: 'ACCEPTED' },
      })
      if (result.count !== 1) {
        throw createError({
          statusCode: HTTP.CONFLICT,
          data: errorResponse('Request has already been reviewed'),
        })
      }
      await tx.user.update({ where: { id: request.user.id }, data: { verified: true } })
      return tx.verificationRequest.findUniqueOrThrow({ where: { id: requestId } })
    })

    await createNotification({
      userId: request.user.id,
      type: 'VERIFICATION_UPDATE',
      message:
        'Congratulations! Your verification request has been accepted. You are now verified.',
    }).catch((e) => console.error(e))

    return successResponse(updatedRequest)
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error('[POST /api/dashboard/verify-user]', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to verify user'),
    })
  }
})
