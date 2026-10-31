import { visibleFeedPost } from '../../utils/postVisibility'
/**
 * server/api/posts/create.post.ts
 * NanoFeed — POST /api/posts/create
 *
 * Creates a new text post for the authenticated user.
 * - Applies rate limiting (via server/middleware/rateLimit.ts)
 * - Parses and stores hashtags (upsert pattern for deduplication)
 * - Validates content length: 1–280 characters
 *
 * Requires authentication.
 */

import { defineEventHandler, readBody, createError, setResponseStatus } from 'h3'
import prisma from '../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../utils/responses'
import { parseHashtags } from '../../utils/parseHashtags'
import { createNotification } from '../../services/notificationService'

export default defineEventHandler(async (event) => {
  const session = event.context.session

  // Must be authenticated
  if (!session?.user?.email) {
    throw createError({
      statusCode: HTTP.UNAUTHORIZED,
      data: errorResponse('Authentication required'),
    })
  }

  // Parse body
  const body = await readBody<{ content?: string; parentId?: string }>(event)
  const content = String(body?.content ?? '').trim()
  const parentId = body?.parentId

  // Validate content
  if (!content) {
    throw createError({
      statusCode: HTTP.BAD_REQUEST,
      data: errorResponse('Post content cannot be empty'),
    })
  }

  if (content.length > 280) {
    throw createError({
      statusCode: HTTP.BAD_REQUEST,
      data: errorResponse(`Post too long: max 280 characters (got ${content.length})`),
    })
  }

  try {
    // Look up the author by email from session
    const author = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!author) {
      throw createError({
        statusCode: HTTP.NOT_FOUND,
        data: errorResponse('User account not found'),
      })
    }

    if (author.isRestricted) {
      throw createError({
        statusCode: HTTP.FORBIDDEN,
        data: errorResponse('Your account is restricted. You cannot create posts or replies.'),
      })
    }

    if (
      parentId &&
      !(await prisma.post.findFirst({
        where: { id: parentId, ...visibleFeedPost },
        select: { id: true },
      }))
    ) {
      throw createError({ statusCode: 404, statusMessage: 'Parent post not found' })
    }
    // Parse hashtags from content
    const tags = parseHashtags(content)

    // Create the post with hashtag connections
    // We upsert each hashtag to avoid duplicates
    const post = await prisma.post.create({
      data: {
        content,
        authorId: author.id,
        parentId: parentId || null,
        hashtags: {
          connectOrCreate: tags.map((tag) => ({
            where: { tag },
            create: { tag },
          })),
        },
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
        hashtags: { select: { tag: true } },
        _count: {
          select: {
            replies: true,
            reactions: true,
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
              },
            },
          },
        },
      },
    })

    // Asynchronous notification triggers
    await Promise.resolve()
      .then(async () => {
        // 1. Mentions
        const mentionRegex = /@(\w+)/g
        const mentionedUsernames = Array.from(content.matchAll(mentionRegex), (match) => match[1]!)

        const uniqueUsernames = [...new Set(mentionedUsernames)]
        if (uniqueUsernames.length > 0) {
          const mentionedUsers = await prisma.user.findMany({
            where: { username: { in: uniqueUsernames } },
            select: { id: true, username: true },
          })

          for (const u of mentionedUsers) {
            await createNotification({
              userId: u.id,
              type: 'MENTION',
              message: `@${author.username} mentioned you in a post.`,
              postId: post.id,
              senderId: author.id,
            })
          }
        }

        // 2. Replies
        if (post.parent && post.parent.authorId !== author.id) {
          await createNotification({
            userId: post.parent.authorId,
            type: 'REPLY',
            message: `@${author.username} replied to your post.`,
            postId: post.id,
            senderId: author.id,
          })
        }
      })
      .catch((err) => console.error('Notification error:', err))

    setResponseStatus(event, HTTP.CREATED)
    return successResponse(post)
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error('[POST /api/posts/create]', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to create post'),
    })
  }
})
