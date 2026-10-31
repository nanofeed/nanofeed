import type { Prisma } from '@prisma/client'

export const visibleAuthor = {
  isActive: true,
  deletionRequestedAt: null,
} satisfies Prisma.UserWhereInput
export const visiblePost = { hidden: false, author: visibleAuthor } satisfies Prisma.PostWhereInput
// Prevent quotes/replies from republishing hidden or deactivated content.
export const visibleFeedPost = {
  ...visiblePost,
  AND: [
    { OR: [{ parentId: null }, { parent: { is: visiblePost } }] },
    { OR: [{ repostOfId: null }, { repostOf: { is: visiblePost } }] },
  ],
} satisfies Prisma.PostWhereInput

export const publicAuthorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  role: true,
  verified: true,
  badgeOrder: true,
  contributorCommit: true,
  isActive: true,
  deletionRequestedAt: true,
} satisfies Prisma.UserSelect
