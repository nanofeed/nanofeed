---
title: GitHub sign-in
description: Create the right GitHub OAuth App and configure Better Auth for localhost and nanofeed.vercel.app.
category: Set up
order: 30
---

# GitHub sign-in

NanoFeed uses Better Auth's GitHub provider with a **GitHub OAuth App**. You do not need to create or install a GitHub App with repository permissions for this login flow.

## Create the production OAuth App

1. Sign in to the GitHub account that will own the OAuth application.
2. Open [Developer settings → OAuth Apps](https://github.com/settings/developers), then choose **New OAuth App**.
3. Enter an application name such as **NanoFeed**.
4. Set **Homepage URL** to `https://nanofeed.vercel.app/`.
5. Set **Authorization callback URL** to this exact value:

   ```text
   https://nanofeed.vercel.app/api/auth/callback/github
   ```

6. Register the application. Copy its **Client ID** into Vercel's Production `GITHUB_CLIENT_ID` variable.
7. Generate a **client secret**. Save it as Production `GITHUB_CLIENT_SECRET`; GitHub displays the secret only when generated. Never commit it.
8. Configure the remaining variables in [Neon database and environment](NEON.md), then deploy.

If you already have an OAuth App for NanoFeed, you may reuse it after verifying its callback and homepage. The old `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` environment names must become `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`. Better Auth's callback path is `/api/auth/callback/github`.

## Configure Better Auth's origin

```dotenv
BETTER_AUTH_URL="https://nanofeed.vercel.app"
NUXT_PUBLIC_APP_URL="https://nanofeed.vercel.app"
```

Use the exact HTTPS origin, without a trailing slash, path, query, or fragment. `BETTER_AUTH_SECRET` must be a private random value of at least 32 characters. Better Auth uses the configured origin to validate redirects and browser requests; do not disable these checks to fix a callback error.

## Create a development OAuth App

Create a second OAuth App so local development does not change the production callback:

| Setting                | Development                                      | Production                                             |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| Homepage URL           | `http://localhost:3000`                          | `https://nanofeed.vercel.app/`                         |
| Callback URL           | `http://localhost:3000/api/auth/callback/github` | `https://nanofeed.vercel.app/api/auth/callback/github` |
| Both app URL variables | `http://localhost:3000`                          | `https://nanofeed.vercel.app`                          |

Store development credentials in `.env`; use separate databases and secrets. A stable staging domain requires its own OAuth configuration. Temporary preview domains do not match the production callback.

## How existing and new users are recognized

The GitHub provider supplies an immutable numeric account ID. The migration binds existing NanoFeed users to that ID, retaining their original profile and relationships. Matching by email alone is disabled. Changed GitHub logins, private emails, or old NanoFeed fallback emails do not replace a correctly bound account.

New users are created automatically after GitHub verifies the OAuth flow and provides an email. The app requests `read:user` and `user:email`; if the public email is private, Better Auth reads the available GitHub email list. A usable GitHub email is required.

New usernames include a normalized GitHub login plus the numeric ID to avoid collisions. Users can edit their NanoFeed username and profile in Settings. Returning users keep those edits.

## Assign the owner

Find your numeric ID from `https://api.github.com/users/YOUR_USERNAME` and set `OWNER_GITHUB_ID` to the `id` value. Sign in with that GitHub account. The session creation hook grants the owner role; normal users cannot set their own role. No owner seed is needed.

## Verify after deployment

1. Open `https://nanofeed.vercel.app/auth/login`, complete **I am human**, and choose **Continue with GitHub**. The self-hosted challenge requires a separate `ROOTCAP_SECRET` of at least 32 characters.

2. Confirm the callback returns to `https://nanofeed.vercel.app/`.
3. With an existing account, verify the original username, posts, follows, and settings.
4. With a different GitHub account, verify that a new ordinary user can join and post.
5. Confirm owner controls appear only for the configured owner. Sign out and sign in again.

Local tests exercise actual Better Auth and PostgreSQL with simulated GitHub responses. They do not verify your real OAuth App settings; complete this check using your own provider configuration.

## Resolve login problems

- **Callback mismatch:** compare the exact GitHub callback, public URL, and `BETTER_AUTH_URL`.
- **Missing credentials:** set the new environment variable names and redeploy after saving Vercel environment changes.
- **Returning account missing:** check that the app is connected to the migrated original database and that `accounts.provider_account_id` matches `users.github_id`. Do not create duplicate users or enable email linking as a workaround.
- **Email unavailable:** check the user's GitHub email configuration and OAuth consent.
- **Expired account deletion:** the original 30-day grace period still applies; an expired deletion request cannot be reactivated by signing in.

References: [GitHub OAuth App creation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app), [Better Auth GitHub provider](https://www.better-auth.com/docs/authentication/github), [Better Auth Nuxt integration](https://www.better-auth.com/docs/integrations/nuxt).
