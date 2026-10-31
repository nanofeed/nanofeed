import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { APIError } from 'better-auth/api'
import prisma from '../db/prisma'

export const createAuth = (database = prisma) =>
  betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(database, { provider: 'postgresql', transaction: true }),
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        scope: ['read:user', 'user:email'],
        mapProfileToUser(profile) {
          const githubId = String(profile.id)
          return {
            githubId,
            // Include immutable ID to avoid collisions with renamed GitHub accounts.
            username: `${profile.login
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '_')
              .slice(0, 29 - githubId.length)}_${githubId}`,
            name: profile.name || profile.login,
            image: profile.avatar_url,
            role: githubId === process.env.OWNER_GITHUB_ID ? 'OWNER' : 'USER',
            verified: githubId === process.env.OWNER_GITHUB_ID,
          }
        },
      },
    },
    advanced: { disableOriginCheck: false, disableCSRFCheck: false },
    account: { accountLinking: { enabled: false } },
    user: {
      fields: { name: 'displayName', image: 'avatar' },
      additionalFields: {
        githubId: { type: 'string', required: true },
        username: { type: 'string', required: true },
        role: { type: 'string', defaultValue: 'USER', input: false },
        verified: { type: 'boolean', defaultValue: false, input: false },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60 },
    databaseHooks: {
      user: {
        create: {
          async before(user) {
            // GitHub identity is supplied only by the server-side provider mapper.
            const owner = user.githubId === process.env.OWNER_GITHUB_ID
            return { data: { ...user, role: owner ? 'OWNER' : 'USER', verified: owner } }
          },
        },
      },
      session: {
        create: {
          async before(session) {
            const user = await database.user.findUniqueOrThrow({ where: { id: session.userId } })
            // A late cron run must not extend the documented deletion grace period.
            if (
              user.deletionRequestedAt &&
              user.deletionRequestedAt.getTime() <= Date.now() - 30 * 86400_000
            ) {
              throw new APIError('FORBIDDEN', {
                message: 'The account deletion grace period has expired.',
              })
            }
            await database.user.update({
              where: { id: user.id },
              data: {
                isActive: true,
                deletionRequestedAt: null,
                ...(user.githubId === process.env.OWNER_GITHUB_ID
                  ? { role: 'OWNER' as const }
                  : {}),
              },
            })
            return { data: session }
          },
        },
      },
    },
  })

export const auth = createAuth()
