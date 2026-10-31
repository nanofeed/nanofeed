import { computed, ref } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useNanoAuth } from '../../app/composables/useAuth'

vi.mock('../../app/utils/auth-client', () => ({ authClient: {} }))

beforeEach(() => {
  const state = new Map()
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!state.has(key)) state.set(key, ref(init()))
    return state.get(key)
  })
  vi.stubGlobal('computed', computed)
})
afterEach(() => vi.unstubAllGlobals())

it('retains the existing session and settles loading when a refresh fails, then recovers', async () => {
  const fetcher = vi
    .fn()
    .mockRejectedValue({ data: { statusMessage: 'Session service unavailable' } })
  vi.stubGlobal('useRequestFetch', () => fetcher)
  const auth = useNanoAuth()
  const existing = { user: { id: 'existing' } } as NonNullable<typeof auth.session.value>
  auth.session.value = existing

  await expect(auth.refreshSession()).resolves.toBeUndefined()
  expect(auth.session.value).toEqual(existing)
  expect(auth.isAuthenticated.value).toBe(true)
  expect(auth.authError.value).toBe('Session service unavailable')
  expect(auth.isLoading.value).toBe(false)

  fetcher.mockResolvedValueOnce(null)
  await auth.refreshSession()
  expect(auth.session.value).toBeNull()
  expect(auth.isAuthenticated.value).toBe(false)
  expect(auth.authError.value).toBeNull()
  expect(fetcher).toHaveBeenLastCalledWith('/api/session')
})

it('finishes anonymous app startup on a network failure without throwing', async () => {
  vi.stubGlobal('useRequestFetch', () => vi.fn().mockRejectedValue(null))
  const auth = useNanoAuth()
  await expect(auth.refreshSession()).resolves.toBeUndefined()
  expect(auth.session.value).toBeNull()
  expect(auth.authError.value).toBe('Could not refresh your session. Please try again.')
  expect(auth.isLoading.value).toBe(false)
})
