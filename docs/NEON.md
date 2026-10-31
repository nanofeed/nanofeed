---
title: Neon database and environment
description: Connect Better Auth and Prisma to Neon, configure environment variables, and keep existing data.
category: Set up
order: 20
---

# Neon database and environment

Better Auth runs inside NanoFeed. Neon supplies PostgreSQL for authentication and platform data. You do not need to enable Neon's managed Auth product, create a second user store, or seed example users.

## Preserve your current database

If production already has users, keep that database or restore a complete verified backup into Neon before upgrading. Copying only the connection string to a new empty project will not migrate any data. Read [Migrate existing users](MIGRATION.md) first.

For a new installation, create an empty Neon project in a region near the Vercel application. Use separate Neon branches/databases for local development, disposable tests, staging, and production. Never point automated tests at production.

## Get both connection strings

Open your project's **Connect** dialog and choose the correct branch, database, and database role.

- Enable connection pooling. Copy the connection string with a `-pooler` hostname into `DATABASE_URL` for application traffic.
- Disable pooling. Copy that direct connection string into `DIRECT_URL` for Prisma migrations.
- Keep Neon's TLS parameters, including `sslmode=require`. Use the exact strings from the console; URL-encode special characters if assembling a password manually.

```dotenv
# Examples only. Replace the placeholders with values from your Neon console.
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.neon.tech/neondb?sslmode=require"
```

The Prisma PostgreSQL adapter limits each application instance to five pooled connections. The direct URL is used by `prisma.config.ts` for migration commands; it falls back to `DATABASE_URL` locally.

## Configure local authentication

Copy `.env.example` to `.env`. Set the database URLs above and these values:

```dotenv
BETTER_AUTH_URL="http://localhost:3000"
NUXT_PUBLIC_APP_URL="http://localhost:3000"
GITHUB_CLIENT_ID="YOUR_LOCAL_OAUTH_CLIENT_ID"
GITHUB_CLIENT_SECRET="YOUR_LOCAL_OAUTH_CLIENT_SECRET"
BETTER_AUTH_SECRET="YOUR_GENERATED_AUTH_SECRET"
ROOTCAP_SECRET="YOUR_SEPARATELY_GENERATED_ROOTCAP_SECRET"
CRON_SECRET="YOUR_SEPARATELY_GENERATED_CRON_SECRET"
# Optional: your numeric GitHub ID, not your username.
OWNER_GITHUB_ID=""
```

Generate **each** secret separately with `openssl rand -base64 32`. The Better Auth secret must contain at least 32 characters. Keep `.env` private; it is ignored by Git. [GitHub sign-in](GITHUB-AUTH.md) explains where the OAuth credentials come from.

## Create an empty database schema

Only on a **new empty database**:

```bash
npm ci
npm run db:deploy
```

This applies all committed migrations. Do not run `db:seed`: accounts are created on GitHub sign-in. Do not use `db:push` or `migrate dev` on production. Existing installations use the [migration runbook](MIGRATION.md) instead.

## Configure Vercel production

In the NanoFeed Vercel project, add these values to the **Production** environment:

| Variable               | Production value                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Production Neon pooled connection string                                               |
| `DIRECT_URL`           | Production Neon direct connection string, if performing migrations in that environment |
| `BETTER_AUTH_URL`      | `https://nanofeed.vercel.app`                                                          |
| `NUXT_PUBLIC_APP_URL`  | `https://nanofeed.vercel.app`                                                          |
| `GITHUB_CLIENT_ID`     | Production OAuth App client ID                                                         |
| `GITHUB_CLIENT_SECRET` | Production OAuth App secret                                                            |
| `BETTER_AUTH_SECRET`   | A new production auth secret of at least 32 characters                                 |
| `ROOTCAP_SECRET`       | An independent production RootCap secret of at least 32 characters                     |
| `CRON_SECRET`          | An independent production cron secret                                                  |
| `OWNER_GITHUB_ID`      | Optional numeric owner GitHub ID                                                       |

Use no trailing slash in the two app URLs. Only `NUXT_PUBLIC_APP_URL` is public. Database passwords, OAuth secrets, and the auth secret must never use a `NUXT_PUBLIC_` variable name or appear in Markdown.

Set separate values for Preview and Development. Production GitHub credentials must use the stable production domain; previews need their own branch/database and stable staging OAuth callback.

## Apply updates and monitor

Create future migrations against a development database with `npm run db:migrate -- --name descriptive_name`, review the SQL, and commit it. Release with `npm run db:deploy` and the direct production URL after backup and rehearsal. [Build and deploy](DEPLOYMENT.md) explains the protected GitHub Actions workflow.

Monitor Neon connections, storage, query failures, and Vercel function errors. Retain a tested restore procedure. See [Neon with Prisma](https://neon.com/docs/guides/prisma) and [Prisma baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining) for provider details.
