import { afterEach, expect, it, vi } from 'vitest'
import { maintenanceCountdown } from '../../app/utils/maintenanceCountdown'
const getSiteSettings = vi.fn()
vi.mock('../../server/utils/siteSettings', () => ({ getSiteSettings }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.clearAllMocks()
})

it('allows only the authenticated user’s own profile during maintenance', async () => {
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal(
    'getRequestURL',
    (event: { path: string }) => new URL(event.path, 'http://localhost'),
  )
  vi.stubGlobal('setHeader', vi.fn())
  vi.stubGlobal('createError', (error: { statusCode: number }) =>
    Object.assign(new Error('maintenance'), error),
  )
  getSiteSettings.mockResolvedValue({ maintenanceEnabled: true, maintenanceMessage: 'Back soon' })
  const handler = (await import('../../server/middleware/maintenance')).default as unknown as (
    event: unknown,
  ) => Promise<void>
  const event = (path: string, username?: string, method = 'GET') => ({
    path,
    method,
    context: { session: username ? { user: { username } } : undefined },
  })
  for (const path of [
    '/api/feed',
    '/api/posts/create',
    '/api/search',
    '/api/notifications',
    '/api/users/alice/follow',
    '/api/users/bob',
    '/api/contributors/bob',
    '/api/contributors',
    '/api/users/update',
  ]) {
    await expect(handler(event(path, 'alice'))).rejects.toMatchObject({ statusCode: 503 })
  }
  await expect(handler(event('/api/users/alice'))).rejects.toMatchObject({ statusCode: 503 })
  for (const path of [
    '/api/users/alice',
    '/api/contributors/alice',
    '/api/users/me',
    '/api/auth/sign-in',
    '/api/dashboard/settings',
    '/api/site/settings',
  ]) {
    await expect(handler(event(path, 'alice'))).resolves.toBeUndefined()
  }
  await expect(handler(event('/api/users/update', 'alice', 'PATCH'))).resolves.toBeUndefined()
  getSiteSettings.mockResolvedValue({ maintenanceEnabled: false })
  await expect(handler(event('/api/users/bob', 'alice'))).resolves.toBeUndefined()
})

it('counts down to the estimated return and stays at zero once elapsed', () => {
  const end = '2026-10-31T01:02:03.000Z'
  expect(maintenanceCountdown(end, Date.parse('2026-10-30T00:00:00.000Z'))).toEqual({
    days: 1,
    hours: 1,
    minutes: 2,
    seconds: 3,
    expired: false,
  })
  expect(maintenanceCountdown(end, Date.parse(end) + 1000)).toEqual({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: true,
  })
})
