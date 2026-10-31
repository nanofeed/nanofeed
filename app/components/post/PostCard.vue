<!--
  app/components/post/PostCard.vue
  NanoFeed — Single Post Display
-->

<template>
  <article
    class="nf-post-card"
    :class="{
      'is-inside-repost': isInsideRepost,
      'has-parent': post.parent && !isInsideRepost,
    }"
    @click="navigateToPost"
  >
    <!-- Thread Connection (Inside a single card for context) -->
    <div v-if="post.parent && !isInsideRepost" class="threaded-parent">
      <div class="post-layout">
        <div class="post-left" @click.stop="router.push(`/profile/${post.parent.author.username}`)">
          <UiAvatar
            :src="post.parent.author.avatar"
            :alt="post.parent.author.username"
            size="md"
            class="author-avatar"
          />
          <div class="thread-line" />
        </div>
        <div class="post-right" @click.stop="router.push(`/post/${post.parent.id}`)">
          <header class="post-header">
            <span class="display-name">{{
              isUnavailable(post.parent?.author) ? 'User' : post.parent?.author.displayName
            }}</span>

            <!-- Badges for Parent -->
            <template v-if="!isUnavailable(post.parent?.author)">
              <VerificationBadge
                v-if="post.parent?.author"
                :is-owner="post.parent.author.role === 'OWNER'"
                :is-verified="post.parent.author.verified"
                :is-contributor="!!post.parent.author.contributorCommit"
                :badge-order="post.parent.author.badgeOrder"
              />
            </template>

            <span class="username"
              >@{{
                isUnavailable(post.parent?.author) ? 'user' : post.parent?.author.username
              }}</span
            >
            <span class="dot">·</span>
            <span class="timestamp">{{
              useTimeAgo(new Date(post.parent?.createdAt || Date.now())).value
            }}</span>
          </header>
          <div class="post-content">
            <span v-if="isUnavailable(post.parent?.author)">This post is no longer available</span>
            <PostContent v-else :content="post.parent?.content || ''" />
          </div>
        </div>
      </div>
    </div>

    <div class="post-layout main-post">
      <!-- Left Column: Avatar & Thread Line -->
      <div class="post-left" @click.stop="navigateToProfile">
        <!-- Offset for Repost Header -->
        <div v-if="post.repostOfId && !isInsideRepost" class="repost-spacer" />

        <UiAvatar
          :src="isUnavailable(post.author) ? '' : post.author.avatar"
          :alt="isUnavailable(post.author) ? 'User' : post.author.username"
          size="md"
          class="author-avatar"
        />
        <!-- Thread Line (Vertical connector for conversation) -->
        <div v-if="post.parentId && !isInsideRepost" class="thread-line top" />
      </div>

      <!-- Right Column: Content -->
      <div class="post-right">
        <!-- Repost Header -->
        <div v-if="post.repostOfId && !isInsideRepost" class="repost-header">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="repost-icon"
          >
            <path d="m17 2 4 4-4 4" />
            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
            <path d="m7 22-4-4 4-4" />
            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
          </svg>
          <span>{{ isSelf ? 'You' : post.author.displayName }} reposted</span>
        </div>

        <!-- Header -->
        <header class="post-header" @click.stop="navigateToProfile">
          <span class="display-name">{{
            isUnavailable(post.author) ? 'User' : post.author.displayName
          }}</span>

          <!-- Badges -->
          <template v-if="!isUnavailable(post.author)">
            <VerificationBadge
              :is-owner="post.author.role === 'OWNER'"
              :is-verified="post.author.verified"
              :is-contributor="!!post.author.contributorCommit"
              :badge-order="post.author.badgeOrder"
            />
          </template>

          <span class="username"
            >@{{ isUnavailable(post.author) ? 'user' : post.author.username }}</span
          >
          <span class="dot">·</span>
          <time
            :datetime="dateObj.toISOString()"
            :title="dateObj.toLocaleString()"
            class="timestamp"
          >
            {{ shortTime }}
          </time>
        </header>

        <!-- Reply Indicator -->
        <div v-if="post.parentId && !isInsideRepost" class="reply-indicator">
          <span>Replying to </span>
          <span
            class="reply-to"
            @click.stop="
              !isUnavailable(post.parent?.author) &&
              router.push(`/profile/${post.parent?.author.username || ''}`)
            "
          >
            @{{ isUnavailable(post.parent?.author) ? 'user' : post.parent?.author.username || '' }}
          </span>
        </div>

        <!-- Body / Content -->
        <div v-if="!post.repostOf" class="post-content">
          <template v-if="isUnavailable(post.author)">
            <span class="unavailable-text">This post is no longer available</span>
          </template>
          <template v-else>
            <PostContent :content="post.content" />
          </template>
        </div>

        <!-- Reposted Content -->
        <div v-if="post.repostOf" class="reposted-content-wrapper">
          <PostCard :post="post.repostOf" :is-inside-repost="true" />
        </div>

        <!-- Footer / Actions -->
        <PostActions v-if="!isInsideRepost" :post="post" @deleted="emit('deleted', $event)" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import UiAvatar from '../ui/Avatar.vue'
import VerificationBadge from '../profile/VerificationBadge.vue'
import PostActions from './PostActions.vue'
import type { PostWithAuthor } from '#shared/types/post'
import PostContent from './PostContent.vue'
import { useTimeAgo } from '@vueuse/core'

