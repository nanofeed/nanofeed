import { createError } from 'h3'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

const database = vi.hoisted(() => ({
  recommendationSnapshot: { deleteMany: vi.fn() },
  rateLimit: { deleteMany: vi.fn() },
  verification: { deleteMany: vi.fn() },
  user: { findMany: vi.fn(), deleteMany: vi.fn() },
}))
vi.mock('../../server/db/prisma', () => ({ default: database }))

let handler: typeof import('../../server/api/cron/purge-deleted-accounts.get').default
beforeAll(async () => {
  vi.stubGlobal('defineEventHandler', (callback: unknown) => callback)
  handler = (await import('../../server/api/cron/purge-deleted-accounts.get')).default
})
beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'synthetic-cron')
  vi.stubGlobal('getHeader', () => 'Bearer synthetic-cron')
  vi.stubGlobal('createError', createError)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  database.recommendationSnapshot.deleteMany.mockResolvedValue({ count: 0 })
  database.rateLimit.deleteMany.mockResolvedValue({ count: 0 })
  database.verification.deleteMany.mockResolvedValue({ count: 0 })
  database.user.findMany.mockResolvedValue([{ id: 'expired', username: 'expired' }])
  database.user.deleteMany.mockResolvedValue({ count: 1 })
})
afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

for (const table of ['recommendationSnapshot', 'rateLimit', 'verification'] as const) {
  it(`purges expired accounts even if ${table} cleanup fails`, async () => {
    database[table].deleteMany.mockRejectedValueOnce(new Error('Cleanup unavailable'))
    expect(await handler({} as never)).toMatchObject({ data: { deleted: 1 } })
    expect(database.user.deleteMany).toHaveBeenCalledOnce()
    expect(database.recommendationSnapshot.deleteMany).toHaveBeenCalledOnce()
    expect(database.rateLimit.deleteMany).toHaveBeenCalledOnce()
    expect(database.verification.deleteMany).toHaveBeenCalledOnce()
    expect(console.error).toHaveBeenCalled()
  })
}
