import { afterEach, expect, it, vi } from 'vitest'
import {
  GitHubUnavailable,
  parseCommit,
  verifyContributorCommit,
} from '../../server/utils/contributorVerification'

const sha = '068d36af1cd05116e303b92a24cac3c96849518a'
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it('accepts only commit hashes and links to the official repository', () => {
  expect(parseCommit('068d36a')).toBe('068d36a')
  expect(parseCommit(`https://github.com/nanofeed/nanofeed/commit/${sha}`)).toBe(sha)
  expect(parseCommit('https://github.com/other/repo/commit/068d36a')).toBeNull()
  expect(parseCommit('../../main')).toBeNull()
})

it('grants only a matching author on the default branch', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(ok({ sha, author: { id: 42 } }))
    .mockResolvedValueOnce(ok({ default_branch: 'main' }))
    .mockResolvedValueOnce(ok({ status: 'ahead' }))
  vi.stubGlobal('fetch', fetcher)
  expect(await verifyContributorCommit('068d36a', '42')).toBe(sha)
  expect(fetcher.mock.calls[2][0]).toContain(`/compare/${sha}...main`)
})

it('rejects unmatched accounts and commits outside the default branch', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok({ sha, author: { id: 43 } })))
  expect(await verifyContributorCommit('068d36a', '42')).toBeNull()
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(ok({ sha, author: { id: 42 } }))
      .mockResolvedValueOnce(ok({ default_branch: 'main' }))
      .mockResolvedValueOnce(ok({ status: 'diverged' })),
  )
  expect(await verifyContributorCommit('068d36a', '42')).toBeNull()
})

it('fails closed when GitHub is unavailable or returns malformed data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
  await expect(verifyContributorCommit('068d36a', '42')).rejects.toBeInstanceOf(GitHubUnavailable)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok({ sha: 'invalid', author: { id: 42 } })))
  await expect(verifyContributorCommit('068d36a', '42')).rejects.toBeInstanceOf(GitHubUnavailable)
})

it('uses the linked account token for every public-repository check without a deployment token', async () => {
  vi.stubEnv('GITHUB_CONTRIBUTORS_TOKEN', '')
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(ok({ sha, author: { id: 42 } }))
    .mockResolvedValueOnce(ok({ default_branch: 'release/main' }))
    .mockResolvedValueOnce(ok({ status: 'identical' }))
  vi.stubGlobal('fetch', fetcher)
  expect(await verifyContributorCommit('068d36a', '42', 'synthetic-oauth')).toBe(sha)
  for (const [, options] of fetcher.mock.calls)
    expect(options.headers.Authorization).toBe('Bearer synthetic-oauth')
  expect(fetcher.mock.calls[2][0]).toContain('release%2Fmain')
})
it.each([401, 403, 429])(
  'recovers from a rejected or exhausted shared token (%s)',
  async (status) => {
    vi.stubEnv('GITHUB_CONTRIBUTORS_TOKEN', 'synthetic-shared')
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status }))
      .mockResolvedValueOnce(ok({ sha, author: { id: 42 } }))
      .mockResolvedValueOnce(ok({ default_branch: 'main' }))
      .mockResolvedValueOnce(ok({ status: 'ahead' }))
    vi.stubGlobal('fetch', fetcher)
    expect(await verifyContributorCommit('068d36a', '42', 'synthetic-oauth')).toBe(sha)
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer synthetic-shared')
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer synthetic-oauth')
  },
)
it('distinguishes quota, credentials, and network failures without granting badges', async () => {
  vi.stubEnv('GITHUB_CONTRIBUTORS_TOKEN', '')
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 403, headers: { 'x-ratelimit-remaining': '0' } }),
      ),
  )
  await expect(verifyContributorCommit('068d36a', '42')).rejects.toMatchObject({
    reason: 'rate_limit',
    status: 403,
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
  await expect(verifyContributorCommit('068d36a', '42', 'revoked')).rejects.toMatchObject({
    reason: 'credentials',
    status: 401,
  })
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('secret must not leak')))
  await expect(verifyContributorCommit('068d36a', '42')).rejects.toMatchObject({
    reason: 'network',
    message: 'GitHub verification failed: network',
  })
})
it('rejects absent authors and missing commits', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok({ sha, author: null })))
  expect(await verifyContributorCommit('068d36a', '42')).toBeNull()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })))
  expect(await verifyContributorCommit('068d36a', '42')).toBeNull()
})
