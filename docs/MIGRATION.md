---
title: Migrate existing users
description: Move Auth.js accounts to Better Auth while keeping user IDs, profiles, posts, and GitHub identities.
category: Operations
order: 40
---

# Migrate existing users

This release replaces Auth.js with Better Auth using the existing PostgreSQL tables. It supports both returning users and new GitHub signups. The SQL migrations are committed; applying them to production is a release operation that must be rehearsed with your actual database.

## What changes and what stays

| Item                                                    | Migration behavior                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| User IDs, usernames, editable profiles                  | Retained                                                                               |
| Posts, replies, reactions, follows, notifications       | Retained                                                                               |
| Owner role, verification, restrictions                  | Retained; the configured owner can be promoted on sign-in                              |
| GitHub identity                                         | Bound using the immutable numeric GitHub ID                                            |
| Legacy users without an adapter account row             | A GitHub account binding is created from `users.github_id`                             |
| Existing sessions, verification tokens, provider tokens | Invalidated; users sign in again                                                       |
| Deactivation and deletion requests                      | Retained; signing in reactivates only within the original 30-day deletion grace period |
| New users                                               | Created automatically on their first GitHub sign-in                                    |

Do not replace the database with an empty Neon project, run seeds, or recreate user accounts. If moving from another PostgreSQL host, restore a full backup into Neon and verify all tables and counts before this runbook. If your database already uses Better Auth and has migration history, do not repeat the legacy baseline or expect another forced sign-out. Back up and rehearse pending migrations, inspect `npx prisma migrate status`, and apply them with `npm run db:deploy` using the direct database URL before starting the updated app.

## Rehearse before cutover

Install the PostgreSQL client tools (`psql`, `pg_dump`, and `pg_restore`) for database comparison and backup/restore work. Use a client version compatible with your PostgreSQL server. Keep backup files outside the repository and verify a restore before cutover.

1. Create a restorable production backup and a separate Neon branch or restored database for rehearsal.
2. Record the production app revision, database connection target, and counts of users, accounts, posts, follows, and reactions. Keep this operational record private.
3. Point a staging deployment at the rehearsal database. Use a stable staging origin and separate GitHub OAuth App.

4. Review these migrations in order:

   - `20261029000000_baseline`: the original schema before this upgrade.
   - `20261029010000_better_auth`: transactional authentication conversion and GitHub account backfill.
   - `20261029020000_snapshot_owner`: recommendation snapshot ownership and cleanup.
   - `20261030000000_site_settings` and `20261030100000_maintenance_countdown`: site controls and maintenance schedule.
   - `20261031000000_contributor_badge`: nullable stored contributor commit; existing users retain their accounts and need to claim the badge separately.
   - `20261031010000_badge_order`: adds a non-null `badge_order` array with an empty default; existing users keep their earned badges and receive the default display order until they save a preference.

5. Inspect the existing GitHub bindings before migration:

   ```sql
   SELECT u.id, u.github_id, a.provider_account_id
   FROM users u
   JOIN accounts a ON a.user_id = u.id
   WHERE a.provider = 'github'
     AND a.provider_account_id <> u.github_id;
   ```

   This must return zero rows. The migration refuses mismatched bindings. Investigate any discrepancy using the original GitHub identity; never repair it by email matching alone.

## Baseline an existing database

The original NanoFeed setup used `prisma db push` without committed migration history. Mark the baseline as applied **only after** verifying that its SQL describes your existing database. Use the direct connection URL for the target database.

To obtain a machine-readable comparison, create an empty disposable comparison database, apply only the baseline SQL with `psql`, then compare it with the existing database using the pinned Prisma CLI:

```bash
# These URLs are local shell variables. Use private values and never commit them.
# BASELINE_URL must identify a disposable EMPTY database, not production.
psql "$BASELINE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20261029000000_baseline/migration.sql
npx prisma db pull --url "$BASELINE_URL" --print > /tmp/nanofeed-baseline.prisma
npx prisma migrate diff --from-schema /tmp/nanofeed-baseline.prisma --to-config-datasource --exit-code
```

An empty schema diff and exit code 0 are expected; exit code 2 means drift and must stop the upgrade. The configured datasource uses `DIRECT_URL` from `prisma.config.ts`. Investigate differences and compare the baseline SQL, constraints, and indexes before continuing. If your deployment already has migration history, inspect it and reconcile the baseline explicitly.

For a verified matching existing database:

```bash
npx prisma migrate resolve --applied 20261029000000_baseline
npm run db:deploy
npx prisma migrate status
```

For a **new empty database**, use only `npm run db:deploy`; do not mark the baseline applied. The preceding comparison procedure is for the old schema, before the Better Auth migration has been applied.

## Switch production safely

1. Schedule a maintenance window and stop application writes and scheduled cleanup. Do not allow the old app to continue writing during the schema change.
2. Take the final backup and repeat the verified rehearsal steps against the actual production direct URL.
3. Confirm user and content counts match the pre-migration values, all users have the correct GitHub binding, old sessions are cleared, and Prisma reports all migrations applied.
4. Set production environment values:

   ```dotenv
   BETTER_AUTH_URL="https://nanofeed.vercel.app"
   NUXT_PUBLIC_APP_URL="https://nanofeed.vercel.app"
   ```

5. Replace `AUTH_SECRET`, `AUTH_GITHUB_ID`, and `AUTH_GITHUB_SECRET` with `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, and `GITHUB_CLIENT_SECRET`. Follow [GitHub sign-in](GITHUB-AUTH.md) for the callback `https://nanofeed.vercel.app/api/auth/callback/github` and [Neon setup](NEON.md) for the database URLs.

6. Configure a separate `ROOTCAP_SECRET` of at least 32 characters and the other runtime values in [Build and deploy](DEPLOYMENT.md), then deploy the new application against the migrated database. Restore traffic and the scheduled cleanup after the checks below pass.

## Verify returning and new users

- Sign in using an existing ordinary GitHub account. Confirm the original user ID and username, profile edits, posts, follows, and notifications.
- Confirm an account with a private GitHub email and an old fallback NanoFeed email still reaches the same migrated identity.
- Sign in using a GitHub account that never used NanoFeed. Confirm a new ordinary profile is created and can post, react, and follow.
- Confirm the owner can access moderation and ordinary users cannot.
- Test sign-out, a second sign-in, feed pagination, and post creation.
- Check Vercel and Neon logs for migration, connection, and callback errors.

All users need a fresh sign-in because old Auth.js sessions cannot be reused. Existing users do not need to register again. Deleted accounts beyond the grace period are intentionally unavailable, preserving the deletion policy.

## Roll back as a matched pair

If cutover fails, stop traffic and restore the verified database backup or pre-migration Neon branch **together with** the old application revision and its old environment names. Code rollback alone cannot undo this schema migration. Do not reset, drop, or seed the production database to recover.

## Automated coverage

The integration suite creates the original tables with legacy users, accounts, content, and relationships. It applies the actual migration SQL, tests GitHub sign-in using migrated bindings, checks account/profile continuity, and tests new-user signup. GitHub responses are simulated; PostgreSQL and Better Auth behavior are real. Follow [Build and deploy](DEPLOYMENT.md) for running the suite against a disposable database.
