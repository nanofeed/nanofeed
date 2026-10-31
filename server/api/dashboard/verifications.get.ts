import type { Prisma, VerificationStatus } from '@prisma/client'
import { positiveInteger } from '../../utils/pagination'
/**
 * server/api/dashboard/verifications.get.ts
 * NanoFeed — GET /api/dashboard/verifications
 *
 * Returns paginated verification requests filtered by status.
 * Query: status? (PENDING, ACCEPTED, REJECTED)
 * Owner only (enforced by server/middleware/owner.ts)
 */

import prisma from '../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../utils/responses'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = ((query.status as string) || 'PENDING').toUpperCase() as VerificationStatus
  const q = String(query.q || '').trim()

  const where: Prisma.VerificationRequestWhereInput = { status }
  if (q) {
    where.OR = [
      { realName: { contains: q, mode: 'insensitive' } },
      { user: { username: { contains: q, mode: 'insensitive' } } },
      { user: { displayName: { contains: q, mode: 'insensitive' } } },
    ]
  }
  const page = positiveInteger(query.page, 1, 10000)
  const pageSize = positiveInteger(query.pageSize, 20, 50)
  const skip = (page - 1) * pageSize

  try {
    const [requests, total] = await Promise.all([
      prisma.verificationRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: status === 'PENDING' ? 'asc' : 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              githubId: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.verificationRequest.count({ where }),
    ])

    return successResponse({
      requests,
      total,
      page,
      pageSize,
      hasMore: skip + requests.length < total,
    })
  } catch (error) {
    console.error('[GET /api/dashboard/verifications]', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to fetch verifications'),
    })
  }
})
