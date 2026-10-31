/* server/services/notificationService.ts
 * NanoFeed — Notification Service
 *
 * Service for creating and managing notifications.
 */

import prisma from '../db/prisma'
import type { NotificationType } from '@prisma/client'

/**
 * Creates a notification for a user.
 */
export async function createNotification(data: {
  userId: string
  type: NotificationType
  message: string
  postId?: string
  senderId?: string
}) {
  try {
    // Prevent notifying yourself
    if (data.userId === data.senderId) return null

    if (data.type === 'REACTION' && data.senderId && data.postId) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: data.userId,
          type: 'REACTION',
          senderId: data.senderId,
          postId: data.postId,
        },
      })
      if (existing) return existing
    }

    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        message: data.message,
        postId: data.postId,
        senderId: data.senderId,
      },
    })
    return notification
  } catch (error) {
    console.error('Failed to create notification:', error)
    return null
  }
}
