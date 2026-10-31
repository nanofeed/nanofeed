/**
 * prisma/seed.ts
 * NanoFeed — Database Seed Script
 *
 * Seeds the owner account using environment variables.
 * The owner is automatically assigned the OWNER role.
 *
 * Run: npm run db:seed
 */

import 'dotenv/config'
import { Role } from '@prisma/client'
import prisma from '../server/db/prisma'

async function main(): Promise<void> {
  console.log('🌱 Starting NanoFeed database seed...')

  const ownerGithubId = process.env.OWNER_GITHUB_ID?.trim()
  if (!ownerGithubId) {
    console.log('OWNER_GITHUB_ID is empty; no owner seeded.')
    return
  }
  if (!/^\d+$/.test(ownerGithubId)) throw new Error('OWNER_GITHUB_ID must be a numeric GitHub ID')
  const ownerUsername = process.env.OWNER_GITHUB_USERNAME?.trim() || `owner_${ownerGithubId}`

  // Upsert the owner account
  // Using upsert so re-running the seed doesn't create duplicates
  const owner = await prisma.user.upsert({
    where: { githubId: ownerGithubId },
    update: {
      role: Role.OWNER, // ensure role is always OWNER even if changed
    },
    create: {
      githubId: ownerGithubId,
      username: ownerUsername,
      displayName: ownerUsername,
      email: `${ownerUsername}@users.noreply.github.com`,
      avatar: `https://avatars.githubusercontent.com/u/${ownerGithubId}?v=4`,
      role: Role.OWNER,
      verified: true, // Owner is auto-verified
    },
  })

  // Bind the seeded identity to its immutable GitHub ID before first sign-in.
  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: 'github', accountId: ownerGithubId } },
    create: { providerId: 'github', accountId: ownerGithubId, userId: owner.id },
    update: {},
  })
  console.log(`✅ Owner account seeded:`)
  console.log(`   Username: @${owner.username}`)
  console.log(`   Role: ${owner.role}`)
  console.log(`   GitHub ID: ${owner.githubId}`)

  console.log('\n🗄️ Database seed complete!')
}

main()
  .then(() => {
    void prisma.$disconnect()
  })
  .catch((error: unknown) => {
    console.error('❌ Seed failed:', error)
    void prisma.$disconnect()
    process.exit(1)
  })
