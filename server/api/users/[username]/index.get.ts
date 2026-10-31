/**
 * server/api/users/[username].get.ts
 * NanoFeed — GET /api/users/[username]
 *
 * Returns a public user profile by username.
 * Public endpoint — no authentication required.
 */

import prisma from '../../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../../utils/responses'
import type { PublicUser } from '#shared/types/user'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')

  if (!username) {
    throw createError({
      statusCode: HTTP.BAD_REQUEST,
      data: errorResponse('Username is required'),
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        role: true,
        verified: true,
        badgeOrder: true,
        contributorCommit: true,
        isRestricted: true,
        restrictionNote: true,
        isActive: true,
        deletionRequestedAt: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    })

    if (!user) {
      throw createError({
        statusCode: HTTP.NOT_FOUND,
        data: errorResponse('User not found'),
      })
    }

    // Deactivated or deleting accounts are hidden from public profile views
    if (!user.isActive || user.deletionRequestedAt !== null) {
      throw createError({
        statusCode: 410, // 410 Gone — account deliberately deactivated or pending deletion
        data: errorResponse('This account is no longer available'),
      })
    }

    // Strip private status fields from the public response
    const { isActive: _, deletionRequestedAt: __, ...publicUser } = user

    return successResponse(publicUser as PublicUser)
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error(`[GET /api/users/${username}]`, error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to fetch user profile'),
    })
  }
})
