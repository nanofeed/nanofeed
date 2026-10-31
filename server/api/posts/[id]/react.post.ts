import { visibleFeedPost } from '../../../utils/postVisibility'
/**
 * server/api/posts/[id]/react.post.ts
 * NanoFeed — POST /api/posts/[id]/react
 *
 * Toggles a "love" reaction for the authenticated user on a specific post.
 * Requires authentication.
 */

import prisma from '../../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../../utils/responses'
import { createNotification } from '../../../services/notificationService'

export default defineEventHandler(async (event) => {
  const session = event.context.session
  const postId = getRouterParam(event, 'id')

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
      select: { id: true, isRestricted: true },
    })

    if (!user) {
      throw createError({
        statusCode: HTTP.NOT_FOUND,
        data: errorResponse('User not found'),
      })
    }

    if (user.isRestricted)
      throw createError({ statusCode: 403, statusMessage: 'Your account is restricted' })

    if (
      !(await prisma.post.findFirst({
        where: { id: postId, ...visibleFeedPost },
        select: { id: true },
      }))
    )
      throw createError({ statusCode: 404, statusMessage: 'Post not found' })

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: postId,
        },
      },
    })

    if (existingReaction) {
      // Remove reaction (unlike)
      await prisma.reaction.delete({
        where: { id: existingReaction.id },
      })
      return successResponse({ reacted: false })
    } else {
      // Add reaction (like)
      await prisma.reaction.create({
        data: {
          userId: user.id,
          postId: postId,
        },
      })

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      })
      if (post && post.authorId !== user.id) {
        await createNotification({
          userId: post.authorId,
          type: 'REACTION',
          message: 'Reacted to your post.',
          postId: postId,
          senderId: user.id,
        })
      }

      return successResponse({ reacted: true })
    }
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error(`[POST /api/posts/${postId}/react]`, error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to toggle reaction'),
    })
  }
})
