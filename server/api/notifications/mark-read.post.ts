/**
 * app/server/api/notifications/mark-read.post.ts
 * NanoFeed — Notifications API
 *
 * API endpoint for marking notifications as read.
 */

import { defineEventHandler, readBody, createError } from 'h3'
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

  const body = await readBody(event)

  // If a specific ID is provided, mark only that one. Otherwise, mark all.
  if (body?.id) {
    await prisma.notification.updateMany({
      where: {
        id: body.id,
        userId: user.id,
      },
      data: { read: true },
    })
  } else {
    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
      },
      data: { read: true },
    })
  }

  return { success: true }
})
