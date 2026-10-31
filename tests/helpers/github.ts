import { expect, vi } from 'vitest'

const base = 'http://localhost:3100'
const originalFetch = globalThis.fetch
export const responseCookies = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')

// Simulate GitHub transport only; exercise the application's actual auth configuration.
export async function completeGithubLogin(
  auth: { handler: (request: Request) => Promise<Response> },
  githubId: number,
  email = `${githubId}@example.test`,
) {
  vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url === 'https://github.com/login/oauth/access_token')
      return Response.json({
        access_token: 'synthetic-provider-token',
        token_type: 'bearer',
        scope: 'read:user user:email',
      })
    if (url === 'https://api.github.com/user')
      return Response.json({
        id: githubId,
        login: `dev-${githubId}`,
        name: 'Test Developer',
        email: null,
        avatar_url: 'https://example.test/avatar.png',
      })
    if (url === 'https://api.github.com/user/emails')
      return Response.json([{ email, primary: true, verified: true }])
    return originalFetch(input, init)
  })
  const start = await auth.handler(
    new Request(`${base}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: base },
      body: JSON.stringify({
        provider: 'github',
        callbackURL: '/',
        errorCallbackURL: '/auth/login?error=oauth',
      }),
    }),
  )
  expect(start.status).toBe(200)
  const { url } = await start.json()
  expect(new URL(url).hostname).toBe('github.com')
  const state = new URL(url).searchParams.get('state')
  const callback = await auth.handler(
    new Request(`${base}/api/auth/callback/github?code=synthetic-code&state=${state}`, {
      headers: { cookie: responseCookies(start) },
    }),
  )
  return { callback, cookie: responseCookies(callback) }
}
