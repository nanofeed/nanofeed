import { afterEach, expect, it, vi } from 'vitest'
import prisma from '../../server/db/prisma'
import { auth } from '../../server/utils/auth'
import { completeGithubLogin } from '../helpers/github'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it.each([900001, 900099])(
  'claims a contributor badge using the real stored OAuth binding for GitHub ID %s',
  async (githubId) => {
    const sha = 'a'.repeat(40)
    const { cookie } = await completeGithubLogin(auth, githubId)
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) })
    expect(session).not.toBeNull()
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session!.user.id } })
    expect(user.role).toBe(githubId === 900001 ? 'OWNER' : 'USER')
    vi.stubGlobal('defineEventHandler', (cb: unknown) => cb)
    vi.stubGlobal('readBody', async () => ({ commit: sha }))
    vi.stubGlobal('createError', (data: object) => Object.assign(new Error('request error'), data))
    vi.stubEnv('GITHUB_CONTRIBUTORS_TOKEN', '')
    const fetcher = vi.fn(async (input: string, init: RequestInit) => {
      expect((init.headers as Record<string, string>).Authorization).toBe(
        'Bearer synthetic-provider-token',
      )
      if (input.endsWith(`/commits/${sha}`)) return Response.json({ sha, author: { id: githubId } })
      if (input.includes('/compare/')) return Response.json({ status: 'ahead' })
      return Response.json({ default_branch: 'main' })
    })
    vi.stubGlobal('fetch', fetcher)
    try {
      const handler = (await import('../../server/api/verification/contributor.post'))
        .default as unknown as (event: unknown) => Promise<unknown>
      const event = { context: { session: { user } } }
      expect(await handler(event)).toEqual({ contributor: true })
      expect(fetcher).toHaveBeenCalledTimes(3)
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).contributorCommit,
      ).toBe(sha)
      // The same signed-in account must not claim a different author's commit.
      fetcher.mockImplementation(async () =>
        Response.json({ sha: 'b'.repeat(40), author: { id: githubId + 1 } }),
      )
      await expect(handler(event)).rejects.toMatchObject({ statusCode: 400 })
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).contributorCommit,
      ).toBe(sha)
    } finally {
      await prisma.user.delete({ where: { id: user.id } })
      await prisma.rateLimit.deleteMany({ where: { key: `contributor:${user.id}` } })
    }
  },
)
