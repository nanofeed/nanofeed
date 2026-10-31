import { defineNuxtModule, addTemplate, updateTemplates } from '@nuxt/kit'
import { join, resolve } from 'node:path'
import { loadDocs } from '../build/docs'

export default defineNuxtModule({
  meta: { name: 'nanofeed-docs' },
  setup(_options, nuxt) {
    const directory = join(nuxt.options.rootDir, 'docs')
    addTemplate({
      filename: 'docs-content.ts',
      write: true,
      async getContents() {
        const articles = await loadDocs(directory)
        return `import type { DocsArticle } from ${JSON.stringify(join(nuxt.options.rootDir, 'shared/types/docs'))}\nexport const docs: DocsArticle[] = ${JSON.stringify(articles)}`
      },
    })
    // Nuxt's filesystem watcher takes directories, not glob patterns.
    nuxt.options.watch.push(directory)
    nuxt.hook('builder:watch', async (_event, path) => {
      if (resolve(nuxt.options.srcDir, path).startsWith(`${directory}/`)) {
        await updateTemplates({ filter: (template) => template.filename === 'docs-content.ts' })
      }
    })
  },
})
