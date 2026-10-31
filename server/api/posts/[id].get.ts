import { visibleFeedPost } from '../../utils/postVisibility'
// server/api/posts/[id].get.ts
import prisma from '../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../utils/responses'

export default defineEventHandler(async (event) => {
  const postId = getRouterParam(event, 'id')

  if (!postId) {
    throw createError({
      statusCode: HTTP.BAD_REQUEST,
      data: errorResponse('Post ID is required'),
    })
  }

  try {
    // Get current user if authenticated to check reactions
    let currentUserId: string | null = null
    const session = event.context.session
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
      currentUserId = user?.id ?? null
    }

    const post = await prisma.post.findUnique({
      where: { id: postId, ...visibleFeedPost },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            verified: true,
            badgeOrder: true,
            contributorCommit: true,
            role: true,
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
                verified: true,
                badgeOrder: true,
                contributorCommit: true,
                role: true,
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
                verified: true,
                badgeOrder: true,
                contributorCommit: true,
                role: true,
                isActive: true,
                deletionRequestedAt: true,
              },
            },
            _count: {
              select: {
                replies: true,
                reactions: true,
                reposts: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
            reactions: true,
            reposts: true,
          },
        },
        reactions: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { userId: true },
            }
          : false,
        replies: {
          where: visibleFeedPost,
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                verified: true,
                badgeOrder: true,
                contributorCommit: true,
                role: true,
                isActive: true,
                deletionRequestedAt: true,
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
                    verified: true,
                    badgeOrder: true,
                    contributorCommit: true,
                    role: true,
                    isActive: true,
                    deletionRequestedAt: true,
                  },
                },
              },
            },
            _count: {
              select: {
                replies: true,
                reactions: true,
                reposts: true,
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
                    verified: true,
                    badgeOrder: true,
                    contributorCommit: true,
                    role: true,
                    isActive: true,
                    deletionRequestedAt: true,
                  },
                },
              },
            },
            reactions: currentUserId
              ? {
                  where: { userId: currentUserId },
                  select: { userId: true },
                }
              : false,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!post) {
      throw createError({
        statusCode: HTTP.NOT_FOUND,
        data: errorResponse('Post not found'),
      })
    }

    // Map hasReacted status
    const postWithReactionStatus = {
      ...post,
      hasReacted: currentUserId ? (post.reactions?.length ?? 0) > 0 : false,
      reactions: undefined,
      replies: post.replies.map((reply) => ({
        ...reply,
        hasReacted: currentUserId ? (reply.reactions?.length ?? 0) > 0 : false,
        reactions: undefined,
      })),
    }

    return successResponse(postWithReactionStatus)
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error(`[GET /api/posts/${postId}]`, error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to fetch post'),
    })
  }
})
