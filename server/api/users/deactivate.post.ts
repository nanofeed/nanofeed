/**
 * server/api/users/deactivate.post.ts
 * NanoFeed — POST /api/users/deactivate
 *
 * Deactivates the current user's account:
 *   - Sets isActive = false in the DB
 *   - The frontend immediately calls signOut() after this succeeds
 *   - The ONLY way to reactivate is to log in again via GitHub OAuth
 *     (the signIn callback auto-sets isActive = true on next login)
 *
 * Requires authentication.
 */

import prisma from '../../db/prisma'
import { successResponse, errorResponse, HTTP } from '../../utils/responses'

export default defineEventHandler(async (event) => {
  const session = event.context.session

  if (!session?.user?.email) {
    throw createError({
      statusCode: HTTP.UNAUTHORIZED,
      data: errorResponse('Authentication required'),
    })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, isActive: true },
    })

    if (!user) {
      throw createError({
        statusCode: HTTP.NOT_FOUND,
        data: errorResponse('User not found'),
      })
    }

    if (!user.isActive) {
      throw createError({
        statusCode: HTTP.BAD_REQUEST,
        data: errorResponse('Account is already deactivated'),
      })
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: { isActive: false },
    })

    return successResponse({ message: 'Account deactivated successfully' })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'statusCode' in error) throw error
    console.error('[POST /api/users/deactivate]', error)
    throw createError({
      statusCode: HTTP.SERVER_ERROR,
      data: errorResponse('Failed to deactivate account'),
    })
  }
})
