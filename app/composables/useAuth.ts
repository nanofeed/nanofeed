import type { AppSession } from '#shared/types/session'
import { authClient } from '../utils/auth-client'
import { errorMessage } from '../utils/errors'

export const useNanoAuth = () => {
  const session = useState<AppSession | null>('auth-session', () => null)
  const isLoading = useState('auth-loading', () => true)
  const authError = useState<string | null>('auth-error', () => null)
  const user = computed(() => session.value?.user ?? null)
  const status = computed(() =>
    isLoading.value ? 'loading' : user.value ? 'authenticated' : 'unauthenticated',
  )
  const requestFetch = useRequestFetch()
  const refreshSession = async () => {
    try {
      session.value = await requestFetch<AppSession | null>('/api/session')
      authError.value = null
    } catch (error) {
      authError.value = errorMessage(error, 'Could not refresh your session. Please try again.')
    } finally {
      isLoading.value = false
    }
  }
  const loginWithGithub = async (rootcapToken: string) => {
    isLoading.value = true
    authError.value = null
    try {
      const result = await authClient.signIn.social({
        provider: 'github',
        callbackURL: '/',
        errorCallbackURL: '/auth/login?error=oauth',
        fetchOptions: { headers: { 'x-rootcap-token': rootcapToken } },
      })
      if (result.error) throw new Error(result.error.message)
      return true
    } catch {
      authError.value = 'GitHub sign-in could not start. Please verify again and retry.'
      return false
    } finally {
      isLoading.value = false
    }
  }
  const signOut = async (options?: { callbackUrl?: string }) => {
    const result = await authClient.signOut()
    if (result.error) throw new Error(result.error.message)
    session.value = null
    clearNuxtState((key) => key.startsWith('feed-'))
    await navigateTo(options?.callbackUrl || '/auth/login')
  }
  return {
    session,
    user,
    status,
    isLoading,
    authError,
    refreshSession,
    isAuthenticated: computed(() => !!user.value),
    isOwner: computed(() => user.value?.role === 'OWNER'),
    isVerified: computed(() => user.value?.verified === true),
    isRestricted: computed(() => user.value?.isRestricted === true),
    restrictionNote: computed(() => user.value?.restrictionNote ?? null),
    loginWithGithub,
    signOut,
    logout: () => signOut(),
  }
}
