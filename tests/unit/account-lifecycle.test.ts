import { computed, ref } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import { useAccountLifecycle } from '../../app/composables/useAccountLifecycle'
import { errorMessage } from '../../app/utils/errors'

afterEach(() => vi.unstubAllGlobals())

it('prefers useful server errors, then Error messages, then the operation fallback', () => {
  expect(
    errorMessage(
      Object.assign(new Error('FetchError text'), { data: { error: 'Account cannot be changed' } }),
      'Fallback',
    ),
  ).toBe('Account cannot be changed')
  expect(errorMessage({ data: { statusMessage: 'Please retry later' } }, 'Fallback')).toBe(
    'Please retry later',
  )
  expect(
    errorMessage(
      {
        data: {
          error: true,
          statusMessage: 'Server Error',
          data: { error: 'Owner accounts cannot be deleted' },
        },
      },
      'Fallback',
    ),
  ).toBe('Owner accounts cannot be deleted')
  expect(errorMessage(new Error('Offline'), 'Fallback')).toBe('Offline')
  for (const value of [null, undefined, {}, { data: { error: 42, statusMessage: '' } }]) {
    expect(errorMessage(value, 'Fallback')).toBe('Fallback')
  }
})

it('restores server messages for all three account lifecycle actions', async () => {
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('computed', computed)
  const signOut = vi.fn()
  vi.stubGlobal('useNanoAuth', () => ({ user: ref(null), signOut }))
  vi.stubGlobal(
    '$fetch',
    vi.fn().mockRejectedValue(
      Object.assign(new Error('Raw HTTP failure'), {
        data: { statusMessage: 'Server Error', data: { error: 'Try again later' } },
      }),
    ),
  )
  const lifecycle = useAccountLifecycle()
  for (const action of [
    lifecycle.deactivate,
    lifecycle.requestDeletion,
    lifecycle.cancelDeletion,
  ]) {
    expect(await action()).toBe(false)
    expect(lifecycle.lifecycleError.value).toBe('Try again later')
  }
  expect(signOut).not.toHaveBeenCalled()
  expect(
    lifecycle.isDeactivating.value ||
      lifecycle.isRequestingDeletion.value ||
      lifecycle.isCancellingDeletion.value,
  ).toBe(false)
})
