import prisma from '../db/prisma'

export default defineEventHandler(async (event) => {
  if (
    getRequestURL(event).pathname.replace(/\/$/, '') !== '/api/posts/create' ||
    event.method !== 'POST'
  )
    return
  const userId = event.context.session?.user.id
  if (!userId) return
  const key = `post:${userId}`
  const now = BigInt(Date.now())
  const cutoff = now - BigInt(60_000)
  // One atomic row per user, shared by all serverless instances. Query strings
  // cannot bypass the limiter, and there is no calendar-minute boundary burst.
  const [record] = await prisma.$queryRaw<{ count: number; last_request: bigint }[]>`
    INSERT INTO rate_limits (id, key, count, last_request)
    VALUES (${key}, ${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.last_request <= ${cutoff} THEN 1 ELSE rate_limits.count + 1 END,
      last_request = CASE WHEN rate_limits.last_request <= ${cutoff} THEN ${now} ELSE rate_limits.last_request END
    RETURNING count, last_request
  `
  if (record && record.count > 5) {
    setHeader(
      event,
      'Retry-After',
      String(Math.max(1, Math.ceil((Number(record.last_request) + 60_000 - Number(now)) / 1000))),
    )
    throw createError({ statusCode: 429, statusMessage: 'Too many posts. Try again in a minute.' })
  }
})
