import { afterEach, expect, it, vi } from 'vitest'
const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))
vi.mock('../../server/db/prisma', () => ({ default: { user: { findMany } } }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.clearAllMocks()
})
it('returns only active users who have claimed the contributor badge', async () => {
  vi.stubGlobal('defineEventHandler', (callback: unknown) => callback)
  vi.stubGlobal('setHeader', vi.fn())
  findMany.mockResolvedValue([{ username: 'developer' }])
  const handler = (await import('../../server/api/contributors/index.get')).default as unknown as (
    event: unknown,
  ) => Promise<unknown>
  expect(await handler({})).toEqual({ usernames: ['developer'] })
  expect(findMany).toHaveBeenCalledWith({
    where: { contributorCommit: { not: null }, isActive: true, deletionRequestedAt: null },
    select: { username: true },
  })
})
