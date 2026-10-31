import type { PaginatedPosts, PostWithAuthor } from '#shared/types/post'

type FeedFilter = 'recommended' | 'following' | 'latest'
export const useFeed = (options: { autoLoad?: boolean } = {}) => {
  const filter = useState<FeedFilter>('feed-filter', () => 'recommended')
  const page = useState('feed-page', () => 1)
  const posts = useState<PostWithAuthor[]>('feed-posts', () => [])
  const feed = useState<PaginatedPosts | null>('feed-data', () => null)
  const isLoading = useState('feed-loading', () => false)
  const error = useState<string | null>('feed-error', () => null)
  const request = useState('feed-request-id', () => 0)
  const fetcher = useRequestFetch()
  const load = async (reset: boolean) => {
    const id = ++request.value
    isLoading.value = true
    error.value = null
    const nextPage = reset ? 1 : page.value + 1
    try {
      const result = await fetcher<{ data: PaginatedPosts }>('/api/feed', {
        query: {
          page: nextPage,
          pageSize: 20,
          filter: filter.value,
          snapshot: reset ? undefined : feed.value?.snapshot || undefined,
        },
      })
      if (id !== request.value) return
      const incoming = result.data
      posts.value = reset
        ? incoming.posts
        : [
            ...posts.value,
            ...incoming.posts.filter(
              (post) => !posts.value.some((existing) => existing.id === post.id),
            ),
          ]
      feed.value = incoming
      page.value = nextPage
    } catch (cause: unknown) {
      if (id !== request.value) return
      error.value =
        (cause as { statusCode?: number }).statusCode === 410
          ? 'Your feed has expired. Refresh for new recommendations.'
          : 'Could not load the feed. Please try again.'
    } finally {
      if (id === request.value) isLoading.value = false
    }
  }
  const refresh = () => load(true)
  if (options.autoLoad !== false) {
    watch(filter, () => {
      posts.value = []
      feed.value = null
      void refresh()
    })
    onMounted(() => {
      void refresh()
    })
    onBeforeUnmount(() => {
      request.value++
      isLoading.value = false
    })
  }
  return {
    posts,
    feed,
    filter,
    page,
    error,
    isLoading,
    refresh,
    hasMore: computed(() => feed.value?.hasMore ?? false),
    total: computed(() => feed.value?.total ?? 0),
    nextPage: () => {
      if (!isLoading.value && feed.value?.hasMore) return load(false)
    },
  }
}
