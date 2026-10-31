/**
 * app/composables/useUser.ts
 * NanoFeed — Current User Data Composable
 *
 * Fetches the full current user profile from /api/users/me
 * and provides update functionality via /api/users/update.
 */

import type { UpdateUserInput, User } from '#shared/types/user'

export const useUser = () => {
  const { refreshSession } = useNanoAuth()
  const ready = useFetch('/api/users/me', {
    key: 'current-user-profile',
    watch: false,
  })
  const { data, status, refresh, error } = ready

  const user = computed(() => (data.value as unknown as { data?: User })?.data ?? null)
  const isLoading = computed(() => status.value === 'pending')

  /**
   * Update the current user's profile.
   * Refreshes the user data after a successful update.
   */
  const updateProfile = async (input: UpdateUserInput): Promise<void> => {
    await $fetch('/api/users/update', {
      method: 'PATCH',
      body: input,
    })
    // Refresh local data after update
    await Promise.all([refresh(), refreshSession()])
  }

  return {
    ready,
    user,
    isLoading,
    error,
    refresh,
    updateProfile,
  }
}
