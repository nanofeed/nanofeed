<!--
  app/components/layout/Navbar.vue
  NanoFeed — Mobile Top/Header Bar
-->
<script setup lang="ts">
import UiAvatar from '../ui/Avatar.vue'
import { useRouter } from 'vue-router'

import { onClickOutside } from '@vueuse/core'

interface Props {
  title?: string
  showBack?: boolean
}

withDefaults(defineProps<Props>(), {
  title: 'Home',
  showBack: false,
})

const { user, isAuthenticated, logout } = useNanoAuth()
const router = useRouter()
onMounted(() => {})

const onClickBack = () => {
  if (import.meta.client && window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

const showLogoutMenu = ref(false)
const logoutMenuRef = ref<HTMLElement | null>(null)
onClickOutside(logoutMenuRef, () => {
  showLogoutMenu.value = false
})

const handleLogout = async () => {
  showLogoutMenu.value = false
  await logout()
}
</script>

<template>
  <header class="nf-navbar">
    <div class="left">
      <!-- Back Button -->
      <button v-if="showBack" class="icon-btn" aria-label="Go back" @click="onClickBack">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>

      <!-- User Avatar Section (Mobile only) -->
      <div v-else-if="isAuthenticated && user" class="mobile-avatar-wrapper">
        <UiAvatar
          :src="user.avatar"
          :alt="user.username"
          size="sm"
          class="mobile-avatar"
          title="Account"
          @click="showLogoutMenu = !showLogoutMenu"
        />

        <!-- Logout Menu Dropdown -->
        <Transition name="slide-up">
          <div v-if="showLogoutMenu" ref="logoutMenuRef" class="logout-dropdown">
            <button class="logout-btn" @click="handleLogout">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout @{{ user.username }}
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Title -->
    <h1 class="title">{{ title }}</h1>

    <div class="right">
      <slot name="actions" />
    </div>
  </header>
</template>

<style lang="scss" scoped>
.nf-navbar {
  position: sticky;
  top: 0;
  z-index: $z-fixed;
  height: 53px;
  padding: 0 $space-4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba($color-bg, 0.85);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid $color-border-soft;

  // Visual consistency for 3 columns even if slots are empty
  .left,
  .right {
    display: flex;
    align-items: center;
    width: 60px;
    height: 100%;
  }

  .right {
    justify-content: flex-end;
    width: auto;
    min-width: 60px;
    gap: $space-3;
    flex-shrink: 0;
  }
  .title {
    font-size: $font-size-lg;
    font-weight: $font-weight-bold;
    margin: 0;
    @include truncate;
    flex: 1;
    text-align: center;
  }
}

.docs-link {
  font-size: $font-size-xs;
  text-decoration: none;
}

.navbar-search {
  flex: 1;
  margin: 0 $space-2;
  @include flex-center;
  max-width: 400px;
}

.icon-btn {
  @include flex-center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: $color-text;
  position: relative;
  @include hover-transition(background-color);

  &:hover {
    background-color: $color-surface-2;
  }

  &.notif-btn {
    margin-left: auto;
  }

  .badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background-color: $color-accent;
    color: white;
    font-size: 10px;
    font-weight: $font-weight-bold;
    padding: 2px 5px;
    border-radius: $radius-full;
    border: 2px solid $color-bg;
    line-height: 1;
  }
}

.mobile-avatar-wrapper {
  position: relative;
  display: none;

  @include max-sm {
    display: block;
  }
}

.mobile-avatar {
  cursor: pointer;
}

.logout-dropdown {
  position: absolute;
  top: calc(100% + $space-2);
  left: 0;
  background-color: $color-surface-2;
  border: 1px solid $color-border;
  border-radius: $radius-xl;
  box-shadow: $shadow-xl;
  padding: $space-2;
  z-index: $z-dropdown;
  min-width: 180px;

  .logout-btn {
    @include flex-center;
    justify-content: flex-start;
    gap: $space-2;
    width: 100%;
    padding: $space-2 $space-3;
    border-radius: $radius-md;
    color: $color-text;
    font-weight: $font-weight-bold;
    font-size: $font-size-xs;
    @include hover-transition(background-color);

    &:hover {
      background-color: rgba($color-danger, 0.1);
      color: $color-danger;
    }
  }
}

// On desktop, the title typically goes to the left rather than center
@include md {
  .title {
    text-align: left;
    margin-left: $space-4; // space from back button if present
  }

  .nf-navbar {
    justify-content: flex-start;
  }
}
</style>
