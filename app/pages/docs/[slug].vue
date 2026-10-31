<script setup lang="ts">
import DocsContent from '../../components/docs/Content.vue'
import { docs } from '#build/docs-content'
definePageMeta({ layout: 'docs', key: (route) => route.path })
const route = useRoute()
const article = docs.find((item) => item.slug === route.params.slug)
if (!article) throw createError({ statusCode: 404, statusMessage: 'Guide not found' })
const index = docs.indexOf(article)
const previous = docs[index - 1]
const next = docs[index + 1]
const sourceUrl = `https://github.com/nanofeed/nanofeed/blob/main/docs/${article.filename}`
const config = useRuntimeConfig()
useSeoMeta({
  title: article.title,
  description: article.description,
  ogTitle: `${article.title} · NanoFeed`,
  ogDescription: article.description,
})
useHead({ link: [{ rel: 'canonical', href: `${config.public.appUrl}/docs/${article.slug}` }] })
</script>

<template>
  <div class="docs-article-grid">
    <article class="docs-article">
      <NuxtLink to="/docs" class="article-breadcrumb"
        >Documentation <span aria-hidden="true">/</span> {{ article.category }}</NuxtLink
      >
      <header class="article-header">
        <h1>{{ article.title }}</h1>
        <p>{{ article.description }}</p>
        <div class="article-meta">
          <span>{{ article.readingMinutes }} min read</span
          ><time v-if="article.published" :datetime="article.published">{{
            article.published
          }}</time
          ><a :href="sourceUrl">View Markdown ↗</a>
        </div>
      </header>
      <details v-if="article.headings.length" class="article-mobile-toc">
        <summary>On this page</summary>
        <nav aria-label="Article sections">
          <a v-for="heading in article.headings" :key="heading.id" :href="`#${heading.id}`">{{
            heading.text
          }}</a>
        </nav>
      </details>
      <DocsContent :html="article.html" />
      <nav class="article-pagination" aria-label="Previous and next guides">
        <NuxtLink v-if="previous" :to="`/docs/${previous.slug}`"
          ><small>← Previous</small><span>{{ previous.title }}</span></NuxtLink
        ><NuxtLink v-if="next" :to="`/docs/${next.slug}`" class="next-guide"
          ><small>Next →</small><span>{{ next.title }}</span></NuxtLink
        >
      </nav>
      <a
        :href="`https://github.com/nanofeed/nanofeed/edit/main/docs/${article.filename}`"
        class="edit-guide"
        >Improve this page on GitHub ↗</a
      >
    </article>
    <aside v-if="article.headings.length" class="article-toc">
      <h2>On this page</h2>
      <nav aria-label="Article sections">
        <a
          v-for="heading in article.headings"
          :key="heading.id"
          :href="`#${heading.id}`"
          :class="{ 'toc-subheading': heading.level === 3 }"
          >{{ heading.text }}</a
        >
      </nav>
    </aside>
  </div>
</template>

