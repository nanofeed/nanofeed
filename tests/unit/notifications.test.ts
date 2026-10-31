import { ref } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useNotifications } from '../../app/composables/useNotifications'

beforeEach(() => {
  const state = new Map()
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!state.has(key)) state.set(key, ref(init()))
    return state.get(key)
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('propagates individual read and unread failures without refreshing a false count', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('Mutation failed'))
  vi.stubGlobal('$fetch', fetcher)
  const { markAsRead, markAsUnread } = useNotifications()
  await expect(markAsRead('one')).rejects.toThrow('Mutation failed')
  await expect(markAsUnread('one')).rejects.toThrow('Mutation failed')
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    '/api/notifications/mark-read',
    '/api/notifications/mark-unread',
  ])
})

it('refreshes the unread badge once after a whole group succeeds', async () => {
  const fetcher = vi.fn().mockResolvedValue({ count: 3 })
  vi.stubGlobal('$fetch', fetcher)
  const notifications = useNotifications()
  await notifications.setReadStatus(['one', 'two'], true)
  expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
    '/api/notifications/mark-read',
    '/api/notifications/mark-read',
    '/api/notifications/unread-count',
  ])
  expect(notifications.unreadCount.value).toBe(3)
})

it('settles all mutations before refreshing the badge and reporting partial failure', async () => {
  let finish!: () => void
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  const fetcher = vi.fn((url: string, options?: { body?: { id?: string } }) => {
    if (url.endsWith('unread-count')) return Promise.resolve({ count: 1 })
    return options?.body?.id === 'one' ? Promise.reject(new Error('Partial failure')) : pending
  })
  vi.stubGlobal('$fetch', fetcher)
  const notifications = useNotifications()
  const outcome = expect(notifications.setReadStatus(['one', 'two'], false)).rejects.toThrow(
    'Partial failure',
  )
  await Promise.resolve()
  expect(fetcher).toHaveBeenCalledTimes(2)
  finish()
  await outcome
  expect(fetcher.mock.calls.filter((call) => call[0].endsWith('unread-count'))).toHaveLength(1)
  expect(notifications.unreadCount.value).toBe(1)
})

it('ignores an older badge response that arrives after a newer one', async () => {
  let first!: (value: { count: number }) => void
  let second!: (value: { count: number }) => void
  vi.stubGlobal(
    '$fetch',
    vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            first = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            second = resolve
          }),
      ),
  )
  const notifications = useNotifications()
  const older = notifications.fetchUnreadCount()
  const newer = notifications.fetchUnreadCount()
  second({ count: 2 })
  await newer
  first({ count: 8 })
  await older
  expect(notifications.unreadCount.value).toBe(2)
})
