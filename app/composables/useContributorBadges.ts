// Share one lookup of claimed badges between all visible authors.
export function useContributorBadges() {
  const usernames = useState<string[]>('contributor-usernames', () => [])
  const refreshAfter = useState('contributor-refresh-after', () => 0)
  const loading = useState('contributor-loading', () => false)
  const timerStarted = useState('contributor-timer-started', () => false)

  const refresh = async () => {
    if (loading.value || Date.now() < refreshAfter.value) return
    loading.value = true
    try {
      const result = await $fetch('/api/contributors')
      usernames.value = result.usernames
      refreshAfter.value = Date.now() + 6 * 60 * 60 * 1000
    } catch {
      // Keep the last successful result and retry after a temporary outage.
      refreshAfter.value = Date.now() + 5 * 60 * 1000
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    void refresh()
    if (!timerStarted.value) {
      timerStarted.value = true
      window.setInterval(refresh, 5 * 60 * 1000)
    }
  })

  return { isContributor: (username: string) => usernames.value.includes(username) }
}
