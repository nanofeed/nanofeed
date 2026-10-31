export interface DocsArticle {
  slug: string
  filename: string
  title: string
  description: string
  category: string
  order: number
  published?: string
  readingMinutes: number
  html: string
  headings: { id: string; text: string; level: number }[]
  headingIds: string[]
}
