/** Notification mutations reject on failure; batches refresh the badge once. */
export const useNotifications = () => {
  const unreadCount = useState<number>('unreadNotificationsCount', () => 0)
  const isFetchingCount = useState<boolean>('isFetchingUnreadCount', () => false)
  const countRequest = useState<number>('unreadCountRequest', () => 0)

  const fetchUnreadCount = async () => {
    const request = ++countRequest.value
    try {
      isFetchingCount.value = true
      const res = await $fetch<{ count: number }>('/api/notifications/unread-count', {
        timeout: 5000,
        retry: 0,
      })
      if (request === countRequest.value) unreadCount.value = res.count
      return unreadCount.value
    } catch (err) {
      console.error('Failed to fetch unread count', err)
      return null
    } finally {
      if (request === countRequest.value) isFetchingCount.value = false
    }
  }

  const markAsRead = async (id?: string, options: { refreshCount?: boolean } = {}) => {
    await $fetch('/api/notifications/mark-read', {
      method: 'POST',
      body: id ? { id } : {},
      timeout: 5000,
      retry: 0,
    })
    if (options.refreshCount !== false) await fetchUnreadCount()
  }

  const markAsUnread = async (id?: string, options: { refreshCount?: boolean } = {}) => {
    await $fetch('/api/notifications/mark-unread', {
      method: 'POST',
      body: id ? { id } : {},
      timeout: 5000,
      retry: 0,
    })
    if (options.refreshCount !== false) await fetchUnreadCount()
  }

  const setReadStatus = async (ids: string[] | undefined, read: boolean) => {
    const mutate = read ? markAsRead : markAsUnread
    // Wait for every request before reconciliation, including on partial failure.
    const results = await Promise.allSettled(
      (ids ?? [undefined]).map((id) => mutate(id, { refreshCount: false })),
    )
    const count = await fetchUnreadCount()
    const failed = results.find((result) => result.status === 'rejected')
    if (failed?.status === 'rejected') throw failed.reason
    return count
  }

  return { unreadCount, isFetchingCount, fetchUnreadCount, markAsRead, markAsUnread, setReadStatus }
}
