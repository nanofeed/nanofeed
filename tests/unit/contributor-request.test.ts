import { afterEach, expect, it, vi } from 'vitest'
const { query, update, verify, account } = vi.hoisted(() => ({
  query: vi.fn(),
  update: vi.fn(),
  verify: vi.fn(),
  account: vi.fn(),
}))
vi.mock('../../server/db/prisma', () => ({
  default: { $queryRaw: query, user: { update }, account: { findFirst: account } },
}))
vi.mock('../../server/utils/contributorVerification', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../server/utils/contributorVerification')>()),
  verifyContributorCommit: verify,
}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.clearAllMocks()
})
async function setup(commit = '068d36a') {
  vi.stubGlobal('defineEventHandler', (callback: unknown) => callback)
  vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ commit }))
  vi.stubGlobal('createError', (data: { statusCode: number }) =>
    Object.assign(new Error('request error'), data),
  )
  query.mockResolvedValue([{ count: 1 }])
  return (await import('../../server/api/verification/contributor.post')).default as unknown as (
    event: unknown,
  ) => Promise<unknown>
}
it('requires authentication and grants the badge only for the signed-in account', async () => {
  const handler = await setup()
  await expect(handler({ context: {} })).rejects.toMatchObject({ statusCode: 401 })
  verify.mockResolvedValue('full-sha')
  expect(await handler({ context: { session: { user: { id: 'user', githubId: '42' } } } })).toEqual(
    { contributor: true },
  )
  expect(verify).toHaveBeenCalledWith('068d36a', '42', undefined)
  expect(update).toHaveBeenCalledWith({
    where: { id: 'user' },
    data: { contributorCommit: 'full-sha' },
  })
})
it('does not grant a badge for a mismatch or a rate-limited request', async () => {
  const handler = await setup()
  const event = { context: { session: { user: { id: 'user', githubId: '42' } } } }
  verify.mockResolvedValue(null)
  await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
  query.mockResolvedValue([{ count: 6 }])
  await expect(handler(event)).rejects.toMatchObject({ statusCode: 429 })
  expect(update).not.toHaveBeenCalled()
})

it('uses only the signed-in GitHub binding and skips expired credentials', async () => {
  const handler = await setup()
  const event = { context: { session: { user: { id: 'user', githubId: '42' } } } }
  verify.mockResolvedValue('full-sha')
  account.mockResolvedValue({ accessToken: 'synthetic-account-token', accessTokenExpiresAt: null })
  await handler(event)
  expect(account).toHaveBeenCalledWith({
    where: { userId: 'user', providerId: 'github', accountId: '42' },
    select: { accessToken: true, accessTokenExpiresAt: true },
  })
  expect(verify).toHaveBeenLastCalledWith('068d36a', '42', 'synthetic-account-token')
  account.mockResolvedValue({ accessToken: 'expired', accessTokenExpiresAt: new Date(0) })
  await handler(event)
  expect(verify).toHaveBeenLastCalledWith('068d36a', '42', undefined)
})
it('does not save a badge during a provider outage and gives actionable authorization errors', async () => {
  const handler = await setup()
  const { GitHubUnavailable } = await import('../../server/utils/contributorVerification')
  const event = { context: { session: { user: { id: 'user', githubId: '42' } } } }
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    verify.mockRejectedValue(new GitHubUnavailable('credentials', 401))
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: expect.stringContaining('sign in'),
    })
    verify.mockRejectedValue(new GitHubUnavailable('rate_limit', 403))
    await expect(handler(event)).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: expect.stringContaining('limit'),
    })
    expect(update).not.toHaveBeenCalled()
    expect(JSON.stringify(warning.mock.calls)).not.toContain('synthetic-account-token')
  } finally {
    warning.mockRestore()
  }
})
