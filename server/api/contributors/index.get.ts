import prisma from '../../db/prisma'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const users = await prisma.user.findMany({
    where: { contributorCommit: { not: null }, isActive: true, deletionRequestedAt: null },
    select: { username: true },
  })
  return { usernames: users.map((user) => user.username) }
})
