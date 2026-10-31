import prisma from '../../db/prisma'
import {
  GitHubUnavailable,
  parseCommit,
  verifyContributorCommit,
} from '../../utils/contributorVerification'

export default defineEventHandler(async (event) => {
  const user = event.context.session?.user
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  const body = await readBody<{ commit?: unknown }>(event)
  const ref = parseCommit(body?.commit)
  if (!ref)
    throw createError({
      statusCode: 400,
      statusMessage: 'Enter a commit SHA or a commit link from nanofeed/nanofeed.',
    })

  // Shared across server instances to protect the GitHub API quota.
  const key = `contributor:${user.id}`
  const now = BigInt(Date.now())
  const cutoff = now - BigInt(60_000)
  const [record] = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limits (id, key, count, last_request)
    VALUES (${key}, ${key}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.last_request <= ${cutoff} THEN 1 ELSE rate_limits.count + 1 END,
      last_request = CASE WHEN rate_limits.last_request <= ${cutoff} THEN ${now} ELSE rate_limits.last_request END
    RETURNING count
  `
  if (record && record.count > 5)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many attempts. Try again in a minute.',
    })

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: 'github', accountId: user.githubId },
    select: { accessToken: true, accessTokenExpiresAt: true },
  })
  const accountToken =
    account?.accessToken &&
    (!account.accessTokenExpiresAt || account.accessTokenExpiresAt.getTime() > Date.now())
      ? account.accessToken
      : undefined

  let sha: string | null
  try {
    sha = await verifyContributorCommit(ref, user.githubId, accountToken)
  } catch (error) {
    if (error instanceof GitHubUnavailable) {
      console.warn('[contributor verification] GitHub request failed', {
        reason: error.reason,
        status: error.status,
        configuredToken: !!process.env.GITHUB_CONTRIBUTORS_TOKEN?.trim(),
        accountToken: !!accountToken,
      })
      throw createError({
        statusCode: 503,
        statusMessage:
          error.reason === 'credentials'
            ? 'GitHub authorization has expired. Please sign out and sign in with GitHub again.'
            : error.reason === 'rate_limit'
              ? 'GitHub request limit reached. Please wait and try again.'
              : 'GitHub verification is temporarily unavailable. Please try again.',
      })
    }
    throw error
  }
  if (!sha)
    throw createError({
      statusCode: 400,
      statusMessage: 'No matching commit by your GitHub account was found on the default branch.',
    })
  await prisma.user.update({ where: { id: user.id }, data: { contributorCommit: sha } })
  return { contributor: true }
})
