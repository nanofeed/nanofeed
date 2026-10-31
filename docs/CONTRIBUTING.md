---
title: Contributing
description: Report bugs, suggest improvements, and prepare documentation or code changes for NanoFeed.
category: Contribute
order: 81
---

# Contributing

Contributions belong in [nanofeed/nanofeed](https://github.com/nanofeed/nanofeed), the official project repository. You can help by improving a guide, reporting a reproducible bug, or proposing a focused code change.

## Choose a useful change

Read the [Project roadmap](ROADMAP.md) for proposed areas to discuss. Search [existing issues](https://github.com/nanofeed/nanofeed/issues) and [pull requests](https://github.com/nanofeed/nanofeed/pulls) before starting. For a substantial behavior change, describe the problem and compatibility impact in an issue so maintainers can agree on the scope.

A useful bug report includes:

- The page or command involved and steps to reproduce the problem.
- What you expected and what actually happened.
- Relevant browser or Node/npm versions.
- A small example or redacted screenshot when it helps.

Remove secrets, session cookies, connection strings, and personal information before sharing logs or screenshots.

## Prepare your local copy

Use Node 24 and npm. Fork the official repository if you do not have branch access, clone your fork, and create a branch. Contributors with repository access can clone the official source directly:

```bash
git clone https://github.com/nanofeed/nanofeed.git
cd nanofeed
git switch -c docs/improve-a-guide
cp .env.example .env
npm ci
```

Follow [Getting started](GETTING-STARTED.md) for database and GitHub OAuth configuration before running the application. Use a separate development database. An existing installation requires the [migration runbook](MIGRATION.md) before applying schema changes.

## Find the relevant files

| Directory                              | Purpose                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| `app/pages/` and `app/components/`     | Application screens and interface components.                |
| `app/composables/`                     | Shared application state and interaction helpers.            |
| `server/api/`                          | HTTP API handlers.                                           |
| `server/utils/` and `server/services/` | Authentication, recommendation, and supporting server logic. |
| `prisma/`                              | Database schema, migrations, and seed tooling.               |
| `docs/`                                | Guides bundled into the documentation website.               |
| `build/docs.ts` and `modules/docs.ts`  | Markdown compilation and Nuxt docs generation.               |
| `tests/`                               | Unit tests and database/HTTP integration tests.              |

## How the application fits together

Nuxt pages and components provide the feed, profiles, settings, moderation dashboard, and documentation. Composables coordinate browser requests and shared state. Server API handlers validate requests and call the Prisma client; PostgreSQL stores users, posts, relationships, verification requests, notifications, site settings, and recommendation snapshots. Better Auth binds sessions to GitHub identities, while RootCap verifies new GitHub sign-ins.

The documentation build reads `docs/*.md` and validates guide links. GitHub Actions runs checks on pull requests; the separate manual production workflow runs CI before migration and deployment. Review [Build and deploy](DEPLOYMENT.md) and [Migrate existing users](MIGRATION.md) before changing operational procedures.

## Write and check the change

Keep the change focused and preserve existing user data, account identity, permissions, and content visibility rules. Explain any intended behavior change and update affected guides. Add a meaningful regression test when changing behavior.

For a Markdown contribution, use [Writing with Markdown](WRITING.md) for required frontmatter, links, language-labelled code fences, and local preview. The docs site automatically includes published guide files in navigation and search.

Run the repository checks before opening your pull request:

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

For integration checks, configure `DATABASE_URL` and `DIRECT_URL` for a **disposable test database**, apply migrations, and test the built server:

```bash
npm run db:deploy
npm run test:integration
NITRO_PRESET=vercel npm run build
```

Tests create and delete synthetic data. Never point them at production. See [Build and deploy](DEPLOYMENT.md) for environment requirements and release checks.

## Submit a pull request

Commit the relevant files and push your branch to your fork or the official repository if you have access. Open a pull request targeting `main` in [nanofeed/nanofeed](https://github.com/nanofeed/nanofeed/pulls).

Describe what changed, why it helps, how you verified it, and any limitations. Link the related issue if there is one. Wait for CI and maintainer review, then address feedback. After an authored commit reaches the official repository's default branch, a contributor can claim the Verified Contributor badge in Settings using that commit and the same GitHub account; see [Account and privacy](ACCOUNT.md).

Merging documentation publishes it with the next application deployment; it does not immediately update an already running release.
