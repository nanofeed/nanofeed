import prisma from '../../db/prisma'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const username = getRouterParam(event, 'username')
  if (!username) throw createError({ statusCode: 400, statusMessage: 'Username required' })
  const user = await prisma.user.findUnique({
    where: { username },
    select: { contributorCommit: true, isActive: true, deletionRequestedAt: true },
  })
  if (!user || !user.isActive || user.deletionRequestedAt)
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return { contributor: !!user.contributorCommit }
})
