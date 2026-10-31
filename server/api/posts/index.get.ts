import type { Prisma } from '@prisma/client'
import { positiveInteger } from '../../utils/pagination'
import { visibleFeedPost } from '../../utils/postVisibility'
/**
 * server/api/posts/index.get.ts
 * NanoFeed — GET /api/posts
 *
 * Returns posts for a specific user profile.
 * Requires query param: username
 *
 * Query params:
 *   username (string, required)
 *   page     (number, default: 1)
 *   pageSize (number, default: 20)
 */

import prisma from '../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../utils/responses'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const username = String(query.username ?? '').trim()

  if (!username) {
    throw createError({
      statusCode: HTTP.BAD_REQUEST,
      data: errorResponse('username query parameter is required'),
    })
  }

  const page = positiveInteger(query.page, 1, 10000)
  const pageSize = positiveInteger(query.pageSize, 20, 50)
  const skip = (page - 1) * pageSize
  const tab = String(query.tab ?? 'posts')

  try {
    // Get current user if authenticated to check reactions
    let currentUserId: string | null = null
    const session = event.context.session
    if (session?.user?.email) {
      const userResult = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
      currentUserId = userResult?.id ?? null
    }

    // First verify the user exists
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
        createdAt: true,
        _count: { select: { posts: true } },
      },
    })

    if (!user) {
      throw createError({
        statusCode: HTTP.NOT_FOUND,
        data: errorResponse(`User @${username} not found`),
      })
    }

    // Determine query filter based on tab
    const where: Prisma.PostWhereInput = {
      authorId: user.id,
      ...visibleFeedPost,
    }

    if (tab === 'replies') {
      where.parentId = { not: null }
    } else {
      where.parentId = null
    }

    // Fetch user's posts with pagination
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              role: true,
              verified: true,
              badgeOrder: true,
              contributorCommit: true,
              isActive: true,
              deletionRequestedAt: true,
            },
          },
          parent: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                  role: true,
                  verified: true,
                  badgeOrder: true,
                  contributorCommit: true,
                  isActive: true,
                  deletionRequestedAt: true,
                },
              },
            },
          },
          repostOf: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                  role: true,
                  verified: true,
                  badgeOrder: true,
                  contributorCommit: true,
                  isActive: true,
                  deletionRequestedAt: true,
                },
              },
              _count: {
                select: {
                  replies: true,
                  reactions: true,
                },
              },
            },
          },
          hashtags: { select: { tag: true } },
          reactions: currentUserId
            ? {
                where: { userId: currentUserId },
                select: { userId: true },
              }
            : false,
          _count: {
            select: {
              replies: true,
              reactions: true,
              reposts: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ])

    // Map hasReacted status
    const postsWithReactionStatus = posts.map((post) => ({
      ...post,
      hasReacted: currentUserId ? (post.reactions?.length ?? 0) > 0 : false,
      reactions: undefined, // Remove reactions array from response
    }))

    return successResponse({
      user,
      posts: postsWithReactionStatus,
      total,
      page,
      pageSize,
      hasMore: skip + posts.length < total,
    })
  } catch (error: unknown) {
    // Re-throw intentional createError errors
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error('[GET /api/posts]', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to fetch posts'),
    })
  }
})
