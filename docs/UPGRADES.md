---
title: Upgrade notes
description: Runtime and dependency changes, compatibility decisions, and the fixes included in this release.
category: Platform
order: 70
---

# Upgrade notes (2026-10-29)

- Node is constrained to **24.x LTS**. Direct dependencies are pinned to stable registry versions in `package.json` and the npm lockfile. Most npm packages do not publish LTS channels.
- Nuxt 4.6.3, Vue 3.5.44, Vue Router 5.4.0, Better Auth 1.7.14, Prisma/adapter/client 7.10.1, VueUse 15, and current stable lint/test/build tooling replace the previous versions.
- **Compatibility exception:** TypeScript 7.0.2 is stable but cannot run current `vue-tsc` 3.3.13 (`typescript/lib/tsc` is not exported), and Nuxt's lint parser also fails against it. TypeScript **6.0.3**, the latest compatible stable line, is pinned. Upgrade when the Vue/Nuxt toolchain supports TS 7.
- Prisma's `latest` tag pointed to 8.0.0-rc.28 during this upgrade; a release candidate is not a stable production release. Prisma 7.10.1 is also supported by Better Auth's peer range.
- **DevTools compatibility exception:** Nuxt 4.6.3 declares DevTools `^3.4.4`. DevTools **3.4.4** is pinned to that supported line. The separately installed 4.0.0 release pulled a prerelease Vue plugin whose `@vitejs/devtools` peer range conflicts with its host. Revisit DevTools 4 after Nuxt adopts it and the upstream peer ranges agree; do not use `--force` or legacy peer resolution.
- A scoped npm override upgrades `archiver-utils@5.0.2` from deprecated `glob` 10 to **14.0.3**. Its CommonJS `glob.sync` consumer is covered by a file-expansion compatibility test (exclusions, dotfiles, directories, and mappings). Archiver remains on Nitro's supported 7.x: Archiver 8 removes the default factory Nitro uses. Remove the override once Nitro's dependency chain adopts supported glob versions.
- `allowScripts` explicitly permits the pinned Prisma, esbuild, Parcel watcher, and resolver install hooks needed by the toolchain on current npm 11. Review `npm install-scripts ls` after dependency upgrades, inspect changed scripts, then update only those version-specific entries with `npm install-scripts approve <package>@<version>`. Do not approve all future versions.
- The optional Vercel CLI was omitted to avoid its unnecessary vulnerable dependency tree; CD uses the official REST API.
- The audit currently reports a **low-severity upstream `deepmerge` prototype-poisoning advisory** (GHSA-gcqx-w48m-w2h4) through Nuxt/Nitro build tooling. [The advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) has no patched release, and version 4.3.1 is still the latest published version. CI rejects moderate/high/critical advisories; it does not claim the dependency tree has zero advisories. Track the upstream fix and rerun the audit before releases.

- Auth.js packages, their Nuxt module, and obsolete type augmentations were removed. The migration invalidates old sessions and keeps immutable GitHub bindings. See the cutover instructions before applying it.
- The current install uses `patch-package` to adapt `eslint-plugin-import-x` 4.17.1 to `minimatch` 11 while preserving its import rule. Scoped overrides also update affected `glob` and `minimatch` consumers. `npm ci` applies the patch before Prisma and Nuxt preparation. See `patches/README.md` and remove the patch only after a compatible upstream release and validation.

- Contributor badge claims require the `20261031000000_contributor_badge` migration. Existing contributors claim once in Settings; the contributor badge is separate from owner-reviewed developer verification. The `20261031010000_badge_order` migration stores users' preferred display order and defaults existing accounts to an empty preference. Apply all pending migrations before running the updated app. Profiles display all earned badges; posts, replies, search results, and follow lists show the first eligible badge. See [Account and privacy](ACCOUNT.md) for settings and fallback order.

- Public post surfaces now consistently suppress hidden content and content from inactive/deleting authors, including reply/repost targets. The original privacy/lifecycle guarantee is preserved.
- Auth middleware naming, cron HTTP method, unsafe pagination numbers, restriction bypass through reposting, per-instance posting limits, notification grouping, missing error states, and swallowed HTTP status errors were repaired where encountered. This is not a claim that every possible defect in the application has been eliminated.