<style lang="scss">
.docs-article-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px;
  gap: 36px;
}
.docs-article {
  min-width: 0;
}
.article-breadcrumb {
  color: #9ba8bd;
  font-size: 12px;
  text-decoration: none;
  span {
    margin: 0 8px;
    color: #616c81;
  }
}
.article-header {
  margin: 26px 0 36px;
  h1 {
    font-size: clamp(28px, 3vw, 38px);
    letter-spacing: -0.035em;
    line-height: 1.2;
  }
  > p {
    font-size: 16px;
    color: #a6b1c5;
    line-height: 1.7;
    margin: 16px 0 22px;
  }
}
.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 11px;
  color: #9aa8bf;
  a {
    color: #a4c9ff;
    text-decoration: none;
  }
}
.article-toc {
  position: sticky;
  top: 116px;
  align-self: start;
  max-height: calc(100dvh - 140px);
  overflow-y: auto;
  h2 {
    font-size: 11px;
    margin-bottom: 16px;
    color: #b6bfd0;
  }
  nav {
    display: grid;
    gap: 12px;
  }
  a {
    color: #9da8bd;
    font-size: 11px;
    line-height: 1.5;
    text-decoration: none;
    &:hover {
      color: #b9d6ff;
    }
  }
  .toc-subheading {
    padding-left: 10px;
  }
}
.article-mobile-toc {
  display: none;
}
.docs-prose {
  font-size: 14px;
  line-height: 1.85;
  color: #c1cada;
  overflow-wrap: anywhere;
  h2,
  h3,
  h4,
  h5,
  h6 {
    scroll-margin-top: 110px;
    letter-spacing: -0.02em;
    margin: 34px 0 16px;
  }
  h2 {
    font-size: 22px;
    padding-top: 10px;
    border-top: 1px solid #252d3a;
  }
  h3 {
    font-size: 17px;
  }
  p {
    margin: 16px 0;
    color: #bac5d9;
    line-height: 1.85;
  }
  a {
    color: #a4c9ff;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  ul,
  ol {
    padding-left: 24px;
    margin: 16px 0;
    list-style: revert;
    li {
      margin: 8px 0;
    }
  }
  strong {
    color: #edf0f7;
  }
  .docs-code-block {
    min-width: 0;
    margin: 20px 0;
    border: 1px solid #2d394c;
    border-radius: 8px;
    overflow: hidden;
    background: #101722;
  }
  .code-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 9px 14px;
    border-bottom: 1px solid #2d394c;
    color: #b9c9df;
    font-family: $font-mono;
    font-size: 12px;
  }
  .copy-code {
    background: #1b2a40;
    border: 1px solid #435875;
    border-radius: 4px;
    padding: 4px 10px;
    color: #d3e4ff;
    cursor: pointer;
    font: inherit;
    &:hover {
      background: #283d59;
    }
    &:focus-visible {
      outline: 2px solid #a4c9ff;
      outline-offset: 3px;
    }
  }
  .docs-code-block pre {
    border: 0;
    border-radius: 0;
    margin: 0;
  }
  pre {
    max-width: 100%;
    overflow: auto;
    background: #101722;
    border: 1px solid #2d394c;
    padding: 18px;
    border-radius: 8px;
    margin: 20px 0;
    line-height: 1.8;
  }
  code {
    font-family: $font-mono;
    font-size: 0.88em;
    background: #192232;
    color: #c6ddff;
    padding: 2px 5px;
    border-radius: 4px;
  }
  pre code {
    padding: 0;
    background: transparent;
    border-radius: 0;
    white-space: pre;
    overflow-wrap: normal;
  }
  blockquote {
    margin: 24px 0;
    padding: 2px 18px;
    background: #131e2e;
    border-left: 3px solid #81adeb;
    border-radius: 0 7px 7px 0;
  }
  table {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 12px;
  }
  th,
  td {
    padding: 12px;
    border: 1px solid #303b4f;
    text-align: left;
  }
  th {
    color: #d7e3f8;
    background: #172132;
  }
  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
  }
  hr {
    border: 0;
    border-top: 1px solid #303b4f;
    margin: 32px 0;
  }
}
.article-pagination {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-top: 40px;
  a {
    flex: 1;
    border: 1px solid #303b4f;
    border-radius: 8px;
    padding: 14px;
    display: grid;
    gap: 8px;
    text-decoration: none;
    color: #d0def3;
    font-size: 13px;
  }
  small {
    color: #9baecb;
    font-size: 11px;
  }
  .next-guide {
    text-align: right;
  }
}
.edit-guide {
  display: inline-block;
  margin-top: 24px;
  font-size: 12px;
  color: #9fbbdf;
  text-decoration: none;
}
@media (max-width: 1180px) {
  .docs-article-grid {
    display: block;
  }
  .article-toc {
    display: none;
  }
  .article-mobile-toc {
    display: block;
    border: 1px solid #303b4f;
    border-radius: 7px;
    padding: 14px;
    margin-bottom: 28px;
    font-size: 12px;
    summary {
      cursor: pointer;
      color: #c1d8fb;
    }
    nav {
      display: grid;
      gap: 12px;
      margin-top: 16px;
    }
    a {
      color: #aebfd9;
      text-decoration: none;
    }
  }
}
</style>