const props = withDefaults(
  defineProps<{
    post: PostWithAuthor
    isInsideRepost?: boolean
  }>(),
  {
    isInsideRepost: false,
  },
)

const emit = defineEmits<{
  deleted: [postId: string]
}>()

const router = useRouter()
const { user: currentUser } = useNanoAuth()
const isSelf = computed(() => currentUser.value?.id === props.post.authorId)

// Format timestamp relatively (e.g., "2m", "1h")
const dateObj = new Date(props.post.createdAt)
const timeAgo = useTimeAgo(dateObj)

// Shorthand for X-style time strings
const shortTime = computed(() => {
  const str = timeAgo.value
  if (str === 'just now') return 'now'
  return str
    .replace(' seconds ago', 's')
    .replace(' minutes ago', 'm')
    .replace(' hours ago', 'h')
    .replace(' days ago', 'd')
    .replace(' months ago', 'mo')
    .replace(' years ago', 'y')
})

const isUnavailable = (user?: {
  isActive?: boolean
  deletionRequestedAt?: Date | string | null
}) => {
  if (!user) return false
  // Use explicit false/null checks to handle cases where the API didn't return these fields (undefined)
  return (
    user.isActive === false ||
    (user.deletionRequestedAt !== undefined && user.deletionRequestedAt !== null)
  )
}

const navigateToPost = () => {
  if (props.isInsideRepost || isUnavailable(props.post.author)) return
  router.push(`/post/${props.post.id}`)
}

const navigateToProfile = () => {
  if (isUnavailable(props.post.author)) return
  router.push(`/profile/${props.post.author.username}`)
}
</script>

<style lang="scss">
// Note: Not completely scoped here so the v-html .hashtag styles applied from utils work correctly
// if we didn't inject them globally (we did in main.scss, but this ensures safety).
.nf-post-card {
  display: flex;
  flex-direction: column;
  padding: $space-5;
  border: 1px solid rgba($color-border, 0.3);
  background: rgba($color-surface, 0.4);
  backdrop-filter: blur(10px);
  border-radius: $radius-xl;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  @include hover-transition(all);

  &:hover {
    background-color: rgba($color-surface-2, 0.6);
    border-color: rgba($color-accent, 0.3);
    transform: translateY(-2px);
    box-shadow: $shadow-md;
    z-index: 5;
  }

  &.is-inside-repost {
    margin-top: $space-3;
    border: 1px solid rgba($color-border, 0.4);
    background: rgba(255, 255, 255, 0.03);
    padding: $space-3;
    border-radius: $radius-lg;
    pointer-events: none;
    box-shadow: none;
    transform: none !important;

    .post-header {
      .display-name {
        font-size: $font-size-sm;
      }
      .username,
      .timestamp {
        font-size: $font-size-xs;
      }
    }

    .post-content {
      font-size: $font-size-sm;
    }

    .post-actions {
      display: none;
    }

    .post-left {
      .author-avatar {
        width: 24px;
        height: 24px;
      }
    }
  }
}

.repost-spacer {
  height: 20px;
}

.repost-header {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: $font-size-xs;
  color: $color-text-muted;
  font-weight: $font-weight-bold;
  margin-bottom: $space-1;
  line-height: 1;

  .repost-icon {
    color: inherit;
    margin-top: -1px;
  }
}

.post-layout {
  display: flex;
  gap: $space-3;
  width: 100%;

  &.main-post {
    margin-top: $space-2; // Space between parent and child inside card
  }
}

.post-left {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 40px;

  .author-avatar {
    cursor: pointer;
    z-index: 2;
    @include hover-transition(opacity);

    &:hover {
      opacity: 0.8;
    }
  }

  .thread-line {
    position: absolute;
    top: 40px;
    bottom: -24px; // Reaches down towards the child avatar area
    width: 2px;
    background-color: rgba($color-border, 0.3); // More subtle
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
    pointer-events: none;

    &.top {
      top: -24px; // Connects from the bottom of parent area
      bottom: auto;
      height: 28px;
    }
  }
}

.threaded-parent {
  opacity: 0.9;
  @include hover-transition(opacity);

  &:hover {
    opacity: 1;
  }

  .post-layout {
    margin-bottom: $space-1;
  }

  .post-content {
    font-size: $font-size-md;
    color: $color-text-muted;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.post-right {
  flex: 1;
  min-width: 0;
}

.post-header {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  margin-bottom: 2px;
  cursor: pointer;

  .display-name {
    font-weight: $font-weight-bold;
    color: $color-text;
    @include truncate;

    &:hover {
      text-decoration: underline;
    }
  }

  .username,
  .timestamp,
  .dot {
    color: $color-text-muted;
    font-size: $font-size-sm;
    @include truncate;
  }

  .dot {
    flex-shrink: 0;
  }

  .timestamp {
    flex-shrink: 0;

    &:hover {
      text-decoration: underline;
    }
  }
}

.reply-indicator {
  font-size: $font-size-sm;
  color: $color-text-muted;
  margin-top: -$space-1;
  margin-bottom: $space-2;

  .reply-to {
    color: $color-accent;
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
}

.post-content {
  font-size: $font-size-base;
  line-height: 1.5;
  color: $color-text;
  word-wrap: break-word;
  padding-right: $space-2;

  // Preserve whitespace/newlines
  white-space: pre-wrap;

  .unavailable-text {
    font-style: italic;
    color: $color-text-muted;
    opacity: 0.8;
  }
}

.reposted-content-wrapper {
  margin-top: $space-2;
  margin-right: $space-2;
}
</style>
