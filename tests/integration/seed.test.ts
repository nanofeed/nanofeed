import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterAll, expect, it } from 'vitest'
import prisma from '../../server/db/prisma'

const run = promisify(execFile)
const githubId = `${Date.now()}${Math.floor(Math.random() * 100000)}`
const seed = (ownerId: string, databaseUrl = process.env.DATABASE_URL) =>
  run(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      OWNER_GITHUB_ID: ownerId,
      OWNER_GITHUB_USERNAME: '',
    },
    timeout: 15_000,
  })
afterAll(async () => {
  await prisma.user.deleteMany({ where: { githubId } })
  await prisma.$disconnect()
})

it('skips optional empty owner settings without connecting to a database', async () => {
  const result = await seed('', 'postgresql://localhost:1/unreachable')
  expect(result.stdout).toContain('no owner seeded')
})
it('rejects a nonnumeric GitHub ID before seeding', async () => {
  await expect(seed('username', 'postgresql://localhost:1/unreachable')).rejects.toMatchObject({
    code: 1,
  })
})
it('derives an optional owner username and keeps the immutable binding when rerun', async () => {
  if (!process.env.DATABASE_URL) throw new Error('Use a disposable test DATABASE_URL')
  await seed(githubId)
  const owner = await prisma.user.findUniqueOrThrow({ where: { githubId } })
  expect(owner).toMatchObject({ username: `owner_${githubId}`, role: 'OWNER', verified: true })
  expect(
    await prisma.account.findUnique({
      where: { providerId_accountId: { providerId: 'github', accountId: githubId } },
    }),
  ).toMatchObject({ userId: owner.id })
  await seed(githubId)
  expect((await prisma.user.findUniqueOrThrow({ where: { githubId } })).id).toBe(owner.id)
})
