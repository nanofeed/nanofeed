import { auth } from '../utils/auth'
import prisma from '../db/prisma'

export default defineEventHandler(async (event) => {
  if (
    !event.path.startsWith('/api/') ||
    event.path.startsWith('/api/auth/') ||
    event.path.startsWith('/api/cron/')
  )
    return
  setHeader(event, 'Cache-Control', 'private, no-store')
  const session = await auth.api.getSession({
    headers: new Headers(
      Object.entries(getRequestHeaders(event)).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    ),
  })
  if (!session) return
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || !user.isActive) return
  if (user.deletionRequestedAt && event.path !== '/api/users/cancel-deletion') return
  event.context.session = { ...session, user }
})
