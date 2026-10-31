<script setup lang="ts">
import { docs } from '#build/docs-content'
const groups = computed(() =>
  [...new Set(docs.map((article) => article.category))].map((category) => ({
    category,
    articles: docs.filter((article) => article.category === category),
  })),
)
</script>

<template>
  <nav aria-label="Documentation guides" class="docs-navigation">
    <NuxtLink to="/docs" class="docs-overview" exact-active-class="is-current">Overview</NuxtLink>
    <section v-for="group in groups" :key="group.category">
      <h2>{{ group.category }}</h2>
      <NuxtLink
        v-for="article in group.articles"
        :key="article.slug"
        :to="`/docs/${article.slug}`"
        exact-active-class="is-current"
        >{{ article.title }}</NuxtLink
      >
    </section>
  </nav>
</template>

<style scoped lang="scss">
.docs-navigation {
  display: grid;
  gap: 24px;
  section {
    display: grid;
    gap: 4px;
  }
  h2 {
    color: #949aab;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin: 0 10px 8px;
  }
  a {
    color: #a6acbc;
    font-size: 14px;
    padding: 9px 10px;
    border-radius: 6px;
    text-decoration: none;
    line-height: 1.4;
  }
  a:hover {
    background: #14171f;
    color: white;
  }
  a.is-current {
    color: #87bfff;
    background: #172335;
  }
}
</style>
