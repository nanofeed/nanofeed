export const badgeLabels = {
  owner: 'Project Owner',
  verified: 'Verified Developer',
  contributor: 'Verified Contributor',
} as const

export type BadgeKind = keyof typeof badgeLabels

// Preserve the existing priority for accounts without a saved preference.
export function orderedBadges(user: {
  role?: string
  verified?: boolean
  contributorCommit?: string | null
  badgeOrder?: readonly string[] | null
}): BadgeKind[] {
  const earned: BadgeKind[] = []
  if (user.role === 'OWNER') earned.push('owner')
  if (user.verified) earned.push('verified')
  if (user.contributorCommit) earned.push('contributor')
  const preferred = (user.badgeOrder ?? []).filter((badge): badge is BadgeKind =>
    earned.includes(badge as BadgeKind),
  )
  return [...new Set([...preferred, ...earned])]
}
