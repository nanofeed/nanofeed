import { visibleFeedPost } from '../../../utils/postVisibility'
/**
 * server/api/posts/[id]/repost.post.ts
 * NanoFeed — POST /api/posts/:id/repost
 *
 * Reposts an existing post for the authenticated user.
 */

import { defineEventHandler, createError } from 'h3'
import prisma from '../../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../../utils/responses'
import { createNotification } from '../../../services/notificationService'

export default defineEventHandler(async (event) => {
  const session = event.context.session
  const postId = event.context.params?.id

  if (!session?.user?.email) {
    throw createError({
      statusCode: HTTP.UNAUTHORIZED,
      data: errorResponse('Authentication required'),
    })
  }

  if (!postId) {
    throw createError({
      statusCode: HTTP.BAD_REQUEST,
      data: errorResponse('Post ID is required'),
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      throw createError({
        statusCode: HTTP.NOT_FOUND,
        data: errorResponse('User account not found'),
      })
    }

    if (user.isRestricted)
      throw createError({ statusCode: 403, statusMessage: 'Your account is restricted' })

    // Check if the post to repost exists
    const originalPost = await prisma.post.findUnique({
      where: { id: postId, ...visibleFeedPost },
    })

    if (!originalPost) {
      throw createError({
        statusCode: HTTP.NOT_FOUND,
        data: errorResponse('Original post not found'),
      })
    }

    // Check if user already reposted this post
    const existingRepost = await prisma.post.findFirst({
      where: {
        authorId: user.id,
        repostOfId: postId,
      },
    })

    if (existingRepost) {
      // If already reposted, we'll treat it as an "unrepost" (delete the repost)
      await prisma.post.delete({
        where: { id: existingRepost.id },
      })
      return successResponse({ reposted: false })
    }

    // Create a new post as a repost
    const repost = await prisma.post.create({
      data: {
        content: '', // Reposts have no content by default (not quote posts yet)
        authorId: user.id,
        repostOfId: postId,
      },
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
              },
            },
          },
        },
      },
    })

    // Notify the original author
    if (originalPost.authorId !== user.id) {
      await createNotification({
        userId: originalPost.authorId,
        type: 'REACTION', // Using REACTION as a proxy for social interaction if REPOST type doesn't exist
        message: `@${user.username} reposted your post.`,
        postId: originalPost.id,
        senderId: user.id,
      })
    }

    return successResponse({ reposted: true, repost })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error('[POST /api/posts/:id/repost]', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to repost'),
    })
  }
})
