<!--
  app/components/profile/ProfilePosts.vue
  NanoFeed — Feed renderer specifically for profile posts
-->
<script setup lang="ts">
import FeedList from '../feed/FeedList.vue'
import FeedPagination from '../feed/FeedPagination.vue'
import type { PostWithAuthor } from '#shared/types/post'

const props = defineProps<{
  username: string
}>()

const { isAuthenticated } = useNanoAuth()

const activeTab = ref<'posts' | 'replies'>('posts')

const page = ref(1)
const pageSize = ref(20)

// Instead of global useFeed, we use a custom useFetch for the profile
const { data, status, refresh } = useFetch('/api/posts', {
  query: computed(() => ({
    username: props.username,
    page: page.value,
    pageSize: pageSize.value,
    tab: activeTab.value,
  })),
  watch: [page, activeTab],
  lazy: true,
  server: false, // Don't block SSR for these tabs to make page load cleaner
})

const result = computed(() => (data.value as { data?: unknown })?.data ?? null)
const posts = computed(() => (result.value as { posts?: PostWithAuthor[] } | null)?.posts ?? [])
const hasMore = computed(() => (result.value as { hasMore?: boolean } | null)?.hasMore ?? false)
const isLoading = computed(() => status.value === 'pending' || status.value === 'idle')

const loadMore = () => {
  if (hasMore.value) page.value++
}

const setTab = (tab: 'posts' | 'replies') => {
  activeTab.value = tab
  page.value = 1
}

const onPostDeleted = async () => {
  page.value = 1 // Reset to page 1 on delete to avoid pagination offset issues
  await refresh()
}

// Emitting data upward so ProfileHeader can show accurate post count
const totalPosts = computed(() => (result.value as { total?: number })?.total ?? 0)
const emit = defineEmits<{
  'update:count': [count: number]
}>()

watch(
  totalPosts,
  (newCount) => {
    if (activeTab.value === 'posts') {
      emit('update:count', newCount)
    }
  },
  { immediate: true },
)

defineExpose({
  refresh: () => {
    page.value = 1
    return refresh()
  },
})
</script>

<template>
  <div class="nf-profile-posts">
    <div class="tab-header">
      <button class="tab-btn" :class="{ active: activeTab === 'posts' }" @click="setTab('posts')">
        Posts
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'replies' }"
        @click="setTab('replies')"
      >
        Replies
      </button>
    </div>

    <div v-if="!isAuthenticated" class="guest-gate">
      <div class="gate-content">
        <h2>Join NanoFeed to see @{{ username }}'s posts</h2>
        <p>
          This is where the magic happens. Sign in or create an account to view full profiles and
          join the conversation.
        </p>
        <div class="gate-actions">
          <NuxtLink to="/auth/login">
            <UiButton variant="primary" size="lg" block>Sign In</UiButton>
          </NuxtLink>
        </div>
      </div>
    </div>

    <template v-else>
      <FeedList
        :posts="posts"
        :loading="isLoading"
        :empty-message="
          activeTab === 'posts'
            ? 'This user hasn\'t posted anything yet.'
            : 'This user hasn\'t replied to any posts yet.'
        "
        @deleted="onPostDeleted"
      />

      <FeedPagination :has-more="hasMore" :loading="isLoading" @next="loadMore" />
    </template>
  </div>
</template>

<style lang="scss" scoped>
.nf-profile-posts {
  display: flex;
  flex-direction: column;
}

.tab-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba($color-surface, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba($color-border, 0.2);
  display: flex;
  margin-bottom: $space-4;
  padding: 0 $space-1;

  .tab-btn {
    flex: 1;
    padding: $space-4;
    font-size: $font-size-md;
    font-weight: $font-weight-medium;
    color: $color-text-muted;
    background: none;
    border: none;
    position: relative;
    cursor: pointer;
    overflow: hidden;
    @include hover-transition(all);

    &:hover {
      background-color: rgba($color-accent, 0.05);
      color: $color-text;
    }

    &.active {
      font-weight: $font-weight-bold;
      color: $color-text;
      background-color: rgba($color-accent, 0.02);

      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        width: 50px;
        height: 4px;
        background-color: $color-accent;
        border-radius: $radius-full $radius-full 0 0;
        transform: translateX(-50%);
        box-shadow: 0 -2px 10px rgba($color-accent, 0.4);
      }
    }
  }
}

.guest-gate {
  padding: $space-12 $space-6;
  text-align: center;
  max-width: 400px;
  margin: 0 auto;

  .gate-content {
    display: flex;
    flex-direction: column;
    gap: $space-4;

    h2 {
      font-size: $font-size-3xl;
      font-weight: $font-weight-black;
      color: $color-text;
      line-height: 1.1;
      margin: 0;
    }

    p {
      color: $color-text-muted;
      font-size: $font-size-base;
      line-height: 1.5;
      margin: 0;
    }

    .gate-actions {
      margin-top: $space-4;
    }
  }
}
</style>
