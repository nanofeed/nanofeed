<script setup lang="ts">
import DocsNavigation from '../components/docs/Navigation.vue'
const menu = ref<HTMLDetailsElement | null>(null)
const route = useRoute()
watch(
  () => route.path,
  () => {
    if (menu.value) menu.value.open = false
  },
)
</script>

<template>
  <div class="docs-shell">
    <a class="skip-link" href="#docs-main">Skip to content</a>
    <header class="docs-header">
      <NuxtLink to="/docs" class="docs-brand"
        ><span class="brand-mark">n<span>f</span></span
        ><strong>NanoFeed</strong><span class="brand-divider">/</span><span>Docs</span></NuxtLink
      >
      <nav aria-label="Site navigation">
        <a href="https://github.com/nanofeed/nanofeed">GitHub ↗</a
        ><NuxtLink to="/" class="back-to-feed"
          >Open feed <span aria-hidden="true">→</span></NuxtLink
        >
      </nav>
    </header>
    <div class="docs-frame">
      <aside class="docs-sidebar">
        <DocsNavigation />
        <div class="sidebar-note">
          Built for the developer circle.<br /><span>Read. Build. Share.</span>
        </div>
      </aside>
      <div class="docs-content-wrap">
        <details ref="menu" class="docs-mobile-menu">
          <summary>Browse guides</summary>
          <DocsNavigation />
        </details>
        <main id="docs-main" tabindex="-1"><slot /></main>
        <footer class="docs-footer">
          <span>NanoFeed documentation</span
          ><a href="https://github.com/nanofeed/nanofeed/tree/main/docs">Written in Markdown ↗</a>
        </footer>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.docs-shell {
  min-height: 100dvh;
  background: #0b0d12;
  color: #edf0f7;
  .skip-link {
    position: fixed;
    top: -60px;
    left: 16px;
    z-index: 1000;
    background: #edf0f7;
    color: #0b0d12;
    padding: 12px;
  }
  .skip-link:focus {
    top: 12px;
  }
  a:focus-visible,
  button:focus-visible,
  summary:focus-visible,
  input:focus-visible {
    outline: 2px solid #87bfff;
    outline-offset: 4px;
  }
  h1,
  h2,
  h3 {
    color: #edf0f7;
  }
}
.docs-header {
  height: 76px;
  border-bottom: 1px solid #242834;
  padding: 0 max(24px, calc((100vw - 1280px) / 2));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: #0b0d12;
  position: sticky;
  top: 0;
  z-index: 20;
  nav {
    display: flex;
    align-items: center;
    gap: 28px;
  }
  nav a {
    color: #a6acbc;
    text-decoration: none;
    font-size: 13px;
    white-space: nowrap;
  }
  nav .back-to-feed {
    color: #edf0f7;
    padding: 9px 14px;
    border: 1px solid #343a48;
    border-radius: 7px;
  }
}
.docs-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #a6acbc;
  text-decoration: none;
  font-size: 14px;
  strong {
    color: #edf0f7;
    font-size: 16px;
  }
  .brand-divider {
    color: #444b5c;
    margin: 0 4px;
  }
}
.brand-mark {
  background: #1b293d;
  color: #b3d4ff;
  border: 1px solid #344967;
  padding: 3px 7px;
  border-radius: 6px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -2px;
  span {
    color: #729ee3;
  }
}
.docs-frame {
  max-width: 1280px;
  margin: auto;
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
}
.docs-sidebar {
  border-right: 1px solid #242834;
  padding: 40px 20px 24px 0;
  position: sticky;
  top: 76px;
  height: calc(100dvh - 76px);
  overflow-y: auto;
}
.sidebar-note {
  border-top: 1px solid #242834;
  margin: 36px 10px 0;
  padding-top: 20px;
  font-size: 11px;
  line-height: 1.9;
  color: #8a93a5;
  span {
    color: #b6c0d3;
  }
}
.docs-content-wrap {
  min-width: 0;
}
#docs-main {
  padding: 48px 48px 64px;
  min-height: calc(100dvh - 155px);
}
.docs-mobile-menu {
  display: none;
}
.docs-footer {
  padding: 24px 48px;
  border-top: 1px solid #242834;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #969fb1;
  font-size: 12px;
  a {
    color: #a6acbc;
    text-decoration: none;
  }
}
.docs-eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #8bb9fb;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #8bb9fb;
  }
}
@media (max-width: 1328px) {
  .docs-frame {
    margin: 0 24px;
  }
}
@media (max-width: 960px) {
  .docs-frame {
    display: block;
    margin: 0;
  }
  .docs-sidebar {
    display: none;
  }
  .docs-mobile-menu {
    display: block;
    padding: 16px 24px;
    border-bottom: 1px solid #242834;
    summary {
      cursor: pointer;
      font-size: 13px;
      color: #bec8da;
    }
    .docs-navigation {
      margin-top: 20px;
    }
  }
  #docs-main {
    padding: 36px 24px 48px;
  }
  .docs-footer {
    padding: 24px;
  }
}
@media (max-width: 520px) {
  .docs-header {
    height: 64px;
    padding: 0 18px;
    gap: 10px;
    nav {
      gap: 10px;
    }
    nav > a:first-child {
      display: none;
    }
  }
  .docs-brand {
    gap: 8px;
    font-size: 12px;
    strong {
      font-size: 14px;
    }
    .brand-divider {
      margin: 0;
    }
  }
  .docs-header nav .back-to-feed {
    padding: 8px;
    font-size: 12px;
  }
  .docs-footer {
    flex-direction: column;
  }
}
</style>
