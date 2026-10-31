/**
 * app/composables/useAccountLifecycle.ts
 * NanoFeed — Account Lifecycle Composable
 *
 * Provides reactive state and actions for:
 *   - Account deactivation (immediate sign-out, re-login = reactivate)
 *   - Account deletion with 30-day grace period (immediate sign-out)
 *   - Cancellation of pending deletion (while still logged in)
 *
 * Works like Facebook / X (Twitter) account lifecycle.
 */
import { errorMessage } from '../utils/errors'

export const useAccountLifecycle = () => {
  const { signOut } = useNanoAuth()
  const { user } = useNanoAuth()

  const isDeactivating = ref(false)
  const isRequestingDeletion = ref(false)
  const isCancellingDeletion = ref(false)
  const lifecycleError = ref<string | null>(null)

  // ── Computed: deletion state ───────────────────────────────────
  const deletionRequestedAt = computed(() => {
    const raw = user.value?.deletionRequestedAt
    return raw ? new Date(raw) : null
  })

  const deletionScheduledFor = computed(() => {
    if (!deletionRequestedAt.value) return null
    const d = new Date(deletionRequestedAt.value)
    d.setDate(d.getDate() + 30)
    return d
  })

  const daysUntilDeletion = computed(() => {
    if (!deletionScheduledFor.value) return null
    const diff = deletionScheduledFor.value.getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  })

  const isDeletionPending = computed(() => !!deletionRequestedAt.value)

  // ── Actions ────────────────────────────────────────────────────

  /**
   * Deactivate account:
   *   1. Calls POST /api/users/deactivate
   *   2. Signs out immediately
   *   3. Redirects to /auth/login?deactivated=true
   *   Reactivation = just log in again (auto-handled by signIn hook)
   */
  const deactivate = async (): Promise<boolean> => {
    isDeactivating.value = true
    lifecycleError.value = null

    try {
      await $fetch('/api/users/deactivate', { method: 'POST' })
      // Sign out and show the deactivation banner on the login page
      await signOut({ callbackUrl: '/auth/login?deactivated=true' })
      return true
    } catch (err: unknown) {
      lifecycleError.value = errorMessage(err, 'Failed to deactivate account')
      return false
    } finally {
      isDeactivating.value = false
    }
  }

  /**
   * Request account deletion (starts 30-day grace period):
   *   1. Calls POST /api/users/delete
   *   2. Signs out immediately
   *   3. Redirects to /auth/login?deleted=pending
   *   Cancellation = log in within 30 days (auto-handled by signIn hook)
   *   OR click "Cancel Deletion" while still logged in
   */
  const requestDeletion = async (): Promise<boolean> => {
    isRequestingDeletion.value = true
    lifecycleError.value = null

    try {
      await $fetch('/api/users/delete', { method: 'POST' })
      // Sign out and show the deletion pending banner on the login page
      await signOut({ callbackUrl: '/auth/login?deleted=pending' })
      return true
    } catch (err: unknown) {
      lifecycleError.value = errorMessage(err, 'Failed to schedule account deletion')
      return false
    } finally {
      isRequestingDeletion.value = false
    }
  }

  /**
   * Cancel a pending deletion while the user still has an active session.
   * Note: Logging in also auto-cancels deletion via the signIn hook.
   */
  const cancelDeletion = async (): Promise<boolean> => {
    isCancellingDeletion.value = true
    lifecycleError.value = null

    try {
      await $fetch('/api/users/cancel-deletion', { method: 'POST' })
      // Refresh the page to update the UI state
      await refreshNuxtData()
      return true
    } catch (err: unknown) {
      lifecycleError.value = errorMessage(err, 'Failed to cancel deletion')
      return false
    } finally {
      isCancellingDeletion.value = false
    }
  }

  return {
    // State
    isDeactivating,
    isRequestingDeletion,
    isCancellingDeletion,
    lifecycleError,
    // Computed
    isDeletionPending,
    deletionRequestedAt,
    deletionScheduledFor,
    daysUntilDeletion,
    // Actions
    deactivate,
    requestDeletion,
    cancelDeletion,
  }
}
