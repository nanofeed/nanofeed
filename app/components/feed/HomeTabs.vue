<!--
  app/components/feed/HomeTabs.vue
  Sticky tab bar for switching between Recommended and Following feeds.
-->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineProps<{
  activeTab: 'recommended' | 'following' | 'latest'
}>()

const emit = defineEmits<{
  'update:activeTab': [tab: 'recommended' | 'following' | 'latest']
}>()

// Mobile Scroll Logic: Hide on scroll down, show on scroll up
const isVisible = ref(true)
const lastScrollY = ref(0)
const scrollThreshold = 10 // Minimum scroll distance to trigger visibility change

const handleScroll = () => {
  if (typeof window === 'undefined') return

  const currentScrollY = window.scrollY
  const scrollDiff = Math.abs(currentScrollY - lastScrollY.value)

  // Show header if scrolling up significantly or at the very top
  if (currentScrollY <= 0) {
    isVisible.value = true
  } else if (scrollDiff > scrollThreshold) {
    if (currentScrollY > lastScrollY.value) {
      // Scrolling down
      isVisible.value = false
    } else {
      // Scrolling up
      isVisible.value = true
    }
    lastScrollY.value = currentScrollY
  }
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <nav class="home-tabs" :class="{ 'is-hidden': !isVisible }">
    <div class="tabs-container">
      <button
        v-for="tab in ['recommended', 'following', 'latest'] as const"
        :key="tab"
        class="tab-btn"
        :class="{ active: activeTab === tab }"
        :aria-pressed="activeTab === tab"
        @click="emit('update:activeTab', tab)"
      >
        <span class="text">{{
          tab === 'recommended' ? 'For you' : tab === 'following' ? 'Following' : 'Latest'
        }}</span>
        <span class="indicator" />
      </button>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.home-tabs {
  position: sticky;
  top: 53px; // Below main Navbar
  z-index: $z-sticky;
  background: rgba($color-bg, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba($color-border, 0.2);
  display: flex;
  align-items: center;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
  height: 50px;

  &.is-hidden {
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
  }
}

.tabs-container {
  flex: 1;
  display: flex;
  height: 100%;
}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  color: $color-text-muted;
  font-weight: $font-weight-medium;
  font-size: $font-size-md;
  cursor: pointer;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  @include hover-transition(all);

  &:hover {
    background: rgba($color-accent, 0.05);
    color: $color-text;
  }

  &.active {
    color: $color-text;
    font-weight: $font-weight-bold;

    .indicator {
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 56px;
      height: 4px;
      background-color: $color-accent;
      border-radius: $radius-full $radius-full 0 0;
      transform: translateX(-50%) translateY(2px);
      opacity: 0;
      transition:
        transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275),
        opacity 0.2s ease;
      box-shadow: 0 -2px 10px rgba($color-accent, 0.4);
    }
  }

  &.active .indicator {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.refresh-section {
  padding: 0 $space-4;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.refresh-icon-btn {
  background: none;
  border: none;
  color: $color-text-muted;
  cursor: pointer;
  width: 32px;
  height: 32px;
  @include flex-center;
  border-radius: 50%;
  @include hover-transition(all);

  &:hover {
    background: rgba($color-surface-2, 0.5);
    color: $color-accent;
  }

  &.is-spinning svg {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// Mobile adjust
@include max-sm {
  .home-tabs {
    top: 53px; // Still below navbar
  }
}
</style>
