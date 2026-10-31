export interface AppSession {
  user: {
    id: string
    email: string
    username: string
    displayName: string
    avatar: string
    role: 'USER' | 'OWNER'
    verified: boolean
    isRestricted: boolean
    restrictionNote: string | null
    deletionRequestedAt: string | null
  }
}
