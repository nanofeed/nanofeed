export interface Candidate {
  id: string
  authorId: string
  createdAt: Date
  hashtags: { tag: string }[]
  _count: { reactions: number; replies: number; reposts: number }
}
export interface Interests {
  userId?: string
  following: Set<string>
  topics: Map<string, number>
  reacted: Set<string>
}

/** Bounded, deterministic hybrid ranking. No third-party tracking or LLM calls. */
export function rankRecommendations<T extends Candidate>(
  posts: T[],
  interests: Interests,
  now: number,
) {
  const ranked = posts.map((post) => {
    const hours = Math.max(0, (now - post.createdAt.getTime()) / 3600_000)
    const freshness = 4 * Math.exp(-hours / 48)
    const engagement =
      Math.min(
        3,
        Math.log1p(post._count.reactions + post._count.replies * 2 + post._count.reposts * 2),
      ) / Math.pow(1 + hours / 24, 0.6)
    const topic = Math.min(
      3,
      post.hashtags.reduce((sum, { tag }) => sum + (interests.topics.get(tag) || 0), 0),
    )
    const following = interests.following.has(post.authorId) ? 2 : 0
    const penalty =
      (post.authorId === interests.userId ? 3 : 0) + (interests.reacted.has(post.id) ? 3 : 0)
    const reason =
      topic > 0
        ? 'Matches topics you engage with'
        : following
          ? 'From someone you follow'
          : engagement > 1
            ? 'Popular with developers'
            : 'Fresh from the community'
    return { post, score: freshness + engagement + topic + following - penalty, reason }
  })
  const result: { id: string; reason: string }[] = []
  const authors = new Map<string, number>()
  // Greedy diversity penalty keeps prolific authors from filling the feed.
  while (ranked.length) {
    ranked.sort(
      (a, b) =>
        b.score -
          (authors.get(b.post.authorId) || 0) * 2 -
          (a.score - (authors.get(a.post.authorId) || 0) * 2) ||
        b.post.createdAt.getTime() - a.post.createdAt.getTime() ||
        a.post.id.localeCompare(b.post.id),
    )
    const next = ranked.shift()!
    result.push({ id: next.post.id, reason: next.reason })
    authors.set(next.post.authorId, (authors.get(next.post.authorId) || 0) + 1)
  }
  return result
}
