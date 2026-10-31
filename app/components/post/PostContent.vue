<script setup lang="ts">
import { renderContent } from '../../utils/hashtagParser'
import { splitPostContent } from '../../utils/postContent'
import CodeBlock from './CodeBlock.vue'
const props = defineProps<{ content: string }>()
const parts = computed(() => splitPostContent(props.content))
</script>
<template>
  <div>
    <template v-for="(part, index) in parts" :key="index">
      <CodeBlock v-if="part.type === 'code'" :code="part.content" :language="part.language" />
      <!-- renderContent escapes HTML before adding constrained links. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span v-else v-html="renderContent(part.content)" />
    </template>
  </div>
</template>
