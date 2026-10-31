import { expect, it } from 'vitest'
import { splitPostContent } from '../../app/utils/postContent'
import { renderContent } from '../../app/utils/hashtagParser'

it('separates fenced code from text without treating code as links', () => {
  const parts = splitPostContent('Hello #world\n```ts\nconst x = "#tag <script>"\n```\nDone')
  expect(parts).toEqual([
    { type: 'text', content: 'Hello #world\n' },
    { type: 'code', language: 'ts', content: 'const x = "#tag <script>"\n' },
    { type: 'text', content: '\nDone' },
  ])
  expect(renderContent('<script>')).toBe('&lt;script&gt;')
})

it('preserves incomplete fences and allows unknown language names', () => {
  expect(splitPostContent('```ts\nunclosed')).toEqual([
    { type: 'text', content: '```ts\nunclosed' },
  ])
  expect(splitPostContent('```c#\nhello\n```')).toEqual([
    { type: 'code', language: 'c#', content: 'hello\n' },
  ])
})
