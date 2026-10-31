import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { Client } from 'pg'
import { expect, it, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createAuth } from '../../server/utils/auth'
import { completeGithubLogin } from '../helpers/github'

it('upgrades populated Auth.js tables without losing users, posts, or GitHub bindings', async () => {
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL must point to a disposable test database')
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  const schema = `migration_${randomUUID().replaceAll('-', '')}`
  const database = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }, { schema }),
  })
  await client.connect()
  try {
    await client.query(`CREATE SCHEMA "${schema}"`)
    await client.query(`SET search_path TO "${schema}"`)
    await client.query(
      await readFile('prisma/migrations/20261029000000_baseline/migration.sql', 'utf8'),
    )
    await client.query(
      `INSERT INTO users (id,github_id,email,username,display_name,avatar,updated_at) VALUES ('legacy','123','legacy@example.test','legacy','Legacy','https://example.test/avatar',NOW()), ('orphan','124','orphan@example.test','orphan','Orphan','https://example.test/avatar',NOW())`,
    )
    await client.query(
      `INSERT INTO accounts (id,user_id,type,provider,provider_account_id,access_token) VALUES ('account','legacy','oauth','github','123','obsolete')`,
    )
    await client.query(
      `INSERT INTO sessions (id,session_token,user_id,expires) VALUES ('session','obsolete','legacy',NOW() + INTERVAL '1 day')`,
    )
    await client.query(
      `INSERT INTO posts (id,content,author_id,updated_at) VALUES ('post','Preserve me','legacy',NOW())`,
    )
    await client.query(
      `INSERT INTO follows (id,follower_id,following_id) VALUES ('follow','legacy','orphan')`,
    )
    await client.query(
      `INSERT INTO reactions (id,user_id,post_id) VALUES ('reaction','orphan','post')`,
    )
    await client.query(
      `UPDATE users SET bio='Keep my custom profile', verified=true, is_restricted=true WHERE id='legacy'`,
    )
    await client.query(
      await readFile('prisma/migrations/20261029010000_better_auth/migration.sql', 'utf8'),
    )
    expect((await client.query('SELECT id FROM users')).rowCount).toBe(2)
    expect((await client.query('SELECT content FROM posts')).rows[0].content).toBe('Preserve me')
    expect((await client.query('SELECT * FROM sessions')).rowCount).toBe(0)
    const accounts = (
      await client.query(
        'SELECT user_id, provider_account_id, access_token FROM accounts ORDER BY user_id',
      )
    ).rows
    expect(accounts).toEqual([
      { user_id: 'legacy', provider_account_id: '123', access_token: null },
      { user_id: 'orphan', provider_account_id: '124', access_token: null },
    ])
    await client.query(
      await readFile('prisma/migrations/20261029020000_snapshot_owner/migration.sql', 'utf8'),
    )
    await client.query(
      await readFile('prisma/migrations/20261031000000_contributor_badge/migration.sql', 'utf8'),
    )
    expect(
      (await client.query("SELECT contributor_commit FROM users WHERE id='legacy'")).rows[0]
        .contributor_commit,
    ).toBeNull()
    await client.query(
      await readFile('prisma/migrations/20261031010000_badge_order/migration.sql', 'utf8'),
    )
    expect(
      (await client.query("SELECT badge_order FROM users WHERE id='legacy'")).rows[0].badge_order,
    ).toEqual([])
    const auth = createAuth(database)
    for (const [githubId, userId] of [
      [123, 'legacy'],
      [124, 'orphan'],
    ] as const) {
      // Changed/private emails must still reach the original migrated account.
      const { callback, cookie } = await completeGithubLogin(
        auth,
        githubId,
        `changed-${githubId}@example.test`,
      )
      expect(callback.status).toBe(302)
      expect(callback.headers.get('location')).toBe('/')
      const session = await auth.api.getSession({ headers: new Headers({ cookie }) })
      expect(session?.user.id).toBe(userId)
    }
    expect(await database.user.findUnique({ where: { id: 'legacy' } })).toMatchObject({
      username: 'legacy',
      displayName: 'Legacy',
      bio: 'Keep my custom profile',
      verified: true,
      isRestricted: true,
    })
    expect(await database.follow.count()).toBe(1)
    expect(await database.reaction.count()).toBe(1)
    expect(await database.post.findUnique({ where: { id: 'post' } })).toMatchObject({
      authorId: 'legacy',
      content: 'Preserve me',
    })
    const signup = await completeGithubLogin(auth, 125)
    expect(signup.callback.status).toBe(302)
    const newUser = await database.user.findUnique({ where: { githubId: '125' } })
    expect(newUser).toMatchObject({ role: 'USER', isActive: true })
    expect(newUser?.id).not.toBe('legacy')
    expect(await database.user.count()).toBe(3)
  } finally {
    vi.unstubAllGlobals()
    await database.$disconnect()
    await client.query('ROLLBACK')
    await client.query('SET search_path TO public')
    await client.query(`DROP SCHEMA "${schema}" CASCADE`)
    await client.end()
  }
})
