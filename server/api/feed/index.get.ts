import type { Prisma } from '@prisma/client'
import prisma from '../../db/prisma'
import { successResponse } from '../../utils/responses'
import { publicAuthorSelect, visibleFeedPost } from '../../utils/postVisibility'
import { positiveInteger } from '../../utils/pagination'
import { rankRecommendations } from '../../utils/recommendations'
import { cleanupExpiredSnapshots } from '../../utils/snapshotCleanup'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = positiveInteger(query.page, 1, 10000)
  const pageSize = positiveInteger(query.pageSize, 20, 50)
  const filter = String(query.filter ?? 'recommended')
  if (!['recommended', 'following', 'latest'].includes(filter))
    throw createError({ statusCode: 400, statusMessage: 'Unknown feed filter' })
  const userId: string | undefined = event.context.session?.user.id
  if (filter === 'following' && !userId)
    throw createError({ statusCode: 401, statusMessage: 'Sign in to see your following feed' })
  const skip = (page - 1) * pageSize
  const include = {
    author: { select: publicAuthorSelect },
    parent: { include: { author: { select: publicAuthorSelect } } },
    repostOf: {
      include: {
        author: { select: publicAuthorSelect },
        _count: { select: { replies: true, reactions: true, reposts: true } },
      },
    },
    hashtags: { select: { tag: true } },
    reactions: { where: { userId: userId || '' }, select: { userId: true } },
    _count: { select: { replies: true, reactions: true, reposts: true } },
  } satisfies Prisma.PostInclude
  let where: Prisma.PostWhereInput = { ...visibleFeedPost }
  let snapshot: string | null = null
  let entries: { id: string; reason: string }[] = []
  if (filter === 'recommended') {
    if (!userId && (page > 1 || query.snapshot)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Sign in to paginate recommendations, or choose Latest.',
      })
    }
    await cleanupExpiredSnapshots()
    if (query.snapshot) {
      const saved = await prisma.recommendationSnapshot.findUnique({
        where: { id: String(query.snapshot) },
      })
      if (!saved || saved.userId !== (userId || null) || saved.expiresAt <= new Date()) {
        throw createError({
          statusCode: 410,
          statusMessage: 'Feed expired. Refresh to see new recommendations.',
        })
      }
      entries = saved.posts as typeof entries
      snapshot = saved.id
    } else {
      if (page > 1)
        throw createError({
          statusCode: 400,
          statusMessage: 'A feed snapshot is required for pagination',
        })
      const since = new Date(Date.now() - 30 * 86400_000)
      const [candidates, follows, reactions, ownPosts] = await Promise.all([
        prisma.post.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          take: 500,
          select: {
            id: true,
            authorId: true,
            createdAt: true,
            hashtags: { select: { tag: true } },
            _count: { select: { reactions: true, replies: true, reposts: true } },
          },
        }),
        userId
          ? prisma.follow.findMany({
              where: { followerId: userId },
              take: 2000,
              select: { followingId: true },
            })
          : [],
        userId
          ? prisma.reaction.findMany({
              where: { userId, createdAt: { gte: since }, post: visibleFeedPost },
              orderBy: { createdAt: 'desc' },
              take: 100,
              select: { postId: true, post: { select: { hashtags: { select: { tag: true } } } } },
            })
          : [],
        userId
          ? prisma.post.findMany({
              where: { authorId: userId, createdAt: { gte: since }, ...visibleFeedPost },
              orderBy: { createdAt: 'desc' },
              take: 50,
              select: { hashtags: { select: { tag: true } } },
            })
          : [],
      ])
      const topics = new Map<string, number>()
      for (const post of [...ownPosts, ...reactions.map((reaction) => reaction.post)]) {
        for (const { tag } of post.hashtags)
          topics.set(tag, Math.min(3, (topics.get(tag) || 0) + 0.5))
      }
      entries = rankRecommendations(
        candidates,
        {
          userId,
          following: new Set(follows.map((follow) => follow.followingId)),
          topics,
          reacted: new Set(reactions.map((reaction) => reaction.postId)),
        },
        Date.now(),
      )
      if (userId) {
        const saved = await prisma.recommendationSnapshot.create({
          data: { userId, posts: entries, expiresAt: new Date(Date.now() + 30 * 60_000) },
        })
        snapshot = saved.id
      } else {
        entries = entries.slice(0, pageSize)
      }
    }
    where = { ...where, id: { in: entries.slice(skip, skip + pageSize).map((entry) => entry.id) } }
  } else if (filter === 'following') {
    where = {
      ...where,
      author: { ...visibleFeedPost.author, followers: { some: { followerId: userId } } },
    }
  }
  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include,
      ...(filter === 'recommended' ? {} : { skip, take: pageSize }),
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    }),
    filter === 'recommended' ? entries.length : prisma.post.count({ where }),
  ])
  const positions = new Map(entries.map((entry, index) => [entry.id, index]))
  if (filter === 'recommended') posts.sort((a, b) => positions.get(a.id)! - positions.get(b.id)!)
  return successResponse({
    posts: posts.map(({ reactions, ...post }) => ({
      ...post,
      hasReacted: reactions.length > 0,
      recommendationReason:
        filter === 'recommended' ? entries[positions.get(post.id)!]?.reason : undefined,
    })),
    total,
    page,
    pageSize,
    snapshot,
    hasMore: skip + pageSize < total,
  })
})
