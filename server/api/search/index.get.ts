import { visibleFeedPost } from '../../utils/postVisibility'
/**
 * server/api/search/index.get.ts
 * NanoFeed — GET /api/search
 *
 * Global search endpoint for users, posts, and hashtags.
 * Returns results grouped by category.
 */

import prisma from '../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../utils/responses'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || '').trim()

  if (!q) {
    return successResponse({
      users: [],
      posts: [],
      hashtags: [],
    })
  }

  try {
    const [users, posts, hashtags] = await Promise.all([
      // Search Users
      prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
          ],
          isActive: true,
          deletionRequestedAt: null,
        },
        take: 5,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          verified: true,
          badgeOrder: true,
          contributorCommit: true,
          role: true,
        },
      }),

      // Search Posts
      prisma.post.findMany({
        where: {
          ...visibleFeedPost,
          content: { contains: q, mode: 'insensitive' },
          author: {
            isActive: true,
            deletionRequestedAt: null,
          },
        },
        take: 10,
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
          hashtags: { select: { tag: true } },
        },
      }),

      // Search Hashtags
      prisma.hashtag.findMany({
        where: {
          tag: { contains: q.replace(/^#/, ''), mode: 'insensitive' },
          posts: { some: visibleFeedPost },
        },
        take: 5,
        orderBy: { posts: { _count: 'desc' } },
        include: { _count: { select: { posts: { where: visibleFeedPost } } } },
      }),
    ])

    return successResponse({
      users,
      posts,
      hashtags: hashtags.map((tag) => ({ ...tag, postCount: tag._count.posts })),
    })
  } catch (error) {
    console.error('[GET /api/search]', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Search failed'),
    })
  }
})
