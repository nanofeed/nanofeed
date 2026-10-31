import { describe, expect, it } from 'vitest'
import {
  rankRecommendations,
  type Candidate,
  type Interests,
} from '../../server/utils/recommendations'
import { positiveInteger } from '../../server/utils/pagination'
import { renderContent } from '../../app/utils/hashtagParser'

const now = Date.UTC(2026, 9, 29)
const candidate = (id: string, overrides: Partial<Candidate> = {}): Candidate => ({
  id,
  authorId: id,
  createdAt: new Date(now),
  hashtags: [],
  _count: { reactions: 0, replies: 0, reposts: 0 },
  ...overrides,
})
const interests = (overrides: Partial<Interests> = {}): Interests => ({
  following: new Set(),
  topics: new Map(),
  reacted: new Set(),
  ...overrides,
})

describe('recommendations', () => {
  it('gives newcomers a fresh community feed with stable ties', () => {
    const posts = [
      candidate('old', { createdAt: new Date(now - 7 * 86400_000) }),
      candidate('b'),
      candidate('a'),
    ]
    expect(rankRecommendations(posts, interests(), now).map((p) => p.id)).toEqual(['a', 'b', 'old'])
  })
  it('combines following and topic affinity, with explanations', () => {
    const posts = [
      candidate('generic'),
      candidate('topic', { hashtags: [{ tag: 'vue' }] }),
      candidate('followed'),
    ]
    const ranked = rankRecommendations(
      posts,
      interests({ topics: new Map([['vue', 3]]), following: new Set(['followed']) }),
      now,
    )
    expect(ranked.map((p) => p.id)).toEqual(['topic', 'followed', 'generic'])
    expect(ranked[0]?.reason).toContain('topics')
  })
  it('diversifies authors and demotes already loved posts', () => {
    const posts = [
      candidate('a', { authorId: 'same' }),
      candidate('b', { authorId: 'same' }),
      candidate('c'),
      candidate('d'),
    ]
    expect(
      rankRecommendations(posts, interests({ reacted: new Set(['d']) }), now).map((p) => p.id),
    ).toEqual(['a', 'c', 'b', 'd'])
  })
  it('caps engagement so an ancient viral post does not dominate', () => {
    const old = candidate('viral', {
      createdAt: new Date(now - 365 * 86400_000),
      _count: { reactions: 1e9, replies: 1e9, reposts: 1e9 },
    })
    expect(rankRecommendations([old, candidate('fresh')], interests(), now)[0]?.id).toBe('fresh')
  })
  it('does not mutate candidates and handles empty pools', () => {
    const posts = [candidate('b'), candidate('a')]
    rankRecommendations(posts, interests(), now)
    expect(posts.map((p) => p.id)).toEqual(['b', 'a'])
    expect(rankRecommendations([], interests(), now)).toEqual([])
  })
})

it('rejects fractional, infinite, array and negative pagination inputs', () => {
  for (const value of ['1.5', 'Infinity', -1, ['2', '3'], 'NaN'])
    expect(positiveInteger(value, 1, 50)).toBe(1)
  expect(positiveInteger('100', 1, 50)).toBe(50)
})
it('escapes markup while rendering hashtags and mentions', () => {
  const html = renderContent('<script>alert("x")</script> #vue @dev')
  expect(html).not.toContain('<script>')
  expect(html).toContain('href="/hashtags/vue"')
})
