import { afterEach, expect, it, vi } from 'vitest'
import { orderedBadges } from '../../shared/utils/badges'

const { update } = vi.hoisted(() => ({ update: vi.fn() }))
vi.mock('../../server/db/prisma', () => ({ default: { user: { update } } }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.clearAllMocks()
})

it('orders all earned badges, uses a stable default and ignores revoked/unknown/duplicate preferences', () => {
  const user = { role: 'OWNER', verified: true, contributorCommit: 'sha' }
  expect(orderedBadges(user)).toEqual(['owner', 'verified', 'contributor'])
  expect(orderedBadges({ ...user, badgeOrder: ['contributor', 'owner', 'verified'] })).toEqual([
    'contributor',
    'owner',
    'verified',
  ])
  expect(
    orderedBadges({
      ...user,
      role: 'USER',
      badgeOrder: ['owner', 'unknown', 'contributor', 'contributor'],
    }),
  ).toEqual(['contributor', 'verified'])
  expect(orderedBadges({ badgeOrder: ['owner'] })).toEqual([])
})

async function setup(badgeOrder: unknown) {
  vi.stubGlobal('defineEventHandler', (cb: unknown) => cb)
  vi.stubGlobal('readBody', vi.fn().mockResolvedValue({ badgeOrder }))
  vi.stubGlobal('createError', (data: object) => Object.assign(new Error('request error'), data))
  return (await import('../../server/api/users/badge-order.patch')).default as unknown as (
    event: unknown,
  ) => Promise<unknown>
}

it('requires authentication and saves only the signed-in account preference', async () => {
  const handler = await setup(['contributor', 'verified'])
  await expect(handler({ context: {} })).rejects.toMatchObject({ statusCode: 401 })
  const user = { id: 'signed-in', role: 'USER', verified: true, contributorCommit: 'sha' }
  expect(await handler({ context: { session: { user } } })).toEqual({
    badgeOrder: ['contributor', 'verified'],
  })
  expect(update).toHaveBeenCalledWith({
    where: { id: 'signed-in' },
    data: { badgeOrder: ['contributor', 'verified'] },
  })
})
it.each(
  [['owner'], ['verified', 'verified'], ['unknown'], 'verified', null, [42]].map((order) => ({
    order,
  })),
)('rejects invalid or unearned badge choices: %j', async ({ order }) => {
  const handler = await setup(order)
  await expect(
    handler({ context: { session: { user: { id: 'user', verified: true } } } }),
  ).rejects.toMatchObject({ statusCode: 400 })
  expect(update).not.toHaveBeenCalled()
})
