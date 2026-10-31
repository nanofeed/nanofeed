---
title: Project roadmap
description: See what NanoFeed supports today and proposed areas for future improvement and community discussion.
category: Project
order: 100
---

# Project roadmap

NanoFeed is a text-first developer social network. Its official repository is [nanofeed/nanofeed](https://github.com/nanofeed/nanofeed).

This roadmap records the current feature baseline and **proposed priorities for discussion**. Future items need maintainer agreement, scoped issues, implementation, and testing. They are not release commitments and have no scheduled delivery dates. Check the repository's merged changes and deployment status before relying on a new feature.

## Available in the current codebase

- GitHub sign-in and editable NanoFeed profiles.
- Posts, replies, reactions, reposts, sharing, and follows.
- For you, Following, and Latest feeds, plus people, post, and hashtag search.
- Notifications with read/unread controls.
- Owner moderation, developer verification review, and contributor badge claims based on GitHub commits.
- Deactivation and account deletion with a 30-day grace period.
- Markdown documentation with guide search, section navigation, code language headers, and copy controls.
- Local formatting, automated checks, and documented database migration and deployment procedures.

Start with [Using NanoFeed](USING-NANOFEED.md), [Connect with developers](CONNECTING.md), and [Posts and conversations](CONVERSATIONS.md) to use these features.

## Future features

These unchecked items are proposals, not features available today or promises of a release date.

- [ ] **Messaging system:** design and implement direct conversations, with access controls, reporting, notification choices, and clear retention and deletion rules.

- [ ] **Google Analytics:** implement an optional integration with consent, privacy disclosures, configuration, and a way to disable it before any tracking is enabled.

- [ ] Improve empty-feed guidance and help new users discover people and topics.
- [ ] Improve search and discovery while keeping recommendation explanations and visibility rules clear.
- [ ] Improve accessibility for keyboard navigation, screen readers, and small screens.
- [ ] Improve feedback and recovery for failed posts, replies, reactions, and follows.
- [ ] Improve notification filtering and make activity easier to find.

## Issues and maintenance ideas

- [ ] Investigate upstream security fixes for dependencies and remove temporary compatibility patches when safe.
- [ ] Improve backup, restore, migration rehearsal, and scheduled cleanup monitoring.
- [ ] Review contributor verification feedback, GitHub rate limits, and badge refresh delays.
- [ ] Keep guides and troubleshooting steps aligned with shipped behavior.
- [ ] Triage bug reports and turn accepted proposals into focused issues with reproduction steps or acceptance criteria.

These checklist entries are ideas, not claims that a corresponding GitHub issue already exists. Check [open issues](https://github.com/nanofeed/nanofeed/issues) and create or link an issue when maintainers accept a specific task.

## Propose an improvement

Search [existing issues](https://github.com/nanofeed/nanofeed/issues) first. If no issue covers your idea, describe the user problem, who it affects, an example workflow, and how to verify an improvement. For example:

```text
Title: Help new users find their first people to follow
Problem: The Following feed is empty before a user follows anyone.
Proposal: Explain the next action and link to people search.
Acceptance: A new user can reach search from the empty feed using a keyboard.
```

Use public issue reports for product ideas and reproducible bugs. Keep credentials, private logs, and personal data out of them. See [Contributing](CONTRIBUTING.md) for preparing a change.

## Keep the roadmap accurate

When an item is implemented, update the relevant user guide, link the issue or pull request in the discussion, and describe any remaining limitations. A change appears on the live platform only after deployment. Revise this page as maintainers accept, complete, or change priorities.
