import { createHmac } from 'node:crypto'
import prisma from '../db/prisma'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname.replace(/\/$/, '')
  if (!(
    (path === '/api/rootcap/api/challenge' && event.method === 'GET') ||
    (path === '/api/rootcap/api/verify' && event.method === 'POST')
  ))
    return

  const secret = process.env.ROOTCAP_SECRET
  if (!secret || secret.length < 32)
    throw createError({ statusCode: 503, statusMessage: 'Human verification is unavailable' })
  // The proxy must overwrite forwarded IP headers. Hash the address rather than
  // storing it in the shared rate-limit table. Unknown addresses share a bucket.
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const key = `rootcap:${createHmac('sha256', secret).update(ip).digest('hex')}`
  const now = BigInt(Date.now())
  const cutoff = now - BigInt(60_000)
  const [record] = await prisma.$queryRaw<{ count: number; last_request: bigint }[]>`
    INSERT INTO rate_limits (id, key, count, last_request)
    VALUES (${key}, ${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.last_request <= ${cutoff} THEN 1 ELSE rate_limits.count + 1 END,
      last_request = CASE WHEN rate_limits.last_request <= ${cutoff} THEN ${now} ELSE rate_limits.last_request END
    RETURNING count, last_request
  `
  if (record && record.count > 60) {
    setHeader(
      event,
      'Retry-After',
      String(Math.max(1, Math.ceil((Number(record.last_request) + 60_000 - Number(now)) / 1000))),
    )
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many attempts. Try again in a minute.',
    })
  }
})
