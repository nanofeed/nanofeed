<script setup lang="ts">
import { docs } from '#build/docs-content'
definePageMeta({ layout: 'docs' })
const query = ref('')
const filtered = computed(() =>
  docs.filter((article) =>
    `${article.title} ${article.description} ${article.category}`
      .toLowerCase()
      .includes(query.value.trim().toLowerCase()),
  ),
)
useSeoMeta({
  title: 'Documentation',
  description:
    'Learn to use NanoFeed, manage your account, run it locally, and contribute to the official project.',
})
const config = useRuntimeConfig()
useHead({ link: [{ rel: 'canonical', href: `${config.public.appUrl}/docs` }] })
</script>

<template>
  <div class="docs-home">
    <div class="docs-eyebrow">The NanoFeed handbook</div>
    <h1>A small feed.<br /><span>A solid foundation.</span></h1>
    <p class="home-intro">
      Everything you need to build your developer circle. From your first sign-in to a production
      deployment.
    </p>
    <div class="start-links">
      <NuxtLink to="/docs/using-nanofeed" class="docs-start"
        >Learn to use NanoFeed <span aria-hidden="true">→</span></NuxtLink
      ><NuxtLink to="/docs/getting-started" class="developer-start">Run locally →</NuxtLink>
    </div>
    <p class="official-repo">
      Official repository:
      <a href="https://github.com/nanofeed/nanofeed">github.com/nanofeed/nanofeed ↗</a>
    </p>
    <div class="docs-stack">
      <span>Nuxt 4</span><span>Better Auth</span><span>Neon Postgres</span><span>Node 24</span>
    </div>
    <section class="guide-section" aria-labelledby="guides-title">
      <div class="guides-toolbar">
        <h2 id="guides-title">Find your next step</h2>
        <label class="guide-search"
          ><span class="sr-only">Search documentation</span
          ><input v-model="query" type="search" placeholder="Search guides…"
        /></label>
      </div>
      <p class="results-count" aria-live="polite">
        {{ filtered.length }} {{ filtered.length === 1 ? 'guide' : 'guides' }}
      </p>
      <div class="guide-grid">
        <NuxtLink
          v-for="article in filtered"
          :key="article.slug"
          :to="`/docs/${article.slug}`"
          class="guide-card"
          ><div class="card-top">
            <span>{{ article.category }}</span
            ><span aria-hidden="true">↗</span>
          </div>
          <h3>{{ article.title }}</h3>
          <p>{{ article.description }}</p>
          <span class="card-read"
            >{{ article.readingMinutes }} min read <span aria-hidden="true">→</span></span
          ></NuxtLink
        >
      </div>
      <p v-if="!filtered.length" class="no-guides">
        No guides found. Try “GitHub”, “migration”, or “Markdown”.
      </p>
    </section>
    <div class="docs-writing">
      <span aria-hidden="true">✎</span>
      <div>
        <h2>Your knowledge, versioned.</h2>
        <p>
          Write guides and articles in Markdown. Review them on GitHub. Publish with your next
          deployment.
        </p>
        <NuxtLink to="/docs/writing">Learn how to publish →</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.docs-home {
  max-width: 880px;
  h1 {
    font-size: clamp(36px, 4vw, 56px);
    letter-spacing: -0.045em;
    line-height: 1.12;
    font-weight: 650;
    span {
      color: #9ba8c1;
    }
  }
}
.home-intro {
  font-size: 17px;
  color: #a6acbc;
  max-width: 510px;
  margin: 22px 0;
  line-height: 1.75;
}
.start-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
}
.developer-start {
  color: #b9d6ff;
  font-size: 14px;
  text-decoration: none;
}
.official-repo {
  margin: 20px 0;
  color: #a6acbc;
  font-size: 12px;
  overflow-wrap: anywhere;
  a {
    color: #b9d6ff;
  }
}
.docs-start {
  display: inline-flex;
  gap: 28px;
  align-items: center;
  background: #c1d8fc;
  color: #101b2c;
  padding: 12px 18px;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  &:hover {
    background: #dfebff;
  }
}
.docs-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 28px 0 44px;
  span {
    padding: 5px 9px;
    border: 1px solid #272e3c;
    border-radius: 4px;
    font-size: 11px;
    color: #a8b3c6;
  }
}
.guide-section {
  border-top: 1px solid #242834;
  padding-top: 28px;
}
.guides-toolbar {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  h2 {
    font-size: 18px;
    letter-spacing: -0.02em;
  }
}
.guide-search input {
  border: 1px solid #343a48;
  border-radius: 6px;
  padding: 9px 12px;
  font-size: 12px;
  background: #11151d;
  color: #edf0f7;
  width: 205px;
  &::placeholder {
    color: #939db1;
  }
}
.results-count {
  font-size: 11px;
  color: #929db2;
  margin: 14px 0;
}
.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.guide-card {
  padding: 22px;
  border: 1px solid #2a303d;
  border-radius: 10px;
  background: #10141c;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  transition:
    border-color 0.15s,
    background 0.15s;
  &:hover {
    border-color: #526f9c;
    background: #141d2a;
  }
  h3 {
    font-size: 16px;
    line-height: 1.4;
    margin: 18px 0 8px;
    font-weight: 600;
  }
  p {
    color: #9ea9bd;
    font-size: 13px;
    line-height: 1.75;
    margin-bottom: 20px;
  }
}
.card-top {
  display: flex;
  justify-content: space-between;
  color: #96b4df;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.card-read {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #9aa8c0;
}
.no-guides {
  padding: 24px 0;
  color: #a6acbc;
}
.docs-writing {
  display: flex;
  gap: 20px;
  padding: 26px;
  margin-top: 30px;
  background: #121b29;
  border: 1px solid #2a3c58;
  border-radius: 10px;
  > span {
    font-size: 28px;
    color: #a8c9ff;
  }
  h2 {
    font-size: 16px;
  }
  p {
    color: #a3b1c9;
    font-size: 13px;
    margin: 10px 0;
  }
  a {
    color: #adcdff;
    font-size: 12px;
    text-decoration: none;
  }
}
@media (max-width: 560px) {
  .guide-grid {
    grid-template-columns: 1fr;
  }
  .guides-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 16px;
  }
  .guide-search input {
    width: 100%;
  }
  .docs-writing {
    padding: 20px;
  }
}
</style>
