---
title: Troubleshooting
description: Resolve common sign-in, posting, local setup, documentation, and formatting problems.
category: Help
order: 90
---

# Troubleshooting

Use the steps for the problem you see. Report reproducible bugs in [nanofeed/nanofeed](https://github.com/nanofeed/nanofeed/issues), including the error text and relevant steps without secrets.

## I cannot sign in

Use the same GitHub account as before, and make sure it has an email available to the OAuth application. If the callback fails, an operator should compare the exact origin and `/api/auth/callback/github` URL in GitHub with `BETTER_AUTH_URL`. Development and production need separate OAuth Apps. Follow [GitHub sign-in](GITHUB-AUTH.md).

If verification cannot load or remains incomplete, enable JavaScript and Web Workers, use HTTPS or localhost, and reload. An operator should check `ROOTCAP_SECRET` and the RootCap endpoint logs. A completed proof expires after two minutes and may need to be repeated.

An account whose deletion grace period has expired cannot be restored through sign-in. See [Account and privacy](ACCOUNT.md).

## My contributor badge was not granted

Use a commit SHA or official repository commit link, and sign in with the GitHub account GitHub identifies as the author. The commit must be reachable from the official repository's default branch. A different author or an unmerged branch does not qualify. If the app reports expired authorization, sign out and sign in with GitHub again. For request-limit errors, wait before retrying; NanoFeed also limits claims to five attempts per account per minute. Operators should inspect the `[contributor verification]` server warning: it records the failure category, HTTP status, and credential availability without tokens or response bodies. Check outbound access to `api.github.com`, token validity, and GitHub service status. The server uses the account's stored unexpired GitHub OAuth token when the shared token is missing, or after the shared token receives HTTP 401, 403, or 429. With no available token, it uses an unauthenticated request. An unavailable provider still prevents new claims. Existing contributors must claim once; refresh the page to fetch current badges. See [Account and privacy](ACCOUNT.md).

## I cannot post or save my profile

Check that you are signed in, the post is nonempty and no longer than 280 characters, and no restriction banner is active. Profile usernames must be available and use 3–30 letters, numbers, or underscores. A bio can contain up to 160 characters. Read the form's error message before retrying.

Operators seeing **403** errors on writes should check that the browser origin matches `BETTER_AUTH_URL`. Keep the configured origin consistent, including scheme, hostname, and port.

## My feed looks empty or old

Try **Latest**, follow some people, or search for a topic. **Following** depends on whom you follow. Refresh an expired **For you** feed; recommendation snapshots last 30 minutes. Ranking details and limits are in [Content recommendations](RECOMMENDATIONS.md).

## Local installation or database commands fail

Use Node 24 and the committed npm lockfile. Check versions first:

```bash
node --version
npm --version
npm ci
```

Do not bypass dependency conflicts with forced installation. Include the install error in a bug report. Confirm `.env` was copied from `.env.example` and filled in. Use the pooled database URL for app traffic and direct URL for migrations, preserving Neon's TLS settings.

For a new empty development database:

```bash
npm run db:generate
npm run db:deploy
npm run dev
```

For an existing installation, follow [Migrate existing users](MIGRATION.md) before changing the database. Never reset a production database to fix a local setup error.

## My documentation change is missing

Every article needs valid YAML frontmatter and a unique Markdown filename. Use [Writing with Markdown](WRITING.md). Run the application locally, then open `/docs`. A live site needs a new deployment to publish changes. The build rejects broken links to other guides or their sections.

Search matches guide titles, summaries, and categories. If you cannot find a word from an article's body, browse its category in the sidebar.

## Formatting or copying a code example fails

Run the formatter locally before committing:

```bash
npm run format
npm run format:check
```

The formatter uses the project's Prettier configuration and ignores generated output, dependencies, database dumps, the npm lockfile, and migration SQL. Formatting does not replace linting or tests.

Code examples show their language above the block. Choose **Copy** to copy only its contents. If the browser denies clipboard access, select the code and copy it manually. Clipboard access depends on browser support and a secure context such as HTTPS or localhost.

## Ask for help

Include the page or command, the expected result, the actual result, and your Node/npm versions for local issues. For screenshots or logs, remove database URLs, OAuth secrets, cookies, email addresses, and tokens first. Use [the official repository](https://github.com/nanofeed/nanofeed) for issues and contributions.
