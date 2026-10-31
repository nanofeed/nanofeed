import { positiveInteger } from '../../utils/pagination'
import { visibleFeedPost } from '../../utils/postVisibility'
/**
 * app/server/api/notifications/index.get.ts
 * NanoFeed — Notifications API
 *
 * API endpoint for fetching notifications.
 */

import { defineEventHandler, getQuery, createError } from 'h3'
import prisma from '../../db/prisma'

export default defineEventHandler(async (event) => {
  const session = event.context.session
  if (!session?.user?.email) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)
  const page = positiveInteger(query.page, 1, 10000)
  const limit = positiveInteger(query.limit, 20, 50)
  const skip = (page - 1) * limit

  // Fetch notifications
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, OR: [{ postId: null }, { post: { is: visibleFeedPost } }] },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      sender: {
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
      },
      post: {
        select: {
          id: true,
          content: true,
        },
      },
    },
  })

  // Count across all pages, using the same visibility filter as the list.
  const visible = { userId: user.id, OR: [{ postId: null }, { post: { is: visibleFeedPost } }] }
  const [total, unreadTotal] = await Promise.all([
    prisma.notification.count({ where: visible }),
    prisma.notification.count({ where: { ...visible, read: false } }),
  ])

  return {
    notifications,
    meta: {
      total,
      unreadTotal,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
})
