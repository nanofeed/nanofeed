<!--
  app/pages/profile/[username].vue
  NanoFeed — Public User Profile Page
-->
<script setup lang="ts">
import Navbar from '../../components/layout/Navbar.vue'
import ProfileHeader from '../../components/profile/ProfileHeader.vue'
import RestrictionBanner from '../../components/layout/RestrictionBanner.vue'
import ProfilePosts from '../../components/profile/ProfilePosts.vue'
import PostComposer from '../../components/post/PostComposer.vue'
import type { PublicUser } from '#shared/types/user'

const route = useRoute()
const username = route.params.username as string

// Fetch profile data eagerly
const { data, status, error } = useFetch(`/api/users/${username}?byUsername=true`)

const { user } = useNanoAuth()
const { data: siteSettings } = useNuxtData<{ maintenanceEnabled: boolean }>('site-settings')
const maintenanceMode = computed(() => siteSettings.value?.maintenanceEnabled === true)
const isOwnProfile = computed(() => user.value?.username === username)

const profileUser = computed(() => (data.value as { data?: PublicUser })?.data ?? null)
const isLoading = computed(() => status.value === 'pending')

// Track post count emitted from the ProfilePosts component
const postCount = ref(0)
const onCountUpdate = (count: number) => {
  postCount.value = count
}

const postsList = ref<InstanceType<typeof ProfilePosts> | null>(null)
const refreshProfile = () => {
  if (postsList.value) {
    postsList.value.refresh()
  }
}

useSeoMeta({
  title: computed(() =>
    profileUser.value
      ? `${profileUser.value.displayName} (@${profileUser.value.username})`
      : 'Profile',
  ),
})
</script>

<template>
  <div class="page-profile">
    <Navbar :title="profileUser?.displayName || 'Profile'" show-back />

    <div v-if="isLoading && !profileUser" class="loading-state">
      <div class="spinner" />
    </div>

    <div v-else-if="error || !profileUser" class="error-state">
      <h2>User not found</h2>
      <p>The profile you're looking for doesn't exist.</p>
      <NuxtLink to="/">
        <UiButton variant="ghost">Return Home</UiButton>
      </NuxtLink>
    </div>

    <template v-else>
      <RestrictionBanner :user="profileUser" />
      <ProfileHeader
        :profile-user="profileUser"
        :post-count="postCount"
        :maintenance-mode="maintenanceMode"
      />
      <p v-if="maintenanceMode" class="profile-maintenance">
        Your posts and social activity will be available when maintenance ends.
      </p>

      <div v-if="isOwnProfile && !maintenanceMode" class="profile-composer-area">
        <PostComposer @posted="refreshProfile" />
      </div>

      <ProfilePosts
        v-if="!maintenanceMode"
        ref="postsList"
        :username="profileUser.username"
        @update:count="onCountUpdate"
      />
    </template>
  </div>
</template>

<style lang="scss" scoped>
.loading-state,
.error-state {
  @include flex-center;
  flex-direction: column;
  gap: $space-4;
  padding: $space-10;
  text-align: center;
  color: $color-text-muted;

  h2 {
    color: $color-text;
    margin: 0;
  }
}

.profile-maintenance {
  padding: $space-4;
  color: $color-text-muted;
}
.profile-composer-area {
  padding: $space-4;
  border-bottom: 8px solid $color-surface-2;
}

:deep(.profile-composer-area .nf-composer) {
  padding: 0;
  border-bottom: none;
}
</style>
