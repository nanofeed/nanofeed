/**
 * shared/types/user.ts
 * NanoFeed — User Type Definitions
 */

import type { Role } from '../constants/roles'

/** Full user record (server-side only — includes sensitive fields) */
export interface User {
  id: string
  githubId: string
  username: string
  displayName: string
  email: string
  avatar: string
  bio: string | null
  role: Role
  badgeOrder?: string[]
  contributorCommit?: string | null
  verified: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

/** Public user profile (safe to expose to clients) */
export interface PublicUser {
  id: string
  username: string
  displayName: string
  avatar: string
  bio?: string | null
  role: Role
  badgeOrder?: string[]
  contributorCommit?: string | null
  verified: boolean
  createdAt?: Date | string
  _count?: {
    followers: number
    following: number
  }
  isFollowing?: boolean
  isRestricted?: boolean
  restrictionNote?: string | null
  isActive?: boolean
  deletionRequestedAt?: Date | string | null
}

/** Payload for updating user profile via PATCH /api/users/update */
export interface UpdateUserInput {
  displayName?: string
  username?: string
  avatar?: string
  bio?: string
}

/** Session user data returned by Better Auth */
export interface SessionUser {
  id: string
  username: string
  displayName: string
  avatar: string
  role: Role
  badgeOrder?: string[]
  contributorCommit?: string | null
  verified: boolean
  isRestricted: boolean
  restrictionNote: string | null
}
