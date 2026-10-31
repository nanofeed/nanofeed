---
title: Getting started
description: Run NanoFeed locally and understand how existing and new users join your developer circle.
category: Start here
order: 10
---

# Getting started

NanoFeed is a developer social platform at [nanofeed.vercel.app](https://nanofeed.vercel.app/). The app uses Nuxt 4, Node 24, Better Auth, Prisma, and Neon PostgreSQL. These guides describe the implementation in this repository; production changes take effect after deployment.

Looking for everyday guidance? Read [Using NanoFeed](USING-NANOFEED.md) and [Account and privacy](ACCOUNT.md). The official source repository is [nanofeed/nanofeed](https://github.com/nanofeed/nanofeed).

## Join the platform

On the sign-in page, complete **I am human**, then choose **Continue with GitHub** and authorize the app. A successful first sign-in creates a profile. No invitation, password, or seed command is required. Your GitHub account needs an email available to the OAuth application. RootCap requires JavaScript, Web Workers, and HTTPS or localhost.

Returning users sign in with the same GitHub account. The migration preserves their original user ID, username, profile, content, follows, and moderation status. Everyone signs in again once after the Auth.js upgrade. GitHub usernames and email addresses can change; the account binding uses GitHub's numeric ID.

> If you already operate NanoFeed, follow [Migrate existing users](MIGRATION.md) before applying database changes. An empty database does not contain your existing users.

## Prepare your tools

Install Node 24 LTS and npm, then clone the repository:

```bash
git clone https://github.com/nanofeed/nanofeed.git
cd nanofeed
nvm use
cp .env.example .env
npm ci
```

If you do not use nvm, install Node 24 with your preferred version manager. Keep the committed npm lockfile.

## Connect your database and login

1. Follow [Neon database and environment](NEON.md) to create a separate development branch and set the pooled and direct connection strings.
2. Follow [GitHub sign-in](GITHUB-AUTH.md) to create a development OAuth App and generate the auth secret.
3. For a **new empty development database**, apply the migrations and start:

   ```bash
   npm run db:deploy
   npm run dev
   ```

4. Open [localhost:3000](http://localhost:3000) and sign in with GitHub. To become the owner, configure your numeric `OWNER_GITHUB_ID` before sign-in. No seed is necessary.

## Explore your feed

**For you** combines recent content, engagement, followed authors, and topic interests. Each recommendation explains why it was selected. **Following** contains followed authors' posts; **Latest** is chronological. See [Content recommendations](RECOMMENDATIONS.md) for the exact ranking and limits.

Your posts, replies, reactions, and follows help make the feed useful. Profile edits belong to NanoFeed and are retained when you sign in again.

## Verify and release

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Integration tests require a disposable PostgreSQL database and must never use production credentials. Follow [Build and deploy](DEPLOYMENT.md) for the full verification and production release procedure.

## Publish your own guides

This documentation is stored as ordinary Markdown in GitHub. Create a file in `docs/` with the frontmatter shown in [Writing with Markdown](WRITING.md). A deployment publishes it to `https://nanofeed.vercel.app/docs`.
