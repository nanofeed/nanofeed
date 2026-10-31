export default defineEventHandler((event) => {
  const user = event.context.session?.user
  if (!user) return null
  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role,
      verified: user.verified,
      isRestricted: user.isRestricted,
      restrictionNote: user.restrictionNote,
      deletionRequestedAt: user.deletionRequestedAt,
    },
  }
})
