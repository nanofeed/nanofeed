import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '../../server/db/prisma'
import { auth } from '../../server/utils/auth'
import { completeGithubLogin } from '../helpers/github'

const ids: string[] = []
const base = 'http://localhost:3100'
async function githubLogin(githubId: number, email = `${githubId}@example.test`) {
  const { callback, cookie } = await completeGithubLogin(auth, githubId, email)
  const user = await prisma.user.findUnique({ where: { githubId: String(githubId) } })
  if (user && !ids.includes(user.id)) ids.push(user.id)
  return { callback, user, cookie }
}

beforeEach(async () => {
  await prisma.rateLimit.deleteMany()
})
afterEach(() => vi.unstubAllGlobals())
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
  await prisma.$disconnect()
})

describe('GitHub OAuth via Better Auth with simulated provider responses', () => {
  it('creates a user from a private verified GitHub email, assigns owner, and persists a session', async () => {
    const { callback, user, cookie } = await githubLogin(900001)
    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe('/')
    expect(user).toMatchObject({
      role: 'OWNER',
      verified: true,
      githubId: '900001',
      emailVerified: true,
    })
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) })
    expect(session?.user.id).toBe(user?.id)
  })
  it('preserves identity and custom profile and restores an account within the grace period', async () => {
    const first = await githubLogin(900002)
    expect(first.user).not.toBeNull()
    await prisma.user.update({
      where: { id: first.user!.id },
      data: { username: 'custom_name', isActive: false, deletionRequestedAt: new Date() },
    })
    const second = await githubLogin(900002)
    expect(second.user).toMatchObject({
      id: first.user!.id,
      username: 'custom_name',
      isActive: true,
      deletionRequestedAt: null,
      role: 'USER',
    })
  })
  it('rejects login after the deletion grace period', async () => {
    const first = await githubLogin(900003)
    await prisma.user.update({
      where: { id: first.user!.id },
      data: { deletionRequestedAt: new Date(Date.now() - 31 * 86400_000) },
    })
    const second = await githubLogin(900003)
    expect(second.callback.status).toBe(403)
    expect(
      await auth.api.getSession({ headers: new Headers({ cookie: second.cookie }) }),
    ).toBeNull()
  })
  it('rejects forged OAuth state and untrusted origins', async () => {
    const callback = await auth.handler(
      new Request(`${base}/api/auth/callback/github?code=bad&state=forged`),
    )
    expect(callback.headers.get('location')).toContain('error=')
    const response = await auth.handler(
      new Request(`${base}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://evil.example',
          cookie: 'better-auth.session_token=invalid',
        },
        body: JSON.stringify({ provider: 'github', callbackURL: '/' }),
      }),
    )
    expect(response.status).toBe(403)
  })
})
